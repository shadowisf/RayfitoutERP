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
        body.date || null,
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
      (boq_id, item_name, category, sub_category, scope_of_work, location_id, quantity, unit, rate_per_quantity, total_cost, item_description, attachments)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

      const values = [
        Number(body.boq_id),
        body.item_name,
        body.category,
        body.sub_category,
        /* body.item_code, */
        body.scope_of_work,
        Number(body.location_id) || null,
        Number(body.quantity),
        body.unit,
        Number(body.rate_per_quantity) || 0,
        Number(body.total_cost) || 0,
        body.item_description || null,
        body.attachments && body.attachments.length > 0
          ? JSON.stringify(body.attachments)
          : null,
      ];

      const [result]: any = await db.query(query, values);

      return NextResponse.json({ success: true, id: result.insertId });
    }
  } catch (err: any) {
    console.error(err.sqlMessage);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();

    if (body.action === "updateAll") {
      const query = `
      UPDATE boq_lines 
      SET item_name = ?, category = ?, sub_category = ?, scope_of_work = ?, location_id = ?, quantity = ?, unit = ?, rate_per_quantity = ?, total_cost = ?, item_description = ?, attachments = ?
      WHERE id = ?
    `;

      const values = [
        body.item_name,
        body.category,
        body.sub_category,
        /* body.item_code, */
        body.scope_of_work,
        Number(body.location_id) || null,
        Number(body.quantity),
        body.unit,
        Number(body.rate_per_quantity) || 0,
        Number(body.total_cost) || 0,
        body.item_description || null,
        body.attachments && body.attachments.length > 0
          ? JSON.stringify(body.attachments)
          : null,
        Number(body.id),
      ];

      await db.query(query, values);

      return NextResponse.json({ success: true });
    }

    if (body.action === "updateSubCategory") {
      const query = `
      UPDATE boq_lines 
      SET sub_category = ?
      WHERE sub_category = ? AND category = ? AND boq_id = ?
    `;

      const values = [
        body.new_sub_category,
        body.old_sub_category,
        body.category,
        body.boq_id,
      ];

      await db.query(query, values);

      return NextResponse.json({ success: true });
    }
  } catch (err: any) {
    console.error(err.sqlMessage);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();

    if (body.action === "deleteSubCategory") {
      const query =
        "DELETE FROM boq_lines WHERE category = ? AND sub_category = ? AND boq_id = ?";
      await db.query(query, [body.category, body.sub_category, body.boq_id]);
      return NextResponse.json({ success: true });
    }

    if (body.action === "deleteItem") {
      const query = "DELETE FROM boq_lines WHERE id = ?";
      await db.query(query, [Number(body.id)]);
      return NextResponse.json({ success: true });
    }
  } catch (err: any) {
    console.error("SQL Error:", err.sqlMessage);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}
