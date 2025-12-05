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

export async function GET(req: Request) {
  try {
    const [rows]: any = await db.query(`SELECT * FROM vw_mr_headers`);

    return NextResponse.json(rows, { status: 200 });
  } catch (err: any) {
    console.error("SQL Error:", err.sqlMessage);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.action === "getMrHeaders") {
      const [rows]: any = await db.query(
        `SELECT * FROM vw_mr_headers WHERE department_id = ?`,
        [body.department_id]
      );

      return NextResponse.json(rows, { status: 200 });
    }

    if (body.action === "createMrHeader") {
      const calculatedPriority = calculatePriority(body.required_date);

      const headerQuery = `
      INSERT INTO mr_headers 
      (project_id, department_id, requested_by, required_date, priority, purpose_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

      const headerValues = [
        Number(body.project_id) || 0,
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

      return NextResponse.json({
        success: true,
        mrHeaderId: mrHeaderId,
      });
    }

    if (body.action === "createMrLine") {
      const lineQuery = `
  INSERT INTO mr_lines 
  (boq_line_id, mr_header_id, material_category_id, material_subcategory_id, material_description, quantity, unit, notes)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`;

      const lineValues = [
        Number(body.boq_line_id),
        Number(body.mr_header_id),
        Number(body.material_category_id),
        Number(body.material_subcategory_id),
        body.material_description,
        Number(body.quantity),
        body.unit,
        body.notes,
      ];

      await db.query(lineQuery, lineValues);

      return NextResponse.json({
        success: true,
      });
    }

    if (body.action === "submitForInitialApproval") {
      await db.query(`UPDATE mr_headers SET progress_id = 3 WHERE id = ?`, [
        body.id,
      ]);

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "approveItem") {
      await db.query(
        `UPDATE mr_lines SET approval_status = 'Approved' WHERE id = ?`,
        [body.id]
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "clarifyItem") {
      await db.query(
        `UPDATE mr_lines SET approval_status = 'Clarified', normal_comment = ? WHERE id = ?`,
        [body.comment, body.id]
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "rejectItem") {
      await db.query(
        `UPDATE mr_lines SET approval_status = 'Rejected', reject_comment = ? WHERE id = ?`,
        [body.comment, body.id]
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "resetItem") {
      await db.query(
        `UPDATE mr_lines SET approval_status = null, normal_comment = null, reject_comment = null WHERE id = ?`,
        [body.id]
      );

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "submitForResubmission") {
      await db.query(`UPDATE mr_headers SET progress_id = 5 WHERE id = ?`, [
        body.id,
      ]);

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "submitForQuotations") {
      await db.query(`UPDATE mr_headers SET progress_id = 7 WHERE id = ?`, [
        body.id,
      ]);

      return NextResponse.json({ status: 200 });
    }

    if (body.action === "submitForPricingApproval") {
      await db.query(`UPDATE mr_headers SET progress_id = 10 WHERE id = ?`, [
        body.id,
      ]);

      return NextResponse.json({ status: 200 });
    }
  } catch (err: any) {
    console.error(err.sqlMessage);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();

    if (body.action === "updateAll") {
      const query = `
      UPDATE mr_lines 
SET boq_line_id = ?, 
    material_category_id = ?, 
    material_subcategory_id = ?, 
    material_description = ?, 
    quantity = ?, 
    unit = ?, 
    notes = ?,
    approval_status = NULL,
    normal_comment = NULL,
    reject_comment = NULL
WHERE id = ?
    `;

      const values = [
        Number(body.boq_line_id),
        Number(body.material_category_id),
        Number(body.material_subcategory_id),
        body.material_description,
        Number(body.quantity),
        body.unit,
        body.notes,
        Number(body.id),
      ];

      await db.query(query, values);
    }

    if (body.action === "updateSubCategory") {
      const query = `
    UPDATE mr_lines 
    SET material_subcategory_id = ?
    WHERE id IN (?)
  `;

      const values = [Number(body.new_material_subcategory_id), body.item_ids];

      await db.query(query, values);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error(err.sqlMessage);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();

    if (body.action === "deleteItem") {
      const query = "DELETE FROM mr_lines WHERE id = ?";
      await db.query(query, [Number(body.id)]);
    }

    if (body.action === "deleteSubCategory") {
      const query = `
    DELETE FROM mr_lines 
    WHERE id IN (?)
  `;

      const values = [body.item_ids];

      await db.query(query, values);

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error(err.sqlMessage);
    return NextResponse.json({ error: err.sqlMessage }, { status: 500 });
  }
}
