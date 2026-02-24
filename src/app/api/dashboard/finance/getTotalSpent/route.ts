import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
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
      const [projectRows] = await db.query(
        "SELECT COALESCE(SUM(allocated_budget), 0) AS project_allocated FROM projects"
      );
      const [lpoRows] = await db.query(
        "SELECT COALESCE(SUM(total), 0) AS lpo_total FROM lpo WHERE payment_status = 'Approved'"
      );
      const total = Number((projectRows as any[])[0]?.project_allocated ?? 0) +
        Number((lpoRows as any[])[0]?.lpo_total ?? 0);

      // Fetch items for hover popup — show approved LPOs with amounts
      const [itemRows]: any = await db.query(
        `SELECT l.id, l.mr_header_id, l.total, s.name AS supplier_name
         FROM lpo l
         LEFT JOIN suppliers s ON s.id = l.supplier_id
         WHERE l.payment_status = 'Approved'
         ORDER BY l.total DESC
         LIMIT 20`
      );

      const items = itemRows.map((lpo: any) => ({
        display_id: `LPO-${String(lpo.id).padStart(5, "0")}`,
        detail: lpo.supplier_name || "-",
        amount: Number(lpo.total) || 0,
      }));

      return NextResponse.json({ this_week: total, last_week: 0, items, total_count: items.length }, { status: 200 });
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

    // Fetch items for hover popup
    const [itemRows]: any = await db.query(
      `SELECT l.id, l.mr_header_id, l.total, s.name AS supplier_name
       FROM lpo l
       LEFT JOIN suppliers s ON s.id = l.supplier_id
       WHERE l.payment_status = 'Approved'
         AND l.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       ORDER BY l.total DESC
       LIMIT 20`,
      [filter]
    );

    const items = itemRows.map((lpo: any) => ({
      display_id: `LPO-${String(lpo.id).padStart(5, "0")}`,
      detail: lpo.supplier_name || "-",
      amount: Number(lpo.total) || 0,
    }));

    return NextResponse.json(
      {
        this_week: currentPeriodTotal,
        last_week: previousPeriodTotal,
        items,
        total_count: items.length,
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
