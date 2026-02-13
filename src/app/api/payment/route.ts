import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Get supplier payment data from LPOs
    const [supplierRows]: any = await db.query(`
      SELECT
        s.id,
        s.name,
        s.type,
        SUM(CASE 
          WHEN (l.payment_file IS NULL OR l.payment_file = '' OR l.payment_file = '[]')
          THEN lpo_lines.lpo_total 
          ELSE 0 
        END) as total_amount,
        MAX(l.delivery_date) as due_date,
        COUNT(DISTINCT l.id) as total_lpos,
        SUM(CASE WHEN l.payment_status = 'Approved' THEN 1 ELSE 0 END) as paid_lpos,
        COUNT(DISTINCT CASE 
          WHEN (l.payment_file IS NULL OR l.payment_file = '' OR l.payment_file = '[]')
          THEN l.id 
          ELSE NULL 
        END) as unpaid_lpos
      FROM suppliers s
      JOIN lpo l ON s.id = l.supplier_id
      JOIN (
        SELECT lpo_id, SUM(total_price) as lpo_total
        FROM lpo_mr_line
        GROUP BY lpo_id
      ) lpo_lines ON l.id = lpo_lines.lpo_id
      WHERE l.progress_id >= 14
      GROUP BY s.id, s.name, s.type
      ORDER BY s.name ASC
    `);

    // Get subcontractor payment data from approved quotations
    const [subcontractorRows]: any = await db.query(`
      SELECT
        sc.id,
        sc.name,
        'Subcontractor' as type,
        SUM(CASE 
          WHEN (mh.jo_payment_receipt IS NULL OR mh.jo_payment_receipt = '' OR mh.jo_payment_receipt = '[]')
          THEN sq.total_price 
          ELSE 0 
        END) as total_amount,
        MAX(mh.required_date) as due_date,
        COUNT(sq.id) as total_quotations,
        SUM(CASE WHEN mh.jo_payment_receipt IS NOT NULL AND mh.jo_payment_receipt != '' AND mh.jo_payment_receipt != '[]' THEN 1 ELSE 0 END) as paid_quotations,
        SUM(CASE 
          WHEN (mh.jo_payment_receipt IS NULL OR mh.jo_payment_receipt = '' OR mh.jo_payment_receipt = '[]')
          THEN 1 
          ELSE 0 
        END) as unpaid_quotations
      FROM subcontractors sc
      JOIN jo_line_subcontractor_quotation sq ON sc.id = sq.subcontractor_id
      JOIN jo_lines jl ON sq.jo_line_id = jl.id
      JOIN mr_headers mh ON jl.mr_header_id = mh.id
      WHERE sq.approval_status = 'Approved'
        AND mh.progress_id = 25
        AND mh.jo_invoice_file IS NOT NULL
        AND mh.jo_invoice_file != ''
        AND mh.jo_invoice_file != '[]'
      GROUP BY sc.id, sc.name
      ORDER BY sc.name ASC
    `);

    // Format supplier rows
    const suppliers = supplierRows.map((row: any) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      entity: "supplier",
      total_amount: Number(row.total_amount) || 0,
      due_date: row.due_date,
      total_count: Number(row.total_lpos) || 0,
      paid_count: Number(row.paid_lpos) || 0,
      unpaid_count: Number(row.unpaid_lpos) || 0,
    }));

    // Format subcontractor rows
    const subcontractors = subcontractorRows.map((row: any) => ({
      id: row.id,
      name: row.name,
      type: "Subcontractor",
      entity: "subcontractor",
      total_amount: Number(row.total_amount) || 0,
      due_date: row.due_date,
      total_count: Number(row.total_quotations) || 0,
      paid_count: Number(row.paid_quotations) || 0,
      unpaid_count: Number(row.unpaid_quotations) || 0,
    }));

    return NextResponse.json([...suppliers, ...subcontractors], {
      status: 200,
    });
  } catch (err: any) {
    console.error("SQL Error:", err.sqlMessage);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}