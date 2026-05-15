import { db } from "@/lib/db";
import { NextResponse } from "next/server";

// ── Ensure the activity log table exists ─────────────────────────────────────
async function ensureTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS mr_line_activity_log (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      mr_header_id INT NOT NULL,
      mr_line_id  INT NULL,
      activity_type VARCHAR(100) NOT NULL,
      handled_by  VARCHAR(255),
      stage_name  VARCHAR(255),
      old_value   TEXT,
      new_value   TEXT,
      created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_mr_line_activity_log_header (mr_header_id)
    )
  `);
}

// ── Header log → activity label ───────────────────────────────────────────────
function getActivityLabel(progressId: number, isRollback: boolean): string {
  if (isRollback) return "STAGE ROLLED BACK";
  const map: Record<number, string> = {
    1:  "REQUEST CREATED",
    2:  "SUBMITTED FOR QS REVIEW",
    3:  "SUBMITTED FOR APPROVAL",
    4:  "STOCK TRANSFER",
    5:  "REQUEST REJECTED",
    7:  "SUBMITTED FOR QUOTATIONS",
    9:  "QS PRICE CHECK",
    10: "SUBMITTED FOR MANAGER PRICE APPROVAL",
    11: "PRICE REJECTED",
    12: "VENDOR APPROVED",
    13: "PAYMENT REJECTED",
    14: "INVOICE PAID",
    17: "MATERIAL RECEIVED",
    21: "SUBMITTED FOR QC",
    23: "FAILED QC",
    24: "ADD TO STOCK",
    25: "COMPLETED",
    26: "SUBMITTED FOR SEGREGATION",
  };
  return map[progressId] ?? `STAGE ${progressId}`;
}

// ── Header progress_id → stage label ─────────────────────────────────────────
function getStageFromProgressId(progressId: number): string {
  const map: Record<number, string> = {
    1:  "DRAFT",
    2:  "QS REVIEW",
    3:  "MANAGER APPROVAL",
    4:  "STOCK TRANSFER",
    5:  "REQUEST REJECTED",
    7:  "QUOTATIONS",
    9:  "QS PRICE CHECK",
    10: "MANAGER PRICE APPROVAL",
    11: "PRICE REJECTED",
    12: "LPO & INVOICE",
    13: "PAYMENT REJECTED",
    14: "PAYMENT",
    17: "AWAITING DELIVERY",
    21: "QC CHECK",
    23: "FAILED QC",
    24: "STOCK ENTRY",
    25: "COMPLETED",
    26: "SEGREGATION",
  };
  return map[progressId] ?? "—";
}

// ── Strip unnecessary decimal zeros from numeric strings ─────────────────────
function formatLogValue(val: string): string {
  if (val && /^\d+(\.\d+)?$/.test(val.trim())) {
    const num = parseFloat(val);
    return String(num);
  }
  return val;
}

// ── Line activity_type → display label ────────────────────────────────────────
const LINE_ACTIVITY_LABELS: Record<string, string> = {
  LINE_ADDED:        "LINE ADDED",
  LINE_DELETED:      "LINE DELETED",
  MATERIAL_CHANGED:  "CHANGED MATERIAL",
  QTY_EDITED:        "EDITED QTY",
  BRAND_SPEC_EDITED: "EDITED BRAND/SPEC",
  LINE_EDITED:       "LINE EDITED",
  VENDOR_CHANGED:    "VENDOR CHANGED",
};

export async function POST(req: Request) {
  try {
    await ensureTable();

    const body = await req.json();
    const { mr_header_id, lpo_id } = body;

    if (!mr_header_id) {
      return NextResponse.json([], { status: 200 });
    }

    // ── 1. MR header creation data ────────────────────────────────────────────
    const [headerMeta]: any = await db.query(
      `SELECT requested_by, date_requested, type FROM mr_headers WHERE id = ?`,
      [mr_header_id],
    );

    const isPaymentRequest = headerMeta[0]?.type === "payment";

    // ── 2. Header-level progress log ──────────────────────────────────────────
    // When lpo_id is provided: include all MR-level entries (lpo_id IS NULL)
    // + entries specific to this LPO — same logic as getProgressLog
    let headerRows: any[];
    if (lpo_id) {
      const [rows]: any = await db.query(
        `SELECT id, progress_id, from_progress_id, changed_by, changed_at, is_rollback
         FROM mr_header_progress_log
         WHERE mr_header_id = ?
           AND (lpo_id IS NULL OR lpo_id = ?)
         ORDER BY changed_at ASC, id ASC`,
        [mr_header_id, lpo_id],
      );
      headerRows = rows;
    } else {
      const [rows]: any = await db.query(
        `SELECT id, progress_id, from_progress_id, changed_by, changed_at, is_rollback
         FROM mr_header_progress_log
         WHERE mr_header_id = ?
         ORDER BY changed_at ASC, id ASC`,
        [mr_header_id],
      );
      headerRows = rows;
    }

    // ── 3. Line-level activity log ────────────────────────────────────────────
    const [lineRows]: any = await db.query(
      `SELECT * FROM mr_line_activity_log
       WHERE mr_header_id = ?
       ORDER BY created_at ASC, id ASC`,
      [mr_header_id],
    );

    // ── 4. Build combined list ────────────────────────────────────────────────
    const combined: any[] = [];

    // Synthetic REQUEST CREATED entry if no real progress_id=1 exists
    const hasCreatedEntry = headerRows.some(
      (r: any) => r.progress_id === 1 && r.is_rollback === 0,
    );
    if (!hasCreatedEntry && headerMeta.length > 0) {
      const meta = headerMeta[0];
      combined.push({
        id:         "h_created",
        source:     "header",
        activity:   "REQUEST CREATED",
        handled_by: meta.requested_by || "—",
        stage:      "DRAFT",
        remarks:    null,
        created_at: meta.date_requested,
      });
    }

    // Add header progress entries
    for (const entry of headerRows) {
      const isRollback = entry.is_rollback === 1;
      combined.push({
        id:         `h_${entry.id}`,
        source:     "header",
        activity:   getActivityLabel(entry.progress_id, isRollback),
        handled_by: entry.changed_by || "—",
        stage:      isRollback
          ? getStageFromProgressId(entry.from_progress_id ?? entry.progress_id)
          : getStageFromProgressId(entry.progress_id),
        remarks:    isRollback
          ? `ROLLED BACK TO ${getStageFromProgressId(entry.progress_id)}`
          : null,
        created_at: entry.changed_at,
      });
    }

    // Add line activity entries
    for (const entry of lineRows) {
      let remarks: string | null = null;
      if (entry.old_value && entry.new_value) {
        remarks = `${formatLogValue(entry.old_value)} → ${formatLogValue(entry.new_value)}`;
      } else if (entry.new_value) {
        remarks = formatLogValue(entry.new_value);
      } else if (entry.old_value) {
        remarks = formatLogValue(entry.old_value);
      }

      combined.push({
        id:         `l_${entry.id}`,
        source:     "line",
        activity:   LINE_ACTIVITY_LABELS[entry.activity_type] ?? entry.activity_type,
        handled_by: entry.handled_by || "—",
        stage:      entry.stage_name || "—",
        remarks,
        created_at: entry.created_at,
      });
    }

    // ── 5. Sort chronologically (oldest first) ────────────────────────────────
    combined.sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

    return NextResponse.json(combined, { status: 200 });
  } catch (err: any) {
    console.error("getRequisitionLog error:", err.sqlMessage || err.message);
    return NextResponse.json(
      { error: err.sqlMessage || err.message },
      { status: 500 },
    );
  }
}
