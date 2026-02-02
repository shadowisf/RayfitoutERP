import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { filter } = body;

    // Validate filter parameter
    if (!filter || typeof filter !== "number" || filter <= 0) {
      return NextResponse.json(
        { error: "Invalid 'filter' parameter. Must be a positive number." },
        { status: 400 },
      );
    }

    const days = filter;

    // ✅ Get only the completion records (progress_id = 25) for the specified period
    const [completedMRs]: any = await db.query(
      `
      SELECT 
        mr_header_id,
        DATE(changed_at) as completed_date,
        changed_at as completed_at
      FROM mr_header_progress_log
      WHERE progress_id = 25
        AND changed_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      ORDER BY changed_at DESC
      `,
      [days],
    );

    if (completedMRs.length === 0) {
      // Return empty chart data
      const emptyChartData = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        emptyChartData.push({
          date: date.toISOString().split("T")[0],
          median: 0,
          count: 0,
        });
      }

      return NextResponse.json(
        {
          currentMedian: 0,
          previousMedian: 0,
          percentageChange: 0,
          changeDescription: "No data",
          isFaster: false,
          chartData: emptyChartData,
          overallMedian: 0,
        },
        { status: 200 },
      );
    }

    // ✅ For each completed MR, calculate its full lifespan
    const mrIds = completedMRs.map((mr: any) => mr.mr_header_id);

    const [lifespanRows]: any = await db.query(
      `
      SELECT 
        mr_header_id,
        MIN(changed_at) as start_time,
        MAX(changed_at) as end_time,
        TIMESTAMPDIFF(HOUR, MIN(changed_at), MAX(changed_at)) as lifespan_hours
      FROM mr_header_progress_log
      WHERE mr_header_id IN (?)
      GROUP BY mr_header_id
      `,
      [mrIds],
    );

    // ✅ Map lifespan to completion date
    const lifespanMap: any = {};
    lifespanRows.forEach((row: any) => {
      lifespanMap[row.mr_header_id] = row.lifespan_hours;
    });

    const completedMRsWithLifespan = completedMRs.map((mr: any) => {
      // ✅ Convert completed_date to YYYY-MM-DD string format
      const completedDate = new Date(mr.completed_date);
      const dateString = completedDate.toISOString().split("T")[0];

      return {
        ...mr,
        completed_date: dateString, // ✅ Store as string
        lifespan_hours: lifespanMap[mr.mr_header_id] || 0,
      };
    });

    // ✅ Get previous period data
    const [prevCompletedMRs]: any = await db.query(
      `
      SELECT 
        mr_header_id
      FROM mr_header_progress_log
      WHERE progress_id = 25
        AND changed_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        AND changed_at < DATE_SUB(CURDATE(), INTERVAL ? DAY)
      `,
      [days * 2, days],
    );

    let prevMedian = 0;
    if (prevCompletedMRs.length > 0) {
      const prevMrIds = prevCompletedMRs.map((mr: any) => mr.mr_header_id);

      const [prevLifespanRows]: any = await db.query(
        `
        SELECT 
          TIMESTAMPDIFF(HOUR, MIN(changed_at), MAX(changed_at)) as lifespan_hours
        FROM mr_header_progress_log
        WHERE mr_header_id IN (?)
        GROUP BY mr_header_id
        `,
        [prevMrIds],
      );

      const prevLifespans = prevLifespanRows
        .map((row: any) => row.lifespan_hours)
        .sort((a: number, b: number) => a - b);

      prevMedian =
        prevLifespans.length > 0
          ? prevLifespans[Math.floor(prevLifespans.length / 2)]
          : 0;
    }

    // Calculate current median
    const lifespans = completedMRsWithLifespan
      .map((mr: any) => mr.lifespan_hours)
      .sort((a: number, b: number) => a - b);

    const currentMedian =
      lifespans.length > 0 ? lifespans[Math.floor(lifespans.length / 2)] : 0;

    const percentageChange =
      prevMedian > 0 ? ((currentMedian - prevMedian) / prevMedian) * 100 : 0;

    // ✅ Determine change description
    let changeDescription = "";
    if (prevMedian === 0) {
      changeDescription = "No previous data";
    } else if (percentageChange === 0) {
      changeDescription = "No change";
    } else {
      const absChange = Math.abs(percentageChange);
      const isFaster = percentageChange < 0;

      if (absChange >= 50) {
        changeDescription = isFaster
          ? "Substantial improvement"
          : "Substantial slowdown";
      } else if (absChange >= 20) {
        changeDescription = isFaster
          ? "Significant improvement"
          : "Significant slowdown";
      } else if (absChange >= 10) {
        changeDescription = isFaster
          ? "Moderate improvement"
          : "Moderate slowdown";
      } else {
        changeDescription = isFaster ? "Slight improvement" : "Slight slowdown";
      }
    }

    // ✅ Group by completion date (one entry per day)
    const dailyData: any = {};
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      dailyData[dateStr] = [];
    }

    completedMRsWithLifespan.forEach((mr: any) => {
      const dateStr = mr.completed_date;

      if (dailyData[dateStr] !== undefined) {
        dailyData[dateStr].push(mr.lifespan_hours);
      }
    });

    const chartData = Object.keys(dailyData)
      .sort()
      .map((date) => {
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
        changeDescription, // ✅ Added description
        isFaster: percentageChange < 0,
        chartData,
        overallMedian: currentMedian,
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("Error fetching median lifespan:", err);
    return NextResponse.json(
      {
        error: err.message || "Internal server error",
        sqlMessage: err.sqlMessage,
      },
      { status: 500 },
    );
  }
}
