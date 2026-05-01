import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2";

export async function GET() {
  try {
    // 1. Total spent — two-case: old LPOs use l.total (payment_status approved), new LPOs use lpo_payments sum
    const [totalSpentRows] = await db.query<RowDataPacket[]>(
      `SELECT COALESCE(SUM(
         CASE
           WHEN LOWER(IFNULL(l.payment_status, ''))
                IN ('approved','paid','fully paid','completed','done')
             THEN l.total
           ELSE COALESCE(pay.total_paid, 0)
         END
       ), 0) AS total_spent
       FROM lpo l
       LEFT JOIN (
         SELECT lpo_id, SUM(amount) AS total_paid
         FROM lpo_payments
         GROUP BY lpo_id
       ) pay ON pay.lpo_id = l.id
       WHERE l.progress_id NOT IN (13)`,
    );
    const totalSpent = Number((totalSpentRows as any[])[0]?.total_spent ?? 0);

    // 2. Outstanding payables — LPOs (MR + JO) with no payment receipt uploaded
    const [outstandingRows] = await db.query<RowDataPacket[]>(
      `SELECT
        COALESCE(SUM(total), 0) AS amount,
        COUNT(*) AS lpo_count
       FROM lpo
       WHERE progress_id != 26
         AND (payment_file IS NULL OR payment_file = '[]' OR payment_file = 'null')`,
    );
    const outstandingAmount = Number(
      (outstandingRows as any[])[0]?.amount ?? 0,
    );
    const outstandingCount = Number(
      (outstandingRows as any[])[0]?.lpo_count ?? 0,
    );

    // 3. Median payment delay — avg days between LPO creation and last update
    //    for LPOs that have payment receipts uploaded
    const [delayRows] = await db.query<RowDataPacket[]>(
      `SELECT
        ROUND(AVG(DATEDIFF(updated_at, created_at)), 1) AS avg_days,
        COUNT(*) AS paid_count
       FROM lpo
       WHERE payment_file IS NOT NULL
         AND payment_file != '[]'
         AND payment_file != 'null'`,
    );
    const avgPaymentDays = Number((delayRows as any[])[0]?.avg_days ?? 0);
    const paidCount = Number((delayRows as any[])[0]?.paid_count ?? 0);

    // 4. Recent transactions — most recent LPOs that have payment receipts
    const [recentRows] = await db.query<RowDataPacket[]>(
      `SELECT
        l.id,
        l.total,
        l.payment_terms,
        COALESCE(s.name, sub.name) AS vendor_name
       FROM lpo l
       LEFT JOIN suppliers s ON l.supplier_id = s.id
       LEFT JOIN subcontractors sub ON l.subcontractor_id = sub.id
       WHERE l.payment_file IS NOT NULL
         AND l.payment_file != '[]'
         AND l.payment_file != 'null'
       ORDER BY l.updated_at DESC
       LIMIT 6`,
    );

    const recentTransactions = (recentRows as any[]).map((row) => ({
      display_id: `LPO-${String(row.id).padStart(4, "0")}`,
      vendor_name: row.vendor_name || "—",
      payment_type: row.payment_terms
        ? String(row.payment_terms).toUpperCase()
        : "—",
      amount: Number(row.total) || 0,
    }));

    return NextResponse.json(
      {
        total_spent: totalSpent,
        outstanding_amount: outstandingAmount,
        outstanding_count: outstandingCount,
        avg_payment_days: avgPaymentDays,
        paid_count: paidCount,
        recent_transactions: recentTransactions,
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("getFinancialOverview error:", err.sqlMessage || err.message);
    return NextResponse.json(
      { error: err.sqlMessage || err.message },
      { status: 500 },
    );
  }
}
