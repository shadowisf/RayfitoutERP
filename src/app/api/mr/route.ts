import { NextResponse } from "next/server";
import { ResultSetHeader } from "mysql2";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const [rows]: any = await db.query(`SELECT * FROM vw_mr_headers`);

    return NextResponse.json(rows, { status: 200 });
  } catch (err: any) {
    console.error("SQL Error:", err.sqlMessage);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.action === "getMrHeaders") {
      const [rows]: any = await db.query(
        `SELECT * FROM vw_mr_headers WHERE department_id = ?`,
        [body.department_id],
      );

      return NextResponse.json(rows, { status: 200 });
    }

    if (body.action === "createMrHeader") {
      const headerQuery = `
      INSERT INTO mr_headers 
      (project_id, department_id, requested_by, required_date, purpose_id)
      VALUES (?, ?, ?, ?, ?)
    `;

      const headerValues = [
        Number(body.project_id) || null,
        Number(body.department_id),
        body.requested_by,
        body.required_date,
        Number(body.purpose_id),
      ];

      const [headerResult] = await db.query<ResultSetHeader>(
        headerQuery,
        headerValues,
      );
      const mrHeaderId = headerResult.insertId;

      return NextResponse.json({
        success: true,
        mrHeaderId: mrHeaderId,
      });
    }

    if (body.action === "createMrLine") {
      try {
        // ✅ Insert the main mr_line WITHOUT boq_line_id
        const lineQuery = `
      INSERT INTO mr_lines 
      (mr_header_id, material_category_id, material_description, quantity, unit, notes, specification, brand, delivery_location, attachment)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

        const lineValues = [
          Number(body.mr_header_id),
          Number(body.material_category_id),
          body.material_description || "",
          body.quantity && !isNaN(Number(body.quantity))
            ? Number(body.quantity)
            : 0,
          body.unit || "",
          body.notes || null,
          body.specification || null,
          body.brand || null,
          body.delivery_location || null,
          body.attachment || null,
        ];

        const [lineResult] = await db.query<ResultSetHeader>(
          lineQuery,
          lineValues,
        );
        const mrLineId = lineResult.insertId;

        // ✅ Insert subcategories into junction table
        const subcategoryIds = Array.isArray(body.material_subcategory_ids)
          ? body.material_subcategory_ids
          : [body.material_subcategory_ids];

        const validSubcategoryIds = subcategoryIds.filter(
          (id: any) => id && !isNaN(Number(id)),
        );

        if (validSubcategoryIds.length > 0) {
          const junctionQuery = `
        INSERT INTO jt_mr_line_material_subcategory (mr_line_id, material_subcategory_id)
        VALUES ?
      `;

          const junctionValues = validSubcategoryIds.map((subcatId: any) => [
            mrLineId,
            Number(subcatId),
          ]);

          await db.query(junctionQuery, [junctionValues]);
        }

        // ✅ Insert BOQ line associations into junction table
        const boqLineIds = Array.isArray(body.boq_line_ids)
          ? body.boq_line_ids
          : body.boq_line_ids
            ? [body.boq_line_ids]
            : [];

        const validBoqLineIds = boqLineIds.filter(
          (id: any) => id && !isNaN(Number(id)),
        );

        if (validBoqLineIds.length > 0) {
          const boqJunctionQuery = `
        INSERT INTO jt_mr_lines_boq_lines (mr_line_id, boq_line_id)
        VALUES ?
      `;

          const boqJunctionValues = validBoqLineIds.map((boqId: any) => [
            mrLineId,
            Number(boqId),
          ]);

          await db.query(boqJunctionQuery, [boqJunctionValues]);
        }

        return NextResponse.json({
          success: true,
          mrLineId: mrLineId,
        });
      } catch (error: any) {
        console.error("Create MR Line Error:", error);
        return NextResponse.json(
          { error: error.message || "Failed to create MR line" },
          { status: 500 },
        );
      }
    }

    if (body.action === "createCategory") {
      const query = "INSERT INTO lut_material_categories (value) VALUES (?)";
      await db.query(query, [body.value]);
      return NextResponse.json({ success: true });
    }

    if (body.action === "createSubCategory") {
      const query =
        "INSERT INTO lut_material_subcategories (category_id, value) VALUES (?, ?)";
      await db.query(query, [body.category_id, body.value]);
      return NextResponse.json({ success: true });
    }
  } catch (err: any) {
    console.error(err.sqlMessage);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();

    if (body.action === "cancelMaterialRequest") {
      await db.query(`UPDATE mr_headers SET progress_id = ? WHERE id = ?`, [
        body.rollback_progress_id,
        body.id,
      ]);

      await db.query(
        `INSERT INTO mr_header_progress_log 
   (mr_header_id, progress_id, changed_by) 
   VALUES (?, ?, ?)`,
        [body.id, body.rollback_progress_id, `${body.changed_by} (ROLLBACK)`],
      );

      await db.query(
        `INSERT INTO notification (mr_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
        [
          body.id,
          8,
          "Rolled Back MR",
          `MR-${String(body.id).padStart(5, "0")} was moved to the ${body.rollback_progress_name} stage`,
        ],
      );

      await db.query(
        `INSERT INTO notification (mr_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
        [
          body.id,
          body.department_id,
          "Rolled Back MR",
          `Your MR-${String(body.id).padStart(5, "0")} was moved to the ${body.rollback_progress_name} stage`,
        ],
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "submitForQSPricingApproval") {
      await db.query(`UPDATE mr_headers SET progress_id = 9 WHERE id = ?`, [
        body.id,
      ]);

      await db.query(
        `INSERT INTO mr_header_progress_log (mr_header_id, progress_id, changed_by) VALUES (?, 9, ?)`,
        [body.id, body.changed_by],
      );

      await db.query(
        `INSERT INTO notification (mr_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
        [
          body.id,
          16,
          "QS Price Approval Required",
          `MR-${String(body.id).padStart(5, "0")} is awaiting your review`,
        ],
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "submitForQSInitialApproval") {
      await db.query(`UPDATE mr_headers SET progress_id = 2 WHERE id = ?`, [
        body.id,
      ]);

      await db.query(
        `INSERT INTO mr_header_progress_log (mr_header_id, progress_id, changed_by) VALUES (?, 2, ?)`,
        [body.id, body.changed_by],
      );

      await db.query(
        `INSERT INTO notification (mr_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
        [
          body.id,
          16,
          "QS Initial Approval Required",
          `MR-${String(body.id).padStart(5, "0")} is awaiting your review`,
        ],
      );

      await db.query(
        `INSERT INTO notification (mr_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
        [
          body.id,
          body.department_id,
          "MR Submitted",
          `Your MR-${String(body.id).padStart(5, "0")} is awaiting QS approval`,
        ],
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action == "submitForLPO") {
      await db.query(`UPDATE mr_headers SET progress_id = 12 WHERE id = ?`, [
        body.id,
      ]);

      await db.query(
        `INSERT INTO mr_header_progress_log (mr_header_id, progress_id, changed_by) VALUES (?, 12, ?)`,
        [body.id, body.changed_by],
      );

      await db.query(
        `INSERT INTO notification (mr_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
        [
          body.id,
          9,
          "LPO Required",
          `MR-${String(body.id).padStart(5, "0")} is awaiting LPO & invoice`,
        ],
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "submitForPricingResubmission") {
      await db.query(`UPDATE mr_headers SET progress_id = 11 WHERE id = ?`, [
        body.id,
      ]);

      await db.query(
        `INSERT INTO mr_header_progress_log (mr_header_id, progress_id, changed_by) VALUES (?, 11, ?)`,
        [body.id, body.changed_by],
      );

      await db.query(
        `INSERT INTO notification (mr_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
        [
          body.id,
          9,
          "Quotations Rejected",
          `MR-${String(body.id).padStart(5, "0")} was rejected by ${body.user_name}, ${body.user_role}`,
        ],
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "submitForQC") {
      await db.query(`UPDATE mr_headers SET progress_id = 21 WHERE id = ?`, [
        body.id,
      ]);

      await db.query(
        `INSERT INTO mr_header_progress_log (mr_header_id, progress_id, changed_by) VALUES (?, 21, ?)`,
        [body.id, body.changed_by],
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "submitForStockEntry") {
      await db.query(`UPDATE mr_headers SET progress_id = 24 WHERE id = ?`, [
        body.id,
      ]);

      await db.query(
        `INSERT INTO mr_header_progress_log (mr_header_id, progress_id, changed_by) VALUES (?, 24, ?)`,
        [body.id, body.changed_by],
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "submitForInitialApproval") {
      await db.query(`UPDATE mr_headers SET progress_id = 3 WHERE id = ?`, [
        body.id,
      ]);

      await db.query(
        `INSERT INTO mr_header_progress_log (mr_header_id, progress_id, changed_by) VALUES (?, 3, ?)`,
        [body.id, body.changed_by],
      );

      await db.query(
        `INSERT INTO notification (mr_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
        [
          body.id,
          8,
          "Manager Initial Approval Required",
          `MR-${String(body.id).padStart(5, "0")} is awaiting your review`,
        ],
      );

      await db.query(
        `INSERT INTO notification (mr_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
        [
          body.id,
          body.department_id,
          "MR Submitted",
          `Your MR-${String(body.id).padStart(5, "0")} is awaiting manager approval`,
        ],
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "approveItemQS") {
      await db.query(
        `UPDATE mr_lines SET qs_approval_status = 'Approved' WHERE id = ?`,
        [body.id],
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "approveItem") {
      await db.query(
        `UPDATE mr_lines SET approval_status = 'Approved' WHERE id = ?`,
        [body.id],
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "rejectItemQS") {
      await db.query(
        `UPDATE mr_lines SET qs_approval_status = 'Rejected', qs_reject_comment = ? WHERE id = ?`,
        [body.comment, body.id],
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "rejectItem") {
      await db.query(
        `UPDATE mr_lines SET approval_status = 'Rejected', reject_comment = ? WHERE id = ?`,
        [body.comment, body.id],
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "resetItemQS") {
      await db.query(
        `UPDATE mr_lines SET qs_approval_status = null, qs_reject_comment = null WHERE id = ?`,
        [body.id],
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "resetItem") {
      await db.query(
        `UPDATE mr_lines SET approval_status = null, reject_comment = null WHERE id = ?`,
        [body.id],
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "submitForResubmission") {
      await db.query(`UPDATE mr_headers SET progress_id = 5 WHERE id = ?`, [
        body.id,
      ]);

      await db.query(
        `INSERT INTO mr_header_progress_log (mr_header_id, progress_id, changed_by) VALUES (?, 5, ?)`,
        [body.id, body.changed_by],
      );

      await db.query(
        `INSERT INTO notification (mr_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
        [
          body.id,
          body.department_id,
          "MR Rejected",
          `MR-${String(body.id).padStart(5, "0")} was rejected by ${body.user_name}, ${body.user_role}`,
        ],
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "submitForQuotations") {
      await db.query(`UPDATE mr_headers SET progress_id = 7 WHERE id = ?`, [
        body.id,
      ]);

      await db.query(
        `INSERT INTO mr_header_progress_log (mr_header_id, progress_id, changed_by) VALUES (?, 7, ?)`,
        [body.id, body.changed_by],
      );

      await db.query(
        `INSERT INTO notification (mr_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
        [
          body.id,
          9,
          "Quotations Required",
          `MR-${String(body.id).padStart(5, "0")} is awaiting quotations`,
        ],
      );

      await db.query(
        `INSERT INTO notification (mr_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
        [
          body.id,
          body.department_id,
          "MR Approved",
          `Your MR-${String(body.id).padStart(5, "0")} is awaiting quotations`,
        ],
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "submitForPricingApproval") {
      await db.query(`UPDATE mr_headers SET progress_id = 10 WHERE id = ?`, [
        body.id,
      ]);

      await db.query(
        `INSERT INTO mr_header_progress_log (mr_header_id, progress_id, changed_by) VALUES (?, 10, ?)`,
        [body.id, body.changed_by],
      );

      await db.query(
        `INSERT INTO notification (mr_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
        [
          body.id,
          8,
          "Manager Price Approval Required",
          `MR-${String(body.id).padStart(5, "0")} is awaiting your review`,
        ],
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "submitForPayment") {
      await db.query(`UPDATE mr_headers SET progress_id = 14 WHERE id = ?`, [
        body.id,
      ]);

      await db.query(
        `INSERT INTO mr_header_progress_log (mr_header_id, progress_id, changed_by) VALUES (?, 14, ?)`,
        [body.id, body.changed_by],
      );

      await db.query(
        `INSERT INTO notification (mr_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
        [
          body.id,
          10,
          "Pending Payment",
          `MR-${String(body.id).padStart(5, "0")} is awaiting payment (AED ${body.payment_value})`,
        ],
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "submitForDelivery") {
      await db.query(`UPDATE mr_headers SET progress_id = 17 WHERE id = ?`, [
        body.id,
      ]);

      await db.query(
        `INSERT INTO mr_header_progress_log (mr_header_id, progress_id, changed_by) VALUES (?, 17, ?)`,
        [body.id, body.changed_by],
      );

      await db.query(
        `INSERT INTO notification (mr_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
        [
          body.id,
          10,
          "Payment Successful",
          `A payment (AED ${body.payment_value}) was made against MR-${String(body.id).padStart(5, "0")}`,
        ],
      );

      await db.query(
        `INSERT INTO notification (mr_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
        [
          body.id,
          8,
          "MR Awaiting Delivery",
          `MR-${String(body.id).padStart(5, "0")} is awaiting delivery (ETA: ${body.delivery_date})`,
        ],
      );

      await db.query(
        `INSERT INTO notification (mr_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
        [
          body.id,
          9,
          "MR Awaiting Delivery",
          `MR-${String(body.id).padStart(5, "0")} is awaiting delivery (ETA: ${body.delivery_date})`,
        ],
      );

      await db.query(
        `INSERT INTO notification (mr_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
        [
          body.id,
          16,
          "MR Awaiting Delivery",
          `MR-${String(body.id).padStart(5, "0")} is awaiting delivery (ETA: ${body.delivery_date})`,
        ],
      );

      await db.query(
        `INSERT INTO notification (mr_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
        [
          body.id,
          body.department_id,
          "MR Awaiting Delivery",
          `MR-${String(body.id).padStart(5, "0")} is awaiting delivery (ETA: ${body.delivery_date})`,
        ],
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "submitForLPOResubmission") {
      await db.query(`UPDATE mr_headers SET progress_id = 13 WHERE id = ?`, [
        body.id,
      ]);

      await db.query(
        `INSERT INTO mr_header_progress_log (mr_header_id, progress_id, changed_by) VALUES (?, 13, ?)`,
        [body.id, body.changed_by],
      );

      await db.query(
        `INSERT INTO notification (mr_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
        [
          body.id,
          9,
          "Payment Rejected",
          `Payment for LPO-${String(body.id).padStart(5, "0")} was rejected`,
        ],
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "submitForLPOResubmissionGRNFail") {
      await db.query(`UPDATE mr_headers SET progress_id = 16 WHERE id = ?`, [
        body.id,
      ]);

      await db.query(
        `INSERT INTO mr_header_progress_log (mr_header_id, progress_id, changed_by) VALUES (?, 16, ?)`,
        [body.id, body.changed_by],
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "submitForProcurementResolution") {
      await db.query(`UPDATE mr_headers SET progress_id = 23 WHERE id = ?`, [
        body.id,
      ]);

      await db.query(
        `INSERT INTO mr_header_progress_log (mr_header_id, progress_id, changed_by) VALUES (?, 23, ?)`,
        [body.id, body.changed_by],
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "submitForCompletion") {
      await db.query(`UPDATE mr_headers SET progress_id = 25 WHERE id = ?`, [
        body.id,
      ]);

      await db.query(
        `INSERT INTO mr_header_progress_log (mr_header_id, progress_id, changed_by) VALUES (?, 25, ?)`,
        [body.id, body.changed_by],
      );

      await db.query(
        `INSERT INTO notification (mr_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
        [
          body.id,
          body.department_id,
          "Material Received",
          `Your MR-${String(body.id).padStart(5, "0")} was fulfilled successfully`,
        ],
      );

      await db.query(
        `INSERT INTO notification (mr_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
        [
          body.id,
          9,
          "Material Received",
          `MR-${String(body.id).padStart(5, "0")} was fulfilled successfully`,
        ],
      );

      if (body.mr_line_items && Array.isArray(body.mr_line_items)) {
        const notificationPromises = body.mr_line_items.map(
          async (item: any) => {
            await db.query(
              `
      INSERT INTO notification
      (mr_header_id, department_id, header, message)
      VALUES (?, ?, ?, ?)
      `,
              [
                body.id,
                11,
                "Stock Added",
                `${item.quantity} ${item.unit} was added to ${item.material_description}`,
              ],
            );

            await db.query(
              `
      INSERT INTO notification
      (mr_header_id, department_id, header, message)
      VALUES (?, ?, ?, ?)
      `,
              [
                body.id,
                8,
                "Stock Added",
                `${item.quantity} ${item.unit} was added to ${item.material_description}`,
              ],
            );

            await db.query(
              `
      INSERT INTO notification
      (mr_header_id, department_id, header, message)
      VALUES (?, ?, ?, ?)
      `,
              [
                body.id,
                16,
                "Stock Added",
                `${item.quantity} ${item.unit} was added to ${item.material_description}`,
              ],
            );
          },
        );

        await Promise.all(notificationPromises);
      }

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "updateMrHeader") {
      await db.query(
        `UPDATE mr_headers 
     SET project_id = ?, 
         required_date = ?, 
         purpose_id = ? 
     WHERE id = ?`,
        [body.project_id || null, body.required_date, body.purpose_id, body.id],
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "updateAll") {
      try {
        // ✅ Update the main mr_line WITHOUT boq_line_id
        const query = `
      UPDATE mr_lines 
      SET material_category_id = ?, 
          material_description = ?, 
          quantity = ?, 
          unit = ?, 
          notes = ?,
          specification = ?,
          brand = ?,
          delivery_location = ?,
          approval_status = NULL,
          reject_comment = NULL,
          qs_approval_status = NULL,
          qs_reject_comment = NULL
      WHERE id = ?
    `;

        const values = [
          Number(body.material_category_id),
          body.material_description,
          Number(body.quantity),
          body.unit,
          body.notes,
          body.specification,
          body.brand,
          body.delivery_location,
          Number(body.id),
        ];

        await db.query(query, values);

        // ✅ Delete existing subcategory associations
        await db.query(
          `DELETE FROM jt_mr_line_material_subcategory WHERE mr_line_id = ?`,
          [Number(body.id)],
        );

        // ✅ Insert new subcategory associations
        const subcategoryIds = Array.isArray(body.material_subcategory_id)
          ? body.material_subcategory_id
          : [body.material_subcategory_id];

        const validSubcategoryIds = subcategoryIds.filter(
          (id: any) => id && !isNaN(Number(id)),
        );

        if (validSubcategoryIds.length > 0) {
          const junctionQuery = `
        INSERT INTO jt_mr_line_material_subcategory (mr_line_id, material_subcategory_id)
        VALUES ?
      `;

          const junctionValues = validSubcategoryIds.map((subcatId: number) => [
            Number(body.id),
            Number(subcatId),
          ]);

          await db.query(junctionQuery, [junctionValues]);
        }

        // ✅ Delete existing BOQ line associations
        await db.query(
          `DELETE FROM jt_mr_lines_boq_lines WHERE mr_line_id = ?`,
          [Number(body.id)],
        );

        // ✅ Insert new BOQ line associations
        const boqLineIds = Array.isArray(body.boq_line_ids)
          ? body.boq_line_ids
          : body.boq_line_ids
            ? [body.boq_line_ids]
            : [];

        const validBoqLineIds = boqLineIds.filter(
          (id: any) => id && !isNaN(Number(id)),
        );

        if (validBoqLineIds.length > 0) {
          const boqJunctionQuery = `
        INSERT INTO jt_mr_lines_boq_lines (mr_line_id, boq_line_id)
        VALUES ?
      `;

          const boqJunctionValues = validBoqLineIds.map((boqId: any) => [
            Number(body.id),
            Number(boqId),
          ]);

          await db.query(boqJunctionQuery, [boqJunctionValues]);
        }

        return NextResponse.json({ success: true });
      } catch (error) {
        throw error;
      }
    }

    if (body.action === "updateSubCategory") {
      const query = `
    UPDATE mr_lines 
    SET material_subcategory_id = ?
    WHERE id IN (?)
  `;

      const values = [Number(body.new_material_subcategory_id), body.item_ids];

      await db.query(query, values);

      return NextResponse.json({ success: true });
    }
  } catch (err: any) {
    console.error(err.sqlMessage);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();

    if (body.action === "deleteItem") {
      // ✅ Cascading deletes will handle junction table entries automatically
      const query = "DELETE FROM mr_lines WHERE id = ?";
      await db.query(query, [Number(body.id)]);
      return NextResponse.json({ success: true });
    }

    if (body.action === "deleteSubCategory") {
      // ✅ Cascading deletes will handle junction table entries automatically
      const query = `
    DELETE FROM mr_lines 
    WHERE id IN (?)
  `;

      const values = [body.item_ids];

      await db.query(query, values);

      return NextResponse.json({ success: true });
    }

    if (body.action === "deleteMrHeader") {
      // ✅ Cascading deletes will handle mr_lines and junction tables automatically
      const query = "DELETE FROM mr_headers WHERE id = ?";

      await db.query(query, [Number(body.id)]);

      return NextResponse.json({ success: true });
    }
  } catch (err: any) {
    console.error(err.sqlMessage);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}
