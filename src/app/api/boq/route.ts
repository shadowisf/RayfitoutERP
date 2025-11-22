import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.action === "createBoqHeader") {
      const query = `
      INSERT INTO boq_headers 
      (project_id, company_name, client_name, id, location, date, payment_terms, validity_terms, terms_and_conditions)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

      const values = [
        Number(body.project_id),
        body.company_name,
        body.client_name,
        Number(body.id),
        body.location,
        body.date,
        body.payment_terms,
        body.validity_terms,
        body.terms_and_conditions,
      ];

      const [result]: any = await db.query(query, values);

      return NextResponse.json({ success: true, id: result.insertId });
    }

    if (body.action === "createBoqLine") {
      const query = `
      INSERT INTO boq_lines 
      (boq_id, item_name, category, sub_category, item_code, scope_of_work, location_id, quantity, unit, rate_per_quantity, total_cost, item_description, attachments)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

      const values = [
        Number(body.boq_id),
        body.item_name,
        body.category,
        body.sub_category,
        body.item_code,
        body.scope_of_work,
        Number(body.location_id),
        Number(body.quantity),
        body.unit,
        Number(body.rate_per_quantity),
        Number(body.total_cost),
        body.item_description,
        body.attachments,
      ];

      const [result]: any = await db.query(query, values);

      return NextResponse.json({ success: true, id: result.insertId });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    console.error(err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
