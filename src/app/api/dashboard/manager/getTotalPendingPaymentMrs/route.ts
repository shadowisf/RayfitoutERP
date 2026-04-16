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

// Build a map of progress_id -> median historical duration (minutes).
// LPO progress transitions are recorded in the same `mr_header_progress_log`
// table (with an additional `lpo_id` reference), so the same query that
// powers Active MRs' bottleneck medians is reused here to guarantee
// perfectly consistent numbers across every widget that reports a stage
// median time.
async function buildStageMediansMap(
  db: any,
  filter: number,
): Promise<Record<number, number>> {
  const whereClause =
    filter > 0
      ? `WHERE pl1.changed_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)`
      : "";
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
  const params = filter > 0 ? [filter] : [];
  const [rows]: any = await db.query(query, params);

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
    const { filter, limit: itemLimit } = body;
    const maxItems =
      typeof itemLimit === "number" && itemLimit > 0 ? itemLimit : 20;

    if (
      filter === undefined ||
      filter === null ||
      typeof filter !== "number" ||
      filter < 0
    ) {
      return NextResponse.json(
        { error: "Invalid 'filter' parameter. Must be a non-negative number." },
        { status: 400 },
      );
    }

    // Pending payments include BOTH Pending Payment (14) and Payment Rejected (13).
    // Card count, hover bottleneck, and projects-at-risk all share the same
    // filter so the totals are consistent across the widget.
    const inProgressClause = `l.progress_id IN (13, 14)`;

    if (filter === 0) {
      const [rows]: any = await db.query(
        `SELECT COUNT(*) AS this_week FROM lpo WHERE progress_id IN (13, 14)`,
      );
      const [itemRows]: any = await db.query(
        `SELECT l.id AS lpo_id, l.mr_header_id, l.total, s.name AS supplier_name
         FROM lpo l
         LEFT JOIN suppliers s ON s.id = l.supplier_id
         WHERE l.progress_id IN (13, 14)
         ORDER BY l.total DESC LIMIT ?`,
        [maxItems],
      );
      const items = itemRows.map((lpo: any) => ({
        display_id: `LPO-${String(lpo.lpo_id).padStart(5, "0")}`,
        amount: Number(lpo.total) || 0,
        raw_id: lpo.lpo_id,
        mr_header_id: lpo.mr_header_id,
        type: "lpo",
      }));

      // Bottleneck stages: count grouped by current progress stage,
      // median comes from historical log (same calculation as Active MRs).
      const [bottleneckCountRows]: any = await db.query(
        `SELECT l.progress_id, pr.value AS progress_name, COUNT(*) AS mr_count
         FROM lpo l
         LEFT JOIN lut_mr_headers_progress pr ON pr.id = l.progress_id
         WHERE ${inProgressClause}
         GROUP BY l.progress_id, pr.value
         ORDER BY mr_count DESC`,
      );

      const stageMediansMap = await buildStageMediansMap(db, filter);
      const bottleneckRows = bottleneckCountRows.map((r: any) => ({
        progress_id: Number(r.progress_id),
        progress_name: r.progress_name,
        mr_count: Number(r.mr_count),
        median_minutes: stageMediansMap[Number(r.progress_id)] || 0,
      }));

      // Projects at risk: in-progress LPOs grouped by project
      const [projectRows]: any = await db.query(
        `SELECT p.name AS project_name, COUNT(*) AS mr_count
         FROM lpo l
         LEFT JOIN projects p ON p.id = l.project_id
         WHERE ${inProgressClause}
         GROUP BY p.id, p.name
         ORDER BY mr_count DESC`,
      );

      // Date range: earliest/latest LPO creation date within scope
      const [dateRangeRows]: any = await db.query(
        `SELECT
           MIN(l.created_at) AS earliest,
           MAX(l.created_at) AS latest
         FROM lpo l
         WHERE ${inProgressClause}`,
      );

      const count = rows[0].this_week || 0;
      return NextResponse.json(
        {
          this_week: count,
          last_week: 0,
          items,
          total_count: count,
          bottleneck_stages: bottleneckRows,
          projects_at_risk: projectRows,
          date_range: {
            earliest: dateRangeRows[0]?.earliest || null,
            latest: dateRangeRows[0]?.latest || null,
          },
        },
        { status: 200 },
      );
    }

    const [rows]: any = await db.query(
      `SELECT
        SUM(l.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)) AS this_week,
        SUM(l.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY) AND l.created_at < DATE_SUB(CURDATE(), INTERVAL ? DAY)) AS last_week
      FROM lpo l WHERE l.progress_id IN (13, 14)`,
      [filter, filter * 2, filter],
    );
    const [itemRows]: any = await db.query(
      `SELECT l.id AS lpo_id, l.mr_header_id, l.total, s.name AS supplier_name
       FROM lpo l
       LEFT JOIN suppliers s ON s.id = l.supplier_id
       WHERE l.progress_id IN (13, 14)
         AND l.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       ORDER BY l.total DESC LIMIT ?`,
      [filter, maxItems],
    );
    const items = itemRows.map((lpo: any) => ({
      display_id: `LPO-${String(lpo.lpo_id).padStart(5, "0")}`,
      amount: Number(lpo.total) || 0,
      raw_id: lpo.lpo_id,
      mr_header_id: lpo.mr_header_id,
      type: "lpo",
    }));

    // Bottleneck stages (date-filtered) — count grouped by current progress,
    // median sourced from historical log.
    const [bottleneckCountRows]: any = await db.query(
      `SELECT l.progress_id, pr.value AS progress_name, COUNT(*) AS mr_count
       FROM lpo l
       LEFT JOIN lut_mr_headers_progress pr ON pr.id = l.progress_id
       WHERE ${inProgressClause}
         AND l.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY l.progress_id, pr.value
       ORDER BY mr_count DESC`,
      [filter],
    );

    const stageMediansMap = await buildStageMediansMap(db, filter);
    const bottleneckRows = bottleneckCountRows.map((r: any) => ({
      progress_id: Number(r.progress_id),
      progress_name: r.progress_name,
      mr_count: Number(r.mr_count),
      median_minutes: stageMediansMap[Number(r.progress_id)] || 0,
    }));

    // Projects at risk (date-filtered)
    const [projectRows]: any = await db.query(
      `SELECT p.name AS project_name, COUNT(*) AS mr_count
       FROM lpo l
       LEFT JOIN projects p ON p.id = l.project_id
       WHERE ${inProgressClause}
         AND l.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY p.id, p.name
       ORDER BY mr_count DESC`,
      [filter],
    );

    // Date range (date-filtered)
    const [dateRangeRows]: any = await db.query(
      `SELECT
         MIN(l.created_at) AS earliest,
         MAX(l.created_at) AS latest
       FROM lpo l
       WHERE ${inProgressClause}
         AND l.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)`,
      [filter],
    );

    const thisWeek = rows[0].this_week || 0;
    return NextResponse.json(
      {
        ...rows[0],
        items,
        total_count: thisWeek,
        bottleneck_stages: bottleneckRows,
        projects_at_risk: projectRows,
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
