import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type EntityType = "supplier" | "subcontractor";

function parseFiles(value: any): string[] {
  if (!value) return [];
  try {
    const parsed =
      typeof value === "string" && value.trim().length > 0
        ? JSON.parse(value)
        : value;

    if (Array.isArray(parsed)) return parsed.filter(Boolean);
    if (typeof parsed === "string" && parsed.trim().length > 0) {
      return [parsed.trim()];
    }
    return [];
  } catch {
    if (typeof value === "string" && value.trim().length > 0) {
      return [value.trim()];
    }
    return [];
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const entity = (body.entity || "").toLowerCase() as EntityType;
    const id = Number(body.id);

    if (!entity || !["supplier", "subcontractor"].includes(entity)) {
      return NextResponse.json(
        { success: false, error: "Invalid entity type" },
        { status: 400 },
      );
    }

    if (!id || Number.isNaN(id)) {
      return NextResponse.json(
        { success: false, error: "Valid id is required" },
        { status: 400 },
      );
    }

    if (entity === "supplier") {
      // Supplier basic info
      const [supplierRows]: any = await db.query(
        `SELECT id, name, type FROM suppliers WHERE id = ? LIMIT 1`,
        [id],
      );
      const supplier = supplierRows && supplierRows[0] ? supplierRows[0] : null;

      // LPOs awaiting payment receipt
      const [lpoRows]: any = await db.query(
        `
        SELECT
          l.id AS lpo_id,
          l.mr_header_id,
          l.total AS total_amount,
          l.delivery_date,
          l.invoice_file,
          l.signed_file,
          l.payment_file,
          l.payment_status,
          CASE WHEN g.id IS NULL THEN 0 ELSE 1 END AS has_grn
        FROM lpo l
        LEFT JOIN grn g ON g.lpo_id = l.id
        WHERE l.supplier_id = ?
          AND l.progress_id >= 14
          AND (l.payment_status != 'Approved' OR l.payment_status IS NULL)
        ORDER BY l.delivery_date ASC, l.id ASC
      `,
        [id],
      );

      const lpos = (lpoRows || []).map((row: any) => ({
        lpo_id: Number(row.lpo_id),
        mr_header_id: row.mr_header_id ? Number(row.mr_header_id) : null,
        total_amount: Number(row.total_amount) || 0,
        delivery_date: row.delivery_date,
        invoice_files: parseFiles(row.invoice_file),
        signed_lpo_files: parseFiles(row.signed_file),
        payment_receipts: parseFiles(row.payment_file),
        payment_status: row.payment_status || null,
        has_grn: !!row.has_grn,
      }));

      return NextResponse.json(
        {
          success: true,
          entity: "supplier",
          id,
          name: supplier?.name || "",
          type: supplier?.type || "",
          lpos,
        },
        { status: 200 },
      );
    }

    if (entity === "subcontractor") {
      // Subcontractor basic info
      const [subRows]: any = await db.query(
        `SELECT id, name FROM subcontractors WHERE id = ? LIMIT 1`,
        [id],
      );
      const subcontractor = subRows && subRows[0] ? subRows[0] : null;

      // Job orders requiring payment receipt
      const [joRows]: any = await db.query(
        `
        SELECT
          mh.id AS jo_id,
          mh.project_id,
          mh.required_date AS due_date,
          mh.jo_invoice_file,
          mh.jo_payment_receipt,
          SUM(sq.total_price) AS total_amount
        FROM subcontractors sc
        JOIN jo_line_subcontractor_quotation sq ON sc.id = sq.subcontractor_id
        JOIN jo_lines jl ON sq.jo_line_id = jl.id
        JOIN mr_headers mh ON jl.mr_header_id = mh.id
        WHERE sc.id = ?
          AND sq.approval_status = 'Approved'
          AND mh.progress_id = 25
          AND mh.jo_invoice_file IS NOT NULL
          AND mh.jo_invoice_file != ''
          AND mh.jo_invoice_file != '[]'
          AND (mh.jo_payment_receipt IS NULL OR mh.jo_payment_receipt = '' OR mh.jo_payment_receipt = '[]')
        GROUP BY mh.id, mh.project_id, mh.required_date, mh.jo_invoice_file, mh.jo_payment_receipt
        ORDER BY mh.required_date ASC, mh.id ASC
      `,
        [id],
      );

      const jobOrders = (joRows || []).map((row: any) => ({
        jo_id: Number(row.jo_id),
        project_id: row.project_id ? Number(row.project_id) : null,
        total_amount: Number(row.total_amount) || 0,
        due_date: row.due_date,
        invoice_files: parseFiles(row.jo_invoice_file),
        payment_receipts: parseFiles(row.jo_payment_receipt),
      }));

      return NextResponse.json(
        {
          success: true,
          entity: "subcontractor",
          id,
          name: subcontractor?.name || "",
          jobOrders,
        },
        { status: 200 },
      );
    }

    return NextResponse.json(
      { success: false, error: "Unsupported entity type" },
      { status: 400 },
    );
  } catch (err: any) {
    console.error("SQL Error:", err.sqlMessage || err.message);
    return NextResponse.json(
      { success: false, error: err.sqlMessage || err.message },
      { status: 500 },
    );
  }
}
