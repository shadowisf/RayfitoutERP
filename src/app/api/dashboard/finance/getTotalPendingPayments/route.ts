import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const [rows]: any = await db.query(
      `
      SELECT COUNT(*) AS pending_count
      FROM vw_mr_headers
      WHERE progress_id = 14
    `
    );

    return NextResponse.json(
      {
        pending_count: rows[0].pending_count || 0,
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
