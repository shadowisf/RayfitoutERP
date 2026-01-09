import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2";

export async function POST(request: NextRequest) {
  const body = await request.json();

  try {
    const query = `
      SELECT 
        sti.id,
        jt.inventory_item_id,
        jt.quantity,
        sti.from_location,
        sti.to_location,
        sti.created_on,
        sti.receiver_name,
        i.description
      FROM stocks_transfer_issue sti
      INNER JOIN jt_stocks_transfer_issue_inventory_item jt ON sti.id = jt.stocks_transfer_issue_id
      INNER JOIN inventory i ON jt.inventory_item_id = i.id
      WHERE (sti.receiver_name LIKE ? AND sti.receiver_name LIKE ?)
        AND sti.type LIKE '%Issue%'
        AND jt.inventory_item_id = ?
        AND (sti.received IS NULL OR sti.received = 0)
      ORDER BY sti.created_on DESC
    `;

    const [rows] = await db.query<RowDataPacket[]>(query, [
      `%${body.receiver_name}%`,
      `%${body.receiver_role}%`,
      body.inventory_item_id,
    ]);

    return NextResponse.json(rows);
  } catch (error: any) {
    console.error(error.sqlMessage);
    return NextResponse.json(
      { error: error.sqlMessage, success: false },
      { status: 500 }
    );
  }
}
