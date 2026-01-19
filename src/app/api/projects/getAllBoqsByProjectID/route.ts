import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Validate project_id
    if (!body.project_id) {
      return NextResponse.json(
        { error: "Project ID is required" },
        { status: 400 }
      );
    }

    const query = `
      SELECT * FROM vw_boq_headers WHERE project_id = ?
    `;

    const values = [Number(body.project_id)];

    const [rows]: any = await db.query(query, values);

    return NextResponse.json(
      {
        data: rows,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error(err.sqlMessage);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}
