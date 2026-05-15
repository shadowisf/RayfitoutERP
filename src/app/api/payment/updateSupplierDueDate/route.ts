import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { supplier_id, due_date } = await request.json();

    if (!supplier_id) {
      return NextResponse.json(
        { error: "supplier_id is required" },
        { status: 400 },
      );
    }

    await db.query(`UPDATE suppliers SET due_date = ? WHERE id = ?`, [
      due_date || null,
      Number(supplier_id),
    ]);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("updateSupplierDueDate error:", err.sqlMessage || err.message);
    return NextResponse.json(
      { error: err.sqlMessage || err.message },
      { status: 500 },
    );
  }
}
