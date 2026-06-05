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
        sti.packing_list_required,
        sti.container_number,
        
        -- Junction table fields (inventory items)
        jt.inventory_item_id,
        jt.quantity,
        jt.serial_number,
        jt.received_quantity,
        jt.attachment,
        jt.length,
        jt.width,
        jt.height,
        
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
      WHERE sti.id = ?
    `;

    const [rows] = await db.query<RowDataPacket[]>(query, [body.id]);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Stock transfer not found", success: false },
        { status: 404 },
      );
    }

    // ✅ Fetch BOQ items with computed positional item numbers
    const boqQuery = `
      SELECT
        t.boq_line_id,
        t.boq_item_name,
        t.cat_num,
        t.sub_num,
        t.item_num,
        CONCAT(t.cat_num, '.', t.sub_num, '.', t.item_num) AS boq_item_number
      FROM (
        SELECT
          bl.id   AS boq_line_id,
          bl.item_name AS boq_item_name,
          DENSE_RANK() OVER (
            PARTITION BY bl.boq_id
            ORDER BY bl.category_order
          ) AS cat_num,
          DENSE_RANK() OVER (
            PARTITION BY bl.boq_id, bl.category
            ORDER BY bl.subcategory_order
          ) AS sub_num,
          ROW_NUMBER() OVER (
            PARTITION BY bl.boq_id, bl.category, bl.sub_category
            ORDER BY bl.item_order
          ) AS item_num,
          bl.boq_id
        FROM vw_boq_lines bl
        WHERE bl.boq_id IN (
          SELECT DISTINCT bl2.boq_id
          FROM jt_stocks_transfer_issue_boq_lines jbl2
          INNER JOIN vw_boq_lines bl2 ON bl2.id = jbl2.boq_line_id
          WHERE jbl2.stocks_transfer_issue_id = ?
        )
      ) t
      WHERE t.boq_line_id IN (
        SELECT jbl.boq_line_id
        FROM jt_stocks_transfer_issue_boq_lines jbl
        WHERE jbl.stocks_transfer_issue_id = ?
      )
    `;

    const [boqRows] = await db.query<RowDataPacket[]>(boqQuery, [body.id, body.id]);

    // Group the results - one transfer can have multiple items
    const transferData = {
      id: rows[0].id,
      project_id: rows[0].project_id,
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
      packing_list_required: rows[0].packing_list_required,
      full_name_of_receiver: rows[0].receiver_name,
      project_name: rows[0].project_name,
      boq_items: boqRows, // ✅ Array of BOQ items
      items: [] as any[],
    };

    // Process each inventory item in the transfer
    for (const row of rows) {
      if (row.inventory_item_id) {
        transferData.items.push({
          inventory_item_id: row.inventory_item_id,
          quantity: row.quantity,
          serial_number: row.serial_number,
          received_quantity: row.received_quantity,
          attachment: row.attachment,
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
          length: row.length,
          width: row.width,
          height: row.height,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: transferData,
    });
  } catch (error: any) {
    console.error(error.sqlMessage);
    return NextResponse.json(
      { error: error.sqlMessage, success: false },
      { status: 500 },
    );
  }
}
