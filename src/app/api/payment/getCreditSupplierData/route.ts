import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2";

const IS_PAID_EXPR = `(
  LOWER(TRIM(IFNULL(l.payment_status, '')))
    IN ('approved','paid','fully paid','completed','done')
  OR (l.total > 0 AND ROUND(COALESCE(pay.total_paid, 0), 2) >= ROUND(l.total, 2))
)`;

export async function POST(request: NextRequest) {
  try {
    const { supplier_id } = await request.json();
    const sid = Number(supplier_id);
    if (!sid) return NextResponse.json({ error: "supplier_id required" }, { status: 400 });

    // ── Supplier info ──────────────────────────────────────────────────────
    const [[supplier]] = await db.query<RowDataPacket[]>(
      "SELECT * FROM vw_suppliers WHERE id = ?",
      [sid],
    );
    if (!supplier) return NextResponse.json({ error: "Supplier not found" }, { status: 404 });

    // ── LPOs for this supplier ─────────────────────────────────────────────
    const [lpoRows] = await db.query<RowDataPacket[]>(
      `SELECT
        l.id,
        l.mr_header_id,
        l.supplier_id,
        l.progress_id,
        l.payment_status,
        l.payment_terms,
        l.total,
        l.invoice_file,
        l.payment_file,
        l.signed_file,
        l.created_at,
        mh.requested_by,
        mh.required_date,
        mh.project_id,
        p.name  AS project_name,
        pr.value AS progress_name,
        ROUND(COALESCE(pay.total_paid, 0), 2) AS total_paid,
        ROUND(GREATEST(l.total - COALESCE(pay.total_paid, 0), 0), 2) AS outstanding,
        CASE WHEN ${IS_PAID_EXPR} THEN 1 ELSE 0 END AS is_paid
      FROM lpo l
      JOIN mr_headers mh ON l.mr_header_id = mh.id
      LEFT JOIN projects p ON mh.project_id = p.id
      LEFT JOIN lut_mr_headers_progress pr ON l.progress_id = pr.id
      LEFT JOIN (
        SELECT lpo_id, SUM(amount) AS total_paid
        FROM lpo_payments GROUP BY lpo_id
      ) pay ON pay.lpo_id = l.id
      WHERE l.supplier_id = ?
        AND mh.progress_id = 26
        AND l.progress_id > 14
        AND l.progress_id != 13
      ORDER BY
        CASE WHEN ${IS_PAID_EXPR} THEN 1 ELSE 0 END ASC,
        l.created_at DESC`,
      [sid],
    );

    // ── LPO lines ──────────────────────────────────────────────────────────
    const lpoIds = (lpoRows as any[]).map((r) => r.id);
    let lineRows: any[] = [];
    if (lpoIds.length > 0) {
      const ph = lpoIds.map(() => "?").join(",");
      const [lr] = await db.query<RowDataPacket[]>(
        `SELECT
          lml.id            AS lpo_mr_line_id,
          lml.lpo_id,
          lml.mr_line_id,
          lml.unit_price    AS lpo_unit_price,
          lml.total_price   AS lpo_total_price,
          vml.material_description,
          vml.specification,
          vml.brand,
          vml.approved_proposed_quantity AS qty,
          vml.unit,
          vml.material_category,
          vml.material_subcategory,
          (
            SELECT bl.sub_category
            FROM jt_mr_lines_boq_lines jbl
            JOIN boq_lines bl ON bl.id = jbl.boq_line_id
            WHERE jbl.mr_line_id = lml.mr_line_id
            LIMIT 1
          ) AS boq_line_reference,
          (
            SELECT GROUP_CONCAT(jbl.boq_line_id ORDER BY jbl.boq_line_id SEPARATOR ',')
            FROM jt_mr_lines_boq_lines jbl
            WHERE jbl.mr_line_id = lml.mr_line_id
          ) AS boq_line_ids
        FROM lpo_mr_line lml
        JOIN vw_mr_lines vml ON lml.mr_line_id = vml.id
        WHERE lml.lpo_id IN (${ph})
        ORDER BY lml.lpo_id ASC, lml.id ASC`,
        lpoIds,
      );
      lineRows = lr as any[];
    }

    // ── Payments ───────────────────────────────────────────────────────────
    let paymentRows: any[] = [];
    if (lpoIds.length > 0) {
      const ph = lpoIds.map(() => "?").join(",");
      const [pr] = await db.query<RowDataPacket[]>(
        `SELECT * FROM lpo_payments WHERE lpo_id IN (${ph}) ORDER BY created_at ASC`,
        lpoIds,
      );
      paymentRows = pr as any[];
    }

    // ── Group by LPO ───────────────────────────────────────────────────────
    const linesByLpo: Record<number, any[]> = {};
    for (const l of lineRows) {
      if (!linesByLpo[l.lpo_id]) linesByLpo[l.lpo_id] = [];
      linesByLpo[l.lpo_id].push(l);
    }
    const paymentsByLpo: Record<number, any[]> = {};
    for (const p of paymentRows) {
      if (!paymentsByLpo[p.lpo_id]) paymentsByLpo[p.lpo_id] = [];
      paymentsByLpo[p.lpo_id].push(p);
    }

    const lpos = (lpoRows as any[]).map((lpo) => ({
      ...lpo,
      lpo_mr_lines: linesByLpo[lpo.id] || [],
      payments: paymentsByLpo[lpo.id] || [],
    }));

    // ── Stats ──────────────────────────────────────────────────────────────
    const creditOutstanding = lpos
      .filter((l) => !l.is_paid)
      .reduce((s: number, l: any) => s + Number(l.outstanding), 0);
    const pastPayments = lpos.reduce(
      (s: number, l: any) => s + Number(l.total_paid),
      0,
    );
    const lpoCount = lpos.filter((l: any) => !l.is_paid).length;

    return NextResponse.json({
      success: true,
      supplier,
      lpos,
      stats: { creditOutstanding, pastPayments, lpoCount },
    });
  } catch (err: any) {
    console.error("getCreditSupplierData error:", err.sqlMessage || err.message);
    return NextResponse.json(
      { error: err.sqlMessage || err.message },
      { status: 500 },
    );
  }
}
