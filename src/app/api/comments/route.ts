import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.action === "getDepartments") {
      const [rows]: any = await db.query(
        `SELECT id, value FROM lut_mr_headers_departments ORDER BY value ASC`,
      );
      return NextResponse.json(rows);
    }

    if (body.action === "getComments") {
      const lpoId = body.lpo_id || null;
      let query: string;
      let params: any[];

      if (lpoId) {
        // LPO-specific comments + pre-segregation comments (lpo_id IS NULL)
        query = `SELECT * FROM mr_comments WHERE mr_header_id = ? AND (lpo_id = ? OR lpo_id IS NULL) ORDER BY created_at ASC`;
        params = [body.mr_header_id, lpoId];
      } else {
        // MR-level comments only (no lpo_id)
        query = `SELECT * FROM mr_comments WHERE mr_header_id = ? AND lpo_id IS NULL ORDER BY created_at ASC`;
        params = [body.mr_header_id];
      }

      const [rows]: any = await db.query(query, params);
      return NextResponse.json(rows);
    }

    if (body.action === "addComment") {
      const {
        mr_header_id,
        lpo_id,
        author_name,
        author_department_id,
        author_department_name,
        message,
        stage_name,
        mentioned_department_ids,
      } = body;

      // Insert the comment
      await db.query(
        `INSERT INTO mr_comments (mr_header_id, lpo_id, author_name, author_department_id, author_department_name, message, stage_name) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          mr_header_id,
          lpo_id || null,
          author_name,
          author_department_id,
          author_department_name,
          message,
          stage_name,
        ],
      );

      // Create notifications for mentioned departments
      if (mentioned_department_ids && mentioned_department_ids.length > 0) {
        // Get display_id for notification message
        const [mrRows]: any = await db.query(
          `SELECT type, id FROM mr_headers WHERE id = ?`,
          [mr_header_id],
        );
        const mrType = mrRows[0]?.type || "material";
        const prefix =
          mrType === "job" ? "JO" : mrType === "payment" ? "PR" : "MR";
        const formattedId = `${prefix}-${String(mr_header_id).padStart(5, "0")}`;

        for (const deptId of mentioned_department_ids) {
          await db.query(
            `INSERT INTO notification (mr_header_id, department_id, header, message) VALUES (?, ?, ?, ?)`,
            [
              mr_header_id,
              deptId,
              `Mentioned in ${formattedId}`,
              `${author_name} mentioned your department in a comment on ${formattedId}: "${message.length > 80 ? message.substring(0, 80) + "..." : message}"`,
            ],
          );
        }
      }

      return NextResponse.json({ status: 200 });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Comments API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
