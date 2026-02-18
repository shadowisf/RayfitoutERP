import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filter } = body;

    // Validate filter parameter (0 = all time, positive = days)
    if (filter === undefined || filter === null || typeof filter !== "number" || filter < 0) {
      return NextResponse.json(
        { error: "Invalid 'filter' parameter. Must be a non-negative number." },
        { status: 400 }
      );
    }

    if (filter === 0) {
      // All time — no date restriction
      const [rows]: any = await db.query(`
        SELECT
          AVG(TIMESTAMPDIFF(MINUTE, payment_start.changed_at, payment_end.changed_at)) AS avg_payment_minutes,
          COUNT(DISTINCT payment_start.mr_header_id) AS mr_count
        FROM mr_header_progress_log payment_start
        INNER JOIN mr_header_progress_log payment_end
          ON payment_start.mr_header_id = payment_end.mr_header_id
          AND payment_end.id = (
            SELECT MIN(id) FROM mr_header_progress_log
            WHERE mr_header_id = payment_start.mr_header_id AND id > payment_start.id AND progress_id != 14
          )
        WHERE payment_start.progress_id = 14 AND payment_end.changed_at IS NOT NULL
      `);

      if (!rows || rows.length === 0 || !rows[0].avg_payment_minutes) {
        return NextResponse.json({ this_week: 0, last_week: 0, this_week_unit: "hrs", last_week_unit: "hrs" }, { status: 200 });
      }

      const minutes = Math.round(rows[0].avg_payment_minutes || 0);
      const hours = Math.round(minutes / 60);
      const value = hours >= 1 ? hours : minutes;
      const unit = hours >= 1 ? "hrs" : "mins";
      return NextResponse.json({ this_week: value, last_week: 0, this_week_unit: unit, last_week_unit: "hrs" }, { status: 200 });
    }

    const query = `
      SELECT 
        AVG(
          TIMESTAMPDIFF(
            MINUTE,
            payment_start.changed_at,
            payment_end.changed_at
          )
        ) AS avg_payment_minutes,
        COUNT(DISTINCT payment_start.mr_header_id) AS mr_count
      FROM mr_header_progress_log payment_start
      INNER JOIN mr_header_progress_log payment_end
        ON payment_start.mr_header_id = payment_end.mr_header_id
        AND payment_end.id = (
          SELECT MIN(id)
          FROM mr_header_progress_log
          WHERE mr_header_id = payment_start.mr_header_id
            AND id > payment_start.id
            AND progress_id != 14
        )
      WHERE payment_start.progress_id = 14
        AND payment_start.changed_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        AND payment_end.changed_at IS NOT NULL
    `;

    const [rows]: any = await db.query(query, [filter]);

    if (!rows || rows.length === 0 || !rows[0].avg_payment_minutes) {
      return NextResponse.json(
        {
          this_week: 0,
          last_week: 0,
          this_week_unit: "hrs",
          last_week_unit: "hrs",
        },
        { status: 200 }
      );
    }

    const currentPeriodMinutes = Math.round(rows[0].avg_payment_minutes || 0);
    const currentPeriodHours = Math.round(currentPeriodMinutes / 60);

    // Determine unit for current period
    const currentValue =
      currentPeriodHours >= 1 ? currentPeriodHours : currentPeriodMinutes;
    const currentUnit = currentPeriodHours >= 1 ? "hrs" : "mins";

    // Get previous period
    const [previousRows]: any = await db.query(
      `
      SELECT 
        AVG(
          TIMESTAMPDIFF(
            MINUTE,
            payment_start.changed_at,
            payment_end.changed_at
          )
        ) AS avg_payment_minutes
      FROM mr_header_progress_log payment_start
      INNER JOIN mr_header_progress_log payment_end
        ON payment_start.mr_header_id = payment_end.mr_header_id
        AND payment_end.id = (
          SELECT MIN(id)
          FROM mr_header_progress_log
          WHERE mr_header_id = payment_start.mr_header_id
            AND id > payment_start.id
            AND progress_id != 14
        )
      WHERE payment_start.progress_id = 14
        AND payment_start.changed_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        AND payment_start.changed_at < DATE_SUB(CURDATE(), INTERVAL ? DAY)
        AND payment_end.changed_at IS NOT NULL
    `,
      [filter * 2, filter]
    );

    const previousPeriodMinutes = Math.round(
      previousRows[0]?.avg_payment_minutes || 0
    );
    const previousPeriodHours = Math.round(previousPeriodMinutes / 60);

    // Determine unit for previous period
    const previousValue =
      previousPeriodHours >= 1 ? previousPeriodHours : previousPeriodMinutes;
    const previousUnit = previousPeriodHours >= 1 ? "hrs" : "mins";

    return NextResponse.json(
      {
        this_week: currentValue,
        last_week: previousValue,
        this_week_unit: currentUnit,
        last_week_unit: previousUnit,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Error fetching average payment time:", err);
    return NextResponse.json(
      {
        error: err.message || "Internal server error",
        sqlMessage: err.sqlMessage,
      },
      { status: 500 }
    );
  }
}
