import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const query = body.supplier_id
      ? "SELECT * FROM lpo WHERE mr_header_id = ? AND supplier_id = ?"
      : "SELECT * FROM lpo WHERE mr_header_id = ?";

    const params = body.supplier_id
      ? [Number(body.mr_header_id), Number(body.supplier_id)]
      : [Number(body.mr_header_id)];

    const [rows] = await db.query(query, params);

    return NextResponse.json({ data: rows, success: true });
  } catch (error) {
    console.error("Error fetching LPO:", error);
    return NextResponse.json(
      { error: "Failed to fetch LPO", success: false },
      { status: 500 }
    );
  }
}
