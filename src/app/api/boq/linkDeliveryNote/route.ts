import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Links one or more stocks_transfer_issue IDs to a BOQ line.
// Body: { boq_line_id: number, transaction_ids: number[] }
export async function POST(req: NextRequest) {
  try {
    const { boq_line_id, transaction_ids } = await req.json();

    if (!boq_line_id || !Array.isArray(transaction_ids) || transaction_ids.length === 0) {
      return NextResponse.json({ error: "boq_line_id and transaction_ids required" }, { status: 400 });
    }

    const values = transaction_ids.map((tid: number) => [Number(tid), Number(boq_line_id)]);

    await db.query(
      `INSERT IGNORE INTO jt_stocks_transfer_issue_boq_lines
         (stocks_transfer_issue_id, boq_line_id)
       VALUES ?`,
      [values],
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    console.error("linkDeliveryNote error:", err.sqlMessage || err.message);
    return NextResponse.json({ error: err.sqlMessage || err.message }, { status: 500 });
  }
}
