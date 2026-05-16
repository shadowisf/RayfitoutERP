import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ResultSetHeader } from "mysql2";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.action === "createBoqHeader") {
      const query = `
      INSERT INTO boq_headers 
      (project_id, name, company_name, client_name, location, date, discount, payment_terms, validity_terms, warranty, completion, exclusion, terms_and_conditions, is_draft)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

      const values = [
        Number(body.project_id),
        body.name,
        body.company_name,
        body.client_name,
        body.location,
        body.date || null,
        body.discount || 0,
        body.payment_terms,
        body.validity_terms,
        body.warranty,
        body.completion,
        body.exclusion,
        body.terms_and_conditions,
        body.is_draft,
      ];

      const [result] = await db.query<ResultSetHeader>(query, values);

      await db.query(
        `INSERT INTO notification (boq_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
        [
          result.insertId,
          8,
          "BOQ Created",
          `A new BOQ ${body.name} was created for ${body.project_name}`,
        ],
      );

      await db.query(
        `INSERT INTO notification (boq_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
        [
          result.insertId,
          16,
          "BOQ Created",
          `A new BOQ ${body.name} was created for ${body.project_name}`,
        ],
      );

      return NextResponse.json({ success: true, id: result.insertId });
    }

    // In your POST route (document index 4)
    if (body.action === "createBoqLine") {
      try {
        // FIXED: Get the maximum order for the ENTIRE boq_id, not just the category
        const [maxCategoryOrder]: any = await db.query(
          `SELECT COALESCE(MAX(category_order), -1) as max_order 
       FROM boq_lines 
       WHERE boq_id = ?`, // ← Changed: removed category filter
          [Number(body.boq_id)],
        );

        const [maxSubcategoryOrder]: any = await db.query(
          `SELECT COALESCE(MAX(subcategory_order), -1) as max_order 
       FROM boq_lines 
       WHERE boq_id = ? AND category = ?`, // ← Changed: only filter by category
          [Number(body.boq_id), body.category.toUpperCase()],
        );

        const [maxItemOrder]: any = await db.query(
          `SELECT COALESCE(MAX(item_order), -1) as max_order 
       FROM boq_lines 
       WHERE boq_id = ? AND category = ? AND sub_category = ?`,
          [
            Number(body.boq_id),
            body.category.toUpperCase(),
            body.sub_category.toUpperCase(),
          ],
        );

        const nextCategoryOrder = maxCategoryOrder[0].max_order + 1;
        const nextSubcategoryOrder = maxSubcategoryOrder[0].max_order + 1;
        const nextItemOrder = maxItemOrder[0].max_order + 1;

        // Rest of the code remains the same...
        const query = `
      INSERT INTO boq_lines 
      (boq_id, item_name, category, sub_category, scope_of_work, quantity, unit, rate_per_quantity, total_cost, item_description, attachments, category_order, subcategory_order, item_order, dn_number_and_date, remarks)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

        const values = [
          Number(body.boq_id),
          body.item_name,
          body.category.toUpperCase(),
          body.sub_category.toUpperCase(),
          body.scope_of_work || null,
          Number(body.quantity),
          body.unit,
          Number(body.rate_per_quantity) || 0,
          Number(body.total_cost) || 0,
          body.item_description || null,
          body.attachments && body.attachments.length > 0
            ? JSON.stringify(body.attachments)
            : null,
          nextCategoryOrder,
          nextSubcategoryOrder,
          nextItemOrder,
          body.dn_number_and_date,
          body.remarks,
        ];

        const [result] = await db.query<ResultSetHeader>(query, values);
        const boqLineId = result.insertId;

        if (
          body.location_ids &&
          Array.isArray(body.location_ids) &&
          body.location_ids.length > 0
        ) {
          const locationValues = body.location_ids.map((locationId: number) => [
            boqLineId,
            Number(locationId),
          ]);

          await db.query(
            `INSERT INTO jt_boq_line_location (boq_line_id, location_id) VALUES ?`,
            [locationValues],
          );
        }

        return NextResponse.json({ success: true, id: boqLineId });
      } catch (error) {
        throw error;
      }
    }

    if (body.action === "duplicateBoqLine") {
      try {
        // Get the original item's details including its order
        const [originalItem]: any = await db.query(
          `SELECT boq_id, category, sub_category, item_order, category_order, subcategory_order 
       FROM boq_lines WHERE id = ?`,
          [Number(body.id)],
        );

        if (!originalItem || originalItem.length === 0) {
          throw new Error("Original BOQ line not found");
        }

        const {
          boq_id,
          category,
          sub_category,
          item_order,
          category_order,
          subcategory_order,
        } = originalItem[0];

        // Increment item_order for all items that come after the original item
        await db.query(
          `UPDATE boq_lines 
       SET item_order = item_order + 1 
       WHERE boq_id = ? AND category = ? AND sub_category = ? AND item_order > ?`,
          [boq_id, category, sub_category, item_order],
        );

        // Duplicate the item with order = original item_order + 1
        const query = `
      INSERT INTO boq_lines 
      (boq_id, item_name, category, sub_category, scope_of_work, quantity, unit, rate_per_quantity, total_cost, item_description, attachments, category_order, subcategory_order, item_order)
      SELECT boq_id, item_name, category, sub_category, scope_of_work, quantity, unit, rate_per_quantity, total_cost, item_description, attachments, ?, ?, ?
      FROM boq_lines
      WHERE id = ?
    `;

        const values = [
          category_order,
          subcategory_order,
          item_order + 1, // Place right after the original item
          Number(body.id),
        ];

        const [result] = await db.query<ResultSetHeader>(query, values);
        const newBoqLineId = result.insertId;

        // Also duplicate location associations if they exist
        await db.query(
          `INSERT INTO jt_boq_line_location (boq_line_id, location_id)
       SELECT ?, location_id
       FROM jt_boq_line_location
       WHERE boq_line_id = ?`,
          [newBoqLineId, Number(body.id)],
        );

        return NextResponse.json({ success: true, id: newBoqLineId });
      } catch (error) {
        throw error;
      }
    }

    if (body.action === "createBoqRevision") {
      const safeAttachments = (val: any): string | null => {
        if (val == null) return null;
        if (typeof val === "string") return val || null;
        try { return JSON.stringify(val) || null; } catch { return null; }
      };

      const origId = Number(body.revision_of);

      // Determine the next revision number for this parent
      const [revCount]: any = await db.query(
        `SELECT COUNT(*) AS count FROM boq_headers WHERE revision_of = ?`,
        [origId],
      );
      const revNumber = Number(revCount[0].count) + 1;

      const [result] = await db.query<ResultSetHeader>(
        `INSERT INTO boq_headers
          (project_id, name, company_name, client_name, location, date, discount,
           payment_terms, validity_terms, warranty, completion, exclusion,
           terms_and_conditions, is_draft, is_primary, revision_of)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?)`,
        [
          Number(body.project_id),
          body.name,
          body.company_name,
          body.client_name,
          body.location,
          body.date || null,
          body.discount || 0,
          body.payment_terms,
          body.validity_terms,
          body.warranty,
          body.completion,
          body.exclusion,
          body.terms_and_conditions,
          origId,
        ],
      );

      const newBoqId = result.insertId;

      // Copy all lines + location associations from the original BOQ
      const [lines]: any = await db.query(
        `SELECT * FROM boq_lines WHERE boq_id = ? ORDER BY id ASC`,
        [origId],
      );

      for (const line of lines) {
        const [lineResult] = await db.query<ResultSetHeader>(
          `INSERT INTO boq_lines
            (boq_id, item_name, category, sub_category, scope_of_work, quantity,
             unit, rate_per_quantity, total_cost, item_description, attachments,
             category_order, subcategory_order, item_order, dn_number_and_date, remarks)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            newBoqId,
            line.item_name,
            line.category,
            line.sub_category,
            line.scope_of_work,
            line.quantity,
            line.unit,
            line.rate_per_quantity,
            line.total_cost,
            line.item_description,
            safeAttachments(line.attachments),
            line.category_order,
            line.subcategory_order,
            line.item_order,
            line.dn_number_and_date,
            line.remarks,
          ],
        );

        const newLineId = lineResult.insertId;

        // Copy location associations for this line
        await db.query(
          `INSERT INTO jt_boq_line_location (boq_line_id, location_id)
           SELECT ?, location_id FROM jt_boq_line_location WHERE boq_line_id = ?`,
          [newLineId, line.id],
        );
      }

      return NextResponse.json({
        success: true,
        id: newBoqId,
        rev_number: revNumber,
      });
    }

    if (body.action === "duplicateBoqHeader") {
      // mysql2 auto-parses JSON columns → arrays. Passing an array as a `?` param
      // expands it like IN (...); an empty array produces ,, → syntax error.
      const safeAttachments = (val: any): string | null => {
        if (val == null) return null;
        if (typeof val === "string") return val || null;
        try { return JSON.stringify(val) || null; } catch { return null; }
      };

      const origId = Number(body.id);

      // 1. Copy header — name prefixed with "Copy of ", always draft, never primary,
      //    same created_at so it sorts right after the original
      const [headerResult] = await db.query<ResultSetHeader>(
        `INSERT INTO boq_headers
          (project_id, name, company_name, client_name, location, date, discount,
           payment_terms, validity_terms, warranty, completion, exclusion,
           terms_and_conditions, is_draft, is_primary, created_on)
         SELECT project_id, CONCAT('Copy of ', name), company_name, client_name,
                location, date, discount, payment_terms, validity_terms, warranty,
                completion, exclusion, terms_and_conditions, 1, 0, created_on
         FROM boq_headers WHERE id = ?`,
        [origId],
      );
      const newBoqId = headerResult.insertId;

      // 2. Copy all lines one-by-one so we can replicate location associations
      const [lines]: any = await db.query(
        `SELECT * FROM boq_lines WHERE boq_id = ? ORDER BY id ASC`,
        [origId],
      );

      for (const line of lines) {
        const [lineResult] = await db.query<ResultSetHeader>(
          `INSERT INTO boq_lines
            (boq_id, item_name, category, sub_category, scope_of_work, quantity,
             unit, rate_per_quantity, total_cost, item_description, attachments,
             category_order, subcategory_order, item_order, dn_number_and_date, remarks)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            newBoqId,
            line.item_name,
            line.category,
            line.sub_category,
            line.scope_of_work,
            line.quantity,
            line.unit,
            line.rate_per_quantity,
            line.total_cost,
            line.item_description,
            safeAttachments(line.attachments),
            line.category_order,
            line.subcategory_order,
            line.item_order,
            line.dn_number_and_date,
            line.remarks,
          ],
        );

        const newLineId = lineResult.insertId;

        // 3. Copy location associations for this line
        await db.query(
          `INSERT INTO jt_boq_line_location (boq_line_id, location_id)
           SELECT ?, location_id FROM jt_boq_line_location WHERE boq_line_id = ?`,
          [newLineId, line.id],
        );
      }

      return NextResponse.json({ success: true, id: newBoqId });
    }

    if (body.action === "mergeBoqHeaders") {
      const baseId = Number(body.base_id);
      const sourceId = Number(body.source_id);

      // 1. Combine names: "Merged: {base} + {source}"
      const [baseHeaders]: any = await db.query(
        `SELECT name FROM boq_headers WHERE id = ?`, [baseId],
      );
      const [sourceHeaders]: any = await db.query(
        `SELECT name FROM boq_headers WHERE id = ?`, [sourceId],
      );
      const baseName = baseHeaders[0]?.name ?? "";
      const sourceName = sourceHeaders[0]?.name ?? "";
      await db.query(
        `UPDATE boq_headers SET name = ? WHERE id = ?`,
        [`Merged: ${baseName} + ${sourceName}`, baseId],
      );

      // 2. Get existing (category, sub_category) combos in base with max orders
      const [baseCombos]: any = await db.query(
        `SELECT category, sub_category,
                MAX(category_order)   AS cat_order,
                MAX(subcategory_order) AS sub_order,
                MAX(item_order)        AS max_item_order
         FROM boq_lines WHERE boq_id = ?
         GROUP BY category, sub_category`,
        [baseId],
      );

      let maxBaseCatOrder = 0;
      for (const row of baseCombos) {
        maxBaseCatOrder = Math.max(maxBaseCatOrder, Number(row.cat_order));
      }

      // 3. Fetch source lines in display order
      const [lines]: any = await db.query(
        `SELECT * FROM boq_lines WHERE boq_id = ?
         ORDER BY category_order ASC, subcategory_order ASC, item_order ASC`,
        [sourceId],
      );

      // 4. Build category rename map for conflicts.
      //    If a source category already exists in base → rename to "CAT (1)", "(2)", etc.
      //    Renamed categories are always treated as brand-new groups (new cat order).
      const baseCatSet = new Set<string>(baseCombos.map((r: any) => r.category));
      const allKnownCats = new Set<string>(baseCatSet);

      const uniqueSourceCats = [
        ...new Set(lines.map((l: any) => l.category as string)),
      ];

      const catRenameMap = new Map<string, string>(); // original cat → final cat

      for (const cat of uniqueSourceCats) {
        if (allKnownCats.has(cat)) {
          let suffix = 1;
          while (allKnownCats.has(`${cat} (${suffix})`)) suffix++;
          catRenameMap.set(cat, `${cat} (${suffix})`);
          allKnownCats.add(`${cat} (${suffix})`);
        } else {
          allKnownCats.add(cat);
        }
      }

      // 5. All source categories get fresh catOrders appended after base.
      //    Subcategory/item orders are copied as-is (no conflicts since categories are distinct).
      let nextCatOrder = maxBaseCatOrder + 1;
      const newCatOrderMap = new Map<string, number>(); // finalCat → catOrder

      // Helper: mysql2 auto-parses JSON columns into JS arrays/objects.
      // Passing an array as a bare `?` param expands it like an IN list —
      // an empty array produces `,,` which is a syntax error. Always re-serialise.
      const safeAttachments = (val: any): string | null => {
        if (val == null) return null;
        if (typeof val === "string") return val || null;
        try { return JSON.stringify(val) || null; } catch { return null; }
      };

      // 6. Insert lines with resolved category names and fresh orders
      for (const line of lines) {
        const finalCat = catRenameMap.get(line.category) ?? line.category;

        // All source categories are appended after base — assign a new catOrder
        // the first time we see each finalCat, then reuse it for subsequent lines.
        if (!newCatOrderMap.has(finalCat)) {
          newCatOrderMap.set(finalCat, nextCatOrder++);
        }
        const catOrder = newCatOrderMap.get(finalCat)!;

        // subcategory_order and item_order: copy from source as-is.
        // Since the category is either new or renamed, there are no clashes.
        const subOrder = Number.isFinite(Number(line.subcategory_order))
          ? Number(line.subcategory_order)
          : 0;
        const itemOrder = Number.isFinite(Number(line.item_order))
          ? Number(line.item_order)
          : 0;

        const [lineResult] = await db.query<ResultSetHeader>(
          `INSERT INTO boq_lines
            (boq_id, item_name, category, sub_category, scope_of_work, quantity,
             unit, rate_per_quantity, total_cost, item_description, attachments,
             category_order, subcategory_order, item_order, dn_number_and_date, remarks)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            baseId,
            line.item_name ?? null,
            finalCat ?? null,
            line.sub_category ?? null,
            line.scope_of_work ?? null,
            Number(line.quantity) || 0,
            line.unit ?? null,
            Number(line.rate_per_quantity) || 0,
            Number(line.total_cost) || 0,
            line.item_description ?? null,
            safeAttachments(line.attachments),
            catOrder,
            subOrder,
            itemOrder,
            line.dn_number_and_date ?? null,
            line.remarks ?? null,
          ],
        );

        // Copy location associations
        await db.query(
          `INSERT INTO jt_boq_line_location (boq_line_id, location_id)
           SELECT ?, location_id FROM jt_boq_line_location WHERE boq_line_id = ?`,
          [lineResult.insertId, line.id],
        );
      }

      // 7. Delete source BOQ
      await db.query(`DELETE FROM boq_headers WHERE id = ?`, [sourceId]);

      return NextResponse.json({ success: true });
    }

    if (body.action === "addLocation") {
      await db.query(
        `
        INSERT INTO lut_boq_headers_location (value) VALUES (?)
      `,
        [body.value],
      );

      return NextResponse.json({ success: true });
    }
  } catch (err: any) {
    console.error("SQL Error:", err.sqlMessage || err.message);
    return NextResponse.json(
      { error: err.sqlMessage || err.message },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();

    if (body.action === "updateBoqHeader") {
      const query = `
        UPDATE boq_headers 
        SET project_id = ?, name = ?, company_name = ?, client_name = ?, location = ?, date = ?, discount = ?, payment_terms = ?, validity_terms = ?, warranty = ?, completion = ?, exclusion = ?, terms_and_conditions = ?, is_draft = ?
        WHERE id = ?
      `;

      const values = [
        Number(body.project_id),
        body.name,
        body.company_name,
        body.client_name,
        body.location,
        body.date || null,
        body.discount || 0,
        body.payment_terms,
        body.validity_terms,
        body.warranty,
        body.completion,
        body.exclusion,
        body.terms_and_conditions,
        body.is_draft,
        Number(body.id),
      ];

      await db.query(query, values);

      if (body.is_draft === true) {
        await db.query(
          `INSERT INTO notification (boq_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
          [
            body.id,
            8,
            "BOQ Updated",
            `${body.name} was updated for ${body.project_name} by ${body.updated_by} at ${new Date().toLocaleTimeString(
              "en-GB",
              {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
                timeZone: "Asia/Dubai",
              },
            )}`,
          ],
        );
      }

      await db.query(
        `INSERT INTO notification (boq_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
        [
          body.id,
          16,
          "BOQ Updated",
          `${body.name} was updated for ${body.project_name} by ${body.updated_by} at ${new Date().toLocaleTimeString(
            "en-GB",
            {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
              timeZone: "Asia/Dubai",
            },
          )}`,
        ],
      );

      return NextResponse.json({ success: true });
    }

    if (body.action === "updateAll") {
      try {
        // Update BOQ line without location_id (deprecated field)
        const query = `
          UPDATE boq_lines 
          SET item_name = ?, category = ?, sub_category = ?, scope_of_work = ?, quantity = ?, unit = ?, rate_per_quantity = ?, total_cost = ?, item_description = ?, attachments = ?, dn_number_and_date = ?, remarks = ?
          WHERE id = ?
        `;

        const values = [
          body.item_name,
          body.category.toUpperCase(),
          body.sub_category.toUpperCase(),
          body.scope_of_work || null,
          Number(body.quantity),
          body.unit,
          Number(body.rate_per_quantity) || 0,
          Number(body.total_cost) || 0,
          body.item_description || null,
          body.attachments && body.attachments.length > 0
            ? JSON.stringify(body.attachments)
            : null,
          body.dn_number_and_date,
          body.remarks,
          Number(body.id),
        ];

        await db.query(query, values);

        // Update location associations
        // First, delete existing associations
        await db.query(
          `DELETE FROM jt_boq_line_location WHERE boq_line_id = ?`,
          [Number(body.id)],
        );

        // Then, insert new associations
        // body.location_ids should be an array of location IDs: [1, 2, 3]
        if (
          body.location_ids &&
          Array.isArray(body.location_ids) &&
          body.location_ids.length > 0
        ) {
          const locationValues = body.location_ids.map((locationId: number) => [
            Number(body.id),
            Number(locationId),
          ]);

          await db.query(
            `INSERT INTO jt_boq_line_location (boq_line_id, location_id) VALUES ?`,
            [locationValues],
          );
        }

        return NextResponse.json({ success: true });
      } catch (error) {
        throw error;
      }
    }

    if (body.action === "toggleBoqDraft") {
      await db.query(`UPDATE boq_headers SET is_draft = ? WHERE id = ?`, [
        body.is_draft ? 1 : 0,
        Number(body.id),
      ]);
      return NextResponse.json({ success: true });
    }

    if (body.action === "setBoqPrimary") {
      // Clear primary from all BOQs in this project first
      await db.query(
        `UPDATE boq_headers SET is_primary = 0 WHERE project_id = ?`,
        [Number(body.project_id)],
      );
      // Set this one as primary
      await db.query(`UPDATE boq_headers SET is_primary = 1 WHERE id = ?`, [
        Number(body.id),
      ]);
      return NextResponse.json({ success: true });
    }

    if (body.action === "updateCategory") {
      const query = `
        UPDATE boq_lines 
        SET category = ?
        WHERE category = ? AND boq_id = ?
      `;

      const values = [
        body.new_category.toUpperCase(),
        body.old_category,
        body.boq_id,
      ];

      await db.query(query, values);

      return NextResponse.json({ success: true });
    }

    if (body.action === "updateSubCategory") {
      const query = `
        UPDATE boq_lines 
        SET sub_category = ?
        WHERE sub_category = ? AND category = ? AND boq_id = ?
      `;

      const values = [
        body.new_sub_category.toUpperCase(),
        body.old_sub_category,
        body.category.toUpperCase(),
        body.boq_id,
      ];

      await db.query(query, values);

      return NextResponse.json({ success: true });
    }

    if (body.action === "updateLocation") {
      try {
        const boqLineId = Number(body.id);

        if (Number.isNaN(boqLineId)) {
          return NextResponse.json(
            { success: false, error: "Invalid BOQ line ID" },
            { status: 400 },
          );
        }

        // 1️⃣ Remove existing locations
        await db.query(
          `DELETE FROM jt_boq_line_location WHERE boq_line_id = ?`,
          [boqLineId],
        );

        // 2️⃣ Insert new locations (if any)
        if (
          body.location_ids &&
          Array.isArray(body.location_ids) &&
          body.location_ids.length > 0
        ) {
          const locationValues = body.location_ids
            .map((locationId: number) => {
              const id = Number(locationId);
              return Number.isNaN(id) ? null : [boqLineId, id];
            })
            .filter(Boolean);

          if (locationValues.length > 0) {
            await db.query(
              `INSERT INTO jt_boq_line_location (boq_line_id, location_id) VALUES ?`,
              [locationValues],
            );
          }
        }

        return NextResponse.json({ success: true });
      } catch (error) {
        console.error("updateLocation failed:", error);
        return NextResponse.json(
          { success: false, error: "Failed to update location" },
          { status: 500 },
        );
      }
    }
  } catch (err: any) {
    console.error("SQL Error:", err.sqlMessage || err.message);
    return NextResponse.json(
      { error: err.sqlMessage || err.message },
      { status: 500 },
    );
  }
}

// Replace your entire DELETE function
export async function DELETE(req: Request) {
  try {
    const body = await req.json();

    if (body.action === "deleteBoqHeader") {
      const query = "DELETE FROM boq_headers WHERE id = ?";
      await db.query(query, [Number(body.id)]);
      return NextResponse.json({ success: true });
    }

    if (body.action === "deleteCategory") {
      const boqId = Number(body.boq_id);
      const category = body.category;

      // Delete the category
      await db.query(
        "DELETE FROM boq_lines WHERE category = ? AND boq_id = ?",
        [category, boqId],
      );

      // Reorder remaining categories
      await db.query(
        `
        UPDATE boq_lines
        JOIN (
            SELECT 
                id,
                DENSE_RANK() OVER (PARTITION BY boq_id ORDER BY category_order, category) AS new_category_order
            FROM boq_lines
            WHERE boq_id = ?
        ) AS ranked ON boq_lines.id = ranked.id
        SET boq_lines.category_order = ranked.new_category_order
      `,
        [boqId],
      );

      return NextResponse.json({ success: true });
    }

    if (body.action === "deleteSubCategory") {
      const boqId = Number(body.boq_id);
      const category = body.category;
      const subCategory = body.sub_category;

      // Delete the subcategory
      await db.query(
        "DELETE FROM boq_lines WHERE category = ? AND sub_category = ? AND boq_id = ?",
        [category, subCategory, boqId],
      );

      // Reorder remaining subcategories within this category
      await db.query(
        `
        UPDATE boq_lines
        JOIN (
            SELECT 
                id,
                DENSE_RANK() OVER (PARTITION BY boq_id, category ORDER BY subcategory_order, sub_category) AS new_subcategory_order
            FROM boq_lines
            WHERE boq_id = ? AND category = ?
        ) AS ranked ON boq_lines.id = ranked.id
        SET boq_lines.subcategory_order = ranked.new_subcategory_order
      `,
        [boqId, category],
      );

      return NextResponse.json({ success: true });
    }

    if (body.action === "deleteItem") {
      // Get item info before deletion
      const [itemInfo]: any = await db.query(
        "SELECT boq_id, category, sub_category FROM boq_lines WHERE id = ?",
        [Number(body.id)],
      );

      if (!itemInfo || itemInfo.length === 0) {
        return NextResponse.json({ error: "Item not found" }, { status: 404 });
      }

      const { boq_id, category, sub_category } = itemInfo[0];

      // Delete the item
      await db.query("DELETE FROM boq_lines WHERE id = ?", [Number(body.id)]);

      // Reorder remaining items within this subcategory
      await db.query(
        `
        UPDATE boq_lines
        JOIN (
            SELECT 
                id,
                ROW_NUMBER() OVER (PARTITION BY boq_id, category, sub_category ORDER BY item_order, id) AS new_item_order
            FROM boq_lines
            WHERE boq_id = ? AND category = ? AND sub_category = ?
        ) AS ranked ON boq_lines.id = ranked.id
        SET boq_lines.item_order = ranked.new_item_order
      `,
        [boq_id, category, sub_category],
      );

      return NextResponse.json({ success: true });
    }
  } catch (err: any) {
    console.error("SQL Error:", err.sqlMessage || err.message);
    return NextResponse.json(
      { error: err.sqlMessage || err.message },
      { status: 500 },
    );
  }
}
