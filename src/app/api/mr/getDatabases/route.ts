import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    // Show a database if:
    //   - it has no items yet (newly created, empty), OR
    //   - it has at least one non-archived item
    // Hide a database if every item it contains is archived.
    const [rows]: any = await db.query(
      `SELECT ld.id, ld.name
       FROM lut_predefined_databases ld
       LEFT JOIN lut_predefined_items pi ON pi.database_id = ld.id
       GROUP BY ld.id, ld.name
       HAVING
         COUNT(pi.id) = 0
         OR SUM(CASE WHEN pi.is_archived = 0 OR pi.is_archived IS NULL THEN 1 ELSE 0 END) > 0
       ORDER BY ld.name ASC`,
    );
    return NextResponse.json(rows as { id: number; name: string }[]);
  } catch (err: any) {
    console.error(err.sqlMessage);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}
