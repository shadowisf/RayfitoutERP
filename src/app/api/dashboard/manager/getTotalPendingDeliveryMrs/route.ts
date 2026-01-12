import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { filter } = body;

    // Validate filter parameter
    if (!filter || typeof filter !== "number" || filter <= 0) {
      return NextResponse.json(
        { error: "Invalid 'filter' parameter. Must be a positive number." },
        { status: 400 }
      );
    }

    const [rows]: any = await db.query(
      `
      SELECT
        SUM(
          date_requested >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        ) AS this_week,
        SUM(
          date_requested >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
          AND date_requested < DATE_SUB(CURDATE(), INTERVAL ? DAY)
        ) AS last_week
      FROM vw_mr_headers
      WHERE progress_id = 17
    `,
      [filter, filter * 2, filter]
    );

    return NextResponse.json(rows[0], { status: 200 });
  } catch (err: any) {
    console.error(err.sqlMessage || err.message);
    return NextResponse.json(
      { error: err.sqlMessage || err.message },
      { status: 500 }
    );
  }
}
