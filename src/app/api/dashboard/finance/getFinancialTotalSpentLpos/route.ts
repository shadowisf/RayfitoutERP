import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2";

// Returns all individual LPO rows contributing to the Total Spent figure.
// Uses the same logic as getFinancialTotalSpent (two-case amount, exclude progress 13).
export async function GET() {
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT
         l.mr_header_id                          AS mr_header_id,
         l.id                                    AS lpo_id,
         ROUND(
           CASE
             WHEN LOWER(IFNULL(l.payment_status, ''))
                  IN ('approved','paid','fully paid','completed','done')
               THEN l.total
             ELSE COALESCE(pay.total_paid, 0)
           END, 2
         )                                       AS total_price,
         DATE_FORMAT(l.created_at, '%d %b %Y')  AS date
       FROM lpo l
       LEFT JOIN (
         SELECT lpo_id, SUM(amount) AS total_paid
         FROM lpo_payments
         GROUP BY lpo_id
       ) pay ON pay.lpo_id = l.id
       WHERE l.progress_id NOT IN (13)
       ORDER BY l.created_at DESC`,
    );

    const data = (rows as any[]).map((row) => ({
      mr_header_id: Number(row.mr_header_id),
      lpo_id: Number(row.lpo_id),
      total_price: Number(row.total_price ?? 0),
      date: row.date ?? "—",
    }));

    return NextResponse.json(data, { status: 200 });
  } catch (err: any) {
    console.error(
      "getFinancialTotalSpentLpos error:",
      err.sqlMessage || err.message,
    );
    return NextResponse.json(
      { error: err.sqlMessage || err.message },
      { status: 500 },
    );
  }
}
