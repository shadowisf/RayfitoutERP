import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2";

interface StockTransferDetails extends RowDataPacket {
  // Stock Transfer Issue fields
  id: number;
  created_on: string;
  type: string;
  purpose: string;
  from_location: string;
  to_location: string;
  receiver_name: string;
  quantity: number;
  full_name_of_receiver: string | null;
  notes: string | null;
  received: number;
  received_on: string | null;

  // Inventory Item fields
  inventory_item_id: number;
  description: string;
  unit: string;
  category_id: number;
  subcategory_id: number;
  type_item: string;
  stockable: number;
  minimum_stock_quantity: number;
  brand: string | null;
  country_of_origin: string | null;
  specification: string | null;
  image: string | null;

  // Batch ID (from stocks table)
  batch_id: number | null;
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  try {
    const query = `
      SELECT 
        -- Stock Transfer Issue fields
        sti.id,
        sti.created_on,
        sti.type,
        sti.purpose,
        sti.from_location,
        sti.to_location,
        sti.receiver_name,
        sti.quantity,
        sti.full_name_of_receiver,
        sti.notes,
        sti.received,
        sti.received_on,
        
        -- Inventory Item fields
        sti.inventory_item_id,
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
        
        -- Batch ID (get the most recent batch for this inventory item)
        (
          SELECT s.batch_id 
          FROM stocks s 
          WHERE s.inventory_item_id = sti.inventory_item_id 
          ORDER BY s.created_at DESC 
          LIMIT 1
        ) as batch_id
        
      FROM stocks_transfer_issue sti
      INNER JOIN inventory i ON sti.inventory_item_id = i.id
      WHERE sti.id = ?
    `;

    const [rows] = await db.query<StockTransferDetails[]>(query, [body.id]);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Stock transfer not found", success: false },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: rows[0],
    });
  } catch (error: any) {
    console.error(error.sqlMessage);
    return NextResponse.json(
      { error: error.sqlMessage, success: false },
      { status: 500 }
    );
  }
}
