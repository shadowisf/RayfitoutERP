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

    // Fetch ALL MR headers for the project
    const mrQuery = `
      SELECT * FROM vw_mr_headers WHERE project_id = ?
    `;
    const [mrRows]: any = await db.query(mrQuery, [projectId]);

    // Get MR header IDs that are segregated (progress_id = 26)
    const segregatedMrIds = mrRows
      .filter((mr: any) => mr.progress_id === 26)
      .map((mr: any) => mr.id);

    let lpoMap: Map<
      number,
      { lpo_id: number; progress_id: number; progress_name: string }
    > = new Map();

    // If there are segregated MRs, fetch their LPOs with progress info
    if (segregatedMrIds.length > 0) {
      const placeholders = segregatedMrIds.map(() => "?").join(",");
      const lpoQuery = `
        SELECT 
          l.id as lpo_id,
          l.mr_header_id,
          l.progress_id,
          p.value as progress_name
        FROM lpo l
        LEFT JOIN lut_mr_headers_progress p ON l.progress_id = p.id
        WHERE l.mr_header_id IN (${placeholders})
      `;
      const [lpoRows]: any = await db.query(lpoQuery, segregatedMrIds);

      // Create map of mr_header_id -> lpo details
      lpoRows.forEach((lpo: any) => {
        lpoMap.set(lpo.mr_header_id, {
          lpo_id: lpo.lpo_id,
          progress_id: lpo.progress_id,
          progress_name: lpo.progress_name || "Unknown",
        });
      });
    }

    // Merge LPO details into MR data
    const enrichedMrRows = mrRows.map((mr: any) => {
      const lpoDetails = lpoMap.get(mr.id);
      return {
        ...mr,
        lpo_id: lpoDetails?.lpo_id || null,
        lpo_progress_id: lpoDetails?.progress_id || null,
        lpo_progress_name: lpoDetails?.progress_name || null,
        // If LPO exists, use LPO progress name; otherwise keep original MR progress name
        display_progress_name: lpoDetails?.progress_name || mr.progress_name,
      };
    });

    return NextResponse.json(
      {
        success: true,
        count: enrichedMrRows.length,
        data: enrichedMrRows,
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error(err.sqlMessage);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}
