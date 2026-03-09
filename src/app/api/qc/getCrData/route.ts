import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";

export async function POST(req: NextRequest) {
  try {
    const { qc_id } = await req.json();

    if (!qc_id) {
      return NextResponse.json(
        { success: false, message: "qc_id is required" },
        { status: 400 },
      );
    }

    // Fetch QC line with all related data (same joins as getNcrData)
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT
        qc.id AS qc_id,
        qc.lpo_mr_line_id,
        qc.lpo_id,
        qc.accepted_quantity,
        qc.checked_by,
        qc.qc_status,
        l.id AS lpo_number,
        l.supplier_id,
        l.supplier_contact_person_name,
        l.supplier_email,
        s.id AS supplier_table_id,
        s.name AS supplier_name,
        s.address AS supplier_address,
        vml.material_description,
        vml.unit,
        lml.mr_line_id,
        mh.id AS mr_header_id,
        gl.received_quantity,
        qc.created_at AS qc_date
      FROM qc_mr_line qc
      INNER JOIN lpo_mr_line lml ON qc.lpo_mr_line_id = lml.id
      INNER JOIN vw_mr_lines vml ON lml.mr_line_id = vml.id
      INNER JOIN lpo l ON qc.lpo_id = l.id
      INNER JOIN suppliers s ON l.supplier_id = s.id
      INNER JOIN mr_headers mh ON vml.mr_header_id = mh.id
      LEFT JOIN grn g ON g.lpo_id = qc.lpo_id
      LEFT JOIN grn_mr_line gl ON gl.grn_id = g.id AND gl.lpo_mr_line_id = qc.lpo_mr_line_id
      WHERE qc.id = ?`,
      [qc_id],
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "QC record not found" },
        { status: 404 },
      );
    }

    const qcData = rows[0];

    // Fetch ALL checkpoints (not just failed ones like NCR)
    const [checkpoints] = await db.query<RowDataPacket[]>(
      `SELECT
        checkpoint_number,
        checkpoint_name,
        response,
        notes,
        attachments
      FROM qc_checkpoints
      WHERE qc_mr_line_id = ?
      ORDER BY checkpoint_number ASC`,
      [qc_id],
    );

    return NextResponse.json({
      success: true,
      data: {
        qc_id: qcData.qc_id,
        qc_date: qcData.qc_date,
        lpo_id: qcData.lpo_id,
        lpo_number: qcData.lpo_number,
        mr_line_id: qcData.mr_line_id,
        mr_header_id: qcData.mr_header_id,
        material_description: qcData.material_description,
        unit: qcData.unit,
        received_quantity: Number(qcData.received_quantity) || 0,
        accepted_quantity: Number(qcData.accepted_quantity) || 0,
        qc_status: qcData.qc_status,
        checked_by: qcData.checked_by,
        supplier: {
          id: qcData.supplier_table_id,
          name: qcData.supplier_name,
          contact_person: qcData.supplier_contact_person_name,
          address: qcData.supplier_address,
          email: qcData.supplier_email,
        },
        checkpoints: checkpoints.map((cp) => ({
          checkpoint_number: cp.checkpoint_number,
          checkpoint_name: cp.checkpoint_name,
          response: cp.response,
          notes: cp.notes,
          attachments: cp.attachments,
        })),
      },
    });
  } catch (error: any) {
    console.error("Error fetching CR data:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch CR data",
        error: error.sqlMessage || error.message,
      },
      { status: 500 },
    );
  }
}
