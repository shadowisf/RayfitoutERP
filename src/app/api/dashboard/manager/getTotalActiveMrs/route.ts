import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { filter } = body;

    // Validate filter parameter (0 = all time, positive = days)
    if (filter === undefined || filter === null || typeof filter !== "number" || filter < 0) {
      return NextResponse.json(
        { error: "Invalid 'filter' parameter. Must be a non-negative number." },
        { status: 400 }
      );
    }

    if (filter === 0) {
      // All time — count MRs at LPO & Invoice stage + count incomplete LPOs
      const [mrRows]: any = await db.query(
        `SELECT COUNT(*) AS mr_count FROM vw_mr_headers WHERE progress_id = 12`
      );
      const [lpoRows]: any = await db.query(
        `SELECT COUNT(*) AS lpo_count FROM lpo WHERE progress_id != 25`
      );

      const thisWeek = (mrRows[0].mr_count || 0) + (lpoRows[0].lpo_count || 0);

      // Fetch items for hover popup (MRs at LPO stage + incomplete LPOs)
      const [mrItems]: any = await db.query(
        `SELECT id, type, project_name, 'MR' AS source
         FROM vw_mr_headers
         WHERE progress_id = 12
         ORDER BY date_requested DESC
         LIMIT 10`
      );
      const [lpoItems]: any = await db.query(
        `SELECT l.id, l.mr_header_id, l.total, s.name AS supplier_name, 'LPO' AS source
         FROM lpo l
         LEFT JOIN suppliers s ON s.id = l.supplier_id
         WHERE l.progress_id != 25
         ORDER BY l.created_at DESC
         LIMIT 10`
      );

      // Combine items: show MRs first, then LPOs
      const items = [
        ...mrItems.map((mr: any) => ({
          display_id: `${mr.type === "job" ? "JO" : "MR"}-${String(mr.id).padStart(5, "0")}`,
          detail: mr.project_name || "-",
          source: "MR",
        })),
        ...lpoItems.map((lpo: any) => ({
          display_id: `LPO-${String(lpo.id).padStart(5, "0")}`,
          detail: lpo.supplier_name || "-",
          source: "LPO",
        })),
      ].slice(0, 20);

      return NextResponse.json({ this_week: thisWeek, last_week: 0, items, total_count: thisWeek }, { status: 200 });
    }

    // Filtered by date range — MRs at LPO stage + incomplete LPOs
    const [mrCountRows]: any = await db.query(
      `SELECT
        SUM(date_requested >= DATE_SUB(CURDATE(), INTERVAL ? DAY)) AS this_week,
        SUM(date_requested >= DATE_SUB(CURDATE(), INTERVAL ? DAY) AND date_requested < DATE_SUB(CURDATE(), INTERVAL ? DAY)) AS last_week
       FROM vw_mr_headers
       WHERE progress_id = 12`,
      [filter, filter * 2, filter]
    );

    const [lpoCountRows]: any = await db.query(
      `SELECT
        SUM(l.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)) AS this_week,
        SUM(l.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY) AND l.created_at < DATE_SUB(CURDATE(), INTERVAL ? DAY)) AS last_week
       FROM lpo l
       WHERE l.progress_id != 25`,
      [filter, filter * 2, filter]
    );

    const thisWeek = (mrCountRows[0].this_week || 0) + (lpoCountRows[0].this_week || 0);
    const lastWeek = (mrCountRows[0].last_week || 0) + (lpoCountRows[0].last_week || 0);

    // Fetch items for hover popup
    const [mrItems]: any = await db.query(
      `SELECT id, type, project_name, 'MR' AS source
       FROM vw_mr_headers
       WHERE progress_id = 12
         AND date_requested >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       ORDER BY date_requested DESC
       LIMIT 10`,
      [filter]
    );
    const [lpoItems]: any = await db.query(
      `SELECT l.id, l.mr_header_id, l.total, s.name AS supplier_name, 'LPO' AS source
       FROM lpo l
       LEFT JOIN suppliers s ON s.id = l.supplier_id
       WHERE l.progress_id != 25
         AND l.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       ORDER BY l.created_at DESC
       LIMIT 10`,
      [filter]
    );

    const items = [
      ...mrItems.map((mr: any) => ({
        display_id: `${mr.type === "job" ? "JO" : "MR"}-${String(mr.id).padStart(5, "0")}`,
        detail: mr.project_name || "-",
        source: "MR",
      })),
      ...lpoItems.map((lpo: any) => ({
        display_id: `LPO-${String(lpo.id).padStart(5, "0")}`,
        detail: lpo.supplier_name || "-",
        source: "LPO",
      })),
    ].slice(0, 20);

    return NextResponse.json({ this_week: thisWeek, last_week: lastWeek, items, total_count: thisWeek }, { status: 200 });
  } catch (err: any) {
    console.error(err.sqlMessage || err.message);
    return NextResponse.json(
      { error: err.sqlMessage || err.message },
      { status: 500 }
    );
  }
}
