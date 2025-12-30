import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.action === "rejectPayment") {
      const query = `
    UPDATE lpo 
    SET payment_status = 'Rejected', payment_reject_comment = ?
    WHERE id = ?
  `;

      await db.query(query, [body.reject_comment, Number(body.lpo_id)]);

      return NextResponse.json({ success: true });
    }

    if (body.action === "resetPayment") {
      const query = `
    UPDATE lpo 
    SET payment_status = NULL, payment_reject_comment = NULL, payment_file = NULL
    WHERE id = ?
  `;

      await db.query(query, [Number(body.lpo_id)]);

      return NextResponse.json({ success: true });
    }

    if (body.action === "approvePayment") {
      const query = `
    UPDATE lpo 
    SET payment_status = 'Approved', payment_reject_comment = NULL, payment_file = ?
    WHERE id = ?
  `;

      await db.query(query, [body.payment_file || null, Number(body.lpo_id)]);

      return NextResponse.json({ success: true });
    }

    if (body.action === "updateLPO") {
      const {
        lpo_id,
        quotation_code,
        supplier_contact_person_name,
        supplier_email,
        delivery_date,
        payment_terms,
        delivery_terms,
        subtotal,
        discount,
        vat_rate,
        vat,
        shipping_and_handling,
        total,
        lpo_mr_lines,
      } = body;

      try {
        // Update main LPO record
        const updateLPOQuery = `
      UPDATE lpo 
      SET 
        quotation_code = ?,
        supplier_contact_person_name = ?,
        supplier_email = ?,
        delivery_date = ?,
        payment_terms = ?,
        delivery_terms = ?,
        subtotal = ?,
        discount = ?,
        vat_rate = ?,
        vat = ?,
        shipping_and_handling = ?,
        total = ?
      WHERE id = ?
    `;

        await db.query(updateLPOQuery, [
          quotation_code,
          supplier_contact_person_name,
          supplier_email,
          delivery_date,
          payment_terms,
          delivery_terms,
          subtotal,
          discount,
          vat_rate,
          vat,
          shipping_and_handling,
          total,
          lpo_id,
        ]);

        // Update LPO MR Lines
        for (const line of lpo_mr_lines) {
          const updateLineQuery = `
        UPDATE lpo_mr_line 
        SET 
          unit_price = ?,
          total_price = ?
        WHERE id = ?
      `;

          await db.query(updateLineQuery, [
            line.unit_price,
            line.total_price,
            line.id,
          ]);
        }

        return NextResponse.json(
          { success: true, message: "LPO updated successfully" },
          { status: 200 }
        );
      } catch (error) {
        console.error("Error updating LPO:", error);
        return NextResponse.json(
          { error: "Failed to update LPO" },
          { status: 500 }
        );
      }
    }

    if (body.action === "updateLPOSignedLpo") {
      const query = `
    UPDATE lpo
    SET signed_file = ?
    WHERE mr_header_id = ? AND supplier_id = ?
  `;

      const values = [
        body.signed_lpo_file,
        Number(body.mr_header_id),
        Number(body.supplier_id),
      ];

      await db.query(query, values);

      return NextResponse.json({ success: true });
    }

    if (body.action === "updateLPOInvoice") {
      const query = `
    UPDATE lpo
    SET invoice_file = ?
    WHERE mr_header_id = ? AND supplier_id = ?
  `;

      const values = [
        body.invoice_file,
        Number(body.mr_header_id),
        Number(body.supplier_id),
      ];

      await db.query(query, values);

      return NextResponse.json({ success: true });
    }

    if (body.action === "createLPO") {
      const lpoQuery = `
      INSERT INTO lpo 
      (project_id, mr_header_id, supplier_id, quotation_code, supplier_contact_person_name, supplier_email, delivery_date, payment_terms, delivery_terms, subtotal, discount, vat_rate, vat, shipping_and_handling, total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

      const lpoValues = [
        Number(body.project_id) || null,
        Number(body.mr_header_id),
        Number(body.supplier_id),
        body.quotation_code,
        body.supplier_contact_person_name,
        body.supplier_email,
        body.delivery_date,
        body.payment_terms,
        body.delivery_terms,
        Number(body.subtotal) || 0,
        Number(body.discount) || 0,
        Number(body.vat_rate) || 0,
        Number(body.vat) || 0,
        Number(body.shipping_and_handling) || 0,
        Number(body.total) || 0,
      ];

      const [lpoResult]: any = await db.query(lpoQuery, lpoValues);
      const lpoId = lpoResult.insertId;

      if (body.lpo_mr_lines && body.lpo_mr_lines.length > 0) {
        const mrLineQuery = `
            INSERT INTO lpo_mr_line 
            (lpo_id, mr_line_id, unit_price, total_price)
            VALUES (?, ?, ?, ?)
          `;

        for (const line of body.lpo_mr_lines) {
          await db.query(mrLineQuery, [
            lpoId,
            Number(line.mr_line_id),
            Number(line.unit_price),
            Number(line.total_price),
          ]);
        }
      }

      return NextResponse.json({ success: true });
    }
  } catch (err: any) {
    console.error(err.sqlMessage);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}
