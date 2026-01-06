import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const projectId = body.project_id;

    if (!projectId) {
      return NextResponse.json(
        { error: "project_id is required" },
        { status: 400 }
      );
    }

    // 1️⃣ Get quoted_budget and allocated_budget from projects table
    const [projectRows] = await db.query(
      "SELECT quoted_budget, allocated_budget AS project_allocated_budget FROM projects WHERE id = ? LIMIT 1",
      [projectId]
    );

    const project = (projectRows as any[])[0];
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const quoted_budget = Number(project?.quoted_budget ?? 0);
    const projectAllocatedBudget = Number(
      project?.project_allocated_budget ?? 0
    );

    // 2️⃣ Sum total from LPOs with this project_id
    const [lpoRows] = await db.query(
      "SELECT COALESCE(SUM(total), 0) AS lpo_total FROM lpo WHERE project_id = ?",
      [projectId]
    );

    const lpoTotal = Number((lpoRows as any[])[0]?.lpo_total ?? 0);

    // 3️⃣ Add project allocated_budget + LPO total
    const allocated_budget = projectAllocatedBudget + lpoTotal;

    return NextResponse.json(
      { quoted_budget, allocated_budget },
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
