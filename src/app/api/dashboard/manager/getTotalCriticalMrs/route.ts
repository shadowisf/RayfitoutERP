import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { limit: itemLimit } = body;
    const maxItems =
      typeof itemLimit === "number" && itemLimit > 0 ? itemLimit : 20;

    // Count overdue MRs: below segregated stage (< 26), not completed (25)
    const [mrCountRows]: any = await db.query(`
      SELECT COUNT(*) AS overdue_count
      FROM vw_mr_headers
      WHERE required_date < CURDATE()
        AND progress_id < 26 AND progress_id != 25
    `);

    // Count overdue LPOs: above LPO & Invoice stage (> 12), not completed (25)
    const [lpoCountRows]: any = await db.query(`
      SELECT COUNT(*) AS overdue_count
      FROM lpo l
      WHERE l.progress_id > 12
        AND l.delivery_date < CURDATE()
        AND l.progress_id != 25
    `);

    const totalOverdue =
      Number(mrCountRows[0].overdue_count || 0) +
      Number(lpoCountRows[0].overdue_count || 0);

    // Get item details for popup/details page
    const halfLimit = Math.ceil(maxItems / 2);

    const [mrItems]: any = await db.query(
      `SELECT id, type, required_date
       FROM vw_mr_headers
       WHERE required_date < CURDATE()
         AND progress_id < 26 AND progress_id != 25
       ORDER BY required_date ASC LIMIT ?`,
      [halfLimit],
    );

    const [lpoItems]: any = await db.query(
      `SELECT l.id, l.mr_header_id, l.delivery_date
       FROM lpo l
       WHERE l.progress_id > 12
         AND l.delivery_date < CURDATE()
         AND l.progress_id != 25
       ORDER BY l.delivery_date ASC LIMIT ?`,
      [halfLimit],
    );

    const items = [
      ...mrItems.map((mr: any) => ({
        display_id: `${mr.type === "job" ? "JO" : "MR"}-${String(mr.id).padStart(5, "0")}`,
        overdue_date: mr.required_date,
        raw_id: mr.id,
        type: "mr",
      })),
      ...lpoItems.map((lpo: any) => ({
        display_id: `LPO-${String(lpo.id).padStart(5, "0")}`,
        overdue_date: lpo.delivery_date,
        raw_id: lpo.id,
        mr_header_id: lpo.mr_header_id,
        type: "lpo",
      })),
    ].slice(0, maxItems);

    return NextResponse.json(
      {
        overdue_count: totalOverdue,
        items,
        total_count: totalOverdue,
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error(err.sqlMessage || err.message);
    return NextResponse.json(
      { error: err.sqlMessage || err.message },
      { status: 500 },
    );
  }
}
