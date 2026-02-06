import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function DELETE(req: Request) {
  try {
    const body = await req.json();

    const query = "DELETE FROM notification WHERE id = ?";

    await db.query(query, [body.id]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Mark read error:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
