import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { describe } from "node:test";
import { ResultSetHeader } from "mysql2";

export async function GET() {
  try {
    const [rows] = await db.query(
      "SELECT * FROM vw_inventory WHERE is_archived = 0",
    );

    return NextResponse.json({
      success: true,
      data: rows,
    });
  } catch (error: any) {
    console.error(error.sqlMessage);
    return NextResponse.json(
      { error: error.sqlMessage, success: false },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.action === "createInventoryItem") {
      const query = `
        INSERT INTO inventory 
        (category_id, subcategory_id, description, type, unit, stockable, minimum_stock_quantity, brand, country_of_origin, specification, image, created_by)
        VALUES (?, ?, ? ,?,?,?,?,?,?,?,?,?)
      `;

      const values = [
        Number(body.category_id),
        Number(body.subcategory_id),
        body.description,
        body.type,
        body.unit,
        body.stockable,
        body.minimum_stock_quantity,
        body.brand,
        body.country_of_origin,
        body.specification,
        body.image,
        body.created_by,
      ];

      const [res] = await db.query<ResultSetHeader>(query, values);

      await db.query(
        `INSERT INTO notification (inventory_item_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
        [
          res.insertId,
          8,
          "New Inventory Item",
          `${body.description} was created by ${body.created_by}`,
        ],
      );

      await db.query(
        `INSERT INTO notification (inventory_item_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
        [
          res.insertId,
          16,
          "New Inventory Item",
          `${body.description} was created by ${body.created_by}`,
        ],
      );

      return NextResponse.json({
        success: true,
      });
    }

    if (body.action === "updateInventoryItem") {
      const query = `
        UPDATE inventory 
        SET 
          category_id = ?,
          subcategory_id = ?,
          description = ?,
          type = ?,
          unit = ?,
          stockable = ?,
          minimum_stock_quantity = ?,
          brand = ?,
          country_of_origin = ?,
          specification = ?,
          image = ?
        WHERE id = ?
      `;

      const values = [
        Number(body.category_id),
        Number(body.subcategory_id),
        body.description,
        body.type,
        body.unit,
        body.stockable,
        body.minimum_stock_quantity,
        body.brand,
        body.country_of_origin,
        body.specification,
        body.image,
        Number(body.id),
      ];

      await db.query(query, values);

      return NextResponse.json({
        success: true,
      });
    }
  } catch (error: any) {
    console.error(error.sqlMessage);
    return NextResponse.json(
      { error: error.sqlMessage, success: false },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.action === "archiveInventoryItem") {
      const query = `
        UPDATE inventory 
        SET is_archived = 1
        WHERE id = ?
      `;

      await db.query(query, [Number(body.id)]);

      return NextResponse.json({
        success: true,
      });
    }

    if (body.action === "restoreInventoryItem") {
      const query = `
        UPDATE inventory 
        SET is_archived = 0
        WHERE id = ?
      `;

      await db.query(query, [Number(body.id)]);

      return NextResponse.json({
        success: true,
      });
    }

    if (body.action === "restoreAllInventoryItem") {
      const query = `
        UPDATE inventory 
        SET is_archived = 0
      `;

      await db.query(query);

      return NextResponse.json({
        success: true,
      });
    }
  } catch (error: any) {
    console.error(error.sqlMessage);
    return NextResponse.json(
      { error: error.sqlMessage, success: false },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();

    const { id } = body;

    // Validate required fields
    if (!id) {
      return NextResponse.json(
        { error: "Missing inventory item ID", success: false },
        { status: 400 },
      );
    }

    const query = `
        DELETE FROM inventory
        WHERE id = ?
      `;

    await db.query(query, [Number(id)]);

    return NextResponse.json({
      success: true,
      message: "Inventory item deleted",
    });
  } catch (error: any) {
    console.error("Error deleting inventory item:", error);
    return NextResponse.json(
      { error: error.sqlMessage || error.message, success: false },
      { status: 500 },
    );
  }
}
