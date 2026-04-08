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

    // Pending deliveries include LPOs in delivery-related stages:
    //   - 16 (GRN Fail Resubmission) — delivery rejected, awaiting resubmission
    //   - 17 (Pending Delivery) — awaiting delivery
    // All hover sections (items delay, value impact, delayed vendors,
    // project impact) share this scope so totals are consistent.
    const deliveryClause = `l.progress_id IN (16, 17)`;

    if (filter === 0) {
      // Card count: number of LPOs pending delivery
      const [rows]: any = await db.query(
        `SELECT COUNT(*) AS this_week FROM lpo WHERE progress_id IN (16, 17)`,
      );

      // Items list (kept for backwards compatibility / drilldown)
      const [itemRows]: any = await db.query(
        `SELECT l.id, l.mr_header_id,
           (SELECT COUNT(*) FROM lpo_mr_line lml WHERE lml.lpo_id = l.id) AS item_count
         FROM lpo l
         WHERE l.progress_id IN (16, 17)
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

      // Items delay: total line items across all pending delivery LPOs
      const [itemsDelayRows]: any = await db.query(
        `SELECT COUNT(*) AS items_delayed
         FROM lpo_mr_line lml
         INNER JOIN lpo l ON l.id = lml.lpo_id
         WHERE ${deliveryClause}`,
      );

      // Value impact: total AED at risk across pending delivery LPOs
      const [valueRows]: any = await db.query(
        `SELECT COALESCE(SUM(l.total), 0) AS value_impact
         FROM lpo l
         WHERE ${deliveryClause}`,
      );

      // Delayed vendors: LPOs grouped by supplier
      const [vendorRows]: any = await db.query(
        `SELECT s.name AS supplier_name, COUNT(*) AS lpo_count
         FROM lpo l
         LEFT JOIN suppliers s ON s.id = l.supplier_id
         WHERE ${deliveryClause}
         GROUP BY s.id, s.name
         ORDER BY lpo_count DESC`,
      );

      // Project impact value: distinct MRs grouped by project
      const [projectRows]: any = await db.query(
        `SELECT p.name AS project_name, COUNT(DISTINCT l.mr_header_id) AS mr_count
         FROM lpo l
         LEFT JOIN projects p ON p.id = l.project_id
         WHERE ${deliveryClause}
         GROUP BY p.id, p.name
         ORDER BY mr_count DESC`,
      );

      // Total issued LPOs (footer reference): all LPOs ever issued (excluding drafts)
      const [issuedRows]: any = await db.query(
        `SELECT COUNT(*) AS total_issued FROM lpo WHERE progress_id != 1`,
      );

      const count = rows[0].this_week || 0;
      return NextResponse.json(
        {
          this_week: count,
          last_week: 0,
          items,
          total_count: count,
          items_delayed: Number(itemsDelayRows[0].items_delayed) || 0,
          value_impact: Number(valueRows[0].value_impact) || 0,
          delayed_vendors: vendorRows,
          project_impact_value: projectRows,
          total_issued_lpos: Number(issuedRows[0].total_issued) || 0,
        },
        { status: 200 },
      );
    }

    // Card count rows (this_week / last_week)
    const [rows]: any = await db.query(
      `SELECT
        SUM(l.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)) AS this_week,
        SUM(l.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY) AND l.created_at < DATE_SUB(CURDATE(), INTERVAL ? DAY)) AS last_week
      FROM lpo l WHERE l.progress_id IN (16, 17)`,
      [filter, filter * 2, filter],
    );

    const [itemRows]: any = await db.query(
      `SELECT l.id, l.mr_header_id,
         (SELECT COUNT(*) FROM lpo_mr_line lml WHERE lml.lpo_id = l.id) AS item_count
       FROM lpo l
       WHERE l.progress_id IN (16, 17)
         AND l.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       ORDER BY l.delivery_date ASC LIMIT ?`,
      [filter, maxItems],
    );
    const items = itemRows.map((lpo: any) => ({
      display_id: `LPO-${String(lpo.id).padStart(5, "0")}`,
      item_count: Number(lpo.item_count) || 0,
      raw_id: lpo.id,
      mr_header_id: lpo.mr_header_id,
      type: "lpo",
    }));

    // Items delay (date-filtered)
    const [itemsDelayRows]: any = await db.query(
      `SELECT COUNT(*) AS items_delayed
       FROM lpo_mr_line lml
       INNER JOIN lpo l ON l.id = lml.lpo_id
       WHERE ${deliveryClause}
         AND l.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)`,
      [filter],
    );

    // Value impact (date-filtered)
    const [valueRows]: any = await db.query(
      `SELECT COALESCE(SUM(l.total), 0) AS value_impact
       FROM lpo l
       WHERE ${deliveryClause}
         AND l.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)`,
      [filter],
    );

    // Delayed vendors (date-filtered)
    const [vendorRows]: any = await db.query(
      `SELECT s.name AS supplier_name, COUNT(*) AS lpo_count
       FROM lpo l
       LEFT JOIN suppliers s ON s.id = l.supplier_id
       WHERE ${deliveryClause}
         AND l.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY s.id, s.name
       ORDER BY lpo_count DESC`,
      [filter],
    );

    // Project impact value (date-filtered)
    const [projectRows]: any = await db.query(
      `SELECT p.name AS project_name, COUNT(DISTINCT l.mr_header_id) AS mr_count
       FROM lpo l
       LEFT JOIN projects p ON p.id = l.project_id
       WHERE ${deliveryClause}
         AND l.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY p.id, p.name
       ORDER BY mr_count DESC`,
      [filter],
    );

    // Total issued LPOs (footer reference) — same scope as all-time, not date filtered
    const [issuedRows]: any = await db.query(
      `SELECT COUNT(*) AS total_issued FROM lpo WHERE progress_id != 1`,
    );

    const thisWeek = rows[0].this_week || 0;
    return NextResponse.json(
      {
        ...rows[0],
        items,
        total_count: thisWeek,
        items_delayed: Number(itemsDelayRows[0].items_delayed) || 0,
        value_impact: Number(valueRows[0].value_impact) || 0,
        delayed_vendors: vendorRows,
        project_impact_value: projectRows,
        total_issued_lpos: Number(issuedRows[0].total_issued) || 0,
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
