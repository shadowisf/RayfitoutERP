import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const query = `
      SELECT 
        lmc.value AS category_name,
        SUM(lpo.total) AS total_spend,
        COUNT(DISTINCT lpo.id) AS lpo_count
      FROM lpo
      INNER JOIN mr_headers mh ON lpo.mr_header_id = mh.id
      INNER JOIN mr_lines ml ON mh.id = ml.mr_header_id
      INNER JOIN lut_material_categories lmc ON ml.material_category_id = lmc.id
      WHERE lpo.payment_status = 'Approved'
      GROUP BY ml.material_category_id, lmc.value
      HAVING total_spend > 0
      ORDER BY total_spend DESC
      LIMIT 7
    `;

    const [rows] = await db.query(query);

    return NextResponse.json(rows, { status: 200 });
  } catch (err: any) {
    console.error(err.sqlMessage || err.message);
    return NextResponse.json(
      { error: err.sqlMessage || err.message },
      { status: 500 }
    );
  }
}
