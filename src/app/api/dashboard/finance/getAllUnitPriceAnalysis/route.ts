import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filter } = body;

    // Validate filter parameter
    if (!filter || typeof filter !== "number" || filter <= 0) {
      return NextResponse.json(
        { error: "Invalid 'filter' parameter. Must be a positive number." },
        { status: 400 }
      );
    }

    // Query to get price trends for inventory items
    // This query handles both manual entries (unit_price from stocks)
    // and MR-based entries (unit_price from lpo_mr_line)
    const query = `
      SELECT 
        ii.id AS inventory_item_id,
        ii.description,
        ii.specification,
        ii.unit,
        s.id AS stock_id,
        s.created_at AS stock_date,
        CASE
          WHEN s.mr_header_id IS NOT NULL AND s.mr_line_id IS NOT NULL THEN
            (SELECT lml.unit_price 
             FROM lpo_mr_line lml 
             WHERE lml.mr_line_id = s.mr_line_id 
             LIMIT 1)
          ELSE s.unit_price
        END AS current_price
      FROM stocks s
      INNER JOIN inventory ii ON s.inventory_item_id = ii.id
      WHERE s.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      HAVING current_price IS NOT NULL AND current_price > 0
      ORDER BY ii.id, s.created_at DESC
    `;

    const [rows]: any = await db.query(query, [filter]);

    if (!rows || rows.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    // Group by inventory item
    const itemMap: { [key: number]: any[] } = {};
    rows.forEach((row: any) => {
      if (!itemMap[row.inventory_item_id]) {
        itemMap[row.inventory_item_id] = [];
      }
      itemMap[row.inventory_item_id].push(row);
    });

    // Calculate price trends
    const priceTrends: any[] = [];

    for (const [itemId, stocks] of Object.entries(itemMap)) {
      if (stocks.length === 0) continue;

      // Get most recent price
      const mostRecentStock = stocks[0];
      const currentPrice = parseFloat(mostRecentStock.current_price);

      // Calculate average price from all stocks
      const totalPrice = stocks.reduce(
        (sum, stock) => sum + parseFloat(stock.current_price),
        0
      );
      const averagePrice = totalPrice / stocks.length;

      // Calculate percentage change
      const percentageChange =
        ((currentPrice - averagePrice) / averagePrice) * 100;

      priceTrends.push({
        inventory_item_id: parseInt(itemId),
        description: mostRecentStock.description,
        specification: mostRecentStock.specification,
        unit: mostRecentStock.unit,
        current_price: currentPrice,
        average_price: averagePrice,
        percentage_change: percentageChange,
        stock_count: stocks.length,
      });
    }

    // Sort by absolute percentage change (highest fluctuation first)
    priceTrends.sort(
      (a, b) => Math.abs(b.percentage_change) - Math.abs(a.percentage_change)
    );

    // Return top 10
    return NextResponse.json(priceTrends.slice(0, 10), { status: 200 });
  } catch (err: any) {
    console.error(err.sqlMessage || err.message);
    return NextResponse.json(
      { error: err.sqlMessage || err.message },
      { status: 500 }
    );
  }
}
