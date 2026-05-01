import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2";

export async function GET() {
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT
         s.id                              AS supplier_id,
         COALESCE(s.name, 'Unknown')       AS supplier_name,
         UPPER(COALESCE(s.type, '—'))      AS payment_type,
         COUNT(l.id)                       AS total_lpos,
         COALESCE(SUM(
           CASE
             WHEN LOWER(IFNULL(l.payment_status, ''))
                  IN ('approved','paid','fully paid','completed','done')
               THEN l.total
             ELSE COALESCE(pay.total_paid, 0)
           END
         ), 0)                             AS amount
       FROM lpo l
       LEFT JOIN suppliers s ON l.supplier_id = s.id
       LEFT JOIN (
         SELECT lpo_id, SUM(amount) AS total_paid
         FROM lpo_payments
         GROUP BY lpo_id
       ) pay ON pay.lpo_id = l.id
       WHERE l.progress_id NOT IN (13)
       GROUP BY s.id, s.name, s.type
       HAVING amount > 0
       ORDER BY amount DESC
       LIMIT 10`,
    );

    const data = (rows as any[]).map((row) => ({
      supplier_id: row.supplier_id,
      supplier_name: row.supplier_name,
      payment_type: row.payment_type,
      total_lpos: Number(row.total_lpos),
      amount: Number(row.amount),
    }));

    return NextResponse.json(data, { status: 200 });
  } catch (err: any) {
    console.error(
      "getFinancialTopVendorsBySpend error:",
      err.sqlMessage || err.message,
    );
    return NextResponse.json(
      { error: err.sqlMessage || err.message },
      { status: 500 },
    );
  }
}
