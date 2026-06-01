import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";

// Batch version of getDeliveryDatesByMrHeaderID.
// Replaces N individual calls with a single query.
//
// Body: { mr_header_ids: number[] }
// Returns: Record<mr_header_id, Array<{ supplier_name: string; delivery_date: string }>>

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { mr_header_ids } = body as { mr_header_ids: number[] };

    if (!Array.isArray(mr_header_ids) || mr_header_ids.length === 0) {
      return NextResponse.json({}, { status: 200 });
    }

    const ids = mr_header_ids
      .map(Number)
      .filter((n) => !isNaN(n) && Number.isInteger(n));
    if (ids.length === 0) {
      return NextResponse.json({}, { status: 200 });
    }

    const placeholders = ids.map(() => "?").join(", ");

    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT
         lpo.mr_header_id,
         s.name  AS supplier_name,
         lpo.delivery_date
       FROM lpo
       INNER JOIN suppliers s ON lpo.supplier_id = s.id
       WHERE lpo.mr_header_id IN (${placeholders})
         AND lpo.delivery_date IS NOT NULL
       ORDER BY lpo.mr_header_id, s.name`,
      ids,
    );

    // Initialise all requested IDs to empty arrays
    const result: Record<
      number,
      Array<{ supplier_name: string; delivery_date: string }>
    > = {};
    for (const id of ids) result[id] = [];

    for (const row of rows as any[]) {
      const mrId = Number(row.mr_header_id);
      if (result[mrId]) {
        result[mrId].push({
          supplier_name: row.supplier_name,
          delivery_date: row.delivery_date,
        });
      }
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.log(
      "[getBatchDeliveryDates] error:",
      err.sqlMessage || err.message,
    );
    return NextResponse.json({}, { status: 200 });
  }
}
