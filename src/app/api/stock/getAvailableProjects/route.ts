import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";

export async function GET() {
  try {
    const query = `
      SELECT DISTINCT 
        s.project_id as id,
        p.name
      FROM stocks s
      LEFT JOIN projects p ON s.project_id = p.id
      WHERE s.project_id IS NOT NULL
        AND p.name IS NOT NULL
        AND p.name != ''
      ORDER BY p.name ASC
    `;

    const [rows] = await db.query<RowDataPacket[]>(query);

    return NextResponse.json({
      success: true,
      projects: rows.map((p) => ({
        id: p.id,
        name: p.name,
      })),
    });
  } catch (error: any) {
    console.error("Error fetching available projects:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch projects",
      },
      { status: 500 },
    );
  }
}
