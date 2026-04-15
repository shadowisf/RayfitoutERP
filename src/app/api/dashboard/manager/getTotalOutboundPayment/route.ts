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
        {
          error: "Invalid 'filter' parameter. Must be a non-negative number.",
        },
        { status: 400 },
      );
    }

    // -------------------------------------------------------------------
    // Shared SQL fragments
    // -------------------------------------------------------------------

    // An LPO is considered an "outbound payment commitment" once it's
    // been issued (i.e. no longer in draft). We deliberately do NOT filter
    // by lpo.payment_status here — credit-supplier LPOs never enter the
    // payment-approval workflow, so payment_status stays NULL. Filtering
    // on payment_status='Approved' would drop every credit LPO from the
    // card which is exactly the bug that was being seen.
    const lpoIssuedClause = `lpo.progress_id != 1`;

    // JSON column checks. lpo.payment_file is a JSON column, so string
    // comparisons like "= '' " or "= '[]'" do not work reliably — MySQL
    // normalizes the stored JSON. JSON_LENGTH() returns NULL for a NULL
    // value and the element count for an array, which is what we need.
    const hasPaymentFile = `(lpo.payment_file IS NOT NULL AND JSON_LENGTH(lpo.payment_file) > 0)`;
    const noPaymentFile = `(lpo.payment_file IS NULL OR JSON_LENGTH(lpo.payment_file) = 0)`;

    // Credit-supplier detection. IFNULL guards against suppliers with a
    // NULL type column — without it, "NULL LIKE '%credit%'" evaluates to
    // NULL (unknown) and the supplier falls into no bucket at all.
    const isCreditSupplier = `IFNULL(LOWER(s.type), '') LIKE '%credit%'`;

    // Bucket rules:
    //   COMMITTED = credit supplier AND no payment receipt uploaded yet
    //   PAID      = everything else (cash, marketplace/online, or credit
    //               with a payment receipt already uploaded)
    // Paid + Committed always equals the top-line total by construction.
    const committedClause = `${isCreditSupplier} AND ${noPaymentFile}`;
    const paidClause = `NOT (${isCreditSupplier} AND ${noPaymentFile})`;

    if (filter === 0) {
      // -----------------------------------------------------------------
      // Totals (all-time)
      // -----------------------------------------------------------------
      const [rows]: any = await db.query(
        `SELECT COALESCE(SUM(lpo.total), 0) AS this_week_total, 0 AS last_week_total
         FROM lpo
         JOIN vw_mr_headers h ON lpo.mr_header_id = h.id
         LEFT JOIN suppliers s ON s.id = lpo.supplier_id
         WHERE ${lpoIssuedClause}`,
      );

      // Paid bucket — cash/marketplace OR credit with payment receipt.
      const [paidRows]: any = await db.query(
        `SELECT COALESCE(SUM(lpo.total), 0) AS total
         FROM lpo
         JOIN vw_mr_headers h ON lpo.mr_header_id = h.id
         LEFT JOIN suppliers s ON s.id = lpo.supplier_id
         WHERE ${lpoIssuedClause}
           AND ${paidClause}`,
      );

      // Committed bucket — credit supplier WITHOUT payment receipt.
      const [committedRows]: any = await db.query(
        `SELECT COALESCE(SUM(lpo.total), 0) AS total
         FROM lpo
         JOIN vw_mr_headers h ON lpo.mr_header_id = h.id
         LEFT JOIN suppliers s ON s.id = lpo.supplier_id
         WHERE ${lpoIssuedClause}
           AND ${committedClause}`,
      );

      // Top projects by total LPO amount.
      const [projectRows]: any = await db.query(
        `SELECT h.project_name, COALESCE(SUM(lpo.total), 0) AS total_amount
         FROM lpo
         JOIN vw_mr_headers h ON lpo.mr_header_id = h.id
         WHERE ${lpoIssuedClause}
         GROUP BY h.project_name
         ORDER BY total_amount DESC`,
      );

      // Top suppliers by total amount.
      const [supplierRows]: any = await db.query(
        `SELECT s.name AS supplier_name, COALESCE(SUM(lpo.total), 0) AS total_amount
         FROM lpo
         JOIN vw_mr_headers h ON lpo.mr_header_id = h.id
         LEFT JOIN suppliers s ON s.id = lpo.supplier_id
         WHERE ${lpoIssuedClause}
         GROUP BY s.id, s.name
         ORDER BY total_amount DESC`,
      );

      // LPO count.
      const [countRows]: any = await db.query(
        `SELECT COUNT(*) AS lpo_count
         FROM lpo
         JOIN vw_mr_headers h ON lpo.mr_header_id = h.id
         WHERE ${lpoIssuedClause}`,
      );

      // LPO items list.
      const [itemRows]: any = await db.query(
        `SELECT lpo.id, lpo.mr_header_id, lpo.total, s.name AS supplier_name
         FROM lpo
         JOIN vw_mr_headers h ON lpo.mr_header_id = h.id
         LEFT JOIN suppliers s ON s.id = lpo.supplier_id
         WHERE ${lpoIssuedClause}
         ORDER BY lpo.total DESC LIMIT ?`,
        [maxItems],
      );
      const items = itemRows.map((lpo: any) => ({
        display_id: `LPO-${String(lpo.id).padStart(5, "0")}`,
        amount: Number(lpo.total) || 0,
        raw_id: lpo.id,
        mr_header_id: lpo.mr_header_id,
        type: "lpo",
      }));

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
        },
        { status: 200 },
      );
    }

    // -------------------------------------------------------------------
    // Filtered by N days (on h.date_requested)
    // -------------------------------------------------------------------
    const dateFilterClause = `h.date_requested >= DATE_SUB(CURDATE(), INTERVAL ? DAY)`;

    const [rows]: any = await db.query(
      `SELECT
        SUM(CASE WHEN h.date_requested >= DATE_SUB(CURDATE(), INTERVAL ? DAY) THEN COALESCE(lpo.total, 0) ELSE 0 END) AS this_week_total,
        SUM(CASE WHEN h.date_requested >= DATE_SUB(CURDATE(), INTERVAL ? DAY) AND h.date_requested < DATE_SUB(CURDATE(), INTERVAL ? DAY) THEN COALESCE(lpo.total, 0) ELSE 0 END) AS last_week_total
      FROM lpo
      JOIN vw_mr_headers h ON lpo.mr_header_id = h.id
      LEFT JOIN suppliers s ON s.id = lpo.supplier_id
      WHERE ${lpoIssuedClause}`,
      [filter, filter * 2, filter],
    );

    // Paid bucket (date-filtered).
    const [paidRows]: any = await db.query(
      `SELECT COALESCE(SUM(lpo.total), 0) AS total
       FROM lpo
       JOIN vw_mr_headers h ON lpo.mr_header_id = h.id
       LEFT JOIN suppliers s ON s.id = lpo.supplier_id
       WHERE ${lpoIssuedClause}
         AND ${dateFilterClause}
         AND ${paidClause}`,
      [filter],
    );

    // Committed bucket (date-filtered).
    const [committedRows]: any = await db.query(
      `SELECT COALESCE(SUM(lpo.total), 0) AS total
       FROM lpo
       JOIN vw_mr_headers h ON lpo.mr_header_id = h.id
       LEFT JOIN suppliers s ON s.id = lpo.supplier_id
       WHERE ${lpoIssuedClause}
         AND ${dateFilterClause}
         AND ${committedClause}`,
      [filter],
    );

    // Top projects by total LPO amount (date-filtered).
    const [projectRows]: any = await db.query(
      `SELECT h.project_name, COALESCE(SUM(lpo.total), 0) AS total_amount
       FROM lpo
       JOIN vw_mr_headers h ON lpo.mr_header_id = h.id
       WHERE ${lpoIssuedClause}
         AND ${dateFilterClause}
       GROUP BY h.project_name
       ORDER BY total_amount DESC`,
      [filter],
    );

    // Top suppliers (date-filtered).
    const [supplierRows]: any = await db.query(
      `SELECT s.name AS supplier_name, COALESCE(SUM(lpo.total), 0) AS total_amount
       FROM lpo
       JOIN vw_mr_headers h ON lpo.mr_header_id = h.id
       LEFT JOIN suppliers s ON s.id = lpo.supplier_id
       WHERE ${lpoIssuedClause}
         AND ${dateFilterClause}
       GROUP BY s.id, s.name
       ORDER BY total_amount DESC`,
      [filter],
    );

    // LPO count (date-filtered).
    const [countRows]: any = await db.query(
      `SELECT COUNT(*) AS lpo_count
       FROM lpo
       JOIN vw_mr_headers h ON lpo.mr_header_id = h.id
       WHERE ${lpoIssuedClause}
         AND ${dateFilterClause}`,
      [filter],
    );

    // LPO items list (date-filtered).
    const [itemRows]: any = await db.query(
      `SELECT lpo.id, lpo.mr_header_id, lpo.total, s.name AS supplier_name
       FROM lpo
       JOIN vw_mr_headers h ON lpo.mr_header_id = h.id
       LEFT JOIN suppliers s ON s.id = lpo.supplier_id
       WHERE ${lpoIssuedClause}
         AND ${dateFilterClause}
       ORDER BY lpo.total DESC LIMIT ?`,
      [filter, maxItems],
    );
    const items = itemRows.map((lpo: any) => ({
      display_id: `LPO-${String(lpo.id).padStart(5, "0")}`,
      amount: Number(lpo.total) || 0,
      raw_id: lpo.id,
      mr_header_id: lpo.mr_header_id,
      type: "lpo",
    }));

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
