import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { mr_line_id } = await req.json();

    if (!mr_line_id) {
      return NextResponse.json(
        { error: "mr_line_id is required" },
        { status: 400 },
      );
    }

    // Fetch all BOQ lines linked to this MR line via the junction table,
    // including the allocated_qty stored on the junction row.
    // BOQ item numbers are computed per-project using the same ordering
    // logic as getAllBoqLinesWithNumberRef.
    const [rows]: any = await db.query(
      `SELECT
         bl.id,
         bl.boq_id,
         bl.project_id,
         bl.item_name,
         bl.category,
         bl.sub_category,
         bl.quantity,
         bl.unit,
         bl.rate_per_quantity,
         bl.total_cost,
         jmbl.allocated_qty,
         -- category / subcategory / item ordering for number generation
         bl.category_order,
         bl.subcategory_order,
         bl.item_order
       FROM jt_mr_lines_boq_lines jmbl
       JOIN vw_boq_lines bl ON bl.id = jmbl.boq_line_id
       WHERE jmbl.mr_line_id = ?
       ORDER BY bl.category_order ASC, bl.subcategory_order ASC, bl.item_order ASC`,
      [mr_line_id],
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    // Build item numbers per project (same logic as getAllBoqLinesWithNumberRef)
    const projectCategories = new Map<string, Map<string, number>>();
    const projectSubCategories = new Map<string, Map<string, number>>();
    const projectItemCounts = new Map<string, Map<string, number>>();

    // We need all rows for the project to assign consistent numbers — but since
    // we only have the linked rows here, we generate relative numbers among them.
    const categoryMap = new Map<string, number>();
    const subCategoryMap = new Map<string, number>();
    const itemCountMap = new Map<string, number>();

    const results = rows.map((row: any) => {
      const category = row.category;
      const subCategory = row.sub_category;

      if (!categoryMap.has(category)) {
        categoryMap.set(category, categoryMap.size + 1);
      }
      const categoryNumber = categoryMap.get(category)!;

      const subKey = `${category}-${subCategory}`;
      if (!subCategoryMap.has(subKey)) {
        const subsInCat = Array.from(subCategoryMap.keys()).filter((k) =>
          k.startsWith(`${category}-`),
        ).length;
        subCategoryMap.set(subKey, subsInCat + 1);
      }
      const subCategoryNumber = subCategoryMap.get(subKey)!;

      const itemKey = `${category}-${subCategory}`;
      const currentCount = itemCountMap.get(itemKey) || 0;
      itemCountMap.set(itemKey, currentCount + 1);
      const itemNumber = currentCount + 1;

      const fullItemNumber = `${categoryNumber}.${subCategoryNumber}.${itemNumber}`;

      return {
        id: row.id,
        item_number: fullItemNumber,
        item_name: row.item_name,
        category: row.category,
        sub_category: row.sub_category,
        quantity: Number(row.quantity),
        unit: row.unit,
        rate_per_quantity: Number(row.rate_per_quantity),
        total_cost: Number(row.total_cost),
        allocated_qty: row.allocated_qty != null ? Number(row.allocated_qty) : null,
      };
    });

    return NextResponse.json(results, { status: 200 });
  } catch (err: any) {
    console.error("getBoqLinesByMrLineID error:", err.sqlMessage || err.message);
    return NextResponse.json(
      { error: err.sqlMessage || err.message },
      { status: 500 },
    );
  }
}
