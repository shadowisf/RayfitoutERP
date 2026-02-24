import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const [rows]: any = await db.query(`
      SELECT 
        bh.*,
        COALESCE(boq_totals.total_value, 0) as total_boq_value,
        COALESCE(boq_line_counts.total_items, 0) as total_items,
        COALESCE(project_boq_counts.boq_count, 0) as boqs_in_project
      FROM vw_boq_headers bh
      LEFT JOIN (
        SELECT 
          boq_id,
          SUM(total_cost) as total_value
        FROM boq_lines
        WHERE total_cost IS NOT NULL
        GROUP BY boq_id
      ) boq_totals ON bh.id = boq_totals.boq_id
      LEFT JOIN (
        SELECT 
          boq_id,
          COUNT(*) as total_items
        FROM boq_lines
        GROUP BY boq_id
      ) boq_line_counts ON bh.id = boq_line_counts.boq_id
      LEFT JOIN (
        SELECT 
          project_id,
          COUNT(*) as boq_count
        FROM boq_headers
        GROUP BY project_id
      ) project_boq_counts ON bh.project_id = project_boq_counts.project_id
    `);

    return NextResponse.json(rows, { status: 200 });
  } catch (err: any) {
    console.error("SQL Error:", err.sqlMessage);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}
