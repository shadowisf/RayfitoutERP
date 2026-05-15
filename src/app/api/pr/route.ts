import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.action === "getPrLines") {
      const mrHeaderId = Number(body.mr_header_id);

      // pr_lines are created when the payment MR is created, so they should always exist.
      // Just query and return them — no auto-create here.
      const [rows]: any = await db.query(
        `SELECT
           pl.id, pl.mr_header_id, pl.boq_line_id, pl.jo_line_id,
           pl.subcontracted_qty, pl.completed_qty, pl.retention, pl.attachment,
           pl.qs_approval_status, pl.qs_reject_comment,
           pl.approval_status, pl.reject_comment,
           bl.item_name, bl.item_description,
           bl.quantity AS boq_qty, bl.unit AS boq_unit, bl.rate_per_quantity,
           jl.job_scope_name, jl.job_description, jl.contract_type,
           jl.boq_line_ids, jl.boq_line_names,
           jl.quantity, jl.unit, jl.budget_estimate, jl.approved_total_price
         FROM pr_lines pl
         JOIN boq_lines bl ON bl.id = pl.boq_line_id
         JOIN vw_jo_lines jl ON jl.id = pl.jo_line_id
         WHERE pl.mr_header_id = ?
         ORDER BY pl.jo_line_id ASC, bl.category_order ASC, bl.subcategory_order ASC, bl.item_order ASC`,
        [mrHeaderId],
      );

      return NextResponse.json(rows, { status: 200 });
    }

    // Update PR line (completed_qty, retention, attachment)
    if (body.action === "updatePrLine") {
      await db.query(
        `UPDATE pr_lines
         SET completed_qty = ?, retention = ?, attachment = ?
         WHERE id = ?`,
        [
          Number(body.completed_qty) || 0,
          Number(body.retention) || 0,
          body.attachment || null,
          Number(body.pr_line_id),
        ],
      );

      return NextResponse.json({ success: true });
    }

    // Update invoice file on mr_headers
    if (body.action === "updateInvoiceFile") {
      await db.query(
        `UPDATE mr_headers SET jo_invoice_file = ? WHERE id = ?`,
        [body.invoice_file, Number(body.mr_header_id)],
      );

      return NextResponse.json({ success: true });
    }

    // QS Approval actions
    if (body.action === "approvePrLineQS") {
      await db.query(
        `UPDATE pr_lines SET qs_approval_status = 'Approved', qs_reject_comment = NULL WHERE id = ?`,
        [Number(body.pr_line_id)],
      );
      return NextResponse.json({ success: true });
    }

    if (body.action === "rejectPrLineQS") {
      await db.query(
        `UPDATE pr_lines SET qs_approval_status = 'Rejected', qs_reject_comment = ? WHERE id = ?`,
        [body.comment || "", Number(body.pr_line_id)],
      );
      return NextResponse.json({ success: true });
    }

    if (body.action === "resetPrLineQS") {
      await db.query(
        `UPDATE pr_lines SET qs_approval_status = NULL, qs_reject_comment = NULL WHERE id = ?`,
        [Number(body.pr_line_id)],
      );
      return NextResponse.json({ success: true });
    }

    // Manager Approval actions
    if (body.action === "approvePrLine") {
      await db.query(
        `UPDATE pr_lines SET approval_status = 'Approved', reject_comment = NULL WHERE id = ?`,
        [Number(body.pr_line_id)],
      );
      return NextResponse.json({ success: true });
    }

    if (body.action === "rejectPrLine") {
      await db.query(
        `UPDATE pr_lines SET approval_status = 'Rejected', reject_comment = ? WHERE id = ?`,
        [body.comment || "", Number(body.pr_line_id)],
      );
      return NextResponse.json({ success: true });
    }

    if (body.action === "resetPrLine") {
      await db.query(
        `UPDATE pr_lines SET approval_status = NULL, reject_comment = NULL WHERE id = ?`,
        [Number(body.pr_line_id)],
      );
      return NextResponse.json({ success: true });
    }

    // Upload payment receipt
    if (body.action === "updatePaymentReceipt") {
      await db.query(
        `UPDATE mr_headers SET pr_payment_receipt = ? WHERE id = ?`,
        [body.payment_receipt, Number(body.mr_header_id)],
      );
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("PR API Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
