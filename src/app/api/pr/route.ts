import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Get PR lines (JO lines from referenced JO)
    if (body.action === "getPrLines") {
      const mrHeaderId = Number(body.mr_header_id);

      // Get the JO reference from the payment request
      const [headerRows]: any = await db.query(
        `SELECT payment_jo_reference_id FROM mr_headers WHERE id = ?`,
        [mrHeaderId],
      );

      if (!headerRows?.[0]?.payment_jo_reference_id) {
        return NextResponse.json([], { status: 200 });
      }

      const joHeaderId = headerRows[0].payment_jo_reference_id;

      // Get all JO lines from the referenced JO
      const [joRows]: any = await db.query(
        `SELECT * FROM vw_jo_lines WHERE mr_header_id = ? ORDER BY id ASC`,
        [joHeaderId],
      );

      const prLines = [];

      for (const joLine of joRows) {
        // Check if pr_line already exists for this MR header + jo line
        const [existingPrLine]: any = await db.query(
          `SELECT * FROM pr_lines WHERE mr_header_id = ? AND jo_line_id = ?`,
          [mrHeaderId, joLine.id],
        );

        if (existingPrLine.length > 0) {
          prLines.push({
            ...existingPrLine[0],
            // Merge JO line data
            job_scope_name: joLine.job_scope_name,
            job_description: joLine.job_description,
            boq_line_ids: joLine.boq_line_ids,
            boq_line_names: joLine.boq_line_names,
            boq_item_numbers: joLine.boq_item_numbers,
            quantity: joLine.quantity,
            unit: joLine.unit,
            start_date: joLine.start_date,
            end_date: joLine.end_date,
            budget_estimate: joLine.budget_estimate,
            approved_total_price: joLine.approved_total_price,
            attachment: existingPrLine[0].attachment,
            jo_attachment: joLine.attachment,
          });
        } else {
          // Auto-create pr_line
          const [insertResult]: any = await db.query(
            `INSERT INTO pr_lines (mr_header_id, boq_line_id, jo_line_id, completed_qty, retention, attachment)
             VALUES (?, 0, ?, 0, 0, NULL)`,
            [mrHeaderId, joLine.id],
          );

          prLines.push({
            id: insertResult.insertId,
            mr_header_id: mrHeaderId,
            boq_line_id: 0,
            jo_line_id: joLine.id,
            completed_qty: 0,
            retention: 0,
            attachment: null,
            // JO line data
            job_scope_name: joLine.job_scope_name,
            job_description: joLine.job_description,
            boq_line_ids: joLine.boq_line_ids,
            boq_line_names: joLine.boq_line_names,
            boq_item_numbers: joLine.boq_item_numbers,
            quantity: joLine.quantity,
            unit: joLine.unit,
            start_date: joLine.start_date,
            end_date: joLine.end_date,
            budget_estimate: joLine.budget_estimate,
            approved_total_price: joLine.approved_total_price,
            jo_attachment: joLine.attachment,
          });
        }
      }

      return NextResponse.json(prLines, { status: 200 });
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
