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
    const idMatch = query.match(/^(?:MR|JO|LPO|BOQ|PRJ)-?(\d+)$/i);
    const numericId = idMatch ? parseInt(idMatch[1], 10) : null;

    // Also try parsing as a plain number
    const plainNumber = /^\d+$/.test(query) ? parseInt(query, 10) : null;

    // 1. Search Material Requests
    const [mrRows]: any = await db.query(
      `SELECT
        id,
        CASE WHEN type = 'job' THEN CONCAT('JO-', LPAD(id, 5, '0')) ELSE CONCAT('MR-', LPAD(id, 5, '0')) END as display_id,
        type,
        project_name,
        department_name,
        requested_by,
        progress_name,
        date_requested
      FROM vw_mr_headers
      WHERE
        CONCAT(CASE WHEN type = 'job' THEN 'JO-' ELSE 'MR-' END, LPAD(id, 5, '0')) LIKE ?
        OR project_name LIKE ?
        OR department_name LIKE ?
        OR requested_by LIKE ?
        OR id = ?
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

    // 2. Search LPOs
    const [lpoRows]: any = await db.query(
      `SELECT
        l.id,
        CONCAT('LPO-', LPAD(l.id, 5, '0')) as display_id,
        l.mr_header_id,
        CONCAT('MR-', LPAD(l.mr_header_id, 5, '0')) as mr_display_id,
        l.total,
        l.created_at,
        s.name as supplier_name,
        p.name as project_name
      FROM lpo l
      JOIN suppliers s ON l.supplier_id = s.id
      JOIN mr_headers mh ON l.mr_header_id = mh.id
      LEFT JOIN projects p ON mh.project_id = p.id
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

    // 4. Search Projects
    const [projectRows]: any = await db.query(
      `SELECT
        id,
        CONCAT('PRJ-', LPAD(id, 5, '0')) as display_id,
        name,
        status,
        type_of_work,
        type,
        currency,
        quoted_budget
      FROM vw_projects
      WHERE
        CONCAT('PRJ-', LPAD(id, 5, '0')) LIKE ?
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
