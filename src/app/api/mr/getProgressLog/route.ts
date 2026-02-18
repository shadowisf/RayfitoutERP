import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { mr_header_id, lpo_id } = body;

    if (!mr_header_id) {
      return NextResponse.json(
        { error: "mr_header_id is required" },
        { status: 400 },
      );
    }

    let query = "";
    let params: any[] = [];

    if (lpo_id) {
      // LPO-specific: get ALL MR-level stages (shared flow)
      // + LPO-specific stages for this particular LPO
      query = `
        SELECT
          pl.id,
          pl.mr_header_id,
          pl.lpo_id,
          pl.progress_id,
          pl.from_progress_id,
          pl.changed_by,
          pl.changed_at,
          p.value as progress_name,
          fp.value as from_progress_name
        FROM mr_header_progress_log pl
        LEFT JOIN lut_mr_headers_progress p ON pl.progress_id = p.id
        LEFT JOIN lut_mr_headers_progress fp ON pl.from_progress_id = fp.id
        WHERE pl.mr_header_id = ?
          AND (
            pl.lpo_id IS NULL
            OR pl.lpo_id = ?
          )
        ORDER BY pl.changed_at ASC, pl.id ASC
      `;
      params = [mr_header_id, lpo_id];
    } else {
      // MR-level: get all stages without lpo_id (MR-level transitions only)
      query = `
        SELECT
          pl.id,
          pl.mr_header_id,
          pl.lpo_id,
          pl.progress_id,
          pl.from_progress_id,
          pl.changed_by,
          pl.changed_at,
          p.value as progress_name,
          fp.value as from_progress_name
        FROM mr_header_progress_log pl
        LEFT JOIN lut_mr_headers_progress p ON pl.progress_id = p.id
        LEFT JOIN lut_mr_headers_progress fp ON pl.from_progress_id = fp.id
        WHERE pl.mr_header_id = ?
          AND pl.lpo_id IS NULL
        ORDER BY pl.changed_at ASC, pl.id ASC
      `;
      params = [mr_header_id];
    }

    const [progressRows]: any = await db.query(query, params);

    // Fetch MR header creation data - using requested_by and date_requested
    const [headerRows]: any = await db.query(
      `SELECT requested_by, date_requested FROM mr_headers WHERE id = ?`,
      [mr_header_id],
    );

    let result = [...progressRows];

    // If header exists and no progress_id 1 in results, add synthetic entry
    const hasCreatedEntry = result.some((row: any) => row.progress_id === 1);

    if (!hasCreatedEntry && headerRows.length > 0) {
      const header = headerRows[0];

      const createdEntry = {
        id: 0,
        mr_header_id: mr_header_id,
        lpo_id: lpo_id || null,
        progress_id: 1,
        from_progress_id: null,
        changed_by: header.requested_by,
        changed_at: header.date_requested,
        progress_name: "Draft",
        from_progress_name: null,
      };

      result.unshift(createdEntry);
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.error("SQL Error:", err.sqlMessage || err.message);
    return NextResponse.json(
      { error: err.sqlMessage || err.message },
      { status: 500 },
    );
  }
}
