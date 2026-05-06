import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const [rows]: any = await db.query(`
      SELECT
        l.id,
        l.project_id,
        l.mr_header_id,
        l.supplier_id,
        l.progress_id,
        l.quotation_code,
        l.delivery_date,
        l.total,
        l.payment_status,
        l.created_at,
        s.name        AS supplier_name,
        s.type        AS supplier_type,
        mh.requested_by,
        mh.department_id,
        mh.required_date,
        mh.project_id AS mr_project_id,
        p.name        AS project_name,
        d.value       AS department_name,
        pr.value      AS progress_name,
        (SELECT COUNT(*) FROM lpo_mr_line lml WHERE lml.lpo_id = l.id) AS item_count,
        (
          SELECT CONCAT(bl.sub_category, ' - ', COUNT(*), ' ITEM(S)')
          FROM lpo_mr_line lml2
          JOIN jt_mr_lines_boq_lines jbl ON jbl.mr_line_id = lml2.mr_line_id
          JOIN boq_lines bl ON bl.id = jbl.boq_line_id
          WHERE lml2.lpo_id = l.id
          GROUP BY bl.id, bl.sub_category
          ORDER BY bl.total_cost DESC
          LIMIT 1
        ) AS identifier
      FROM lpo l
      JOIN suppliers       s  ON l.supplier_id    = s.id
      JOIN mr_headers      mh ON l.mr_header_id   = mh.id
      LEFT JOIN projects   p  ON mh.project_id    = p.id
      LEFT JOIN lut_mr_headers_departments d  ON mh.department_id = d.id
      LEFT JOIN lut_mr_headers_progress    pr ON l.progress_id    = pr.id
      WHERE mh.progress_id = 26
        AND l.progress_id NOT IN (12, 13, 15, 16, 23, 25)
      ORDER BY l.created_at DESC
    `);

    return NextResponse.json(rows, { status: 200 });
  } catch (err: any) {
    console.error("getPaymentKanban error:", err.sqlMessage || err.message);
    return NextResponse.json({ error: err.sqlMessage || err.message }, { status: 500 });
  }
}
