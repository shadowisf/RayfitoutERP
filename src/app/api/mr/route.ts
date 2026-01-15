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
        [body.department_id]
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
        headerValues
      );
      const mrHeaderId = headerResult.insertId;

      return NextResponse.json({
        success: true,
        mrHeaderId: mrHeaderId,
      });
    }

    if (body.action === "createMrLine") {
      try {
        // Insert the main mr_line - WITHOUT material_subcategory_id column
        const lineQuery = `
      INSERT INTO mr_lines 
      (boq_line_id, mr_header_id, material_category_id, material_description, quantity, unit, notes, specification, brand, delivery_location, attachment)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

        const lineValues = [
          body.boq_line_id && !isNaN(Number(body.boq_line_id))
            ? Number(body.boq_line_id)
            : null,
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
          lineValues
        );
        const mrLineId = lineResult.insertId;

        // Insert subcategories into junction table
        const subcategoryIds = Array.isArray(body.material_subcategory_ids)
          ? body.material_subcategory_ids
          : [body.material_subcategory_ids];

        // Filter out any invalid IDs
        const validSubcategoryIds = subcategoryIds.filter(
          (id: any) => id && !isNaN(Number(id))
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

        return NextResponse.json({
          success: true,
          mrLineId: mrLineId,
        });
      } catch (error: any) {
        console.error("Create MR Line Error:", error);
        return NextResponse.json(
          { error: error.message || "Failed to create MR line" },
          { status: 500 }
        );
      }
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
      await db.query(`UPDATE mr_headers SET progress_id = 1 WHERE id = ?`, [
        body.id,
      ]);

      return NextResponse.json({ status: 200 });
    }

    if (body.action == "submitForLPO") {
      await db.query(`UPDATE mr_headers SET progress_id = 12 WHERE id = ?`, [
        body.id,
      ]);

      await db.query(
        `INSERT INTO mr_header_progress_log (mr_header_id, progress_id, changed_by) VALUES (?, 12, ?)`,
        [body.id, body.changed_by]
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "submitForPricingResubmission") {
      await db.query(`UPDATE mr_headers SET progress_id = 11 WHERE id = ?`, [
        body.id,
      ]);

      await db.query(
        `INSERT INTO mr_header_progress_log (mr_header_id, progress_id, changed_by) VALUES (?, 11, ?)`,
        [body.id, body.changed_by]
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "submitForQC") {
      await db.query(`UPDATE mr_headers SET progress_id = 21 WHERE id = ?`, [
        body.id,
      ]);

      await db.query(
        `INSERT INTO mr_header_progress_log (mr_header_id, progress_id, changed_by) VALUES (?, 21, ?)`,
        [body.id, body.changed_by]
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "submitForStockEntry") {
      await db.query(`UPDATE mr_headers SET progress_id = 24 WHERE id = ?`, [
        body.id,
      ]);

      await db.query(
        `INSERT INTO mr_header_progress_log (mr_header_id, progress_id, changed_by) VALUES (?, 24, ?)`,
        [body.id, body.changed_by]
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "submitForInitialApproval") {
      await db.query(`UPDATE mr_headers SET progress_id = 3 WHERE id = ?`, [
        body.id,
      ]);

      await db.query(
        `INSERT INTO mr_header_progress_log (mr_header_id, progress_id, changed_by) VALUES (?, 3, ?)`,
        [body.id, body.changed_by]
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "approveItem") {
      await db.query(
        `UPDATE mr_lines SET approval_status = 'Approved' WHERE id = ?`,
        [body.id]
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "rejectItem") {
      await db.query(
        `UPDATE mr_lines SET approval_status = 'Rejected', reject_comment = ? WHERE id = ?`,
        [body.comment, body.id]
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "resetItem") {
      await db.query(
        `UPDATE mr_lines SET approval_status = null, reject_comment = null WHERE id = ?`,
        [body.id]
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "submitForResubmission") {
      await db.query(`UPDATE mr_headers SET progress_id = 5 WHERE id = ?`, [
        body.id,
      ]);

      await db.query(
        `INSERT INTO mr_header_progress_log (mr_header_id, progress_id, changed_by) VALUES (?, 5, ?)`,
        [body.id, body.changed_by]
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "submitForQuotations") {
      await db.query(`UPDATE mr_headers SET progress_id = 7 WHERE id = ?`, [
        body.id,
      ]);

      await db.query(
        `INSERT INTO mr_header_progress_log (mr_header_id, progress_id, changed_by) VALUES (?, 7, ?)`,
        [body.id, body.changed_by]
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "submitForPricingApproval") {
      await db.query(`UPDATE mr_headers SET progress_id = 10 WHERE id = ?`, [
        body.id,
      ]);

      await db.query(
        `INSERT INTO mr_header_progress_log (mr_header_id, progress_id, changed_by) VALUES (?, 10, ?)`,
        [body.id, body.changed_by]
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "submitForPayment") {
      await db.query(`UPDATE mr_headers SET progress_id = 14 WHERE id = ?`, [
        body.id,
      ]);

      await db.query(
        `INSERT INTO mr_header_progress_log (mr_header_id, progress_id, changed_by) VALUES (?, 14, ?)`,
        [body.id, body.changed_by]
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "submitForDelivery") {
      await db.query(`UPDATE mr_headers SET progress_id = 17 WHERE id = ?`, [
        body.id,
      ]);

      await db.query(
        `INSERT INTO mr_header_progress_log (mr_header_id, progress_id, changed_by) VALUES (?, 17, ?)`,
        [body.id, body.changed_by]
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "submitForLPOResubmission") {
      await db.query(`UPDATE mr_headers SET progress_id = 13 WHERE id = ?`, [
        body.id,
      ]);

      await db.query(
        `INSERT INTO mr_header_progress_log (mr_header_id, progress_id, changed_by) VALUES (?, 13, ?)`,
        [body.id, body.changed_by]
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "submitForLPOResubmissionGRNFail") {
      await db.query(`UPDATE mr_headers SET progress_id = 16 WHERE id = ?`, [
        body.id,
      ]);

      await db.query(
        `INSERT INTO mr_header_progress_log (mr_header_id, progress_id, changed_by) VALUES (?, 16, ?)`,
        [body.id, body.changed_by]
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "submitForProcurementResolution") {
      await db.query(`UPDATE mr_headers SET progress_id = 23 WHERE id = ?`, [
        body.id,
      ]);

      await db.query(
        `INSERT INTO mr_header_progress_log (mr_header_id, progress_id, changed_by) VALUES (?, 23, ?)`,
        [body.id, body.changed_by]
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "submitForCompletion") {
      await db.query(`UPDATE mr_headers SET progress_id = 25 WHERE id = ?`, [
        body.id,
      ]);

      await db.query(
        `INSERT INTO mr_header_progress_log (mr_header_id, progress_id, changed_by) VALUES (?, 25, ?)`,
        [body.id, body.changed_by]
      );
    }

    if (body.action === "updateMrHeader") {
      await db.query(
        `UPDATE mr_headers 
     SET project_id = ?, 
         required_date = ?, 
         purpose_id = ? 
     WHERE id = ?`,
        [body.project_id || null, body.required_date, body.purpose_id, body.id]
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "updateAll") {
      try {
        // Update the main mr_line
        const query = `
      UPDATE mr_lines 
      SET boq_line_id = ?, 
          material_category_id = ?, 
          material_description = ?, 
          quantity = ?, 
          unit = ?, 
          notes = ?,
          specification = ?,
          brand = ?,
          delivery_location = ?,
          approval_status = NULL,
          reject_comment = NULL
      WHERE id = ?
    `;

        const values = [
          Number(body.boq_line_id) || null,
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

        // Delete existing subcategory associations
        await db.query(
          `DELETE FROM jt_mr_line_material_subcategory WHERE mr_line_id = ?`,
          [Number(body.id)]
        );

        // Insert new subcategory associations
        const subcategoryIds = Array.isArray(body.material_subcategory_id)
          ? body.material_subcategory_id
          : [body.material_subcategory_id];

        if (subcategoryIds.length > 0) {
          const junctionQuery = `
        INSERT INTO jt_mr_line_material_subcategory (mr_line_id, material_subcategory_id)
        VALUES ?
      `;

          const junctionValues = subcategoryIds.map((subcatId: number) => [
            Number(body.id),
            Number(subcatId),
          ]);

          await db.query(junctionQuery, [junctionValues]);
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
      const query = "DELETE FROM mr_lines WHERE id = ?";
      await db.query(query, [Number(body.id)]);
      return NextResponse.json({ success: true });
    }

    if (body.action === "deleteSubCategory") {
      const query = `
    DELETE FROM mr_lines 
    WHERE id IN (?)
  `;

      const values = [body.item_ids];

      await db.query(query, values);

      return NextResponse.json({ success: true });
    }

    if (body.action === "deleteMrHeader") {
      const query = "DELETE FROM mr_headers WHERE id = ?";

      await db.query(query, [Number(body.id)]);

      return NextResponse.json({ success: true });
    }
  } catch (err: any) {
    console.error(err.sqlMessage);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}
