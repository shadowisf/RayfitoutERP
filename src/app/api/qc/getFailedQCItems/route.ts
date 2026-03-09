import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";

export async function GET() {
  try {
    const query = `
      SELECT
        qc.id AS qc_id,
        qc.lpo_mr_line_id,
        qc.lpo_id,
        qc.accepted_quantity,
        qc.qc_status,
        qc.checked_by,
        lml.mr_line_id,
        lml.unit_price,
        vml.material_category,
        vml.material_subcategory,
        vml.material_description,
        vml.boq_line_ids,
        vml.unit,
        gl.received_quantity,
        s.name AS supplier_name,
        l.id AS lpo_table_id,
        l.invoice_file,
        mh.id AS mr_header_id,
        mh.project_id
      FROM qc_mr_line qc
      INNER JOIN lpo_mr_line lml ON qc.lpo_mr_line_id = lml.id
      INNER JOIN vw_mr_lines vml ON lml.mr_line_id = vml.id
      INNER JOIN lpo l ON qc.lpo_id = l.id
      INNER JOIN suppliers s ON l.supplier_id = s.id
      INNER JOIN mr_headers mh ON vml.mr_header_id = mh.id
      LEFT JOIN grn g ON g.lpo_id = qc.lpo_id
      LEFT JOIN grn_mr_line gl ON gl.grn_id = g.id AND gl.lpo_mr_line_id = qc.lpo_mr_line_id
      LEFT JOIN qc_resolution_return_refund rr ON rr.qc_mr_line_id = qc.id
      LEFT JOIN qc_resolution_replace rep ON rep.qc_mr_line_id = qc.id
      LEFT JOIN qc_resolution_reject_scrap sd ON sd.qc_mr_line_id = qc.id
      LEFT JOIN qc_resolution_conditionally_accepted ca ON ca.qc_mr_line_id = qc.id
      WHERE qc.qc_status = 'failed'
        AND rr.id IS NULL
        AND rep.id IS NULL
        AND sd.id IS NULL
        AND ca.id IS NULL
      ORDER BY qc.id DESC
    `;

    const [rows] = await db.query<RowDataPacket[]>(query);

    const items = rows.map((row) => {
      const receivedQty = Number(row.received_quantity) || 0;
      const acceptedQty = Number(row.accepted_quantity) || 0;
      const failedQty = receivedQty - acceptedQty;

      return {
        qc_id: row.qc_id,
        lpo_mr_line_id: row.lpo_mr_line_id,
        lpo_id: row.lpo_id,
        mr_line_id: row.mr_line_id,
        mr_header_id: row.mr_header_id,
        project_id: row.project_id,
        material_category: row.material_category,
        material_subcategory: row.material_subcategory,
        material_description: row.material_description,
        boq_line_ids: row.boq_line_ids,
        unit: row.unit,
        received_quantity: receivedQty,
        accepted_quantity: acceptedQty,
        failed_quantity: failedQty,
        lpo_table_id: row.lpo_table_id,
        invoice_file: row.invoice_file,
        unit_price: Number(row.unit_price) || 0,
        supplier_name: row.supplier_name,
        checked_by: row.checked_by,
      };
    });

    return NextResponse.json({
      success: true,
      data: items,
    });
  } catch (error: any) {
    console.error("Error fetching failed QC items:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch failed QC items",
        error: error.sqlMessage || error.message,
      },
      { status: 500 },
    );
  }
}
