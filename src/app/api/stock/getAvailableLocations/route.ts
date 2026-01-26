import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    // Get locations from stocks table
    const [stockLocations]: any = await db.query(`
      SELECT DISTINCT location 
      FROM stocks 
      WHERE location IS NOT NULL AND location != ''
    `);

    // Get from_location and to_location from stocks_transfer_issue table
    const [transferLocations]: any = await db.query(`
      SELECT DISTINCT from_location AS location 
      FROM stocks_transfer_issue 
      WHERE from_location IS NOT NULL AND from_location != ''
      UNION
      SELECT DISTINCT to_location AS location 
      FROM stocks_transfer_issue 
      WHERE to_location IS NOT NULL AND to_location != ''
    `);

    // Combine and deduplicate locations
    const allLocations = [
      ...stockLocations.map((row: any) => row.location),
      ...transferLocations.map((row: any) => row.location),
    ];

    // Remove duplicates and sort
    const uniqueLocations = Array.from(new Set(allLocations)).sort();

    return NextResponse.json({
      success: true,
      locations: uniqueLocations,
    });
  } catch (error: any) {
    console.error("Error fetching locations:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch locations",
      },
      { status: 500 },
    );
  }
}
