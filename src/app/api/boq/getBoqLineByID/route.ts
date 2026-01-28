import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = body.id;

    const [rows]: any = await db.query(
      `SELECT * FROM vw_boq_lines WHERE id = ? ORDER BY 
    category_order ASC, 
    subcategory_order ASC, 
    item_order ASC`,
      [id],
    );

    return NextResponse.json(rows[0]);
  } catch (err: any) {
    console.error(err.sqlMessage);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}
