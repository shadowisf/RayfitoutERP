import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2";

// Returns all LPO line records for a given material description.
// Query params: material (URL-encoded material_description)
// Returns: Array of { mr_header_id, lpo_id, qty, unit_price, date }
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
         ROUND(vml.approved_proposed_quantity, 3)      AS qty,
         ROUND(lml.unit_price, 2)                      AS unit_price,
         DATE_FORMAT(l.created_at, '%d %b %Y')         AS date
       FROM lpo_mr_line  lml
       JOIN lpo          l   ON lml.lpo_id     = l.id
       JOIN vw_mr_lines  vml ON lml.mr_line_id = vml.id
       WHERE vml.material_description = ?
         AND l.progress_id NOT IN (13)
         AND lml.unit_price > 0
       ORDER BY lml.unit_price ASC, l.created_at DESC`,
      [material],
    );

    const data = (rows as any[]).map((row) => ({
      mr_header_id: Number(row.mr_header_id),
      lpo_id: Number(row.lpo_id),
      qty:
        row.qty != null
          ? Number.isInteger(Number(row.qty))
            ? Number(row.qty)
            : parseFloat(Number(row.qty).toFixed(3))
          : null,
      unit_price: row.unit_price != null ? Number(row.unit_price) : null,
      date: row.date ?? null,
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
