import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2";

export async function GET() {
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT
        ROUND(AVG(DATEDIFF(paid_at, created_at)), 1) AS avg_days,
        COUNT(*) AS paid_count
       FROM lpo
       WHERE paid_at IS NOT NULL`,
    );

    const row = (rows as any[])[0];

    return NextResponse.json(
      {
        avg_days: Number(row?.avg_days ?? 0),
        paid_count: Number(row?.paid_count ?? 0),
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("getFinancialMedianPaymentDelay error:", err.sqlMessage || err.message);
    return NextResponse.json({ error: err.sqlMessage || err.message }, { status: 500 });
  }
}
