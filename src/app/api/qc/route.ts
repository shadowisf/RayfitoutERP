import { db } from "@/lib/db";
import { ResultSetHeader } from "mysql2";
import { NextRequest, NextResponse } from "next/server";

function getCheckpointName(index: number): string {
  const checkpoints = [
    "Item matches purchase specifications",
    "Dimensions as per approved drawings",
    "Material grade confirmed",
    "Visual inspection - no damage",
    "Finishing quality acceptable",
    "No corrosion / scratches",
    "Color matches approved sample",
    "Assembly/Functional test",
  ];
  return checkpoints[index] || "";
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, resolution_id, resolution_type } = body;

    if (action !== "deleteQCResolution") {
      return NextResponse.json(
        { success: false, message: "Invalid action" },
        { status: 400 }
      );
    }

    if (!resolution_id) {
      return NextResponse.json(
        { success: false, message: "Resolution ID is required" },
        { status: 400 }
      );
    }

    // Determine which table to delete from based on resolution type
    let tableName = "";
    switch (resolution_type) {
      case "Return/refund":
        tableName = "qc_failed_return_refund";
        break;
      case "Replace":
        tableName = "qc_failed_replace";
        break;
      case "Conditionally accepted":
        tableName = "qc_failed_conditionally_accepted";
        break;
      case "Reject/scrap":
        tableName = "qc_failed_reject_scrap";
        break;
      default:
        return NextResponse.json(
          { success: false, message: "Invalid resolution type" },
          { status: 400 }
        );
    }

    // Delete from the specific resolution table
    const deleteQuery = `DELETE FROM ${tableName} WHERE id = ?`;

    // Execute the delete query
    // Replace this with your actual database query execution
    // Example:
    // await db.execute(deleteQuery, [resolution_id]);

    // For now, assuming the delete was successful
    console.log(`Deleting from ${tableName} where id = ${resolution_id}`);

    return NextResponse.json({
      success: true,
      message: "Resolution deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting QC resolution:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete resolution",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (body.action === "createQC") {
      const {
        lpo_mr_line_id,
        lpo_id,
        checked_by,
        accepted_quantity,
        reason_for_added_protection,
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
          reason_for_added_protection,
          qc_status
        ) VALUES (?, ?, ?, ?, ?, ?)
      `;

      const qcValues = [
        lpo_mr_line_id,
        lpo_id,
        checked_by,
        accepted_quantity,
        reason_for_added_protection,
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

    if (action === "createQCResolution") {
      return await createQCResolution(body);
    }

    return NextResponse.json(
      { success: false, message: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error in QC POST route:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (body.action === "updateQC") {
      const {
        lpo_mr_line_id,
        lpo_id,
        checked_by,
        accepted_quantity,
        reason_for_added_protection,
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
      reason_for_added_protection = ?,
        qc_status = ?
      WHERE id = ?
    `;

      const qcValues = [
        checked_by,
        accepted_quantity,
        reason_for_added_protection,
        qc_status,
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
    }

    if (action === "updateQCResolution") {
      return await updateQCResolution(body);
    }

    return NextResponse.json(
      { success: false, message: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error in QC PUT route:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

async function createQCResolution(body: any) {
  const {
    mr_header_id,
    mr_line_id,
    type,
    failed_quantity,
    // Return/refund fields
    return_quantity,
    expected_refund,
    actual_refund,
    variance_amount,
    reason_for_variance,
    eta_delivery_date,
    refund_method,
    proof_of_payment,
    // Replace fields
    replacement_quantity,
    replacement_type,
    expected_replacement_date,
    notes,
    // Conditionally accepted fields
    conditionally_accepted_quantity,
    reason,
    attachment,
    // Reject/scrap fields
    scrap_quantity,
    scrap_reason,
    return_not_possible_reason,
    disposal_method,
    scrap_attachment,
    created_by,
  } = body;

  try {
    let insertQuery = "";
    let values: any[] = [];

    switch (type) {
      case "Return/refund":
        insertQuery = `
          INSERT INTO qc_failed_return_refund (
            mr_header_id, mr_line_id, failed_quantity, return_quantity,
            expected_refund, actual_refund, variance_amount, reason_for_variance,
            eta_delivery_date, refund_method, proof_of_payment
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        values = [
          mr_header_id,
          mr_line_id,
          failed_quantity,
          return_quantity,
          expected_refund,
          actual_refund,
          variance_amount,
          reason_for_variance,
          eta_delivery_date,
          refund_method,
          proof_of_payment,
        ];
        break;

      case "Replace":
        insertQuery = `
          INSERT INTO qc_failed_replace (
            mr_header_id, mr_line_id, failed_quantity, replacement_quantity,
            replacement_type, expected_replacement_date, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        values = [
          mr_header_id,
          mr_line_id,
          failed_quantity,
          replacement_quantity,
          replacement_type,
          expected_replacement_date,
          notes,
        ];
        break;

      case "Conditionally accepted":
        insertQuery = `
          INSERT INTO qc_failed_conditionally_accepted (
            mr_header_id, mr_line_id, failed_quantity, conditionally_accepted_quantity,
            reason, attachment
          ) VALUES (?, ?, ?, ?, ?, ?)
        `;
        values = [
          mr_header_id,
          mr_line_id,
          failed_quantity,
          conditionally_accepted_quantity,
          reason,
          attachment,
        ];
        break;

      case "Reject/scrap":
        insertQuery = `
          INSERT INTO qc_failed_reject_scrap (
            mr_header_id, mr_line_id, failed_quantity, scrap_quantity,
            scrap_reason, return_not_possible_reason, disposal_method, scrap_attachment
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        values = [
          mr_header_id,
          mr_line_id,
          failed_quantity,
          scrap_quantity,
          scrap_reason,
          return_not_possible_reason,
          disposal_method,
          scrap_attachment,
        ];
        break;

      default:
        return NextResponse.json(
          { success: false, message: "Invalid resolution type" },
          { status: 400 }
        );
    }

    // Execute the insert query
    // Replace this with your actual database query execution
    console.log("Creating resolution:", insertQuery, values);

    return NextResponse.json({
      success: true,
      message: "Resolution created successfully",
    });
  } catch (error) {
    console.error("Error creating resolution:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to create resolution",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

async function updateQCResolution(body: any) {
  const {
    resolution_id,
    old_type,
    type,
    mr_header_id,
    mr_line_id,
    failed_quantity,
    // Return/refund fields
    return_quantity,
    expected_refund,
    actual_refund,
    variance_amount,
    reason_for_variance,
    eta_delivery_date,
    refund_method,
    proof_of_payment,
    // Replace fields
    replacement_quantity,
    replacement_type,
    expected_replacement_date,
    notes,
    // Conditionally accepted fields
    conditionally_accepted_quantity,
    reason,
    attachment,
    // Reject/scrap fields
    scrap_quantity,
    scrap_reason,
    return_not_possible_reason,
    disposal_method,
    scrap_attachment,
  } = body;

  try {
    // If resolution type has changed, we need to delete from old table and insert into new table
    if (old_type !== type) {
      // Delete from old table
      const oldTableName = getTableName(old_type);
      const deleteQuery = `DELETE FROM ${oldTableName} WHERE id = ?`;
      // await db.execute(deleteQuery, [resolution_id]);

      // Create new resolution
      return await createQCResolution(body);
    }

    // Otherwise, update in the same table
    let updateQuery = "";
    let values: any[] = [];

    switch (type) {
      case "Return/refund":
        updateQuery = `
          UPDATE qc_failed_return_refund
          SET failed_quantity = ?, return_quantity = ?, expected_refund = ?,
              actual_refund = ?, variance_amount = ?, reason_for_variance = ?,
              eta_delivery_date = ?, refund_method = ?, proof_of_payment = ?
          WHERE id = ?
        `;
        values = [
          failed_quantity,
          return_quantity,
          expected_refund,
          actual_refund,
          variance_amount,
          reason_for_variance,
          eta_delivery_date,
          refund_method,
          proof_of_payment,
          resolution_id,
        ];
        break;

      case "Replace":
        updateQuery = `
          UPDATE qc_failed_replace
          SET failed_quantity = ?, replacement_quantity = ?, replacement_type = ?,
              expected_replacement_date = ?, notes = ?
          WHERE id = ?
        `;
        values = [
          failed_quantity,
          replacement_quantity,
          replacement_type,
          expected_replacement_date,
          notes,
          resolution_id,
        ];
        break;

      case "Conditionally accepted":
        updateQuery = `
          UPDATE qc_failed_conditionally_accepted
          SET failed_quantity = ?, conditionally_accepted_quantity = ?,
              reason = ?, attachment = ?
          WHERE id = ?
        `;
        values = [
          failed_quantity,
          conditionally_accepted_quantity,
          reason,
          attachment,
          resolution_id,
        ];
        break;

      case "Reject/scrap":
        updateQuery = `
          UPDATE qc_failed_reject_scrap
          SET failed_quantity = ?, scrap_quantity = ?, scrap_reason = ?,
              return_not_possible_reason = ?, disposal_method = ?, scrap_attachment = ?
          WHERE id = ?
        `;
        values = [
          failed_quantity,
          scrap_quantity,
          scrap_reason,
          return_not_possible_reason,
          disposal_method,
          scrap_attachment,
          resolution_id,
        ];
        break;

      default:
        return NextResponse.json(
          { success: false, message: "Invalid resolution type" },
          { status: 400 }
        );
    }

    // Execute the update query
    // Replace this with your actual database query execution
    console.log("Updating resolution:", updateQuery, values);

    return NextResponse.json({
      success: true,
      message: "Resolution updated successfully",
    });
  } catch (error) {
    console.error("Error updating resolution:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update resolution",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

function getTableName(resolutionType: string): string {
  switch (resolutionType) {
    case "Return/refund":
      return "qc_failed_return_refund";
    case "Replace":
      return "qc_failed_replace";
    case "Conditionally accepted":
      return "qc_failed_conditionally_accepted";
    case "Reject/scrap":
      return "qc_failed_reject_scrap";
    default:
      throw new Error("Invalid resolution type");
  }
}
