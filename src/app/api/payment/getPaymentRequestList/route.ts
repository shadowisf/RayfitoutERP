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
        ROUND(GREATEST(COALESCE(SUM(jl.after_retention), 0) - COALESCE(pmt.total_paid, 0), 0), 2) AS outstanding,
        CASE
          WHEN COALESCE(pmt.total_paid, 0) > 0
           AND ROUND(GREATEST(COALESCE(SUM(jl.after_retention), 0) - COALESCE(pmt.total_paid, 0), 0), 2) = 0
          THEN 1 ELSE 0
        END AS is_paid
      FROM mr_headers mh
      JOIN vw_mr_headers vw ON vw.id = mh.id
      LEFT JOIN lpo l ON l.mr_header_id = mh.payment_jo_reference_id
      LEFT JOIN subcontractors s ON s.id = l.subcontractor_id
      LEFT JOIN jo_lines jl ON jl.mr_header_id = mh.payment_jo_reference_id
      LEFT JOIN (
        SELECT pr_id, SUM(amount) AS total_paid
        FROM jo_payments
        GROUP BY pr_id
      ) pmt ON pmt.pr_id = mh.id
      WHERE mh.type = 'payment'
      GROUP BY mh.id, l.subcontractor_id, s.name, pmt.total_paid
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
