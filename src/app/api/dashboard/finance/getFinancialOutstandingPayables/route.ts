import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2";

export async function GET() {
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT
         COALESCE(SUM(ROUND(GREATEST(l.total - COALESCE(pay.total_paid, 0), 0), 2)), 0) AS amount,
         COUNT(*) AS lpo_count
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
           LOWER(TRIM(IFNULL(l.payment_status, '')))
             IN ('approved','paid','fully paid','completed','done')
           OR (l.total > 0 AND ROUND(COALESCE(pay.total_paid, 0), 2) >= ROUND(l.total, 2))
         )`,
    );

    const row = (rows as any[])[0];

    return NextResponse.json(
      {
        amount:    Number(row?.amount ?? 0),
        lpo_count: Number(row?.lpo_count ?? 0),
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error(
      "getFinancialOutstandingPayables error:",
      err.sqlMessage || err.message,
    );
    return NextResponse.json(
      { error: err.sqlMessage || err.message },
      { status: 500 },
    );
  }
}
