import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

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
      7: 9, // Awaiting quotations → Procurement
      9: 16, // Awaiting QS price approval → QS
      10: 8, // Awaiting manager price approval → Management
      12: 9, // Awaiting LPO & invoice → Procurement
      14: 10, // Pending payment → Finance
      13: 9, // Payment rejected → Procurement
      17: 11, // Pending delivery → Storekeeper
      24: 11, // Awaiting stock entry → Storekeeper
    };

    let count = 0;

    if (department_id === 8) {
      // ✅ Managers: Count MRs in stages 3, 10, and 5 (initial approval rejected - all departments)
      const [rows] = await db.query(
        `SELECT COUNT(*) as count 
         FROM mr_headers
         WHERE progress_id IN (3, 10) OR (progress_id = 5 AND department_id = ?)`,
      );
      count = Number((rows as any)[0].count);
    } else if (department_id === 9) {
      // ✅ Procurement: Count stages 7, 11, 12, 13, 15 + own department's progress_id 5
      const [rows] = await db.query(
        `SELECT COUNT(*) as count 
         FROM mr_headers
         WHERE progress_id IN (7, 11, 12, 13, 15) 
            OR (progress_id = 5 AND department_id = ?)`,
        [department_id],
      );
      count = Number((rows as any)[0].count);
    } else if (department_id === 16) {
      // ✅ QS: Count stages 2, 9 + own department's progress_id 5
      const [rows] = await db.query(
        `SELECT COUNT(*) as count 
         FROM mr_headers 
         WHERE progress_id IN (2, 9)
            OR (progress_id = 5 AND department_id = ?)`,
        [department_id],
      );
      count = Number((rows as any)[0].count);
    } else if (department_id === 10) {
      // ✅ Finance: Count stage 14 + own department's progress_id 5
      const [rows] = await db.query(
        `SELECT COUNT(*) as count 
         FROM mr_headers 
         WHERE progress_id = 14
            OR (progress_id = 5 AND department_id = ?)`,
        [department_id],
      );
      count = Number((rows as any)[0].count);
    } else if (department_id === 11) {
      // ✅ Storekeeper: Count stages 17, 24 + own department's progress_id 5
      const [rows] = await db.query(
        `SELECT COUNT(*) as count 
         FROM mr_headers 
         WHERE progress_id IN (17, 24)
            OR (progress_id = 5 AND department_id = ?)`,
        [department_id],
      );
      count = Number((rows as any)[0].count);
    } else {
      // ✅ Other departments: Count responsible stages + own department's progress_id 5
      const responsibleStages = Object.entries(progressToResponsibleDepartment)
        .filter(([_, deptId]) => deptId === department_id)
        .map(([progressId]) => parseInt(progressId));

      if (responsibleStages.length > 0) {
        const [rows] = await db.query(
          `SELECT COUNT(*) as count 
           FROM mr_headers 
           WHERE progress_id IN (?)
              OR (progress_id = 5 AND department_id = ?)`,
          [responsibleStages, department_id],
        );
        count = Number((rows as any)[0].count);
      } else {
        // If no responsible stages, only count own department's progress_id 5
        const [rows] = await db.query(
          `SELECT COUNT(*) as count 
           FROM mr_headers 
           WHERE progress_id = 5 AND department_id = ?`,
          [department_id],
        );
        count = Number((rows as any)[0].count);
      }
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
