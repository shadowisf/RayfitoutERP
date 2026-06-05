import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2";

// Returns all LPO lines linked to a specific BOQ line.
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
         l.id                           AS lpo_id,
         l.mr_header_id,
         lml.unit_price,
         lml.total_price,
         ml.approved_proposed_quantity  AS quantity,
         ml.unit,
         ml.material_description
       FROM jt_mr_lines_boq_lines jmbl
       JOIN lpo_mr_line lml ON lml.mr_line_id = jmbl.mr_line_id
       JOIN lpo l ON l.id = lml.lpo_id
       JOIN vw_mr_lines ml ON ml.id = jmbl.mr_line_id
       WHERE jmbl.boq_line_id = ?
       ORDER BY l.id DESC`,
      [Number(boqLineId)],
    );

    return NextResponse.json(rows, { status: 200 });
  } catch (err: any) {
    console.error("getMrLinesByBoqLineID error:", err.sqlMessage || err.message);
    return NextResponse.json({ error: err.sqlMessage || err.message }, { status: 500 });
  }
}
