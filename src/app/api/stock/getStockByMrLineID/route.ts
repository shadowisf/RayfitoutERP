import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mr_line_id } = body;

    if (!mr_line_id) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing mr_line_id",
        },
        { status: 400 }
      );
    }

    const query = `
      SELECT 
        id,
        batch_id,
        inventory_item_id,
        quantity,
        location,
        notes
      FROM stocks
      WHERE mr_line_id = ?
      ORDER BY id DESC
      LIMIT 1
    `;

    const [rows] = await db.query<RowDataPacket[]>(query, [mr_line_id]);

    if (rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: "No stock found for this MR line",
        data: null,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Stock found",
      data: rows[0],
    });
  } catch (error: any) {
    console.error("Error fetching stock:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch stock",
        error: error.sqlMessage || error.message,
      },
      { status: 500 }
    );
  }
}
