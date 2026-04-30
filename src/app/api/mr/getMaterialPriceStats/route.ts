import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2";

// Returns price stats for a list of material descriptions.
// Query params: materials (comma-separated material descriptions)
// Returns: { [material_description]: { lowest_price, avg_price, prev_price } }
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const materialsParam = searchParams.get("materials");

  if (!materialsParam) {
    return NextResponse.json(
      { error: "materials param required" },
      { status: 400 },
    );
  }

  const materials = materialsParam
    .split("||")
    .map((m) => m.trim())
    .filter(Boolean);

  if (materials.length === 0) {
    return NextResponse.json({}, { status: 200 });
  }

  const placeholders = materials.map(() => "?").join(",");

  try {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT
         vml.material_description,
         ROUND(MIN(lml.unit_price), 2)                                              AS lowest_price,
         ROUND(MAX(lml.unit_price), 2)                                              AS highest_price,
         ROUND(
           AVG(
             CASE
               WHEN l.created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
               THEN lml.unit_price
             END
           ), 2
         )                                                                           AS avg_price,
         (
           SELECT ROUND(lml2.unit_price, 2)
           FROM lpo_mr_line  lml2
           JOIN lpo          l2   ON lml2.lpo_id     = l2.id
           JOIN vw_mr_lines  vml2 ON lml2.mr_line_id = vml2.id
           WHERE vml2.material_description = vml.material_description
             AND l2.progress_id != 26
             AND lml2.unit_price > 0
           ORDER BY l2.created_at DESC
           LIMIT 1
         )                                                                           AS prev_price
       FROM lpo_mr_line  lml
       JOIN lpo          l   ON lml.lpo_id     = l.id
       JOIN vw_mr_lines  vml ON lml.mr_line_id = vml.id
       WHERE vml.material_description IN (${placeholders})
         AND l.progress_id != 26
         AND lml.unit_price > 0
       GROUP BY vml.material_description`,
      materials,
    );

    const result: Record<
      string,
      {
        lowest_price: number | null;
        highest_price: number | null;
        avg_price: number | null;
        prev_price: number | null;
      }
    > = {};

    for (const row of rows as any[]) {
      result[row.material_description] = {
        lowest_price:
          row.lowest_price != null ? Number(row.lowest_price) : null,
        highest_price:
          row.highest_price != null ? Number(row.highest_price) : null,
        avg_price: row.avg_price != null ? Number(row.avg_price) : null,
        prev_price: row.prev_price != null ? Number(row.prev_price) : null,
      };
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.error(
      "getMaterialPriceStats error:",
      err.sqlMessage || err.message,
    );
    return NextResponse.json(
      { error: err.sqlMessage || err.message },
      { status: 500 },
    );
  }
}
