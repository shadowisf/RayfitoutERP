import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { limit: itemLimit } = body;
    const maxItems =
      typeof itemLimit === "number" && itemLimit > 0 ? itemLimit : 20;

    const [rows]: any = await db.query(`
      SELECT COUNT(*) AS overdue_count
      FROM lpo
      WHERE delivery_date < CURDATE()
        AND progress_id != 25 AND progress_id = 17
    `);

    const [itemRows]: any = await db.query(
      `SELECT l.id, l.mr_header_id, l.delivery_date,
         (SELECT COUNT(*) FROM lpo_mr_line lml WHERE lml.lpo_id = l.id) AS item_count
       FROM lpo l
       WHERE l.delivery_date < CURDATE()
         AND l.progress_id != 25 AND l.progress_id = 17
       ORDER BY l.delivery_date ASC LIMIT ?`,
      [maxItems],
    );

    const items = itemRows.map((lpo: any) => ({
      display_id: `LPO-${String(lpo.id).padStart(5, "0")}`,
      item_count: Number(lpo.item_count) || 0,
      raw_id: lpo.id,
      mr_header_id: lpo.mr_header_id,
      type: "lpo",
    }));

    const count = rows[0].overdue_count || 0;

    // Date range: earliest/latest LPO creation for overdue deliveries
    const [dateRangeRows]: any = await db.query(`
      SELECT MIN(l.created_at) AS earliest, MAX(l.created_at) AS latest
      FROM lpo l
      WHERE l.delivery_date < CURDATE()
        AND l.progress_id != 25 AND l.progress_id = 17
    `);

    return NextResponse.json(
      {
        overdue_count: count,
        items,
        total_count: count,
        date_range: {
          earliest: dateRangeRows[0]?.earliest || null,
          latest: dateRangeRows[0]?.latest || null,
        },
      },
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
