import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2";

export async function GET() {
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT
         l.mr_header_id,
         l.id                                                              AS lpo_id,
         GREATEST(0, l.total - COALESCE(pay.total_paid, 0))               AS outstanding,
         DATE_FORMAT(l.created_at, '%d %b %Y')                            AS date
       FROM lpo l
       LEFT JOIN (
         SELECT lpo_id, SUM(amount) AS total_paid
         FROM lpo_payments
         GROUP BY lpo_id
       ) pay ON pay.lpo_id = l.id
       WHERE (l.payment_status IS NULL OR TRIM(l.payment_status) = '')
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
