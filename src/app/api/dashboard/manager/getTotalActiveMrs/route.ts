import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { filter, limit: itemLimit } = body;
    const maxItems =
      typeof itemLimit === "number" && itemLimit > 0 ? itemLimit : 20;

    if (
      filter === undefined ||
      filter === null ||
      typeof filter !== "number" ||
      filter < 0
    ) {
      return NextResponse.json(
        { error: "Invalid 'filter' parameter. Must be a non-negative number." },
        { status: 400 },
      );
    }

    if (filter === 0) {
      // Active MRs: below segregated stage (< 26), not completed (25)
      const [mrRows]: any = await db.query(
        `SELECT COUNT(*) AS mr_count FROM vw_mr_headers WHERE progress_id < 26 AND progress_id != 25`,
      );
      // Active LPOs: above LPO & Invoice stage (> 12), not completed (25)
      const [lpoRows]: any = await db.query(
        `SELECT COUNT(*) AS lpo_count FROM lpo WHERE progress_id > 12 AND progress_id != 25`,
      );
      const thisWeek =
        Number(mrRows[0].mr_count || 0) + Number(lpoRows[0].lpo_count || 0);

      const halfLimit = Math.ceil(maxItems / 2);
      const [mrItems]: any = await db.query(
        `SELECT id, type, project_name,
           (SELECT COUNT(*) FROM mr_lines ml WHERE ml.mr_header_id = vw_mr_headers.id) AS item_count
         FROM vw_mr_headers WHERE progress_id < 26 AND progress_id != 25
         ORDER BY date_requested DESC LIMIT ?`,
        [halfLimit],
      );
      const [lpoItems]: any = await db.query(
        `SELECT l.id, l.mr_header_id,
           (SELECT COUNT(*) FROM lpo_mr_line lml WHERE lml.lpo_id = l.id) AS item_count
         FROM lpo l WHERE l.progress_id > 12 AND l.progress_id != 25
         ORDER BY l.created_at DESC LIMIT ?`,
        [halfLimit],
      );

      const items = [
        ...mrItems.map((mr: any) => ({
          display_id: `${mr.type === "job" ? "JO" : "MR"}-${String(mr.id).padStart(5, "0")}`,
          item_count: Number(mr.item_count) || 0,
          raw_id: mr.id,
          type: "mr",
        })),
        ...lpoItems.map((lpo: any) => ({
          display_id: `LPO-${String(lpo.id).padStart(5, "0")}`,
          item_count: Number(lpo.item_count) || 0,
          raw_id: lpo.id,
          mr_header_id: lpo.mr_header_id,
          type: "lpo",
        })),
      ].slice(0, maxItems);

      return NextResponse.json(
        { this_week: thisWeek, last_week: 0, items, total_count: thisWeek },
        { status: 200 },
      );
    }

    const [mrCountRows]: any = await db.query(
      `SELECT
        COUNT(CASE WHEN date_requested >= DATE_SUB(CURDATE(), INTERVAL ? DAY) THEN 1 END) AS this_week,
        COUNT(CASE WHEN date_requested >= DATE_SUB(CURDATE(), INTERVAL ? DAY) AND date_requested < DATE_SUB(CURDATE(), INTERVAL ? DAY) THEN 1 END) AS last_week
       FROM vw_mr_headers WHERE progress_id < 26 AND progress_id != 25`,
      [filter, filter * 2, filter],
    );
    const [lpoCountRows]: any = await db.query(
      `SELECT
        COUNT(CASE WHEN l.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY) THEN 1 END) AS this_week,
        COUNT(CASE WHEN l.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY) AND l.created_at < DATE_SUB(CURDATE(), INTERVAL ? DAY) THEN 1 END) AS last_week
       FROM lpo l WHERE l.progress_id > 12 AND l.progress_id != 25`,
      [filter, filter * 2, filter],
    );

    const thisWeek =
      Number(mrCountRows[0].this_week || 0) +
      Number(lpoCountRows[0].this_week || 0);
    const lastWeek =
      Number(mrCountRows[0].last_week || 0) +
      Number(lpoCountRows[0].last_week || 0);

    const halfLimit = Math.ceil(maxItems / 2);
    const [mrItems]: any = await db.query(
      `SELECT id, type, project_name,
         (SELECT COUNT(*) FROM mr_lines ml WHERE ml.mr_header_id = vw_mr_headers.id) AS item_count
       FROM vw_mr_headers WHERE progress_id < 26 AND progress_id != 25
         AND date_requested >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       ORDER BY date_requested DESC LIMIT ?`,
      [filter, halfLimit],
    );
    const [lpoItems]: any = await db.query(
      `SELECT l.id, l.mr_header_id,
         (SELECT COUNT(*) FROM lpo_mr_line lml WHERE lml.lpo_id = l.id) AS item_count
       FROM lpo l WHERE l.progress_id > 12 AND l.progress_id != 25
         AND l.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       ORDER BY l.created_at DESC LIMIT ?`,
      [filter, halfLimit],
    );

    const items = [
      ...mrItems.map((mr: any) => ({
        display_id: `${mr.type === "job" ? "JO" : "MR"}-${String(mr.id).padStart(5, "0")}`,
        item_count: Number(mr.item_count) || 0,
        raw_id: mr.id,
        type: "mr",
      })),
      ...lpoItems.map((lpo: any) => ({
        display_id: `LPO-${String(lpo.id).padStart(5, "0")}`,
        item_count: Number(lpo.item_count) || 0,
        raw_id: lpo.id,
        mr_header_id: lpo.mr_header_id,
        type: "lpo",
      })),
    ].slice(0, maxItems);

    return NextResponse.json(
      {
        this_week: thisWeek,
        last_week: lastWeek,
        items,
        total_count: thisWeek,
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error(err.sqlMessage || err.message);
    return NextResponse.json(
      { error: err.sqlMessage || err.message },
      { status: 500 },
    );
  }
}
