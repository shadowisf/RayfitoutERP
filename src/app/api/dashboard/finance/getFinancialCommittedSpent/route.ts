import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2";

// Committed Spent = total face value of all issued LPOs (not payment-rejected).
// This represents the full contractual obligation the company has committed to
// through purchase orders, regardless of how much has actually been paid.
// Compare: Total Spent (disbursed), Outstanding Payables (still owed).

export async function GET() {
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT
         COALESCE(SUM(l.total), 0)     AS committed_total,
         COUNT(*)                       AS lpo_count,
         MIN(l.created_at)              AS oldest_date,
         MAX(l.created_at)              AS latest_date
       FROM lpo l
       WHERE l.progress_id NOT IN (13)`,
    );

    const row = (rows as any[])[0];

    return NextResponse.json(
      {
        committed_total: Number(row?.committed_total ?? 0),
        lpo_count:       Number(row?.lpo_count ?? 0),
        oldest_date:     row?.oldest_date ?? null,
        latest_date:     row?.latest_date ?? null,
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("getFinancialCommittedSpent error:", err.sqlMessage || err.message);
    return NextResponse.json(
      { error: err.sqlMessage || err.message },
      { status: 500 },
    );
  }
}
