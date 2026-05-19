import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date_from, date_to, limit: itemLimit } = body;
    const maxItems = typeof itemLimit === "number" && itemLimit > 0 ? itemLimit : 20;

    const dateWhereParts: string[] = [
      "delivery_date < CURDATE()",
      "progress_id != 25",
    ];
    if (date_from) dateWhereParts.push(`delivery_date >= '${date_from}'`);
    if (date_to) dateWhereParts.push(`delivery_date <= '${date_to}'`);
    const dateWhere = dateWhereParts.join(" AND ");

    const [rows]: any = await db.query(
      `SELECT COUNT(*) AS total FROM lpo WHERE ${dateWhere}`
    );
    const [itemRows]: any = await db.query(
      `SELECT l.id, l.mr_header_id,
         (SELECT COUNT(*) FROM lpo_mr_line lml WHERE lml.lpo_id = l.id) AS item_count
       FROM lpo l
       WHERE ${dateWhere}
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
    const count = Number(rows[0].total) || 0;
    return NextResponse.json({ this_week: count, last_week: 0, items, total_count: count }, { status: 200 });
  } catch (err: any) {
    console.error(err.sqlMessage || err.message);
    return NextResponse.json({ error: err.sqlMessage || err.message }, { status: 500 });
  }
}
