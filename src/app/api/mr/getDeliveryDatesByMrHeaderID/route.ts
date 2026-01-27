// /api/lpo/getDeliveryDatesByMrHeaderID/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mr_header_id } = body;

    if (!mr_header_id) {
      return NextResponse.json(
        { success: false, message: "MR header ID is required" },
        { status: 400 },
      );
    }

    // Query to get delivery dates grouped by supplier
    const query = `
      SELECT 
        s.name as supplier_name,
        lpo.delivery_date
      FROM lpo
      INNER JOIN suppliers s ON lpo.supplier_id = s.id
      WHERE lpo.mr_header_id = ?
      AND lpo.delivery_date IS NOT NULL
      ORDER BY s.name
    `;

    const [rows] = await db.execute<RowDataPacket[]>(query, [mr_header_id]);

    return NextResponse.json({
      success: true,
      delivery_dates: rows,
    });
  } catch (error) {
    console.error("Error fetching delivery dates:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch delivery dates" },
      { status: 500 },
    );
  }
}
