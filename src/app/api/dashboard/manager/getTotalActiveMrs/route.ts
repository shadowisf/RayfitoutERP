import { db } from "@/lib/db";
import { NextResponse } from "next/server";

// Median of a numeric array (matches getAvgTimeSpentPerStage's algorithm)
function getMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  }
  return sorted[mid];
}

// Build a map of progress_id -> median historical duration (minutes) by
// running the EXACT same query logic as getAvgTimeSpentPerStage. This makes
// the bottleneck "median time" values match the "Median Time Spent Per Stage"
// widget for any given stage.
async function buildStageMediansMap(
  db: any,
  date_from: string | undefined,
  date_to: string | undefined,
): Promise<Record<number, number>> {
  const parts: string[] = [];
  if (date_from) parts.push(`pl1.changed_at >= '${date_from}'`);
  if (date_to) parts.push(`pl1.changed_at <= '${date_to}'`);
  const whereClause = parts.length > 0 ? `WHERE ${parts.join(" AND ")}` : "";
  const query = `
    SELECT
      pl1.progress_id,
      TIMESTAMPDIFF(
        MINUTE,
        pl1.changed_at,
        COALESCE(pl2.changed_at, NOW())
      ) AS duration_minutes
    FROM mr_header_progress_log pl1
    LEFT JOIN mr_header_progress_log pl2
      ON pl1.mr_header_id = pl2.mr_header_id
      AND pl2.id = (
        SELECT MIN(id)
        FROM mr_header_progress_log
        WHERE mr_header_id = pl1.mr_header_id
        AND id > pl1.id
      )
    ${whereClause}
  `;
  const [rows]: any = await db.query(query);

  const durationsByStage: Record<number, number[]> = {};
  for (const row of rows) {
    const pid = Number(row.progress_id);
    if (!durationsByStage[pid]) durationsByStage[pid] = [];
    durationsByStage[pid].push(Math.round(row.duration_minutes || 0));
  }

  const medians: Record<number, number> = {};
  for (const [pid, durs] of Object.entries(durationsByStage)) {
    medians[Number(pid)] = getMedian(durs);
  }
  return medians;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { date_from, date_to, limit: itemLimit } = body;
    const maxItems =
      typeof itemLimit === "number" && itemLimit > 0 ? itemLimit : 20;

    // Active MRs: exclude completed (25), draft (1), and segregated (26)
    // where ALL LPOs are completed OR no LPOs exist. Material type only.
    const buildSegregatedExclusionClause = (alias: string) => `
      AND NOT (
        ${alias}.progress_id = 26
        AND (
          (SELECT COUNT(*) FROM lpo WHERE lpo.mr_header_id = ${alias}.id) = 0
          OR (SELECT COUNT(*) FROM lpo WHERE lpo.mr_header_id = ${alias}.id AND lpo.progress_id != 25) = 0
        )
      )`;

    // Date filter is applied identically across the card count, items list,
    // bottleneck stages, projects-at-risk, and most-requested subcategories
    // so all hover sections sum to the same total.
    const buildDateFilterClause = (alias: string) => {
      const parts: string[] = [];
      if (date_from) parts.push(`AND ${alias}.date_requested >= '${date_from}'`);
      if (date_to) parts.push(`AND ${alias}.date_requested <= '${date_to}'`);
      return parts.join(" ");
    };

    const buildActiveWhere = (alias: string) =>
      `WHERE ${alias}.progress_id != 25 AND ${alias}.progress_id != 1 AND ${alias}.type = 'material' ${buildSegregatedExclusionClause(alias)} ${buildDateFilterClause(alias)}`;

    // Legacy non-aliased version (for existing queries that reference the view
    // directly as "vw_mr_headers" without an alias).
    const activeWhere = buildActiveWhere("vw_mr_headers");
    // Aliased version used by the bottleneck query where vw_mr_headers is "mr".
    const activeWhereMrAlias = buildActiveWhere("mr");

    const [mrRows]: any = await db.query(
      `SELECT COUNT(*) AS mr_count FROM vw_mr_headers ${activeWhere}`,
    );
    const thisWeek = Number(mrRows[0].mr_count || 0);

    const [mrItems]: any = await db.query(
      `SELECT id, type, project_name,
         (SELECT COUNT(*) FROM mr_lines ml WHERE ml.mr_header_id = vw_mr_headers.id) AS item_count
       FROM vw_mr_headers ${activeWhere}
       ORDER BY date_requested DESC LIMIT ?`,
      [maxItems],
    );

    const items = mrItems.map((mr: any) => ({
      display_id: `MR-${String(mr.id).padStart(5, "0")}`,
      item_count: Number(mr.item_count) || 0,
      raw_id: mr.id,
      type: "mr",
    }));

    // Bottleneck stages: count active MRs bucketed by their CURRENT stage.
    // For MRs past quotation (progress_id >= 12) with at least one incomplete
    // LPO, the bucket is the LOWEST-progress incomplete LPO's stage (since
    // LPO progress drives procurement after quotation). The "median time"
    // shown per bucket is the HISTORICAL median duration spent in that stage
    // (same calculation as the "Median Time Spent Per Stage" widget), so
    // both widgets report identical medians for any given stage.
    const [bottleneckCountRows]: any = await db.query(
      `SELECT
         bucket_progress_id AS progress_id,
         bucket_progress_name AS progress_name,
         COUNT(*) AS mr_count
       FROM (
         SELECT
           CASE
             WHEN mr.progress_id >= 12 AND rep.id IS NOT NULL THEN rep.progress_id
             ELSE mr.progress_id
           END AS bucket_progress_id,
           CASE
             WHEN mr.progress_id >= 12 AND rep.id IS NOT NULL THEN rep_p.value
             ELSE mr.progress_name
           END AS bucket_progress_name
         FROM vw_mr_headers mr
         LEFT JOIN lpo rep ON rep.id = (
           SELECT l.id FROM lpo l
           WHERE l.mr_header_id = mr.id
             AND l.progress_id NOT IN (1, 25)
           ORDER BY l.progress_id ASC, l.id ASC
           LIMIT 1
         )
         LEFT JOIN lut_mr_headers_progress rep_p ON rep_p.id = rep.progress_id
         ${activeWhereMrAlias}
       ) AS bucketed
       GROUP BY bucket_progress_id, bucket_progress_name
       ORDER BY mr_count DESC`,
    );

    const stageMediansMap = await buildStageMediansMap(db, date_from, date_to);
    const bottleneckRows = bottleneckCountRows.map((r: any) => ({
      progress_id: Number(r.progress_id),
      progress_name: r.progress_name,
      mr_count: Number(r.mr_count),
      median_minutes: stageMediansMap[Number(r.progress_id)] || 0,
    }));

    // Projects at risk: group active MRs by project
    const [projectRows]: any = await db.query(
      `SELECT project_name, COUNT(*) AS mr_count
       FROM vw_mr_headers ${activeWhere}
       GROUP BY project_name
       ORDER BY mr_count DESC`,
    );

    // Most requested subcategories (count items, not MRs)
    const [subcategoryRows]: any = await db.query(
      `SELECT msc.value AS subcategory_name, COUNT(ml.id) AS item_count
       FROM mr_lines ml
       INNER JOIN jt_mr_line_material_subcategory jt ON jt.mr_line_id = ml.id
       INNER JOIN lut_material_subcategories msc ON msc.id = jt.material_subcategory_id
       WHERE ml.mr_header_id IN (
         SELECT id FROM vw_mr_headers ${activeWhere}
       )
       GROUP BY msc.id, msc.value
       ORDER BY item_count DESC`,
    );

    // Date range: earliest/latest MR creation within current scope
    const [dateRangeRows]: any = await db.query(
      `SELECT
         MIN(date_requested) AS earliest,
         MAX(date_requested) AS latest
       FROM vw_mr_headers ${activeWhere}`,
    );

    return NextResponse.json(
      {
        this_week: thisWeek,
        last_week: 0,
        items,
        total_count: thisWeek,
        bottleneck_stages: bottleneckRows,
        projects_at_risk: projectRows,
        most_requested_subcategories: subcategoryRows,
        date_range: {
          earliest: dateRangeRows[0]?.earliest || null,
          latest: dateRangeRows[0]?.latest || null,
        },
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
