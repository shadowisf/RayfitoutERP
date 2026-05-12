import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2";

const MATERIAL_CATEGORIES_SUBQUERY = `(
  SELECT GROUP_CONCAT(DISTINCT lmc.value ORDER BY lmc.value SEPARATOR '||')
  FROM lpo_mr_line  lml2
  JOIN vw_mr_lines  vml2 ON lml2.mr_line_id       = vml2.id
  LEFT JOIN lut_material_categories lmc
         ON vml2.material_category_id = lmc.id
  WHERE lml2.lpo_id = l.id
    AND lmc.value IS NOT NULL
)`;

const PAID_STATUS_LIST = `('approved','paid','fully paid','completed','done')`;

export async function POST(request: NextRequest) {
  try {
    const { supplier_id } = await request.json();
    const sid = Number(supplier_id);
    if (!sid)
      return NextResponse.json(
        { error: "supplier_id required" },
        { status: 400 },
      );

    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT *
       FROM (

         -- ── Legacy: payment_status is approved → one row per LPO ──────────
         SELECT
           l.id                                          AS lpo_id,
           NULL                                          AS payment_entry_id,
           l.mr_header_id,
           l.payment_status,
           l.payment_file                                AS payment_file_raw,
           NULL                                          AS supplier_statement_raw,
           l.total                                       AS total,
           l.paid_at                                     AS payment_date,
           l.created_at,
           COALESCE(s.name,  'Unknown')                  AS vendor_name,
           UPPER(COALESCE(s.type, ''))                   AS vendor_type,
           COALESCE(mh.requested_by, '—')                AS requester,
           COALESCE(p.name,  '—')                        AS project_name,
           ${MATERIAL_CATEGORIES_SUBQUERY}               AS material_categories
         FROM lpo l
         LEFT JOIN suppliers  s  ON l.supplier_id  = s.id
         LEFT JOIN mr_headers mh ON l.mr_header_id = mh.id
         LEFT JOIN projects   p  ON mh.project_id  = p.id
         WHERE l.progress_id NOT IN (13)
           AND l.supplier_id = ?
           AND LOWER(TRIM(IFNULL(l.payment_status, ''))) IN ${PAID_STATUS_LIST}

         UNION ALL

         -- ── New-style: one row per lpo_payments entry ─────────────────────
         SELECT
           l.id                                          AS lpo_id,
           lp.id                                         AS payment_entry_id,
           l.mr_header_id,
           l.payment_status,
           lp.receipt_file                               AS payment_file_raw,
           lp.supplier_statement                         AS supplier_statement_raw,
           lp.amount                                     AS total,
           lp.created_at                                 AS payment_date,
           l.created_at,
           COALESCE(s.name,  'Unknown')                  AS vendor_name,
           UPPER(COALESCE(s.type, ''))                   AS vendor_type,
           COALESCE(mh.requested_by, '—')                AS requester,
           COALESCE(p.name,  '—')                        AS project_name,
           ${MATERIAL_CATEGORIES_SUBQUERY}               AS material_categories
         FROM lpo l
         JOIN lpo_payments lp ON lp.lpo_id = l.id
         LEFT JOIN suppliers  s  ON l.supplier_id  = s.id
         LEFT JOIN mr_headers mh ON l.mr_header_id = mh.id
         LEFT JOIN projects   p  ON mh.project_id  = p.id
         WHERE l.progress_id NOT IN (13)
           AND l.supplier_id = ?
           AND LOWER(TRIM(IFNULL(l.payment_status, ''))) NOT IN ${PAID_STATUS_LIST}

       ) combined
       ORDER BY payment_date DESC, lpo_id ASC, payment_entry_id ASC`,
      [sid, sid],
    );

    const data = (rows as any[]).map((row) => {
      let paymentFile: string | null = null;
      if (row.payment_file_raw) {
        try {
          const parsed = JSON.parse(row.payment_file_raw);
          paymentFile = Array.isArray(parsed)
            ? (parsed[0] ?? null)
            : row.payment_file_raw;
        } catch {
          paymentFile = row.payment_file_raw;
        }
      }

      return {
        lpo_id: row.lpo_id,
        payment_entry_id: row.payment_entry_id ?? null,
        mr_header_id: row.mr_header_id,
        display_id: `LPO-${String(row.lpo_id).padStart(5, "0")}`,
        vendor_name: row.vendor_name,
        vendor_type: row.vendor_type,
        requester: row.requester || "—",
        project_name: row.project_name,
        payment_status: row.payment_status ?? null,
        total: Number(row.total) || 0,
        payment_date: row.payment_date ?? null,
        created_at: row.created_at,
        payment_file: paymentFile,
        supplier_statement: row.supplier_statement_raw
          ? String(row.supplier_statement_raw).replace(/^"+|"+$/g, "")
          : null,
        material_categories: row.material_categories
          ? String(row.material_categories).split("||")
          : [],
      };
    });

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (err: any) {
    console.error("getSupplierTransactions error:", err.sqlMessage || err.message);
    return NextResponse.json(
      { error: err.sqlMessage || err.message },
      { status: 500 },
    );
  }
}
