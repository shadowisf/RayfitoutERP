// app/api/cron/cleanup-old-drafts/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    // ✅ Verify the request is from a cron job (for security)
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Calculate the cutoff time (72 hours ago)
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - 72);

    // Find all draft MRs older than 72 hours
    const [oldDrafts] = await db.query(
      `SELECT id FROM mr_header 
       WHERE progress_id = 1 
       AND created_at < ?`,
      [cutoffDate],
    );

    if (!oldDrafts || (oldDrafts as any[]).length === 0) {
      return NextResponse.json({
        success: true,
        message: "No old drafts to delete",
        deleted_count: 0,
      });
    }

    // Delete the mr_header entries
    await db.query(
      `DELETE FROM mr_header 
       WHERE progress_id = 1 
       AND created_at < ?`,
      [cutoffDate],
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    console.error("Error in cron cleanup:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to cleanup old drafts",
      },
      { status: 500 },
    );
  }
}
