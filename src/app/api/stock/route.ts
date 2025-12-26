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
        (batch_id, mr_header_id, mr_line_id, inventory_item_id, supplier_id, received_by, reason_for_entry, quantity, unit_price, location, notes, project_id, boq_line_id, item_condition, attachment)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        nextBatchId,
        Number(body.mr_header_id) || null,
        Number(body.mr_line_id) || null,
        Number(body.inventory_item_id),
        Number(body.supplier_id) || null,
        body.received_by,
        body.reason_for_entry,
        Number(body.quantity),
        Number(body.unit_price),
        body.location,
        body.notes,
        Number(body.project_id) || null,
        Number(body.boq_line_id) || null,
        body.condition,
        body.attachment,
      ];

      await db.query(query, values);

      return NextResponse.json({
        success: true,
        batch_id: nextBatchId,
      });
    }

    if (body.action === "transferIssueStock") {
      // Check if this is a reverse transfer (transferring back to original location)
      if (body.type.includes("Transfer")) {
        // Find if there's an existing transfer that brought stock to the current "from" location
        const checkReverseTransferQuery = `
        SELECT id, quantity, from_location, to_location
        FROM stocks_transfer_issue 
        WHERE inventory_item_id = ? 
          AND type LIKE '%Transfer%' 
          AND to_location = ? 
          AND from_location = ?
        ORDER BY received_on DESC
        LIMIT 1
      `;

        const [existingTransfers] = await db.query<RowDataPacket[]>(
          checkReverseTransferQuery,
          [body.inventory_item_id, body.from, body.to]
        );

        // If we found a matching reverse transfer
        if (existingTransfers.length > 0) {
          const existingTransfer = existingTransfers[0];

          // If the quantity matches exactly, delete the transfer entry
          if (existingTransfer.quantity === Number(body.quantity)) {
            const deleteQuery = `
            DELETE FROM stocks_transfer_issue 
            WHERE id = ?
          `;
            await db.query(deleteQuery, [existingTransfer.id]);

            return NextResponse.json({
              success: true,
              message: "Transfer reversed and entry deleted",
              deletedId: existingTransfer.id,
            });
          }
          // If quantity is less, update the existing transfer quantity
          else if (existingTransfer.quantity > Number(body.quantity)) {
            const updateQuery = `
            UPDATE stocks_transfer_issue 
            SET quantity = quantity - ? 
            WHERE id = ?
          `;
            await db.query(updateQuery, [
              Number(body.quantity),
              existingTransfer.id,
            ]);

            return NextResponse.json({
              success: true,
              message: "Transfer quantity reduced",
              updatedId: existingTransfer.id,
            });
          }
          // If quantity is more, we need to create a new transfer for the difference
          else {
            console.log(
              "Quantity exceeds original transfer, creating new entry"
            );
          }
        } else {
          console.log("No matching reverse transfer found, creating new entry");
        }
      }

      // If not a reverse transfer, create a new transfer/issue entry as normal
      console.log("Creating new transfer/issue entry");

      const insertQuery = `
      INSERT INTO stocks_transfer_issue 
      (inventory_item_id, type, from_location, to_location, quantity, purpose, receiver_name, notes, serial_number, attachment) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

      const [insertResult] = await db.query(insertQuery, [
        body.inventory_item_id,
        body.type,
        body.from,
        body.to,
        body.quantity,
        body.purpose,
        body.receiver_name,
        body.notes,
        body.serial_number,
        body.attachment,
      ]);

      console.log("Insert result:", insertResult);

      return NextResponse.json({
        success: true,
        message: "Stock transferred/issued successfully",
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

    if (body.action === "receiveStock") {
      const query = `
        UPDATE stocks_transfer_issue
SET received = 1,
    received_on = NOW(),
    full_name_of_receiver = ?,
    received_quantity = ?
WHERE id = ?
      `;

      await db.query(query, [
        body.receiver_full_name,
        body.received_quantity,
        body.transfer_id,
      ]);

      return NextResponse.json({
        success: true,
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
