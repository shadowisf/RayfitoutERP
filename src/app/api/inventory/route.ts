import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const [rows] = await db.query("SELECT * FROM inventory");

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

    if (body.action === "addToStock") {
      const query = `
        INSERT INTO inventory 
        (id, batch_id, category, subcategory, item, location, total_quantity, unit, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        Number(body.id),
        Number(body.batch_id),
        body.category,
        body.subcategory,
        body.item,
        body.location,
        body.total_quantity,
        body.unit,
        body.notes,
      ];

      await db.query(query, values);

      return NextResponse.json({
        success: true,
      });
    }

    if (body.action === "updateStock") {
      const query = `
        UPDATE inventory 
        SET location = ?, notes = ?
        WHERE id = ?
      `;

      const values = [body.location, body.notes, Number(body.id)];

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
