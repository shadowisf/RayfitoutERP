import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2";

export async function GET() {
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT COALESCE(SUM(total), 0) AS total_spent FROM lpo WHERE progress_id != 26`,
    );

    const row = (rows as any[])[0];

    return NextResponse.json(
      { total_spent: Number(row?.total_spent ?? 0) },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("getFinancialTotalSpent error:", err.sqlMessage || err.message);
    return NextResponse.json({ error: err.sqlMessage || err.message }, { status: 500 });
  }
}
