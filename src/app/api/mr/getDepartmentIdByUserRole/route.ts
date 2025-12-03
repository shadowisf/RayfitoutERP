import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const [rows] = await db.query(
      "SELECT * FROM lut_mr_headers_departments WHERE value = ? LIMIT 1",
      [body.role]
    );

    const department = (rows as any[])[0] ?? null;

    return NextResponse.json(department, { status: 200 });
  } catch (err: any) {
    console.error(err.sqlMessage || err.message);
    return NextResponse.json(
      { error: err.sqlMessage || err.message },
      { status: 500 }
    );
  }
}
