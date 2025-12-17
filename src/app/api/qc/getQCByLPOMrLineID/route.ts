import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { lpo_mr_line_id } = body;

    if (!lpo_mr_line_id) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing lpo_mr_line_id",
        },
        { status: 400 }
      );
    }

    const query = `
      SELECT 
        id,
        lpo_mr_line_id,
        lpo_id,
        checked_by,
        accepted_quantity,
        qc_status
      FROM qc_mr_line
      WHERE lpo_mr_line_id = ?
      ORDER BY id DESC
      LIMIT 1
    `;

    const [rows] = await db.query<RowDataPacket[]>(query, [lpo_mr_line_id]);

    if (rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: "No QC record found for this item",
        data: null,
      });
    }

    const qcData = rows[0];

    // Fetch checkpoint data including attachments
    const checkpointsQuery = `
      SELECT 
        checkpoint_number,
        checkpoint_name,
        response,
        notes,
        attachments
      FROM qc_checkpoints
      WHERE qc_mr_line_id = ?
      ORDER BY checkpoint_number ASC
    `;

    const [checkpoints] = await db.query<RowDataPacket[]>(checkpointsQuery, [
      qcData.id,
    ]);

    return NextResponse.json({
      success: true,
      message: "QC record found",
      data: {
        ...qcData,
        checkpoints: checkpoints,
      },
    });
  } catch (error: any) {
    console.error("Error fetching QC data:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch QC data",
        error: error.sqlMessage || error.message,
      },
      { status: 500 }
    );
  }
}
