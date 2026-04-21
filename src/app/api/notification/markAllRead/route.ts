import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { department_id, user_cognito_id } = body;

    await db.query(
      `UPDATE notification SET is_read = 1
       WHERE (department_id = ? AND user_cognito_id IS NULL)
          OR user_cognito_id = ?`,
      [department_id, user_cognito_id],
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Mark all read error:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
