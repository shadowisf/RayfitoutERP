import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ResultSetHeader } from "mysql2";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.action === "createBoqHeader") {
      const query = `
      INSERT INTO boq_headers 
      (project_id, company_name, client_name, location, date, payment_terms, validity_terms, completion, exclusion, terms_and_conditions)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

      const values = [
        Number(body.project_id),
        body.company_name,
        body.client_name,
        body.location,
        body.date || null,
        body.payment_terms,
        body.validity_terms,
        body.completion,
        body.exclusion,
        body.terms_and_conditions,
      ];

      const [result] = await db.query<ResultSetHeader>(query, values);

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
      (boq_id, item_name, category, sub_category, scope_of_work, quantity, unit, rate_per_quantity, total_cost, item_description, attachments, category_order, subcategory_order, item_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        // Get the original item's category and subcategory
        const [originalItem]: any = await db.query(
          `SELECT boq_id, category, sub_category FROM boq_lines WHERE id = ?`,
          [Number(body.id)],
        );

        if (!originalItem || originalItem.length === 0) {
          throw new Error("Original BOQ line not found");
        }

        const { boq_id, category, sub_category } = originalItem[0];

        // FIXED: Get max order from entire boq_id for category
        const [maxCategoryOrder]: any = await db.query(
          `SELECT COALESCE(MAX(category_order), -1) as max_order 
       FROM boq_lines 
       WHERE boq_id = ?`, // ← Changed: removed category filter
          [boq_id],
        );

        // FIXED: Get max order from category for subcategory
        const [maxSubcategoryOrder]: any = await db.query(
          `SELECT COALESCE(MAX(subcategory_order), -1) as max_order 
       FROM boq_lines 
       WHERE boq_id = ? AND category = ?`, // ← Changed: only filter by category
          [boq_id, category],
        );

        const [maxItemOrder]: any = await db.query(
          `SELECT COALESCE(MAX(item_order), -1) as max_order 
       FROM boq_lines 
       WHERE boq_id = ? AND category = ? AND sub_category = ?`,
          [boq_id, category, sub_category],
        );

        const nextCategoryOrder = maxCategoryOrder[0].max_order + 1;
        const nextSubcategoryOrder = maxSubcategoryOrder[0].max_order + 1;
        const nextItemOrder = maxItemOrder[0].max_order + 1;

        // Duplicate the item with new order values
        const query = `
      INSERT INTO boq_lines 
      (boq_id, item_name, category, sub_category, scope_of_work, quantity, unit, rate_per_quantity, total_cost, item_description, attachments, category_order, subcategory_order, item_order)
      SELECT boq_id, item_name, category, sub_category, scope_of_work, quantity, unit, rate_per_quantity, total_cost, item_description, attachments, ?, ?, ?
      FROM boq_lines
      WHERE id = ?
    `;

        const values = [
          nextCategoryOrder,
          nextSubcategoryOrder,
          nextItemOrder,
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
        SET project_id = ?, company_name = ?, client_name = ?, location = ?, date = ?, payment_terms = ?, validity_terms = ?, completion = ?, exclusion = ?, terms_and_conditions = ?
        WHERE id = ?
      `;

      const values = [
        Number(body.project_id),
        body.company_name,
        body.client_name,
        body.location,
        body.date || null,
        body.payment_terms,
        body.validity_terms,
        body.completion,
        body.exclusion,
        body.terms_and_conditions,
        Number(body.id),
      ];

      await db.query(query, values);

      return NextResponse.json({ success: true });
    }

    if (body.action === "updateAll") {
      try {
        // Update BOQ line without location_id (deprecated field)
        const query = `
          UPDATE boq_lines 
          SET item_name = ?, category = ?, sub_category = ?, scope_of_work = ?, quantity = ?, unit = ?, rate_per_quantity = ?, total_cost = ?, item_description = ?, attachments = ?
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
