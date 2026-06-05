import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2";

// Returns all stocks_transfer_issue records with type like 'issue',
// grouped with their inventory items and any existing BOQ links.
// Query params: project_id (optional)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("project_id");

  try {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT
         sti.id                        AS transaction_id,
         sti.type,
         sti.from_location,
         sti.purpose,
         sti.receiver_name,
         sti.received,
         sti.created_on,
         p.name                        AS project_name,
         (
           SELECT JSON_ARRAYAGG(d.description)
           FROM (
             SELECT DISTINCT i2.description
             FROM jt_stocks_transfer_issue_inventory_item jt2
             JOIN inventory i2 ON i2.id = jt2.inventory_item_id
             WHERE jt2.stocks_transfer_issue_id = sti.id
           ) d
         ) AS descriptions,
         (
           SELECT JSON_ARRAYAGG(
             JSON_OBJECT(
               'boq_header_id', bh.id,
               'project_name',  bp.name,
               'item_name',     bl.item_name,
               'category_order',     bl.category_order,
               'subcategory_order',  bl.subcategory_order,
               'item_order',         bl.item_order
             )
           )
           FROM jt_stocks_transfer_issue_boq_lines jbl2
           JOIN boq_lines bl  ON bl.id  = jbl2.boq_line_id
           JOIN boq_headers bh ON bh.id = bl.boq_id
           JOIN projects bp    ON bp.id = bh.project_id
           WHERE jbl2.stocks_transfer_issue_id = sti.id
         ) AS boq_links
       FROM stocks_transfer_issue sti
       LEFT JOIN projects p ON p.id = sti.project_id
       WHERE LOWER(sti.type) LIKE '%issue%'
         ${projectId ? "AND sti.project_id = ?" : ""}
       ORDER BY sti.created_on DESC`,
      projectId ? [Number(projectId)] : [],
    );

    // boq_links comes back as a JSON string from MySQL — parse it
    const parsed = rows.map((row) => ({
      ...row,
      boq_links: row.boq_links
        ? typeof row.boq_links === "string"
          ? JSON.parse(row.boq_links)
          : row.boq_links
        : [],
    }));

    return NextResponse.json(parsed, { status: 200 });
  } catch (err: any) {
    console.error("getIssueTransactions error:", err.sqlMessage || err.message);
    return NextResponse.json({ error: err.sqlMessage || err.message }, { status: 500 });
  }
}
