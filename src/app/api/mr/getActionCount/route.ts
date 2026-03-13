import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// Helper: count LPOs at given progress stages (uses lpo.progress_id directly)
async function countLposAtStages(stages: number[]): Promise<number> {
  const [rows] = await db.query(
    `SELECT COUNT(*) as count FROM lpo WHERE progress_id IN (?)`,
    [stages],
  );
  return Number((rows as any)[0].count);
}

export async function POST(req: NextRequest) {
  try {
    const { department_id } = await req.json();

    if (!department_id) {
      return NextResponse.json(
        { success: false, error: "Department ID is required" },
        { status: 400 },
      );
    }

    // Map progress_id to responsible department ID
    const progressToResponsibleDepartment: { [key: number]: number } = {
      2: 16, // Awaiting QS initial approval → QS
      3: 8, // Awaiting manager initial approval → Management
      4: 11, // Stock Transfer → Storekeeper
      7: 9, // Awaiting quotations → Procurement
      9: 16, // Awaiting QS price approval → QS
      10: 8, // Awaiting manager price approval → Management
      12: 9, // Awaiting LPO & invoice → Procurement
      14: 10, // Pending payment → Finance
      13: 9, // Payment rejected → Procurement
      15: 9, // Payment rejected → Procurement
      16: 9, // GRN failed → Procurement
      17: 11, // Pending delivery → Storekeeper
      // TEMPORARILY DISABLED QC
      // 21: 12, // QC Check → Quality Control
      // 23: 12, // Failed QC → Quality Control
      24: 11, // Awaiting stock entry → Storekeeper
    };

    // LPO stages (13+) need to be counted from the lpo table, not mr_headers
    // Stage 12 remains an MR-level stage (procurement issues LPOs)
    // TEMPORARILY DISABLED QC: removed 21, 23
    const LPO_STAGES = [13, 14, 15, 16, 17, 24, 25];

    let count = 0;

    if (department_id === 8) {
      // Managers: Count MRs in stages 3, 10 + rejected (5) for managers
      const [mrRows] = await db.query(
        `SELECT COUNT(*) as count
         FROM mr_headers
         WHERE progress_id IN (3, 10) OR (progress_id = 5 AND department_id = 8)`,
      );
      count = Number((mrRows as any)[0].count);
    } else if (department_id === 9) {
      // Procurement: MR stages 7, 11, 12 + rejected (5)
      // + LPO stages 13, 15, 16
      const [mrRows] = await db.query(
        `SELECT COUNT(*) as count
         FROM mr_headers
         WHERE progress_id IN (7, 11, 12)
            OR (progress_id = 5 AND department_id = 9)`,
      );
      const mrCount = Number((mrRows as any)[0].count);
      const lpoCount = await countLposAtStages([13, 15, 16]);
      count = mrCount + lpoCount;
    } else if (department_id === 16) {
      // QS: Count stages 2, 9 + own department's progress_id 5
      const [rows] = await db.query(
        `SELECT COUNT(*) as count
         FROM mr_headers
         WHERE progress_id IN (2, 9)
            OR (progress_id = 5 AND department_id = 16)`,
      );
      count = Number((rows as any)[0].count);
    } else if (department_id === 10) {
      // Finance: LPO stage 14 + own department's rejected (5)
      const [mrRows] = await db.query(
        `SELECT COUNT(*) as count
         FROM mr_headers
         WHERE progress_id = 5 AND department_id = 10`,
      );
      const mrCount = Number((mrRows as any)[0].count);
      const lpoCount = await countLposAtStages([14]);
      count = mrCount + lpoCount;
    } else if (department_id === 11) {
      // Storekeeper: MR stages 4 (stock transfer) + LPO stages 17, 24 + own department's rejected (5)
      // Also count mixed MRs (progress >= 7) that have item_available lines needing stock transfer
      const [mrRows] = await db.query(
        `SELECT COUNT(*) as count
         FROM mr_headers
         WHERE progress_id = 4
            OR (progress_id = 5 AND department_id = 11)`,
      );
      const mrCount = Number((mrRows as any)[0].count);

      // Count mixed MRs with pending stock transfers
      const [mixedRows] = await db.query(
        `SELECT COUNT(DISTINCT mh.id) as count
         FROM mr_headers mh
         INNER JOIN mr_lines ml ON mh.id = ml.mr_header_id
         WHERE mh.progress_id >= 7
           AND mh.progress_id < 25
           AND ml.qs_review_type = 'item_available'
           AND (ml.stock_transfer_id IS NULL OR ml.signed_dn_file IS NULL)`,
      );
      const mixedCount = Number((mixedRows as any)[0].count);

      const lpoCount = await countLposAtStages([17, 24]);
      count = mrCount + mixedCount + lpoCount;
    /* TEMPORARILY DISABLED QC
    } else if (department_id === 12) {
      // Quality Control: LPO stages 21, 23 + own department's rejected (5)
      const [mrRows] = await db.query(
        `SELECT COUNT(*) as count
         FROM mr_headers
         WHERE progress_id = 5 AND department_id = 12`,
      );
      const mrCount = Number((mrRows as any)[0].count);
      const lpoCount = await countLposAtStages([21, 23]);
      count = mrCount + lpoCount;
    */
    } else {
      // Other departments: Count responsible MR stages + LPO stages + own department's progress_id 5
      const responsibleMrStages = Object.entries(
        progressToResponsibleDepartment,
      )
        .filter(
          ([progressId, deptId]) =>
            deptId === department_id &&
            !LPO_STAGES.includes(Number(progressId)),
        )
        .map(([progressId]) => parseInt(progressId));

      const responsibleLpoStages = Object.entries(
        progressToResponsibleDepartment,
      )
        .filter(
          ([progressId, deptId]) =>
            deptId === department_id &&
            LPO_STAGES.includes(Number(progressId)),
        )
        .map(([progressId]) => parseInt(progressId));

      let mrCount = 0;
      if (responsibleMrStages.length > 0) {
        const [rows] = await db.query(
          `SELECT COUNT(*) as count
           FROM mr_headers
           WHERE progress_id IN (?)
              OR (progress_id = 5 AND department_id = ?)`,
          [responsibleMrStages, department_id],
        );
        mrCount = Number((rows as any)[0].count);
      } else {
        const [rows] = await db.query(
          `SELECT COUNT(*) as count
           FROM mr_headers
           WHERE progress_id = 5 AND department_id = ?`,
          [department_id],
        );
        mrCount = Number((rows as any)[0].count);
      }

      let lpoCount = 0;
      if (responsibleLpoStages.length > 0) {
        lpoCount = await countLposAtStages(responsibleLpoStages);
      }

      count = mrCount + lpoCount;
    }

    return NextResponse.json({
      success: true,
      count,
    });
  } catch (error) {
    console.error("Error fetching MR action count:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch MR action count" },
      { status: 500 },
    );
  }
}
