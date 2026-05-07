import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2";

export async function GET() {
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT COALESCE(SUM(
         CASE
           WHEN LOWER(IFNULL(l.payment_status, ''))
                IN ('approved','paid','fully paid','completed','done')
             THEN l.total
           ELSE COALESCE(pay.total_paid, 0)
         END
       ), 0) AS total_spent,
       MIN(l.created_at) AS oldest_date,
       MAX(l.created_at) AS latest_date
       FROM lpo l
       LEFT JOIN (
         SELECT lpo_id, SUM(amount) AS total_paid
         FROM lpo_payments
         GROUP BY lpo_id
       ) pay ON pay.lpo_id = l.id
       WHERE l.progress_id NOT IN (13)`,
    );

    const row = (rows as any[])[0];

    return NextResponse.json(
      {
        total_spent: Number(row?.total_spent ?? 0),
        oldest_date: row?.oldest_date ?? null,
        latest_date: row?.latest_date ?? null,
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error(
      "getFinancialTotalSpent error:",
      err.sqlMessage || err.message,
    );
    return NextResponse.json(
      { error: err.sqlMessage || err.message },
      { status: 500 },
    );
  }
}
