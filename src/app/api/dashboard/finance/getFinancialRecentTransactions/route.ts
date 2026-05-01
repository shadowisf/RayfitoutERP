import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2";

export async function GET() {
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT
         l.id,
         CASE
           WHEN LOWER(IFNULL(l.payment_status, ''))
                IN ('approved','paid','fully paid','completed','done')
             THEN l.total
           ELSE COALESCE(pay.total_paid, 0)
         END AS amount,
         l.paid_at,
         l.created_at,
         COALESCE(s.name, sub.name) AS vendor_name,
         s.type AS supplier_type
       FROM lpo l
       LEFT JOIN suppliers s ON l.supplier_id = s.id
       LEFT JOIN subcontractors sub ON l.subcontractor_id = sub.id
       LEFT JOIN (
         SELECT lpo_id, SUM(amount) AS total_paid
         FROM lpo_payments
         GROUP BY lpo_id
       ) pay ON pay.lpo_id = l.id
       WHERE l.progress_id NOT IN (13)
         AND (
           l.paid_at IS NOT NULL
           OR LOWER(IFNULL(l.payment_status, ''))
              IN ('approved','paid','fully paid','completed','done')
           OR COALESCE(pay.total_paid, 0) > 0
         )
       ORDER BY COALESCE(l.paid_at, l.created_at) DESC
       LIMIT 6`,
    );

    const transactions = (rows as any[]).map((row) => ({
      display_id: `LPO-${String(row.id).padStart(5, "0")}`,
      vendor_name: row.vendor_name || "—",
      payment_type: row.supplier_type
        ? String(row.supplier_type).toUpperCase()
        : "—",
      amount: Number(row.amount) || 0,
    }));

    return NextResponse.json({ transactions }, { status: 200 });
  } catch (err: any) {
    console.error("getFinancialRecentTransactions error:", err.sqlMessage || err.message);
    return NextResponse.json({ error: err.sqlMessage || err.message }, { status: 500 });
  }
}
