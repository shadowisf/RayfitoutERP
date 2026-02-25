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
        `SELECT COALESCE(SUM(lpo.total), 0) AS this_week_total, 0 AS last_week_total
         FROM lpo JOIN mr_headers h ON lpo.mr_header_id = h.id
         WHERE lpo.payment_status = 'Approved'`
      );
      const [itemRows]: any = await db.query(
        `SELECT lpo.id, lpo.mr_header_id, lpo.total, s.name AS supplier_name
         FROM lpo
         JOIN mr_headers h ON lpo.mr_header_id = h.id
         LEFT JOIN suppliers s ON s.id = lpo.supplier_id
         WHERE lpo.payment_status = 'Approved'
         ORDER BY lpo.total DESC LIMIT ?`,
        [maxItems]
      );
      const items = itemRows.map((lpo: any) => ({
        display_id: `LPO-${String(lpo.id).padStart(5, "0")}`,
        amount: Number(lpo.total) || 0,
        raw_id: lpo.id,
        mr_header_id: lpo.mr_header_id,
        type: "lpo",
      }));
      return NextResponse.json({ ...rows[0], items, total_count: items.length }, { status: 200 });
    }

    const [rows]: any = await db.query(
      `SELECT
        SUM(CASE WHEN h.date_requested >= DATE_SUB(CURDATE(), INTERVAL ? DAY) THEN COALESCE(lpo.total, 0) ELSE 0 END) AS this_week_total,
        SUM(CASE WHEN h.date_requested >= DATE_SUB(CURDATE(), INTERVAL ? DAY) AND h.date_requested < DATE_SUB(CURDATE(), INTERVAL ? DAY) THEN COALESCE(lpo.total, 0) ELSE 0 END) AS last_week_total
      FROM lpo JOIN mr_headers h ON lpo.mr_header_id = h.id
      WHERE lpo.payment_status = 'Approved'`,
      [filter, filter * 2, filter]
    );
    const [itemRows]: any = await db.query(
      `SELECT lpo.id, lpo.mr_header_id, lpo.total, s.name AS supplier_name
       FROM lpo
       JOIN mr_headers h ON lpo.mr_header_id = h.id
       LEFT JOIN suppliers s ON s.id = lpo.supplier_id
       WHERE lpo.payment_status = 'Approved'
         AND h.date_requested >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       ORDER BY lpo.total DESC LIMIT ?`,
      [filter, maxItems]
    );
    const items = itemRows.map((lpo: any) => ({
      display_id: `LPO-${String(lpo.id).padStart(5, "0")}`,
      amount: Number(lpo.total) || 0,
      raw_id: lpo.id,
      mr_header_id: lpo.mr_header_id,
      type: "lpo",
    }));
    return NextResponse.json({ ...rows[0], items, total_count: items.length }, { status: 200 });
  } catch (err: any) {
    console.error(err.sqlMessage || err.message);
    return NextResponse.json({ error: err.sqlMessage || err.message }, { status: 500 });
  }
}
