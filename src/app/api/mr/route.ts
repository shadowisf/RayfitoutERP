import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const query = `
      INSERT INTO mr_headers 
      (boq_line_id, department_id, requested_by, required_date, priority, purpose_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const values = [
      Number(body.boq_line_id),
      Number(body.department_id),
      body.requested_by,
      body.required_date,
      body.priority,
      Number(body.purpose_id),
    ];

    await db.query(query, values);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("SQL Error:", err.sqlMessage);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}
