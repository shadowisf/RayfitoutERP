import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { filter, limit: itemLimit } = body;
    const maxItems =
      typeof itemLimit === "number" && itemLimit > 0 ? itemLimit : 20;

    if (
      filter === undefined ||
      filter === null ||
      typeof filter !== "number" ||
      filter < 0
    ) {
      return NextResponse.json(
        { error: "Invalid 'filter' parameter. Must be a non-negative number." },
        { status: 400 },
      );
    }

    if (filter === 0) {
      const [rows]: any = await db.query(
        `SELECT COUNT(*) AS this_week FROM vw_mr_headers WHERE progress_id IN (3, 10)`,
      );
      const [itemRows]: any = await db.query(
        `SELECT id, type, project_name,
           (SELECT COUNT(*) FROM mr_lines ml WHERE ml.mr_header_id = vw_mr_headers.id) AS item_count
         FROM vw_mr_headers WHERE progress_id IN (3, 10)
         ORDER BY date_requested DESC LIMIT ?`,
        [maxItems],
      );
      const items = itemRows.map((mr: any) => ({
        display_id: `${mr.type === "job" ? "JO" : "MR"}-${String(mr.id).padStart(5, "0")}`,
        item_count: Number(mr.item_count) || 0,
        raw_id: mr.id,
        type: "mr",
      }));
      const count = rows[0].this_week || 0;
      return NextResponse.json(
        { this_week: count, last_week: 0, items, total_count: count },
        { status: 200 },
      );
    }

    const [rows]: any = await db.query(
      `SELECT
        SUM(date_requested >= DATE_SUB(CURDATE(), INTERVAL ? DAY)) AS this_week,
        SUM(date_requested >= DATE_SUB(CURDATE(), INTERVAL ? DAY) AND date_requested < DATE_SUB(CURDATE(), INTERVAL ? DAY)) AS last_week
      FROM vw_mr_headers WHERE progress_id IN (3, 10)`,
      [filter, filter * 2, filter],
    );
    const [itemRows]: any = await db.query(
      `SELECT id, type, project_name,
         (SELECT COUNT(*) FROM mr_lines ml WHERE ml.mr_header_id = vw_mr_headers.id) AS item_count
       FROM vw_mr_headers WHERE progress_id IN (3, 10)
         AND date_requested >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       ORDER BY date_requested DESC LIMIT ?`,
      [filter, maxItems],
    );
    const items = itemRows.map((mr: any) => ({
      display_id: `${mr.type === "job" ? "JO" : "MR"}-${String(mr.id).padStart(5, "0")}`,
      item_count: Number(mr.item_count) || 0,
      raw_id: mr.id,
      type: "mr",
    }));
    const thisWeek = rows[0].this_week || 0;
    return NextResponse.json(
      { ...rows[0], items, total_count: thisWeek },
      { status: 200 },
    );
  } catch (err: any) {
    console.error(err.sqlMessage || err.message);
    return NextResponse.json(
      { error: err.sqlMessage || err.message },
      { status: 500 },
    );
  }
}
