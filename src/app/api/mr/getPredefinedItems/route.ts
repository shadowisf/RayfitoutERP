import { NextRequest, NextResponse } from "next/server";
import { ResultSetHeader } from "mysql2";
import { db } from "@/lib/db";

function toTitleCase(str: string): string {
  return str
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { item_code, category_id, subcategory_id, unit, brand } = body;
    const material_description = body.material_description
      ? toTitleCase(body.material_description)
      : body.material_description;

    if (!material_description || !category_id || !subcategory_id) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Use provided item_code or auto-generate MAT-XXXXX
    let itemCode = item_code?.trim();
    if (!itemCode) {
      const [maxRows]: any = await db.query(
        `SELECT MAX(id) as max_id FROM lut_predefined_items`,
      );
      const nextId = (maxRows[0]?.max_id || 0) + 1;
      itemCode = `MAT-${String(nextId).padStart(5, "0")}`;
    }

    const [result] = await db.query<ResultSetHeader>(
      `INSERT INTO lut_predefined_items (item_code, category_id, subcategory_id, material_description, brand, unit)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        itemCode,
        Number(category_id),
        Number(subcategory_id),
        material_description,
        brand || null,
        unit || null,
      ],
    );

    // Fetch the inserted item with category/subcategory names
    const [rows]: any = await db.query(
      `SELECT
        pi.id, pi.item_code, pi.category_id, pi.subcategory_id,
        pi.material_description, pi.brand, pi.unit,
        mc.value AS category_name,
        msc.value AS subcategory_name
      FROM lut_predefined_items pi
      LEFT JOIN lut_material_categories mc ON mc.id = pi.category_id
      LEFT JOIN lut_material_subcategories msc ON msc.id = pi.subcategory_id
      WHERE pi.id = ?`,
      [result.insertId],
    );

    return NextResponse.json(rows[0], { status: 201 });
  } catch (err: any) {
    console.error(err.sqlMessage);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, unit, material_description, category_id, subcategory_id } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    // Build a dynamic SET clause from whichever fields were supplied
    const setClauses: string[] = [];
    const values: any[] = [];

    if (unit !== undefined) {
      setClauses.push("unit = ?");
      values.push(unit);
    }
    if (material_description !== undefined) {
      setClauses.push("material_description = ?");
      values.push(material_description);
    }
    if (category_id !== undefined) {
      setClauses.push("category_id = ?");
      values.push(Number(category_id));
    }
    if (subcategory_id !== undefined) {
      setClauses.push("subcategory_id = ?");
      values.push(Number(subcategory_id));
    }

    if (setClauses.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    values.push(id);
    await db.query(
      `UPDATE lut_predefined_items SET ${setClauses.join(", ")} WHERE id = ?`,
      values,
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    console.error(err.sqlMessage);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}
