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
    // Only query material type MRs
    const segregatedExclusionClause = `
      AND NOT (
        progress_id = 26
        AND (
          (SELECT COUNT(*) FROM lpo WHERE lpo.mr_header_id = vw_mr_headers.id) = 0
          OR (SELECT COUNT(*) FROM lpo WHERE lpo.mr_header_id = vw_mr_headers.id AND lpo.progress_id != 25) = 0
        )
      )`;

    const baseWhere = `WHERE progress_id != 25 AND progress_id != 1 AND type = 'material' ${segregatedExclusionClause}`;

    if (filter === 0) {
      // All time
      const [mrRows]: any = await db.query(
        `SELECT COUNT(*) AS mr_count FROM vw_mr_headers ${baseWhere}`,
      );
      const thisWeek = Number(mrRows[0].mr_count || 0);

      const [mrItems]: any = await db.query(
        `SELECT id, type, project_name,
           (SELECT COUNT(*) FROM mr_lines ml WHERE ml.mr_header_id = vw_mr_headers.id) AS item_count
         FROM vw_mr_headers ${baseWhere}
         ORDER BY date_requested DESC LIMIT ?`,
        [maxItems],
      );

      const items = mrItems.map((mr: any) => ({
        display_id: `MR-${String(mr.id).padStart(5, "0")}`,
        item_count: Number(mr.item_count) || 0,
        raw_id: mr.id,
        type: "mr",
      }));

      // Bottleneck stages: group active MRs by current progress stage with median time
      const [bottleneckRows]: any = await db.query(
        `SELECT progress_id, progress_name, COUNT(*) AS mr_count,
           AVG(TIMESTAMPDIFF(MINUTE, date_requested, NOW())) AS median_minutes
         FROM vw_mr_headers
         ${baseWhere}
         GROUP BY progress_id, progress_name
         ORDER BY mr_count DESC`,
      );

      // Projects at risk: group active MRs by project
      const [projectRows]: any = await db.query(
        `SELECT project_name, COUNT(*) AS mr_count
         FROM vw_mr_headers ${baseWhere}
         GROUP BY project_name
         ORDER BY mr_count DESC`,
      );

      // Most requested subcategories (count items, not MRs)
      const [subcategoryRows]: any = await db.query(
        `SELECT msc.value AS subcategory_name, COUNT(ml.id) AS item_count
         FROM mr_lines ml
         INNER JOIN jt_mr_line_material_subcategory jt ON jt.mr_line_id = ml.id
         INNER JOIN lut_material_subcategories msc ON msc.id = jt.material_subcategory_id
         WHERE ml.mr_header_id IN (
           SELECT id FROM vw_mr_headers ${baseWhere}
         )
         GROUP BY msc.id, msc.value
         ORDER BY item_count DESC`,
      );

      return NextResponse.json(
        {
          this_week: thisWeek,
          last_week: 0,
          items,
          total_count: thisWeek,
          bottleneck_stages: bottleneckRows,
          projects_at_risk: projectRows,
          most_requested_subcategories: subcategoryRows,
        },
        { status: 200 },
      );
    }

    // Filtered by days
    const [mrCountRows]: any = await db.query(
      `SELECT
        COUNT(CASE WHEN date_requested >= DATE_SUB(CURDATE(), INTERVAL ? DAY) THEN 1 END) AS this_week,
        COUNT(CASE WHEN date_requested >= DATE_SUB(CURDATE(), INTERVAL ? DAY) AND date_requested < DATE_SUB(CURDATE(), INTERVAL ? DAY) THEN 1 END) AS last_week
       FROM vw_mr_headers ${baseWhere}`,
      [filter, filter * 2, filter],
    );

    const thisWeek = Number(mrCountRows[0].this_week || 0);
    const lastWeek = Number(mrCountRows[0].last_week || 0);

    const [mrItems]: any = await db.query(
      `SELECT id, type, project_name,
         (SELECT COUNT(*) FROM mr_lines ml WHERE ml.mr_header_id = vw_mr_headers.id) AS item_count
       FROM vw_mr_headers ${baseWhere}
         AND date_requested >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       ORDER BY date_requested DESC LIMIT ?`,
      [filter, maxItems],
    );

    const items = mrItems.map((mr: any) => ({
      display_id: `MR-${String(mr.id).padStart(5, "0")}`,
      item_count: Number(mr.item_count) || 0,
      raw_id: mr.id,
      type: "mr",
    }));

    // Bottleneck stages with median time
    const [bottleneckRows]: any = await db.query(
      `SELECT progress_id, progress_name, COUNT(*) AS mr_count,
         AVG(TIMESTAMPDIFF(MINUTE, date_requested, NOW())) AS median_minutes
       FROM vw_mr_headers
       ${baseWhere}
       GROUP BY progress_id, progress_name
       ORDER BY mr_count DESC`,
    );

    // Projects at risk
    const [projectRows]: any = await db.query(
      `SELECT project_name, COUNT(*) AS mr_count
       FROM vw_mr_headers ${baseWhere}
       GROUP BY project_name
       ORDER BY mr_count DESC`,
    );

    // Most requested subcategories (count items, not MRs)
    const [subcategoryRows]: any = await db.query(
      `SELECT msc.value AS subcategory_name, COUNT(ml.id) AS item_count
       FROM mr_lines ml
       INNER JOIN jt_mr_line_material_subcategory jt ON jt.mr_line_id = ml.id
       INNER JOIN lut_material_subcategories msc ON msc.id = jt.material_subcategory_id
       WHERE ml.mr_header_id IN (
         SELECT id FROM vw_mr_headers ${baseWhere}
       )
       GROUP BY msc.id, msc.value
       ORDER BY item_count DESC`,
    );

    return NextResponse.json(
      {
        this_week: thisWeek,
        last_week: lastWeek,
        items,
        total_count: thisWeek,
        bottleneck_stages: bottleneckRows,
        projects_at_risk: projectRows,
        most_requested_subcategories: subcategoryRows,
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
