import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2";

export async function GET() {
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT
        l.id,
        l.total,
        l.payment_terms,
        l.paid_at,
        COALESCE(s.name, sub.name) AS vendor_name
       FROM lpo l
       LEFT JOIN suppliers s ON l.supplier_id = s.id
       LEFT JOIN subcontractors sub ON l.subcontractor_id = sub.id
       WHERE l.paid_at IS NOT NULL
       ORDER BY l.paid_at DESC
       LIMIT 6`,
    );

    const transactions = (rows as any[]).map((row) => ({
      display_id: `LPO-${String(row.id).padStart(4, "0")}`,
      vendor_name: row.vendor_name || "—",
      payment_type: row.payment_terms
        ? String(row.payment_terms).toUpperCase()
        : "—",
      amount: Number(row.total) || 0,
    }));

    return NextResponse.json({ transactions }, { status: 200 });
  } catch (err: any) {
    console.error("getFinancialRecentTransactions error:", err.sqlMessage || err.message);
    return NextResponse.json({ error: err.sqlMessage || err.message }, { status: 500 });
  }
}
