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

    const query = `
      SELECT 
        inventory_item_id,
        SUM(quantity) as total_quantity,
        COUNT(*) as batch_count
      FROM stocks
      WHERE inventory_item_id = ?
      GROUP BY inventory_item_id
    `;

    const [rows] = await db.query<RowDataPacket[]>(query, [
      Number(inventory_item_id),
    ]);

    if (rows.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No stock found for this inventory item",
        data: {
          inventory_item_id: Number(inventory_item_id),
          total_quantity: 0,
          batch_count: 0,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Stock quantity retrieved successfully",
      data: {
        inventory_item_id: rows[0].inventory_item_id,
        total_quantity: rows[0].total_quantity,
        batch_count: rows[0].batch_count,
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
