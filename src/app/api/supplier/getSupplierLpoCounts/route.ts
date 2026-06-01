import { db } from "@/lib/db";
import { NextResponse } from "next/server";

// Returns the number of approved LPOs per supplier for a given list of supplier IDs.
// Used to identify the "frequently used vendor" among a set of quotation suppliers.
export async function POST(req: Request) {
  try {
    const { supplier_ids } = await req.json();

    if (!Array.isArray(supplier_ids) || supplier_ids.length === 0) {
      return NextResponse.json(
        { error: "supplier_ids array is required" },
        { status: 400 },
      );
    }

    const ids = supplier_ids.map(Number).filter((n) => !isNaN(n));
    if (ids.length === 0) {
      return NextResponse.json({}, { status: 200 });
    }

    const placeholders = ids.map(() => "?").join(", ");

    const [rows]: any = await db.query(
      `SELECT supplier_id, COUNT(*) AS lpo_count
       FROM lpo
       WHERE supplier_id IN (${placeholders})
       GROUP BY supplier_id`,
      ids,
    );

    const result: Record<number, number> = {};
    for (const row of rows) {
      result[Number(row.supplier_id)] = Number(row.lpo_count);
    }

    // Ensure every requested id has an entry (0 if no LPOs)
    for (const id of ids) {
      if (!(id in result)) result[id] = 0;
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.error("getSupplierLpoCounts error:", err.sqlMessage || err.message);
    return NextResponse.json(
      { error: err.sqlMessage || err.message },
      { status: 500 },
    );
  }
}
