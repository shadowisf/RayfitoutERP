import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { filter } = body;

    // Validate filter (in days)
    const days = filter || 365; // Default to 1 year

    // 1️⃣ Get all projects with their initial allocated budgets and creation dates
    const [projectRows] = await db.query(
      `
      SELECT 
        id,
        name,
        quoted_budget,
        allocated_budget,
        created_at
      FROM projects
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      `,
      [days]
    );

    const projects = projectRows as any[];

    // 2️⃣ Get all approved LPOs with their dates across all projects
    const [lpoRows] = await db.query(
      `
      SELECT 
        lpo.total,
        lpo.project_id,
        DATE(lpo.created_at) as allocation_date,
        lpo.created_at
      FROM lpo 
      WHERE lpo.payment_status = 'Approved'
        AND lpo.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      ORDER BY lpo.created_at ASC
      `,
      [days]
    );

    const lpos = lpoRows as any[];

    // 3️⃣ Calculate total quoted budget and initial allocated budget
    const totalQuotedBudget = projects.reduce(
      (sum, project) => sum + Number(project.quoted_budget ?? 0),
      0
    );

    const totalInitialAllocatedBudget = projects.reduce(
      (sum, project) => sum + Number(project.allocated_budget ?? 0),
      0
    );

    // 4️⃣ Initialize date range
    const dailyData: { [date: string]: number } = {};

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days + 1);

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split("T")[0];
      dailyData[dateStr] = 0;
    }

    // 5️⃣ Add project initial allocated budgets to their creation dates
    projects.forEach((project) => {
      if (project.created_on && project.allocated_budget > 0) {
        const dateStr = new Date(project.created_on)
          .toISOString()
          .split("T")[0];
        if (dailyData[dateStr] !== undefined) {
          dailyData[dateStr] += Number(project.allocated_budget ?? 0);
        }
      }
    });

    // 6️⃣ Add LPO allocations to their respective dates
    lpos.forEach((lpo) => {
      const dateStr = new Date(lpo.allocation_date).toISOString().split("T")[0];
      if (dailyData[dateStr] !== undefined) {
        dailyData[dateStr] += Number(lpo.total ?? 0);
      }
    });

    // 7️⃣ Calculate cumulative totals
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

    // 8️⃣ Calculate total allocated budget
    const totalLpoAmount = lpos.reduce(
      (sum, lpo) => sum + Number(lpo.total ?? 0),
      0
    );
    const totalAllocated = totalInitialAllocatedBudget + totalLpoAmount;
    const remainingBudget = totalQuotedBudget - totalAllocated;
    const percentageUsed =
      totalQuotedBudget > 0 ? (totalAllocated / totalQuotedBudget) * 100 : 0;

    // 9️⃣ Get active projects list
    const activeProjects = projects.map((project) => ({
      id: project.id,
      name: project.name,
      quoted_budget: Number(project.quoted_budget ?? 0),
    }));

    return NextResponse.json(
      {
        total_quoted_budget: totalQuotedBudget,
        total_allocated_budget: totalAllocated,
        remaining_budget: remainingBudget,
        percentage_used: Math.round(percentageUsed * 10) / 10,
        limit_budget: totalQuotedBudget,
        chartData,
        active_projects: activeProjects,
        projects_count: projects.length,
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
