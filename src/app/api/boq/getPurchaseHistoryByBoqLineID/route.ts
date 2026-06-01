import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { boq_line_id } = await req.json();

    if (!boq_line_id) {
      return NextResponse.json(
        { error: "boq_line_id is required" },
        { status: 400 },
      );
    }

    // Return one row per lpo_mr_line entry where the mr_line is linked to this
    // BOQ line, the LPO has reached or passed "Awaiting Delivery" (progress_id >= 17),
    // and the MR line has an allocated_qty (only allocated lines are tracked here).
    // QUANTITY = allocated_qty (not the full requested qty).
    // TOTAL_PRICE = allocated_qty × unit_price × (lpo.total / lpo.subtotal)
    //   — i.e. the cost of the allocated portion including VAT/overhead.
    // Rows are ordered chronologically so the frontend can compute a running total.
    const [rows]: any = await db.query(
      `SELECT
         lpo.id                                                          AS lpo_id,
         lpo.mr_header_id,
         COALESCE(pi.material_description, ml.material_description)      AS material_description,
         lpo.created_at                                                  AS lpo_date,
         jmbl.allocated_qty                                             AS quantity,
         ml.unit,
         -- allocated_qty × unit_price × VAT/overhead ratio
         ROUND(
           jmbl.allocated_qty * lml.unit_price * lpo.total / NULLIF(lpo.subtotal, 0),
           2
         )                                                               AS total_price,
         pr.value                                                        AS lpo_status
       FROM jt_mr_lines_boq_lines jmbl
       JOIN mr_lines    ml  ON ml.id         = jmbl.mr_line_id
       JOIN lpo_mr_line lml ON lml.mr_line_id = ml.id
       JOIN lpo             ON lpo.id         = lml.lpo_id
       LEFT JOIN lut_predefined_items    pi ON pi.id = ml.predefined_item_id
       LEFT JOIN lut_mr_headers_progress pr ON pr.id = lpo.progress_id
       WHERE jmbl.boq_line_id = ?
         AND lpo.progress_id >= 17
         AND jmbl.allocated_qty IS NOT NULL
         AND jmbl.allocated_qty > 0
       ORDER BY lpo.created_at ASC`,
      [boq_line_id],
    );

    return NextResponse.json(rows, { status: 200 });
  } catch (err: any) {
    console.error(
      "getPurchaseHistoryByBoqLineID error:",
      err.sqlMessage || err.message,
    );
    return NextResponse.json(
      { error: err.sqlMessage || err.message },
      { status: 500 },
    );
  }
}
