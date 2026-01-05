import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const [rows]: any = await db.query(`
      SELECT
        SUM(
          CASE
            WHEN h.date_requested >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
            THEN COALESCE(l.approved_total_price, 0)
            ELSE 0
          END
        ) AS this_week_total,

        SUM(
          CASE
            WHEN h.date_requested >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) + 7 DAY)
             AND h.date_requested < DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
            THEN COALESCE(l.approved_total_price, 0)
            ELSE 0
          END
        ) AS last_week_total

      FROM vw_mr_lines l
      JOIN vw_mr_headers h
        ON l.mr_header_id = h.id
    `);

    return NextResponse.json(rows[0], { status: 200 });
  } catch (err: any) {
    console.error(err.sqlMessage);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}
