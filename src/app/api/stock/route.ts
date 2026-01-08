import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2";

export async function GET() {
  try {
    const [rows] = await db.query("SELECT * FROM vw_stocks_with_supplier");

    return NextResponse.json(rows, { status: 200 });
  } catch (err: any) {
    console.error("SQL Error:", err.sqlMessage);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}

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
        (batch_id, mr_header_id, mr_line_id, inventory_item_id, supplier_id, received_by, reason_for_entry, quantity, unit_price, location, notes, project_id, boq_line_id, item_condition, grn_file, qc_report_file, lpo_file, dn_file)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        Number(body.unit_price) || null,
        body.location,
        body.notes,
        Number(body.project_id) || null,
        Number(body.boq_line_id) || null,
        body.condition,
        body.grn_file || null,
        body.qc_report_file || null,
        body.lpo_file || null,
        body.dn_file || null,
      ];

      await db.query(query, values);

      return NextResponse.json({
        success: true,
        batch_id: nextBatchId,
      });
    }

    if (body.action === "transferIssueStock") {
      // Check if this is a reverse transfer (transferring back to original location)
      if (body.type.toLowerCase().includes("transfer")) {
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

      const insertQuery = `
      INSERT INTO stocks_transfer_issue 
      (inventory_item_id, type, transferee, from_location, to_location, quantity, purpose, receiver_name, serial_number, attachment, third_party_involved, project_id, boq_line_id) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

      await db.query(insertQuery, [
        body.inventory_item_id,
        body.type,
        body.transferee,
        body.from,
        body.to,
        body.quantity,
        body.purpose,
        body.receiver_name,
        body.serial_number,
        body.attachment || null,
        body.third_party_involved,
        Number(body.project_id) || null,
        Number(body.boq_line_id) || null,
      ]);

      return NextResponse.json({
        success: true,
        message: "Stock transferred/issued successfully",
      });
    }

    if (body.action === "transferIssueMultipleStocks") {
      const connection = await db.getConnection();

      try {
        await connection.beginTransaction();

        for (const item of body.items) {
          const insertQuery = `
        INSERT INTO stocks_transfer_issue 
        (inventory_item_id, type, transferee, from_location, to_location, quantity, purpose, receiver_name, attachment, third_party_involved, project_id, boq_line_id) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

          await connection.query(insertQuery, [
            item.inventory_item_id,
            body.type,
            body.transferee,
            body.from,
            body.to || null,
            item.quantity,
            body.purpose,
            body.receiver_name,
            body.attachment || null,
            body.third_party_involved,
            Number(body.project_id) || null,
            Number(body.boq_line_id) || null,
          ]);
        }

        await connection.commit();
        connection.release();

        return NextResponse.json({
          success: true,
          message: "Multiple stocks transferred/issued successfully",
        });
      } catch (error) {
        await connection.rollback();
        connection.release();
        throw error;
      }
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

    if (body.action === "updateSignedTSC") {
      const query = `
        UPDATE stocks_transfer_issue
SET received = 1,
    received_on = NOW(),
    signed_tsc_file = ?
WHERE id = ?
      `;

      await db.query(query, [body.signed_tsc_file, body.transaction_id]);

      return NextResponse.json({
        success: true,
      });
    }

    if (body.action === "deleteSignedTSC") {
      const query = `
        UPDATE stocks_transfer_issue
SET signed_tsc_file = NULL, received = 0
WHERE id = ?
      `;

      await db.query(query, [body.transaction_id]);

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
