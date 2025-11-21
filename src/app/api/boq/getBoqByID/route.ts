import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json();

    const [rows] = await db.query(
      "SELECT * FROM projects_boq_headers WHERE project_id = ?",
      [id]
    );

    return NextResponse.json(rows, { status: 200 });
  } catch (err) {
    console.error("API Error:", err);
    return NextResponse.json(
      { error: "Database query failed" },
      { status: 500 }
    );
  }
}
