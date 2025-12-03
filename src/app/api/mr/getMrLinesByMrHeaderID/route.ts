import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const [rows]: any = await db.query(
      `
      SELECT * FROM vw_mr_lines WHERE mr_header_id = ?`,
      [Number(body.id)]
    );

    let boqNumbering = new Map();

    if (rows.length > 0) {
      const [mrHeader]: any = await db.query(
        `SELECT project_id FROM mr_headers WHERE id = ?`,
        [Number(body.id)]
      );

      if (mrHeader.length > 0) {
        const projectId = mrHeader[0].project_id;

        const [boqRows]: any = await db.query(
          `
          SELECT bl.*, bh.project_id 
          FROM boq_lines bl
          JOIN boq_headers bh ON bl.boq_id = bh.id
          WHERE bh.project_id = ?
          ORDER BY bl.category, bl.sub_category, bl.id
          `,
          [projectId]
        );

        const projectCategories = new Map();
        const projectSubCategories = new Map();
        const projectItemCounts = new Map();

        boqRows.forEach(function (row: any) {
          const category = row.category;
          const subCategory = row.sub_category;
          const projectKey = `project_${projectId}`;

          if (!projectCategories.has(projectKey)) {
            projectCategories.set(projectKey, new Map());
          }
          if (!projectSubCategories.has(projectKey)) {
            projectSubCategories.set(projectKey, new Map());
          }
          if (!projectItemCounts.has(projectKey)) {
            projectItemCounts.set(projectKey, new Map());
          }

          const categoryMap = projectCategories.get(projectKey);
          const subCategoryMap = projectSubCategories.get(projectKey);
          const itemCountMap = projectItemCounts.get(projectKey);

          if (!categoryMap.has(category)) {
            categoryMap.set(category, categoryMap.size + 1);
          }
          const categoryNumber = categoryMap.get(category);

          const subCategoryKey = `${category}-${subCategory}`;
          if (!subCategoryMap.has(subCategoryKey)) {
            const subCategoriesInCategory = Array.from(
              subCategoryMap.keys()
            ).filter((key: any) => key.startsWith(`${category}-`)).length;
            subCategoryMap.set(subCategoryKey, subCategoriesInCategory + 1);
          }
          const subCategoryNumber = subCategoryMap.get(subCategoryKey);

          const itemKey = `${category}-${subCategory}`;
          const currentCount = itemCountMap.get(itemKey) || 0;
          itemCountMap.set(itemKey, currentCount + 1);
          const itemNumber = currentCount + 1;

          const fullItemNumber = `${categoryNumber}.${subCategoryNumber}.${itemNumber}`;
          boqNumbering.set(row.id, fullItemNumber);
        });
      }
    }

    const grouped: any = {};

    rows.forEach(function (row: any) {
      const category = row.material_category || "Uncategorized";
      const subCategory = row.material_subcategory || "Uncategorized";

      if (!grouped[category]) {
        grouped[category] = {};
      }

      if (!grouped[category][subCategory]) {
        grouped[category][subCategory] = [];
      }

      grouped[category][subCategory].push({
        id: row.id,
        mr_header_id: row.mr_header_id,
        material_category: row.material_category,
        material_category_id: row.material_category_id,
        material_subcategory: row.material_subcategory,
        material_subcategory_id: row.material_subcategory_id,
        material_description: row.material_description,
        quantity: row.quantity,
        unit: row.unit,
        notes: row.notes,
        boq_line_id: row.boq_line_id,
        boq_item_name: row.boq_item_name,
        boq_item_number: row.boq_line_id
          ? boqNumbering.get(row.boq_line_id)
          : null,
        boq_item_description: row.boq_item_description,
        boq_quantity: row.boq_quantity,
        boq_unit: row.boq_unit,
        boq_category: row.boq_category,
        boq_sub_category: row.boq_sub_category,
        boq_rate: row.boq_rate,
        boq_total_cost: row.boq_total_cost,
        approval_status: row.approval_status,
        reject_comment: row.rejection_comment,
        normal_comment: row.normal_comment,
      });
    });

    return NextResponse.json(grouped, { status: 200 });
  } catch (err: any) {
    console.error(err.sqlMessage || err.message);
    return NextResponse.json(
      { error: err.sqlMessage || err.message },
      { status: 500 }
    );
  }
}
