import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { lpo_id, progress_id } = body;

    if (!lpo_id || !progress_id) {
      return NextResponse.json(
        { error: "lpo_id and progress_id are required" },
        { status: 400 },
      );
    }

    // First try to find LPO-specific progress log entries
    const [rows]: any = await db.query(
      `SELECT
        pl.lpo_id,
        pl.changed_at as stage_started,
        COALESCE(
          (SELECT changed_at
           FROM mr_header_progress_log
           WHERE lpo_id = pl.lpo_id
           AND id > pl.id
           ORDER BY id ASC
           LIMIT 1
          ),
          NOW()
        ) as stage_ended,
        TIMESTAMPDIFF(
          HOUR,
          pl.changed_at,
          COALESCE(
            (SELECT changed_at
             FROM mr_header_progress_log
             WHERE lpo_id = pl.lpo_id
             AND id > pl.id
             ORDER BY id ASC
             LIMIT 1
            ),
            NOW()
          )
        ) as hours_in_stage,
        TIMESTAMPDIFF(
          MINUTE,
          pl.changed_at,
          COALESCE(
            (SELECT changed_at
             FROM mr_header_progress_log
             WHERE lpo_id = pl.lpo_id
             AND id > pl.id
             ORDER BY id ASC
             LIMIT 1
            ),
            NOW()
          )
        ) as minutes_in_stage,
        CASE
          WHEN NOT EXISTS (
            SELECT 1
            FROM mr_header_progress_log
            WHERE lpo_id = pl.lpo_id
            AND id > pl.id
          ) THEN true
          ELSE false
        END as is_current_stage
      FROM mr_header_progress_log pl
      WHERE pl.lpo_id = ?
        AND pl.progress_id = ?
      ORDER BY pl.changed_at DESC
      LIMIT 1`,
      [lpo_id, progress_id],
    );

    if (rows.length > 0) {
      return NextResponse.json(rows[0], { status: 200 });
    }

    // Fallback: For legacy LPOs that inherited progress from mr_headers,
    // look up the MR header's progress log entry (where lpo_id IS NULL)
    const [fallbackRows]: any = await db.query(
      `SELECT
        pl.mr_header_id,
        pl.changed_at as stage_started,
        COALESCE(
          (SELECT changed_at
           FROM mr_header_progress_log
           WHERE mr_header_id = pl.mr_header_id
           AND lpo_id IS NULL
           AND id > pl.id
           ORDER BY id ASC
           LIMIT 1
          ),
          NOW()
        ) as stage_ended,
        TIMESTAMPDIFF(
          HOUR,
          pl.changed_at,
          COALESCE(
            (SELECT changed_at
             FROM mr_header_progress_log
             WHERE mr_header_id = pl.mr_header_id
             AND lpo_id IS NULL
             AND id > pl.id
             ORDER BY id ASC
             LIMIT 1
            ),
            NOW()
          )
        ) as hours_in_stage,
        TIMESTAMPDIFF(
          MINUTE,
          pl.changed_at,
          COALESCE(
            (SELECT changed_at
             FROM mr_header_progress_log
             WHERE mr_header_id = pl.mr_header_id
             AND lpo_id IS NULL
             AND id > pl.id
             ORDER BY id ASC
             LIMIT 1
            ),
            NOW()
          )
        ) as minutes_in_stage,
        CASE
          WHEN NOT EXISTS (
            SELECT 1
            FROM mr_header_progress_log
            WHERE mr_header_id = pl.mr_header_id
            AND lpo_id IS NULL
            AND id > pl.id
          ) THEN true
          ELSE false
        END as is_current_stage
      FROM mr_header_progress_log pl
      JOIN lpo l ON l.id = ?
      WHERE pl.mr_header_id = l.mr_header_id
        AND pl.lpo_id IS NULL
        AND pl.progress_id = ?
      ORDER BY pl.changed_at DESC
      LIMIT 1`,
      [lpo_id, progress_id],
    );

    if (fallbackRows.length === 0) {
      // No log entry for this LPO + stage combination — normal for rejected/skipped stages
      console.log(
        `[lpo/getProgressDuration] No log entry for lpo_id=${lpo_id}, progress_id=${progress_id}`,
      );
      return NextResponse.json(null, { status: 200 });
    }

    return NextResponse.json(fallbackRows[0], { status: 200 });
  } catch (err: any) {
    // Transient DB error — log quietly and return null so the UI continues working
    console.log(
      `[lpo/getProgressDuration] DB error for lpo_id=${lpo_id}, progress_id=${progress_id}:`,
      err.sqlMessage || err.message,
    );
    return NextResponse.json(null, { status: 200 });
  }
}
