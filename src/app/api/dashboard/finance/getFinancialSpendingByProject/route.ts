import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startParam = searchParams.get("startDate");
    const endParam = searchParams.get("endDate");

    const hasDateFilter = Boolean(startParam || endParam);
    const effectiveEnd = endParam
      ? new Date(endParam + "T23:59:59")
      : new Date();
    const effectiveStart = startParam
      ? new Date(startParam + "T00:00:00")
      : new Date(new Date().setFullYear(new Date().getFullYear() - 10));

    const diffDays =
      (effectiveEnd.getTime() - effectiveStart.getTime()) /
      (1000 * 60 * 60 * 24);

    const granularity: "daily" | "monthly" =
      diffDays <= 62 ? "daily" : "monthly";
    const dateKeyFmt = granularity === "daily" ? "%Y-%m-%d" : "%Y-%m";
    const labelFmt = granularity === "daily" ? "%d %b" : "%b %Y";

    const startStr = effectiveStart.toISOString().split("T")[0];
    const endStr = effectiveEnd.toISOString().split("T")[0];

    const dateWhere = hasDateFilter
      ? "AND DATE(l.created_at) >= ? AND DATE(l.created_at) <= ?"
      : "";
    const dateArgs = hasDateFilter ? [startStr, endStr] : [];

    // 1. Chart data — two-case: old LPOs use l.total, new LPOs use lpo_payments sum
    const [chartRows] = await db.query<RowDataPacket[]>(
      `SELECT
         DATE_FORMAT(l.created_at, ?) AS period_key,
         DATE_FORMAT(l.created_at, ?) AS period_label,
         COALESCE(p.name, 'Unspecified') AS project_name,
         COALESCE(SUM(
           CASE
             WHEN LOWER(IFNULL(l.payment_status, ''))
                  IN ('approved','paid','fully paid','completed','done')
               THEN l.total
             ELSE COALESCE(pay.total_paid, 0)
           END
         ), 0) AS total_spent
       FROM lpo l
       JOIN mr_headers mh ON l.mr_header_id = mh.id
       LEFT JOIN projects p ON mh.project_id = p.id
       LEFT JOIN (
         SELECT lpo_id, SUM(amount) AS total_paid
         FROM lpo_payments
         GROUP BY lpo_id
       ) pay ON pay.lpo_id = l.id
       WHERE l.progress_id NOT IN (13) ${dateWhere}
       GROUP BY period_key, period_label, p.id, p.name
       ORDER BY period_key ASC`,
      [dateKeyFmt, labelFmt, ...dateArgs],
    );

    // 2. Project budgets
    const [budgetRows] = await db.query<RowDataPacket[]>(
      `SELECT name, COALESCE(quoted_budget, 0) AS quoted_budget
       FROM projects
       WHERE quoted_budget IS NOT NULL AND quoted_budget > 0`,
    );

    // Build project_budgets map
    const projectBudgets: Record<string, number> = {};
    for (const row of budgetRows as any[]) {
      projectBudgets[row.name] = Number(row.quoted_budget);
    }

    // Build chartData pivot
    const periodMap = new Map<string, string>();
    const projectTotalMap: Record<string, number> = {};
    const projectSet = new Set<string>();

    for (const row of chartRows as any[]) {
      periodMap.set(row.period_key, row.period_label);
      projectSet.add(row.project_name);
      // Accumulate per-project total for the table
      projectTotalMap[row.project_name] =
        (projectTotalMap[row.project_name] ?? 0) + Number(row.total_spent);
    }

    const periods = Array.from(periodMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, label]) => ({ key, label }));

    // Sort projects alphabetically; put Unspecified last
    const projects = Array.from(projectSet).sort((a, b) => {
      if (a === "Unspecified") return 1;
      if (b === "Unspecified") return -1;
      return a.localeCompare(b);
    });

    const lookup: Record<string, Record<string, number>> = {};
    for (const row of chartRows as any[]) {
      if (!lookup[row.period_key]) lookup[row.period_key] = {};
      lookup[row.period_key][row.project_name] = Number(row.total_spent);
    }

    const chartData = periods.map(({ key, label }) => {
      const entry: Record<string, string | number> = { month: label };
      for (const project of projects) {
        entry[project] = lookup[key]?.[project] ?? 0;
      }
      return entry;
    });

    // Table data: total per project, sorted desc — Unspecified always last
    const tableData = Object.entries(projectTotalMap)
      .sort((a, b) => {
        if (a[0] === "Unspecified") return 1;
        if (b[0] === "Unspecified") return -1;
        return b[1] - a[1];
      })
      .map(([project, total]) => ({ project, total }));

    return NextResponse.json(
      {
        projects,
        project_budgets: projectBudgets,
        chartData,
        table_data: tableData,
        granularity,
      },
      { status: 200 },
    );
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
