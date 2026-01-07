import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const mrHeaderId = body.mr_header_id;

    if (!mrHeaderId) {
      return NextResponse.json(
        { error: "mr_header_id is required" },
        { status: 400 }
      );
    }

    // 1️⃣ Get project_id from mr_headers
    const [mrRows] = await db.query(
      "SELECT project_id FROM mr_headers WHERE id = ? LIMIT 1",
      [mrHeaderId]
    );

    const mrHeader = (mrRows as any[])[0];
    if (!mrHeader || !mrHeader.project_id) {
      return NextResponse.json(
        { error: "No project found for this MR header" },
        { status: 404 }
      );
    }

    const projectId = mrHeader.project_id;

    // 2️⃣ Get quoted_budget and allocated_budget from projects table
    const [projectRows] = await db.query(
      "SELECT quoted_budget, allocated_budget AS project_allocated_budget FROM projects WHERE id = ? LIMIT 1",
      [projectId]
    );

    const project = (projectRows as any[])[0];
    const quoted_budget = project?.quoted_budget ?? 0;
    const projectAllocatedBudget = project?.project_allocated_budget ?? 0;

    // 3️⃣ Sum total from LPOs with this project_id
    const [lpoRows] = await db.query(
      "SELECT COALESCE(SUM(total), 0) AS lpo_total FROM lpo WHERE project_id = ?",
      [projectId]
    );

    const lpoTotal = (lpoRows as any[])[0]?.lpo_total ?? 0;

    // 4️⃣ Add project allocated_budget + LPO total
    const allocated_budget = Number(projectAllocatedBudget) + Number(lpoTotal);

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
