// app/api/stock/getStocksByBatch/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2";

export async function POST(req: Request) {
  try {
    const { inventory_item_ids } = await req.json();

    if (!inventory_item_ids || !Array.isArray(inventory_item_ids)) {
      return NextResponse.json(
        { error: "inventory_item_ids array is required" },
        { status: 400 },
      );
    }

    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT 
        id,
        inventory_item_id,
        location,
        project_id,
        quantity,
        created_at
      FROM stocks
      WHERE inventory_item_id IN (?)
      ORDER BY created_at DESC`,
      [inventory_item_ids],
    );

    return NextResponse.json({
      success: true,
      data: rows,
    });
  } catch (error: any) {
    console.error("Error fetching stocks by batch:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch stocks",
      },
      { status: 500 },
    );
  }
}
