import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const boqId = body.boq_id;

    const [rows]: any = await db.query(
      "SELECT * FROM vw_boq_lines WHERE boq_id = ?",
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
        category: row.category,
        sub_category: row.sub_category,
        item_code: row.item_code,
        scope_of_work: row.scope_of_work,
        location_ids: row.location_ids,
        location: row.location,
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
    console.error(err.sqlMessage);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}
