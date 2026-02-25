import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filter, limit: itemLimit } = body;
    const maxItems = typeof itemLimit === "number" && itemLimit > 0 ? itemLimit : 20;

    if (filter === undefined || filter === null || typeof filter !== "number" || filter < 0) {
      return NextResponse.json(
        { error: "Invalid 'filter' parameter. Must be a non-negative number." },
        { status: 400 },
      );
    }

    if (filter === 0) {
      const [rows]: any = await db.query(
        `SELECT COUNT(*) AS this_period FROM lpo WHERE delivery_date < CURDATE() AND progress_id != 25`
      );
      const [itemRows]: any = await db.query(
        `SELECT l.id, l.mr_header_id,
           (SELECT COUNT(*) FROM lpo_mr_line lml WHERE lml.lpo_id = l.id) AS item_count
         FROM lpo l
         WHERE l.delivery_date < CURDATE() AND l.progress_id != 25
         ORDER BY l.delivery_date ASC LIMIT ?`,
        [maxItems]
      );
      const items = itemRows.map((lpo: any) => ({
        display_id: `LPO-${String(lpo.id).padStart(5, "0")}`,
        item_count: Number(lpo.item_count) || 0,
        raw_id: lpo.id,
        mr_header_id: lpo.mr_header_id,
        type: "lpo",
      }));
      const count = rows[0].this_period || 0;
      return NextResponse.json({ this_week: count, last_week: 0, items, total_count: count }, { status: 200 });
    }

    const [rows]: any = await db.query(
      `SELECT
        SUM(CASE WHEN delivery_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY) AND delivery_date < CURDATE() AND progress_id != 25 THEN 1 ELSE 0 END) AS this_period,
        SUM(CASE WHEN delivery_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY) AND delivery_date < DATE_SUB(CURDATE(), INTERVAL ? DAY) AND progress_id != 25 THEN 1 ELSE 0 END) AS last_period
      FROM lpo`,
      [filter, filter * 2, filter],
    );
    const [itemRows]: any = await db.query(
      `SELECT l.id, l.mr_header_id,
         (SELECT COUNT(*) FROM lpo_mr_line lml WHERE lml.lpo_id = l.id) AS item_count
       FROM lpo l
       WHERE l.delivery_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
         AND l.delivery_date < CURDATE()
         AND l.progress_id != 25
       ORDER BY l.delivery_date ASC LIMIT ?`,
      [filter, maxItems]
    );
    const items = itemRows.map((lpo: any) => ({
      display_id: `LPO-${String(lpo.id).padStart(5, "0")}`,
      item_count: Number(lpo.item_count) || 0,
      raw_id: lpo.id,
      mr_header_id: lpo.mr_header_id,
      type: "lpo",
    }));
    const thisWeek = rows[0].this_period || 0;
    return NextResponse.json({
      this_week: thisWeek,
      last_week: rows[0].last_period || 0,
      items,
      total_count: thisWeek,
    }, { status: 200 });
  } catch (err: any) {
    console.error(err.sqlMessage || err.message);
    return NextResponse.json({ error: err.sqlMessage || err.message }, { status: 500 });
  }
}
