import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/* export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json();

    const [rows] = await db.query("SELECT * FROM boq_lines WHERE boq_id = ?", [
      id,
    ]);

    return NextResponse.json(rows, { status: 200 });
  } catch (err: any) {
    console.error(err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
} */

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const boqId = body.boq_id;

    const [rows]: any = await db.query(
      `
      SELECT 
        bl.*,
        lbl.value as location_name
      FROM boq_lines bl
      LEFT JOIN lut_boq_headers_location lbl ON bl.location_id = lbl.id
      WHERE bl.boq_id = ?
    `,
      [boqId]
    );

    const grouped: any = {};

    rows.forEach(function (row: any) {
      const category = row.category;
      const subCategory = row.sub_category;

      if (!grouped[category]) {
        grouped[category] = {};
      }

      if (!grouped[category][subCategory]) {
        grouped[category][subCategory] = [];
      }

      grouped[category][subCategory].push({
        id: row.id,
        boq_id: row.boq_id,
        item_name: row.item_name,
        item_code: row.item_code,
        scope_of_work: row.scope_of_work,
        location_id: row.location_id,
        location_name: row.location_name,
        quantity: row.quantity,
        unit: row.unit,
        rate_per_quantity: row.rate_per_quantity,
        total_cost: row.total_cost,
        item_description: row.item_description,
        attachments: row.attachments || [],
      });
    });

    return NextResponse.json(grouped);
  } catch (err: any) {
    console.error(err.sqlMessage || err.message);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}
