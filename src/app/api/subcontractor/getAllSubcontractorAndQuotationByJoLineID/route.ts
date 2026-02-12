import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();

  try {
    const [rows] = await db.query(
      `SELECT
        sq.id,
        sq.subcontractor_id,
        sq.jo_line_id,
        sq.quotation_file,
        sq.rating,
        sq.total_price,
        sq.approval_status,
        sq.reject_comment,
        sq.created_by,
        s.name AS subcontractor_name,
        s.trn_number AS subcontractor_trn_number,
        s.contact_person_name AS subcontractor_contact_person,
        s.phone AS subcontractor_phone,
        s.email AS subcontractor_email,
        s.address AS subcontractor_address,
        s.notes AS subcontractor_notes,
        GROUP_CONCAT(DISTINCT mc.value) AS subcontractor_material_categories
      FROM jo_line_subcontractor_quotation sq
      JOIN subcontractors s ON sq.subcontractor_id = s.id
      LEFT JOIN jt_subcontractor_material_category jsmc ON s.id = jsmc.subcontractor_id
      LEFT JOIN lut_material_categories mc ON jsmc.material_category_id = mc.id
      WHERE sq.jo_line_id = ?
      GROUP BY sq.id`,
      [Number(body.id)],
    );

    return NextResponse.json(rows, { status: 200 });
  } catch (err: any) {
    console.error("SQL Error:", err.sqlMessage);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}
