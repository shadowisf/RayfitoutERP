import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim();

    if (!query || query.length < 1) {
      return NextResponse.json({ results: [] }, { status: 200 });
    }

    const searchTerm = `%${query}%`;

    // Extract numeric ID from patterns like MR-00001, LPO-00012, BOQ-00003
    const idMatch = query.match(/^(?:MR|JO|LPO|BOQ|RAY|DN)-?(\d+)$/i);
    const numericId = idMatch ? parseInt(idMatch[1], 10) : null;

    // Also try parsing as a plain number
    const plainNumber = /^\d+$/.test(query) ? parseInt(query, 10) : null;

    // 1. Search Material Requests (only progress_id <= 12)
    const [mrRows]: any = await db.query(
      `SELECT
        id,
        CASE WHEN type = 'job' THEN CONCAT('JO-', LPAD(id, 5, '0')) ELSE CONCAT('MR-', LPAD(id, 5, '0')) END as display_id,
        type,
        project_name,
        department_name,
        requested_by,
        progress_name,
        progress_id,
        date_requested,
        required_date
      FROM vw_mr_headers
      WHERE
        progress_id <= 12
        AND (
          CONCAT(CASE WHEN type = 'job' THEN 'JO-' ELSE 'MR-' END, LPAD(id, 5, '0')) LIKE ?
          OR project_name LIKE ?
          OR department_name LIKE ?
          OR requested_by LIKE ?
          OR id = ?
        )
      ORDER BY date_requested DESC
      LIMIT 5`,
      [
        searchTerm,
        searchTerm,
        searchTerm,
        searchTerm,
        numericId || plainNumber || -1,
      ],
    );

    // 2. Search LPOs (with extra fields for cards)
    const [lpoRows]: any = await db.query(
      `SELECT
        l.id,
        CONCAT('LPO-', LPAD(l.id, 5, '0')) as display_id,
        l.mr_header_id,
        CONCAT('MR-', LPAD(l.mr_header_id, 5, '0')) as mr_display_id,
        l.total,
        l.progress_id,
        l.delivery_date,
        l.created_at,
        s.name as supplier_name,
        p.name as project_name,
        mh.requested_by,
        d.value as department_name
      FROM lpo l
      JOIN suppliers s ON l.supplier_id = s.id
      JOIN mr_headers mh ON l.mr_header_id = mh.id
      LEFT JOIN projects p ON mh.project_id = p.id
      LEFT JOIN lut_mr_headers_departments d ON mh.department_id = d.id
      WHERE
        CONCAT('LPO-', LPAD(l.id, 5, '0')) LIKE ?
        OR s.name LIKE ?
        OR p.name LIKE ?
        OR l.id = ?
      ORDER BY l.created_at DESC
      LIMIT 5`,
      [searchTerm, searchTerm, searchTerm, numericId || plainNumber || -1],
    );

    // 3. Search BOQs
    const [boqRows]: any = await db.query(
      `SELECT
        id,
        CONCAT('BOQ-', LPAD(id, 5, '0')) as display_id,
        name,
        location,
        boq_date,
        project_name,
        client_name,
        total_value
      FROM vw_boq_headers
      WHERE
        CONCAT('BOQ-', LPAD(id, 5, '0')) LIKE ?
        OR name LIKE ?
        OR project_name LIKE ?
        OR client_name LIKE ?
        OR id = ?
      LIMIT 5`,
      [
        searchTerm,
        searchTerm,
        searchTerm,
        searchTerm,
        numericId || plainNumber || -1,
      ],
    );

    // 4. Search Projects (use name as display)
    const [projectRows]: any = await db.query(
      `SELECT
        id,
        CONCAT('RAY-', LPAD(id, 5, '0')) as display_id,
        name,
        status,
        type_of_work,
        type,
        currency,
        quoted_budget
      FROM vw_projects
      WHERE
        CONCAT('RAY-', LPAD(id, 5, '0')) LIKE ?
        OR name LIKE ?
        OR type_of_work LIKE ?
        OR status LIKE ?
        OR id = ?
      ORDER BY created_at DESC
      LIMIT 5`,
      [
        searchTerm,
        searchTerm,
        searchTerm,
        searchTerm,
        numericId || plainNumber || -1,
      ],
    );

    // 5. Search Inventory Items
    const [inventoryRows]: any = await db.query(
      `SELECT
        id,
        CONCAT('INV-', LPAD(id, 5, '0')) as display_id,
        description,
        category_name,
        subcategory_name,
        unit,
        brand,
        type,
        specification,
        country_of_origin,
        image
      FROM vw_inventory
      WHERE
        is_archived = 0
        AND (
          description LIKE ?
          OR category_name LIKE ?
          OR subcategory_name LIKE ?
          OR brand LIKE ?
          OR id = ?
        )
      ORDER BY created_at DESC
      LIMIT 5`,
      [
        searchTerm,
        searchTerm,
        searchTerm,
        searchTerm,
        numericId || plainNumber || -1,
      ],
    );

    // 6. Search Documents/PDFs - LPOs that have invoice_file, payment_file, or signed LPO files
    const [documentRows]: any = await db.query(
      `SELECT
        l.id as lpo_id,
        l.mr_header_id,
        CONCAT('LPO-', LPAD(l.id, 5, '0')) as display_id,
        s.name as supplier_name,
        p.name as project_name,
        l.invoice_file,
        l.payment_file,
        l.signed_file
      FROM lpo l
      JOIN suppliers s ON l.supplier_id = s.id
      JOIN mr_headers mh ON l.mr_header_id = mh.id
      LEFT JOIN projects p ON mh.project_id = p.id
      WHERE
        l.progress_id >= 14
        AND (l.invoice_file IS NOT NULL OR l.payment_file IS NOT NULL OR l.signed_file IS NOT NULL)
        AND (
          CONCAT('LPO-', LPAD(l.id, 5, '0')) LIKE ?
          OR s.name LIKE ?
          OR p.name LIKE ?
          OR l.id = ?
        )
      ORDER BY l.created_at DESC
      LIMIT 10`,
      [searchTerm, searchTerm, searchTerm, numericId || plainNumber || -1],
    );

    // 7. Search Signed Delivery Notes from stocks_transfer_issue
    const [dnRows]: any = await db.query(
      `SELECT
        sti.id,
        CONCAT('DN-', LPAD(sti.id, 5, '0')) as display_id,
        sti.signed_tsc_file,
        sti.transferee,
        sti.receiver_name,
        p.name as project_name,
        sti.created_on
      FROM stocks_transfer_issue sti
      LEFT JOIN projects p ON sti.project_id = p.id
      WHERE
        sti.signed_tsc_file IS NOT NULL
        AND sti.signed_tsc_file != 'null'
        AND sti.signed_tsc_file != '[]'
        AND (
          CONCAT('DN-', LPAD(sti.id, 5, '0')) LIKE ?
          OR sti.transferee LIKE ?
          OR sti.receiver_name LIKE ?
          OR p.name LIKE ?
          OR sti.id = ?
        )
      ORDER BY sti.created_on DESC
      LIMIT 5`,
      [searchTerm, searchTerm, searchTerm, searchTerm, numericId || plainNumber || -1],
    );

    // Parse document rows into individual document entries
    const parseFiles = (val: any): string[] => {
      if (!val) return [];
      if (Array.isArray(val)) return val.filter(Boolean);
      try {
        const parsed = JSON.parse(val);
        return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
      } catch {
        return val ? [val] : [];
      }
    };

    const documents: any[] = [];
    for (const doc of documentRows) {
      const lpoId = String(doc.lpo_id).padStart(5, "0");
      const invoices = parseFiles(doc.invoice_file);
      const receipts = parseFiles(doc.payment_file);
      const signedFiles = parseFiles(doc.signed_file);

      for (const file of invoices) {
        documents.push({
          id: `inv-${doc.lpo_id}-${file}`,
          lpo_id: doc.lpo_id,
          mr_header_id: doc.mr_header_id,
          display_id: doc.display_id,
          supplier_name: doc.supplier_name,
          project_name: doc.project_name,
          doc_type: "INVOICE",
          display_name: `INV-${lpoId}`,
          file_name: file,
          icon: "search-inv",
          category: "DOCUMENT",
          url: `/mr/${doc.mr_header_id}/lpo/${doc.lpo_id}`,
        });
      }

      for (const file of receipts) {
        documents.push({
          id: `pay-${doc.lpo_id}-${file}`,
          lpo_id: doc.lpo_id,
          mr_header_id: doc.mr_header_id,
          display_id: doc.display_id,
          supplier_name: doc.supplier_name,
          project_name: doc.project_name,
          doc_type: "PAYMENT RECEIPT",
          display_name: `PR-${lpoId}`,
          file_name: file,
          icon: "search-pr",
          category: "DOCUMENT",
          url: `/mr/${doc.mr_header_id}/lpo/${doc.lpo_id}`,
        });
      }

      for (const file of signedFiles) {
        documents.push({
          id: `lpo-${doc.lpo_id}-${file}`,
          lpo_id: doc.lpo_id,
          mr_header_id: doc.mr_header_id,
          display_id: doc.display_id,
          supplier_name: doc.supplier_name,
          project_name: doc.project_name,
          doc_type: "SIGNED LPO",
          display_name: `LPO-${lpoId}`,
          file_name: file,
          icon: "search-lpo",
          category: "DOCUMENT",
          url: `/mr/${doc.mr_header_id}/lpo/${doc.lpo_id}`,
        });
      }
    }

    // Add delivery notes to documents
    for (const dn of dnRows) {
      const dnId = String(dn.id).padStart(5, "0");
      const dnFiles = parseFiles(dn.signed_tsc_file);

      for (const file of dnFiles) {
        documents.push({
          id: `dn-${dn.id}-${file}`,
          lpo_id: null,
          mr_header_id: null,
          display_id: null,
          supplier_name: dn.transferee,
          project_name: dn.project_name,
          doc_type: "DELIVERY NOTE",
          display_name: `DN-${dnId}`,
          file_name: file,
          icon: "search-dn",
          category: "DOCUMENT",
          url: file,
        });
      }
    }

    return NextResponse.json({
      results: {
        materialRequests: mrRows.map((row: any) => ({
          ...row,
          category: "MATERIAL REQUEST",
          url: `/mr/${row.id}`,
        })),
        lpos: lpoRows.map((row: any) => ({
          ...row,
          category: "LPO",
          url: `/mr/${row.mr_header_id}/lpo/${row.id}`,
        })),
        boqs: boqRows.map((row: any) => ({
          ...row,
          category: "BOQ",
          url: `/boq/${row.id}`,
        })),
        projects: projectRows.map((row: any) => ({
          ...row,
          category: "PROJECT",
          url: `/project/${row.id}`,
        })),
        inventory: inventoryRows.map((row: any) => ({
          ...row,
          category: "INVENTORY",
          url: `/inventory/${row.id}`,
        })),
        documents: documents.slice(0, 15),
      },
      query,
    });
  } catch (err: any) {
    console.error("Search Error:", err.sqlMessage || err.message);
    return NextResponse.json(
      { error: err.sqlMessage || "Search failed" },
      { status: 500 },
    );
  }
}
