import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.action === "createLPO") {
      const lpoQuery = `
      INSERT INTO lpo
      (project_id, mr_header_id, supplier_id, subcontractor_id, progress_id, quotation_code, supplier_contact_person_name, supplier_email, delivery_date, payment_terms, delivery_terms, subtotal, discount, vat_rate, vat, shipping_and_handling, total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

      const lpoValues = [
        Number(body.project_id) || null,
        Number(body.mr_header_id),
        body.supplier_id ? Number(body.supplier_id) : null,
        body.subcontractor_id ? Number(body.subcontractor_id) : null,
        12,
        body.quotation_code,
        body.supplier_contact_person_name || "",
        body.supplier_email || "",
        body.delivery_date,
        body.payment_terms,
        body.delivery_terms,
        Number(body.subtotal) || 0,
        Number(body.discount) || 0,
        Number(body.vat_rate) || 0,
        Number(body.vat) || 0,
        Number(body.shipping_and_handling) || 0,
        Number(body.total) || 0,
      ];

      const [lpoResult]: any = await db.query(lpoQuery, lpoValues);
      const lpoId = lpoResult.insertId;

      if (body.lpo_mr_lines && body.lpo_mr_lines.length > 0) {
        const mrLineQuery = `
            INSERT INTO lpo_mr_line
            (lpo_id, mr_line_id, unit_price, total_price)
            VALUES (?, ?, ?, ?)
          `;

        for (const line of body.lpo_mr_lines) {
          await db.query(mrLineQuery, [
            lpoId,
            Number(line.mr_line_id),
            Number(line.unit_price),
            Number(line.total_price),
          ]);
        }
      }

      if (body.lpo_jo_lines && body.lpo_jo_lines.length > 0) {
        const joLineQuery = `
          INSERT INTO lpo_jo_line (lpo_id, jo_line_id, approved_total_price)
          VALUES (?, ?, ?)
        `;
        for (const line of body.lpo_jo_lines) {
          await db.query(joLineQuery, [
            lpoId,
            Number(line.jo_line_id),
            Number(line.approved_total_price) || 0,
          ]);
        }
      }

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

    if (body.action === "rejectPayment") {
      const query = `
    UPDATE lpo 
    SET payment_status = 'Rejected', payment_reject_comment = ?
    WHERE id = ?
  `;

      await db.query(query, [body.reject_comment, Number(body.lpo_id)]);

      return NextResponse.json({ success: true });
    }

    if (body.action === "resetPayment") {
      const query = `
    UPDATE lpo 
    SET payment_status = NULL, payment_reject_comment = NULL, payment_file = NULL, paid_at = NULL
    WHERE id = ?
  `;

      await db.query(query, [Number(body.lpo_id)]);

      return NextResponse.json({ success: true });
    }

    if (body.action === "approvePayment") {
      // Safe numeric parsing: Number(undefined) or Number("") yields NaN,
      // which the mysql2 driver serializes as the unquoted literal `NaN`,
      // which MySQL then parses as a column identifier — producing the
      // cryptic "Unknown column 'NaN' in 'field list'" error. Coerce to
      // null instead so the driver sends a proper NULL.
      const toIntOrNull = (v: unknown) => {
        if (v === null || v === undefined || v === "") return null;
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
      };

      const lpoIdNum = toIntOrNull(body.lpo_id);
      if (lpoIdNum === null) {
        return NextResponse.json(
          { error: "Missing or invalid lpo_id" },
          { status: 400 },
        );
      }

      const query = `
    UPDATE lpo
    SET payment_status = 'Approved', payment_reject_comment = NULL, payment_file = ?, paid_at = NOW()
    WHERE id = ?
  `;

      await db.query(query, [body.payment_file || null, lpoIdNum]);

      if (!body.from_lpo_workflow) {
        // Fall back to looking up mr_header_id from the LPO row itself
        // so the notification insert still works if the caller forgot
        // to include it in the body.
        let mrHeaderIdNum = toIntOrNull(body.mr_header_id);
        if (mrHeaderIdNum === null) {
          const [rows]: any = await db.query(
            `SELECT mr_header_id FROM lpo WHERE id = ?`,
            [lpoIdNum],
          );
          mrHeaderIdNum = toIntOrNull(rows?.[0]?.mr_header_id);
        }

        if (mrHeaderIdNum !== null) {
          await db.query(
            `INSERT INTO notification (mr_header_id, lpo_id, department_id, header, message) VALUES (?, ?, ?, ?, ?)`,
            [
              mrHeaderIdNum,
              lpoIdNum,
              10,
              "Payment Successful",
              `A payment (AED ${body.payment_value}) was made against LPO-${String(lpoIdNum).padStart(5, "0")}`,
            ],
          );
        }
      }

      return NextResponse.json({ success: true });
    }

    if (body.action === "updateLPO") {
      const {
        lpo_id,
        quotation_code,
        supplier_contact_person_name,
        supplier_email,
        delivery_date,
        payment_terms,
        delivery_terms,
        subtotal,
        discount,
        vat_rate,
        vat,
        shipping_and_handling,
        total,
        lpo_mr_lines,
      } = body;

      try {
        // Update main LPO record
        const updateLPOQuery = `
      UPDATE lpo 
      SET 
        progress_id = ?,
        quotation_code = ?,
        supplier_contact_person_name = ?,
        supplier_email = ?,
        delivery_date = ?,
        payment_terms = ?,
        delivery_terms = ?,
        subtotal = ?,
        discount = ?,
        vat_rate = ?,
        vat = ?,
        shipping_and_handling = ?,
        total = ?,
        payment_status = NULL,
        payment_reject_comment = NULL
      WHERE id = ?
    `;

        await db.query(updateLPOQuery, [
          12,
          quotation_code,
          supplier_contact_person_name,
          supplier_email,
          delivery_date,
          payment_terms,
          delivery_terms,
          subtotal,
          discount,
          vat_rate,
          vat,
          shipping_and_handling,
          total,
          lpo_id,
        ]);

        // Update LPO MR Lines (MR LPOs only)
        if (lpo_mr_lines && lpo_mr_lines.length > 0) {
          for (const line of lpo_mr_lines) {
            const updateLineQuery = `
          UPDATE lpo_mr_line
          SET
            unit_price = ?,
            total_price = ?
          WHERE id = ?
        `;
            await db.query(updateLineQuery, [
              line.unit_price,
              line.total_price,
              line.id,
            ]);
          }
        }
        // JO LPO lines: prices are frozen from approval — no line update needed

        return NextResponse.json(
          { success: true, message: "LPO updated successfully" },
          { status: 200 },
        );
      } catch (error) {
        console.error("Error updating LPO:", error);
        return NextResponse.json(
          { error: "Failed to update LPO" },
          { status: 500 },
        );
      }
    }

    if (body.action === "updateLPOSignedLpo") {
      const query = `
    UPDATE lpo
    SET signed_file = ?
    WHERE mr_header_id = ? AND supplier_id = ?
  `;

      const values = [
        body.signed_lpo_file,
        Number(body.mr_header_id),
        Number(body.supplier_id),
      ];

      await db.query(query, values);

      return NextResponse.json({ success: true });
    }

    if (body.action === "updateLPOInvoice") {
      const query = `
    UPDATE lpo
    SET invoice_file = ?
    WHERE mr_header_id = ? AND supplier_id = ?
  `;

      const values = [
        body.invoice_file,
        Number(body.mr_header_id),
        Number(body.supplier_id),
      ];

      await db.query(query, values);

      return NextResponse.json({ success: true });
    }

    if (body.action === "submitLpoForPayment") {
      await db.query(`UPDATE lpo SET progress_id = 14 WHERE id = ?`, [
        Number(body.lpo_id),
      ]);

      await db.query(
        `INSERT INTO mr_header_progress_log
         (mr_header_id, progress_id, from_progress_id, changed_by, lpo_id)
         VALUES (?, 14, 12, ?, ?)`,
        [Number(body.mr_header_id), body.changed_by, Number(body.lpo_id)],
      );

      await db.query(
        `INSERT INTO notification (mr_header_id, lpo_id, department_id, header, message) VALUES (?, ?, ?, ?, ?)`,
        [
          Number(body.mr_header_id),
          Number(body.lpo_id),
          10,
          "Pending Payment",
          `LPO-${String(body.lpo_id).padStart(5, "0")} (MR-${String(body.mr_header_id).padStart(5, "0")}) is awaiting payment (AED ${body.payment_value})`,
        ],
      );

      return NextResponse.json({ success: true });
    }

    if (body.action === "submitLpoForDelivery") {
      await db.query(`UPDATE lpo SET progress_id = 17 WHERE id = ?`, [
        Number(body.lpo_id),
      ]);

      await db.query(
        `INSERT INTO mr_header_progress_log
         (mr_header_id, progress_id, from_progress_id, changed_by, lpo_id)
         VALUES (?, 17, ?, ?, ?)`,
        [
          Number(body.mr_header_id),
          body.skip_to_delivery ? 12 : 14,
          body.changed_by,
          Number(body.lpo_id),
        ],
      );

      if (!body.skip_to_delivery || body.skip_to_delivery === false) {
        await db.query(
          `INSERT INTO notification (mr_header_id, lpo_id, department_id, header, message) VALUES (?, ?, ?, ?, ?)`,
          [
            Number(body.mr_header_id),
            Number(body.lpo_id),
            10,
            "Payment Successful",
            `A payment (AED ${body.payment_value}) was made against LPO-${String(body.lpo_id).padStart(5, "0")}`,
          ],
        );
      }

      const deptIds = [8, 9, 11, 16];
      if (body.department_id && !deptIds.includes(Number(body.department_id))) {
        deptIds.push(Number(body.department_id));
      }

      for (const deptId of deptIds) {
        await db.query(
          `INSERT INTO notification (mr_header_id, lpo_id, department_id, header, message) VALUES (?, ?, ?, ?, ?)`,
          [
            Number(body.mr_header_id),
            Number(body.lpo_id),
            deptId,
            "LPO Awaiting Delivery",
            `LPO-${String(body.lpo_id).padStart(5, "0")} (MR-${String(body.mr_header_id).padStart(5, "0")}) is awaiting delivery (ETA: ${body.delivery_date})`,
          ],
        );
      }

      return NextResponse.json({ success: true });
    }

    if (body.action === "submitLpoForLPOResubmission") {
      // Auto-query payment rejection info for this specific LPO
      const [rejectedLpo]: any = await db.query(
        `SELECT l.id, l.payment_reject_comment
         FROM lpo l WHERE l.id = ? AND l.payment_status = 'Rejected'`,
        [Number(body.lpo_id)],
      );

      const rejectReason =
        rejectedLpo.length > 0
          ? JSON.stringify([
              {
                item: `LPO-${String(body.lpo_id).padStart(5, "0")}`,
                reason: rejectedLpo[0].payment_reject_comment || "",
              },
            ])
          : body.reject_reason || null;

      await db.query(`UPDATE lpo SET progress_id = 13 WHERE id = ?`, [
        Number(body.lpo_id),
      ]);

      await db.query(
        `INSERT INTO mr_header_progress_log
         (mr_header_id, progress_id, from_progress_id, changed_by, lpo_id, reject_reason)
         VALUES (?, 13, 14, ?, ?, ?)`,
        [
          Number(body.mr_header_id),
          body.changed_by,
          Number(body.lpo_id),
          rejectReason,
        ],
      );

      await db.query(
        `INSERT INTO notification (mr_header_id, lpo_id, department_id, header, message) VALUES (?, ?, ?, ?, ?)`,
        [
          Number(body.mr_header_id),
          Number(body.lpo_id),
          9,
          "Payment Rejected",
          `Payment for LPO-${String(body.lpo_id).padStart(5, "0")} (MR-${String(body.mr_header_id).padStart(5, "0")}) was rejected`,
        ],
      );

      return NextResponse.json({ success: true });
    }

    if (body.action === "submitLpoForLPOResubmissionGRNFail") {
      await db.query(`UPDATE lpo SET progress_id = 16 WHERE id = ?`, [
        Number(body.lpo_id),
      ]);

      await db.query(
        `INSERT INTO mr_header_progress_log
         (mr_header_id, progress_id, from_progress_id, changed_by, lpo_id, reject_reason)
         VALUES (?, 16, 17, ?, ?, ?)`,
        [
          Number(body.mr_header_id),
          body.changed_by,
          Number(body.lpo_id),
          body.reject_reason || null,
        ],
      );

      return NextResponse.json({ success: true });
    }

    if (body.action === "submitLpoForQC") {
      await db.query(`UPDATE lpo SET progress_id = 21 WHERE id = ?`, [
        Number(body.lpo_id),
      ]);

      await db.query(
        `INSERT INTO mr_header_progress_log
         (mr_header_id, progress_id, from_progress_id, changed_by, lpo_id)
         VALUES (?, 21, 17, ?, ?)`,
        [Number(body.mr_header_id), body.changed_by, Number(body.lpo_id)],
      );

      return NextResponse.json({ success: true });
    }

    if (body.action === "submitLpoForStockEntry") {
      await db.query(`UPDATE lpo SET progress_id = 24 WHERE id = ?`, [
        Number(body.lpo_id),
      ]);

      await db.query(
        `INSERT INTO mr_header_progress_log
         (mr_header_id, progress_id, from_progress_id, changed_by, lpo_id)
         VALUES (?, 24, ?, ?, ?)`,
        [
          Number(body.mr_header_id),
          body.from_progress_id || 21,
          body.changed_by,
          Number(body.lpo_id),
        ],
      );

      return NextResponse.json({ success: true });
    }

    if (body.action === "submitLpoForCompletion") {
      await db.query(`UPDATE lpo SET progress_id = 25 WHERE id = ?`, [
        Number(body.lpo_id),
      ]);

      await db.query(
        `INSERT INTO mr_header_progress_log
         (mr_header_id, progress_id, from_progress_id, changed_by, lpo_id)
         VALUES (?, 25, 24, ?, ?)`,
        [Number(body.mr_header_id), body.changed_by, Number(body.lpo_id)],
      );

      await db.query(
        `INSERT INTO notification (mr_header_id, lpo_id, department_id, header, message) VALUES (?, ?, ?, ?, ?)`,
        [
          Number(body.mr_header_id),
          Number(body.lpo_id),
          Number(body.department_id),
          "LPO Completed",
          `LPO-${String(body.lpo_id).padStart(5, "0")} (MR-${String(body.mr_header_id).padStart(5, "0")}) was fulfilled successfully`,
        ],
      );

      await db.query(
        `INSERT INTO notification (mr_header_id, lpo_id, department_id, header, message) VALUES (?, ?, ?, ?, ?)`,
        [
          Number(body.mr_header_id),
          Number(body.lpo_id),
          9,
          "LPO Completed",
          `LPO-${String(body.lpo_id).padStart(5, "0")} (MR-${String(body.mr_header_id).padStart(5, "0")}) was fulfilled successfully`,
        ],
      );

      if (body.mr_line_items && Array.isArray(body.mr_line_items)) {
        for (const item of body.mr_line_items) {
          const stockDepts = [11, 8, 16];
          for (const deptId of stockDepts) {
            await db.query(
              `INSERT INTO notification (mr_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
              [
                Number(body.mr_header_id),
                deptId,
                "Stock Added",
                `${Number.isInteger(+item.quantity) ? +item.quantity : +item.quantity} ${item.unit} was added to ${item.material_description}`,
              ],
            );
          }
        }
      }

      return NextResponse.json({ success: true });
    }

    if (body.action === "submitLpoForProcurementResolution") {
      await db.query(`UPDATE lpo SET progress_id = 23 WHERE id = ?`, [
        Number(body.lpo_id),
      ]);

      await db.query(
        `INSERT INTO mr_header_progress_log
         (mr_header_id, progress_id, from_progress_id, changed_by, lpo_id, reject_reason)
         VALUES (?, 23, 21, ?, ?, ?)`,
        [
          Number(body.mr_header_id),
          body.changed_by,
          Number(body.lpo_id),
          body.reject_reason || null,
        ],
      );

      return NextResponse.json({ success: true });
    }
  } catch (err: any) {
    console.error("SQL Error:", err.sqlMessage);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    if (body.action === "deleteLpoHeader") {
      // First, get all mr_line_ids associated with this LPO
      const [mrLineIds] = (await db.query(
        `SELECT mr_line_id FROM lpo_mr_line WHERE lpo_id = ?`,
        [Number(body.lpo_id)],
      )) as any; // Type assertion to bypass the issue

      // Create notification
      await db.query(
        `INSERT INTO notification (lpo_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
        [
          null,
          8,
          `LPO Deleted`,
          `LPO-${String(body.lpo_id).padStart(5, "0")} (MR-${String(body.mr_header_id).padStart(5, "0")}) has been deleted by ${body.deleted_by}.`,
        ],
      );

      // Delete the mr_lines associated with this LPO
      if (Array.isArray(mrLineIds) && mrLineIds.length > 0) {
        const mrLineIdsToDelete = mrLineIds.map((row: any) => row.mr_line_id);
        await db.query(`DELETE FROM mr_lines WHERE id IN (?)`, [
          mrLineIdsToDelete,
        ]);
      }

      // Delete the LPO (this will cascade delete lpo_mr_line entries)
      await db.query("DELETE FROM lpo WHERE id = ?", [Number(body.lpo_id)]);

      return NextResponse.json({ success: true });
    }

    if (body.action === "deleteLpoPDF") {
      await db.query("DELETE FROM lpo WHERE id = ?", [Number(body.id)]);
      return NextResponse.json({ success: true });
    }
  } catch (err: any) {
    console.error(err.sqlMessage);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}
