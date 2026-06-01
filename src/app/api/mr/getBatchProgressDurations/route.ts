import { db } from "@/lib/db";
import { NextResponse } from "next/server";

// Batch version of getProgressDuration for MR headers.
// Replaces N individual calls with a single query.
//
// Body: { items: Array<{ mr_header_id: number; progress_id: number }> }
// Returns: Record<`${mr_header_id}-${progress_id}`, { hours_in_stage: number; minutes_in_stage: number } | null>

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { items } = body as {
      items: Array<{ mr_header_id: number; progress_id: number }>;
    };

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({}, { status: 200 });
    }

    const validItems = items.filter(
      (i) => Number.isInteger(i.mr_header_id) && Number.isInteger(i.progress_id),
    );
    if (validItems.length === 0) {
      return NextResponse.json({}, { status: 200 });
    }

    const mrIds = [...new Set(validItems.map((i) => i.mr_header_id))];
    const placeholders = mrIds.map(() => "?").join(", ");

    // Get the latest log entry per (mr_header_id, progress_id) for all
    // requested MR headers, and compute time spent in that stage.
    const [rows]: any = await db.query(
      `SELECT
         pl.mr_header_id,
         pl.progress_id,
         TIMESTAMPDIFF(HOUR, pl.changed_at, COALESCE(
           (SELECT changed_at
            FROM mr_header_progress_log
            WHERE mr_header_id = pl.mr_header_id AND id > pl.id
            ORDER BY id ASC LIMIT 1),
           NOW()
         )) AS hours_in_stage,
         TIMESTAMPDIFF(MINUTE, pl.changed_at, COALESCE(
           (SELECT changed_at
            FROM mr_header_progress_log
            WHERE mr_header_id = pl.mr_header_id AND id > pl.id
            ORDER BY id ASC LIMIT 1),
           NOW()
         )) AS minutes_in_stage
       FROM mr_header_progress_log pl
       INNER JOIN (
         SELECT mr_header_id, progress_id, MAX(id) AS max_id
         FROM mr_header_progress_log
         WHERE mr_header_id IN (${placeholders})
         GROUP BY mr_header_id, progress_id
       ) latest ON pl.id = latest.max_id`,
      mrIds,
    );

    // Build a lookup set of requested (mr_header_id, progress_id) pairs
    const requestedKeys = new Set(
      validItems.map((i) => `${i.mr_header_id}-${i.progress_id}`),
    );

    const result: Record<
      string,
      { hours_in_stage: number; minutes_in_stage: number } | null
    > = {};

    // Initialise all requested keys to null (no log entry found)
    for (const item of validItems) {
      result[`${item.mr_header_id}-${item.progress_id}`] = null;
    }

    for (const row of rows as any[]) {
      const key = `${row.mr_header_id}-${row.progress_id}`;
      if (requestedKeys.has(key)) {
        result[key] = {
          hours_in_stage: Number(row.hours_in_stage ?? 0),
          minutes_in_stage: Number(row.minutes_in_stage ?? 0),
        };
      }
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.log(
      "[getBatchProgressDurations/mr] error:",
      err.sqlMessage || err.message,
    );
    return NextResponse.json({}, { status: 200 });
  }
}
