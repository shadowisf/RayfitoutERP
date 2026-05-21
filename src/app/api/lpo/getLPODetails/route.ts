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
    sub.name as subcontractor_name,
    sub.trn_number as subcontractor_trn_number,
    sub.address as subcontractor_address,
    sub.contact_person_name as subcontractor_contact_person,
    sub.email as subcontractor_email,
    p.name as project_name,
    mh.date_requested
  FROM lpo l
  LEFT JOIN suppliers s ON l.supplier_id = s.id
  LEFT JOIN subcontractors sub ON l.subcontractor_id = sub.id
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
        ml.unit,
        mlt.predefined_item_id
      FROM lpo_mr_line lml
      LEFT JOIN vw_mr_lines ml ON lml.mr_line_id = ml.id
      LEFT JOIN mr_lines mlt ON lml.mr_line_id = mlt.id
      WHERE lml.lpo_id = ?
    `;

    const [linesRows] = await db.query<RowDataPacket[]>(linesQuery, [
      Number(lpo_id),
    ]);

    // ── Resolve name/unit from lut_predefined_items when a link exists ──────
    const lpoLinkedIds: number[] = Array.from(
      new Set<number>(
        (linesRows as any[])
          .filter((r) => r.predefined_item_id)
          .map((r) => Number(r.predefined_item_id)),
      ),
    );

    if (lpoLinkedIds.length > 0) {
      const [piRows] = await db.query<RowDataPacket[]>(
        `SELECT id, material_description, unit FROM lut_predefined_items WHERE id IN (?)`,
        [lpoLinkedIds],
      );
      const piMap = new Map((piRows as any[]).map((pi) => [pi.id, pi]));
      (linesRows as any[]).forEach((row) => {
        if (!row.predefined_item_id) return;
        const pi: any = piMap.get(Number(row.predefined_item_id));
        if (!pi) return;
        row.material_description = pi.material_description;
        if (pi.unit) row.unit = pi.unit;
      });
    }

    const joLinesQuery = `
      SELECT
        ljl.id,
        ljl.lpo_id,
        ljl.jo_line_id,
        ljl.approved_total_price,
        vjl.job_scope_name,
        vjl.job_description,
        vjl.approved_subcontractor_name
      FROM lpo_jo_line ljl
      JOIN vw_jo_lines vjl ON ljl.jo_line_id = vjl.id
      WHERE ljl.lpo_id = ?
    `;

    const [joLinesRows] = await db.query<RowDataPacket[]>(joLinesQuery, [
      Number(lpo_id),
    ]);

    const completeData = {
      ...lpoData,
      lpo_mr_lines: linesRows || [],
      lpo_jo_lines: joLinesRows || [],
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
