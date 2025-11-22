import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const [rows] = await db.query("SELECT * FROM vw_projects");

    return NextResponse.json(rows, { status: 200 });
  } catch (err: any) {
    console.error("SQL Error:", err.sqlMessage || err.message);
    return NextResponse.json(
      { error: err.sqlMessage || err.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const query = `
      INSERT INTO projects 
      (name, property_type_id, id, status, type_of_work, quoted_budget, allocated_budget, start_date, end_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      body.name,
      Number(body.property_type_id),
      Number(body.id),
      body.status,
      body.type_of_work,
      Number(body.quoted_budget) || 0,
      Number(body.allocated_budget) || 0,
      body.start_date || null,
      body.end_date || null,
    ];

    const [result]: any = await db.query(query, values);

    // Insert scopes using a loop (simpler and works)
    if (body.scope_ids && body.scope_ids.length > 0) {
      for (const scopeId of body.scope_ids) {
        await db.query(
          "INSERT INTO jt_projects_scopes (project_id, scope_id) VALUES (?, ?)",
          [Number(result.insertId), Number(scopeId)]
        );
      }
    }

    return NextResponse.json({ success: true, id: result.insertId });
  } catch (err: any) {
    console.error("SQL Error:", err.sqlMessage || err.message);
    return NextResponse.json(
      { error: err.sqlMessage || err.message },
      { status: 500 }
    );
  }
}
