import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { inventory_item_id, from_location } = body;

    if (!inventory_item_id) {
      return NextResponse.json(
        { error: "Missing inventory_item_id", success: false },
        { status: 400 },
      );
    }

    if (!from_location) {
      return NextResponse.json(
        { error: "Missing from_location", success: false },
        { status: 400 },
      );
    }

    // Get item basic details from inventory_items table
    const [itemDetails] = await db.query<RowDataPacket[]>(
      `
      SELECT 
        ii.id,
        ii.description,
        ii.unit,
        ii.image
      FROM inventory ii
      WHERE ii.id = ?
      `,
      [Number(inventory_item_id)],
    );

    if (!itemDetails || itemDetails.length === 0) {
      return NextResponse.json(
        { error: "Item not found", success: false },
        { status: 404 },
      );
    }

    const item = itemDetails[0];

    // Calculate available quantity at the specified location
    // Sum of all stock entries minus quantities in pending transfers/issues from that location
    const [stockResult] = await db.query<RowDataPacket[]>(
      `
      SELECT 
        COALESCE(SUM(s.quantity), 0) as total_stock
      FROM stocks s
      WHERE s.inventory_item_id = ? 
        AND s.location = ?
      `,
      [Number(inventory_item_id), from_location],
    );

    // Get quantities committed in pending transfers/issues from this location
    const [committedResult] = await db.query<RowDataPacket[]>(
      `
      SELECT 
        COALESCE(SUM(jt.quantity), 0) as committed_quantity
      FROM stocks_transfer_issue sti
      JOIN jt_stocks_transfer_issue_inventory_item jt 
        ON sti.id = jt.stocks_transfer_issue_id
      WHERE jt.inventory_item_id = ?
        AND sti.from_location = ?
        AND sti.received = 0
      `,
      [Number(inventory_item_id), from_location],
    );

    const totalStock = stockResult[0]?.total_stock || 0;
    const committedQty = committedResult[0]?.committed_quantity || 0;
    const availableQty = Math.max(0, totalStock - committedQty);

    return NextResponse.json({
      success: true,
      data: {
        id: item.id,
        description: item.description,
        unit: item.unit,
        image: item.image,
        available_qty: availableQty,
      },
    });
  } catch (error: any) {
    console.error("Error fetching transaction item details:", error);
    return NextResponse.json(
      { error: error.sqlMessage || error.message, success: false },
      { status: 500 },
    );
  }
}
