import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2";

// Returns the single LPO row for the lowest or prev price of a material.
// Query params: material (URL-encoded), type = "lowest" | "prev"
// Returns: { lpo_id, mr_header_id, project_name, vendor_name, unit_price } | null
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const material = searchParams.get("material");
  const type = searchParams.get("type");

  if (!material || (type !== "lowest" && type !== "prev")) {
    return NextResponse.json(
      { error: "material and type (lowest|prev) params required" },
      { status: 400 },
    );
  }

  const orderBy =
    type === "lowest"
      ? "lml.unit_price ASC, l.created_at DESC"
      : "l.created_at DESC";

  try {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT
         l.id                              AS lpo_id,
         l.mr_header_id,
         COALESCE(p.name, '—')             AS project_name,
         COALESCE(s.name, '—')             AS vendor_name,
         ROUND(lml.unit_price, 2)          AS unit_price,
         COALESCE(mh.requested_by, '—')    AS requested_by
       FROM lpo_mr_line  lml
       JOIN lpo          l   ON lml.lpo_id     = l.id
       JOIN vw_mr_lines  vml ON lml.mr_line_id = vml.id
       LEFT JOIN mr_headers mh ON l.mr_header_id = mh.id
       LEFT JOIN projects   p  ON mh.project_id  = p.id
       LEFT JOIN suppliers  s  ON l.supplier_id  = s.id
       WHERE vml.material_description = ?
         AND l.progress_id NOT IN (13)
         AND lml.unit_price > 0
       ORDER BY ${orderBy}
       LIMIT 1`,
      [material],
    );

    if (!rows.length) {
      return NextResponse.json(null, { status: 200 });
    }

    const row = rows[0] as any;
    return NextResponse.json(
      {
        lpo_id: Number(row.lpo_id),
        mr_header_id: Number(row.mr_header_id),
        project_name: row.project_name,
        vendor_name: row.vendor_name,
        unit_price: row.unit_price != null ? Number(row.unit_price) : null,
        requested_by: row.requested_by ?? "—",
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error(
      "getMaterialPriceHoverDetail error:",
      err.sqlMessage || err.message,
    );
    return NextResponse.json(
      { error: err.sqlMessage || err.message },
      { status: 500 },
    );
  }
}
