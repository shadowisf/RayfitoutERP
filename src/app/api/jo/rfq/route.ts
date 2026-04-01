import { NextResponse } from "next/server";
import { ResultSetHeader } from "mysql2";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.action === "createRfq") {
      const query = `
        INSERT INTO jo_rfqs
        (mr_header_id, jo_line_ids, submission_deadline, terms_and_conditions, submission_instructions)
        VALUES (?, ?, ?, ?, ?)
      `;

      const [result] = await db.query<ResultSetHeader>(query, [
        Number(body.mr_header_id),
        JSON.stringify(body.jo_line_ids),
        body.submission_deadline || null,
        body.terms_and_conditions || "",
        body.submission_instructions || "",
      ]);

      return NextResponse.json({ success: true, id: result.insertId });
    }

    if (body.action === "getRfqByMrHeaderID") {
      const [rows]: any = await db.query(
        `SELECT * FROM jo_rfqs WHERE mr_header_id = ? ORDER BY id DESC LIMIT 1`,
        [Number(body.mr_header_id)],
      );

      if (rows.length === 0) {
        return NextResponse.json(null, { status: 200 });
      }

      const rfq = rows[0];
      // Parse jo_line_ids from JSON
      if (typeof rfq.jo_line_ids === "string") {
        try {
          rfq.jo_line_ids = JSON.parse(rfq.jo_line_ids);
        } catch {
          rfq.jo_line_ids = [];
        }
      }

      return NextResponse.json(rfq, { status: 200 });
    }

    if (body.action === "updateRfq") {
      await db.query(
        `UPDATE jo_rfqs SET jo_line_ids = ?, submission_deadline = ?, terms_and_conditions = ?, submission_instructions = ? WHERE id = ?`,
        [
          JSON.stringify(body.jo_line_ids),
          body.submission_deadline || null,
          body.terms_and_conditions || "",
          body.submission_instructions || "",
          Number(body.id),
        ],
      );

      return NextResponse.json({ success: true });
    }

    if (body.action === "deleteRfq") {
      await db.query(`DELETE FROM jo_rfqs WHERE id = ?`, [Number(body.id)]);
      return NextResponse.json({ success: true });
    }

    // Get RFQ with full JO line details + BOQ items for PDF generation
    if (body.action === "getRfqWithDetails") {
      const [rfqRows]: any = await db.query(
        `SELECT * FROM jo_rfqs WHERE id = ?`,
        [Number(body.id)],
      );

      if (rfqRows.length === 0) {
        return NextResponse.json({ error: "RFQ not found" }, { status: 404 });
      }

      const rfq = rfqRows[0];
      let joLineIds: number[] = [];
      if (typeof rfq.jo_line_ids === "string") {
        try {
          joLineIds = JSON.parse(rfq.jo_line_ids);
        } catch {
          joLineIds = [];
        }
      } else if (Array.isArray(rfq.jo_line_ids)) {
        joLineIds = rfq.jo_line_ids;
      }

      if (joLineIds.length === 0) {
        return NextResponse.json({ ...rfq, jo_lines: [] });
      }

      // Fetch JO lines from view
      const placeholders = joLineIds.map(() => "?").join(",");
      const [joLines]: any = await db.query(
        `SELECT * FROM vw_jo_lines WHERE id IN (${placeholders})`,
        joLineIds,
      );

      // Fetch BOQ items with subcontracted qty for each JO line
      const [boqJunctions]: any = await db.query(
        `SELECT jb.jo_line_id, jb.boq_line_id, jb.subcontracted_qty,
                bl.item_name, bl.item_description, bl.category, bl.sub_category,
                bl.quantity, bl.unit, bl.rate_per_quantity, bl.total_cost,
                bl.location, bl.scope_of_work
         FROM jt_jo_lines_boq_lines jb
         JOIN vw_boq_lines bl ON jb.boq_line_id = bl.id
         WHERE jb.jo_line_id IN (${placeholders})`,
        joLineIds,
      );

      // Build BOQ numbering for the project
      const [mrHeader]: any = await db.query(
        `SELECT project_id FROM mr_headers WHERE id = ?`,
        [Number(rfq.mr_header_id)],
      );

      let boqNumbering = new Map<number, string>();
      if (mrHeader.length > 0 && mrHeader[0].project_id) {
        const [boqRows]: any = await db.query(
          `SELECT bl.id, bl.category, bl.sub_category
           FROM boq_lines bl
           JOIN boq_headers bh ON bl.boq_id = bh.id
           WHERE bh.project_id = ?
           ORDER BY bl.id ASC`,
          [mrHeader[0].project_id],
        );

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
      }

      // Group BOQ items by JO line
      const boqByJoLine: Record<number, any[]> = {};
      boqJunctions.forEach((row: any) => {
        if (!boqByJoLine[row.jo_line_id]) {
          boqByJoLine[row.jo_line_id] = [];
        }
        boqByJoLine[row.jo_line_id].push({
          ...row,
          item_number: boqNumbering.get(row.boq_line_id) || "",
        });
      });

      // Attach BOQ items to JO lines
      joLines.forEach((line: any) => {
        line.boq_items = boqByJoLine[line.id] || [];
      });

      return NextResponse.json({
        ...rfq,
        jo_line_ids: joLineIds,
        jo_lines: joLines,
        project_name: mrHeader[0]?.project_name || "",
        purpose_name: "",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("RFQ API Error:", err.sqlMessage || err.message);
    return NextResponse.json(
      { error: err.sqlMessage || err.message },
      { status: 500 },
    );
  }
}
