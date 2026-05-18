import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const lpoId = Number(body.lpo_id);

    if (!lpoId || isNaN(lpoId)) {
      return NextResponse.json({ count: 0 }, { status: 200 });
    }

    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS cnt FROM lpo_payments WHERE lpo_id = ?`,
      [lpoId],
    );

    const count = Number((rows as any[])[0]?.cnt ?? 0);

    return NextResponse.json({ count }, { status: 200 });
  } catch (err: any) {
    console.error("getLpoPaymentCount error:", err.message);
    return NextResponse.json({ count: 0 }, { status: 200 });
  }
}
