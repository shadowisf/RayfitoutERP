import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const [rows]: any = await db.query(
      `SELECT * FROM vw_boq_lines ORDER BY 
    category_order ASC, 
    subcategory_order ASC, 
    item_order ASC`,
    );

    // Track numbering per project
    const projectCategories = new Map();
    const projectSubCategories = new Map();
    const projectItemCounts = new Map();

    const flatResults = rows.map(function (row: any) {
      const projectId = row.project_id;
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

      // Assign category number
      if (!categoryMap.has(category)) {
        categoryMap.set(category, categoryMap.size + 1);
      }
      const categoryNumber = categoryMap.get(category);

      // Assign subcategory number
      const subCategoryKey = `${category}-${subCategory}`;
      if (!subCategoryMap.has(subCategoryKey)) {
        const subCategoriesInCategory = Array.from(
          subCategoryMap.keys(),
        ).filter((key: any) => key.startsWith(`${category}-`)).length;
        subCategoryMap.set(subCategoryKey, subCategoriesInCategory + 1);
      }
      const subCategoryNumber = subCategoryMap.get(subCategoryKey);

      // Track item number within subcategory
      const itemKey = `${category}-${subCategory}`;
      const currentCount = itemCountMap.get(itemKey) || 0;
      itemCountMap.set(itemKey, currentCount + 1);
      const itemNumber = currentCount + 1;

      // Full item number (e.g., "1.1.1")
      const fullItemNumber = `${categoryNumber}.${subCategoryNumber}.${itemNumber}`;

      return {
        id: row.id,
        boq_id: row.boq_id,
        project_id: row.project_id,
        project_name: row.project_name,
        item_name: row.item_name,
        category: row.category,
        sub_category: row.sub_category,
        item_code: row.item_code,
        scope_of_work: row.scope_of_work,
        location_ids: row.location_ids,
        location: row.location,
        quantity: row.quantity,
        unit: row.unit,
        rate_per_quantity: row.rate_per_quantity,
        total_cost: row.total_cost,
        item_description: row.item_description,
        attachments: row.attachments || [],
        item_number: fullItemNumber,
        category_number: categoryNumber,
        subcategory_number: subCategoryNumber,
      };
    });

    return NextResponse.json(flatResults);
  } catch (err: any) {
    console.error("SQL Error:", err.sqlMessage || err.message);
    return NextResponse.json(
      { error: err.sqlMessage || err.message },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const [rows]: any = await db.query(
      `SELECT * FROM vw_boq_lines WHERE project_id = ?`,
      [body.project_id],
    );

    // Track numbering per project
    const projectCategories = new Map();
    const projectSubCategories = new Map();
    const projectItemCounts = new Map();

    const flatResults = rows.map(function (row: any) {
      const projectId = row.project_id;
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

      // Assign category number
      if (!categoryMap.has(category)) {
        categoryMap.set(category, categoryMap.size + 1);
      }
      const categoryNumber = categoryMap.get(category);

      // Assign subcategory number
      const subCategoryKey = `${category}-${subCategory}`;
      if (!subCategoryMap.has(subCategoryKey)) {
        const subCategoriesInCategory = Array.from(
          subCategoryMap.keys(),
        ).filter((key: any) => key.startsWith(`${category}-`)).length;
        subCategoryMap.set(subCategoryKey, subCategoriesInCategory + 1);
      }
      const subCategoryNumber = subCategoryMap.get(subCategoryKey);

      // Track item number within subcategory
      const itemKey = `${category}-${subCategory}`;
      const currentCount = itemCountMap.get(itemKey) || 0;
      itemCountMap.set(itemKey, currentCount + 1);
      const itemNumber = currentCount + 1;

      // Full item number (e.g., "1.1.1")
      const fullItemNumber = `${categoryNumber}.${subCategoryNumber}.${itemNumber}`;

      return {
        id: row.id,
        boq_id: row.boq_id,
        project_id: row.project_id,
        project_name: row.project_name,
        item_name: row.item_name,
        category: row.category,
        sub_category: row.sub_category,
        item_code: row.item_code,
        scope_of_work: row.scope_of_work,
        location_id: row.location_id,
        location: row.location,
        quantity: row.quantity,
        unit: row.unit,
        rate_per_quantity: row.rate_per_quantity,
        total_cost: row.total_cost,
        item_description: row.item_description,
        attachments: row.attachments || [],
        item_number: fullItemNumber,
        category_number: categoryNumber,
        subcategory_number: subCategoryNumber,
      };
    });

    return NextResponse.json(flatResults);
  } catch (err: any) {
    console.error("SQL Error:", err.sqlMessage || err.message);
    return NextResponse.json(
      { error: err.sqlMessage || err.message },
      { status: 500 },
    );
  }
}
