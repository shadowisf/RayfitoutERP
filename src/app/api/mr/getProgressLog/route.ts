import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { mr_header_id, lpo_id } = body;

    if (!mr_header_id) {
      return NextResponse.json([], { status: 200 });
    }

    let query = "";
    let params: any[] = [];

    if (lpo_id) {
      // LPO-specific: get ALL MR-level stages (shared flow)
      // + LPO-specific stages for this particular LPO
      query = `
        SELECT
          pl.id,
          pl.mr_header_id,
          pl.lpo_id,
          pl.progress_id,
          pl.from_progress_id,
          pl.changed_by,
          pl.changed_at,
          pl.rollback_reason,
          pl.is_rollback,
          pl.reject_reason,
          p.value as progress_name,
          fp.value as from_progress_name
        FROM mr_header_progress_log pl
        LEFT JOIN lut_mr_headers_progress p ON pl.progress_id = p.id
        LEFT JOIN lut_mr_headers_progress fp ON pl.from_progress_id = fp.id
        WHERE pl.mr_header_id = ?
          AND (
            pl.lpo_id IS NULL
            OR pl.lpo_id = ?
          )
        ORDER BY pl.changed_at ASC, pl.id ASC
      `;
      params = [mr_header_id, lpo_id];
    } else {
      // MR-level: get all stages without lpo_id (MR-level transitions only)
      query = `
        SELECT
          pl.id,
          pl.mr_header_id,
          pl.lpo_id,
          pl.progress_id,
          pl.from_progress_id,
          pl.changed_by,
          pl.changed_at,
          pl.rollback_reason,
          pl.is_rollback,
          pl.reject_reason,
          p.value as progress_name,
          fp.value as from_progress_name
        FROM mr_header_progress_log pl
        LEFT JOIN lut_mr_headers_progress p ON pl.progress_id = p.id
        LEFT JOIN lut_mr_headers_progress fp ON pl.from_progress_id = fp.id
        WHERE pl.mr_header_id = ?
          AND pl.lpo_id IS NULL
        ORDER BY pl.changed_at ASC, pl.id ASC
      `;
      params = [mr_header_id];
    }

    const [progressRows]: any = await db.query(query, params);

    // Fetch MR header creation data - using requested_by and date_requested
    const [headerRows]: any = await db.query(
      `SELECT requested_by, date_requested FROM mr_headers WHERE id = ?`,
      [mr_header_id],
    );

    let result = [...progressRows];

    // Enrich rejection entries with fallback data where reject_reason is missing
    const hasRequestRejection = result.some(
      (e: any) => e.progress_id === 5 && !e.reject_reason,
    );
    const hasPriceRejection = result.some(
      (e: any) => e.progress_id === 11,
    );
    const hasPaymentRejection =
      lpo_id && result.some((e: any) => e.progress_id === 13 && !e.reject_reason);

    // Request Rejected (5): fallback to mr_lines reject_comment & qs_reject_comment
    if (hasRequestRejection) {
      const [rejectedItems]: any = await db.query(
        `SELECT material_description, reject_comment, qs_reject_comment FROM mr_lines
         WHERE mr_header_id = ? AND (approval_status = 'Rejected' OR qs_approval_status = 'Rejected')`,
        [mr_header_id],
      );
      if (rejectedItems.length > 0) {
        const fallbackReason = JSON.stringify(
          rejectedItems.map((item: any) => ({
            item: item.material_description,
            reason: item.reject_comment || item.qs_reject_comment || "",
          })),
        );
        result = result.map((entry: any) => {
          if (entry.progress_id === 5 && !entry.reject_reason) {
            return { ...entry, reject_reason: fallbackReason };
          }
          return entry;
        });
      }
    }

    // Price Rejected (11): deduplicate items (multiple vendors per item → one entry per item)
    if (hasPriceRejection) {
      result = result.map((entry: any) => {
        if (entry.progress_id === 11 && entry.reject_reason) {
          try {
            const reasons: { item: string; reason: string }[] = JSON.parse(
              entry.reject_reason,
            );
            // Deduplicate by item name, keep the first reason found
            const seen = new Map<string, string>();
            for (const r of reasons) {
              if (!seen.has(r.item)) {
                seen.set(r.item, r.reason);
              }
            }
            const deduped = Array.from(seen.entries()).map(([item, reason]) => ({
              item,
              reason,
            }));
            return { ...entry, reject_reason: JSON.stringify(deduped) };
          } catch {
            return entry;
          }
        }
        return entry;
      });
    }

    // Payment Rejected (13): fallback to lpo.payment_reject_comment
    if (hasPaymentRejection) {
      const [lpoRows]: any = await db.query(
        `SELECT payment_reject_comment FROM lpo WHERE id = ?`,
        [lpo_id],
      );
      const paymentRejectComment = lpoRows?.[0]?.payment_reject_comment;

      if (paymentRejectComment) {
        result = result.map((entry: any) => {
          if (entry.progress_id === 13 && !entry.reject_reason) {
            return {
              ...entry,
              reject_reason: JSON.stringify([
                {
                  item: `LPO-${String(lpo_id).padStart(5, "0")}`,
                  reason: paymentRejectComment,
                },
              ]),
            };
          }
          return entry;
        });
      }
    }

    // If header exists and no progress_id 1 in results, add synthetic entry
    const hasCreatedEntry = result.some((row: any) => row.progress_id === 1);

    if (!hasCreatedEntry && headerRows.length > 0) {
      const header = headerRows[0];

      const createdEntry = {
        id: 0,
        mr_header_id: mr_header_id,
        lpo_id: lpo_id || null,
        progress_id: 1,
        from_progress_id: null,
        changed_by: header.requested_by,
        changed_at: header.date_requested,
        rollback_reason: null,
        is_rollback: 0,
        reject_reason: null,
        progress_name: "Draft",
        from_progress_name: null,
      };

      result.unshift(createdEntry);
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.error("SQL Error:", err.sqlMessage || err.message);
    return NextResponse.json(
      { error: err.sqlMessage || err.message },
      { status: 500 },
    );
  }
}
