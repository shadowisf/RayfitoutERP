import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { boq_line_id } = await req.json();

    if (!boq_line_id) {
      return NextResponse.json(
        { error: "boq_line_id is required" },
        { status: 400 }
      );
    }

    const [rows]: any = await db.query(
      `
      SELECT 
        COALESCE(SUM(lpo.total), 0) as total_spend
      FROM lpo
      INNER JOIN mr_headers mh ON lpo.mr_header_id = mh.id
      INNER JOIN mr_lines ml ON mh.id = ml.mr_header_id
      WHERE ml.boq_line_id = ?
        AND lpo.payment_status = 'Approved'
      `,
      [boq_line_id]
    );

    return NextResponse.json(
      {
        boq_line_id,
        total_spend: rows[0]?.total_spend || 0,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Error fetching total spend:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
