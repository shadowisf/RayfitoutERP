import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const [rows]: any = await db.query(`
      SELECT 
        lpo.*,
        s.name AS supplier_name,
        COALESCE(COUNT(lml.id), 0) AS item_count
      FROM lpo
      INNER JOIN mr_headers mh
        ON mh.id = lpo.mr_header_id
      LEFT JOIN lpo_mr_line lml
        ON lml.lpo_id = lpo.id
      LEFT JOIN suppliers s
        ON s.id = lpo.supplier_id
      WHERE mh.progress_id = 17
      GROUP BY lpo.id, s.name
      ORDER BY lpo.delivery_date ASC
    `);

    return NextResponse.json(rows, { status: 200 });
  } catch (err: any) {
    console.error(err.sqlMessage || err.message);
    return NextResponse.json(
      { error: err.sqlMessage || err.message },
      { status: 500 }
    );
  }
}
