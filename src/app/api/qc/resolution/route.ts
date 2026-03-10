import { db } from "@/lib/db";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const logFor = searchParams.get("logFor");

    // Fetch progress log for a resolution
    if (logFor) {
      const resolutionType = searchParams.get("type") || "return_refund";
      const [logRows] = await db.query<RowDataPacket[]>(
        `SELECT * FROM qc_resolution_progress_log
         WHERE resolution_id = ? AND resolution_type = ?
         ORDER BY id ASC`,
        [logFor, resolutionType],
      );
      return NextResponse.json({ success: true, data: logRows });
    }

    if (id) {
      const type = searchParams.get("type");

      // Get single conditionally accepted resolution detail
      if (type === "accept_conditionally") {
        const query = `
          SELECT
            ca.*,
            qc.lpo_id,
            qc.lpo_mr_line_id,
            qc.accepted_quantity,
            qc.checked_by,
            qc.qc_status,
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
          FROM qc_resolution_conditionally_accepted ca
          INNER JOIN qc_mr_line qc ON ca.qc_mr_line_id = qc.id
          INNER JOIN lpo_mr_line lml ON qc.lpo_mr_line_id = lml.id
          INNER JOIN vw_mr_lines vml ON lml.mr_line_id = vml.id
          INNER JOIN lpo l ON qc.lpo_id = l.id
          INNER JOIN suppliers s ON l.supplier_id = s.id
          INNER JOIN mr_headers mh ON vml.mr_header_id = mh.id
          LEFT JOIN grn g ON g.lpo_id = qc.lpo_id
          LEFT JOIN grn_mr_line gl ON gl.grn_id = g.id AND gl.lpo_mr_line_id = qc.lpo_mr_line_id
          WHERE ca.id = ?
        `;

        const [rows] = await db.query<RowDataPacket[]>(query, [id]);

        if (rows.length === 0) {
          return NextResponse.json(
            { success: false, message: "Resolution not found" },
            { status: 404 },
          );
        }

        const row = rows[0];
        const receivedQty = Number(row.received_quantity) || 0;
        const acceptedQty = Number(row.accepted_quantity) || 0;

        return NextResponse.json({
          success: true,
          data: {
            ...row,
            received_quantity: receivedQty,
            accepted_quantity: acceptedQty,
            failed_quantity: receivedQty - acceptedQty,
            conditionally_accepted_quantity:
              Number(row.conditionally_accepted_quantity) || 0,
            unit_price: Number(row.unit_price) || 0,
            penalty_value: row.penalty_value != null ? Number(row.penalty_value) : null,
          },
        });
      }

      // Get single scrap/discard resolution detail
      if (type === "scrap_discard") {
        const query = `
          SELECT
            sd.*,
            qc.lpo_id,
            qc.lpo_mr_line_id,
            qc.accepted_quantity,
            qc.checked_by,
            qc.qc_status,
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
          FROM qc_resolution_reject_scrap sd
          INNER JOIN qc_mr_line qc ON sd.qc_mr_line_id = qc.id
          INNER JOIN lpo_mr_line lml ON qc.lpo_mr_line_id = lml.id
          INNER JOIN vw_mr_lines vml ON lml.mr_line_id = vml.id
          INNER JOIN lpo l ON qc.lpo_id = l.id
          INNER JOIN suppliers s ON l.supplier_id = s.id
          INNER JOIN mr_headers mh ON vml.mr_header_id = mh.id
          LEFT JOIN grn g ON g.lpo_id = qc.lpo_id
          LEFT JOIN grn_mr_line gl ON gl.grn_id = g.id AND gl.lpo_mr_line_id = qc.lpo_mr_line_id
          WHERE sd.id = ?
        `;

        const [rows] = await db.query<RowDataPacket[]>(query, [id]);

        if (rows.length === 0) {
          return NextResponse.json(
            { success: false, message: "Resolution not found" },
            { status: 404 },
          );
        }

        const row = rows[0];
        const receivedQty = Number(row.received_quantity) || 0;
        const acceptedQty = Number(row.accepted_quantity) || 0;

        return NextResponse.json({
          success: true,
          data: {
            ...row,
            received_quantity: receivedQty,
            accepted_quantity: acceptedQty,
            failed_quantity: receivedQty - acceptedQty,
            scrap_quantity: Number(row.scrap_quantity) || 0,
            unit_price: Number(row.unit_price) || 0,
          },
        });
      }

      // Get single replace resolution detail
      if (type === "replace_vendor") {
        const query = `
          SELECT
            rep.*,
            qc.lpo_id,
            qc.lpo_mr_line_id,
            qc.accepted_quantity,
            qc.checked_by,
            qc.qc_status,
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
            mh.project_id,
            mc.value AS new_category_name
          FROM qc_resolution_replace rep
          INNER JOIN qc_mr_line qc ON rep.qc_mr_line_id = qc.id
          INNER JOIN lpo_mr_line lml ON qc.lpo_mr_line_id = lml.id
          INNER JOIN vw_mr_lines vml ON lml.mr_line_id = vml.id
          INNER JOIN lpo l ON qc.lpo_id = l.id
          INNER JOIN suppliers s ON l.supplier_id = s.id
          INNER JOIN mr_headers mh ON vml.mr_header_id = mh.id
          LEFT JOIN grn g ON g.lpo_id = qc.lpo_id
          LEFT JOIN grn_mr_line gl ON gl.grn_id = g.id AND gl.lpo_mr_line_id = qc.lpo_mr_line_id
          LEFT JOIN lut_material_categories mc ON rep.new_material_category_id = mc.id
          WHERE rep.id = ?
        `;

        const [rows] = await db.query<RowDataPacket[]>(query, [id]);

        if (rows.length === 0) {
          return NextResponse.json(
            { success: false, message: "Resolution not found" },
            { status: 404 },
          );
        }

        const row = rows[0];
        const receivedQty = Number(row.received_quantity) || 0;
        const acceptedQty = Number(row.accepted_quantity) || 0;

        // Look up subcategory names from JSON array
        let newSubcategoryNames: string[] = [];
        if (row.new_material_subcategory_ids) {
          try {
            const ids =
              typeof row.new_material_subcategory_ids === "string"
                ? JSON.parse(row.new_material_subcategory_ids)
                : row.new_material_subcategory_ids;
            if (Array.isArray(ids) && ids.length > 0) {
              const placeholders = ids.map(() => "?").join(",");
              const [subRows] = await db.query<RowDataPacket[]>(
                `SELECT value FROM lut_material_subcategories WHERE id IN (${placeholders})`,
                ids,
              );
              newSubcategoryNames = subRows.map((r) => r.value);
            }
          } catch {
            // ignore parse errors
          }
        }

        // Fetch replacement GRN data if it exists
        let replacementGrn = null;
        if (row.replacement_grn_id) {
          const [grnRows] = await db.query<RowDataPacket[]>(
            `SELECT * FROM grn WHERE id = ?`,
            [row.replacement_grn_id],
          );
          if (grnRows.length > 0) {
            const [grnLineRows] = await db.query<RowDataPacket[]>(
              `SELECT * FROM grn_mr_line WHERE grn_id = ?`,
              [row.replacement_grn_id],
            );
            replacementGrn = {
              ...grnRows[0],
              grn_lines: grnLineRows,
            };
          }
        }

        return NextResponse.json({
          success: true,
          data: {
            ...row,
            received_quantity: receivedQty,
            accepted_quantity: acceptedQty,
            failed_quantity: receivedQty - acceptedQty,
            unit_price: Number(row.unit_price) || 0,
            replaced_quantity: Number(row.replaced_quantity) || 0,
            new_subcategory_names: newSubcategoryNames,
            replacement_grn: replacementGrn,
          },
        });
      }

      // Get single return/refund resolution detail (default)
      const query = `
        SELECT
          rr.*,
          qc.lpo_id,
          qc.lpo_mr_line_id,
          qc.accepted_quantity,
          qc.checked_by,
          qc.qc_status,
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
        FROM qc_resolution_return_refund rr
        INNER JOIN qc_mr_line qc ON rr.qc_mr_line_id = qc.id
        INNER JOIN lpo_mr_line lml ON qc.lpo_mr_line_id = lml.id
        INNER JOIN vw_mr_lines vml ON lml.mr_line_id = vml.id
        INNER JOIN lpo l ON qc.lpo_id = l.id
        INNER JOIN suppliers s ON l.supplier_id = s.id
        INNER JOIN mr_headers mh ON vml.mr_header_id = mh.id
        LEFT JOIN grn g ON g.lpo_id = qc.lpo_id
        LEFT JOIN grn_mr_line gl ON gl.grn_id = g.id AND gl.lpo_mr_line_id = qc.lpo_mr_line_id
        WHERE rr.id = ?
      `;

      const [rows] = await db.query<RowDataPacket[]>(query, [id]);

      if (rows.length === 0) {
        return NextResponse.json(
          { success: false, message: "Resolution not found" },
          { status: 404 },
        );
      }

      const row = rows[0];
      const receivedQty = Number(row.received_quantity) || 0;
      const acceptedQty = Number(row.accepted_quantity) || 0;

      return NextResponse.json({
        success: true,
        data: {
          ...row,
          received_quantity: receivedQty,
          accepted_quantity: acceptedQty,
          failed_quantity: receivedQty - acceptedQty,
          unit_price: Number(row.unit_price) || 0,
          expected_refund: Number(row.expected_refund) || 0,
          actual_refund: Number(row.actual_refund) || 0,
          variance_amount: Number(row.variance_amount) || 0,
          return_quantity: Number(row.return_quantity) || 0,
        },
      });
    }

    // Get all resolution items for kanban (UNION return_refund + replace + scrap + conditionally_accepted)
    const query = `
      SELECT
        rr.id,
        rr.qc_mr_line_id,
        rr.progress_id,
        rr.created_at,
        'return_refund' AS resolution_type,
        NULL AS reason,
        qc.lpo_id,
        vml.material_description,
        gl.received_quantity,
        qc.accepted_quantity,
        s.name AS supplier_name
      FROM qc_resolution_return_refund rr
      INNER JOIN qc_mr_line qc ON rr.qc_mr_line_id = qc.id
      INNER JOIN lpo_mr_line lml ON qc.lpo_mr_line_id = lml.id
      INNER JOIN vw_mr_lines vml ON lml.mr_line_id = vml.id
      INNER JOIN lpo l ON qc.lpo_id = l.id
      INNER JOIN suppliers s ON l.supplier_id = s.id
      LEFT JOIN grn g ON g.lpo_id = qc.lpo_id
      LEFT JOIN grn_mr_line gl ON gl.grn_id = g.id AND gl.lpo_mr_line_id = qc.lpo_mr_line_id

      UNION ALL

      SELECT
        rep.id,
        rep.qc_mr_line_id,
        rep.progress_id,
        rep.created_at,
        'replace_vendor' AS resolution_type,
        NULL AS reason,
        qc2.lpo_id,
        vml2.material_description,
        gl2.received_quantity,
        qc2.accepted_quantity,
        s2.name AS supplier_name
      FROM qc_resolution_replace rep
      INNER JOIN qc_mr_line qc2 ON rep.qc_mr_line_id = qc2.id
      INNER JOIN lpo_mr_line lml2 ON qc2.lpo_mr_line_id = lml2.id
      INNER JOIN vw_mr_lines vml2 ON lml2.mr_line_id = vml2.id
      INNER JOIN lpo l2 ON qc2.lpo_id = l2.id
      INNER JOIN suppliers s2 ON l2.supplier_id = s2.id
      LEFT JOIN grn g2 ON g2.lpo_id = qc2.lpo_id AND (rep.replacement_grn_id IS NULL OR g2.id != rep.replacement_grn_id)
      LEFT JOIN grn_mr_line gl2 ON gl2.grn_id = g2.id AND gl2.lpo_mr_line_id = qc2.lpo_mr_line_id

      UNION ALL

      SELECT
        sd.id,
        sd.qc_mr_line_id,
        sd.progress_id,
        sd.created_at,
        'scrap_discard' AS resolution_type,
        NULL AS reason,
        qc3.lpo_id,
        vml3.material_description,
        gl3.received_quantity,
        qc3.accepted_quantity,
        s3.name AS supplier_name
      FROM qc_resolution_reject_scrap sd
      INNER JOIN qc_mr_line qc3 ON sd.qc_mr_line_id = qc3.id
      INNER JOIN lpo_mr_line lml3 ON qc3.lpo_mr_line_id = lml3.id
      INNER JOIN vw_mr_lines vml3 ON lml3.mr_line_id = vml3.id
      INNER JOIN lpo l3 ON qc3.lpo_id = l3.id
      INNER JOIN suppliers s3 ON l3.supplier_id = s3.id
      LEFT JOIN grn g3 ON g3.lpo_id = qc3.lpo_id
      LEFT JOIN grn_mr_line gl3 ON gl3.grn_id = g3.id AND gl3.lpo_mr_line_id = qc3.lpo_mr_line_id

      UNION ALL

      SELECT
        ca.id,
        ca.qc_mr_line_id,
        ca.progress_id,
        ca.created_at,
        'accept_conditionally' AS resolution_type,
        ca.reason,
        qc4.lpo_id,
        vml4.material_description,
        gl4.received_quantity,
        qc4.accepted_quantity,
        s4.name AS supplier_name
      FROM qc_resolution_conditionally_accepted ca
      INNER JOIN qc_mr_line qc4 ON ca.qc_mr_line_id = qc4.id
      INNER JOIN lpo_mr_line lml4 ON qc4.lpo_mr_line_id = lml4.id
      INNER JOIN vw_mr_lines vml4 ON lml4.mr_line_id = vml4.id
      INNER JOIN lpo l4 ON qc4.lpo_id = l4.id
      INNER JOIN suppliers s4 ON l4.supplier_id = s4.id
      LEFT JOIN grn g4 ON g4.lpo_id = qc4.lpo_id
      LEFT JOIN grn_mr_line gl4 ON gl4.grn_id = g4.id AND gl4.lpo_mr_line_id = qc4.lpo_mr_line_id

      ORDER BY id DESC
    `;

    const [rows] = await db.query<RowDataPacket[]>(query);

    const items = rows.map((row) => {
      const receivedQty = Number(row.received_quantity) || 0;
      const acceptedQty = Number(row.accepted_quantity) || 0;
      return {
        id: row.id,
        qc_mr_line_id: row.qc_mr_line_id,
        progress_id: row.progress_id,
        resolution_type: row.resolution_type,
        reason: row.reason || null,
        material_description: row.material_description,
        failed_quantity: receivedQty - acceptedQty,
        supplier_name: row.supplier_name,
        created_at: row.created_at,
      };
    });

    return NextResponse.json({ success: true, data: items });
  } catch (error: any) {
    console.error("Error fetching resolution items:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch resolution items",
        error: error.sqlMessage || error.message,
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "createReturnRefund") {
      const {
        qc_mr_line_id,
        return_required,
        pickup_type,
        return_quantity,
        expected_refund,
        actual_refund,
        variance_amount,
        reason_for_variance,
        eta_delivery_date,
        expected_settlement_date,
        refund_method,
        remarks,
        proof_of_payment,
        created_by,
      } = body;

      if (!qc_mr_line_id || !return_quantity || !expected_refund) {
        return NextResponse.json(
          { success: false, message: "Missing required fields" },
          { status: 400 },
        );
      }

      const query = `
        INSERT INTO qc_resolution_return_refund (
          qc_mr_line_id,
          return_required,
          pickup_type,
          return_quantity,
          expected_refund,
          actual_refund,
          variance_amount,
          reason_for_variance,
          eta_delivery_date,
          expected_settlement_date,
          refund_method,
          remarks,
          proof_of_payment,
          progress_id,
          created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
      `;

      const values = [
        qc_mr_line_id,
        return_required || "Yes",
        pickup_type || null,
        Number(return_quantity),
        Number(expected_refund),
        Number(actual_refund) || 0,
        Number(variance_amount) || 0,
        reason_for_variance || null,
        eta_delivery_date || null,
        expected_settlement_date || null,
        refund_method || null,
        remarks || null,
        proof_of_payment
          ? JSON.stringify(proof_of_payment)
          : JSON.stringify([]),
        created_by,
      ];

      const [result] = await db.query<ResultSetHeader>(query, values);

      // Insert initial progress log entry
      await db.query(
        `INSERT INTO qc_resolution_progress_log
          (resolution_id, resolution_type, progress_id, from_progress_id, changed_by)
         VALUES (?, 'return_refund', 1, NULL, ?)`,
        [result.insertId, created_by || null],
      );

      return NextResponse.json({
        success: true,
        message: "Return/refund resolution created",
        id: result.insertId,
      });
    }

    if (action === "createReplace") {
      const {
        qc_mr_line_id,
        replaced_quantity,
        replacement_type,
        expected_replacement_date,
        notes,
        new_material_name,
        new_material_category_id,
        new_material_subcategory_ids,
        created_by,
      } = body;

      if (!qc_mr_line_id || !replaced_quantity || !replacement_type) {
        return NextResponse.json(
          { success: false, message: "Missing required fields" },
          { status: 400 },
        );
      }

      const query = `
        INSERT INTO qc_resolution_replace (
          qc_mr_line_id,
          replaced_quantity,
          replacement_type,
          expected_replacement_date,
          notes,
          new_material_name,
          new_material_category_id,
          new_material_subcategory_ids,
          progress_id,
          created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
      `;

      const values = [
        qc_mr_line_id,
        Number(replaced_quantity),
        replacement_type,
        expected_replacement_date,
        notes || null,
        new_material_name || null,
        new_material_category_id || null,
        new_material_subcategory_ids
          ? JSON.stringify(new_material_subcategory_ids)
          : null,
        created_by,
      ];

      const [result] = await db.query<ResultSetHeader>(query, values);

      // Insert initial progress log entry
      await db.query(
        `INSERT INTO qc_resolution_progress_log
          (resolution_id, resolution_type, progress_id, from_progress_id, changed_by)
         VALUES (?, 'replace_vendor', 1, NULL, ?)`,
        [result.insertId, created_by || null],
      );

      return NextResponse.json({
        success: true,
        message: "Replace resolution created",
        id: result.insertId,
      });
    }

    if (action === "createConditionallyAccepted") {
      const {
        qc_mr_line_id,
        conditionally_accepted_quantity,
        reason,
        penalty_type,
        penalty_value,
        deviation_type,
        deviation_description,
        requires_name_change,
        approval_source,
        warranty_type,
        remarks,
        attachment,
        created_by,
      } = body;

      if (!qc_mr_line_id || !conditionally_accepted_quantity || !reason) {
        return NextResponse.json(
          { success: false, message: "Missing required fields" },
          { status: 400 },
        );
      }

      const query = `
        INSERT INTO qc_resolution_conditionally_accepted (
          qc_mr_line_id,
          conditionally_accepted_quantity,
          reason,
          penalty_type,
          penalty_value,
          deviation_type,
          deviation_description,
          requires_name_change,
          approval_source,
          warranty_type,
          remarks,
          attachment,
          progress_id,
          created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
      `;

      const values = [
        qc_mr_line_id,
        Number(conditionally_accepted_quantity),
        reason,
        penalty_type || null,
        penalty_value != null ? Number(penalty_value) : null,
        deviation_type || null,
        deviation_description || null,
        requires_name_change || null,
        approval_source || null,
        warranty_type || null,
        remarks || null,
        attachment ? JSON.stringify(attachment) : JSON.stringify([]),
        created_by,
      ];

      const [result] = await db.query<ResultSetHeader>(query, values);

      // Insert initial progress log entry
      await db.query(
        `INSERT INTO qc_resolution_progress_log
          (resolution_id, resolution_type, progress_id, from_progress_id, changed_by)
         VALUES (?, 'accept_conditionally', 1, NULL, ?)`,
        [result.insertId, created_by || null],
      );

      return NextResponse.json({
        success: true,
        message: "Conditionally accepted resolution created",
        id: result.insertId,
      });
    }

    if (action === "createScrapDiscard") {
      const {
        qc_mr_line_id,
        scrap_quantity,
        scrap_reason,
        return_not_possible_reason,
        disposal_method,
        scrap_attachment,
        created_by,
      } = body;

      if (!qc_mr_line_id || !scrap_quantity || !scrap_reason) {
        return NextResponse.json(
          { success: false, message: "Missing required fields" },
          { status: 400 },
        );
      }

      const query = `
        INSERT INTO qc_resolution_reject_scrap (
          qc_mr_line_id,
          scrap_quantity,
          scrap_reason,
          return_not_possible_reason,
          disposal_method,
          scrap_attachment,
          progress_id,
          created_by
        ) VALUES (?, ?, ?, ?, ?, ?, 1, ?)
      `;

      const values = [
        qc_mr_line_id,
        Number(scrap_quantity),
        scrap_reason,
        return_not_possible_reason || null,
        disposal_method || null,
        scrap_attachment
          ? JSON.stringify(scrap_attachment)
          : JSON.stringify([]),
        created_by,
      ];

      const [result] = await db.query<ResultSetHeader>(query, values);

      // Insert initial progress log entry
      await db.query(
        `INSERT INTO qc_resolution_progress_log
          (resolution_id, resolution_type, progress_id, from_progress_id, changed_by)
         VALUES (?, 'scrap_discard', 1, NULL, ?)`,
        [result.insertId, created_by || null],
      );

      return NextResponse.json({
        success: true,
        message: "Scrap/discard resolution created",
        id: result.insertId,
      });
    }

    if (action === "updateProgress") {
      const {
        resolution_id,
        resolution_type,
        new_progress_id,
        from_progress_id,
        changed_by,
      } = body;

      if (!resolution_id || !new_progress_id) {
        return NextResponse.json(
          { success: false, message: "Missing required fields" },
          { status: 400 },
        );
      }

      if (resolution_type === "return_refund") {
        const updateQuery = `
          UPDATE qc_resolution_return_refund
          SET progress_id = ?
          WHERE id = ?
        `;
        await db.query(updateQuery, [new_progress_id, resolution_id]);

        // Insert progress log entry
        await db.query(
          `INSERT INTO qc_resolution_progress_log
            (resolution_id, resolution_type, progress_id, from_progress_id, changed_by)
           VALUES (?, ?, ?, ?, ?)`,
          [
            resolution_id,
            resolution_type,
            new_progress_id,
            from_progress_id || null,
            changed_by || null,
          ],
        );

        return NextResponse.json({
          success: true,
          message: "Progress updated",
        });
      }

      if (resolution_type === "replace_vendor") {
        const updateQuery = `
          UPDATE qc_resolution_replace
          SET progress_id = ?
          WHERE id = ?
        `;
        await db.query(updateQuery, [new_progress_id, resolution_id]);

        // Insert progress log entry
        await db.query(
          `INSERT INTO qc_resolution_progress_log
            (resolution_id, resolution_type, progress_id, from_progress_id, changed_by)
           VALUES (?, ?, ?, ?, ?)`,
          [
            resolution_id,
            resolution_type,
            new_progress_id,
            from_progress_id || null,
            changed_by || null,
          ],
        );

        return NextResponse.json({
          success: true,
          message: "Progress updated",
        });
      }

      if (resolution_type === "scrap_discard") {
        const updateQuery = `
          UPDATE qc_resolution_reject_scrap
          SET progress_id = ?
          WHERE id = ?
        `;
        await db.query(updateQuery, [new_progress_id, resolution_id]);

        // Insert progress log entry
        await db.query(
          `INSERT INTO qc_resolution_progress_log
            (resolution_id, resolution_type, progress_id, from_progress_id, changed_by)
           VALUES (?, ?, ?, ?, ?)`,
          [
            resolution_id,
            resolution_type,
            new_progress_id,
            from_progress_id || null,
            changed_by || null,
          ],
        );

        return NextResponse.json({
          success: true,
          message: "Progress updated",
        });
      }

      if (resolution_type === "accept_conditionally") {
        const updateQuery = `
          UPDATE qc_resolution_conditionally_accepted
          SET progress_id = ?
          WHERE id = ?
        `;
        await db.query(updateQuery, [new_progress_id, resolution_id]);

        // Insert progress log entry
        await db.query(
          `INSERT INTO qc_resolution_progress_log
            (resolution_id, resolution_type, progress_id, from_progress_id, changed_by)
           VALUES (?, ?, ?, ?, ?)`,
          [
            resolution_id,
            resolution_type,
            new_progress_id,
            from_progress_id || null,
            changed_by || null,
          ],
        );

        return NextResponse.json({
          success: true,
          message: "Progress updated",
        });
      }

      return NextResponse.json(
        { success: false, message: "Invalid resolution type" },
        { status: 400 },
      );
    }

    if (action === "setReplacementGrnId") {
      const { resolution_id, grn_id } = body;

      if (!resolution_id || !grn_id) {
        return NextResponse.json(
          { success: false, message: "Missing required fields" },
          { status: 400 },
        );
      }

      await db.query(
        `UPDATE qc_resolution_replace SET replacement_grn_id = ? WHERE id = ?`,
        [grn_id, resolution_id],
      );

      return NextResponse.json({
        success: true,
        message: "Replacement GRN ID updated",
      });
    }

    return NextResponse.json(
      { success: false, message: "Invalid action" },
      { status: 400 },
    );
  } catch (error: any) {
    console.error("Error creating resolution:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to create resolution",
        error: error.sqlMessage || error.message,
      },
      { status: 500 },
    );
  }
}
