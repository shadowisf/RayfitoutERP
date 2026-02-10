import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Get main MR header data from the view
    const [viewRows]: any = await db.query(
      `SELECT * FROM vw_mr_headers WHERE id = ?`,
      [Number(body.id)],
    );

    if (!viewRows || viewRows.length === 0) {
      return NextResponse.json({ error: "MR not found" }, { status: 404 });
    }

    const result = viewRows[0];

    // Try to get the type column from mr_headers (may not exist if migration not run)
    try {
      const [typeRows]: any = await db.query(
        `SELECT type FROM mr_headers WHERE id = ?`,
        [Number(body.id)],
      );
      if (typeRows && typeRows.length > 0 && typeRows[0].type) {
        result.type = typeRows[0].type;
      }
    } catch {
      // type column doesn't exist yet — default to material
      result.type = result.type || "material";
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.error(err.sqlMessage);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}
