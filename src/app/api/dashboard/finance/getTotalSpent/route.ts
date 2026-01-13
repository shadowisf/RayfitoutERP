import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { filter } = body;

    // Validate filter parameter
    if (!filter || typeof filter !== "number" || filter <= 0) {
      return NextResponse.json(
        { error: "Invalid 'filter' parameter. Must be a positive number." },
        { status: 400 }
      );
    }

    // 1️⃣ Get current period: sum of allocated_budget from projects + approved LPO totals
    const [currentProjectRows] = await db.query(
      "SELECT COALESCE(SUM(allocated_budget), 0) AS project_allocated FROM projects WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)",
      [filter]
    );

    const [currentLpoRows] = await db.query(
      "SELECT COALESCE(SUM(total), 0) AS lpo_total FROM lpo WHERE payment_status = 'Approved' AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)",
      [filter]
    );

    const currentProjectAllocated = Number(
      (currentProjectRows as any[])[0]?.project_allocated ?? 0
    );
    const currentLpoTotal = Number(
      (currentLpoRows as any[])[0]?.lpo_total ?? 0
    );
    const currentPeriodTotal = currentProjectAllocated + currentLpoTotal;

    // 2️⃣ Get previous period: sum of allocated_budget from projects + approved LPO totals
    const [previousProjectRows] = await db.query(
      "SELECT COALESCE(SUM(allocated_budget), 0) AS project_allocated FROM projects WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY) AND created_at < DATE_SUB(CURDATE(), INTERVAL ? DAY)",
      [filter * 2, filter]
    );

    const [previousLpoRows] = await db.query(
      "SELECT COALESCE(SUM(total), 0) AS lpo_total FROM lpo WHERE payment_status = 'Approved' AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY) AND created_at < DATE_SUB(CURDATE(), INTERVAL ? DAY)",
      [filter * 2, filter]
    );

    const previousProjectAllocated = Number(
      (previousProjectRows as any[])[0]?.project_allocated ?? 0
    );
    const previousLpoTotal = Number(
      (previousLpoRows as any[])[0]?.lpo_total ?? 0
    );
    const previousPeriodTotal = previousProjectAllocated + previousLpoTotal;

    return NextResponse.json(
      {
        this_week: currentPeriodTotal,
        last_week: previousPeriodTotal,
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
