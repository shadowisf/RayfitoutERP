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

      // Fetch items for hover popup
      const [itemRows]: any = await db.query(
        `SELECT id, type, project_name
         FROM vw_mr_headers
         WHERE progress_id = 1 AND department_id = ?
         ORDER BY date_requested DESC
         LIMIT 20`,
        [Number(department_id)]
      );

      const items = itemRows.map((mr: any) => ({
        display_id: `${mr.type === "job" ? "JO" : "MR"}-${String(mr.id).padStart(5, "0")}`,
        detail: mr.project_name || "-",
      }));

      const count = rows[0].this_week || 0;
      return NextResponse.json({ this_week: count, last_week: 0, items, total_count: count }, { status: 200 });
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

    // Fetch items for hover popup
    const [itemRows]: any = await db.query(
      `SELECT id, type, project_name
       FROM vw_mr_headers
       WHERE progress_id = 1
         AND department_id = ?
         AND date_requested >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       ORDER BY date_requested DESC
       LIMIT 20`,
      [Number(department_id), filter]
    );

    const items = itemRows.map((mr: any) => ({
      display_id: `${mr.type === "job" ? "JO" : "MR"}-${String(mr.id).padStart(5, "0")}`,
      detail: mr.project_name || "-",
    }));

    const thisWeek = rows[0].this_week || 0;
    return NextResponse.json({ ...rows[0], items, total_count: thisWeek }, { status: 200 });
  } catch (err: any) {
    console.error(err.sqlMessage || err);
    return NextResponse.json(
      { error: err.sqlMessage || "Internal server error" },
      { status: 500 }
    );
  }
}
