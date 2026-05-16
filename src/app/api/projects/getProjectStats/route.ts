import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { project_id } = await req.json();

    if (!project_id) {
      return NextResponse.json(
        { error: "project_id is required" },
        { status: 400 },
      );
    }

    // ── VALUE: sum of BOQ line total_cost for ACTIVE (non-draft) BOQs only ────
    const [[valueRow]]: any = await db.query(
      `SELECT COALESCE(SUM(bl.total_cost), 0) AS value
       FROM boq_lines bl
       JOIN boq_headers bh ON bh.id = bl.boq_id
       WHERE bh.project_id = ?
         AND bh.is_draft = 0`,
      [project_id],
    );

    // ── SPEND TO DATE: LPOs + JO payment requests tied to this project ───────

    // LPO spend: if payment_status is approved/paid → use lpo.total,
    //            otherwise fall back to sum of lpo_payments rows
    const [[lpoPayRow]]: any = await db.query(
      `SELECT COALESCE(SUM(
         CASE
           WHEN LOWER(IFNULL(l.payment_status, ''))
                  IN ('approved','paid','fully paid','completed','done')
             THEN l.total
           ELSE COALESCE(pay.total_paid, 0)
         END
       ), 0) AS total
       FROM lpo l
       LEFT JOIN (
         SELECT lpo_id, SUM(amount) AS total_paid
         FROM lpo_payments
         GROUP BY lpo_id
       ) pay ON pay.lpo_id = l.id
       WHERE l.project_id = ?
         AND l.progress_id NOT IN (13)`,
      [project_id],
    );

    // JO payments: pr_id → mr_headers.id → mr_headers.project_id
    const [[joPayRow]]: any = await db.query(
      `SELECT COALESCE(SUM(jp.amount), 0) AS total
       FROM jo_payments jp
       JOIN mr_headers mh ON mh.id = jp.pr_id
       WHERE mh.project_id = ?`,
      [project_id],
    );

    // ── COMMITTED TOTAL: face value of all non-rejected LPOs (paid + unpaid) ──
    const [[committedRow]]: any = await db.query(
      `SELECT COALESCE(SUM(l.total), 0) AS committed_total
       FROM lpo l
       WHERE l.project_id = ?
         AND l.progress_id NOT IN (13)`,
      [project_id],
    );

    const value = Number(valueRow?.value ?? 0);
    const spendToDate =
      Number(lpoPayRow?.total ?? 0) + Number(joPayRow?.total ?? 0);
    const committedTotal = Number(committedRow?.committed_total ?? 0);

    return NextResponse.json({ value, spend_to_date: spendToDate, committed_total: committedTotal });
  } catch (err: any) {
    console.error("getProjectStats error:", err.sqlMessage || err.message);
    return NextResponse.json(
      { error: err.sqlMessage || err.message },
      { status: 500 },
    );
  }
}
