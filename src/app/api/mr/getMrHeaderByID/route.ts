import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Get main MR header data from the view
    const [viewRows]: any = await db.query(
      `SELECT * FROM vw_mr_headers WHERE id = ?`,
      [Number(body.id)],
    );

    if (!viewRows || viewRows.length === 0) {
      return NextResponse.json({ error: "MR not found" }, { status: 404 });
    }

    const result = viewRows[0];

    // Try to get the type and contract columns from mr_headers
    try {
      const [typeRows]: any = await db.query(
        `SELECT type, jo_contract_file, jo_other_docs_file, payment_jo_reference_id, jo_invoice_file, pr_payment_receipt FROM mr_headers WHERE id = ?`,
        [Number(body.id)],
      );
      if (typeRows && typeRows.length > 0) {
        if (typeRows[0].type) result.type = typeRows[0].type;
        result.jo_contract_file = typeRows[0].jo_contract_file || null;
        result.jo_other_docs_file = typeRows[0].jo_other_docs_file || null;
        result.payment_jo_reference_id = typeRows[0].payment_jo_reference_id || null;
        result.jo_invoice_file = typeRows[0].jo_invoice_file || null;
        result.pr_payment_receipt = typeRows[0].pr_payment_receipt || null;
      }
    } catch {
      // columns don't exist yet — defaults
      result.type = result.type || "material";
      result.jo_contract_file = null;
      result.jo_other_docs_file = null;
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.error(err.sqlMessage);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}
