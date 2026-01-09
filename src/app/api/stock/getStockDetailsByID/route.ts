import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2";

export async function POST(request: NextRequest) {
  const body = await request.json();

  try {
    const query = `
      SELECT 
        -- Stock Transfer Issue fields
        sti.id,
        sti.project_id,
        sti.boq_line_id,
        sti.created_on,
        sti.type,
        sti.transferee,
        sti.purpose,
        sti.from_location,
        sti.to_location,
        sti.receiver_name,
        sti.received,
        sti.received_on,
        sti.signed_tsc_file,
        sti.third_party_involved,
        sti.receiver_name,
        
        -- Junction table fields (inventory items)
        jt.inventory_item_id,
        jt.quantity,
        jt.serial_number,
        jt.received_quantity,
        jt.attachment,
        
        -- Inventory Item fields
        i.description,
        i.unit,
        i.category_id,
        i.subcategory_id,
        i.type as type_item,
        i.stockable,
        i.minimum_stock_quantity,
        i.brand,
        i.country_of_origin,
        i.specification,
        i.image,
        
        -- Project name
        p.name as project_name,
        
        -- BOQ line details for numbering
        bl.category as boq_category,
        bl.sub_category as boq_sub_category,
        
        -- Batch ID (get the most recent batch for this inventory item)
        (
          SELECT s.batch_id 
          FROM stocks s 
          WHERE s.inventory_item_id = jt.inventory_item_id 
          ORDER BY s.created_at DESC 
          LIMIT 1
        ) as batch_id
        
      FROM stocks_transfer_issue sti
      LEFT JOIN jt_stocks_transfer_issue_inventory_item jt ON sti.id = jt.stocks_transfer_issue_id
      LEFT JOIN inventory i ON jt.inventory_item_id = i.id
      LEFT JOIN projects p ON sti.project_id = p.id
      LEFT JOIN boq_lines bl ON sti.boq_line_id = bl.id
      WHERE sti.id = ?
    `;

    const [rows] = await db.query<RowDataPacket[]>(query, [body.id]);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Stock transfer not found", success: false },
        { status: 404 }
      );
    }

    // Group the results - one transfer can have multiple items
    const transferData = {
      id: rows[0].id,
      project_id: rows[0].project_id,
      boq_line_id: rows[0].boq_line_id,
      created_on: rows[0].created_on,
      type: rows[0].type,
      transferee: rows[0].transferee,
      purpose: rows[0].purpose,
      from_location: rows[0].from_location,
      to_location: rows[0].to_location,
      receiver_name: rows[0].receiver_name,
      received: rows[0].received,
      received_on: rows[0].received_on,
      signed_tsc_file: rows[0].signed_tsc_file,
      third_party_involved: rows[0].third_party_involved,
      full_name_of_receiver: rows[0].receiver_name,
      project_name: rows[0].project_name,
      boq_category: rows[0].boq_category,
      boq_sub_category: rows[0].boq_sub_category,
      items: [] as any[],
    };

    // Calculate BOQ item number if project_id and boq_line_id exist
    let boq_item_number = null;
    if (rows[0].project_id && rows[0].boq_line_id) {
      try {
        // Fetch all BOQ lines for this project
        const [boqRows]: any = await db.query(
          `SELECT * FROM vw_boq_lines WHERE project_id = ?`,
          [rows[0].project_id]
        );

        // Track numbering
        const categoryMap = new Map();
        const subCategoryMap = new Map();
        const itemCountMap = new Map();

        // Process all rows to find the correct item number
        for (const boqRow of boqRows) {
          const category = boqRow.category;
          const subCategory = boqRow.sub_category;

          // Assign category number
          if (!categoryMap.has(category)) {
            categoryMap.set(category, categoryMap.size + 1);
          }
          const categoryNumber = categoryMap.get(category);

          // Assign subcategory number
          const subCategoryKey = `${category}-${subCategory}`;
          if (!subCategoryMap.has(subCategoryKey)) {
            const subCategoriesInCategory = Array.from(
              subCategoryMap.keys()
            ).filter((key: any) => key.startsWith(`${category}-`)).length;
            subCategoryMap.set(subCategoryKey, subCategoriesInCategory + 1);
          }
          const subCategoryNumber = subCategoryMap.get(subCategoryKey);

          // Track item number within subcategory
          const itemKey = `${category}-${subCategory}`;
          const currentCount = itemCountMap.get(itemKey) || 0;
          itemCountMap.set(itemKey, currentCount + 1);
          const itemNumber = currentCount + 1;

          // Check if this is our target BOQ line
          if (boqRow.id === rows[0].boq_line_id) {
            boq_item_number = `${categoryNumber}.${subCategoryNumber}.${itemNumber}`;
            break;
          }
        }
      } catch (error) {
        console.error("Error calculating BOQ item number:", error);
      }
    }

    // Process each inventory item in the transfer
    for (const row of rows) {
      if (row.inventory_item_id) {
        transferData.items.push({
          inventory_item_id: row.inventory_item_id,
          quantity: row.quantity,
          serial_number: row.serial_number,
          received_quantity: row.received_quantity,
          attachment: row.attachment, // ✅ Added attachment from junction table
          batch_id: row.batch_id,
          description: row.description,
          unit: row.unit,
          category_id: row.category_id,
          subcategory_id: row.subcategory_id,
          type_item: row.type_item,
          stockable: row.stockable,
          minimum_stock_quantity: row.minimum_stock_quantity,
          brand: row.brand,
          country_of_origin: row.country_of_origin,
          specification: row.specification,
          image: row.image,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...transferData,
        boq_item_number,
      },
    });
  } catch (error: any) {
    console.error(error.sqlMessage);
    return NextResponse.json(
      { error: error.sqlMessage, success: false },
      { status: 500 }
    );
  }
}