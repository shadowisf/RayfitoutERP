import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2";

// Returns all stock transfer/issue transactions linked to a specific BOQ line,
// grouped by transaction with inventory item descriptions as a JSON array.
// Query params: boq_line_id
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const boqLineId = searchParams.get("boq_line_id");

  if (!boqLineId) {
    return NextResponse.json({ error: "boq_line_id required" }, { status: 400 });
  }

  try {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT
         sti.id            AS transaction_id,
         sti.type,
         sti.from_location,
         sti.to_location,
         sti.purpose,
         sti.receiver_name,
         sti.received,
         sti.created_on,
         (
           SELECT JSON_ARRAYAGG(d.description)
           FROM (
             SELECT DISTINCT i2.description
             FROM jt_stocks_transfer_issue_inventory_item jt2
             JOIN inventory i2 ON i2.id = jt2.inventory_item_id
             WHERE jt2.stocks_transfer_issue_id = sti.id
           ) d
         ) AS descriptions
       FROM jt_stocks_transfer_issue_boq_lines jbl
       JOIN stocks_transfer_issue sti ON sti.id = jbl.stocks_transfer_issue_id
       WHERE jbl.boq_line_id = ?
       ORDER BY sti.created_on DESC`,
      [Number(boqLineId)],
    );

    // Parse descriptions JSON string if needed
    const parsed = rows.map((row) => ({
      ...row,
      descriptions: row.descriptions
        ? typeof row.descriptions === "string"
          ? JSON.parse(row.descriptions)
          : row.descriptions
        : [],
    }));

    return NextResponse.json(parsed, { status: 200 });
  } catch (err: any) {
    console.error("getDeliveryNotesByBoqLineID error:", err.sqlMessage || err.message);
    return NextResponse.json({ error: err.sqlMessage || err.message }, { status: 500 });
  }
}
