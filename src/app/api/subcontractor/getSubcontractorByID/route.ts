import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = Number(body.id);

    if (!id || Number.isNaN(id)) {
      return NextResponse.json(
        { error: "Valid subcontractor id is required" },
        { status: 400 },
      );
    }

    const [rows]: any = await db.query(
      `
      SELECT s.*,
        GROUP_CONCAT(DISTINCT mc.value) as material_categories,
        GROUP_CONCAT(DISTINCT mc.id) as material_category_ids
      FROM subcontractors s
      LEFT JOIN jt_subcontractor_material_category jsmc ON s.id = jsmc.subcontractor_id
      LEFT JOIN lut_material_categories mc ON jsmc.material_category_id = mc.id
      WHERE s.id = ?
      GROUP BY s.id
      `,
      [id],
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { error: "Subcontractor not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(rows[0], { status: 200 });
  } catch (err: any) {
    console.error("SQL Error:", err.sqlMessage || err.message);
    return NextResponse.json(
      { error: err.sqlMessage || err.message },
      { status: 500 },
    );
  }
}
