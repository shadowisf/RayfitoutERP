import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Shared helper expression — true when an LPO is considered fully paid.
// Priority: payment_status (TRIM + LOWER to handle stray whitespace/casing),
//           then fall back to lpo_payments total vs. LPO face value.
const IS_PAID_EXPR = `(
  LOWER(TRIM(IFNULL(l.payment_status, '')))
    IN ('approved','paid','fully paid','completed','done')
  OR (l.total > 0 AND COALESCE(pay.total_paid, 0) >= l.total)
)`;

export async function GET() {
  try {
    const [rows]: any = await db.query(`
      SELECT
        l.id,
        l.mr_header_id,
        l.supplier_id,
        l.progress_id,
        l.total,
        l.payment_status,
        l.payment_terms,
        l.created_at,
        s.name        AS supplier_name,
        s.type        AS supplier_type,
        s.payment_terms AS supplier_payment_terms,
        mh.requested_by,
        mh.department_id,
        mh.required_date,
        mh.project_id AS mr_project_id,
        p.name        AS project_name,
        d.value       AS department_name,
        pr.value      AS progress_name,
        ROUND(COALESCE(pay.total_paid, 0), 2) AS total_paid,
        -- outstanding is 0 for paid rows; otherwise remaining balance
        ROUND(
          CASE
            WHEN ${IS_PAID_EXPR} THEN 0
            ELSE GREATEST(l.total - COALESCE(pay.total_paid, 0), 0)
          END, 2
        ) AS outstanding,
        CASE WHEN ${IS_PAID_EXPR} THEN 1 ELSE 0 END AS is_paid
      FROM lpo l
      JOIN suppliers       s  ON l.supplier_id    = s.id
      JOIN mr_headers      mh ON l.mr_header_id   = mh.id
      LEFT JOIN projects   p  ON mh.project_id    = p.id
      LEFT JOIN lut_mr_headers_departments d  ON mh.department_id = d.id
      LEFT JOIN lut_mr_headers_progress    pr ON l.progress_id    = pr.id
      LEFT JOIN (
        SELECT lpo_id, SUM(amount) AS total_paid
        FROM lpo_payments
        GROUP BY lpo_id
      ) pay ON pay.lpo_id = l.id
      WHERE mh.progress_id = 26
        AND l.progress_id > 14
      ORDER BY
        CASE WHEN ${IS_PAID_EXPR} THEN 1 ELSE 0 END ASC,
        l.created_at DESC
    `);

    return NextResponse.json(rows, { status: 200 });
  } catch (err: any) {
    console.error("getPaymentKanban error:", err.sqlMessage || err.message);
    return NextResponse.json({ error: err.sqlMessage || err.message }, { status: 500 });
  }
}
