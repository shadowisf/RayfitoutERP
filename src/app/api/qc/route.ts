// app/api/qc/route.ts
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { ResultSetHeader } from "mysql2";

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

    if (body.action === "createQCResolution") {
      // 1. Insert main resolution
      const [resolutionResult] = await db.query<ResultSetHeader>(
        `INSERT INTO qc_resolutions (mr_header_id, mr_line_id, resolution_type) 
         VALUES (?, ?, ?)`,
        [Number(body.mr_header_id), Number(body.mr_line_id), body.type]
      );

      const resolution_id = resolutionResult.insertId;

      // 2. Insert into specific detail table
      if (body.type === "Return/refund") {
        await db.query<ResultSetHeader>(
          `INSERT INTO qc_resolution_return_refund (
            resolution_id, 
            return_quantity,
            expected_refund, 
            actual_refund, 
            variance_amount, 
            reason_for_variance, 
            eta_delivery_date, 
            refund_method, 
            proof_of_payment
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            resolution_id,
            Number(body.return_quantity),
            Number(body.expected_refund),
            Number(body.actual_refund),
            Number(body.variance_amount),
            body.reason_for_variance,
            body.eta_delivery_date,
            body.refund_method,
            body.proof_of_payment,
          ]
        );

        return NextResponse.json({
          success: true,
          message: "QC resolution saved successfully",
          data: { resolution_id },
        });
      }

      if (body.type === "Replace") {
        await db.query<ResultSetHeader>(
          `INSERT INTO qc_resolution_replace (
            resolution_id, 
            replace_quantity, 
            replacement_type, 
            expected_replacement_date, 
            notes
          ) VALUES (?, ?, ?, ?, ?)`,
          [
            resolution_id,
            Number(body.replacement_quantity),
            body.replacement_type,
            body.expected_replacement_date,
            body.notes,
          ]
        );

        return NextResponse.json({
          success: true,
          message: "QC resolution saved successfully",
          data: { resolution_id },
        });
      }

      if (body.type === "Conditionally accepted") {
        await db.query<ResultSetHeader>(
          `INSERT INTO qc_resolution_conditionally_accepted (
            resolution_id, 
            conditionally_accepted_quantity, 
            reason, 
            attachment
          ) VALUES (?, ?, ?, ?)`,
          [
            resolution_id,
            Number(body.conditionally_accepted_quantity),
            body.reason,
            body.attachment,
          ]
        );

        return NextResponse.json({
          success: true,
          message: "QC resolution saved successfully",
          data: { resolution_id },
        });
      }

      if (body.type === "Reject/scrap") {
        await db.query<ResultSetHeader>(
          `INSERT INTO qc_resolution_reject_scrap (
            resolution_id, 
            scrap_quantity, 
            scrap_reason, 
            return_not_possible_reason, 
            disposal_method, 
            scrap_attachment_url
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            resolution_id,
            Number(body.scrap_quantity),
            body.scrap_reason,
            body.return_not_possible_reason,
            body.disposal_method,
            body.scrap_attachment_url,
          ]
        );

        return NextResponse.json({
          success: true,
          message: "QC resolution saved successfully",
          data: { resolution_id },
        });
      }

      return NextResponse.json(
        {
          success: false,
          message: "Invalid resolution type",
        },
        { status: 400 }
      );
    }

    if (body.action === "getResolutionByMrLine") {
      try {
        const { mr_header_id, mr_line_id } = body;

        // Get resolution
        const [resolutions] = await db.query<any[]>(
          `SELECT 
            r.id as resolution_id,
            r.resolution_type,
            r.created_by,
            r.created_at
          FROM qc_resolutions r
          WHERE r.mr_header_id = ? AND r.mr_line_id = ?
          LIMIT 1`,
          [mr_header_id, mr_line_id]
        );

        if (resolutions.length === 0) {
          return NextResponse.json({
            success: false,
            message: "No resolution found",
          });
        }

        const resolution = resolutions[0];
        let detailData = {};

        // Get type-specific details
        if (resolution.resolution_type === "Return/refund") {
          const [details] = await db.query<any[]>(
            `SELECT * FROM qc_resolution_return_refund WHERE resolution_id = ?`,
            [resolution.resolution_id]
          );
          if (details.length > 0) detailData = details[0];
        } else if (resolution.resolution_type === "Replace") {
          const [details] = await db.query<any[]>(
            `SELECT * FROM qc_resolution_replace WHERE resolution_id = ?`,
            [resolution.resolution_id]
          );
          if (details.length > 0) detailData = details[0];
        } else if (resolution.resolution_type === "Conditionally accepted") {
          const [details] = await db.query<any[]>(
            `SELECT * FROM qc_resolution_conditionally_accepted WHERE resolution_id = ?`,
            [resolution.resolution_id]
          );
          if (details.length > 0) detailData = details[0];
        } else if (resolution.resolution_type === "Reject/scrap") {
          const [details] = await db.query<any[]>(
            `SELECT * FROM qc_resolution_reject_scrap WHERE resolution_id = ?`,
            [resolution.resolution_id]
          );
          if (details.length > 0) detailData = details[0];
        }

        return NextResponse.json({
          success: true,
          data: {
            ...resolution,
            ...detailData,
          },
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

    return NextResponse.json(
      {
        success: false,
        message: "Invalid action",
      },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Error in QC POST handler:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to process request",
        error: error.sqlMessage || error.message,
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    if (body.action === "updateQC") {
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
    }

    if (body.action === "updateQCResolution") {
      const { resolution_id, type, old_type } = body;

      if (!resolution_id) {
        return NextResponse.json(
          {
            success: false,
            message: "Resolution ID is required",
          },
          { status: 400 }
        );
      }

      // Update main resolution (including resolution_type)
      await db.query<ResultSetHeader>(
        `UPDATE qc_resolutions 
       SET resolution_type = ?, failed_quantity = ?, updated_at = NOW() 
       WHERE id = ?`,
        [type, Number(body.failed_quantity || 0), resolution_id]
      );

      // If resolution type changed, delete old type-specific data
      if (old_type && old_type !== type) {
        if (old_type === "Return/refund") {
          await db.query<ResultSetHeader>(
            `DELETE FROM qc_resolution_return_refund WHERE resolution_id = ?`,
            [resolution_id]
          );
        } else if (old_type === "Replace") {
          await db.query<ResultSetHeader>(
            `DELETE FROM qc_resolution_replace WHERE resolution_id = ?`,
            [resolution_id]
          );
        } else if (old_type === "Conditionally accepted") {
          await db.query<ResultSetHeader>(
            `DELETE FROM qc_resolution_conditionally_accepted WHERE resolution_id = ?`,
            [resolution_id]
          );
        } else if (old_type === "Reject/scrap") {
          await db.query<ResultSetHeader>(
            `DELETE FROM qc_resolution_reject_scrap WHERE resolution_id = ?`,
            [resolution_id]
          );
        }
      }

      // Insert or update type-specific details
      if (type === "Return/refund") {
        // Check if record exists
        const [existing] = await db.query<any[]>(
          `SELECT resolution_id FROM qc_resolution_return_refund WHERE resolution_id = ?`,
          [resolution_id]
        );

        if (existing.length > 0) {
          // Update existing
          await db.query<ResultSetHeader>(
            `UPDATE qc_resolution_return_refund 
           SET return_quantity = ?, expected_refund = ?, 
               actual_refund = ?, variance_amount = ?, reason_for_variance = ?, 
               eta_delivery_date = ?, refund_method = ?, proof_of_payment = ?
           WHERE resolution_id = ?`,
            [
              Number(body.return_quantity),
              Number(body.expected_refund),
              Number(body.actual_refund),
              Number(body.variance_amount),
              body.reason_for_variance,
              body.eta_delivery_date,
              body.refund_method,
              body.proof_of_payment,
              resolution_id,
            ]
          );
        } else {
          // Insert new
          await db.query<ResultSetHeader>(
            `INSERT INTO qc_resolution_return_refund (
            resolution_id, return_quantity, expected_refund, 
            actual_refund, variance_amount, reason_for_variance, 
            eta_delivery_date, refund_method, proof_of_payment
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              resolution_id,
              Number(body.return_quantity),
              Number(body.expected_refund),
              Number(body.actual_refund),
              Number(body.variance_amount),
              body.reason_for_variance,
              body.eta_delivery_date,
              body.refund_method,
              body.proof_of_payment,
            ]
          );
        }
      } else if (type === "Replace") {
        // Check if record exists
        const [existing] = await db.query<any[]>(
          `SELECT resolution_id FROM qc_resolution_replace WHERE resolution_id = ?`,
          [resolution_id]
        );

        if (existing.length > 0) {
          // Update existing
          await db.query<ResultSetHeader>(
            `UPDATE qc_resolution_replace 
           SET replaced_quantity = ?, replacement_type = ?, 
               expected_replacement_date = ?, notes = ?
           WHERE resolution_id = ?`,
            [
              Number(body.replacement_quantity),
              body.replacement_type,
              body.expected_replacement_date,
              body.notes,
              resolution_id,
            ]
          );
        } else {
          // Insert new
          await db.query<ResultSetHeader>(
            `INSERT INTO qc_resolution_replace (
            resolution_id, replaced_quantity, replacement_type, 
            expected_replacement_date, notes
          ) VALUES (?, ?, ?, ?, ?)`,
            [
              resolution_id,
              Number(body.replacement_quantity),
              body.replacement_type,
              body.expected_replacement_date,
              body.notes,
            ]
          );
        }
      } else if (type === "Conditionally accepted") {
        // Check if record exists
        const [existing] = await db.query<any[]>(
          `SELECT resolution_id FROM qc_resolution_conditionally_accepted WHERE resolution_id = ?`,
          [resolution_id]
        );

        if (existing.length > 0) {
          // Update existing
          await db.query<ResultSetHeader>(
            `UPDATE qc_resolution_conditionally_accepted 
           SET conditionally_accepted_quantity = ?, reason = ?, attachment_url = ?
           WHERE resolution_id = ?`,
            [
              Number(body.conditionally_accepted_quantity),
              body.reason,
              body.attachment_url,
              resolution_id,
            ]
          );
        } else {
          // Insert new
          await db.query<ResultSetHeader>(
            `INSERT INTO qc_resolution_conditionally_accepted (
            resolution_id, conditionally_accepted_quantity, reason, attachment_url
          ) VALUES (?, ?, ?, ?)`,
            [
              resolution_id,
              Number(body.conditionally_accepted_quantity),
              body.reason,
              body.attachment_url,
            ]
          );
        }
      } else if (type === "Reject/scrap") {
        // Check if record exists
        const [existing] = await db.query<any[]>(
          `SELECT resolution_id FROM qc_resolution_reject_scrap WHERE resolution_id = ?`,
          [resolution_id]
        );

        if (existing.length > 0) {
          // Update existing
          await db.query<ResultSetHeader>(
            `UPDATE qc_resolution_reject_scrap 
           SET scrap_quantity = ?, scrap_reason = ?, 
               return_not_possible_reason = ?, disposal_method = ?, 
               scrap_attachment_url = ?
           WHERE resolution_id = ?`,
            [
              Number(body.scrap_quantity),
              body.scrap_reason,
              body.return_not_possible_reason,
              body.disposal_method,
              body.scrap_attachment_url,
              resolution_id,
            ]
          );
        } else {
          // Insert new
          await db.query<ResultSetHeader>(
            `INSERT INTO qc_resolution_reject_scrap (
            resolution_id, scrap_quantity, scrap_reason, 
            return_not_possible_reason, disposal_method, scrap_attachment_url
          ) VALUES (?, ?, ?, ?, ?, ?)`,
            [
              resolution_id,
              Number(body.scrap_quantity),
              body.scrap_reason,
              body.return_not_possible_reason,
              body.disposal_method,
              body.scrap_attachment_url,
            ]
          );
        }
      }

      return NextResponse.json({
        success: true,
        message: "Resolution updated successfully",
        data: { resolution_id },
      });
    }
  } catch (error: any) {
    console.error("Error in QC PUT handler:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update QC",
        error: error.sqlMessage || error.message,
      },
      { status: 500 }
    );
  }
}
