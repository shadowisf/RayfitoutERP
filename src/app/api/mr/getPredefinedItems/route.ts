import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const [rows] = await db.query(
      `SELECT
        pi.id,
        pi.item_code,
        pi.category_id,
        pi.subcategory_id,
        pi.material_description,
        pi.brand,
        pi.unit,
        mc.value AS category_name,
        msc.value AS subcategory_name
      FROM lut_predefined_items pi
      LEFT JOIN lut_material_categories mc ON mc.id = pi.category_id
      LEFT JOIN lut_material_subcategories msc ON msc.id = pi.subcategory_id
      ORDER BY pi.material_description ASC`,
    );

    return NextResponse.json(rows, { status: 200 });
  } catch (err: any) {
    console.error(err.sqlMessage);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, unit } = body;

    if (!id || !unit) {
      return NextResponse.json(
        { error: "Missing id or unit" },
        { status: 400 },
      );
    }

    await db.query(`UPDATE lut_predefined_items SET unit = ? WHERE id = ?`, [
      unit,
      id,
    ]);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    console.error(err.sqlMessage);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}
