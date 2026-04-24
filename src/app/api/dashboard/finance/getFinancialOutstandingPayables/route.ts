import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2";

export async function GET() {
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT
        COALESCE(SUM(total), 0) AS amount,
        COUNT(*) AS lpo_count
       FROM lpo
       WHERE progress_id != 26
         AND (payment_file IS NULL OR payment_file = '[]' OR payment_file = 'null')`,
    );

    const row = (rows as any[])[0];

    return NextResponse.json(
      {
        amount: Number(row?.amount ?? 0),
        lpo_count: Number(row?.lpo_count ?? 0),
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("getFinancialOutstandingPayables error:", err.sqlMessage || err.message);
    return NextResponse.json({ error: err.sqlMessage || err.message }, { status: 500 });
  }
}
