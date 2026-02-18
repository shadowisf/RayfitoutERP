import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { department_id, filter } = body;

    // Validate filter parameter (0 = all time, positive = days)
    if (filter === undefined || filter === null || typeof filter !== "number" || filter < 0) {
      return NextResponse.json(
        { error: "Invalid 'filter' parameter. Must be a non-negative number." },
        { status: 400 }
      );
    }

    // Validate department_id
    if (!department_id) {
      return NextResponse.json(
        { error: "department_id is required" },
        { status: 400 }
      );
    }

    if (filter === 0) {
      const [rows]: any = await db.query(
        `SELECT COUNT(*) AS this_week FROM vw_mr_headers WHERE progress_id = 1 AND department_id = ?`,
        [Number(department_id)]
      );
      return NextResponse.json({ this_week: rows[0].this_week || 0, last_week: 0 }, { status: 200 });
    }

    const query = `
      SELECT
        SUM(
          date_requested >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        ) AS this_week,
        SUM(
          date_requested >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
          AND date_requested < DATE_SUB(CURDATE(), INTERVAL ? DAY)
        ) AS last_week
      FROM vw_mr_headers
      WHERE progress_id = 1
        AND department_id = ?
    `;

    const values = [filter, filter * 2, filter, Number(department_id)];

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
