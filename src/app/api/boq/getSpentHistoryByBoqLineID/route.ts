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
        mh.id as mr_header_id,
        lpo.id as lpo_id,
        lpo.total as spent_amount,
        lpo.created_at as lpo_date
      FROM lpo
      INNER JOIN mr_headers mh ON lpo.mr_header_id = mh.id
      INNER JOIN mr_lines ml ON mh.id = ml.mr_header_id
      WHERE ml.boq_line_id = ?
        AND lpo.payment_status = 'Approved'
      ORDER BY lpo.created_at DESC
      `,
      [boq_line_id]
    );

    return NextResponse.json(rows, { status: 200 });
  } catch (err: any) {
    console.error("Error fetching spend history:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}