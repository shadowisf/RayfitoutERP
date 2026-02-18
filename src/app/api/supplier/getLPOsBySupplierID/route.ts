import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const supplierId = Number(body.supplier_id);

    if (!supplierId || Number.isNaN(supplierId)) {
      return NextResponse.json(
        { error: "Valid supplier_id is required" },
        { status: 400 },
      );
    }

    const [rows]: any = await db.query(
      `
      SELECT
        l.id AS lpo_id,
        l.mr_header_id,
        l.total AS invoice_amount,
        l.payment_status,
        l.payment_file,
        l.invoice_file,
        l.signed_file,
        l.created_at,
        l.delivery_date,
        l.paid_at,
        mh.id,
        CASE
          WHEN l.payment_status = 'Approved' THEN l.total
          ELSE 0
        END AS total_paid
      FROM lpo l
      LEFT JOIN mr_headers mh ON l.mr_header_id = mh.id
      WHERE l.supplier_id = ?
      ORDER BY l.created_at DESC
      `,
      [supplierId],
    );

    return NextResponse.json(rows || [], { status: 200 });
  } catch (err: any) {
    console.error("SQL Error:", err.sqlMessage || err.message);
    return NextResponse.json(
      { error: err.sqlMessage || err.message },
      { status: 500 },
    );
  }
}
