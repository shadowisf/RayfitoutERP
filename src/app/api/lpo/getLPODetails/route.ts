import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lpo_id } = body;

    const lpoQuery = `
  SELECT
    l.*,
    s.name as supplier_name,
    s.address as supplier_address,
    s.trn_number as supplier_trn_number,
    p.name as project_name,
    mh.date_requested
  FROM lpo l
  LEFT JOIN suppliers s ON l.supplier_id = s.id
  LEFT JOIN projects p ON l.project_id = p.id
  LEFT JOIN mr_headers mh ON l.mr_header_id = mh.id
  WHERE l.id = ?
`;

    const [lpoRows] = await db.query<RowDataPacket[]>(lpoQuery, [
      Number(lpo_id),
    ]);

    if (!lpoRows || lpoRows.length === 0) {
      return NextResponse.json(
        { success: false, error: "LPO not found" },
        { status: 404 },
      );
    }

    const lpoData = lpoRows[0];

    const linesQuery = `
      SELECT 
        lml.id,
        lml.lpo_id,
        lml.mr_line_id,
        lml.unit_price,
        lml.total_price,
        ml.material_description,
        ml.brand,
        ml.specification,
        ml.approved_proposed_quantity,
        ml.unit
      FROM lpo_mr_line lml
      LEFT JOIN vw_mr_lines ml ON lml.mr_line_id = ml.id
      WHERE lml.lpo_id = ?
    `;

    const [linesRows] = await db.query<RowDataPacket[]>(linesQuery, [
      Number(lpo_id),
    ]);

    const completeData = {
      ...lpoData,
      lpo_mr_lines: linesRows || [],
    };

    return NextResponse.json(
      { success: true, data: completeData },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching LPO details:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch LPO details" },
      { status: 500 },
    );
  }
}
