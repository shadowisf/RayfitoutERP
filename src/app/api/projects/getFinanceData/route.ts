import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2";

// Returns financial data for a project.
// Query params: project_id, start_date (optional), end_date (optional)
//
// Recurring entries are expanded on-the-fly:
//   The effective amount for a recurring entry within [start, end] is:
//   occurrences_in_range × amount_per_period
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("project_id");
  const startParam = searchParams.get("start_date");
  const endParam = searchParams.get("end_date");

  if (!projectId) {
    return NextResponse.json({ error: "project_id required" }, { status: 400 });
  }

  const rangeStart = startParam ? new Date(startParam) : null;
  const rangeEnd = endParam ? new Date(endParam) : null;

  try {
    // 1. Manual finance entries
    const [entries] = await db.query<RowDataPacket[]>(
      `SELECT id, entry_type, name, amount, is_recurring, frequency, start_date, end_date, created_at
       FROM project_finance_entries
       WHERE project_id = ?
       ORDER BY created_at ASC`,
      [Number(projectId)],
    );

    // Compute effective_amount for recurring entries
    const computedEntries = entries.map((e) => {
      if (!e.is_recurring || !e.frequency) {
        return { ...e, effective_amount: Number(e.amount) };
      }
      const es = e.start_date ? new Date(e.start_date) : null;
      const ee = e.end_date ? new Date(e.end_date) : null;
      const viewStart = rangeStart ?? es;
      const viewEnd = rangeEnd ?? ee;
      if (!viewStart || !viewEnd) {
        return { ...e, effective_amount: Number(e.amount) };
      }
      const overlap_start = es && es > viewStart ? es : viewStart;
      const overlap_end = ee && ee < viewEnd ? ee : viewEnd;
      if (overlap_start > overlap_end) {
        return { ...e, effective_amount: 0 };
      }
      const days = Math.max(0, (overlap_end.getTime() - overlap_start.getTime()) / 86_400_000 + 1);
      let occurrences = 0;
      switch (e.frequency) {
        case "daily":     occurrences = Math.floor(days); break;
        case "weekly":    occurrences = Math.floor(days / 7); break;
        case "monthly":   occurrences = monthsBetween(overlap_start, overlap_end); break;
        case "quarterly": occurrences = Math.floor(monthsBetween(overlap_start, overlap_end) / 3); break;
        case "yearly":    occurrences = yearsBetween(overlap_start, overlap_end); break;
        default:          occurrences = 1;
      }
      return { ...e, effective_amount: occurrences * Number(e.amount) };
    });

    // IS_PAID logic matching the payment view exactly
    const IS_PAID = `(
      LOWER(TRIM(IFNULL(l.payment_status, '')))
        IN ('approved','paid','fully paid','completed','done')
      OR (l.total > 0 AND ROUND(COALESCE(pay.total_paid, 0), 2) >= ROUND(l.total, 2))
    )`;

    // 2. LPO rows for material requests — one row per LPO
    const [lpoRows] = await db.query<RowDataPacket[]>(
      `SELECT
         l.id                                    AS lpo_id,
         l.mr_header_id,
         l.total                                 AS lpo_total,
         l.created_at                            AS lpo_date,
         s.name                                  AS supplier_name,
         mh.requested_by,
         mh.date_requested,
         ROUND(COALESCE(pay.total_paid, 0), 2)  AS amount_paid,
         CASE WHEN ${IS_PAID} THEN 'Paid' ELSE 'Unpaid' END AS payment_status,
         GROUP_CONCAT(
           DISTINCT CONCAT(bl.category_order,'.',bl.subcategory_order,'.',bl.item_order)
           ORDER BY bl.category_order, bl.subcategory_order, bl.item_order
         ) AS boq_refs
       FROM lpo l
       JOIN mr_headers mh ON mh.id = l.mr_header_id
       LEFT JOIN suppliers s ON s.id = l.supplier_id
       LEFT JOIN (
         SELECT lpo_id, SUM(amount) AS total_paid
         FROM lpo_payments
         GROUP BY lpo_id
       ) pay ON pay.lpo_id = l.id
       LEFT JOIN lpo_mr_line lml ON lml.lpo_id = l.id
       LEFT JOIN jt_mr_lines_boq_lines jmbl ON jmbl.mr_line_id = lml.mr_line_id
       LEFT JOIN boq_lines bl ON bl.id = jmbl.boq_line_id
       WHERE mh.project_id = ?
         AND mh.type = 'material'
         AND mh.progress_id = 26
         AND l.progress_id > 14
         ${startParam ? "AND DATE(l.created_at) >= ?" : ""}
         ${endParam ? "AND DATE(l.created_at) <= ?" : ""}
       GROUP BY l.id
       ORDER BY l.created_at DESC`,
      [Number(projectId), ...(startParam ? [startParam] : []), ...(endParam ? [endParam] : [])],
    );

    // Totals from LPO rows
    const mrPaid   = lpoRows.filter((r) => r.payment_status === "Paid").reduce((s, r) => s + Number(r.lpo_total), 0);
    const mrUnpaid = lpoRows.filter((r) => r.payment_status === "Unpaid").reduce((s, r) => s + Number(r.lpo_total), 0);

    // 3. Job orders — based on payment requests (same as payment view)
    //    Value = SUM(jo_lines.after_retention_with_vat) per completed JO in this project
    //    Paid  = SUM(jo_payments.amount) per payment request
    const [joRows] = await db.query<RowDataPacket[]>(
      `SELECT
         mh.id                                                             AS pr_id,
         mh.date_requested,
         mh.requested_by,
         mh.payment_jo_reference_id,
         s.name                                                            AS subcontractor_name,
         ROUND(COALESCE(jl_totals.after_retention_with_vat_sum, 0), 2)   AS total_with_vat,
         ROUND(COALESCE(pmt.total_paid, 0), 2)                            AS amount_paid,
         CASE
           WHEN COALESCE(pmt.total_paid, 0) > 0
            AND ROUND(GREATEST(
              COALESCE(jl_totals.after_retention_with_vat_sum, 0) - COALESCE(pmt.total_paid, 0),
              0
            ), 2) = 0
           THEN 'Paid' ELSE 'Unpaid'
         END                                                               AS payment_status
       FROM mr_headers mh
       JOIN mr_headers jo_ref ON jo_ref.id = mh.payment_jo_reference_id
                              AND jo_ref.progress_id = 25
                              AND jo_ref.project_id = ?
       LEFT JOIN lpo l ON l.mr_header_id = mh.payment_jo_reference_id
       LEFT JOIN subcontractors s ON s.id = l.subcontractor_id
       LEFT JOIN (
         SELECT mr_header_id,
                SUM(COALESCE(after_retention_with_vat, 0)) AS after_retention_with_vat_sum
         FROM jo_lines
         GROUP BY mr_header_id
       ) jl_totals ON jl_totals.mr_header_id = mh.payment_jo_reference_id
       LEFT JOIN (
         SELECT pr_id, SUM(amount) AS total_paid
         FROM jo_payments
         GROUP BY pr_id
       ) pmt ON pmt.pr_id = mh.id
       WHERE mh.type = 'payment'
         AND mh.progress_id = 25
       GROUP BY mh.id, s.name, pmt.total_paid,
                jl_totals.after_retention_with_vat_sum
       ORDER BY mh.id DESC`,
      [Number(projectId)],
    );

    const joTotal = joRows.reduce((s, r) => s + Number(r.total_with_vat), 0);

    // 4. Project value — sum of BOQ line total_cost for active (non-draft) BOQs,
    //    matching exactly what is shown as VALUE on the project detail page.
    const [projectValue] = await db.query<RowDataPacket[]>(
      `SELECT COALESCE(SUM(bl.total_cost), 0) AS total_value
       FROM boq_lines bl
       JOIN boq_headers bh ON bh.id = bl.boq_id
       WHERE bh.project_id = ?
         AND bh.is_draft = 0`,
      [Number(projectId)],
    );

    return NextResponse.json({
      entries: computedEntries,
      lpo_rows: lpoRows,
      mr_paid: mrPaid,
      mr_unpaid: mrUnpaid,
      mr_total: mrPaid + mrUnpaid,
      jo_rows: joRows,
      jo_total: joTotal,
      project_value: Number(projectValue[0]?.total_value ?? 0),
    });
  } catch (err: any) {
    console.error("getFinanceData error:", err.sqlMessage || err.message);
    return NextResponse.json({ error: err.sqlMessage || err.message }, { status: 500 });
  }
}

function monthsBetween(a: Date, b: Date): number {
  return Math.max(0,
    (b.getFullYear() - a.getFullYear()) * 12 +
    (b.getMonth() - a.getMonth()) + 1,
  );
}

function yearsBetween(a: Date, b: Date): number {
  return Math.max(0, b.getFullYear() - a.getFullYear() + 1);
}
