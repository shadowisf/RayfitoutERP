import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const startDate  = searchParams.get("startDate");
  const endDate    = searchParams.get("endDate");
  const vendorType = searchParams.get("vendorType"); // comma-separated e.g. "CASH,CREDIT"

  const dateClause = startDate && endDate
    ? `AND l.paid_at BETWEEN '${startDate}' AND '${endDate} 23:59:59'`
    : startDate
      ? `AND l.paid_at >= '${startDate}'`
      : endDate
        ? `AND l.paid_at <= '${endDate} 23:59:59'`
        : "";

  const vendorTypes = vendorType
    ? vendorType.split(",").map((v) => v.trim().toUpperCase()).filter(Boolean)
    : [];
  const vendorClause = vendorTypes.length > 0
    ? `AND UPPER(COALESCE(s.type,'')) IN (${vendorTypes.map((v) => `'${v}'`).join(",")})`
    : "";

  try {
    // ── 1. Materials table ────────────────────────────────────────────────────
    // Chain: lpo_mr_line → lpo (lpo_id) → mr_headers (mr_header_id) → projects (project_id)
    // mr_lines also carry mr_header_id via vw_mr_lines, but using lpo.mr_header_id is simpler
    const [tableRows] = await db.query<RowDataPacket[]>(
      `SELECT
         vml.material_description,
         SUM(vml.approved_proposed_quantity)                               AS qty_order,
         ROUND(AVG(lml.unit_price), 2)                                    AS avg_price,
         ROUND(MIN(lml.unit_price), 2)                                    AS lowest_price,
         ROUND(SUM(lml.total_price), 2)                                   AS total_spent,
         GROUP_CONCAT(DISTINCT p.name ORDER BY p.name SEPARATOR '||')    AS projects,
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
       FROM lpo_mr_line  lml
       JOIN lpo          l   ON lml.lpo_id      = l.id
       JOIN vw_mr_lines  vml ON lml.mr_line_id  = vml.id
       LEFT JOIN suppliers  s  ON l.supplier_id  = s.id
       LEFT JOIN mr_headers mh ON l.mr_header_id = mh.id
       LEFT JOIN projects   p  ON mh.project_id  = p.id
       WHERE l.progress_id != 26
         AND lml.unit_price > 0
         ${dateClause}
         ${vendorClause}
       GROUP BY vml.material_description
       HAVING total_spent > 0
       ORDER BY total_spent DESC`,
    );

    // ── 2. Spending by category (donut chart, top 7) ─────────────────────────
    const [categoryRows] = await db.query<RowDataPacket[]>(
      `SELECT
         COALESCE(lmc.value, 'Unspecified') AS category_name,
         COUNT(DISTINCT lml.id)             AS item_count,
         ROUND(SUM(lml.total_price), 2)     AS total_spent
       FROM lpo_mr_line lml
       JOIN lpo         l   ON lml.lpo_id     = l.id
       JOIN vw_mr_lines vml ON lml.mr_line_id = vml.id
       LEFT JOIN lut_material_categories lmc ON vml.material_category_id = lmc.id
       LEFT JOIN suppliers s ON l.supplier_id = s.id
       WHERE l.progress_id != 26
         AND lml.total_price > 0
         ${dateClause}
         ${vendorClause}
       GROUP BY lmc.id, lmc.value
       ORDER BY total_spent DESC
       LIMIT 7`,
    );

    const tableData = (tableRows as any[]).map((row) => ({
      material_description: row.material_description,
      top_supplier:         row.top_supplier ?? "—",
      qty_order:            Number(row.qty_order) || 0,
      avg_price:            Number(row.avg_price) || 0,
      lowest_price:         Number(row.lowest_price) || 0,
      total_spent:          Number(row.total_spent) || 0,
      projects:             row.projects ? String(row.projects).split("||").filter(Boolean) : [],
    }));

    const categoryData = (categoryRows as any[]).map((row) => ({
      category_name: row.category_name,
      item_count:    Number(row.item_count) || 0,
      total_spent:   Number(row.total_spent) || 0,
    }));

    return NextResponse.json({ table_data: tableData, category_data: categoryData }, { status: 200 });
  } catch (err: any) {
    console.error("getAllMaterials error:", err.sqlMessage || err.message);
    return NextResponse.json({ error: err.sqlMessage || err.message }, { status: 500 });
  }
}
