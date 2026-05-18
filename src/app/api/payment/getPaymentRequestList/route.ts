import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const [rows]: any = await db.query(`
      SELECT
        mh.id,
        mh.progress_id,
        mh.requested_by,
        mh.date_requested,
        mh.date_requested AS created_at,
        mh.payment_jo_reference_id,
        vw.project_name,
        vw.department_name,
        vw.progress_name,
        l.subcontractor_id,
        s.name AS subcontractor_name,
        ROUND(COALESCE(pmt.total_paid, 0), 2) AS total_paid,
        ROUND(GREATEST(COALESCE(pr_calc.after_retention_sum, 0) - COALESCE(pmt.total_paid, 0), 0), 2) AS outstanding,
        CASE
          WHEN COALESCE(pmt.total_paid, 0) > 0
           AND ROUND(GREATEST(COALESCE(pr_calc.after_retention_sum, 0) - COALESCE(pmt.total_paid, 0), 0), 2) = 0
          THEN 1 ELSE 0
        END AS is_paid
      FROM mr_headers mh
      JOIN vw_mr_headers vw ON vw.id = mh.id
      -- Only include payment requests whose referenced JO is completed (stage 25)
      JOIN mr_headers jo_ref ON jo_ref.id = mh.payment_jo_reference_id AND jo_ref.progress_id = 25
      LEFT JOIN lpo l ON l.mr_header_id = mh.payment_jo_reference_id
      LEFT JOIN subcontractors s ON s.id = l.subcontractor_id
      LEFT JOIN (
        SELECT
          pl.mr_header_id,
          SUM(
            CASE WHEN COALESCE(pl.subcontracted_qty, 0) > 0 AND COALESCE(sq.total_price, 0) > 0
              THEN (COALESCE(pl.completed_qty, 0) / pl.subcontracted_qty) * sq.total_price * (1 - COALESCE(pl.retention, 0) / 100)
              ELSE 0
            END
          ) AS after_retention_sum
        FROM pr_lines pl
        LEFT JOIN jo_line_subcontractor_quotation sq
          ON sq.jo_line_id = pl.jo_line_id
          AND sq.boq_line_id = pl.boq_line_id
          AND sq.approval_status = 'Approved'
        GROUP BY pl.mr_header_id
      ) pr_calc ON pr_calc.mr_header_id = mh.id
      LEFT JOIN (
        SELECT pr_id, SUM(amount) AS total_paid
        FROM jo_payments
        GROUP BY pr_id
      ) pmt ON pmt.pr_id = mh.id
      WHERE mh.type = 'payment'
      GROUP BY mh.id, l.subcontractor_id, s.name, pmt.total_paid, pr_calc.after_retention_sum
      ORDER BY is_paid ASC, mh.id DESC
    `);
    return NextResponse.json(rows, { status: 200 });
  } catch (err: any) {
    console.error(
      "getPaymentRequestList error:",
      err.sqlMessage || err.message,
    );
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
