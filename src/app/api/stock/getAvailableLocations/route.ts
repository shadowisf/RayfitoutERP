import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Get unique locations from stocks table
    const [stockLocations]: any = await db.query(`
      SELECT DISTINCT location 
      FROM stocks 
      WHERE location IS NOT NULL 
      ORDER BY location
    `);

    // Get unique to_location from transfers
    const [transferLocations]: any = await db.query(`
      SELECT DISTINCT to_location as location
      FROM stocks_transfer_issue
      WHERE to_location IS NOT NULL
      ORDER BY to_location
    `);

    // Combine and deduplicate locations
    const allLocations = new Set<string>();

    stockLocations.forEach((row: any) => {
      if (row.location) allLocations.add(row.location);
    });

    transferLocations.forEach((row: any) => {
      if (row.location) allLocations.add(row.location);
    });

    // Convert to array and sort
    const locations = Array.from(allLocations).sort();

    return NextResponse.json(
      {
        success: true,
        locations,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Error fetching available locations:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error", success: false },
      { status: 500 }
    );
  }
}
