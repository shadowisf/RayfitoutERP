import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { project_id, attachment_url } = body;

    if (!project_id || !attachment_url) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Get current attachments
    const [currentProject]: any = await db.query(
      "SELECT attachments FROM projects WHERE id = ?",
      [project_id],
    );

    let attachments = [];
    if (
      currentProject[0].attachments &&
      currentProject[0].attachments !== "null"
    ) {
      try {
        attachments =
          typeof currentProject[0].attachments === "string"
            ? JSON.parse(currentProject[0].attachments)
            : currentProject[0].attachments;
      } catch (error) {
        console.error("Error parsing existing attachments:", error);
        attachments = [];
      }
    }

    // Remove the attachment from database
    const updatedAttachments = attachments.filter(
      (att: any) => att.url !== attachment_url,
    );

    // Update database
    await db.query("UPDATE projects SET attachments = ? WHERE id = ?", [
      JSON.stringify(updatedAttachments),
      project_id,
    ]);

    // Delete from S3 using your existing /api/s3 route
    try {
      const s3Response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/s3`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "delete",
            url: attachment_url,
          }),
        },
      );

      if (!s3Response.ok) {
        const s3Data = await s3Response.json();
        console.error("Failed to delete from S3:", s3Data.error);
        // Continue even if S3 deletion fails - database is already updated
      } else {
        console.log("File deleted from S3 successfully");
      }
    } catch (error) {
      console.error("Error deleting from S3:", error);
      // Continue even if S3 deletion fails - database is already updated
    }

    return NextResponse.json({
      success: true,
      message: "Attachment deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting attachment:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete attachment" },
      { status: 500 },
    );
  }
}
