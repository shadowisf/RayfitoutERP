import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.action === "createGRN") {
      const { lpo_id, received_date, received_by, grn_lines } = body;

      const grnQuery = `
        INSERT INTO grn 
        (lpo_id, received_date, received_by)
        VALUES (?, ?, ?)
      `;

      const grnResult: any = await db.query(grnQuery, [
        lpo_id,
        received_date,
        received_by,
      ]);

      // Check different possible structures for the insert ID
      const grnId = grnResult.insertId || grnResult[0]?.insertId;

      if (!grnId) {
        console.error("Failed to get GRN insert ID. Result:", grnResult);
        return NextResponse.json(
          { error: "Failed to create GRN - no insert ID", success: false },
          { status: 500 }
        );
      }

      if (grn_lines && grn_lines.length > 0) {
        const grnLineQuery = `
          INSERT INTO grn_mr_line 
          (grn_id, lpo_mr_line_id, received_quantity, packaging_condition, notes)
          VALUES (?, ?, ?, ?, ?)
        `;

        for (const line of grn_lines) {
          await db.query(grnLineQuery, [
            grnId,
            line.lpo_mr_line_id,
            line.received_quantity,
            line.packaging_condition,
            line.notes || null,
          ]);
        }
      }

      return NextResponse.json({
        success: true,
        grnId: grnId,
      });
    }

    return NextResponse.json(
      { error: "Invalid action", success: false },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error creating GRN:", error);
    return NextResponse.json(
      { error: "Failed to create GRN", success: false },
      { status: 500 }
    );
  }
}