import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.department_id) {
      return NextResponse.json(
        { error: "department_id is required" },
        { status: 400 }
      );
    }

    const query = `
      SELECT
        SUM(progress_id IN (5, 11, 13, 15, 16, 23)) AS rejected,
        SUM(progress_id = 25) AS completed
      FROM vw_mr_headers
      WHERE department_id = ?
    `;

    const values = [Number(body.department_id)];

    const [rows]: any = await db.query(query, values);

    return NextResponse.json(
      {
        rejected: rows[0]?.rejected || 0,
        completed: rows[0]?.completed || 0,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error(err.sqlMessage || err);
    return NextResponse.json(
      { error: err.sqlMessage || "Internal server error" },
      { status: 500 }
    );
  }
}
