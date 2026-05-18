import { NextResponse } from "next/server";
import { ResultSetHeader } from "mysql2";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const [rows]: any = await db.query(
      `SELECT * FROM vw_jo_lines ORDER BY id ASC`,
    );
    return NextResponse.json(rows, { status: 200 });
  } catch (err: any) {
    console.error("SQL Error:", err.sqlMessage);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.action === "getJoLinesByMrHeaderID") {
      const [rows]: any = await db.query(
        `SELECT * FROM vw_jo_lines WHERE mr_header_id = ? ORDER BY id ASC`,
        [Number(body.mr_header_id)],
      );

      // Compute BOQ item numbers (same logic as getMrLinesByMrHeaderID)
      if (rows.length > 0) {
        const [mrHeader]: any = await db.query(
          `SELECT project_id FROM mr_headers WHERE id = ?`,
          [Number(body.mr_header_id)],
        );

        if (mrHeader.length > 0 && mrHeader[0].project_id) {
          const projectId = mrHeader[0].project_id;

          const [boqRows]: any = await db.query(
            `SELECT bl.*, bh.project_id
             FROM boq_lines bl
             JOIN boq_headers bh ON bl.boq_id = bh.id
             WHERE bh.project_id = ?`,
            [projectId],
          );

          // Build numbering map: boq_line_id → "1.2.3"
          const boqNumbering = new Map<number, string>();
          const categoryMap = new Map<string, number>();
          const subCategoryMap = new Map<string, number>();
          const itemCountMap = new Map<string, number>();

          boqRows.forEach((row: any) => {
            const category = row.category;
            const subCategory = row.sub_category;

            if (!categoryMap.has(category)) {
              categoryMap.set(category, categoryMap.size + 1);
            }
            const categoryNumber = categoryMap.get(category)!;

            const subCategoryKey = `${category}-${subCategory}`;
            if (!subCategoryMap.has(subCategoryKey)) {
              const subCategoriesInCategory = Array.from(
                subCategoryMap.keys(),
              ).filter((key: string) => key.startsWith(`${category}-`)).length;
              subCategoryMap.set(subCategoryKey, subCategoriesInCategory + 1);
            }
            const subCategoryNumber = subCategoryMap.get(subCategoryKey)!;

            const itemKey = `${category}-${subCategory}`;
            const currentCount = itemCountMap.get(itemKey) || 0;
            itemCountMap.set(itemKey, currentCount + 1);
            const itemNumber = currentCount + 1;

            boqNumbering.set(
              row.id,
              `${categoryNumber}.${subCategoryNumber}.${itemNumber}`,
            );
          });

          // Attach boq_item_numbers to each JO line
          rows.forEach((row: any) => {
            if (row.boq_line_ids) {
              const ids = String(row.boq_line_ids)
                .split(",")
                .map((id: string) => parseInt(id.trim()))
                .filter((id: number) => !isNaN(id));

              row.boq_item_numbers = ids
                .map((id: number) => boqNumbering.get(id) || "")
                .filter(Boolean)
                .join(", ");
            } else {
              row.boq_item_numbers = "";
            }
          });
        }

        // Fetch attachments for all JO lines
        const joLineIds = rows.map((r: any) => r.id);
        if (joLineIds.length > 0) {
          const [attachmentRows]: any = await db.query(
            `SELECT * FROM jo_line_attachments WHERE jo_line_id IN (${joLineIds.map(() => "?").join(",")}) ORDER BY id ASC`,
            joLineIds,
          );
          // Group attachments by jo_line_id
          const attachmentMap: Record<number, any[]> = {};
          attachmentRows.forEach((att: any) => {
            if (!attachmentMap[att.jo_line_id]) {
              attachmentMap[att.jo_line_id] = [];
            }
            attachmentMap[att.jo_line_id].push(att);
          });
          rows.forEach((row: any) => {
            row.jo_attachments = attachmentMap[row.id] || [];
          });
        }
      }

      return NextResponse.json(rows, { status: 200 });
    }

    if (body.action === "getJobScopes") {
      const [rows]: any = await db.query(
        `SELECT * FROM lut_job_scopes ORDER BY value ASC`,
      );
      return NextResponse.json(rows, { status: 200 });
    }

    if (body.action === "getBoqItemsByJoLineID") {
      const [rows]: any = await db.query(
        `SELECT * FROM jt_jo_lines_boq_lines WHERE jo_line_id = ?`,
        [Number(body.jo_line_id)],
      );
      return NextResponse.json(rows, { status: 200 });
    }

    if (body.action === "getBoqLinesWithDetailsByJoLineID") {
      const [rows]: any = await db.query(
        `SELECT
           bl.id              AS boq_line_id,
           bl.item_name,
           bl.item_description,
           bl.category,
           bl.sub_category,
           bl.quantity        AS boq_qty,
           bl.unit,
           bl.rate_per_quantity,
           bl.total_cost,
           bl.category_order,
           bl.subcategory_order,
           bl.item_order,
           jt.subcontracted_qty,
           s2.id              AS approved_subcontractor_id,
           s2.name            AS approved_subcontractor_name,
           sq.total_price     AS approved_total_price
         FROM jt_jo_lines_boq_lines jt
         JOIN boq_lines bl ON jt.boq_line_id = bl.id
         LEFT JOIN jo_line_subcontractor_quotation sq
           ON sq.jo_line_id = jt.jo_line_id
           AND sq.boq_line_id = bl.id
           AND sq.approval_status = 'Approved'
         LEFT JOIN subcontractors s2 ON sq.subcontractor_id = s2.id
         WHERE jt.jo_line_id = ?
         ORDER BY bl.category_order ASC, bl.subcategory_order ASC, bl.item_order ASC`,
        [Number(body.jo_line_id)],
      );
      return NextResponse.json(rows, { status: 200 });
    }

    if (body.action === "getAttachmentsByJoLineID") {
      const [rows]: any = await db.query(
        `SELECT * FROM jo_line_attachments WHERE jo_line_id = ? ORDER BY id ASC`,
        [Number(body.jo_line_id)],
      );
      return NextResponse.json(rows, { status: 200 });
    }

    if (body.action === "createJoLine") {
      const lineQuery = `
        INSERT INTO jo_lines
        (mr_header_id, job_scope, contract_type, job_description, quantity, unit, budget_estimate, subcontracted_works_value, start_date, end_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const lineValues = [
        Number(body.mr_header_id),
        body.job_scope || "",
        body.contract_type || "",
        body.job_description || "",
        0, // quantity - now tracked per BOQ item
        "", // unit - now tracked per BOQ item
        Number(body.subcontractor_budget) || 0,
        Number(body.subcontracted_works_value) || 0,
        body.start_date || null,
        body.end_date || null,
      ];

      const [lineResult] = await db.query<ResultSetHeader>(
        lineQuery,
        lineValues,
      );
      const joLineId = lineResult.insertId;

      // Insert BOQ line associations with subcontracted qty
      if (body.boq_items && body.boq_items.length > 0) {
        const boqValues = body.boq_items
          .filter((item: any) => item.boq_line_id && !isNaN(Number(item.boq_line_id)))
          .map((item: any) => [
            joLineId,
            Number(item.boq_line_id),
            Number(item.subcontracted_qty) || 0,
          ]);

        if (boqValues.length > 0) {
          const placeholders = boqValues.map(() => "(?, ?, ?)").join(", ");
          const flatValues = boqValues.flat();

          await db.query(
            `INSERT INTO jt_jo_lines_boq_lines (jo_line_id, boq_line_id, subcontracted_qty) VALUES ${placeholders}`,
            flatValues,
          );
        }
      }

      // Insert attachments
      if (body.attachments && body.attachments.length > 0) {
        for (const att of body.attachments) {
          await db.query(
            `INSERT INTO jo_line_attachments (jo_line_id, attachment_type, file_url, file_name) VALUES (?, ?, ?, ?)`,
            [joLineId, att.type, att.url, att.file_name || ""],
          );
        }
      }

      return NextResponse.json({ success: true, joLineId });
    }
  } catch (err: any) {
    console.error(err.sqlMessage);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();

    // Approval actions (same pattern as mr_lines)
    if (body.action === "approveItem") {
      await db.query(
        `UPDATE jo_lines SET approval_status = 'Approved' WHERE id = ?`,
        [body.id],
      );
      return NextResponse.json({ success: true });
    }

    if (body.action === "rejectItem") {
      await db.query(
        `UPDATE jo_lines SET approval_status = 'Rejected', reject_comment = ? WHERE id = ?`,
        [body.comment, body.id],
      );
      return NextResponse.json({ success: true });
    }

    if (body.action === "resetItem") {
      await db.query(
        `UPDATE jo_lines SET approval_status = null, reject_comment = null WHERE id = ?`,
        [body.id],
      );
      return NextResponse.json({ success: true });
    }

    if (body.action === "updateJoLine") {
      const query = `
        UPDATE jo_lines
        SET job_scope = ?,
            contract_type = ?,
            job_description = ?,
            budget_estimate = ?,
            subcontracted_works_value = ?,
            start_date = ?,
            end_date = ?,
            approval_status = null,
            reject_comment = null
        WHERE id = ?
      `;

      await db.query(query, [
        body.job_scope || "",
        body.contract_type || "",
        body.job_description || "",
        Number(body.subcontractor_budget) || 0,
        Number(body.subcontracted_works_value) || 0,
        body.start_date || null,
        body.end_date || null,
        Number(body.id),
      ]);

      // Update BOQ line associations with subcontracted qty
      await db.query(`DELETE FROM jt_jo_lines_boq_lines WHERE jo_line_id = ?`, [
        Number(body.id),
      ]);

      if (body.boq_items && body.boq_items.length > 0) {
        const boqValues = body.boq_items
          .filter((item: any) => item.boq_line_id && !isNaN(Number(item.boq_line_id)))
          .map((item: any) => [
            Number(body.id),
            Number(item.boq_line_id),
            Number(item.subcontracted_qty) || 0,
          ]);

        if (boqValues.length > 0) {
          const placeholders = boqValues.map(() => "(?, ?, ?)").join(", ");
          const flatValues = boqValues.flat();

          await db.query(
            `INSERT INTO jt_jo_lines_boq_lines (jo_line_id, boq_line_id, subcontracted_qty) VALUES ${placeholders}`,
            flatValues,
          );
        }
      }

      // Update attachments: delete all existing, re-insert
      await db.query(`DELETE FROM jo_line_attachments WHERE jo_line_id = ?`, [
        Number(body.id),
      ]);

      if (body.attachments && body.attachments.length > 0) {
        for (const att of body.attachments) {
          await db.query(
            `INSERT INTO jo_line_attachments (jo_line_id, attachment_type, file_url, file_name) VALUES (?, ?, ?, ?)`,
            [Number(body.id), att.type, att.url, att.file_name || ""],
          );
        }
      }

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
      await db.query("DELETE FROM jo_lines WHERE id = ?", [Number(body.id)]);
      return NextResponse.json({ success: true });
    }
  } catch (err: any) {
    console.error(err.sqlMessage);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}
