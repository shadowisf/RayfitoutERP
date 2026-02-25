import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { filter, limit: itemLimit } = body;
    const maxItems = typeof itemLimit === "number" && itemLimit > 0 ? itemLimit : 20;

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
      const [itemRows]: any = await db.query(
        `SELECT l.id AS lpo_id, l.mr_header_id, l.total, s.name AS supplier_name
         FROM lpo l
         INNER JOIN mr_headers h ON h.id = l.mr_header_id
         LEFT JOIN suppliers s ON s.id = l.supplier_id
         WHERE h.progress_id = 14 AND l.payment_status != 'Rejected'
         ORDER BY l.total DESC LIMIT ?`,
        [maxItems]
      );
      const items = itemRows.map((lpo: any) => ({
        display_id: `LPO-${String(lpo.lpo_id).padStart(5, "0")}`,
        amount: Number(lpo.total) || 0,
        raw_id: lpo.lpo_id,
        mr_header_id: lpo.mr_header_id,
        type: "lpo",
      }));
      const count = rows[0].this_week || 0;
      return NextResponse.json({ this_week: count, last_week: 0, items, total_count: count }, { status: 200 });
    }

    const [rows]: any = await db.query(
      `SELECT
        SUM(date_requested >= DATE_SUB(CURDATE(), INTERVAL ? DAY)) AS this_week,
        SUM(date_requested >= DATE_SUB(CURDATE(), INTERVAL ? DAY) AND date_requested < DATE_SUB(CURDATE(), INTERVAL ? DAY)) AS last_week
      FROM vw_mr_headers WHERE progress_id = 14`,
      [filter, filter * 2, filter]
    );
    const [itemRows]: any = await db.query(
      `SELECT l.id AS lpo_id, l.mr_header_id, l.total, s.name AS supplier_name
       FROM lpo l
       INNER JOIN mr_headers h ON h.id = l.mr_header_id
       LEFT JOIN suppliers s ON s.id = l.supplier_id
       WHERE h.progress_id = 14 AND l.payment_status != 'Rejected'
         AND h.date_requested >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       ORDER BY l.total DESC LIMIT ?`,
      [filter, maxItems]
    );
    const items = itemRows.map((lpo: any) => ({
      display_id: `LPO-${String(lpo.lpo_id).padStart(5, "0")}`,
      amount: Number(lpo.total) || 0,
      raw_id: lpo.lpo_id,
      mr_header_id: lpo.mr_header_id,
      type: "lpo",
    }));
    const thisWeek = rows[0].this_week || 0;
    return NextResponse.json({ ...rows[0], items, total_count: thisWeek }, { status: 200 });
  } catch (err: any) {
    console.error(err.sqlMessage || err.message);
    return NextResponse.json({ error: err.sqlMessage || err.message }, { status: 500 });
  }
}
