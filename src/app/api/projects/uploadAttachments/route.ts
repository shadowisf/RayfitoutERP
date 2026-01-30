import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { project_id, attachment_name, attachment_url } = body;

    if (!project_id || !attachment_name || !attachment_url) {
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

    // Add new attachment
    attachments.push({
      name: attachment_name,
      url: attachment_url,
      uploaded_at: new Date().toISOString(),
    });

    // Update database
    await db.query("UPDATE projects SET attachments = ? WHERE id = ?", [
      JSON.stringify(attachments),
      project_id,
    ]);

    return NextResponse.json({
      success: true,
      attachment: {
        name: attachment_name,
        url: attachment_url,
      },
    });
  } catch (error: any) {
    console.error("Error saving attachment:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save attachment" },
      { status: 500 },
    );
  }
}
