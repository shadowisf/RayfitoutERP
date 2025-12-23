import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { inventoryItemId } = body;

    if (!inventoryItemId) {
      return NextResponse.json(
        {
          success: false,
          message: "Inventory item ID is required",
        },
        { status: 400 }
      );
    }

    try {
      // Query to get all stocks for the inventory item
      // Filtering by type: 'Add' and 'Transfer' = STOCK_ADDED, 'Issue' = STOCK_ISSUED
      const query = `
        SELECT *
        FROM stocks
        WHERE inventory_item_id = ?
        ORDER BY created_at DESC
      `;

      const [rows] = await db.execute<RowDataPacket[]>(query, [
        inventoryItemId,
      ]);

      return NextResponse.json({
        success: true,
        rows: rows,
      });
    } catch (error) {
      console.error("Database query error:", error);
      return NextResponse.json(
        {
          success: false,
          message: "Failed to fetch stock data",
          error: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Request processing error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to process request",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
