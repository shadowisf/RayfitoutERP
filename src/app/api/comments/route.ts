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
        query = `SELECT * FROM mr_comments WHERE mr_header_id = ? AND (lpo_id = ? OR lpo_id IS NULL) ORDER BY created_at ASC`;
        params = [body.mr_header_id, lpoId];
      } else {
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
        mentioned_users,          // { cognito_id: string, department_id: number | null }[]
        mentioned_department_ids, // number[]
      } = body;

      const mentionedCognitoIds = (mentioned_users ?? []).map((u: any) => u.cognito_id);

      await db.query(
        `INSERT INTO mr_comments
          (mr_header_id, lpo_id, author_name, author_department_id, author_department_name, message, stage_name, mentioned_user_cognito_ids)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mr_header_id,
          lpo_id || null,
          author_name,
          author_department_id,
          author_department_name,
          message,
          stage_name,
          mentionedCognitoIds.length > 0 ? JSON.stringify(mentionedCognitoIds) : null,
        ],
      );

      const hasMentions =
        (mentioned_users?.length > 0) || (mentioned_department_ids?.length > 0);

      if (hasMentions) {
        const [mrRows]: any = await db.query(
          `SELECT type, id FROM mr_headers WHERE id = ?`,
          [mr_header_id],
        );
        const mrType = mrRows[0]?.type || "material";
        const prefix =
          mrType === "job" ? "JO" : mrType === "payment" ? "PR" : "MR";
        const formattedId = `${prefix}-${String(mr_header_id).padStart(5, "0")}`;
        const preview =
          message.length > 80 ? message.substring(0, 80) + "..." : message;

        // User-specific notifications (targeted by cognito sub)
        for (const mu of mentioned_users ?? []) {
          if (!mu.department_id) continue;
          await db.query(
            `INSERT INTO notification
              (mr_header_id, lpo_id, department_id, user_cognito_id, header, message)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              mr_header_id,
              lpo_id || null,
              mu.department_id,
              mu.cognito_id,
              `Mentioned in ${formattedId}`,
              `${author_name} mentioned you in a comment on ${formattedId}: "${preview}"`,
            ],
          );
        }

        // Department-wide notifications (no user_cognito_id)
        for (const deptId of mentioned_department_ids ?? []) {
          await db.query(
            `INSERT INTO notification
              (mr_header_id, lpo_id, department_id, header, message)
             VALUES (?, ?, ?, ?, ?)`,
            [
              mr_header_id,
              lpo_id || null,
              deptId,
              `Mentioned in ${formattedId}`,
              `${author_name} mentioned your department in a comment on ${formattedId}: "${preview}"`,
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
