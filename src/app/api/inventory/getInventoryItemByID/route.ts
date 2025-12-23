import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  const body = await request.json();

  try {
    const [rows] = await db.query("SELECT * FROM vw_inventory WHERE id = ?", [
      body.id,
    ]);

    return NextResponse.json({
      success: true,
      rows,
    });
  } catch (error: any) {
    console.error(error.sqlMessage);
    return NextResponse.json(
      { error: error.sqlMessage, success: false },
      { status: 500 }
    );
  }
}
