import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const query = `
      INSERT INTO projects_boq_headers 
      (project_id, company_name, client_name, id, location_id, date, payment_terms, validity_terms, terms_and_conditions)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      Number(body.project_id),
      body.company_name,
      body.client_name,
      Number(body.id),
      Number(body.location_id),
      body.date,
      body.payment_terms,
      body.validity_terms,
      body.terms_and_conditions,
    ];

    const [result]: any = await db.query(query, values);

    return NextResponse.json({ success: true, id: result.insertId });
  } catch (err: any) {
    console.error("POST /api/projects ERROR:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
