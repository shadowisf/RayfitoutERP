import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2";

// ── GET: not used ─────────────────────────────────────────────────────────────

// ── POST ──────────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // ── getFinanceDetail ─────────────────────────────────────────────────────
    if (body.action === "getFinanceDetail") {
      const mrHeaderId = Number(body.mr_header_id);

      // Fetch all LPOs for this MR with supplier info
      const [lpoRows] = await db.query<RowDataPacket[]>(
        `SELECT
          l.id,
          l.mr_header_id,
          l.supplier_id,
          l.subcontractor_id,
          l.progress_id,
          l.payment_status,
          l.payment_terms,
          l.delivery_terms,
          l.delivery_date,
          l.subtotal,
          l.discount,
          l.vat_rate,
          l.vat,
          l.shipping_and_handling,
          l.total,
          l.invoice_file,
          l.payment_file,
          l.signed_file,
          l.created_at,
          s.name        AS supplier_name,
          s.address     AS supplier_address,
          s.trn_number  AS supplier_trn_number,
          s.type        AS supplier_type,
          s.contact_person_name AS supplier_contact_person,
          s.phone       AS supplier_phone,
          s.email       AS supplier_email_address,
          pr.value      AS progress_name
        FROM lpo l
        LEFT JOIN suppliers s ON l.supplier_id = s.id
        LEFT JOIN lut_mr_headers_progress pr ON l.progress_id = pr.id
        WHERE l.mr_header_id = ?
          AND l.progress_id NOT IN (13, 25)
        ORDER BY l.id ASC`,
        [mrHeaderId],
      );

      // Fetch lines for each LPO
      const lpoIds = (lpoRows as any[]).map((r) => r.id);

      let lineRows: any[] = [];
      if (lpoIds.length > 0) {
        const placeholders = lpoIds.map(() => "?").join(",");
        const [lr] = await db.query<RowDataPacket[]>(
          `SELECT
            lml.id            AS lpo_mr_line_id,
            lml.lpo_id,
            lml.mr_line_id,
            lml.unit_price    AS lpo_unit_price,
            lml.total_price   AS lpo_total_price,
            vml.material_description,
            vml.specification,
            vml.brand,
            vml.approved_proposed_quantity AS qty,
            vml.unit,
            vml.boq_line_ids,
            (
              SELECT bl.sub_category
              FROM jt_mr_lines_boq_lines jbl
              JOIN boq_lines bl ON bl.id = jbl.boq_line_id
              WHERE jbl.mr_line_id = lml.mr_line_id
              LIMIT 1
            ) AS boq_line_reference
          FROM lpo_mr_line lml
          JOIN vw_mr_lines vml ON lml.mr_line_id = vml.id
          WHERE lml.lpo_id IN (${placeholders})
          ORDER BY lml.lpo_id ASC, lml.id ASC`,
          lpoIds,
        );
        lineRows = lr as any[];
      }

      // Fetch payments for these LPOs (if table exists)
      let paymentRows: any[] = [];
      try {
        if (lpoIds.length > 0) {
          const placeholders = lpoIds.map(() => "?").join(",");
          const [pr] = await db.query<RowDataPacket[]>(
            `SELECT * FROM lpo_payments WHERE lpo_id IN (${placeholders}) ORDER BY created_at ASC`,
            lpoIds,
          );
          paymentRows = pr as any[];
        }
      } catch {
        // lpo_payments table not yet created — return empty
        paymentRows = [];
      }

      // Group lines and payments by lpo_id
      const linesByLpo: Record<number, any[]> = {};
      for (const line of lineRows) {
        if (!linesByLpo[line.lpo_id]) linesByLpo[line.lpo_id] = [];
        linesByLpo[line.lpo_id].push(line);
      }

      const paymentsByLpo: Record<number, any[]> = {};
      for (const p of paymentRows) {
        if (!paymentsByLpo[p.lpo_id]) paymentsByLpo[p.lpo_id] = [];
        paymentsByLpo[p.lpo_id].push(p);
      }

      const lpos = (lpoRows as any[]).map((lpo) => ({
        ...lpo,
        lpo_mr_lines: linesByLpo[lpo.id] || [],
        payments: paymentsByLpo[lpo.id] || [],
      }));

      return NextResponse.json({ success: true, lpos }, { status: 200 });
    }

    // ── recordPayment ────────────────────────────────────────────────────────
    if (body.action === "recordPayment") {
      const {
        lpo_id,
        mr_header_id,
        payment_type,
        payment_method,
        amount,
        receipt_file,
        notes,
        recorded_by,
      } = body;

      await db.query(
        `INSERT INTO lpo_payments
          (lpo_id, mr_header_id, payment_type, payment_method, amount, receipt_file, notes, recorded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          Number(lpo_id),
          Number(mr_header_id),
          payment_type,
          payment_method,
          Number(amount),
          receipt_file || null,
          notes || null,
          recorded_by,
        ],
      );

      return NextResponse.json({ success: true }, { status: 200 });
    }

    // ── rejectPayment ────────────────────────────────────────────────────────
    if (body.action === "rejectPayment") {
      const { lpo_id, mr_header_id, reason, rejected_by } = body;

      // Get the current progress_id of the LPO before updating
      const [[currentLpo]] = await db.query<RowDataPacket[]>(
        `SELECT progress_id FROM lpo WHERE id = ?`,
        [Number(lpo_id)],
      );

      // Update LPO progress to PAYMENT REJECTED (13)
      await db.query(`UPDATE lpo SET progress_id = 13 WHERE id = ?`, [
        Number(lpo_id),
      ]);

      // Log the rejection
      await db.query(
        `INSERT INTO mr_header_progress_log
          (mr_header_id, lpo_id, progress_id, from_progress_id, changed_by, reject_reason, is_rollback)
         VALUES (?, ?, 13, ?, ?, ?, 0)`,
        [
          Number(mr_header_id),
          Number(lpo_id),
          currentLpo?.progress_id ?? null,
          rejected_by || "Finance",
          reason || null,
        ],
      );

      return NextResponse.json({ success: true }, { status: 200 });
    }

    // ── getVendorStats ───────────────────────────────────────────────────────
    if (body.action === "getVendorStats") {
      const supplierId = Number(body.supplier_id);

      // Two cases:
      //  • Old LPOs  (payment_status = 'Approved') → spent = lpo.total, outstanding = 0
      //  • New LPOs  (payment_status IS NULL)       → spent = SUM(lpo_payments.amount),
      //                                               outstanding = lpo.total - that sum
      const [[stats]] = await db.query<RowDataPacket[]>(
        `SELECT
          COALESCE(SUM(
            CASE
              WHEN LOWER(IFNULL(l.payment_status, ''))
                   IN ('approved','paid','fully paid','completed','done')
                THEN 0
              ELSE GREATEST(0, l.total - COALESCE(pay.total_paid, 0))
            END
          ), 0) AS total_outstanding,
          COALESCE(SUM(
            CASE
              WHEN LOWER(IFNULL(l.payment_status, ''))
                   IN ('approved','paid','fully paid','completed','done')
                THEN l.total
              ELSE COALESCE(pay.total_paid, 0)
            END
          ), 0) AS total_spent,
          COALESCE(AVG(
            CASE
              WHEN LOWER(IFNULL(l.payment_status, ''))
                   IN ('approved','paid','fully paid','completed','done')
                THEN l.total
              ELSE COALESCE(pay.total_paid, 0)
            END
          ), 0) AS avg_lpo_value
        FROM lpo l
        LEFT JOIN (
          SELECT lpo_id, SUM(amount) AS total_paid
          FROM lpo_payments
          GROUP BY lpo_id
        ) pay ON pay.lpo_id = l.id
        WHERE l.supplier_id = ?`,
        [supplierId],
      );

      return NextResponse.json(
        {
          success: true,
          totalOutstanding: Number(stats.total_outstanding),
          totalSpent: Number(stats.total_spent),
          avgLpoValue: Number(stats.avg_lpo_value),
        },
        { status: 200 },
      );
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    console.error("Finance API error:", err);
    return NextResponse.json(
      { success: false, error: err.sqlMessage || err.message },
      { status: 500 },
    );
  }
}
