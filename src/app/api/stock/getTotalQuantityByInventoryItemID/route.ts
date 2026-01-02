import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { inventory_item_id } = body;

    if (!inventory_item_id) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing inventory_item_id",
        },
        { status: 400 }
      );
    }

    // Get total stock quantity and batch count from stocks table
    const stockQuery = `
      SELECT 
        inventory_item_id,
        SUM(quantity) as total_quantity,
        COUNT(*) as batch_count
      FROM stocks
      WHERE inventory_item_id = ?
      GROUP BY inventory_item_id
    `;

    const [stockRows] = await db.query<RowDataPacket[]>(stockQuery, [
      Number(inventory_item_id),
    ]);

    const totalStock = stockRows.length > 0 ? stockRows[0].total_quantity : 0;
    const batchCount = stockRows.length > 0 ? stockRows[0].batch_count : 0;

    // Get total issued quantity from stocks_transfer_issue table where type contains 'issue'
    const issueQuery = `
      SELECT 
        COALESCE(SUM(quantity), 0) as total_issued
      FROM stocks_transfer_issue
      WHERE inventory_item_id = ?
      AND LOWER(type) LIKE '%issue%'
    `;

    const [issueRows] = await db.query<RowDataPacket[]>(issueQuery, [
      Number(inventory_item_id),
    ]);

    const totalIssued = issueRows.length > 0 ? issueRows[0].total_issued : 0;

    // Calculate available quantity (stock minus issued)
    const availableQuantity = totalStock - totalIssued;

    return NextResponse.json({
      success: true,
      message: "Stock quantity retrieved successfully",
      data: {
        inventory_item_id: Number(inventory_item_id),
        total_quantity: totalStock,
        total_issued: totalIssued,
        available_quantity: availableQuantity,
        batch_count: batchCount,
      },
    });
  } catch (error: any) {
    console.error("Error fetching stock quantity:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch stock quantity",
        error: error.sqlMessage || error.message,
      },
      { status: 500 }
    );
  }
}
