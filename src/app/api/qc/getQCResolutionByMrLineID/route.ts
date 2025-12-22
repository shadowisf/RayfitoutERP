import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();

  try {
    const { mr_header_id, mr_line_id } = body;

    // Get resolution
    const [resolutions] = await db.query<any[]>(
      `SELECT 
        r.id as resolution_id,
        r.resolution_type
      FROM qc_resolutions r
      WHERE r.mr_header_id = ? AND r.mr_line_id = ?
      LIMIT 1`,
      [mr_header_id, mr_line_id]
    );

    if (resolutions.length === 0) {
      return NextResponse.json({
        success: false,
        message: "No resolution found",
      });
    }

    const resolution = resolutions[0];
    let detailData = {};

    // Get type-specific details
    if (resolution.resolution_type === "Return/refund") {
      const [details] = await db.query<any[]>(
        `SELECT * FROM qc_resolution_return_refund WHERE resolution_id = ?`,
        [resolution.resolution_id]
      );
      if (details.length > 0) detailData = details[0];
    } else if (resolution.resolution_type === "Replace") {
      const [details] = await db.query<any[]>(
        `SELECT * FROM qc_resolution_replace WHERE resolution_id = ?`,
        [resolution.resolution_id]
      );
      if (details.length > 0) detailData = details[0];
    } else if (resolution.resolution_type === "Conditionally accepted") {
      const [details] = await db.query<any[]>(
        `SELECT * FROM qc_resolution_conditionally_accepted WHERE resolution_id = ?`,
        [resolution.resolution_id]
      );
      if (details.length > 0) detailData = details[0];
    } else if (resolution.resolution_type === "Reject/scrap") {
      const [details] = await db.query<any[]>(
        `SELECT * FROM qc_resolution_reject_scrap WHERE resolution_id = ?`,
        [resolution.resolution_id]
      );
      if (details.length > 0) detailData = details[0];
    }

    return NextResponse.json({
      success: true,
      data: {
        ...resolution,
        ...detailData,
      },
    });
  } catch (error: any) {
    console.error("Error fetching resolution:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch resolution",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
