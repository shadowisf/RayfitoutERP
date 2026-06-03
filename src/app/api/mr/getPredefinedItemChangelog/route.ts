import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const itemId = req.nextUrl.searchParams.get("predefined_item_id");
    if (!itemId) {
      return NextResponse.json({ error: "Missing predefined_item_id" }, { status: 400 });
    }

    const [rows] = await db.query(
      `SELECT id, predefined_item_id, action, old_value, new_value, changed_by, changed_at
       FROM lut_predefined_item_changelog
       WHERE predefined_item_id = ?
       ORDER BY changed_at DESC
       LIMIT 50`,
      [Number(itemId)],
    );

    return NextResponse.json(rows, { status: 200 });
  } catch (err: any) {
    console.error(err.sqlMessage ?? err);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { predefined_item_id, action, old_value, new_value, changed_by } = body;

    if (!predefined_item_id || !action) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await db.query(
      `INSERT INTO lut_predefined_item_changelog
         (predefined_item_id, action, old_value, new_value, changed_by)
       VALUES (?, ?, ?, ?, ?)`,
      [
        Number(predefined_item_id),
        action,
        old_value ?? null,
        new_value ?? null,
        changed_by ?? null,
      ],
    );

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err: any) {
    console.error(err.sqlMessage ?? err);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}
