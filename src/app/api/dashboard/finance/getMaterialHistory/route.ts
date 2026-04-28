import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2";

// Returns daily time-series for a single material description
// Query params: material, startDate, endDate
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const material  = searchParams.get("material");
  const startDate = searchParams.get("startDate");
  const endDate   = searchParams.get("endDate");

  if (!material) {
    return NextResponse.json({ error: "material param required" }, { status: 400 });
  }

  const dateClause = startDate && endDate
    ? `AND l.paid_at BETWEEN '${startDate}' AND '${endDate} 23:59:59'`
    : startDate
      ? `AND l.paid_at >= '${startDate}'`
      : endDate
        ? `AND l.paid_at <= '${endDate} 23:59:59'`
        : "";

  try {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT
         DATE(l.paid_at)                                  AS period,
         DATE_FORMAT(MIN(l.paid_at), '%d %b')            AS label,
         DATE_FORMAT(MIN(l.paid_at), '%d %b ''%y')       AS full_label,
         ROUND(SUM(lml.total_price), 2)             AS total_spent,
         ROUND(AVG(lml.unit_price), 2)              AS avg_price
       FROM lpo_mr_line lml
       JOIN lpo         l   ON lml.lpo_id     = l.id
       JOIN vw_mr_lines vml ON lml.mr_line_id = vml.id
       WHERE vml.material_description = ?
         AND l.progress_id != 26
         AND l.paid_at IS NOT NULL
         AND lml.unit_price > 0
         ${dateClause}
       GROUP BY DATE(l.paid_at)
       ORDER BY DATE(l.paid_at) ASC`,
      [material],
    );

    const data = (rows as any[]).map((row) => ({
      period:      String(row.period),
      label:       row.label,
      full_label:  row.full_label,
      total_spent: Number(row.total_spent) || 0,
      avg_price:   Number(row.avg_price) || 0,
    }));

    return NextResponse.json(data, { status: 200 });
  } catch (err: any) {
    console.error("getMaterialHistory error:", err.sqlMessage || err.message);
    return NextResponse.json({ error: err.sqlMessage || err.message }, { status: 500 });
  }
}
