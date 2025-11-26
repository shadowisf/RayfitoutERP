import { NextResponse } from "next/server";
import { ResultSetHeader } from "mysql2";
import { db } from "@/lib/db";

function calculatePriority(requiredDate: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const required = new Date(requiredDate);
  required.setHours(0, 0, 0, 0);

  const diffTime = required.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 1) {
    return "Critical";
  } else if (diffDays <= 3) {
    return "High";
  } else if (diffDays <= 7) {
    return "Medium";
  } else {
    return "Normal";
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const calculatedPriority = calculatePriority(body.required_date);

    const headerQuery = `
      INSERT INTO mr_headers 
      (department_id, requested_by, required_date, priority, purpose_id)
      VALUES (?, ?, ?, ?, ?)
    `;

    const headerValues = [
      Number(body.department_id),
      body.requested_by,
      body.required_date,
      calculatedPriority,
      Number(body.purpose_id),
    ];

    const [headerResult] = await db.query<ResultSetHeader>(
      headerQuery,
      headerValues
    );
    const mrHeaderId = headerResult.insertId;

    const boqLineIds = Array.isArray(body.boq_line_id)
      ? body.boq_line_id
      : [body.boq_line_id];

    const junctionValues = boqLineIds.map((boqLineId: number) => [
      mrHeaderId,
      Number(boqLineId),
    ]);

    const junctionQuery = `
      INSERT INTO jt_mr_headers_boq_lines 
      (mr_header_id, boq_line_id)
      VALUES ?
    `;

    await db.query<ResultSetHeader>(junctionQuery, [junctionValues]);

    return NextResponse.json({
      success: true,
      mrHeaderId: mrHeaderId,
      boqLinesLinked: boqLineIds.length,
      priority: calculatedPriority,
    });
  } catch (err: any) {
    console.error("SQL Error:", err.sqlMessage);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}
