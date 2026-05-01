import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2";

export async function GET() {
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT
         l.id,
         l.mr_header_id,
         CASE
           WHEN LOWER(IFNULL(l.payment_status, ''))
                IN ('approved','paid','fully paid','completed','done')
             THEN l.total
           ELSE COALESCE(pay.total_paid, 0)
         END                                          AS total,
         l.paid_at,
         l.created_at,
         COALESCE(s.name, 'Unknown')                 AS vendor_name,
         UPPER(COALESCE(s.type, ''))                 AS vendor_type,
         COALESCE(mh.requested_by, '—')              AS requester,
         COALESCE(p.name, '—')                       AS project_name,
         (
           SELECT GROUP_CONCAT(DISTINCT lmc.value ORDER BY lmc.value SEPARATOR '||')
           FROM lpo_mr_line  lml2
           JOIN vw_mr_lines  vml2 ON lml2.mr_line_id       = vml2.id
           LEFT JOIN lut_material_categories lmc
                  ON vml2.material_category_id = lmc.id
           WHERE lml2.lpo_id = l.id
             AND lmc.value IS NOT NULL
         ) AS material_categories
       FROM lpo l
       LEFT JOIN suppliers   s   ON l.supplier_id  = s.id
       LEFT JOIN mr_headers  mh  ON l.mr_header_id = mh.id
       LEFT JOIN projects    p   ON mh.project_id  = p.id
       LEFT JOIN (
         SELECT lpo_id, SUM(amount) AS total_paid
         FROM lpo_payments
         GROUP BY lpo_id
       ) pay ON pay.lpo_id = l.id
       WHERE l.progress_id NOT IN (13)
       ORDER BY l.created_at DESC`,
    );

    const data = (rows as any[]).map((row) => ({
      id: row.id,
      mr_header_id: row.mr_header_id,
      display_id: `LPO-${String(row.id).padStart(5, "0")}`,
      vendor_name: row.vendor_name,
      vendor_type: row.vendor_type,
      requester: row.requester || "—",
      project_name: row.project_name,
      total: Number(row.total) || 0,
      paid_at: row.paid_at ?? null,
      created_at: row.created_at,
      material_categories: row.material_categories
        ? String(row.material_categories).split("||")
        : [],
    }));

    return NextResponse.json(data, { status: 200 });
  } catch (err: any) {
    console.error("getAllTransactions error:", err.sqlMessage || err.message);
    return NextResponse.json(
      { error: err.sqlMessage || err.message },
      { status: 500 },
    );
  }
}
