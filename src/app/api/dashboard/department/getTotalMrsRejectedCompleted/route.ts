import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const [rows]: any = await db.query(`
  SELECT
    
`);

    return NextResponse.json(rows[0], { status: 200 });
  } catch (err: any) {
    console.error(err.sqlMessage);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}
