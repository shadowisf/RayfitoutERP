import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { mr_header_id } = body;

    if (!mr_header_id) {
      return NextResponse.json(
        { hasBoqReference: false, hasItemAvailable: false, hasNeedOrder: false },
        { status: 200 },
      );
    }

    // Check if any MR lines under this header have entries in the junction table
    const [rows]: any = await db.query(
      `SELECT COUNT(jt.id) as count
       FROM jt_mr_lines_boq_lines jt
       INNER JOIN mr_lines ml ON jt.mr_line_id = ml.id
       WHERE ml.mr_header_id = ?`,
      [mr_header_id],
    );

    const hasBoqReference = rows[0].count > 0;

    // Check if any MR lines have qs_review_type = 'item_available'
    const [itemAvailableRows]: any = await db.query(
      `SELECT COUNT(*) as count
       FROM mr_lines
       WHERE mr_header_id = ? AND qs_review_type = 'item_available'`,
      [mr_header_id],
    );

    const hasItemAvailable = itemAvailableRows[0].count > 0;

    // Check if any MR lines have qs_review_type = 'need_order'
    const [needOrderRows]: any = await db.query(
      `SELECT COUNT(*) as count
       FROM mr_lines
       WHERE mr_header_id = ? AND qs_review_type = 'need_order'`,
      [mr_header_id],
    );

    const hasNeedOrder = needOrderRows[0].count > 0;

    return NextResponse.json(
      { hasBoqReference, hasItemAvailable, hasNeedOrder },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("Error checking BOQ reference:", err);
    return NextResponse.json(
      { error: err.message, hasBoqReference: false },
      { status: 500 },
    );
  }
}
