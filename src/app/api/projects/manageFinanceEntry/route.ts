import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/*
  CREATE TABLE project_finance_entries (
    id            INT          NOT NULL AUTO_INCREMENT,
    project_id    INT          NOT NULL,
    entry_type    ENUM('revenue','expense') NOT NULL,
    name          VARCHAR(255) NOT NULL,
    amount        DECIMAL(15,2) NOT NULL,
    is_recurring  TINYINT(1)   NOT NULL DEFAULT 0,
    frequency     ENUM('daily','weekly','monthly','quarterly','yearly') NULL,
    start_date    DATE         NULL,
    end_date      DATE         NULL,
    created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_pfe_project (project_id),
    CONSTRAINT fk_pfe_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
*/

// POST  { action:"create", project_id, entry_type, name, amount, is_recurring, frequency?, start_date?, end_date? }
// POST  { action:"update", id, name, amount, is_recurring, frequency?, start_date?, end_date? }
// POST  { action:"delete", id }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.action === "delete") {
      if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });
      await db.query("DELETE FROM project_finance_entries WHERE id = ?", [Number(body.id)]);
      return NextResponse.json({ success: true });
    }

    if (body.action === "update") {
      const { id, name, amount, is_recurring, frequency, start_date, end_date } = body;
      if (!id || !name || amount == null) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }
      await db.query(
        `UPDATE project_finance_entries
         SET name=?, amount=?, is_recurring=?, frequency=?, start_date=?, end_date=?
         WHERE id=?`,
        [
          name,
          Number(amount),
          is_recurring ? 1 : 0,
          frequency ?? null,
          start_date ?? null,
          end_date ?? null,
          Number(id),
        ],
      );
      return NextResponse.json({ success: true });
    }

    // create
    const { project_id, entry_type, name, amount, is_recurring, frequency, start_date, end_date } = body;
    if (!project_id || !entry_type || !name || amount == null) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const [result]: any = await db.query(
      `INSERT INTO project_finance_entries
         (project_id, entry_type, name, amount, is_recurring, frequency, start_date, end_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        Number(project_id),
        entry_type,
        name,
        Number(amount),
        is_recurring ? 1 : 0,
        frequency ?? null,
        start_date ?? null,
        end_date ?? null,
      ],
    );

    return NextResponse.json({ success: true, id: result.insertId });
  } catch (err: any) {
    console.error("manageFinanceEntry error:", err.sqlMessage || err.message);
    return NextResponse.json({ error: err.sqlMessage || err.message }, { status: 500 });
  }
}
