import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2";

export async function POST(req: Request) {
  try {
    const { inventory_item_ids, project_id, location } = await req.json();

    if (!inventory_item_ids || !Array.isArray(inventory_item_ids)) {
      return NextResponse.json(
        { error: "inventory_item_ids array is required" },
        { status: 400 },
      );
    }

    const quantities: {
      [itemId: number]: {
        available_quantity: number;
        total_stock: number;
        total_issued: number;
      };
    } = {};

    let totalStockFromStocks = 0;
    let totalStockFromTransfers = 0;

    // ✅ Query 1: Get stock from regular stocks table
    if (location) {
      // When filtering by location, only get stocks at that location
      const [stockRows] = await db.query<RowDataPacket[]>(
        `SELECT 
          inventory_item_id,
          SUM(quantity) as total_stock
        FROM stocks
        WHERE inventory_item_id IN (?)
          AND location = ?
        GROUP BY inventory_item_id`,
        [inventory_item_ids, location],
      );

      stockRows.forEach((row: any) => {
        if (!quantities[row.inventory_item_id]) {
          quantities[row.inventory_item_id] = {
            available_quantity: 0,
            total_stock: 0,
            total_issued: 0,
          };
        }
        quantities[row.inventory_item_id].total_stock =
          Number(row.total_stock) || 0;
      });

      // ✅ Query 2: Get stock transferred/issued TO this location
      const [transferRows] = await db.query<RowDataPacket[]>(
        `SELECT 
          jt.inventory_item_id,
          SUM(jt.quantity) as total_transferred
        FROM stocks_transfer_issue sti
        INNER JOIN jt_stocks_transfer_issue_inventory_item jt 
          ON sti.id = jt.stocks_transfer_issue_id
        WHERE jt.inventory_item_id IN (?)
          AND sti.to_location = ?
          AND sti.received = 1
        GROUP BY jt.inventory_item_id`,
        [inventory_item_ids, location],
      );

      transferRows.forEach((row: any) => {
        if (!quantities[row.inventory_item_id]) {
          quantities[row.inventory_item_id] = {
            available_quantity: 0,
            total_stock: 0,
            total_issued: 0,
          };
        }
        // Add transferred quantity to total stock
        quantities[row.inventory_item_id].total_stock +=
          Number(row.total_transferred) || 0;
      });
    } else if (project_id) {
      // When filtering by project, only get stocks for that project
      const [stockRows] = await db.query<RowDataPacket[]>(
        `SELECT 
          inventory_item_id,
          SUM(quantity) as total_stock
        FROM stocks
        WHERE inventory_item_id IN (?)
          AND project_id = ?
        GROUP BY inventory_item_id`,
        [inventory_item_ids, project_id],
      );

      stockRows.forEach((row: any) => {
        if (!quantities[row.inventory_item_id]) {
          quantities[row.inventory_item_id] = {
            available_quantity: 0,
            total_stock: 0,
            total_issued: 0,
          };
        }
        quantities[row.inventory_item_id].total_stock =
          Number(row.total_stock) || 0;
      });
    } else {
      // No filters - get all stocks
      const [stockRows] = await db.query<RowDataPacket[]>(
        `SELECT 
          inventory_item_id,
          SUM(quantity) as total_stock
        FROM stocks
        WHERE inventory_item_id IN (?)
        GROUP BY inventory_item_id`,
        [inventory_item_ids],
      );

      stockRows.forEach((row: any) => {
        if (!quantities[row.inventory_item_id]) {
          quantities[row.inventory_item_id] = {
            available_quantity: 0,
            total_stock: 0,
            total_issued: 0,
          };
        }
        quantities[row.inventory_item_id].total_stock =
          Number(row.total_stock) || 0;
      });
    }

    // ✅ Query 3: Get issued quantities (always needed for available calculation)
    const [issueRows] = await db.query<RowDataPacket[]>(
      `SELECT 
        jt.inventory_item_id,
        SUM(jt.quantity) as total_issued
      FROM stocks_transfer_issue sti
      INNER JOIN jt_stocks_transfer_issue_inventory_item jt 
        ON sti.id = jt.stocks_transfer_issue_id
      WHERE jt.inventory_item_id IN (?)
        AND LOWER(sti.type) LIKE '%issue%'
        AND sti.received = 1
      GROUP BY jt.inventory_item_id`,
      [inventory_item_ids],
    );

    // Initialize all items with 0 if not already initialized
    inventory_item_ids.forEach((id: number) => {
      if (!quantities[id]) {
        quantities[id] = {
          available_quantity: 0,
          total_stock: 0,
          total_issued: 0,
        };
      }
    });

    // Fill in issued data
    issueRows.forEach((row: any) => {
      quantities[row.inventory_item_id].total_issued =
        Number(row.total_issued) || 0;
    });

    // Calculate available quantities (stock - issued)
    Object.keys(quantities).forEach((id) => {
      const itemId = Number(id);
      quantities[itemId].available_quantity =
        quantities[itemId].total_stock - quantities[itemId].total_issued;
    });

    return NextResponse.json({
      success: true,
      data: quantities,
    });
  } catch (error: any) {
    console.error("Error fetching batched quantities:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch quantities",
      },
      { status: 500 },
    );
  }
}
