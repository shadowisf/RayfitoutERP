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
      const [rows]: any = await db.query(
        `SELECT COUNT(*) AS this_week FROM vw_mr_headers WHERE progress_id = 14`
      );

      // Fetch items for hover popup — show MR IDs with LPO amounts
      const [itemRows]: any = await db.query(
        `SELECT v.id, v.type, v.project_name, COALESCE(SUM(l.total), 0) AS total_amount
         FROM vw_mr_headers v
         LEFT JOIN lpo l ON l.mr_header_id = v.id AND l.payment_status != 'Rejected'
         WHERE v.progress_id = 14
         GROUP BY v.id, v.type, v.project_name
         ORDER BY v.date_requested DESC
         LIMIT 20`
      );

      const items = itemRows.map((mr: any) => ({
        display_id: `${mr.type === "job" ? "JO" : "MR"}-${String(mr.id).padStart(5, "0")}`,
        detail: mr.project_name || "-",
        amount: Number(mr.total_amount) || 0,
      }));

      const count = rows[0].this_week || 0;
      return NextResponse.json({ this_week: count, last_week: 0, items, total_count: count }, { status: 200 });
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
      WHERE progress_id = 14
    `,
      [filter, filter * 2, filter]
    );

    // Fetch items for hover popup
    const [itemRows]: any = await db.query(
      `SELECT v.id, v.type, v.project_name, COALESCE(SUM(l.total), 0) AS total_amount
       FROM vw_mr_headers v
       LEFT JOIN lpo l ON l.mr_header_id = v.id AND l.payment_status != 'Rejected'
       WHERE v.progress_id = 14
         AND v.date_requested >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY v.id, v.type, v.project_name
       ORDER BY v.date_requested DESC
       LIMIT 20`,
      [filter]
    );

    const items = itemRows.map((mr: any) => ({
      display_id: `${mr.type === "job" ? "JO" : "MR"}-${String(mr.id).padStart(5, "0")}`,
      detail: mr.project_name || "-",
      amount: Number(mr.total_amount) || 0,
    }));

    const thisWeek = rows[0].this_week || 0;
    return NextResponse.json({ ...rows[0], items, total_count: thisWeek }, { status: 200 });
  } catch (err: any) {
    console.error(err.sqlMessage || err.message);
    return NextResponse.json(
      { error: err.sqlMessage || err.message },
      { status: 500 }
    );
  }
}
