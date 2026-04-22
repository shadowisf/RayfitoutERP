import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { mr_header_id, progress_id } = body;

    if (!mr_header_id || !progress_id) {
      return NextResponse.json(
        { error: "mr_header_id and progress_id are required" },
        { status: 400 },
      );
    }

    // Get time spent in the specific stage
    const [rows]: any = await db.query(
      `SELECT 
        h.id as mr_id,
        pl.changed_at as stage_started,
        COALESCE(
          (SELECT changed_at 
           FROM mr_header_progress_log 
           WHERE mr_header_id = pl.mr_header_id 
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
            AND id > pl.id
          ) THEN true
          ELSE false
        END as is_current_stage
      FROM mr_headers h
      INNER JOIN mr_header_progress_log pl 
        ON h.id = pl.mr_header_id
      INNER JOIN lut_mr_headers_progress p 
        ON pl.progress_id = p.id
      WHERE h.id = ? 
        AND pl.progress_id = ?
      ORDER BY pl.changed_at DESC
      LIMIT 1`,
      [mr_header_id, progress_id],
    );

    if (rows.length === 0) {
      // No log entry for this MR + stage combination — normal for rejected/skipped stages
      console.log(
        `[getProgressDuration] No log entry for mr_header_id=${mr_header_id}, progress_id=${progress_id}`,
      );
      return NextResponse.json(null, { status: 200 });
    }

    return NextResponse.json(rows[0], { status: 200 });
  } catch (err: any) {
    // Transient DB error — log quietly and return null so the UI continues working
    console.log(
      `[getProgressDuration] DB error:`,
      err.sqlMessage || err.message,
    );
    return NextResponse.json(null, { status: 200 });
  }
}
