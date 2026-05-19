import { db } from "@/lib/db";
import { NextResponse } from "next/server";

// ── Two-case amount: old LPOs (approved status) → use lpo.total,
//    new LPOs → use actual amount paid from lpo_payments table
const twoCase = `
  CASE
    WHEN LOWER(IFNULL(lpo.payment_status, ''))
         IN ('approved','paid','fully paid','completed','done')
      THEN lpo.total
    ELSE COALESCE(pay.total_paid, 0)
  END
`;

// Subquery joined as "pay" to get per-LPO paid totals
const payJoin = `
  LEFT JOIN (
    SELECT lpo_id, SUM(amount) AS total_paid
    FROM lpo_payments
    GROUP BY lpo_id
  ) pay ON pay.lpo_id = lpo.id
`;

// Exclude only payment-rejected LPOs (progress 13), matching finance total spent
const baseWhere = `lpo.progress_id NOT IN (13)`;

// Credit-supplier detection
const isCreditSupplier = `IFNULL(LOWER(s.type), '') LIKE '%credit%'`;

const hasPaymentFile = `(lpo.payment_file IS NOT NULL AND JSON_LENGTH(lpo.payment_file) > 0)`;
const noPaymentFile  = `(lpo.payment_file IS NULL  OR  JSON_LENGTH(lpo.payment_file) = 0)`;

const committedClause = `${isCreditSupplier} AND ${noPaymentFile}`;
const paidClause      = `NOT (${isCreditSupplier} AND ${noPaymentFile})`;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { date_from, date_to, limit: itemLimit } = body;
    const maxItems =
      typeof itemLimit === "number" && itemLimit > 0 ? itemLimit : 20;

    const dateClauseParts: string[] = [];
    if (date_from) dateClauseParts.push(`h.date_requested >= '${date_from}'`);
    if (date_to) dateClauseParts.push(`h.date_requested <= '${date_to}'`);
    const dateFilterClause = dateClauseParts.length > 0
      ? `AND ${dateClauseParts.join(" AND ")}`
      : "";

    const [rows]: any = await db.query(
      `SELECT COALESCE(SUM(${twoCase}), 0) AS this_week_total, 0 AS last_week_total
       FROM lpo
       JOIN vw_mr_headers h ON lpo.mr_header_id = h.id
       LEFT JOIN suppliers s ON s.id = lpo.supplier_id
       ${payJoin}
       WHERE ${baseWhere} ${dateFilterClause}`,
    );

    const [paidRows]: any = await db.query(
      `SELECT COALESCE(SUM(${twoCase}), 0) AS total
       FROM lpo
       JOIN vw_mr_headers h ON lpo.mr_header_id = h.id
       LEFT JOIN suppliers s ON s.id = lpo.supplier_id
       ${payJoin}
       WHERE ${baseWhere}
         ${dateFilterClause}
         AND ${paidClause}`,
    );

    const [committedRows]: any = await db.query(
      `SELECT COALESCE(SUM(${twoCase}), 0) AS total
       FROM lpo
       JOIN vw_mr_headers h ON lpo.mr_header_id = h.id
       LEFT JOIN suppliers s ON s.id = lpo.supplier_id
       ${payJoin}
       WHERE ${baseWhere}
         ${dateFilterClause}
         AND ${committedClause}`,
    );

    const [projectRows]: any = await db.query(
      `SELECT h.project_name, COALESCE(SUM(${twoCase}), 0) AS total_amount
       FROM lpo
       JOIN vw_mr_headers h ON lpo.mr_header_id = h.id
       LEFT JOIN suppliers s ON s.id = lpo.supplier_id
       ${payJoin}
       WHERE ${baseWhere} ${dateFilterClause}
       GROUP BY h.project_name
       ORDER BY total_amount DESC`,
    );

    const [supplierRows]: any = await db.query(
      `SELECT s.name AS supplier_name, COALESCE(SUM(${twoCase}), 0) AS total_amount
       FROM lpo
       JOIN vw_mr_headers h ON lpo.mr_header_id = h.id
       LEFT JOIN suppliers s ON s.id = lpo.supplier_id
       ${payJoin}
       WHERE ${baseWhere} ${dateFilterClause}
       GROUP BY s.id, s.name
       ORDER BY total_amount DESC`,
    );

    const [countRows]: any = await db.query(
      `SELECT COUNT(*) AS lpo_count
       FROM lpo
       JOIN vw_mr_headers h ON lpo.mr_header_id = h.id
       WHERE ${baseWhere} ${dateFilterClause}`,
    );

    const [itemRows]: any = await db.query(
      `SELECT lpo.id, lpo.mr_header_id, (${twoCase}) AS total, s.name AS supplier_name,
              DATE_FORMAT(lpo.created_at, '%d %b %Y') AS date
       FROM lpo
       JOIN vw_mr_headers h ON lpo.mr_header_id = h.id
       LEFT JOIN suppliers s ON s.id = lpo.supplier_id
       ${payJoin}
       WHERE ${baseWhere} ${dateFilterClause}
       ORDER BY lpo.created_at DESC LIMIT ?`,
      [maxItems],
    );
    const items = itemRows.map((lpo: any) => ({
      display_id: `LPO-${String(lpo.id).padStart(5, "0")}`,
      amount: Number(lpo.total) || 0,
      raw_id: lpo.id,
      mr_header_id: lpo.mr_header_id,
      date: lpo.date ?? "—",
      type: "lpo",
    }));

    const [dateRangeRows]: any = await db.query(
      `SELECT MIN(h.date_requested) AS earliest, MAX(h.date_requested) AS latest
       FROM lpo
       JOIN vw_mr_headers h ON lpo.mr_header_id = h.id
       WHERE ${baseWhere} ${dateFilterClause}`,
    );

    return NextResponse.json(
      {
        ...rows[0],
        items,
        total_count: items.length,
        paid_total: Number(paidRows[0]?.total) || 0,
        committed_total: Number(committedRows[0]?.total) || 0,
        top_projects: projectRows,
        top_suppliers: supplierRows,
        lpo_count: Number(countRows[0]?.lpo_count) || 0,
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
