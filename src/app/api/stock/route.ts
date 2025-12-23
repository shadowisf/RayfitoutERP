import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.action === "addStock") {
      // Get the max batch_id for this inventory_item_id
      const maxBatchQuery = `
        SELECT COALESCE(MAX(batch_id), 0) as max_batch_id 
        FROM stocks 
        WHERE inventory_item_id = ?
      `;

      const [batchResult] = await db.query<RowDataPacket[]>(maxBatchQuery, [
        Number(body.inventory_item_id),
      ]);

      // Get the next batch_id (max + 1)
      const nextBatchId = batchResult[0].max_batch_id + 1;

      const query = `
        INSERT INTO stocks 
        (batch_id, mr_header_id, mr_line_id, inventory_item_id, supplier_id, received_by, quantity, location, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        nextBatchId,
        Number(body.mr_header_id) || null,
        Number(body.mr_line_id) || null,
        Number(body.inventory_item_id),
        body.supplier_id || null,
        body.received_by,
        Number(body.quantity),
        body.location,
        body.notes,
      ];

      await db.query(query, values);

      return NextResponse.json({
        success: true,
        batch_id: nextBatchId,
      });
    }

    if (body.action === "transferIssueStock") {
      const query = `
        INSERT INTO stocks_transfer_issue 
        (inventory_item_id, type, from_location, to_location, quantity, purpose, receiver_name)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        Number(body.inventory_item_id),
        body.type,
        body.from,
        body.to,
        body.quantity,
        body.purpose,
        body.receiver_name,
      ];

      await db.query(query, values);

      return NextResponse.json({
        success: true,
      });
    }
  } catch (error: any) {
    console.error(error.sqlMessage);
    return NextResponse.json(
      { error: error.sqlMessage, success: false },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.action === "updateStock") {
      const { id, inventory_item_id, location, notes } = body;

      // Validate required fields
      if (!id) {
        return NextResponse.json(
          { error: "Missing stock ID", success: false },
          { status: 400 }
        );
      }

      const query = `
        UPDATE stocks
        SET 
          inventory_item_id = ?,
          location = ?,
          notes = ?
        WHERE id = ?
      `;

      await db.query(query, [
        Number(inventory_item_id),
        location,
        notes || null,
        Number(id),
      ]);

      return NextResponse.json({
        success: true,
        message: "Stock updated successfully",
      });
    }
  } catch (error: any) {
    console.error("Error updating stock:", error);
    return NextResponse.json(
      { error: error.sqlMessage || error.message, success: false },
      { status: 500 }
    );
  }
}
