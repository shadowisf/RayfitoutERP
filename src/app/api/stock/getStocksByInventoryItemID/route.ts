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
      // Query stocks using the view with supplier information
      const stocksQuery = `
        SELECT * 
        FROM vw_stocks_with_supplier 
        WHERE inventory_item_id = ?
      `;
      const [stocksRows] = await db.execute<RowDataPacket[]>(stocksQuery, [
        inventoryItemId,
      ]);

      // Query stocks_transfer_issue table with junction table
      // Note: You'll need to create a view for this or adjust the query
      const transferIssueQuery = `
        SELECT 
          sti.*,
          jt.inventory_item_id,
          jt.quantity,
          jt.serial_number,
          jt.received_quantity,
          i.description,
          i.unit
        FROM stocks_transfer_issue sti
        INNER JOIN jt_stocks_transfer_issue_inventory_item jt ON sti.id = jt.stocks_transfer_issue_id
        INNER JOIN inventory i ON jt.inventory_item_id = i.id
        WHERE jt.inventory_item_id = ?
      `;
      const [transferIssueRows] = await db.execute<RowDataPacket[]>(
        transferIssueQuery,
        [inventoryItemId]
      );

      // Add source identifier and handle null suppliers
      const stocksWithSource = stocksRows.map((row) => ({
        ...row,
        supplier_name: row.supplier_name || "Others",
        source_table: "stocks",
      }));

      const transferIssueWithSource = transferIssueRows.map((row) => ({
        ...row,
        source_table: "stocks_transfer_issue",
      }));

      return NextResponse.json({
        success: true,
        stocks: stocksWithSource,
        stocksTransferIssue: transferIssueWithSource,
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
