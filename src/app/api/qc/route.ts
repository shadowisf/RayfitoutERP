// app/api/qc/route.ts
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { ResultSetHeader } from "mysql2";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.action === "createQC") {
      const {
        lpo_mr_line_id,
        lpo_id,
        checked_by,
        accepted_quantity,
        qc_status,
        checkpoints,
      } = body;

      // Validate required fields
      if (!lpo_mr_line_id || !lpo_id || !accepted_quantity || !qc_status) {
        return NextResponse.json(
          {
            success: false,
            message: "Missing required fields",
          },
          { status: 400 }
        );
      }

      // Check if QC already exists for this lpo_mr_line_id
      const checkExistingQuery = `
        SELECT id FROM qc_mr_line WHERE lpo_mr_line_id = ? LIMIT 1
      `;
      const [existingQc] = await db.query<any[]>(checkExistingQuery, [
        lpo_mr_line_id,
      ]);

      if (existingQc.length > 0) {
        return NextResponse.json(
          {
            success: false,
            message:
              "QC record already exists for this item. Please use update instead.",
            existingQcId: existingQc[0].id,
          },
          { status: 400 }
        );
      }

      // Insert into qc_mr_line table
      const qcInsertQuery = `
        INSERT INTO qc_mr_line (
          lpo_mr_line_id,
          lpo_id,
          checked_by,
          accepted_quantity,
          qc_status
        ) VALUES (?, ?, ?, ?, ?)
      `;

      const qcValues = [
        lpo_mr_line_id,
        lpo_id,
        checked_by,
        accepted_quantity,
        qc_status,
      ];

      const [qcResult] = await db.query<ResultSetHeader>(
        qcInsertQuery,
        qcValues
      );
      const qcId = qcResult.insertId;

      // Insert checkpoint responses into qc_checkpoints table
      if (checkpoints && Object.keys(checkpoints).length > 0) {
        const checkpointInsertQuery = `
          INSERT INTO qc_checkpoints (
            qc_mr_line_id,
            checkpoint_number,
            checkpoint_name,
            response,
            notes,
            attachments
          ) VALUES ?
        `;

        const checkpointValues = Object.entries(checkpoints)
          .filter(([_, data]: [string, any]) => data.response)
          .map(([index, data]: [string, any]) => [
            qcId,
            parseInt(index) + 1,
            getCheckpointName(parseInt(index)),
            data.response,
            data.notes || null,
            data.attachments && data.attachments.length > 0
              ? JSON.stringify(data.attachments)
              : null,
          ]);

        if (checkpointValues.length > 0) {
          await db.query(checkpointInsertQuery, [checkpointValues]);
        }
      }

      return NextResponse.json({
        success: true,
        message: "QC checklist saved successfully",
        data: { qc_id: qcId },
      });
    }
  } catch (error: any) {
    console.error("Error saving QC checklist:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to save QC checklist",
        error: error.sqlMessage || error.message,
      },
      { status: 500 }
    );
  }
}

// Helper function to get checkpoint name by index
function getCheckpointName(index: number): string {
  const checkpoints = [
    "Item matches purchase specifications",
    "Quantity matches GRN",
    "Dimensions as per approved drawings",
    "Material grade confirmed",
    "Visual inspection - no damage",
    "Finishing quality acceptable",
    "No corrosion / scratches",
    "Color matches approved sample",
    "Assembly/Functional test",
    "Correct labeling / barcode",
    "Proper packaging",
    "Safety compliance",
  ];
  return checkpoints[index] || "";
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    const {
      lpo_mr_line_id,
      lpo_id,
      checked_by,
      accepted_quantity,
      qc_status,
      checkpoints,
      qc_id,
    } = body;

    // Validate required fields
    if (!lpo_mr_line_id || !lpo_id || !accepted_quantity || !qc_status) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing required fields",
        },
        { status: 400 }
      );
    }

    // Update qc_mr_line table
    const qcUpdateQuery = `
      UPDATE qc_mr_line 
      SET 
        checked_by = ?,
        accepted_quantity = ?,
        qc_status = ?
      WHERE id = ?
    `;

    const qcValues = [checked_by, accepted_quantity, qc_status, qc_id];

    await db.query<ResultSetHeader>(qcUpdateQuery, qcValues);

    // Delete existing checkpoints
    const deleteCheckpointsQuery = `
      DELETE FROM qc_checkpoints WHERE qc_mr_line_id = ?
    `;
    await db.query(deleteCheckpointsQuery, [qc_id]);

    // Insert updated checkpoint responses
    if (checkpoints && Object.keys(checkpoints).length > 0) {
      const checkpointInsertQuery = `
        INSERT INTO qc_checkpoints (
          qc_mr_line_id,
          checkpoint_number,
          checkpoint_name,
          response,
          notes,
          attachments
        ) VALUES ?
      `;

      const checkpointValues = Object.entries(checkpoints)
        .filter(([_, data]: [string, any]) => data.response)
        .map(([index, data]: [string, any]) => [
          qc_id,
          parseInt(index) + 1,
          getCheckpointName(parseInt(index)),
          data.response,
          data.notes || null,
          data.attachments && data.attachments.length > 0
            ? JSON.stringify(data.attachments)
            : null,
        ]);

      if (checkpointValues.length > 0) {
        await db.query(checkpointInsertQuery, [checkpointValues]);
      }
    }

    return NextResponse.json({
      success: true,
      message: "QC checklist updated successfully",
      data: { qc_id: qc_id },
    });
  } catch (error: any) {
    console.error("Error updating QC checklist:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update QC checklist",
        error: error.sqlMessage || error.message,
      },
      { status: 500 }
    );
  }
}
