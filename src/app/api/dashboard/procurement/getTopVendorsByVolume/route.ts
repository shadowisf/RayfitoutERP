import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date_from, date_to } = body;

    const dateClauseParts: string[] = [];
    if (date_from) dateClauseParts.push(`lpo.created_at >= '${date_from}'`);
    if (date_to) dateClauseParts.push(`lpo.created_at <= '${date_to}'`);
    const dateFilter = dateClauseParts.length > 0
      ? `AND ${dateClauseParts.join(" AND ")}`
      : "";

    const query = `
      SELECT
        lpo.supplier_id,
        s.name AS supplier_name,
        SUM(mr_lines.quantity) AS total_quantity,
        COUNT(DISTINCT lpo.id) AS lpo_count
      FROM lpo_mr_line
      INNER JOIN mr_lines ON lpo_mr_line.mr_line_id = mr_lines.id
      INNER JOIN lpo ON lpo_mr_line.lpo_id = lpo.id
      LEFT JOIN suppliers s ON lpo.supplier_id = s.id
      WHERE lpo.payment_status = 'Approved'
        ${dateFilter}
      GROUP BY lpo.supplier_id, s.name
      HAVING total_quantity > 0
      ORDER BY total_quantity DESC
      LIMIT 3
    `;

    const [rows] = await db.query(query);

    return NextResponse.json(rows, { status: 200 });
  } catch (err: any) {
    console.error(err.sqlMessage || err.message);
    return NextResponse.json(
      { error: err.sqlMessage || err.message },
      { status: 500 },
    );
  }
}
