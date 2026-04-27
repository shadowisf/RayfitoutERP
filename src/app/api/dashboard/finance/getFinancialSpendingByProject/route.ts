import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2";

export async function GET() {
  try {
    // Monthly spending grouped by project (last 12 months)
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT
        DATE_FORMAT(l.created_at, '%Y-%m') AS month_key,
        DATE_FORMAT(l.created_at, '%b %Y') AS month_label,
        COALESCE(p.name, 'Unassigned') AS project_name,
        COALESCE(SUM(l.total), 0) AS total_spent
       FROM lpo l
       JOIN mr_headers mh ON l.mr_header_id = mh.id
       LEFT JOIN projects p ON mh.project_id = p.id
       WHERE l.progress_id != 26
         AND l.created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
       GROUP BY month_key, month_label, p.id, p.name
       ORDER BY month_key ASC`,
    );

    // Collect all unique months (sorted)
    const monthMap = new Map<string, string>();
    const projectSet = new Set<string>();

    for (const row of rows as any[]) {
      monthMap.set(row.month_key, row.month_label);
      projectSet.add(row.project_name);
    }

    const months = Array.from(monthMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, label]) => ({ key, label }));

    const projects = Array.from(projectSet);

    // Build a lookup: { [month_key]: { [project_name]: total_spent } }
    const lookup: Record<string, Record<string, number>> = {};
    for (const row of rows as any[]) {
      if (!lookup[row.month_key]) lookup[row.month_key] = {};
      lookup[row.month_key][row.project_name] = Number(row.total_spent);
    }

    // Build chart data: array of { month: "Jan 2025", ProjectA: 50000, ProjectB: 30000, ... }
    const chartData = months.map(({ key, label }) => {
      const entry: Record<string, string | number> = { month: label };
      for (const project of projects) {
        entry[project] = lookup[key]?.[project] ?? 0;
      }
      return entry;
    });

    return NextResponse.json({ projects, chartData }, { status: 200 });
  } catch (err: any) {
    console.error(
      "getFinancialSpendingByProject error:",
      err.sqlMessage || err.message,
    );
    return NextResponse.json(
      { error: err.sqlMessage || err.message },
      { status: 500 },
    );
  }
}
