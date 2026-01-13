import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    // Query to count LPOs with payment_status = 'Rejected'
    const query = `
      SELECT COUNT(*) AS rejected_count
      FROM lpo
      WHERE payment_status = 'Rejected'
    `;

    const [rows] = await db.query(query);
    const rejectedCount = Number((rows as any[])[0]?.rejected_count ?? 0);

    return NextResponse.json(
      {
        rejected_count: rejectedCount,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error(err.sqlMessage || err.message);
    return NextResponse.json(
      { error: err.sqlMessage || err.message },
      { status: 500 }
    );
  }
}
