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
      }

      return NextResponse.json(rows, { status: 200 });
    }

    if (body.action === "getJobScopes") {
      const [rows]: any = await db.query(
        `SELECT * FROM lut_job_scopes ORDER BY value ASC`,
      );
      return NextResponse.json(rows, { status: 200 });
    }

    if (body.action === "createJoLine") {
      const lineQuery = `
        INSERT INTO jo_lines
        (mr_header_id, job_scope_id, job_description, quantity, unit, budget_estimate, start_date, end_date, attachment)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const lineValues = [
        Number(body.mr_header_id),
        Number(body.job_scope_id) || null,
        body.job_description || "",
        body.quantity && !isNaN(Number(body.quantity))
          ? Number(body.quantity)
          : 0,
        body.unit || "",
        Number(body.budget_estimate) || 0,
        body.start_date || null,
        body.end_date || null,
        body.attachment || null,
      ];

      const [lineResult] = await db.query<ResultSetHeader>(
        lineQuery,
        lineValues,
      );
      const joLineId = lineResult.insertId;

      // Insert BOQ line associations
      if (body.boq_line_ids && body.boq_line_ids.length > 0) {
        const boqValues = body.boq_line_ids
          .filter((id: any) => id && !isNaN(Number(id)))
          .map((boqLineId: number) => [joLineId, Number(boqLineId)]);

        if (boqValues.length > 0) {
          await db.query(
            `INSERT INTO jt_jo_lines_boq_lines (jo_line_id, boq_line_id) VALUES ?`,
            [boqValues],
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
        SET job_scope_id = ?,
            job_description = ?,
            quantity = ?,
            unit = ?,
            budget_estimate = ?,
            start_date = ?,
            end_date = ?,
            attachment = ?,
            approval_status = null,
            reject_comment = null
        WHERE id = ?
      `;

      await db.query(query, [
        Number(body.job_scope_id) || null,
        body.job_description || "",
        Number(body.quantity) || 0,
        body.unit || "",
        Number(body.budget_estimate) || 0,
        body.start_date || null,
        body.end_date || null,
        body.attachment || null,
        Number(body.id),
      ]);

      // Update BOQ line associations
      await db.query(`DELETE FROM jt_jo_lines_boq_lines WHERE jo_line_id = ?`, [
        Number(body.id),
      ]);

      if (body.boq_line_ids && body.boq_line_ids.length > 0) {
        const boqValues = body.boq_line_ids
          .filter((id: any) => id && !isNaN(Number(id)))
          .map((boqLineId: number) => [Number(body.id), Number(boqLineId)]);

        if (boqValues.length > 0) {
          await db.query(
            `INSERT INTO jt_jo_lines_boq_lines (jo_line_id, boq_line_id) VALUES ?`,
            [boqValues],
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
