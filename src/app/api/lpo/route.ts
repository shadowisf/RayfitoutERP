import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();

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
        Number(body.project_id),
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
            INSERT INTO jt_lpo_mr_line 
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
