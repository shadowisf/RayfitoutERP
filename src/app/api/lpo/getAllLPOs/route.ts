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
        s.name as supplier_name,
        mh.requested_by,
        mh.department_id,
        mh.required_date,
        mh.project_id as mr_project_id,
        p.name as project_name,
        d.value as department_name,
        pr.value as progress_name,
        (SELECT COUNT(*) FROM lpo_mr_line lml WHERE lml.lpo_id = l.id) AS item_count
      FROM lpo l
      JOIN suppliers s ON l.supplier_id = s.id
      JOIN mr_headers mh ON l.mr_header_id = mh.id
      LEFT JOIN projects p ON mh.project_id = p.id
      LEFT JOIN lut_mr_headers_departments d ON mh.department_id = d.id
      LEFT JOIN lut_mr_headers_progress pr ON l.progress_id = pr.id
      ORDER BY l.created_at DESC
    `);

    return NextResponse.json(rows, { status: 200 });
  } catch (err: any) {
    console.error("SQL Error:", err.sqlMessage);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}
