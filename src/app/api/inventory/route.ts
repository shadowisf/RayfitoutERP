import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const [rows] = await db.query("SELECT * FROM vw_inventory");

    return NextResponse.json({
      success: true,
      data: rows,
    });
  } catch (error: any) {
    console.error(error.sqlMessage);
    return NextResponse.json(
      { error: error.sqlMessage, success: false },
      { status: 500 }
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

      await db.query(query, values);

      return NextResponse.json({
        success: true,
      });
    }
  } catch (error: any) {
    console.error(error.sqlMessage);
    return NextResponse.json(
      { error: error.sqlMessage, success: false },
      { status: 500 }
    );
  }
}
