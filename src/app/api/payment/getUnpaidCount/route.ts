import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const [rows]: any = await db.query(`
      SELECT COUNT(*) AS unpaid_count
      FROM lpo l
      JOIN mr_headers mh ON l.mr_header_id = mh.id
      JOIN suppliers   s  ON s.id = l.supplier_id
      LEFT JOIN (
        SELECT lpo_id, SUM(amount) AS total_paid
        FROM lpo_payments
        GROUP BY lpo_id
      ) pay ON pay.lpo_id = l.id
      WHERE mh.progress_id = 26
        AND l.progress_id > 14
        -- Exclude rejected LPOs (progress_id = 13 is already filtered by > 14,
        -- but be explicit). Completed LPOs (progress_id = 25) are intentionally
        -- kept — they may still be awaiting actual payment.
        AND l.progress_id NOT IN (13)
        -- Exclude LPOs that have actually been paid
        AND NOT (
          LOWER(TRIM(IFNULL(l.payment_status, '')))
            IN ('approved','paid','fully paid','completed','done')
          OR (l.total > 0 AND ROUND(COALESCE(pay.total_paid, 0), 2) >= ROUND(l.total, 2))
        )
        -- Exclude credit suppliers unless their payment is due today or overdue
        AND (
          LOWER(TRIM(IFNULL(s.type, ''))) != 'credit'
          OR DATE_ADD(
               l.created_at,
               INTERVAL COALESCE(
                 NULLIF(CAST(l.payment_terms AS UNSIGNED), 0),
                 NULLIF(CAST(s.payment_terms AS UNSIGNED), 0),
                 0
               ) DAY
             ) <= CURDATE()
        )
    `);

    return NextResponse.json(
      { success: true, count: Number(rows[0]?.unpaid_count ?? 0) },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("getUnpaidCount error:", err.sqlMessage || err.message);
    return NextResponse.json(
      { success: false, error: err.sqlMessage || err.message },
      { status: 500 },
    );
  }
}
