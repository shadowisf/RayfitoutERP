import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { department_id, date_from, date_to, limit: itemLimit } = body;
    const maxItems = typeof itemLimit === "number" && itemLimit > 0 ? itemLimit : 20;

    if (!department_id) {
      return NextResponse.json({ error: "department_id is required" }, { status: 400 });
    }

    const dateClauseParts: string[] = [];
    if (date_from) dateClauseParts.push(`date_requested >= '${date_from}'`);
    if (date_to) dateClauseParts.push(`date_requested <= '${date_to}'`);
    const dateClause = dateClauseParts.length > 0
      ? `AND ${dateClauseParts.join(" AND ")}`
      : "";

    const [rows]: any = await db.query(
      `SELECT COUNT(*) AS this_week FROM vw_mr_headers WHERE progress_id = 1 AND department_id = ? ${dateClause}`,
      [Number(department_id)]
    );
    const [itemRows]: any = await db.query(
      `SELECT id, type, project_name,
         (SELECT COUNT(*) FROM mr_lines ml WHERE ml.mr_header_id = vw_mr_headers.id) AS item_count
       FROM vw_mr_headers WHERE progress_id = 1 AND department_id = ? ${dateClause}
       ORDER BY date_requested DESC LIMIT ?`,
      [Number(department_id), maxItems]
    );
    const items = itemRows.map((mr: any) => ({
      display_id: `${mr.type === "job" ? "JO" : "MR"}-${String(mr.id).padStart(5, "0")}`,
      item_count: Number(mr.item_count) || 0,
      raw_id: mr.id,
      type: "mr",
    }));
    const count = rows[0].this_week || 0;
    return NextResponse.json({ this_week: count, last_week: 0, items, total_count: count }, { status: 200 });
  } catch (err: any) {
    console.error(err.sqlMessage || err);
    return NextResponse.json({ error: err.sqlMessage || "Internal server error" }, { status: 500 });
  }
}
