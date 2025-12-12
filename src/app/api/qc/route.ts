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
        failure_reasons,
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

      // Insert into qc_mr_line table
      const qcInsertQuery = `
      INSERT INTO qc_mr_line (
        lpo_mr_line_id,
        lpo_id,
        checked_by,
        accepted_quantity,
        qc_status,
        physical_damage,
        wrong_specification,
        quantity_packaging_issues,
        functional_failure,
        quality_issues,
        compliance_certification
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

      const qcValues = [
        lpo_mr_line_id,
        lpo_id,
        checked_by,
        accepted_quantity,
        qc_status,
        qc_status === "failed" ? failure_reasons?.physicalDamage || null : null,
        qc_status === "failed"
          ? failure_reasons?.wrongSpecification || null
          : null,
        qc_status === "failed"
          ? failure_reasons?.quantityPackagingIssues || null
          : null,
        qc_status === "failed"
          ? failure_reasons?.functionalFailure || null
          : null,
        qc_status === "failed" ? failure_reasons?.qualityIssues || null : null,
        qc_status === "failed"
          ? failure_reasons?.complianceCertification || null
          : null,
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
          notes
        ) VALUES ?
      `;

        const checkpointValues = Object.entries(checkpoints)
          .filter(([_, data]: [string, any]) => data.response) // Only insert answered checkpoints
          .map(([index, data]: [string, any]) => [
            qcId,
            parseInt(index) + 1,
            getCheckpointName(parseInt(index)),
            data.response,
            data.notes || null,
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

    if (body.action === "updateQC") {
      const {
        qc_id,
        lpo_mr_line_id,
        lpo_id,
        checked_by,
        accepted_quantity,
        qc_status,
        checkpoints,
        failure_reasons,
      } = body;

      // Validate required fields
      if (
        !qc_id ||
        !lpo_mr_line_id ||
        !lpo_id ||
        !accepted_quantity ||
        !qc_status
      ) {
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
          qc_status = ?,
          physical_damage = ?,
          wrong_specification = ?,
          quantity_packaging_issues = ?,
          functional_failure = ?,
          quality_issues = ?,
          compliance_certification = ?
        WHERE id = ?
      `;

      const qcValues = [
        checked_by,
        accepted_quantity,
        qc_status,
        qc_status === "failed" ? failure_reasons?.physicalDamage || null : null,
        qc_status === "failed"
          ? failure_reasons?.wrongSpecification || null
          : null,
        qc_status === "failed"
          ? failure_reasons?.quantityPackagingIssues || null
          : null,
        qc_status === "failed"
          ? failure_reasons?.functionalFailure || null
          : null,
        qc_status === "failed" ? failure_reasons?.qualityIssues || null : null,
        qc_status === "failed"
          ? failure_reasons?.complianceCertification || null
          : null,
        qc_id,
      ];

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
            notes
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
    }

    return NextResponse.json(
      {
        success: false,
        message: "Invalid action",
      },
      { status: 400 }
    );
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
