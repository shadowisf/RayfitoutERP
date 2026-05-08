import { db } from "@/lib/db";
import { NextResponse } from "next/server";

// Shared LEFT JOIN for lpo_payments aggregation
const lpoPaymentsJoin = `
  LEFT JOIN (
    SELECT lpo_id, SUM(amount) AS total_paid
    FROM lpo_payments
    GROUP BY lpo_id
  ) pay ON pay.lpo_id = l.id
`;

// Same filter logic as the payments page kanban — excludes fully-paid LPOs.
// l.progress_id > 14 matches getPaymentKanban and getUnpaidCount exactly.
const pendingPaymentFilter = `
  mh.progress_id = 26
  AND l.progress_id > 14
  AND LOWER(IFNULL(l.payment_status, '')) NOT IN ('approved','paid','fully paid','completed','done')
  AND NOT (l.total > 0 AND COALESCE(pay.total_paid, 0) >= l.total)
`;

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

    const dateClause =
      filter > 0
        ? `AND l.created_at >= DATE_SUB(CURDATE(), INTERVAL ${filter} DAY)`
        : "";

    // ── Count (all-time or period comparison) ──────────────────────────
    let thisWeekCount = 0;
    let lastWeekCount = 0;
    let totalOutstanding = 0;

    if (filter === 0) {
      const [countRows]: any = await db.query(`
        SELECT COUNT(*) AS cnt,
               SUM(GREATEST(l.total - COALESCE(pay.total_paid, 0), 0)) AS outstanding
        FROM lpo l
        JOIN mr_headers mh ON mh.id = l.mr_header_id
        ${lpoPaymentsJoin}
        WHERE ${pendingPaymentFilter}
      `);
      thisWeekCount = Number(countRows[0]?.cnt) || 0;
      totalOutstanding = Number(countRows[0]?.outstanding) || 0;
    } else {
      const [countRows]: any = await db.query(
        `
        SELECT
          SUM(CASE WHEN l.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY) THEN 1 ELSE 0 END)                                                              AS this_week,
          SUM(CASE WHEN l.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
                    AND l.created_at <  DATE_SUB(CURDATE(), INTERVAL ? DAY) THEN 1 ELSE 0 END)                                                              AS last_week,
          SUM(GREATEST(l.total - COALESCE(pay.total_paid, 0), 0))                                                                                           AS outstanding
        FROM lpo l
        JOIN mr_headers mh ON mh.id = l.mr_header_id
        ${lpoPaymentsJoin}
        WHERE ${pendingPaymentFilter}
        `,
        [filter, filter * 2, filter],
      );
      thisWeekCount = Number(countRows[0]?.this_week) || 0;
      lastWeekCount = Number(countRows[0]?.last_week) || 0;
      totalOutstanding = Number(countRows[0]?.outstanding) || 0;
    }

    // ── Items (top LPOs by amount) ─────────────────────────────────────
    const [itemRows]: any = await db.query(
      `
      SELECT l.id AS lpo_id, l.mr_header_id, l.total, s.name AS supplier_name
      FROM lpo l
      JOIN suppliers s ON s.id = l.supplier_id
      JOIN mr_headers mh ON mh.id = l.mr_header_id
      ${lpoPaymentsJoin}
      WHERE ${pendingPaymentFilter}
      ${dateClause}
      ORDER BY l.total DESC
      LIMIT ?
      `,
      [maxItems],
    );
    const items = itemRows.map((lpo: any) => ({
      display_id: `LPO-${String(lpo.lpo_id).padStart(5, "0")}`,
      amount: Number(lpo.total) || 0,
      raw_id: lpo.lpo_id,
      mr_header_id: lpo.mr_header_id,
      type: "lpo",
    }));

    // ── Payment types (by supplier type) ──────────────────────────────
    const [paymentTypeRows]: any = await db.query(
      `
      SELECT s.type AS supplier_type, COUNT(*) AS lpo_count
      FROM lpo l
      JOIN mr_headers mh ON mh.id = l.mr_header_id
      JOIN suppliers s ON s.id = l.supplier_id
      ${lpoPaymentsJoin}
      WHERE ${pendingPaymentFilter}
      ${dateClause}
      GROUP BY s.type
      ORDER BY lpo_count DESC
      `,
    );
    const paymentTypes = paymentTypeRows.map((r: any) => ({
      supplier_type: r.supplier_type,
      lpo_count: Number(r.lpo_count),
    }));

    // ── Projects at risk ───────────────────────────────────────────────
    const [projectRows]: any = await db.query(
      `
      SELECT p.name AS project_name, COUNT(*) AS mr_count
      FROM lpo l
      JOIN mr_headers mh ON mh.id = l.mr_header_id
      ${lpoPaymentsJoin}
      LEFT JOIN projects p ON p.id = l.project_id
      WHERE ${pendingPaymentFilter}
      ${dateClause}
      GROUP BY p.id, p.name
      ORDER BY mr_count DESC
      `,
    );

    // ── Top suppliers ──────────────────────────────────────────────────
    const [supplierRows]: any = await db.query(
      `
      SELECT s.name AS supplier_name,
             COUNT(*) AS lpo_count,
             SUM(GREATEST(l.total - COALESCE(pay.total_paid, 0), 0)) AS outstanding
      FROM lpo l
      JOIN mr_headers mh ON mh.id = l.mr_header_id
      JOIN suppliers s ON s.id = l.supplier_id
      ${lpoPaymentsJoin}
      WHERE ${pendingPaymentFilter}
      ${dateClause}
      GROUP BY s.id, s.name
      ORDER BY outstanding DESC
      LIMIT 5
      `,
    );

    // ── Date range ─────────────────────────────────────────────────────
    const [dateRangeRows]: any = await db.query(
      `
      SELECT MIN(l.created_at) AS earliest, MAX(l.created_at) AS latest
      FROM lpo l
      JOIN mr_headers mh ON mh.id = l.mr_header_id
      ${lpoPaymentsJoin}
      WHERE ${pendingPaymentFilter}
      ${dateClause}
      `,
    );

    return NextResponse.json(
      {
        this_week: thisWeekCount,
        last_week: lastWeekCount,
        total_count: thisWeekCount,
        total_outstanding: totalOutstanding,
        items,
        payment_types: paymentTypes,
        projects_at_risk: projectRows,
        top_suppliers: supplierRows,
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
