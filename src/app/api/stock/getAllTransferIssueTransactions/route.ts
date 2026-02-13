import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2";

export async function GET() {
  try {
    // Fetch all transfer/issue transactions with their items
    const query = `
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
        sti.third_party_involved,
        sti.container_number,
        
        -- Get project name
        p.name as project_name,
        
        -- Get all items for this transaction
        jt.inventory_item_id,
        jt.quantity,
        jt.serial_number,
        i.description,
        i.unit
        
      FROM stocks_transfer_issue sti
      LEFT JOIN jt_stocks_transfer_issue_inventory_item jt ON sti.id = jt.stocks_transfer_issue_id
      LEFT JOIN inventory i ON jt.inventory_item_id = i.id
      LEFT JOIN projects p ON sti.project_id = p.id
      ORDER BY sti.created_on DESC
    `;

    const [rows] = await db.query<RowDataPacket[]>(query);

    // Group items by transaction ID
    const transactionsMap = new Map();

    rows.forEach((row) => {
      if (!transactionsMap.has(row.id)) {
        transactionsMap.set(row.id, {
          id: row.id,
          project_id: row.project_id,
          project_name: row.project_name, // ✅ Added this line
          created_on: row.created_on,
          type: row.type,
          transferee: row.transferee,
          purpose: row.purpose,
          from_location: row.from_location,
          to_location: row.to_location,
          receiver_name: row.receiver_name,
          received: row.received,
          third_party_involved: row.third_party_involved,
          container_number: row.container_number,
          items: [],
        });
      }

      // Add item to the transaction
      if (row.inventory_item_id) {
        transactionsMap.get(row.id).items.push({
          inventory_item_id: row.inventory_item_id,
          quantity: row.quantity,
          serial_number: row.serial_number,
          description: row.description,
          unit: row.unit,
        });
      }
    });

    const transactions = Array.from(transactionsMap.values());

    return NextResponse.json({
      success: true,
      transactions,
    });
  } catch (error: any) {
    console.error("Error fetching all transactions:", error);
    return NextResponse.json(
      { error: error.message, success: false },
      { status: 500 },
    );
  }
}
