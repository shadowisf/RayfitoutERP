import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { grn_id } = body;

    if (!grn_id) {
      return NextResponse.json(
        { error: "grn_id is required", success: false },
        { status: 400 },
      );
    }

    // Delete lines first (FK constraint), then the GRN header
    await db.query(`DELETE FROM grn_mr_line WHERE grn_id = ?`, [Number(grn_id)]);
    await db.query(`DELETE FROM grn WHERE id = ?`, [Number(grn_id)]);

    return NextResponse.json({ success: true, message: "GRN deleted successfully" });
  } catch (error) {
    console.error("Error deleting GRN:", error);
    return NextResponse.json(
      { error: "Failed to delete GRN", success: false },
      { status: 500 },
    );
  }
}

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
          (grn_id, lpo_mr_line_id, received_quantity, notes, attachment)
          VALUES (?, ?, ?, ?, ?)
        `;

        for (const line of grn_lines) {
          await db.query(grnLineQuery, [
            grnId,
            Number(line.lpo_mr_line_id),
            Number(line.received_quantity),
            line.notes || null,
            line.attachment ? JSON.stringify(line.attachment) : null, // JSON.stringify in backend
          ]);
        }
      }

      return NextResponse.json({
        success: true,
        grnId: grnId,
      });
    }
  } catch (error) {
    console.error("Error creating GRN:", error);
    return NextResponse.json(
      { error: "Failed to create GRN", success: false },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.action === "updateGRN") {
      const { grn_id, lpo_id, received_date, received_by, grn_lines } = body;

      // Validate required fields
      if (!grn_id || !lpo_id || !received_date || !received_by || !grn_lines) {
        return NextResponse.json(
          { error: "Missing required fields", success: false },
          { status: 400 }
        );
      }

      // Update the GRN header
      const updateGrnQuery = `
        UPDATE grn
        SET received_date = ?, received_by = ?
        WHERE id = ?
      `;

      await db.query(updateGrnQuery, [received_date, received_by, grn_id]);

      // Delete existing GRN lines
      const deleteGrnLinesQuery = `
        DELETE FROM grn_mr_line
        WHERE grn_id = ?
      `;

      await db.query(deleteGrnLinesQuery, [grn_id]);

      // Insert updated GRN lines
      if (grn_lines && grn_lines.length > 0) {
        const grnLineQuery = `
          INSERT INTO grn_mr_line 
          (grn_id, lpo_mr_line_id, received_quantity, notes, attachment)
          VALUES (?, ?, ?, ?, ?)
        `;

        for (const line of grn_lines) {
          await db.query(grnLineQuery, [
            grn_id,
            Number(line.lpo_mr_line_id),
            Number(line.received_quantity),
            line.notes || null,
            line.attachment ? JSON.stringify(line.attachment) : null, // JSON.stringify in backend
          ]);
        }
      }

      return NextResponse.json({
        success: true,
        grnId: grn_id,
        message: "GRN updated successfully",
      });
    }
  } catch (error) {
    console.error("Error updating GRN:", error);
    return NextResponse.json(
      { error: "Failed to update GRN", success: false },
      { status: 500 }
    );
  }
}
