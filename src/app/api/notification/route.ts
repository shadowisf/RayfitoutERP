import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { department_id, user_cognito_id } = body;

    // Return department-wide notifications (no user target) OR
    // notifications specifically targeting this user
    const query = `
      SELECT * FROM notification
      WHERE (department_id = ? AND user_cognito_id IS NULL)
         OR user_cognito_id = ?
    `;

    const [rows] = await db.query(query, [department_id, user_cognito_id]);

    return NextResponse.json({ rows, success: true });
  } catch (err) {
    console.error("Notification fetch error:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
