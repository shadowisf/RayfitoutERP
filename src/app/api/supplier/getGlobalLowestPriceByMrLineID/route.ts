import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const mr_line_id = searchParams.get("mr_line_id");

    if (!mr_line_id) {
      return NextResponse.json(
        { error: "mr_line_id is required" },
        { status: 400 },
      );
    }

    // First, get the material_description for the given mr_line_id
    const [lineRows] = await db.query<RowDataPacket[]>(
      `SELECT material_description FROM mr_lines WHERE id = ?`,
      [mr_line_id],
    );

    if (!lineRows || lineRows.length === 0) {
      return NextResponse.json(
        { global_lowest: null, price_count: 0 },
        { status: 200 },
      );
    }

    const materialDescription = lineRows[0].material_description;

    if (!materialDescription) {
      return NextResponse.json(
        { global_lowest: null, price_count: 0 },
        { status: 200 },
      );
    }

    // Query historical LPO prices for the same material_description within the past 6 months
    const [priceRows] = await db.query<RowDataPacket[]>(
      `SELECT lml.total_price
       FROM lpo_mr_line lml
       JOIN mr_lines ml ON lml.mr_line_id = ml.id
       JOIN lpo l ON lml.lpo_id = l.id
       WHERE ml.material_description = ?
         AND ml.id != ?
         AND l.created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
         AND lml.total_price IS NOT NULL
         AND lml.total_price > 0`,
      [materialDescription, mr_line_id],
    );

    if (!priceRows || priceRows.length === 0) {
      return NextResponse.json(
        { global_lowest: null, price_count: 0 },
        { status: 200 },
      );
    }

    const prices = priceRows
      .map((row) => parseFloat(row.total_price))
      .filter((p) => !isNaN(p) && p > 0);

    if (prices.length === 0) {
      return NextResponse.json(
        { global_lowest: null, price_count: 0 },
        { status: 200 },
      );
    }

    const globalLowest = Math.min(...prices);

    return NextResponse.json(
      { global_lowest: globalLowest, price_count: prices.length },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("getGlobalLowestPriceByMrLineID error:", err.sqlMessage || err.message);
    return NextResponse.json(
      { error: err.sqlMessage || err.message },
      { status: 500 },
    );
  }
}
