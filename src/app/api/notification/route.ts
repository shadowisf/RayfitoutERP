import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const query = "SELECT * FROM notification WHERE department_id = ?";

    const [rows] = await db.query(query, [body.department_id]);

    return NextResponse.json({ rows, success: true });
  } catch (err) {
    console.error("Mark read error:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
