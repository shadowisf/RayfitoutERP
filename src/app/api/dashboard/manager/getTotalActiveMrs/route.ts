import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const [rows]: any = await db.query(`
  SELECT
    SUM(
      date_requested >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
    ) AS this_week,
    SUM(
      date_requested >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) + 7 DAY)
      AND date_requested < DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
    ) AS last_week
  FROM vw_mr_headers
  WHERE progress_id BETWEEN 3 AND 24
`);

    return NextResponse.json(rows[0], { status: 200 });
  } catch (err: any) {
    console.error(err.sqlMessage);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}
