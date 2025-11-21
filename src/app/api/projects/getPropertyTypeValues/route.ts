import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const [res] = await db.query("SELECT * FROM lut_projects_property_type");
    return NextResponse.json(res, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Database query failed" },
      { status: 500 }
    );
  }
}
