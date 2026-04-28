import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2";

export async function GET() {
  try {
    // ── 1. Top materials table ───────────────────────────────────────────────
    // Groups all lpo_mr_lines by material_description; computes qty, avg/min
    // unit price, total spent, and top supplier (highest spend for that material).
    const [tableRows] = await db.query<RowDataPacket[]>(
      `SELECT
         vml.material_description,
         SUM(vml.approved_proposed_quantity)  AS qty_order,
         AVG(lml.unit_price)                  AS avg_price,
         MIN(lml.unit_price)                  AS lowest_price,
         SUM(lml.total_price)                 AS total_spent,
         (
           SELECT COALESCE(s2.name, 'Unknown')
           FROM lpo_mr_line  lml2
           JOIN lpo           l2   ON lml2.lpo_id     = l2.id
           JOIN vw_mr_lines   vml2 ON lml2.mr_line_id = vml2.id
           LEFT JOIN suppliers s2  ON l2.supplier_id  = s2.id
           WHERE vml2.material_description = vml.material_description
             AND l2.progress_id != 26
           GROUP BY s2.id, s2.name
           ORDER BY SUM(lml2.total_price) DESC
           LIMIT 1
         ) AS top_supplier
       FROM lpo_mr_line lml
       JOIN lpo         l   ON lml.lpo_id     = l.id
       JOIN vw_mr_lines vml ON lml.mr_line_id = vml.id
       WHERE l.progress_id != 26
         AND lml.unit_price > 0
       GROUP BY vml.material_description
       HAVING total_spent > 0
       ORDER BY total_spent DESC
       LIMIT 10`,
    );

    // ── 2. Spending by category (pie chart) ──────────────────────────────────
    const [categoryRows] = await db.query<RowDataPacket[]>(
      `SELECT
         COALESCE(lmc.value, 'Unspecified') AS category_name,
         COUNT(DISTINCT lml.id)        AS item_count,
         SUM(lml.total_price)          AS total_spent
       FROM lpo_mr_line lml
       JOIN lpo         l   ON lml.lpo_id     = l.id
       JOIN vw_mr_lines vml ON lml.mr_line_id = vml.id
       LEFT JOIN lut_material_categories lmc ON vml.material_category_id = lmc.id
       WHERE l.progress_id != 26
         AND lml.total_price > 0
       GROUP BY lmc.id, lmc.value
       ORDER BY total_spent DESC
       LIMIT 7`,
    );

    const tableData = (tableRows as any[]).map((row) => ({
      material_description: row.material_description,
      top_supplier: row.top_supplier ?? "—",
      qty_order: Number(row.qty_order) || 0,
      avg_price: Number(row.avg_price) || 0,
      lowest_price: Number(row.lowest_price) || 0,
      total_spent: Number(row.total_spent) || 0,
    }));

    const categoryData = (categoryRows as any[]).map((row) => ({
      category_name: row.category_name,
      item_count: Number(row.item_count) || 0,
      total_spent: Number(row.total_spent) || 0,
    }));

    return NextResponse.json({ table_data: tableData, category_data: categoryData }, { status: 200 });
  } catch (err: any) {
    console.error(
      "getFinancialTopMaterialsBySpend error:",
      err.sqlMessage || err.message,
    );
    return NextResponse.json(
      { error: err.sqlMessage || err.message },
      { status: 500 },
    );
  }
}
