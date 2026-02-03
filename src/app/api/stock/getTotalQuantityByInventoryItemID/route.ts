import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { inventory_item_id, project_id, location } = body;

    if (!inventory_item_id) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing inventory_item_id",
        },
        { status: 400 },
      );
    }

    // ✅ Query 1: Get total stock from stocks table
    let stockQuery = `
      SELECT 
        inventory_item_id,
        CAST(SUM(quantity) AS DECIMAL(15,2)) as total_quantity,
        COUNT(*) as batch_count
      FROM stocks
      WHERE inventory_item_id = ?
    `;

    const stockParams: any[] = [Number(inventory_item_id)];

    // Add filters if provided
    if (project_id) {
      stockQuery += ` AND project_id = ?`;
      stockParams.push(Number(project_id));
    }

    if (location) {
      stockQuery += ` AND location = ?`;
      stockParams.push(location);
    }

    stockQuery += ` GROUP BY inventory_item_id`;

    const [stockRows] = await db.query<RowDataPacket[]>(
      stockQuery,
      stockParams,
    );

    // ✅ Convert to Number explicitly and parse as float
    const totalStock =
      stockRows.length > 0 ? parseFloat(stockRows[0].total_quantity) : 0;
    const batchCount =
      stockRows.length > 0 ? Number(stockRows[0].batch_count) : 0;

    // ✅ Query 2: Get total ISSUED quantity (NO received filter - issues count regardless)
    const issueQuery = `
      SELECT 
        CAST(COALESCE(SUM(jt.quantity), 0) AS DECIMAL(15,2)) as total_issued
      FROM stocks_transfer_issue sti
      INNER JOIN jt_stocks_transfer_issue_inventory_item jt 
        ON sti.id = jt.stocks_transfer_issue_id
      WHERE jt.inventory_item_id = ?
        AND LOWER(sti.type) LIKE '%issue%'
    `;

    const [issueRows] = await db.query<RowDataPacket[]>(issueQuery, [
      Number(inventory_item_id),
    ]);

    const totalIssued =
      issueRows.length > 0 ? parseFloat(issueRows[0].total_issued) : 0;

    // ✅ Query 3: Get total TRANSFERRED OUT quantity (only count received transfers)
    const transferOutQuery = `
      SELECT 
        CAST(COALESCE(SUM(jt.quantity), 0) AS DECIMAL(15,2)) as total_transferred_out
      FROM stocks_transfer_issue sti
      INNER JOIN jt_stocks_transfer_issue_inventory_item jt 
        ON sti.id = jt.stocks_transfer_issue_id
      WHERE jt.inventory_item_id = ?
        AND LOWER(sti.type) LIKE '%transfer%'
        AND sti.received = 1
    `;

    const [transferOutRows] = await db.query<RowDataPacket[]>(
      transferOutQuery,
      [Number(inventory_item_id)],
    );

    const totalTransferredOut =
      transferOutRows.length > 0
        ? parseFloat(transferOutRows[0].total_transferred_out)
        : 0;

    // ✅ Query 4: Get total TRANSFERRED IN quantity (only count received transfers to specific location if filtering)
    let transferInQuery = `
      SELECT 
        CAST(COALESCE(SUM(jt.quantity), 0) AS DECIMAL(15,2)) as total_transferred_in
      FROM stocks_transfer_issue sti
      INNER JOIN jt_stocks_transfer_issue_inventory_item jt 
        ON sti.id = jt.stocks_transfer_issue_id
      WHERE jt.inventory_item_id = ?
        AND LOWER(sti.type) LIKE '%transfer%'
        AND sti.received = 1
    `;

    const transferInParams: any[] = [Number(inventory_item_id)];

    // If filtering by location, only count transfers TO that location
    if (location) {
      transferInQuery += ` AND sti.to_location = ?`;
      transferInParams.push(location);
    }

    const [transferInRows] = await db.query<RowDataPacket[]>(
      transferInQuery,
      transferInParams,
    );

    const totalTransferredIn =
      transferInRows.length > 0
        ? parseFloat(transferInRows[0].total_transferred_in)
        : 0;

    // ✅ Calculate available quantity
    // Formula: Stock + Transfers IN - Transfers OUT - Issues
    let availableQuantity = totalStock - totalIssued - totalTransferredOut;

    // Only add transfers IN if not filtering by location
    // (when filtering by location, stock table already includes location-specific stock)
    if (!location) {
      availableQuantity += totalTransferredIn;
    }

    // ✅ Round to 2 decimal places and ensure non-negative
    availableQuantity = Math.max(0, Math.round(availableQuantity * 100) / 100);

    return NextResponse.json({
      success: true,
      message: "Stock quantity retrieved successfully",
      data: {
        inventory_item_id: Number(inventory_item_id),
        total_stock: Math.round(totalStock * 100) / 100,
        total_issued: Math.round(totalIssued * 100) / 100,
        total_transferred_out: Math.round(totalTransferredOut * 100) / 100,
        total_transferred_in: Math.round(totalTransferredIn * 100) / 100,
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
      { status: 500 },
    );
  }
}
