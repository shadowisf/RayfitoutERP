import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const subcontractorId = Number(body.subcontractor_id);

    if (!subcontractorId || Number.isNaN(subcontractorId)) {
      return NextResponse.json(
        { error: "Valid subcontractor_id is required" },
        { status: 400 },
      );
    }

    const [rows]: any = await db.query(
      `
      SELECT
        mh.id AS jo_id,
        mh.required_date AS due_date,
        mh.jo_invoice_file,
        mh.jo_payment_receipt,
        mh.jo_paid_at,
        SUM(sq.total_price) AS invoice_amount,
        CASE
          WHEN mh.jo_payment_receipt IS NOT NULL
            AND mh.jo_payment_receipt != ''
            AND mh.jo_payment_receipt != '[]'
          THEN SUM(sq.total_price)
          ELSE 0
        END AS total_paid
      FROM jo_line_subcontractor_quotation sq
      JOIN jo_lines jl ON sq.jo_line_id = jl.id
      JOIN mr_headers mh ON jl.mr_header_id = mh.id
      WHERE sq.subcontractor_id = ?
        AND sq.approval_status = 'Approved'
      GROUP BY mh.id, mh.required_date, mh.jo_invoice_file, mh.jo_payment_receipt
      ORDER BY mh.required_date DESC
      `,
      [subcontractorId],
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
