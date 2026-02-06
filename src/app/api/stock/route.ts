import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ResultSetHeader, RowDataPacket } from "mysql2";

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

      // ✅ Insert stock WITHOUT boq_line_id
      const query = `
    INSERT INTO stocks 
    (batch_id, mr_header_id, mr_line_id, inventory_item_id, supplier_id, received_by, reason_for_entry, quantity, unit_price, location, notes, project_id, item_condition, grn_file, qc_report_file, lpo_file, dn_file)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

      const values = [
        nextBatchId,
        Number(body.mr_header_id) || null,
        Number(body.mr_line_id) || null,
        Number(body.inventory_item_id),
        Number(body.supplier_id) || null,
        body.received_by,
        body.reason_for_entry,
        parseFloat(body.quantity),
        parseFloat(body.unit_price) || null,
        body.location,
        body.notes,
        Number(body.project_id) || null,
        body.condition,
        body.grn_file || null,
        body.qc_report_file || null,
        body.lpo_file || null,
        body.dn_file || null,
      ];

      const [result] = await db.query<ResultSetHeader>(query, values);
      const stockId = result.insertId;

      // ✅ Insert BOQ associations into junction table
      const boqLineIds = Array.isArray(body.boq_line_ids)
        ? body.boq_line_ids
        : body.boq_line_ids
          ? [body.boq_line_ids]
          : [];

      const validBoqLineIds = boqLineIds
        .filter((id: any) => id && !isNaN(Number(id)))
        .map((id: any) => Number(id));

      if (validBoqLineIds.length > 0) {
        const boqJunctionQuery = `INSERT INTO jt_stocks_boq_lines (stock_id, boq_line_id) VALUES ?`;
        const boqJunctionValues = validBoqLineIds.map((boqId: number) => [
          stockId,
          boqId,
        ]);
        await db.query(boqJunctionQuery, [boqJunctionValues]);
      }

      if (body.manually_add === true) {
        await db.query(
          `INSERT INTO notification (inventory_item_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
          [
            body.inventory_item_id,
            8,
            "Stock Added",
            `${+body.quantity % 1 === 0 ? +body.quantity : +body.quantity} ${body.inventory_item_unit} was added to ${body.inventory_item_description}`,
          ],
        );

        await db.query(
          `INSERT INTO notification (inventory_item_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
          [
            body.inventory_item_id,
            16,
            "Stock Added",
            `${+body.quantity % 1 === 0 ? +body.quantity : +body.quantity} ${body.inventory_item_unit} was added to ${body.inventory_item_description}`,
          ],
        );

        await db.query(
          `INSERT INTO notification (inventory_item_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
          [
            body.inventory_item_id,
            11,
            "Stock Added",
            `${+body.quantity % 1 === 0 ? +body.quantity : +body.quantity} ${body.inventory_item_unit} was added to ${body.inventory_item_description}`,
          ],
        );
      }

      return NextResponse.json({
        success: true,
        batch_id: nextBatchId,
        stock_id: stockId,
      });
    }

    if (body.action === "transferIssueStock") {
      try {
        // Check if this is a reverse transfer (transferring back to original location)
        if (body.type.toLowerCase().includes("transfer")) {
          // Find if there's an existing transfer that brought stock to the current "from" location
          const checkReverseTransferQuery = `
        SELECT sti.id, jt.inventory_item_id, jt.quantity, sti.from_location, sti.to_location
        FROM stocks_transfer_issue sti
        JOIN jt_stocks_transfer_issue_inventory_item jt ON sti.id = jt.stocks_transfer_issue_id
        WHERE jt.inventory_item_id = ? 
          AND sti.type LIKE '%Transfer%' 
          AND sti.to_location = ? 
          AND sti.from_location = ?
        ORDER BY sti.received_on DESC
        LIMIT 1
      `;

          const [existingTransfers] = await db.query<RowDataPacket[]>(
            checkReverseTransferQuery,
            [body.inventory_item_id, body.from, body.to],
          );

          // If we found a matching reverse transfer
          if (existingTransfers.length > 0) {
            const existingTransfer = existingTransfers[0];

            // If the quantity matches exactly, delete the junction entry
            if (existingTransfer.quantity === Number(body.quantity)) {
              const deleteJunctionQuery = `
            DELETE FROM jt_stocks_transfer_issue_inventory_item 
            WHERE stocks_transfer_issue_id = ? AND inventory_item_id = ?
          `;
              await db.query(deleteJunctionQuery, [
                existingTransfer.id,
                body.inventory_item_id,
              ]);

              // Check if the transfer has any other items
              const [remainingItems] = await db.query<RowDataPacket[]>(
                `SELECT COUNT(*) as count FROM jt_stocks_transfer_issue_inventory_item WHERE stocks_transfer_issue_id = ?`,
                [existingTransfer.id],
              );

              // If no other items, delete the transfer header
              if (remainingItems[0].count === 0) {
                const deleteTransferQuery = `
              DELETE FROM stocks_transfer_issue 
              WHERE id = ?
            `;
                await db.query(deleteTransferQuery, [existingTransfer.id]);
              }

              return NextResponse.json({
                success: true,
                message: "Transfer reversed and entry deleted",
                deletedId: existingTransfer.id,
              });
            }
            // If quantity is less, update the existing junction entry quantity
            else if (existingTransfer.quantity > Number(body.quantity)) {
              const updateQuery = `
            UPDATE jt_stocks_transfer_issue_inventory_item 
            SET quantity = quantity - ? 
            WHERE stocks_transfer_issue_id = ? AND inventory_item_id = ?
          `;
              await db.query(updateQuery, [
                Number(body.quantity),
                existingTransfer.id,
                body.inventory_item_id,
              ]);

              return NextResponse.json({
                success: true,
                message: "Transfer quantity reduced",
                updatedId: existingTransfer.id,
              });
            }
          }
        }

        // If not a reverse transfer, create a new transfer/issue entry
        // ✅ Removed boq_line_id from header
        const insertTransferQuery = `
      INSERT INTO stocks_transfer_issue 
      (project_id, transferee, type, from_location, to_location, purpose, receiver_name, third_party_involved, packing_list_required) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

        const [transferResult] = await db.query<any>(insertTransferQuery, [
          Number(body.project_id) || null,
          body.transferee,
          body.type,
          body.from,
          body.to,
          body.purpose,
          body.receiver_name,
          body.third_party_involved,
          body.packing_list_required,
        ]);

        const transferId = transferResult.insertId;

        // ✅ Insert into inventory item junction table WITH attachment for this specific item
        const insertJunctionQuery = `
      INSERT INTO jt_stocks_transfer_issue_inventory_item 
      (stocks_transfer_issue_id, inventory_item_id, quantity, serial_number, attachment) 
      VALUES (?, ?, ?, ?, ?)
    `;

        await db.query(insertJunctionQuery, [
          transferId,
          body.inventory_item_id,
          body.quantity,
          body.serial_number || null,
          body.attachment || null,
        ]);

        // ✅ Insert BOQ associations into junction table
        const boqLineIds = Array.isArray(body.boq_line_ids)
          ? body.boq_line_ids
          : body.boq_line_ids
            ? [body.boq_line_ids]
            : [];

        const validBoqLineIds = boqLineIds
          .filter((id: any) => id && !isNaN(Number(id)))
          .map((id: any) => Number(id));

        if (validBoqLineIds.length > 0) {
          const boqJunctionQuery = `INSERT INTO jt_stocks_transfer_issue_boq_lines (stocks_transfer_issue_id, boq_line_id) VALUES ?`;
          const boqJunctionValues = validBoqLineIds.map((boqId: number) => [
            transferId,
            boqId,
          ]);
          await db.query(boqJunctionQuery, [boqJunctionValues]);
        }

        if (body.type.toLowerCase().includes("issue")) {
          await db.query(
            "INSERT INTO notification (transfer_id, department_id, header, message) VALUES (?, ?, ?, ?)",
            [
              transferId,
              11,
              "Stock Issued",
              `${body.inventory_item_name} was issued to ${body.receiver_name}`,
            ],
          );
        }

        if (body.type.toLowerCase().includes("transfer")) {
          await db.query(
            "INSERT INTO notification (transfer_id, department_id, header, message) VALUES (?, ?, ?, ?)",
            [
              transferId,
              11,
              "Stock Transferred",
              `${body.inventory_item_name} was transferred from ${body.from} to ${body.to}`,
            ],
          );
        }

        if (body.type.toLowerCase().includes("send")) {
          await db.query(
            "INSERT INTO notification (transfer_id, department_id, header, message) VALUES (?, ?, ?, ?)",
            [
              transferId,
              11,
              "Stock Sent",
              `${body.inventory_item_name} was sent for processing (${body.purpose})`,
            ],
          );
        }

        return NextResponse.json({
          success: true,
          message: "Stock transferred/issued successfully",
          transferId: transferId,
        });
      } catch (error) {
        throw error;
      }
    }

    if (body.action === "transferIssueMultipleStocks") {
      try {
        // ✅ Insert the transfer header WITHOUT boq_line_id and attachments
        const insertTransferQuery = `
      INSERT INTO stocks_transfer_issue 
      (project_id, transferee, type, from_location, to_location, purpose, receiver_name, third_party_involved, packing_list_required) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

        const [transferResult] = await db.query<any>(insertTransferQuery, [
          Number(body.project_id) || null,
          body.transferee,
          body.type,
          body.from,
          body.to || null,
          body.purpose,
          body.receiver_name,
          body.third_party_involved,
          body.packing_list_required,
        ]);

        const transferId = transferResult.insertId;

        // ✅ Insert all items into the junction table WITH individual attachments
        for (const item of body.items) {
          const insertJunctionQuery = `
        INSERT INTO jt_stocks_transfer_issue_inventory_item 
        (stocks_transfer_issue_id, inventory_item_id, quantity, serial_number, attachment) 
        VALUES (?, ?, ?, ?, ?)
      `;

          await db.query(insertJunctionQuery, [
            transferId,
            item.inventory_item_id,
            item.quantity,
            item.serial_number || null,
            item.attachment ? JSON.stringify([item.attachment]) : null,
          ]);
        }

        // ✅ Insert BOQ associations into junction table
        const boqLineIds = Array.isArray(body.boq_line_ids)
          ? body.boq_line_ids
          : body.boq_line_ids
            ? [body.boq_line_ids]
            : [];

        const validBoqLineIds = boqLineIds
          .filter((id: any) => id && !isNaN(Number(id)))
          .map((id: any) => Number(id));

        if (validBoqLineIds.length > 0) {
          const boqJunctionQuery = `INSERT INTO jt_stocks_transfer_issue_boq_lines (stocks_transfer_issue_id, boq_line_id) VALUES ?`;
          const boqJunctionValues = validBoqLineIds.map((boqId: number) => [
            transferId,
            boqId,
          ]);
          await db.query(boqJunctionQuery, [boqJunctionValues]);
        }

        // ✅ Create summarized notification with all inventory items
        const inventoryNames = body.items
          .map((item: any) => item.inventory_item_name || "Unknown Item")
          .join(", ");

        if (body.type.toLowerCase().includes("issue")) {
          await db.query(
            "INSERT INTO notification (transfer_id, department_id, header, message) VALUES (?, ?, ?, ?)",
            [
              transferId,
              11,
              "Stock Issued",
              `${inventoryNames} was issued to ${body.receiver_name}`,
            ],
          );
        }

        if (body.type.toLowerCase().includes("transfer")) {
          await db.query(
            "INSERT INTO notification (transfer_id, department_id, header, message) VALUES (?, ?, ?, ?)",
            [
              transferId,
              11,
              "Stock Transferred",
              `${inventoryNames} was transferred from ${body.from} to ${body.to}`,
            ],
          );
        }

        if (body.type.toLowerCase().includes("send")) {
          await db.query(
            "INSERT INTO notification (transfer_id, department_id, header, message) VALUES (?, ?, ?, ?)",
            [
              transferId,
              11,
              "Stock Sent",
              `${inventoryNames} was sent for processing (${body.purpose})`,
            ],
          );
        }

        return NextResponse.json({
          success: true,
          message: "Multiple stocks transferred/issued successfully",
          transferId: transferId,
        });
      } catch (error) {
        throw error;
      }
    }
  } catch (error: any) {
    console.error(error.sqlMessage);
    return NextResponse.json(
      { error: error.sqlMessage, success: false },
      { status: 500 },
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
          { status: 400 },
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
      try {
        await db.beginTransaction();

        // Update the transfer header
        const updateTransferQuery = `
          UPDATE stocks_transfer_issue
          SET received = 1,
              received_on = NOW(),
              full_name_of_receiver = ?
          WHERE id = ?
        `;

        await db.query(updateTransferQuery, [
          body.receiver_full_name,
          body.transfer_id,
        ]);

        // Update the junction table with received quantity
        // Assuming body.items is an array of {inventory_item_id, received_quantity}
        if (body.items && Array.isArray(body.items)) {
          for (const item of body.items) {
            const updateJunctionQuery = `
              UPDATE jt_stocks_transfer_issue_inventory_item
              SET received_quantity = ?
              WHERE stocks_transfer_issue_id = ? AND inventory_item_id = ?
            `;

            await db.query(updateJunctionQuery, [
              item.received_quantity,
              body.transfer_id,
              item.inventory_item_id,
            ]);
          }
        }

        return NextResponse.json({
          success: true,
        });
      } catch (error) {
        throw error;
      }
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
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.action === "deleteTransfer") {
      const query = "DELETE FROM stocks_transfer_issue WHERE id = ?";
      await db.query(query, [Number(body.id)]);
      return NextResponse.json({ success: true });
    }

    if (body.action === "deleteStock") {
      const query = "DELETE FROM stocks WHERE id = ?";
      await db.query(query, [Number(body.id)]);
      return NextResponse.json({ success: true });
    }
  } catch (err: any) {
    console.error("SQL Error:", err.sqlMessage);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}
