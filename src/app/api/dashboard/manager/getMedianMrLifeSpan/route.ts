import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const days = 7; // Last 7 days for the chart

    // Get MR lifespans for the last 7 days
    const [lifespanRows]: any = await db.query(
      `
      SELECT 
        mr_header_id,
        MIN(changed_at) as start_time,
        MAX(changed_at) as end_time,
        TIMESTAMPDIFF(HOUR, MIN(changed_at), MAX(changed_at)) as lifespan_hours,
        DATE(MAX(changed_at)) as completion_date
      FROM mr_header_progress_log
      WHERE changed_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      GROUP BY mr_header_id
      HAVING COUNT(DISTINCT progress_id) > 1
    `,
      [days]
    );

    // Get previous 7 days for comparison
    const [prevLifespanRows]: any = await db.query(
      `
      SELECT 
        mr_header_id,
        TIMESTAMPDIFF(HOUR, MIN(changed_at), MAX(changed_at)) as lifespan_hours
      FROM mr_header_progress_log
      WHERE changed_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        AND changed_at < DATE_SUB(CURDATE(), INTERVAL ? DAY)
      GROUP BY mr_header_id
      HAVING COUNT(DISTINCT progress_id) > 1
    `,
      [days * 2, days]
    );

    // Calculate current period median
    const lifespans = lifespanRows
      .map((row: any) => row.lifespan_hours)
      .sort((a: number, b: number) => a - b);

    const currentMedian =
      lifespans.length > 0 ? lifespans[Math.floor(lifespans.length / 2)] : 0;

    // Calculate previous period median
    const prevLifespans = prevLifespanRows
      .map((row: any) => row.lifespan_hours)
      .sort((a: number, b: number) => a - b);

    const prevMedian =
      prevLifespans.length > 0
        ? prevLifespans[Math.floor(prevLifespans.length / 2)]
        : currentMedian;

    // Calculate percentage change
    const percentageChange =
      prevMedian > 0 ? ((currentMedian - prevMedian) / prevMedian) * 100 : 0;

    // Group by date for daily bars
    const dailyData: any = {};
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      dailyData[dateStr] = [];
    }

    lifespanRows.forEach((row: any) => {
      const dateStr = row.completion_date;
      if (dailyData[dateStr] !== undefined) {
        dailyData[dateStr].push(row.lifespan_hours);
      }
    });

    // Calculate median for each day
    const chartData = Object.keys(dailyData).map((date) => {
      const values = dailyData[date].sort((a: number, b: number) => a - b);
      const dayMedian =
        values.length > 0 ? values[Math.floor(values.length / 2)] : 0;

      return {
        date,
        median: dayMedian,
        count: values.length,
      };
    });

    return NextResponse.json(
      {
        currentMedian: Math.round(currentMedian * 10) / 10,
        previousMedian: Math.round(prevMedian * 10) / 10,
        percentageChange: Math.round(Math.abs(percentageChange) * 10) / 10,
        isFaster: percentageChange < 0,
        chartData,
        overallMedian: currentMedian,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Error fetching median lifespan:", err);
    return NextResponse.json(
      {
        error: err.message || "Internal server error",
        sqlMessage: err.sqlMessage,
      },
      { status: 500 }
    );
  }
}
