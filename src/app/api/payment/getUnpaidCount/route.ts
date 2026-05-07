import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const [rows]: any = await db.query(`
      SELECT COUNT(*) AS unpaid_count
      FROM lpo l
      JOIN mr_headers mh ON l.mr_header_id = mh.id
      LEFT JOIN (
        SELECT lpo_id, SUM(amount) AS total_paid
        FROM lpo_payments
        GROUP BY lpo_id
      ) pay ON pay.lpo_id = l.id
      WHERE mh.progress_id = 26
        AND l.progress_id > 14
        AND NOT (
          LOWER(IFNULL(l.payment_status, ''))
            IN ('approved','paid','fully paid','completed','done')
          OR (l.total > 0 AND COALESCE(pay.total_paid, 0) >= l.total)
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
