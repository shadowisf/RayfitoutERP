import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const query = `
      SELECT
        SUM(
          date_requested >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
        ) AS this_week,
        SUM(
          date_requested >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) + 7 DAY)
          AND date_requested < DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
        ) AS last_week
      FROM vw_mr_headers
      WHERE progress_id = 1
        AND department_id = ?
    `;

    const values = [Number(body.department_id)];

    const [rows]: any = await db.query(query, values);

    return NextResponse.json(rows[0], { status: 200 });
  } catch (err: any) {
    console.error(err.sqlMessage || err);
    return NextResponse.json(
      { error: err.sqlMessage || "Internal server error" },
      { status: 500 }
    );
  }
}
