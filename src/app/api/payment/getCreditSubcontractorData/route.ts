import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";

// ── Ensure jo_payments table exists ──────────────────────────────────────────
async function ensureTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS jo_payments (
      id            INT NOT NULL AUTO_INCREMENT,
      pr_id         INT NOT NULL,
      jo_line_id    INT DEFAULT NULL,
      payment_type  TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      amount        DECIMAL(15,3) NOT NULL,
      receipt_file  VARCHAR(500) DEFAULT NULL,
      notes         TEXT DEFAULT NULL,
      recorded_by   VARCHAR(255) NOT NULL DEFAULT 'Finance',
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY pr_id (pr_id),
      KEY jo_line_id (jo_line_id)
    )
  `);
}

export async function POST(request: NextRequest) {
  try {
    await ensureTable();

    const body = await request.json();
    const subcontractorId = Number(body.subcontractor_id);

    if (!subcontractorId || isNaN(subcontractorId)) {
      return NextResponse.json(
        { success: false, error: "Valid subcontractor_id is required" },
        { status: 400 },
      );
    }

    // 1. Get subcontractor
    const [subRows] = await db.query<RowDataPacket[]>(
      `SELECT * FROM subcontractors WHERE id = ? LIMIT 1`,
      [subcontractorId],
    );
    const subcontractor = (subRows as any[])[0] ?? null;

    if (!subcontractor) {
      return NextResponse.json(
        { success: false, error: "Subcontractor not found" },
        { status: 404 },
      );
    }

    // 2. Get payment requests for this subcontractor
    const [prRows] = await db.query<RowDataPacket[]>(
      `SELECT
        mh.id,
        mh.payment_jo_reference_id AS jo_header_id,
        mh.requested_by,
        mh.project_id,
        p.name AS project_name,
        COALESCE(l.vat_rate, 0) AS vat_rate,
        ROUND(COALESCE(jl_totals.after_retention_sum, 0), 2) AS after_retention,
        ROUND(COALESCE(jl_totals.after_retention_with_vat_sum, 0), 2) AS total_with_vat,
        ROUND(COALESCE(pmt.total_paid, 0), 2) AS total_paid,
        ROUND(GREATEST(
          COALESCE(jl_totals.after_retention_with_vat_sum, 0) - COALESCE(pmt.total_paid, 0),
          0
        ), 2) AS outstanding,
        CASE
          WHEN COALESCE(pmt.total_paid, 0) > 0
           AND ROUND(GREATEST(
             COALESCE(jl_totals.after_retention_with_vat_sum, 0) - COALESCE(pmt.total_paid, 0),
             0
           ), 2) = 0
          THEN 1 ELSE 0
        END AS is_paid
      FROM mr_headers mh
      -- Only include payment requests whose referenced JO is completed (stage 25)
      JOIN mr_headers jo_ref ON jo_ref.id = mh.payment_jo_reference_id AND jo_ref.progress_id = 25
      LEFT JOIN lpo l ON l.mr_header_id = mh.payment_jo_reference_id
      LEFT JOIN projects p ON mh.project_id = p.id
      LEFT JOIN (
        SELECT mr_header_id,
          SUM(COALESCE(after_retention, 0)) AS after_retention_sum,
          SUM(COALESCE(after_retention_with_vat, 0)) AS after_retention_with_vat_sum
        FROM jo_lines
        GROUP BY mr_header_id
      ) jl_totals ON jl_totals.mr_header_id = mh.payment_jo_reference_id
      LEFT JOIN (SELECT pr_id, SUM(amount) AS total_paid FROM jo_payments GROUP BY pr_id) pmt ON pmt.pr_id = mh.id
      WHERE mh.type = 'payment' AND mh.progress_id = 25 AND l.subcontractor_id = ?
      GROUP BY mh.id, pmt.total_paid, p.name, jl_totals.after_retention_sum, jl_totals.after_retention_with_vat_sum, l.vat_rate
      ORDER BY is_paid ASC, mh.id DESC`,
      [subcontractorId],
    );

    const paymentRequests = prRows as any[];

    // 3. Get pr_lines for all PR ids
    let prLines: any[] = [];
    if (paymentRequests.length > 0) {
      const prIds = paymentRequests.map((r) => r.id);
      const placeholders = prIds.map(() => "?").join(",");
      const [lineRows] = await db.query<RowDataPacket[]>(
        `SELECT pl.id, pl.mr_header_id, pl.boq_line_id, pl.jo_line_id,
          pl.subcontracted_qty, pl.completed_qty, pl.retention, pl.attachment,
          bl.item_name, bl.item_description, bl.rate_per_quantity,
          bl.quantity AS boq_qty, bl.unit AS boq_unit,
          jl.job_scope_name, jl.job_description, jl.contract_type,
          sq.total_price AS boq_approved_price
        FROM pr_lines pl
        JOIN boq_lines bl ON bl.id = pl.boq_line_id
        JOIN vw_jo_lines jl ON jl.id = pl.jo_line_id
        LEFT JOIN jo_line_subcontractor_quotation sq
          ON sq.jo_line_id = pl.jo_line_id
          AND sq.boq_line_id = pl.boq_line_id
          AND sq.approval_status = 'Approved'
        WHERE pl.mr_header_id IN (${placeholders})
        ORDER BY pl.mr_header_id, pl.jo_line_id, bl.item_order`,
        prIds,
      );
      prLines = lineRows as any[];
    }

    // 4. Get jo_payments for all PR ids
    let joPayments: any[] = [];
    if (paymentRequests.length > 0) {
      const prIds = paymentRequests.map((r) => r.id);
      const placeholders = prIds.map(() => "?").join(",");
      const [payRows] = await db.query<RowDataPacket[]>(
        `SELECT * FROM jo_payments WHERE pr_id IN (${placeholders}) ORDER BY created_at ASC`,
        prIds,
      );
      joPayments = payRows as any[];
    }

    // 5. Group pr_lines and payments by pr id
    const linesByPr: Record<number, any[]> = {};
    for (const line of prLines) {
      if (!linesByPr[line.mr_header_id]) linesByPr[line.mr_header_id] = [];
      linesByPr[line.mr_header_id].push(line);
    }

    const paymentsByPr: Record<number, any[]> = {};
    for (const p of joPayments) {
      if (!paymentsByPr[p.pr_id]) paymentsByPr[p.pr_id] = [];
      paymentsByPr[p.pr_id].push(p);
    }

    const enrichedPRs = paymentRequests.map((pr) => ({
      ...pr,
      pr_lines: linesByPr[pr.id] || [],
      payments: paymentsByPr[pr.id] || [],
    }));

    // 6. Stats
    const unpaidPRs = enrichedPRs.filter((pr) => !pr.is_paid);
    const creditOutstanding = unpaidPRs.reduce(
      (s, pr) => s + Number(pr.outstanding),
      0,
    );
    const pastPayments = joPayments.reduce(
      (s, p) => s + Number(p.amount),
      0,
    );
    const prCount = unpaidPRs.length;

    return NextResponse.json(
      {
        success: true,
        subcontractor,
        paymentRequests: enrichedPRs,
        stats: {
          creditOutstanding,
          pastPayments,
          prCount,
        },
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("getCreditSubcontractorData error:", err.sqlMessage || err.message);
    return NextResponse.json(
      { success: false, error: err.sqlMessage || err.message },
      { status: 500 },
    );
  }
}
