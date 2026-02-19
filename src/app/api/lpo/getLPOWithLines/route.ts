import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lpo_id } = body;

    if (!lpo_id) {
      return NextResponse.json(
        { success: false, error: "lpo_id is required" },
        { status: 400 },
      );
    }

    // Fetch LPO header with supplier info + MR header details
    const lpoQuery = `
      SELECT
        l.*,
        s.name as supplier_name,
        s.address as supplier_address,
        s.trn_number as supplier_trn_number,
        s.type as supplier_type,
        s.contact_person_name as supplier_contact_person,
        s.phone as supplier_phone,
        s.email as supplier_email_address,
        pr.value as progress_name,
        mh.required_date,
        mh.id as mr_header_id,
        p.name as project_name,
        pur.value as purpose_name,
        mh.requested_by,
        dept.value as department_name
      FROM lpo l
      LEFT JOIN suppliers s ON l.supplier_id = s.id
      LEFT JOIN lut_mr_headers_progress pr ON l.progress_id = pr.id
      LEFT JOIN mr_headers mh ON l.mr_header_id = mh.id
      LEFT JOIN projects p ON mh.project_id = p.id
      LEFT JOIN lut_mr_headers_purpose pur ON mh.purpose_id = pur.id
      LEFT JOIN lut_mr_headers_departments dept ON mh.department_id = dept.id
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

    // Fetch MR lines belonging to this LPO via lpo_mr_line join
    // Uses the same view (vw_mr_lines) as getMrLinesByMrHeaderID for consistency
    const linesQuery = `
      SELECT
        vml.*,
        lml.id as lpo_mr_line_id,
        lml.unit_price as lpo_unit_price,
        lml.total_price as lpo_total_price
      FROM lpo_mr_line lml
      JOIN vw_mr_lines vml ON lml.mr_line_id = vml.id
      WHERE lml.lpo_id = ?
      ORDER BY vml.id ASC
    `;

    const [lineRows] = await db.query<RowDataPacket[]>(linesQuery, [
      Number(lpo_id),
    ]);

    // Group lines same way as getMrLinesByMrHeaderID
    const grouped: any = {};

    (lineRows as any[]).forEach((row: any) => {
      const category = row.material_category || "Uncategorized";
      const subCategory = row.material_subcategory || "Uncategorized";
      const supplier = lpoData.supplier_name || "Unassigned";

      if (!grouped[category]) {
        grouped[category] = {};
      }
      if (!grouped[category][subCategory]) {
        grouped[category][subCategory] = {};
      }
      if (!grouped[category][subCategory][supplier]) {
        grouped[category][subCategory][supplier] = [];
      }

      grouped[category][subCategory][supplier].push({
        ...row,
      });
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          lpo: lpoData,
          lines: grouped,
          flatLines: lineRows,
        },
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error fetching LPO with lines:", error);
    return NextResponse.json(
      { success: false, error: error.sqlMessage || error.message },
      { status: 500 },
    );
  }
}
