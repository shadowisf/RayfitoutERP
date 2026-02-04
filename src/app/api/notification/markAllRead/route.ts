import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function PATCH(req: Request) {
  try {
    const body = await req.json();

    const query = "UPDATE notification SET is_read = 1 WHERE department_id = ?";

    await db.query(query, [body.department_id]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Mark read error:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
