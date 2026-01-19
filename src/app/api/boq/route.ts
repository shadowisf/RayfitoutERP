import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ResultSetHeader } from "mysql2";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.action === "createBoqHeader") {
      const query = `
      INSERT INTO boq_headers 
      (project_id, company_name, client_name, location, date, payment_terms, validity_terms, terms_and_conditions)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

      const values = [
        Number(body.project_id),
        body.company_name,
        body.client_name,
        body.location,
        body.date || null,
        body.payment_terms,
        body.validity_terms,
        body.terms_and_conditions,
      ];

      const [result] = await db.query<ResultSetHeader>(query, values);

      return NextResponse.json({ success: true, id: result.insertId });
    }

    if (body.action === "createBoqLine") {
      // Start a transaction to ensure data consistency
      const connection = await db.getConnection();

      try {
        await connection.beginTransaction();

        // Insert BOQ line without location_id (deprecated field)
        const query = `
          INSERT INTO boq_lines 
          (boq_id, item_name, category, sub_category, scope_of_work, quantity, unit, rate_per_quantity, total_cost, item_description, attachments)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        ];

        const [result] = await connection.query<ResultSetHeader>(query, values);
        const boqLineId = result.insertId;

        // Insert location associations into junction table
        // body.location_ids should be an array of location IDs: [1, 2, 3]
        if (
          body.location_ids &&
          Array.isArray(body.location_ids) &&
          body.location_ids.length > 0
        ) {
          const locationValues = body.location_ids.map((locationId: number) => [
            boqLineId,
            Number(locationId),
          ]);

          await connection.query(
            `INSERT INTO jt_boq_line_location (boq_line_id, location_id) VALUES ?`,
            [locationValues]
          );
        }

        await connection.commit();
        connection.release();

        return NextResponse.json({ success: true, id: boqLineId });
      } catch (error) {
        await connection.rollback();
        connection.release();
        throw error;
      }
    }

    if (body.action === "duplicateBoqLine") {
      const query = `
        INSERT INTO boq_lines 
        (boq_id, item_name, category, sub_category, scope_of_work, quantity, unit, rate_per_quantity, total_cost, item_description, attachments)
        SELECT boq_id, item_name, category, sub_category, scope_of_work, quantity, unit, rate_per_quantity, total_cost, item_description, attachments
        FROM boq_lines
        WHERE id = ?
      `;

      const values = [Number(body.id)];

      await db.query<ResultSetHeader>(query, values);

      return NextResponse.json({ success: true });
    }
  } catch (err: any) {
    console.error("SQL Error:", err.sqlMessage || err.message);
    return NextResponse.json(
      { error: err.sqlMessage || err.message },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();

    if (body.action === "updateBoqHeader") {
      const query = `
        UPDATE boq_headers 
        SET project_id = ?, company_name = ?, client_name = ?, location = ?, date = ?, payment_terms = ?, validity_terms = ?, terms_and_conditions = ?
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
          [Number(body.id)]
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
            [locationValues]
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
            { status: 400 }
          );
        }

        // 1️⃣ Remove existing locations
        await db.query(
          `DELETE FROM jt_boq_line_location WHERE boq_line_id = ?`,
          [boqLineId]
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
              [locationValues]
            );
          }
        }

        return NextResponse.json({ success: true });
      } catch (error) {
        console.error("updateLocation failed:", error);
        return NextResponse.json(
          { success: false, error: "Failed to update location" },
          { status: 500 }
        );
      }
    }
  } catch (err: any) {
    console.error("SQL Error:", err.sqlMessage || err.message);
    return NextResponse.json(
      { error: err.sqlMessage || err.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();

    if (body.action === "deleteBoqHeader") {
      const query = "DELETE FROM boq_headers WHERE id = ?";
      await db.query(query, [Number(body.id)]);
      return NextResponse.json({ success: true });
    }

    if (body.action === "deleteCategory") {
      const query = "DELETE FROM boq_lines WHERE category = ? AND boq_id = ?";
      await db.query(query, [body.category, Number(body.boq_id)]);
      return NextResponse.json({ success: true });
    }

    if (body.action === "deleteSubCategory") {
      const query =
        "DELETE FROM boq_lines WHERE category = ? AND sub_category = ? AND boq_id = ?";
      await db.query(query, [body.category, body.sub_category, body.boq_id]);
      return NextResponse.json({ success: true });
    }

    if (body.action === "deleteItem") {
      // Note: The junction table records will be automatically deleted
      // due to ON DELETE CASCADE constraint on jt_boq_line_location
      const query = "DELETE FROM boq_lines WHERE id = ?";
      await db.query(query, [Number(body.id)]);
      return NextResponse.json({ success: true });
    }
  } catch (err: any) {
    console.error("SQL Error:", err.sqlMessage || err.message);
    return NextResponse.json(
      { error: err.sqlMessage || err.message },
      { status: 500 }
    );
  }
}
