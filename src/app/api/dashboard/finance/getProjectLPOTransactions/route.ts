import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2";

// Returns all LPO rows for a given project within an optional date range.
// Query params:
//   project   – project name (URL-encoded); use "Unspecified" for nulls
//   startDate – optional YYYY-MM-DD
//   endDate   – optional YYYY-MM-DD
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const project = searchParams.get("project");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!project) {
      return NextResponse.json(
        { error: "project param required" },
        { status: 400 },
      );
    }

    const projectFilter =
      project === "Unspecified"
        ? "COALESCE(p.name, 'Unspecified') = 'Unspecified'"
        : "COALESCE(p.name, 'Unspecified') = ?";
    const projectArgs: any[] = project === "Unspecified" ? [] : [project];

    const dateWhere = [
      startDate ? "DATE(l.created_at) >= ?" : "",
      endDate ? "DATE(l.created_at) <= ?" : "",
    ]
      .filter(Boolean)
      .join(" AND ");
    const dateArgs: any[] = [
      ...(startDate ? [startDate] : []),
      ...(endDate ? [endDate] : []),
    ];

    const whereClause = [
      "l.progress_id NOT IN (13)",
      projectFilter,
      dateWhere,
    ]
      .filter(Boolean)
      .join(" AND ");

    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT
         mh.id                                  AS mr_header_id,
         l.id                                   AS lpo_id,
         ROUND(l.total, 2)                       AS total_price,
         DATE_FORMAT(l.created_at, '%d %b %Y') AS date
       FROM lpo l
       JOIN mr_headers mh ON l.mr_header_id = mh.id
       LEFT JOIN projects p ON mh.project_id = p.id
       WHERE ${whereClause}
       ORDER BY l.created_at DESC`,
      [...projectArgs, ...dateArgs],
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
      "getProjectLPOTransactions error:",
      err.sqlMessage || err.message,
    );
    return NextResponse.json(
      { error: err.sqlMessage || err.message },
      { status: 500 },
    );
  }
}
