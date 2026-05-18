import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { ResultSetHeader } from "mysql2";

export async function GET() {
  try {
    const [rows]: any = await db.query(`
      SELECT s.*,
        GROUP_CONCAT(DISTINCT mc.value) as material_categories,
        GROUP_CONCAT(DISTINCT mc.id) as material_category_ids,
        jo_agg.project_names,
        jo_agg.total_cost,
        jo_agg.latest_required_date
      FROM subcontractors s
      LEFT JOIN jt_subcontractor_material_category jsmc ON s.id = jsmc.subcontractor_id
      LEFT JOIN lut_material_categories mc ON jsmc.material_category_id = mc.id
      LEFT JOIN (
        SELECT
          sq.subcontractor_id,
          GROUP_CONCAT(DISTINCT p.name ORDER BY p.name SEPARATOR ' | ') AS project_names,
          SUM(sq.total_price) AS total_cost,
          MAX(mh.required_date) AS latest_required_date
        FROM jo_line_subcontractor_quotation sq
        JOIN jo_lines jl ON sq.jo_line_id = jl.id
        JOIN mr_headers mh ON jl.mr_header_id = mh.id
        LEFT JOIN projects p ON mh.project_id = p.id
        WHERE sq.approval_status = 'Approved'
        GROUP BY sq.subcontractor_id
      ) jo_agg ON s.id = jo_agg.subcontractor_id
      GROUP BY s.id
      ORDER BY s.name ASC
    `);

    return NextResponse.json(rows, { status: 200 });
  } catch (err: any) {
    console.error("SQL Error:", err.sqlMessage);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.action === "createSubcontractor") {
      const query = `
        INSERT INTO subcontractors
        (name, scope_of_work, trn_number, trn_certificate, contract, trade_license, other_docs, contact_person_name, phone, email, address, website, bank_name, account_number, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        body.name,
        body.scope_of_work,
        body.trn_number,
        body.trn_certificate,
        body.contract,
        body.trade_license,
        body.other_docs || null,
        body.contact_person_name,
        body.phone || null,
        body.email || null,
        body.address || null,
        body.website,
        body.bank_name,
        body.account_number,
        body.notes || null,
      ];

      const [result] = await db.query<ResultSetHeader>(query, values);
      const subcontractorId = result.insertId;

      if (body.material_categories && body.material_categories.length > 0) {
        const categoryValues = body.material_categories.map(
          (categoryId: number) => [subcontractorId, categoryId],
        );

        await db.query(
          `INSERT INTO jt_subcontractor_material_category (subcontractor_id, material_category_id) VALUES ?`,
          [categoryValues],
        );
      }

      return NextResponse.json({ success: true, id: subcontractorId });
    }

    if (body.action === "addSubcontractorAndQuotation") {
      const { jo_line_id, boq_line_id, quotations } = body;

      const insertQuery = `
        INSERT INTO jo_line_subcontractor_quotation
        (subcontractor_id, jo_line_id, boq_line_id, quotation_file, rating, total_price, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      const insertedIds = [];

      for (const quotation of quotations) {
        const [result]: any = await db.query(insertQuery, [
          quotation.subcontractor_id,
          jo_line_id,
          boq_line_id,
          JSON.stringify([quotation.quotation_file]),
          quotation.rating || null,
          quotation.total_price,
          quotation.created_by,
        ]);

        insertedIds.push(result.insertId);
      }

      return NextResponse.json(
        { message: "Quotations added successfully", ids: insertedIds },
        { status: 200 },
      );
    }
  } catch (err: any) {
    console.error(err.sqlMessage);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();

    if (body.action === "updateSubcontractor") {
      const query = `
        UPDATE subcontractors
        SET
          name = ?,
          trn_number = ?,
          trn_certificate = ?,
          contract = ?,
          trade_license = ?,
          other_docs = ?,
          contact_person_name = ?,
          phone = ?,
          email = ?,
          address = ?,
          website = ?,
          bank_name = ?,
          account_number = ?,
          notes = ?
        WHERE id = ?
      `;

      await db.query(query, [
        body.name,
        body.trn_number,
        body.trn_certificate,
        body.contract,
        body.trade_license,
        body.other_docs || null,
        body.contact_person_name,
        body.phone || null,
        body.email || null,
        body.address || null,
        body.website,
        body.bank_name,
        body.account_number,
        body.notes || null,
        body.id,
      ]);

      // Update material categories
      await db.query(
        `DELETE FROM jt_subcontractor_material_category WHERE subcontractor_id = ?`,
        [body.id],
      );

      if (body.material_categories && body.material_categories.length > 0) {
        const categoryValues = body.material_categories.map(
          (categoryId: number) => [body.id, categoryId],
        );

        await db.query(
          `INSERT INTO jt_subcontractor_material_category (subcontractor_id, material_category_id) VALUES ?`,
          [categoryValues],
        );
      }

      return NextResponse.json({ success: true });
    }

    if (body.action === "approveSubcontractorQuotation") {
      // Step 1: Get boq_line_id from the quotation row so we can scope the clear
      const [quotationRows]: any = await db.query(
        `SELECT jo_line_id, boq_line_id FROM jo_line_subcontractor_quotation WHERE id = ?`,
        [body.quotation_id],
      );

      if (!quotationRows || quotationRows.length === 0) {
        return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
      }

      const { jo_line_id, boq_line_id } = quotationRows[0];

      // Step 2: Clear any existing approval for this (jo_line_id, boq_line_id) pair
      await db.query(
        `UPDATE jo_line_subcontractor_quotation
         SET approval_status = NULL
         WHERE jo_line_id = ? AND boq_line_id = ? AND approval_status = 'Approved'`,
        [jo_line_id, boq_line_id],
      );

      // Step 3: Mark the selected quotation as approved
      await db.query(
        `UPDATE jo_line_subcontractor_quotation SET approval_status = 'Approved' WHERE id = ?`,
        [body.quotation_id],
      );

      return NextResponse.json({ success: true });
    }

    if (body.action === "rejectAllSubcontractorQuotations") {
      await db.query(
        `UPDATE jo_line_subcontractor_quotation
         SET approval_status = 'Rejected', reject_comment = ?
         WHERE jo_line_id = ? AND boq_line_id = ?`,
        [body.reject_comment, body.jo_line_id, body.boq_line_id],
      );

      return NextResponse.json({ success: true });
    }

    if (body.action === "resetSubcontractorQuotation") {
      await db.query(
        `UPDATE jo_line_subcontractor_quotation
         SET approval_status = NULL, reject_comment = NULL
         WHERE jo_line_id = ? AND boq_line_id = ? AND subcontractor_id = ? AND approval_status = 'Approved'`,
        [body.jo_line_id, body.boq_line_id, body.subcontractor_id],
      );

      return NextResponse.json({ success: true });
    }

    if (body.action === "resetAllSubcontractorQuotations") {
      await db.query(
        `UPDATE jo_line_subcontractor_quotation
         SET approval_status = NULL, reject_comment = NULL
         WHERE jo_line_id = ? AND boq_line_id = ?`,
        [body.jo_line_id, body.boq_line_id],
      );

      return NextResponse.json({ success: true });
    }

    if (body.action === "updateSubcontractorQuotations") {
      const { jo_line_id, boq_line_id, quotations } = body;

      // Get existing quotation IDs
      const [existingRows]: any = await db.query(
        "SELECT id FROM jo_line_subcontractor_quotation WHERE jo_line_id = ? AND boq_line_id = ?",
        [jo_line_id, boq_line_id],
      );

      const existingIds = existingRows.map((row: any) => row.id);
      const updatedIds: number[] = [];

      for (const quotation of quotations) {
        if (quotation.id && existingIds.includes(quotation.id)) {
          await db.query(
            `UPDATE jo_line_subcontractor_quotation
             SET subcontractor_id = ?,
                 boq_line_id = ?,
                 quotation_file = ?,
                 rating = ?,
                 total_price = ?,
                 approval_status = NULL,
                 reject_comment = NULL,
                 created_by = ?
             WHERE id = ?`,
            [
              quotation.subcontractor_id,
              boq_line_id,
              JSON.stringify([quotation.quotation_file]),
              quotation.rating,
              quotation.total_price,
              quotation.created_by,
              quotation.id,
            ],
          );
          updatedIds.push(quotation.id);
        } else {
          const [result] = await db.query<ResultSetHeader>(
            `INSERT INTO jo_line_subcontractor_quotation
             (subcontractor_id, jo_line_id, boq_line_id, quotation_file, rating, total_price, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              quotation.subcontractor_id,
              jo_line_id,
              boq_line_id,
              JSON.stringify([quotation.quotation_file]),
              quotation.rating,
              quotation.total_price,
              quotation.created_by,
            ],
          );
          updatedIds.push(result.insertId);
        }
      }

      // Delete removed quotations
      const idsToDelete = existingIds.filter(
        (id: number) => !updatedIds.includes(id),
      );

      if (idsToDelete.length > 0) {
        await db.query(
          "DELETE FROM jo_line_subcontractor_quotation WHERE id IN (?)",
          [idsToDelete],
        );
      }

      return NextResponse.json({
        updated: updatedIds.length,
        deleted: idsToDelete.length,
      });
    }
  } catch (err: any) {
    console.error(err.sqlMessage);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();

    if (body.action === "deleteSubcontractor") {
      await db.query("DELETE FROM subcontractors WHERE id = ?", [
        Number(body.id),
      ]);
      return NextResponse.json({ success: true });
    }
  } catch (err: any) {
    console.error(err.sqlMessage);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}
