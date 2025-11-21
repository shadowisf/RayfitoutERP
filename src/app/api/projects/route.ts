import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const [res] = await db.query("SELECT * FROM vw_projects");
    return NextResponse.json(res, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Database query failed" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const query = `
      INSERT INTO projects 
      (name, property_type_id, id, status, scope_id, type, quoted_budget, allocated_budget, start_date, end_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      body.name,
      Number(body.property_type_id),
      Number(body.id),
      body.status,
      Number(body.scope_id),
      body.type,
      Number(body.quoted_budget),
      Number(body.allocated_budget),
      body.start_date || null,
      body.end_date || null,
    ];

    const [result]: any = await db.query(query, values);

    return NextResponse.json({ success: true, id: result.insertId });
  } catch (err: any) {
    console.error("POST /api/projects ERROR:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
