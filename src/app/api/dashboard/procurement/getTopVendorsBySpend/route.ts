import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const query = `
      SELECT 
        lpo.supplier_id,
        s.name AS supplier_name,
        SUM(lpo.total) AS total_spend,
        COUNT(lpo.id) AS lpo_count
      FROM lpo
      LEFT JOIN suppliers s ON lpo.supplier_id = s.id
      WHERE lpo.payment_status = 'Approved'
      GROUP BY lpo.supplier_id, s.name
      HAVING total_spend > 0
      ORDER BY total_spend DESC
      LIMIT 3
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
