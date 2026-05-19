import { db } from "@/lib/db";
import { NextResponse } from "next/server";

// Returns completed JOs (progress_id = 25) with remaining qty per BOQ line.
// remaining_qty = subcontracted_qty - SUM(completed_qty from all existing PRs for that JO+BOQ line).
// JOs where every BOQ line has remaining_qty = 0 are excluded.
export async function GET() {
  try {
    const [rows]: any = await db.query(`
      SELECT
        jo.id,
        jo.project_id,
        p.name AS project_name,
        jo.requested_by,
        jl.id AS jo_line_id,
        jt.boq_line_id,
        jt.subcontracted_qty,
        COALESCE(prev.total_completed, 0) AS total_completed,
        GREATEST(jt.subcontracted_qty - COALESCE(prev.total_completed, 0), 0) AS remaining_qty
      FROM mr_headers jo
      LEFT JOIN projects p ON p.id = jo.project_id
      JOIN jo_lines jl ON jl.mr_header_id = jo.id
      JOIN jt_jo_lines_boq_lines jt ON jt.jo_line_id = jl.id
      LEFT JOIN (
        SELECT pl.jo_line_id, pl.boq_line_id, SUM(pl.completed_qty) AS total_completed
        FROM pr_lines pl
        JOIN mr_headers pr ON pr.id = pl.mr_header_id
        WHERE pr.type = 'payment'
        GROUP BY pl.jo_line_id, pl.boq_line_id
      ) prev ON prev.jo_line_id = jl.id AND prev.boq_line_id = jt.boq_line_id
      WHERE jo.type = 'job' AND jo.progress_id = 25
      ORDER BY jo.id ASC, jl.id ASC, jt.boq_line_id ASC
    `);

    // Group by jo_id, attach boq line details
    const joMap = new Map<number, any>();
    for (const row of rows) {
      if (!joMap.has(row.id)) {
        joMap.set(row.id, {
          id: row.id,
          project_id: row.project_id,
          project_name: row.project_name,
          requested_by: row.requested_by,
          boq_lines: [],
        });
      }
      joMap.get(row.id).boq_lines.push({
        jo_line_id: row.jo_line_id,
        boq_line_id: row.boq_line_id,
        subcontracted_qty: Number(row.subcontracted_qty),
        total_completed: Number(row.total_completed),
        remaining_qty: Number(row.remaining_qty),
      });
    }

    // Only return JOs that have at least one BOQ line with remaining_qty > 0
    const jos = Array.from(joMap.values()).filter((jo) =>
      jo.boq_lines.some((b: any) => b.remaining_qty > 0),
    );

    return NextResponse.json(jos, { status: 200 });
  } catch (err: any) {
    console.error("getJosForPayment error:", err.sqlMessage || err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
