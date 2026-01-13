import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    // Query to get count of projects where (allocated_budget + LPO totals) > quoted_budget
    const query = `
      SELECT COUNT(DISTINCT p.id) AS overrun_count
      FROM projects p
      LEFT JOIN (
        SELECT 
          project_id,
          COALESCE(SUM(total), 0) AS lpo_total
        FROM lpo
        WHERE payment_status = 'Approved'
        GROUP BY project_id
      ) lpo_totals ON p.id = lpo_totals.project_id
      WHERE (p.allocated_budget + COALESCE(lpo_totals.lpo_total, 0)) > p.quoted_budget
    `;

    const [rows] = await db.query(query);
    const overrunCount = Number((rows as any[])[0]?.overrun_count ?? 0);

    return NextResponse.json(
      {
        overrun_count: overrunCount,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error(err.sqlMessage || err.message);
    return NextResponse.json(
      { error: err.sqlMessage || err.message },
      { status: 500 }
    );
  }
}
