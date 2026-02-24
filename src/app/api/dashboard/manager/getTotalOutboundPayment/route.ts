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
        `SELECT COALESCE(SUM(lpo.total), 0) AS this_week_total, 0 AS last_week_total
         FROM lpo JOIN mr_headers h ON lpo.mr_header_id = h.id
         WHERE lpo.payment_status = 'Approved'`
      );

      // Fetch items for hover popup — show LPO IDs with amounts
      const [itemRows]: any = await db.query(
        `SELECT lpo.id, lpo.mr_header_id, lpo.total, s.name AS supplier_name
         FROM lpo
         JOIN mr_headers h ON lpo.mr_header_id = h.id
         LEFT JOIN suppliers s ON s.id = lpo.supplier_id
         WHERE lpo.payment_status = 'Approved'
         ORDER BY lpo.total DESC
         LIMIT 20`
      );

      const items = itemRows.map((lpo: any) => ({
        display_id: `LPO-${String(lpo.id).padStart(5, "0")}`,
        detail: lpo.supplier_name || "-",
        amount: Number(lpo.total) || 0,
      }));

      const total = rows[0].this_week_total || 0;
      return NextResponse.json({ ...rows[0], items, total_count: items.length }, { status: 200 });
    }

    const [rows]: any = await db.query(
      `
      SELECT
        SUM(
          CASE
            WHEN h.date_requested >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
            THEN COALESCE(lpo.total, 0)
            ELSE 0
          END
        ) AS this_week_total,

        SUM(
          CASE
            WHEN h.date_requested >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
             AND h.date_requested < DATE_SUB(CURDATE(), INTERVAL ? DAY)
            THEN COALESCE(lpo.total, 0)
            ELSE 0
          END
        ) AS last_week_total

      FROM lpo
      JOIN mr_headers h
        ON lpo.mr_header_id = h.id
      WHERE lpo.payment_status = 'Approved'
    `,
      [filter, filter * 2, filter]
    );

    // Fetch items for hover popup
    const [itemRows]: any = await db.query(
      `SELECT lpo.id, lpo.mr_header_id, lpo.total, s.name AS supplier_name
       FROM lpo
       JOIN mr_headers h ON lpo.mr_header_id = h.id
       LEFT JOIN suppliers s ON s.id = lpo.supplier_id
       WHERE lpo.payment_status = 'Approved'
         AND h.date_requested >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       ORDER BY lpo.total DESC
       LIMIT 20`,
      [filter]
    );

    const items = itemRows.map((lpo: any) => ({
      display_id: `LPO-${String(lpo.id).padStart(5, "0")}`,
      detail: lpo.supplier_name || "-",
      amount: Number(lpo.total) || 0,
    }));

    return NextResponse.json({ ...rows[0], items, total_count: items.length }, { status: 200 });
  } catch (err: any) {
    console.error(err.sqlMessage || err.message);
    return NextResponse.json(
      { error: err.sqlMessage || err.message },
      { status: 500 }
    );
  }
}
