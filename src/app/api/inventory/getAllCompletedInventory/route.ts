import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const query = `
      SELECT 
        i.*,
        ml.mr_header_id,
        mh.progress_id
      FROM inventory i
      INNER JOIN mr_lines ml ON i.id = ml.id
      INNER JOIN mr_headers mh ON ml.mr_header_id = mh.id
      WHERE mh.progress_id = 25
    `;

    const [rows] = await db.query(query);

    return NextResponse.json({
      success: true,
      data: rows,
    });
  } catch (error: any) {
    console.error(error.sqlMessage);
    return NextResponse.json(
      { error: error.sqlMessage, success: false },
      { status: 500 }
    );
  }
}
