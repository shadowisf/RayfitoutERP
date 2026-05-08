import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2";

export async function GET() {
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT
         COALESCE(SUM(GREATEST(0, COALESCE(l.total, 0) - COALESCE(pay.total_paid, 0))), 0) AS amount,
         COUNT(*) AS lpo_count
       FROM lpo l
       LEFT JOIN (
         SELECT lpo_id, SUM(amount) AS total_paid
         FROM lpo_payments
         GROUP BY lpo_id
       ) pay ON pay.lpo_id = l.id
       WHERE LOWER(IFNULL(l.payment_status, ''))
               NOT IN ('approved','paid','fully paid','completed','done')
         AND NOT (l.total > 0 AND COALESCE(pay.total_paid, 0) >= l.total)`,
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
