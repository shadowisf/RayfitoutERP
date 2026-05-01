import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const [rows] = await db.query(
      `SELECT COUNT(DISTINCT p.id) AS overrun_count
       FROM projects p
       LEFT JOIN (
         SELECT
           mh.project_id,
           COALESCE(SUM(
             CASE
               WHEN LOWER(IFNULL(l.payment_status, ''))
                    IN ('approved','paid','fully paid','completed','done')
                 THEN l.total
               ELSE COALESCE(pay.total_paid, 0)
             END
           ), 0) AS lpo_total
         FROM lpo l
         JOIN mr_headers mh ON l.mr_header_id = mh.id
         LEFT JOIN (
           SELECT lpo_id, SUM(amount) AS total_paid
           FROM lpo_payments
           GROUP BY lpo_id
         ) pay ON pay.lpo_id = l.id
         WHERE l.progress_id NOT IN (13)
         GROUP BY mh.project_id
       ) lpo_totals ON p.id = lpo_totals.project_id
       WHERE (p.allocated_budget + COALESCE(lpo_totals.lpo_total, 0)) > p.quoted_budget`,
    );

    const overrunCount = Number((rows as any[])[0]?.overrun_count ?? 0);

    return NextResponse.json({ overrun_count: overrunCount }, { status: 200 });
  } catch (err: any) {
    console.error(err.sqlMessage || err.message);
    return NextResponse.json({ error: err.sqlMessage || err.message }, { status: 500 });
  }
}
