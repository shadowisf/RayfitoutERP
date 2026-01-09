import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const [rows]: any = await db.query(`
      SELECT 
        p.value AS stage_name,
        AVG(
          TIMESTAMPDIFF(
            MINUTE,
            pl1.changed_at,
            COALESCE(pl2.changed_at, NOW())
          )
        ) AS avg_minutes,
        COUNT(*) AS count
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
      GROUP BY pl1.progress_id, p.value
      ORDER BY avg_minutes DESC
    `);

    if (!rows || rows.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    const formattedData = rows.map((row: any) => {
      const totalMinutes = Math.round(row.avg_minutes || 0);

      const hoursPart = Math.floor(totalMinutes / 60);
      const minutesPart = totalMinutes % 60;

      return {
        stage: row.stage_name || "Unknown",

        // ✅ raw values
        averageMinutes: totalMinutes,
        averageHoursFloat: Number((totalMinutes / 60).toFixed(2)),

        // ✅ split values (easy UI rendering)
        hours: hoursPart,
        minutes: minutesPart,

        count: row.count,
      };
    });

    return NextResponse.json(formattedData, { status: 200 });
  } catch (err: any) {
    console.error("Error fetching average time per stage:", err);
    return NextResponse.json(
      {
        error: err.message || "Internal server error",
        sqlMessage: err.sqlMessage,
      },
      { status: 500 }
    );
  }
}
