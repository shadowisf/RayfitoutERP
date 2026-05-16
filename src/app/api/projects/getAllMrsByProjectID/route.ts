import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.project_id) {
      return NextResponse.json(
        { error: "Project ID is required" },
        { status: 400 },
      );
    }

    const projectId = Number(body.project_id);

    // Fetch ALL MR headers for the project (includes date_requested)
    const [mrRows]: any = await db.query(
      `SELECT vw.*, mh.date_requested
       FROM vw_mr_headers vw
       JOIN mr_headers mh ON mh.id = vw.id
       WHERE vw.project_id = ?`,
      [projectId],
    );

    // Exclude rejected MRs (5 = Request Rejected, 11 = Price Rejected, 13 = Payment Rejected)
    const REJECTED_PROGRESS_IDS = [5, 11, 13];
    const nonSegregatedMrs = mrRows.filter(
      (mr: any) =>
        mr.progress_id !== 26 &&
        !REJECTED_PROGRESS_IDS.includes(mr.progress_id),
    );
    const segregatedMrs = mrRows.filter((mr: any) => mr.progress_id === 26);
    const segregatedMrIds = segregatedMrs.map((mr: any) => mr.id);

    // Build a map of segregated MR id -> MR data
    const segregatedMrMap = new Map<number, any>();
    segregatedMrs.forEach((mr: any) => segregatedMrMap.set(mr.id, mr));

    // For segregated MRs, fetch all their LPOs with progress info + total_spent
    let lpoEntries: any[] = [];

    if (segregatedMrIds.length > 0) {
      const placeholders = segregatedMrIds.map(() => "?").join(",");
      const [lpoRows]: any = await db.query(
        `SELECT
           l.id                          AS lpo_id,
           l.mr_header_id,
           l.progress_id,
           l.delivery_date,
           l.total,
           l.payment_status,
           p.value                       AS progress_name,
           COALESCE(
             CASE
               WHEN COALESCE(l.total, 0) > 0 THEN l.total
               ELSE ROUND(COALESCE(pay.total_paid, 0), 2)
             END,
             0
           )                             AS total_spent
         FROM lpo l
         LEFT JOIN lut_mr_headers_progress p  ON l.progress_id = p.id
         LEFT JOIN (
           SELECT lpo_id, SUM(amount) AS total_paid
           FROM lpo_payments
           GROUP BY lpo_id
         ) pay ON pay.lpo_id = l.id
         WHERE l.mr_header_id IN (${placeholders})
           AND l.progress_id != 13`,
        segregatedMrIds,
      );

      // Create one entry per LPO, merging parent MR data
      lpoEntries = lpoRows.map((lpo: any) => {
        const parentMr = segregatedMrMap.get(lpo.mr_header_id);
        return {
          ...parentMr,
          lpo_id: lpo.lpo_id,
          lpo_progress_id: lpo.progress_id,
          lpo_progress_name: lpo.progress_name || "Unknown",
          display_progress_name: lpo.progress_name || parentMr?.progress_name,
          total_spent: Number(lpo.total_spent) || 0,
        };
      });
    }

    // Non-segregated entries: total_spent = sum of any LPOs attached even if not yet segregated
    // For simplicity set to 0 — they haven't reached LPO stage yet
    const nonSegregatedEntries = nonSegregatedMrs.map((mr: any) => ({
      ...mr,
      lpo_id: null,
      lpo_progress_id: null,
      lpo_progress_name: null,
      display_progress_name: mr.progress_name,
      total_spent: 0,
    }));

    // Exclude rejected LPO entries
    const filteredLpoEntries = lpoEntries.filter(
      (entry) => entry.lpo_progress_id !== 13,
    );

    const enrichedRows = [...nonSegregatedEntries, ...filteredLpoEntries];

    return NextResponse.json(
      { success: true, count: enrichedRows.length, data: enrichedRows },
      { status: 200 },
    );
  } catch (err: any) {
    console.error(err.sqlMessage || err.message);
    return NextResponse.json({ error: err.sqlMessage || err.message }, { status: 500 });
  }
}
