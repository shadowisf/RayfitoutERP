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

    // Active MRs: exclude completed (25), draft (1), and segregated (26) where ALL LPOs are completed OR no LPOs exist
    const segregatedExclusionClause = `
      AND NOT (
        progress_id = 26
        AND (
          (SELECT COUNT(*) FROM lpo WHERE lpo.mr_header_id = vw_mr_headers.id) = 0
          OR (SELECT COUNT(*) FROM lpo WHERE lpo.mr_header_id = vw_mr_headers.id AND lpo.progress_id != 25) = 0
        )
      )`;

    if (filter === 0) {
      const [mrRows]: any = await db.query(
        `SELECT COUNT(*) AS mr_count FROM vw_mr_headers WHERE progress_id != 25 AND progress_id != 1 ${segregatedExclusionClause}`,
      );
      const thisWeek = Number(mrRows[0].mr_count || 0);

      const [mrItems]: any = await db.query(
        `SELECT id, type, project_name,
           CASE
             WHEN type = 'job' THEN (SELECT COUNT(*) FROM jo_lines jl WHERE jl.mr_header_id = vw_mr_headers.id)
             WHEN type = 'payment' THEN (SELECT COUNT(*) FROM pr_lines pl WHERE pl.mr_header_id = vw_mr_headers.id)
             ELSE (SELECT COUNT(*) FROM mr_lines ml WHERE ml.mr_header_id = vw_mr_headers.id)
           END AS item_count
         FROM vw_mr_headers WHERE progress_id != 25 AND progress_id != 1 ${segregatedExclusionClause}
         ORDER BY date_requested DESC LIMIT ?`,
        [maxItems],
      );

      const items = mrItems.map((mr: any) => ({
        display_id: `${mr.type === "job" ? "JO" : mr.type === "payment" ? "PR" : "MR"}-${String(mr.id).padStart(5, "0")}`,
        item_count: Number(mr.item_count) || 0,
        raw_id: mr.id,
        type: "mr",
      }));

      return NextResponse.json(
        { this_week: thisWeek, last_week: 0, items, total_count: thisWeek },
        { status: 200 },
      );
    }

    const [mrCountRows]: any = await db.query(
      `SELECT
        COUNT(CASE WHEN date_requested >= DATE_SUB(CURDATE(), INTERVAL ? DAY) THEN 1 END) AS this_week,
        COUNT(CASE WHEN date_requested >= DATE_SUB(CURDATE(), INTERVAL ? DAY) AND date_requested < DATE_SUB(CURDATE(), INTERVAL ? DAY) THEN 1 END) AS last_week
       FROM vw_mr_headers WHERE progress_id != 25 AND progress_id != 1 ${segregatedExclusionClause}`,
      [filter, filter * 2, filter],
    );

    const thisWeek = Number(mrCountRows[0].this_week || 0);
    const lastWeek = Number(mrCountRows[0].last_week || 0);

    const [mrItems]: any = await db.query(
      `SELECT id, type, project_name,
         CASE
           WHEN type = 'job' THEN (SELECT COUNT(*) FROM jo_lines jl WHERE jl.mr_header_id = vw_mr_headers.id)
           WHEN type = 'payment' THEN (SELECT COUNT(*) FROM pr_lines pl WHERE pl.mr_header_id = vw_mr_headers.id)
           ELSE (SELECT COUNT(*) FROM mr_lines ml WHERE ml.mr_header_id = vw_mr_headers.id)
         END AS item_count
       FROM vw_mr_headers WHERE progress_id != 25 AND progress_id != 1 ${segregatedExclusionClause}
         AND date_requested >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       ORDER BY date_requested DESC LIMIT ?`,
      [filter, maxItems],
    );

    const items = mrItems.map((mr: any) => ({
      display_id: `${mr.type === "job" ? "JO" : mr.type === "payment" ? "PR" : "MR"}-${String(mr.id).padStart(5, "0")}`,
      item_count: Number(mr.item_count) || 0,
      raw_id: mr.id,
      type: "mr",
    }));

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
