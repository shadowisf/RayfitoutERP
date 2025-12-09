import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const query = `
      SELECT * FROM lpo WHERE mr_header_id = ?;
    `;

    const [rows]: any = await db.query(query, [Number(body.mr_header_id)]);

    return NextResponse.json({ data: rows, success: true });
  } catch (err: any) {
    console.error(err.sqlMessage);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}
