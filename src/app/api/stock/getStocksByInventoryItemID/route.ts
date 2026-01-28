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
        { status: 400 },
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
      // Get all transfer/issue transactions for this inventory item
      const transferIssueQuery = `
        SELECT 
          sti.id,
          sti.project_id,
          sti.created_on,
          sti.type,
          sti.transferee,
          sti.purpose,
          sti.from_location,
          sti.to_location,
          sti.receiver_name,
          sti.received,
          sti.received_on,
          sti.signed_tsc_file,
          sti.third_party_involved,
          sti.packing_list_required,
          jt.inventory_item_id,
          jt.quantity,
          jt.serial_number,
          jt.received_quantity,
          jt.attachment,
          i.description,
          i.unit,
          p.name as project_name,
          -- ✅ Get comma-separated BOQ IDs from junction table
          (SELECT GROUP_CONCAT(DISTINCT jt_boq.boq_line_id ORDER BY jt_boq.boq_line_id ASC SEPARATOR ', ')
           FROM jt_stocks_transfer_issue_boq_lines jt_boq
           WHERE jt_boq.stocks_transfer_issue_id = sti.id) AS boq_ids
        FROM stocks_transfer_issue sti
        INNER JOIN jt_stocks_transfer_issue_inventory_item jt ON sti.id = jt.stocks_transfer_issue_id
        INNER JOIN inventory i ON jt.inventory_item_id = i.id
        LEFT JOIN projects p ON sti.project_id = p.id
        WHERE jt.inventory_item_id = ?
        ORDER BY sti.created_on DESC
      `;
      const [transferIssueRows] = await db.execute<RowDataPacket[]>(
        transferIssueQuery,
        [inventoryItemId],
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
        { status: 500 },
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
      { status: 500 },
    );
  }
}
