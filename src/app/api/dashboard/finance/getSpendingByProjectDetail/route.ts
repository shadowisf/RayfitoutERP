import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2";

// Returns individual LPO rows for a specific project + period bucket.
// Query params:
//   project     – project name (URL-encoded), use "Unspecified" for nulls
//   periodKey   – date key matching the chart grouping (YYYY-MM-DD or YYYY-MM)
//   granularity – "daily" | "monthly"
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const project = searchParams.get("project");
    const periodKey = searchParams.get("periodKey");
    const granularity = searchParams.get("granularity") ?? "monthly";

    if (!project || !periodKey) {
      return NextResponse.json(
        { error: "project and periodKey params required" },
        { status: 400 },
      );
    }

    const dateFmt = granularity === "daily" ? "%Y-%m-%d" : "%Y-%m";

    const projectFilter =
      project === "Unspecified"
        ? "COALESCE(p.name, 'Unspecified') = 'Unspecified'"
        : "COALESCE(p.name, 'Unspecified') = ?";
    const projectArgs = project === "Unspecified" ? [] : [project];

    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT
         mh.id                                  AS mr_header_id,
         l.id                                   AS lpo_id,
         ROUND(
           CASE
             WHEN LOWER(IFNULL(l.payment_status, ''))
                  IN ('approved','paid','fully paid','completed','done')
               THEN l.total
             ELSE COALESCE(pay.total_paid, 0)
           END, 2
         )                                      AS total_price,
         DATE_FORMAT(l.created_at, '%d %b %Y') AS date
       FROM lpo l
       JOIN mr_headers mh ON l.mr_header_id = mh.id
       LEFT JOIN projects p ON mh.project_id = p.id
       LEFT JOIN (
         SELECT lpo_id, SUM(amount) AS total_paid
         FROM lpo_payments
         GROUP BY lpo_id
       ) pay ON pay.lpo_id = l.id
       WHERE l.progress_id NOT IN (13)
         AND ${projectFilter}
         AND DATE_FORMAT(l.created_at, ?) = ?
       ORDER BY l.created_at ASC`,
      [...projectArgs, dateFmt, periodKey],
    );

    const data = (rows as any[]).map((row) => ({
      mr_header_id: Number(row.mr_header_id),
      lpo_id: Number(row.lpo_id),
      total_price: row.total_price != null ? Number(row.total_price) : 0,
      date: row.date ?? "—",
    }));

    return NextResponse.json(data, { status: 200 });
  } catch (err: any) {
    console.error(
      "getSpendingByProjectDetail error:",
      err.sqlMessage || err.message,
    );
    return NextResponse.json(
      { error: err.sqlMessage || err.message },
      { status: 500 },
    );
  }
}
