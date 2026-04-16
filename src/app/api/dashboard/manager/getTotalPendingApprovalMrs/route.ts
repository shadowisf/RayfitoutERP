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
// running the EXACT same query logic as Active MRs. This makes the
// bottleneck "median time" values match the "Median Time Spent Per Stage"
// widget for any given stage.
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

    // Pending approval includes:
    //   - Material MRs at progress 3 (initial) or 10 (price)
    //   - Job orders at progress 3 (initial) or 10 (price)
    //   - Payment requests at progress 3 (manager approval; payments have no price stage)
    const pendingClause = `(
        (type IN ('material', 'job') AND progress_id IN (3, 10))
        OR (type = 'payment' AND progress_id = 3)
      )`;

    if (filter === 0) {
      // Total + breakdown by type
      const [breakdownRows]: any = await db.query(
        `SELECT
          SUM(CASE WHEN type = 'material' THEN 1 ELSE 0 END) AS mr_count,
          SUM(CASE WHEN type = 'job' THEN 1 ELSE 0 END) AS jo_count,
          SUM(CASE WHEN type = 'payment' THEN 1 ELSE 0 END) AS payment_count,
          COUNT(*) AS this_week
         FROM vw_mr_headers
         WHERE ${pendingClause}`,
      );

      const [itemRows]: any = await db.query(
        `SELECT id, type, project_name,
           CASE
             WHEN type = 'job' THEN (SELECT COUNT(*) FROM jo_lines jl WHERE jl.mr_header_id = vw_mr_headers.id)
             WHEN type = 'payment' THEN (SELECT COUNT(*) FROM pr_lines pl WHERE pl.mr_header_id = vw_mr_headers.id)
             ELSE (SELECT COUNT(*) FROM mr_lines ml WHERE ml.mr_header_id = vw_mr_headers.id)
           END AS item_count
         FROM vw_mr_headers
         WHERE ${pendingClause}
         ORDER BY date_requested DESC LIMIT ?`,
        [maxItems],
      );

      const items = itemRows.map((mr: any) => ({
        display_id: `${
          mr.type === "job" ? "JO" : mr.type === "payment" ? "PR" : "MR"
        }-${String(mr.id).padStart(5, "0")}`,
        item_count: Number(mr.item_count) || 0,
        raw_id: mr.id,
        type: "mr",
      }));

      // Bottleneck stages: count per progress_id (current state),
      // and use HISTORICAL median from mr_header_progress_log (same as Active MRs).
      const [bottleneckCountRows]: any = await db.query(
        `SELECT progress_id, progress_name, COUNT(*) AS mr_count
         FROM vw_mr_headers
         WHERE ${pendingClause}
         GROUP BY progress_id, progress_name
         ORDER BY mr_count DESC`,
      );

      const stageMediansMap = await buildStageMediansMap(db, filter);
      const bottleneckRows = bottleneckCountRows.map((r: any) => ({
        progress_id: Number(r.progress_id),
        progress_name: r.progress_name,
        mr_count: Number(r.mr_count),
        median_minutes: stageMediansMap[Number(r.progress_id)] || 0,
      }));

      // Projects at risk: group pending approvals by project
      const [projectRows]: any = await db.query(
        `SELECT project_name, COUNT(*) AS mr_count
         FROM vw_mr_headers
         WHERE ${pendingClause}
         GROUP BY project_name
         ORDER BY mr_count DESC`,
      );

      // Date range: earliest and latest creation date within the current scope
      const [dateRangeRows]: any = await db.query(
        `SELECT
           MIN(date_requested) AS earliest,
           MAX(date_requested) AS latest
         FROM vw_mr_headers
         WHERE ${pendingClause}`,
      );

      const count = Number(breakdownRows[0].this_week) || 0;
      return NextResponse.json(
        {
          this_week: count,
          last_week: 0,
          items,
          total_count: count,
          mr_count: Number(breakdownRows[0].mr_count) || 0,
          jo_count: Number(breakdownRows[0].jo_count) || 0,
          payment_count: Number(breakdownRows[0].payment_count) || 0,
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
        SUM(date_requested >= DATE_SUB(CURDATE(), INTERVAL ? DAY)) AS this_week,
        SUM(date_requested >= DATE_SUB(CURDATE(), INTERVAL ? DAY) AND date_requested < DATE_SUB(CURDATE(), INTERVAL ? DAY)) AS last_week,
        SUM(CASE WHEN type = 'material' AND date_requested >= DATE_SUB(CURDATE(), INTERVAL ? DAY) THEN 1 ELSE 0 END) AS mr_count,
        SUM(CASE WHEN type = 'job' AND date_requested >= DATE_SUB(CURDATE(), INTERVAL ? DAY) THEN 1 ELSE 0 END) AS jo_count,
        SUM(CASE WHEN type = 'payment' AND date_requested >= DATE_SUB(CURDATE(), INTERVAL ? DAY) THEN 1 ELSE 0 END) AS payment_count
      FROM vw_mr_headers
      WHERE ${pendingClause}`,
      [filter, filter * 2, filter, filter, filter, filter],
    );

    const [itemRows]: any = await db.query(
      `SELECT id, type, project_name,
         CASE
           WHEN type = 'job' THEN (SELECT COUNT(*) FROM jo_lines jl WHERE jl.mr_header_id = vw_mr_headers.id)
           WHEN type = 'payment' THEN (SELECT COUNT(*) FROM pr_lines pl WHERE pl.mr_header_id = vw_mr_headers.id)
           ELSE (SELECT COUNT(*) FROM mr_lines ml WHERE ml.mr_header_id = vw_mr_headers.id)
         END AS item_count
       FROM vw_mr_headers
       WHERE ${pendingClause}
         AND date_requested >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       ORDER BY date_requested DESC LIMIT ?`,
      [filter, maxItems],
    );

    const items = itemRows.map((mr: any) => ({
      display_id: `${
        mr.type === "job" ? "JO" : mr.type === "payment" ? "PR" : "MR"
      }-${String(mr.id).padStart(5, "0")}`,
      item_count: Number(mr.item_count) || 0,
      raw_id: mr.id,
      type: "mr",
    }));

    // Bottleneck stages (date-filtered) — count grouped by current progress,
    // median comes from historical log via buildStageMediansMap.
    const [bottleneckCountRows]: any = await db.query(
      `SELECT progress_id, progress_name, COUNT(*) AS mr_count
       FROM vw_mr_headers
       WHERE ${pendingClause}
         AND date_requested >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY progress_id, progress_name
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

    // Projects at risk (filtered by date)
    const [projectRows]: any = await db.query(
      `SELECT project_name, COUNT(*) AS mr_count
       FROM vw_mr_headers
       WHERE ${pendingClause}
         AND date_requested >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY project_name
       ORDER BY mr_count DESC`,
      [filter],
    );

    // Date range (filtered by date)
    const [dateRangeRows]: any = await db.query(
      `SELECT
         MIN(date_requested) AS earliest,
         MAX(date_requested) AS latest
       FROM vw_mr_headers
       WHERE ${pendingClause}
         AND date_requested >= DATE_SUB(CURDATE(), INTERVAL ? DAY)`,
      [filter],
    );

    const thisWeek = Number(rows[0].this_week) || 0;
    return NextResponse.json(
      {
        this_week: thisWeek,
        last_week: Number(rows[0].last_week) || 0,
        items,
        total_count: thisWeek,
        mr_count: Number(rows[0].mr_count) || 0,
        jo_count: Number(rows[0].jo_count) || 0,
        payment_count: Number(rows[0].payment_count) || 0,
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
