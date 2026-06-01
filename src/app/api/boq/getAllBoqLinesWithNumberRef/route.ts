import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const [rows]: any = await db.query(
      `SELECT bl.* FROM vw_boq_lines bl
       JOIN boq_headers bh ON bh.id = bl.boq_id
       WHERE bh.is_draft = 0
       ORDER BY bl.category_order ASC, bl.subcategory_order ASC, bl.item_order ASC`,
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
    const { project_id, jo_line_id, mr_line_id } = body;

    let rows: any;

    if (jo_line_id) {
      // When viewing from a JO, join junction table to get subcontracted_qty per BOQ line
      [rows] = await db.query(
        `SELECT bl.*, COALESCE(jjbl.subcontracted_qty, 0) AS subcontracted_qty
         FROM vw_boq_lines bl
         JOIN boq_headers bh ON bh.id = bl.boq_id
         LEFT JOIN jt_jo_lines_boq_lines jjbl
           ON jjbl.boq_line_id = bl.id AND jjbl.jo_line_id = ?
         WHERE bl.project_id = ? AND bh.is_draft = 0`,
        [jo_line_id, project_id],
      );
    } else if (mr_line_id) {
      // When viewing from an MR, join junction table to get allocated_qty per BOQ line
      [rows] = await db.query(
        `SELECT bl.*, jmbl.allocated_qty
         FROM vw_boq_lines bl
         JOIN boq_headers bh ON bh.id = bl.boq_id
         LEFT JOIN jt_mr_lines_boq_lines jmbl
           ON jmbl.boq_line_id = bl.id AND jmbl.mr_line_id = ?
         WHERE bl.project_id = ? AND bh.is_draft = 0`,
        [mr_line_id, project_id],
      );
    } else {
      [rows] = await db.query(
        `SELECT bl.* FROM vw_boq_lines bl
         JOIN boq_headers bh ON bh.id = bl.boq_id
         WHERE bl.project_id = ? AND bh.is_draft = 0`,
        [project_id],
      );
    }

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
        subcontracted_qty: jo_line_id ? Number(row.subcontracted_qty) || 0 : undefined,
        allocated_qty: mr_line_id ? (row.allocated_qty != null ? Number(row.allocated_qty) : null) : undefined,
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
