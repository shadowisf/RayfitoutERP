import { db } from "@/lib/db";
import { NextResponse } from "next/server";

function getMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  }
  return sorted[mid];
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { filter } = body;

    // Validate filter parameter (0 means all time, positive number means days)
    if (filter === undefined || typeof filter !== "number" || filter < 0) {
      return NextResponse.json(
        { error: "Invalid 'filter' parameter. Must be a non-negative number." },
        { status: 400 },
      );
    }

    // Build the WHERE clause based on filter
    const whereClause =
      filter > 0
        ? `WHERE pl1.changed_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)`
        : "";

    const query = `
      SELECT
        p.value AS stage_name,
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
      INNER JOIN lut_mr_headers_progress p
        ON pl1.progress_id = p.id
      ${whereClause}
      ORDER BY pl1.progress_id
    `;

    const params = filter > 0 ? [filter] : [];
    const [rows]: any = await db.query(query, params);

    if (!rows || rows.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    // Group durations by stage
    const stageMap: Record<string, { stageName: string; durations: number[] }> =
      {};

    for (const row of rows) {
      const key = row.stage_name || "Unknown";
      if (!stageMap[key]) {
        stageMap[key] = { stageName: key, durations: [] };
      }
      stageMap[key].durations.push(Math.round(row.duration_minutes || 0));
    }

    // Calculate median for each stage
    const formattedData = Object.values(stageMap).map((entry) => {
      const medianMinutes = getMedian(entry.durations);
      const hoursPart = Math.floor(medianMinutes / 60);
      const minutesPart = medianMinutes % 60;

      return {
        stage: entry.stageName,
        medianMinutes: medianMinutes,
        medianHoursFloat: Number((medianMinutes / 60).toFixed(2)),
        hours: hoursPart,
        minutes: minutesPart,
        count: entry.durations.length,
      };
    });

    return NextResponse.json(formattedData, { status: 200 });
  } catch (err: any) {
    console.error("Error fetching median time per stage:", err);
    return NextResponse.json(
      {
        error: err.message || "Internal server error",
        sqlMessage: err.sqlMessage,
      },
      { status: 500 },
    );
  }
}
