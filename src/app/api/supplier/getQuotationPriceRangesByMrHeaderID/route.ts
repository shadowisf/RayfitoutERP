import { db } from "@/lib/db";
import { NextResponse } from "next/server";

// Returns { [mr_line_id]: { min: number; max: number } }
// for all quotations belonging to the given mr_header_id.
// Includes every quotation row regardless of approval_status.
export async function POST(req: Request) {
  const body = await req.json();

  try {
    const [rows]: any = await db.query(
      `SELECT
         mlsq.mr_line_id,
         MIN(mlsq.total_price) AS min_price,
         MAX(mlsq.total_price) AS max_price
       FROM mr_line_supplier_quotation mlsq
       JOIN mr_lines ml ON ml.id = mlsq.mr_line_id
       WHERE ml.mr_header_id = ?
         AND mlsq.total_price IS NOT NULL
         AND mlsq.total_price > 0
       GROUP BY mlsq.mr_line_id`,
      [Number(body.mr_header_id)],
    );

    const result: Record<number, { min: number; max: number }> = {};
    for (const row of rows) {
      result[Number(row.mr_line_id)] = {
        min: Number(row.min_price),
        max: Number(row.max_price),
      };
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.error("SQL Error:", err.sqlMessage || err.message);
    return NextResponse.json(
      { error: err.sqlMessage || err.message },
      { status: 500 },
    );
  }
}
