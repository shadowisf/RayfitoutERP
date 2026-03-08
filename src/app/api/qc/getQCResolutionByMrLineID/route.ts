import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";

export async function POST(request: Request) {
  const body = await request.json();

  try {
    const { mr_header_id, mr_line_id } = body;

    // Find the qc_mr_line record for this MR line via lpo_mr_line
    const [qcRows] = await db.query<RowDataPacket[]>(
      `SELECT qc.id as qc_mr_line_id
       FROM qc_mr_line qc
       INNER JOIN lpo_mr_line lml ON qc.lpo_mr_line_id = lml.id
       WHERE lml.mr_line_id = ?
       LIMIT 1`,
      [mr_line_id]
    );

    if (qcRows.length === 0) {
      return NextResponse.json({
        success: false,
        message: "No QC record found for this MR line",
      });
    }

    const qcMrLineId = qcRows[0].qc_mr_line_id;

    // Check qc_resolution_return_refund
    const [returnRefundRows] = await db.query<RowDataPacket[]>(
      `SELECT *, 'Return/Refund' as resolution_type
       FROM qc_resolution_return_refund
       WHERE qc_mr_line_id = ?
       LIMIT 1`,
      [qcMrLineId]
    );

    if (returnRefundRows.length > 0) {
      return NextResponse.json({
        success: true,
        data: {
          resolution_id: returnRefundRows[0].id,
          resolution_type: "Return/Refund",
          ...returnRefundRows[0],
        },
      });
    }

    // Check qc_resolution_replace
    const [replaceRows] = await db.query<RowDataPacket[]>(
      `SELECT *, 'Replace from Vendor' as resolution_type
       FROM qc_resolution_replace
       WHERE qc_mr_line_id = ?
       LIMIT 1`,
      [qcMrLineId]
    );

    if (replaceRows.length > 0) {
      return NextResponse.json({
        success: true,
        data: {
          resolution_id: replaceRows[0].id,
          resolution_type: "Replace from Vendor",
          ...replaceRows[0],
        },
      });
    }

    // No resolution found
    return NextResponse.json({
      success: false,
      message: "No resolution found",
    });
  } catch (error: any) {
    console.error("Error fetching resolution:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch resolution",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
