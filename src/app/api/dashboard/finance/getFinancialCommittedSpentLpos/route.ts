import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2";

// Returns all individual LPO rows contributing to the Committed Spent figure.
// Committed = full face value of all issued LPOs (excluding payment-rejected, progress 13).
export async function GET() {
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT
         l.mr_header_id,
         l.id                                         AS lpo_id,
         COALESCE(l.total, 0)                         AS total,
         DATE_FORMAT(l.created_at, '%d %b %Y')        AS date
       FROM lpo l
       WHERE l.progress_id NOT IN (13)
       ORDER BY l.created_at DESC`,
    );

    return NextResponse.json(rows, { status: 200 });
  } catch (err: any) {
    console.error("getFinancialCommittedSpentLpos error:", err.sqlMessage || err.message);
    return NextResponse.json(
      { error: err.sqlMessage || err.message },
      { status: 500 },
    );
  }
}
