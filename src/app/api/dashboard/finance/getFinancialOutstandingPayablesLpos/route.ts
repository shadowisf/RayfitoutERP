import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2";

// Returns individual LPO rows that still have an outstanding balance.
// "Paid" = payment_status in approved/paid list  OR  total_paid >= total in lpo_payments.
// Both conditions exclude the row; only genuinely unpaid LPOs appear.
export async function GET() {
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT
         l.mr_header_id,
         l.id                                                              AS lpo_id,
         GREATEST(0, COALESCE(l.total, 0) - COALESCE(pay.total_paid, 0)) AS outstanding,
         DATE_FORMAT(l.created_at, '%d %b %Y')                            AS date
       FROM lpo l
       LEFT JOIN (
         SELECT lpo_id, SUM(amount) AS total_paid
         FROM lpo_payments
         GROUP BY lpo_id
       ) pay ON pay.lpo_id = l.id
       WHERE LOWER(IFNULL(l.payment_status, ''))
               NOT IN ('approved','paid','fully paid','completed','done')
         AND NOT (l.total > 0 AND COALESCE(pay.total_paid, 0) >= l.total)
       ORDER BY l.created_at DESC`,
    );

    return NextResponse.json(rows, { status: 200 });
  } catch (err: any) {
    console.error(
      "getFinancialOutstandingPayablesLpos error:",
      err.sqlMessage || err.message,
    );
    return NextResponse.json(
      { error: err.sqlMessage || err.message },
      { status: 500 },
    );
  }
}
