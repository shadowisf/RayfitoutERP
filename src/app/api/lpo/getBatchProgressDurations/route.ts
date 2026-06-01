import { db } from "@/lib/db";
import { NextResponse } from "next/server";

// Batch version of lpo/getProgressDuration.
// Replaces N individual calls with 1–2 queries (primary + legacy fallback).
//
// Body: { items: Array<{ lpo_id: number; progress_id: number }> }
// Returns: Record<`lpo-${lpo_id}-${progress_id}`, { hours_in_stage: number; minutes_in_stage: number } | null>

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { items } = body as {
      items: Array<{ lpo_id: number; progress_id: number }>;
    };

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({}, { status: 200 });
    }

    const validItems = items.filter(
      (i) => Number.isInteger(i.lpo_id) && Number.isInteger(i.progress_id),
    );
    if (validItems.length === 0) {
      return NextResponse.json({}, { status: 200 });
    }

    // Initialise all keys to null
    const result: Record<
      string,
      { hours_in_stage: number; minutes_in_stage: number } | null
    > = {};
    for (const item of validItems) {
      result[`lpo-${item.lpo_id}-${item.progress_id}`] = null;
    }

    const lpoIds = [...new Set(validItems.map((i) => i.lpo_id))];
    const lpoPlaceholders = lpoIds.map(() => "?").join(", ");

    // ── Primary query: LPO-specific progress log entries ──────────────────────
    const [primaryRows]: any = await db.query(
      `SELECT
         pl.lpo_id,
         pl.progress_id,
         TIMESTAMPDIFF(HOUR, pl.changed_at, COALESCE(
           (SELECT changed_at
            FROM mr_header_progress_log
            WHERE lpo_id = pl.lpo_id AND id > pl.id
            ORDER BY id ASC LIMIT 1),
           NOW()
         )) AS hours_in_stage,
         TIMESTAMPDIFF(MINUTE, pl.changed_at, COALESCE(
           (SELECT changed_at
            FROM mr_header_progress_log
            WHERE lpo_id = pl.lpo_id AND id > pl.id
            ORDER BY id ASC LIMIT 1),
           NOW()
         )) AS minutes_in_stage
       FROM mr_header_progress_log pl
       INNER JOIN (
         SELECT lpo_id, progress_id, MAX(id) AS max_id
         FROM mr_header_progress_log
         WHERE lpo_id IN (${lpoPlaceholders})
         GROUP BY lpo_id, progress_id
       ) latest ON pl.id = latest.max_id`,
      lpoIds,
    );

    const requestedKeys = new Set(
      validItems.map((i) => `lpo-${i.lpo_id}-${i.progress_id}`),
    );

    const foundKeys = new Set<string>();
    for (const row of primaryRows as any[]) {
      const key = `lpo-${row.lpo_id}-${row.progress_id}`;
      if (requestedKeys.has(key)) {
        result[key] = {
          hours_in_stage: Number(row.hours_in_stage ?? 0),
          minutes_in_stage: Number(row.minutes_in_stage ?? 0),
        };
        foundKeys.add(key);
      }
    }

    // ── Fallback: legacy LPOs that used MR-header-level progress log ──────────
    const missingItems = validItems.filter(
      (i) => !foundKeys.has(`lpo-${i.lpo_id}-${i.progress_id}`),
    );

    if (missingItems.length > 0) {
      const missingLpoIds = [...new Set(missingItems.map((i) => i.lpo_id))];
      const missingPlaceholders = missingLpoIds.map(() => "?").join(", ");

      const [fallbackRows]: any = await db.query(
        `SELECT
           l.id AS lpo_id,
           pl.progress_id,
           TIMESTAMPDIFF(HOUR, pl.changed_at, COALESCE(
             (SELECT changed_at
              FROM mr_header_progress_log
              WHERE mr_header_id = pl.mr_header_id AND lpo_id IS NULL AND id > pl.id
              ORDER BY id ASC LIMIT 1),
             NOW()
           )) AS hours_in_stage,
           TIMESTAMPDIFF(MINUTE, pl.changed_at, COALESCE(
             (SELECT changed_at
              FROM mr_header_progress_log
              WHERE mr_header_id = pl.mr_header_id AND lpo_id IS NULL AND id > pl.id
              ORDER BY id ASC LIMIT 1),
             NOW()
           )) AS minutes_in_stage
         FROM lpo l
         INNER JOIN (
           SELECT mr_header_id, progress_id, MAX(id) AS max_id
           FROM mr_header_progress_log
           WHERE lpo_id IS NULL
             AND mr_header_id IN (
               SELECT DISTINCT mr_header_id FROM lpo WHERE id IN (${missingPlaceholders})
             )
           GROUP BY mr_header_id, progress_id
         ) latest ON latest.mr_header_id = l.mr_header_id
         INNER JOIN mr_header_progress_log pl ON pl.id = latest.max_id
         WHERE l.id IN (${missingPlaceholders})`,
        [...missingLpoIds, ...missingLpoIds],
      );

      for (const row of fallbackRows as any[]) {
        const key = `lpo-${row.lpo_id}-${row.progress_id}`;
        if (requestedKeys.has(key) && !foundKeys.has(key)) {
          result[key] = {
            hours_in_stage: Number(row.hours_in_stage ?? 0),
            minutes_in_stage: Number(row.minutes_in_stage ?? 0),
          };
        }
      }
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.log(
      "[getBatchProgressDurations/lpo] error:",
      err.sqlMessage || err.message,
    );
    return NextResponse.json({}, { status: 200 });
  }
}
