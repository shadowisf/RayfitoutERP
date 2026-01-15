import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const [rows] = await db.query(
      "SELECT * FROM vw_projects WHERE type = 'Signed'"
    );

    return NextResponse.json(rows, { status: 200 });
  } catch (err: any) {
    console.error("SQL Error:", err.sqlMessage);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.action === "createProject") {
      const query = `
      INSERT INTO projects 
      (name, property_type_id, id, size, status, type_of_work, quoted_budget, currency, allocated_budget, start_date, end_date, type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

      const values = [
        body.name,
        Number(body.property_type_id),
        Number(body.id),
        Number(body.size),
        body.status,
        body.type_of_work,
        Number(body.quoted_budget) || 0,
        body.currency,
        Number(body.allocated_budget) || 0,
        body.start_date || null,
        body.end_date || null,
        body.type,
      ];

      const [result]: any = await db.query(query, values);

      if (body.scope_ids && body.scope_ids.length > 0) {
        for (const scopeId of body.scope_ids) {
          await db.query(
            "INSERT INTO jt_projects_scopes (project_id, scope_id) VALUES (?, ?)",
            [Number(result.insertId), Number(scopeId)]
          );
        }
      }

      return NextResponse.json({ id: result.insertId, success: true });
    }
  } catch (err: any) {
    console.error(err.sqlMessage);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const body = await req.json();

  try {
    if (body.action === "updateProject") {
      try {
        // Update project details
        const query = `
          UPDATE projects
          SET
            name = ?,
            property_type_id = ?,
            size = ?,
            status = ?,
            type_of_work = ?,
            quoted_budget = ?,
            currency = ?,
            allocated_budget = ?,
            start_date = ?,
            end_date = ?,
            type = ?
          WHERE id = ?;
        `;

        const values = [
          body.name,
          Number(body.property_type_id),
          Number(body.size),
          body.status,
          body.type_of_work,
          Number(body.quoted_budget) || 0,
          body.currency,
          Number(body.allocated_budget) || 0,
          body.start_date || null,
          body.end_date || null,
          body.type,
          Number(body.id),
        ];

        await db.query(query, values);

        // Update scopes if provided
        if (body.scope_ids !== undefined) {
          // Delete existing scopes
          await db.query(
            "DELETE FROM jt_projects_scopes WHERE project_id = ?",
            [Number(body.id)]
          );

          // Insert new scopes
          if (body.scope_ids && body.scope_ids.length > 0) {
            for (const scopeId of body.scope_ids) {
              await db.query(
                "INSERT INTO jt_projects_scopes (project_id, scope_id) VALUES (?, ?)",
                [Number(body.id), Number(scopeId)]
              );
            }
          }
        }

        return NextResponse.json({ success: true });
      } catch (err) {
        throw err;
      }
    }
  } catch (err: any) {
    console.error(err.sqlMessage);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.action === "deleteProject") {
      const query = "DELETE FROM projects WHERE id = ?";
      await db.query(query, [Number(body.id)]);
      return NextResponse.json({ success: true });
    }
  } catch (err: any) {
    console.error("SQL Error:", err.sqlMessage);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}
