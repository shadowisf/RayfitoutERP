import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const [result]: any = await db.query(
      `
      SELECT COUNT(*) AS count
      FROM stocks_transfer_issue
      WHERE received = 0
      `,
    );

    return NextResponse.json({
      success: true,
      count: Number(result[0].count),
    });
  } catch (error) {
    console.error("Error fetching pending stock transfers:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch pending stock transfers" },
      { status: 500 },
    );
  }
}
