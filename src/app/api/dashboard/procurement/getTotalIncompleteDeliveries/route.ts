import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filter } = body;

    // Validate filter parameter
    if (!filter || typeof filter !== "number" || filter <= 0) {
      return NextResponse.json(
        { error: "Invalid 'filter' parameter. Must be a positive number." },
        { status: 400 }
      );
    }

    const [rows]: any = await db.query(
      `
      SELECT
        SUM(
          CASE 
            WHEN delivery_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
              AND delivery_date < CURDATE()
              AND progress_id != 25
            THEN 1
            ELSE 0
          END
        ) AS this_period,
        SUM(
          CASE 
            WHEN delivery_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
              AND delivery_date < DATE_SUB(CURDATE(), INTERVAL ? DAY)
              AND progress_id != 25
            THEN 1
            ELSE 0
          END
        ) AS last_period
      FROM lpo
    `,
      [filter, filter * 2, filter]
    );

    return NextResponse.json(
      {
        this_week: rows[0].this_period || 0,
        last_week: rows[0].last_period || 0,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error(err.sqlMessage || err.message);
    return NextResponse.json(
      { error: err.sqlMessage || err.message },
      { status: 500 }
    );
  }
}
