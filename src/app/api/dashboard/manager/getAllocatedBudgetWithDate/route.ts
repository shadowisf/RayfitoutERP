import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { filter, project_id } = body;

    // Validate filter (in days)
    const days = filter || 365; // Default to 1 year

    // Validate project_id
    if (!project_id) {
      return NextResponse.json(
        { error: "project_id is required" },
        { status: 400 }
      );
    }

    // 1️⃣ Get the specific project
    const [projectRows] = await db.query(
      `
      SELECT 
        id,
        name,
        quoted_budget,
        allocated_budget,
        created_at
      FROM projects
      WHERE id = ?
      `,
      [project_id]
    );

    if (!projectRows || (projectRows as any[]).length === 0) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const project = (projectRows as any[])[0];

    // 2️⃣ Get total allocated budget for this project (allocated_budget + approved LPOs)
    let totalAllocated = Number(project.allocated_budget ?? 0);

    const [lpoSumRows] = await db.query(
      `
      SELECT COALESCE(SUM(total), 0) AS lpo_total
      FROM lpo
      WHERE project_id = ? AND payment_status = 'Approved'
      `,
      [project_id]
    );

    const totalLpoAmount = Number((lpoSumRows as any[])[0]?.lpo_total ?? 0);
    totalAllocated += totalLpoAmount;

    // 3️⃣ Get all approved LPOs with their dates for this project in the time period
    const [lpoRows] = await db.query(
      `
      SELECT 
        lpo.total,
        DATE(lpo.created_at) as allocation_date,
        lpo.created_at
      FROM lpo 
      WHERE lpo.project_id = ?
        AND lpo.payment_status = 'Approved'
        AND lpo.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      ORDER BY lpo.created_at ASC
      `,
      [project_id, days]
    );

    const lpos = lpoRows as any[];

    // 4️⃣ Calculate quoted budget (null if not set)
    const quotedBudget = project.quoted_budget
      ? Number(project.quoted_budget)
      : null;
    const remainingBudget = quotedBudget ? quotedBudget - totalAllocated : null;
    const percentageUsed = quotedBudget
      ? (totalAllocated / quotedBudget) * 100
      : null;

    // 5️⃣ Initialize date range
    const dailyData: { [date: string]: number } = {};

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days + 1);

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split("T")[0];
      dailyData[dateStr] = 0;
    }

    // 6️⃣ Add project initial allocated budget to creation date (if within period)
    if (project.created_at && project.allocated_budget > 0) {
      const createdDate = new Date(project.created_at);
      const dateStr = createdDate.toISOString().split("T")[0];

      if (dailyData[dateStr] !== undefined) {
        dailyData[dateStr] += Number(project.allocated_budget ?? 0);
      }
    }

    // 7️⃣ Add LPO allocations to their respective dates
    lpos.forEach((lpo) => {
      const dateStr = new Date(lpo.allocation_date).toISOString().split("T")[0];
      if (dailyData[dateStr] !== undefined) {
        dailyData[dateStr] += Number(lpo.total ?? 0);
      }
    });

    // 8️⃣ Calculate cumulative totals
    const chartData = [];
    let cumulativeTotal = 0;

    const sortedDates = Object.keys(dailyData).sort();

    for (const date of sortedDates) {
      cumulativeTotal += dailyData[date];
      chartData.push({
        date,
        allocated: cumulativeTotal,
        dailyAllocation: dailyData[date],
      });
    }

    return NextResponse.json(
      {
        project_id: project.id,
        project_name: project.name,
        quoted_budget: quotedBudget,
        total_allocated_budget: totalAllocated,
        remaining_budget: remainingBudget,
        percentage_used: percentageUsed
          ? Math.round(percentageUsed * 10) / 10
          : null,
        limit_budget: quotedBudget,
        has_limit: quotedBudget !== null,
        chartData,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error(err.sqlMessage || err.message);
    return NextResponse.json(
      { error: err.sqlMessage || err.message },
      { status: 500 }
    );
  }
}
