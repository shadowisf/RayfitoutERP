import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

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
        s.name as supplier_name,
        mh.requested_by,
        mh.department_id,
        mh.required_date,
        mh.project_id as mr_project_id,
        p.name as project_name,
        d.value as department_name,
        pr.value as progress_name,
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
        ) AS identifier,
        (SELECT GROUP_CONCAT(DISTINCT CONCAT(inv.id, ':::', inv.description) SEPARATOR ' | ')
         FROM lpo_mr_line lml2
         JOIN stocks st ON st.mr_line_id = lml2.mr_line_id
         JOIN inventory inv ON inv.id = st.inventory_item_id
         WHERE lml2.lpo_id = l.id
        ) AS stock_inventory_items,
        CASE WHEN (
          LOWER(TRIM(IFNULL(l.payment_status, ''))) IN ('approved','paid','fully paid','completed','done')
          OR (l.total > 0 AND ROUND(COALESCE(pay.total_paid, 0), 2) >= ROUND(l.total, 2))
        ) THEN 1 ELSE 0 END AS is_paid
      FROM lpo l
      JOIN suppliers s ON l.supplier_id = s.id
      JOIN mr_headers mh ON l.mr_header_id = mh.id
      LEFT JOIN projects p ON mh.project_id = p.id
      LEFT JOIN lut_mr_headers_departments d ON mh.department_id = d.id
      LEFT JOIN lut_mr_headers_progress pr ON l.progress_id = pr.id
      LEFT JOIN (
        SELECT lpo_id, SUM(amount) AS total_paid
        FROM lpo_payments
        GROUP BY lpo_id
      ) pay ON pay.lpo_id = l.id
      ORDER BY l.created_at DESC
    `);

    return NextResponse.json(rows, { status: 200 });
  } catch (err: any) {
    console.error("SQL Error:", err.sqlMessage);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}
