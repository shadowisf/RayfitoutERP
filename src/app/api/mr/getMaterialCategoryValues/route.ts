import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const [rows] = await db.query(`
      SELECT * FROM lut_material_categories
      WHERE id NOT IN (SELECT DISTINCT category_id FROM lut_predefined_items WHERE category_id IS NOT NULL)
         OR id IN (SELECT DISTINCT category_id FROM lut_predefined_items WHERE category_id IS NOT NULL AND (is_archived = 0 OR is_archived IS NULL))
      ORDER BY id ASC
    `);

    return NextResponse.json(rows, { status: 200 });
  } catch (err: any) {
    console.error(err.sqlMessage);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}
