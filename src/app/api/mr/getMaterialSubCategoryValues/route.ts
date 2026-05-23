import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const [rows] = await db.query(`
      SELECT * FROM lut_material_subcategories
      WHERE category_id >= 191
         OR category_id IN (SELECT DISTINCT category_id FROM lut_predefined_items WHERE category_id IS NOT NULL)
      ORDER BY category_id ASC, id ASC
    `);

    return NextResponse.json(rows, { status: 200 });
  } catch (err: any) {
    console.error(err.sqlMessage);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}
