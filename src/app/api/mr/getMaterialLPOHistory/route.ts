import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2";

// Returns all LPO line records for a given material description.
// Query params: material (URL-encoded material_description)
// Returns: Array of { lpo_id, mr_header_id, material_description, qty, unit, unit_price, date, supplier_name }
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const material = searchParams.get("material");

  if (!material) {
    return NextResponse.json(
      { error: "material param required" },
      { status: 400 },
    );
  }

  try {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT
         l.mr_header_id,
         l.id                                          AS lpo_id,
         COALESCE(pi.material_description, vml.material_description) AS material_description,
         ROUND(vml.approved_proposed_quantity, 3)      AS qty,
         vml.unit,
         ROUND(lml.unit_price, 2)                      AS unit_price,
         DATE_FORMAT(l.created_at, '%d/%m/%Y')         AS date,
         s.name                                        AS supplier_name,
         COALESCE(p.name, '—')                         AS project_name,
         COALESCE(mh.requested_by, '—')               AS requested_by
       FROM lpo_mr_line  lml
       JOIN lpo          l   ON lml.lpo_id        = l.id
       JOIN vw_mr_lines  vml ON lml.mr_line_id    = vml.id
       JOIN mr_lines     ml  ON ml.id             = vml.id
       LEFT JOIN suppliers  s  ON l.supplier_id   = s.id
       LEFT JOIN mr_headers mh ON l.mr_header_id  = mh.id
       LEFT JOIN projects   p  ON mh.project_id   = p.id
       LEFT JOIN lut_predefined_items pi ON pi.id = ml.predefined_item_id
       WHERE vml.material_description = ?
         AND l.progress_id NOT IN (13)
         AND lml.unit_price > 0
       ORDER BY l.created_at DESC`,
      [material],
    );

    const data = (rows as any[]).map((row) => ({
      mr_header_id: Number(row.mr_header_id),
      lpo_id: Number(row.lpo_id),
      material_description: row.material_description ?? material,
      qty: row.qty != null
        ? Number.isInteger(Number(row.qty))
          ? Number(row.qty)
          : parseFloat(Number(row.qty).toFixed(3))
        : null,
      unit: row.unit ?? null,
      unit_price: row.unit_price != null ? Number(row.unit_price) : null,
      date: row.date ?? null,
      supplier_name: row.supplier_name ?? null,
      project_name: row.project_name ?? "—",
      requested_by: row.requested_by ?? "—",
    }));

    return NextResponse.json(data, { status: 200 });
  } catch (err: any) {
    console.error(
      "getMaterialLPOHistory error:",
      err.sqlMessage || err.message,
    );
    return NextResponse.json(
      { error: err.sqlMessage || err.message },
      { status: 500 },
    );
  }
}
