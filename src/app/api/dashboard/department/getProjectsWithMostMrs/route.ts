import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const query = `
      SELECT
        project_id,
        project_name AS project_name,
        COUNT(*) AS total
      FROM vw_mr_headers
      GROUP BY project_id, project_name
      ORDER BY total DESC
    `;

    const [rows]: any = await db.query(query);

    return NextResponse.json(rows, { status: 200 });
  } catch (err: any) {
    console.error(err.sqlMessage || err);
    return NextResponse.json(
      { error: err.sqlMessage || "Internal server error" },
      { status: 500 }
    );
  }
}
