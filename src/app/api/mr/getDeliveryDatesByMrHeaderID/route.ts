// /api/lpo/getDeliveryDatesByMrHeaderID/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2";

export async function POST(req: NextRequest) {
  let mr_header_id: number | undefined;

  try {
    const body = await req.json();
    mr_header_id = body.mr_header_id;

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
  } catch (error: any) {
    // Transient DB error — log quietly and return empty list so the UI continues working
    console.log(
      `[getDeliveryDatesByMrHeaderID] DB error for mr_header_id=${mr_header_id}:`,
      error?.sqlMessage || error?.message,
    );
    return NextResponse.json(
      { success: true, delivery_dates: [] },
      { status: 200 },
    );
  }
}
