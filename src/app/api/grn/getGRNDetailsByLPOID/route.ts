import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lpo_id } = body;

    if (!lpo_id) {
      return NextResponse.json(
        { error: "LPO ID is required", success: false },
        { status: 400 },
      );
    }

    // Fetch GRN header
    const grnQuery = `SELECT * FROM grn WHERE lpo_id = ? LIMIT 1`;
    const grnResult: any = await db.query(grnQuery, [lpo_id]);

    // Extract the actual data from nested array structure [data, metadata]
    const grnData = Array.isArray(grnResult[0]) ? grnResult[0] : grnResult;

    if (!grnData || grnData.length === 0) {
      return NextResponse.json({
        success: false,
        message: "No GRN found for this LPO",
        data: null,
      });
    }

    // Get the first GRN record (it's still an array)
    const grn = grnData[0];

    // Fetch GRN lines
    const grnLinesQuery = `SELECT * FROM grn_mr_line WHERE grn_id = ?`;
    const grnLinesResult: any = await db.query(grnLinesQuery, [grn.id]);

    // Extract the actual data from nested array structure [data, metadata]
    const grnLines = Array.isArray(grnLinesResult[0])
      ? grnLinesResult[0]
      : grnLinesResult;

    return NextResponse.json({
      success: true,
      data: {
        ...grn,
        grn_lines: grnLines,
      },
    });
  } catch (error) {
    console.error("Error fetching GRN:", error);
    return NextResponse.json(
      { error: "Failed to fetch GRN", success: false },
      { status: 500 },
    );
  }
}
