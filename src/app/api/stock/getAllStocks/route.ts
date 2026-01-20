import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const [rows]: any = await db.query(`
      SELECT 
        id,
        inventory_item_id,
        location,
        project_id,
        quantity,
        created_at
      FROM stocks
      ORDER BY created_at DESC
    `);

    return NextResponse.json({
      success: true,
      data: rows,
    });
  } catch (error: any) {
    console.error("Error fetching all stocks:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch stocks",
      },
      { status: 500 }
    );
  }
}
