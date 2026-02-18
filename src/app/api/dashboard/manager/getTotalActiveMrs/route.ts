import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { filter } = body;

    // Validate filter parameter (0 = all time, positive = days)
    if (filter === undefined || filter === null || typeof filter !== "number" || filter < 0) {
      return NextResponse.json(
        { error: "Invalid 'filter' parameter. Must be a non-negative number." },
        { status: 400 }
      );
    }

    if (filter === 0) {
      // All time — no date restriction
      const [rows]: any = await db.query(
        `SELECT COUNT(*) AS this_week FROM vw_mr_headers WHERE progress_id BETWEEN 3 AND 24`
      );
      return NextResponse.json({ this_week: rows[0].this_week || 0, last_week: 0 }, { status: 200 });
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
      WHERE progress_id BETWEEN 3 AND 24
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
