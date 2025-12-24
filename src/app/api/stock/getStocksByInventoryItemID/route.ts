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
      // Query stocks table
      const stocksQuery = `SELECT * FROM stocks WHERE inventory_item_id = ?`;
      const [stocksRows] = await db.execute<RowDataPacket[]>(stocksQuery, [
        inventoryItemId,
      ]);

      // Query stocks_transfer_issue table
      const transferIssueQuery = `SELECT * FROM stocks_transfer_issue WHERE inventory_item_id = ?`;
      const [transferIssueRows] = await db.execute<RowDataPacket[]>(
        transferIssueQuery,
        [inventoryItemId]
      );

      // Add source identifier to each row
      const stocksWithSource = stocksRows.map((row) => ({
        ...row,
        source_table: "stocks",
      }));

      const transferIssueWithSource = transferIssueRows.map((row) => ({
        ...row,
        source_table: "stocks_transfer_issue",
      }));

      // Combine and return
      const stocks = [...stocksWithSource];
      const stocksTransferIssue = [...transferIssueWithSource];

      return NextResponse.json({
        success: true,
        stocks: stocks,
        stocksTransferIssue: stocksTransferIssue,
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
