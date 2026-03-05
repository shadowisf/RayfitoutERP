import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";

export async function POST(req: NextRequest) {
  try {
    const { resolution_id } = await req.json();

    if (!resolution_id) {
      return NextResponse.json(
        { success: false, message: "resolution_id is required" },
        { status: 400 },
      );
    }

    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT
        rr.id AS resolution_id,
        rr.qc_mr_line_id,
        rr.return_required,
        rr.pickup_type,
        rr.return_quantity,
        rr.expected_refund,
        rr.actual_refund,
        rr.variance_amount,
        rr.eta_delivery_date,
        rr.created_at AS resolution_created_at,
        rr.created_by,
        qc.lpo_id,
        qc.accepted_quantity,
        qc.id AS qc_id,
        lml.mr_line_id,
        vml.material_description,
        vml.unit,
        ml.delivery_location,
        gl.received_quantity,
        l.id AS lpo_number,
        l.supplier_id,
        l.supplier_contact_person_name,
        l.supplier_email,
        s.id AS supplier_table_id,
        s.name AS supplier_name,
        s.address AS supplier_address,
        mh.id AS mr_header_id
      FROM qc_resolution_return_refund rr
      INNER JOIN qc_mr_line qc ON rr.qc_mr_line_id = qc.id
      INNER JOIN lpo_mr_line lml ON qc.lpo_mr_line_id = lml.id
      INNER JOIN mr_lines ml ON lml.mr_line_id = ml.id
      INNER JOIN vw_mr_lines vml ON lml.mr_line_id = vml.id
      INNER JOIN lpo l ON qc.lpo_id = l.id
      INNER JOIN suppliers s ON l.supplier_id = s.id
      INNER JOIN mr_headers mh ON vml.mr_header_id = mh.id
      LEFT JOIN grn g ON g.lpo_id = qc.lpo_id
      LEFT JOIN grn_mr_line gl ON gl.grn_id = g.id AND gl.lpo_mr_line_id = qc.lpo_mr_line_id
      WHERE rr.id = ?`,
      [resolution_id],
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Resolution not found" },
        { status: 404 },
      );
    }

    const row = rows[0];
    const receivedQty = Number(row.received_quantity) || 0;
    const acceptedQty = Number(row.accepted_quantity) || 0;
    const failedQty = receivedQty - acceptedQty;

    return NextResponse.json({
      success: true,
      data: {
        resolution_id: row.resolution_id,
        qc_mr_line_id: row.qc_mr_line_id,
        qc_id: row.qc_id,
        mr_line_id: row.mr_line_id,
        mr_header_id: row.mr_header_id,
        lpo_id: row.lpo_id,
        lpo_number: row.lpo_number,
        resolution_created_at: row.resolution_created_at,
        created_by: row.created_by,
        return_required: row.return_required,
        pickup_type: row.pickup_type,
        return_quantity: Number(row.return_quantity) || 0,
        expected_refund: Number(row.expected_refund) || 0,
        actual_refund: Number(row.actual_refund) || 0,
        variance_amount: Number(row.variance_amount) || 0,
        eta_delivery_date: row.eta_delivery_date,
        material_description: row.material_description,
        unit: row.unit,
        delivery_location: row.delivery_location,
        received_quantity: receivedQty,
        failed_quantity: failedQty,
        supplier: {
          id: row.supplier_table_id,
          name: row.supplier_name,
          contact_person: row.supplier_contact_person_name,
          address: row.supplier_address,
          email: row.supplier_email,
        },
      },
    });
  } catch (error: any) {
    console.error("Error fetching RTV data:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch RTV data",
        error: error.sqlMessage || error.message,
      },
      { status: 500 },
    );
  }
}
