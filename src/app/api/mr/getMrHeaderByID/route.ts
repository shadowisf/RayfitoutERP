import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const query = `
      SELECT * FROM vw_mr_headers WHERE id = ?`;

    const values = [Number(body.id)];

    const [rows]: any = await db.query(query, values);

    return NextResponse.json(rows[0], { status: 200 });
  } catch (err: any) {
    console.error(err.sqlMessage);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}
