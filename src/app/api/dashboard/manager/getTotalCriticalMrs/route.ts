import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const [rows]: any = await db.query(`
      SELECT
        COUNT(*) AS overdue_count
      FROM vw_mr_headers
      WHERE required_date < CURDATE()
        AND progress_id != 25 AND progress_id != 26 AND progress_id != 1
    `);

    return NextResponse.json(rows[0], { status: 200 });
  } catch (err: any) {
    console.error(err.sqlMessage);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}
