import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { inventory_item_id, from_location, transaction_id } = body;

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

    const txnId = transaction_id ? Number(transaction_id) : null;

    // Get item details with attachment if transaction_id provided
    let itemDetails: RowDataPacket[];
    
    if (txnId) {
      const [result] = await db.query<RowDataPacket[]>(
        `
        SELECT 
          ii.id,
          ii.description,
          ii.unit,
          ii.image,
          jt.attachment,
          jt.quantity as original_quantity,
          jt.serial_number as original_serial_number,
          jt.length as original_length,
          jt.width as original_width,
          jt.height as original_height
        FROM inventory ii
        LEFT JOIN jt_stocks_transfer_issue_inventory_item jt 
          ON ii.id = jt.inventory_item_id 
          AND jt.stocks_transfer_issue_id = ?
        WHERE ii.id = ?
        `,
        [txnId, Number(inventory_item_id)],
      );
      itemDetails = result;
    } else {
      const [result] = await db.query<RowDataPacket[]>(
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
      itemDetails = result;
    }

    if (!itemDetails || itemDetails.length === 0) {
      return NextResponse.json(
        { error: "Item not found", success: false },
        { status: 404 },
      );
    }

    const item = itemDetails[0];

    // Calculate available quantity
    const [stockResult] = await db.query<RowDataPacket[]>(
      `
      SELECT COALESCE(SUM(s.quantity), 0) as total_stock
      FROM stocks s
      WHERE s.inventory_item_id = ? AND s.location = ?
      `,
      [Number(inventory_item_id), from_location],
    );

    // Get committed quantities (exclude current transaction if editing)
    let committedQuery = `
      SELECT COALESCE(SUM(jt.quantity), 0) as committed_quantity
      FROM stocks_transfer_issue sti
      JOIN jt_stocks_transfer_issue_inventory_item jt 
        ON sti.id = jt.stocks_transfer_issue_id
      WHERE jt.inventory_item_id = ?
        AND sti.from_location = ?
        AND sti.received = 0
    `;
    const committedParams: (number | string)[] = [
      Number(inventory_item_id),
      from_location,
    ];

    if (txnId) {
      committedQuery += ` AND sti.id != ?`;
      committedParams.push(txnId as number);
    }

    const [committedResult] = await db.query<RowDataPacket[]>(
      committedQuery,
      committedParams,
    );

    const totalStock = stockResult[0]?.total_stock || 0;
    const committedQty = committedResult[0]?.committed_quantity || 0;
    const availableQty = Math.max(0, totalStock - committedQty);

    // Parse attachment from JSON if needed
    let attachmentUrl: string | null = null;
    if (item.attachment) {
      if (typeof item.attachment === "string") {
        try {
          const parsed = JSON.parse(item.attachment);
          attachmentUrl = Array.isArray(parsed) ? parsed[0] : parsed;
        } catch {
          attachmentUrl = item.attachment;
        }
      } else if (Array.isArray(item.attachment)) {
        attachmentUrl = item.attachment[0];
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: item.id,
        description: item.description,
        unit: item.unit,
        image: item.image,
        available_qty: availableQty,
        attachment: attachmentUrl,
        original_quantity: item.original_quantity,
        original_serial_number: item.original_serial_number,
        original_length: item.original_length,
        original_width: item.original_width,
        original_height: item.original_height,
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