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

    let count = 0;

    // Department 8 (Directors/Management):
    //   - Scrap/Discard stage 1 (Manager Approval)
    //   - Accept Conditionally – Client/Consultant stage 1 (Manager Approval)
    //   - Accept Conditionally – Extended Warranty stage 1 (Manager Approval)
    if (department_id === 8) {
      const [scrapRows] = await db.query(
        `SELECT COUNT(*) as count FROM qc_resolution_reject_scrap WHERE progress_id = 1`,
      );
      const scrapCount = Number((scrapRows as any)[0].count);

      const [caRows] = await db.query(
        `SELECT COUNT(*) as count FROM qc_resolution_conditionally_accepted
         WHERE progress_id = 1
           AND reason IN ('Client/consultant approval', 'Extended warranty/guarantees')`,
      );
      const caCount = Number((caRows as any)[0].count);

      count = scrapCount + caCount;
    }

    // Department 10 (Finance):
    //   - Return/Refund stage 1 (Refund Confirmation)
    //   - Accept Conditionally – Commercial Deduction stage 1 (Verification)
    else if (department_id === 10) {
      const [rrRows] = await db.query(
        `SELECT COUNT(*) as count FROM qc_resolution_return_refund WHERE progress_id = 1`,
      );
      const rrCount = Number((rrRows as any)[0].count);

      const [caRows] = await db.query(
        `SELECT COUNT(*) as count FROM qc_resolution_conditionally_accepted
         WHERE progress_id = 1
           AND reason = 'Commercial deduction/penalty'`,
      );
      const caCount = Number((caRows as any)[0].count);

      count = rrCount + caCount;
    }

    // Department 11 (Storekeeper):
    //   - Return/Refund stage 2 (Verification)
    //   - Replace from Vendor stage 1 (Awaiting Delivery) & stage 2 (Stock Entry)
    //   - Accept Conditionally – all reasons at stage 2 (Stock Entry)
    else if (department_id === 11) {
      const [rrRows] = await db.query(
        `SELECT COUNT(*) as count FROM qc_resolution_return_refund WHERE progress_id = 2`,
      );
      const rrCount = Number((rrRows as any)[0].count);

      const [rvRows] = await db.query(
        `SELECT COUNT(*) as count FROM qc_resolution_replace WHERE progress_id IN (1, 2)`,
      );
      const rvCount = Number((rvRows as any)[0].count);

      const [caRows] = await db.query(
        `SELECT COUNT(*) as count FROM qc_resolution_conditionally_accepted WHERE progress_id = 2`,
      );
      const caCount = Number((caRows as any)[0].count);

      count = rrCount + rvCount + caCount;
    }

    // Department 12 (Quality Control):
    //   - Accept Conditionally – Deviation Approval stage 1 (QC)
    else if (department_id === 12) {
      const [caRows] = await db.query(
        `SELECT COUNT(*) as count FROM qc_resolution_conditionally_accepted
         WHERE progress_id = 1
           AND reason = 'Deviation approval'`,
      );
      count = Number((caRows as any)[0].count);
    }

    return NextResponse.json({
      success: true,
      count,
    });
  } catch (error) {
    console.error("Error fetching resolution action count:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch resolution action count" },
      { status: 500 },
    );
  }
}
