import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  // Date filter is on LPO creation date
  const dateClause =
    startDate && endDate
      ? `AND l.created_at BETWEEN '${startDate}' AND '${endDate} 23:59:59'`
      : startDate
        ? `AND l.created_at >= '${startDate}'`
        : endDate
          ? `AND l.created_at <= '${endDate} 23:59:59'`
          : "";

  try {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT
         s.id                                                              AS supplier_id,
         COALESCE(s.name, 'Unknown')                                       AS supplier_name,
         UPPER(COALESCE(s.type, '—'))                                      AS payment_type,
         COUNT(DISTINCT l.id)                                              AS total_lpos,
         COALESCE(SUM(l.total), 0)                                         AS amount,
         GROUP_CONCAT(DISTINCT p.name ORDER BY p.name SEPARATOR '||')     AS projects,

         -- Last purchase date
         MAX(l.created_at)                                                 AS last_purchase_date,

         -- Optional price/qty columns (via lpo_mr_line + mr_lines)
         ROUND(SUM(ml.quantity), 2)                                        AS qty_ordered,
         ROUND(AVG(lml.unit_price), 2)                                     AS avg_price,
         ROUND(MIN(lml.unit_price), 2)                                     AS lowest_price,
         ROUND(MAX(lml.unit_price), 2)                                     AS highest_price,

         -- Order completion rate: % of LPOs that have been paid
         ROUND(
           COUNT(CASE WHEN l.paid_at IS NOT NULL THEN 1 END) * 100.0
           / NULLIF(COUNT(l.id), 0),
         1)                                                                AS order_completion_rate,

         -- Avg delivery time: mean days from LPO creation to payment
         ROUND(
           AVG(CASE WHEN l.paid_at IS NOT NULL
               THEN DATEDIFF(l.paid_at, l.created_at) END),
         1)                                                                AS avg_delivery_days,

         -- Order frequency/week: LPOs per week since first order
         ROUND(
           COUNT(l.id)
           / GREATEST(1, DATEDIFF(NOW(), MIN(l.created_at)) / 7.0),
         2)                                                                AS order_frequency_week

       FROM lpo l
       LEFT JOIN suppliers    s   ON l.supplier_id  = s.id
       LEFT JOIN mr_headers   mh  ON l.mr_header_id = mh.id
       LEFT JOIN projects     p   ON mh.project_id  = p.id
       LEFT JOIN lpo_mr_line  lml ON lml.lpo_id     = l.id
       LEFT JOIN mr_lines     ml  ON ml.id           = lml.mr_line_id
       WHERE l.progress_id != 26
         ${dateClause}
       GROUP BY s.id, s.name, s.type
       HAVING amount > 0
       ORDER BY amount DESC`,
    );

    const data = (rows as any[]).map((row) => ({
      supplier_id:            row.supplier_id,
      supplier_name:          row.supplier_name,
      payment_type:           row.payment_type,
      total_lpos:             Number(row.total_lpos),
      amount:                 Number(row.amount),
      projects:               row.projects ? String(row.projects).split("||").filter(Boolean) : [],
      last_purchase_date:     row.last_purchase_date ?? null,
      qty_ordered:            row.qty_ordered            != null ? Number(row.qty_ordered)            : null,
      avg_price:              row.avg_price              != null ? Number(row.avg_price)              : null,
      median_price:           null, // requires window functions — extend when available
      lowest_price:           row.lowest_price           != null ? Number(row.lowest_price)           : null,
      highest_price:          row.highest_price          != null ? Number(row.highest_price)          : null,
      order_completion_rate:  row.order_completion_rate  != null ? Number(row.order_completion_rate)  : null,
      avg_delivery_days:      row.avg_delivery_days      != null ? Number(row.avg_delivery_days)      : null,
      order_frequency_week:   row.order_frequency_week   != null ? Number(row.order_frequency_week)   : null,
      on_time_delivery_pct:   null, // requires a due-date column — extend when available
    }));

    return NextResponse.json(data, { status: 200 });
  } catch (err: any) {
    console.error("getAllVendors error:", err.sqlMessage || err.message);
    return NextResponse.json(
      { error: err.sqlMessage || err.message },
      { status: 500 },
    );
  }
}
