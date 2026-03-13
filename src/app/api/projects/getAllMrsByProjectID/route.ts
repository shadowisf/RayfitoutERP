import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.project_id) {
      return NextResponse.json(
        { error: "Project ID is required" },
        { status: 400 },
      );
    }

    const projectId = Number(body.project_id);

    // Fetch ALL MR headers for the project.
    const mrQuery = `
      SELECT * FROM vw_mr_headers WHERE project_id = ?
    `;
    const [mrRows]: any = await db.query(mrQuery, [projectId]);

    // Separate non-segregated MRs and segregated MRs
    // Exclude rejected MRs (5 = Request Rejected, 11 = Price Rejected, 13 = Payment Rejected)
    const REJECTED_PROGRESS_IDS = [5, 11, 13];
    const nonSegregatedMrs = mrRows.filter(
      (mr: any) =>
        mr.progress_id !== 26 &&
        !REJECTED_PROGRESS_IDS.includes(mr.progress_id),
    );
    const segregatedMrIds = mrRows
      .filter((mr: any) => mr.progress_id === 26)
      .map((mr: any) => mr.id);

    // Build a map of segregated MR id -> MR data for reference
    const segregatedMrMap = new Map<number, any>();
    mrRows
      .filter((mr: any) => mr.progress_id === 26)
      .forEach((mr: any) => {
        segregatedMrMap.set(mr.id, mr);
      });

    // For segregated MRs, fetch all their LPOs with progress info
    // EXCLUDE LPOs with progress_id = 13 (Payment Rejected)
    let lpoEntries: any[] = [];

    if (segregatedMrIds.length > 0) {
      const placeholders = segregatedMrIds.map(() => "?").join(",");
      const lpoQuery = `
        SELECT
          l.id as lpo_id,
          l.mr_header_id,
          l.progress_id,
          l.delivery_date,
          p.value as progress_name
        FROM lpo l
        LEFT JOIN lut_mr_headers_progress p ON l.progress_id = p.id
        WHERE l.mr_header_id IN (${placeholders})
          AND l.progress_id != 13
      `;
      const [lpoRows]: any = await db.query(lpoQuery, segregatedMrIds);

      // Create one entry per LPO, carrying forward parent MR details
      lpoEntries = lpoRows.map((lpo: any) => {
        const parentMr = segregatedMrMap.get(lpo.mr_header_id);
        return {
          ...parentMr,
          lpo_id: lpo.lpo_id,
          lpo_progress_id: lpo.progress_id,
          lpo_progress_name: lpo.progress_name || "Unknown",
          display_progress_name: lpo.progress_name || parentMr?.progress_name,
        };
      });
    }

    // Build result: non-segregated MRs + LPO entries from segregated MRs
    const nonSegregatedEntries = nonSegregatedMrs.map((mr: any) => ({
      ...mr,
      lpo_id: null,
      lpo_progress_id: null,
      lpo_progress_name: null,
      display_progress_name: mr.progress_name,
    }));

    // Additional safety filter: exclude any LPO entries with progress_id 13
    const filteredLpoEntries = lpoEntries.filter(
      (entry) => entry.lpo_progress_id !== 13,
    );

    const enrichedRows = [...nonSegregatedEntries, ...filteredLpoEntries];

    return NextResponse.json(
      {
        success: true,
        count: enrichedRows.length,
        data: enrichedRows,
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error(err.sqlMessage);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}
