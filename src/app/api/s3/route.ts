import { NextResponse } from "next/server";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import crypto from "crypto";

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type");

    // Check if it's a file upload (multipart/form-data) or JSON (delete request)
    if (contentType?.includes("multipart/form-data")) {
      // UPLOAD ACTION
      const formData = await req.formData();
      const files = formData.getAll("files") as File[];
      const folder = formData.get("folder") as string || "boq-files"; // Get folder from formData, default to boq-files

      console.log("Files received:", files.length);
      console.log("Target folder:", folder);

      if (!files || files.length === 0) {
        return NextResponse.json(
          { error: "No files provided" },
          { status: 400 }
        );
      }

      const uploadedUrls: string[] = [];

      for (const file of files) {
        console.log("Processing file:", file.name);

        // Generate unique filename
        const fileExtension = file.name.split(".").pop();
        const uniqueId = crypto.randomBytes(16).toString("hex");
        const fileName = `${Date.now()}-${uniqueId}.${fileExtension}`;
        const key = `${folder}/${fileName}`; // Use the folder parameter

        // Convert file to buffer
        const buffer = Buffer.from(await file.arrayBuffer());

        console.log("Uploading to S3:", key);

        // Upload to S3
        const command = new PutObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET_NAME!,
          Key: key,
          Body: buffer,
          ContentType: file.type,
        });

        await s3Client.send(command);

        // Construct the public URL
        const url = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
        uploadedUrls.push(url);

        console.log("Upload successful:", url);
      }

      return NextResponse.json({ urls: uploadedUrls }, { status: 200 });
    } else {
      // DELETE ACTION
      const body = await req.json();
      const { action, url } = body;

      if (action === "delete") {
        if (!url) {
          return NextResponse.json(
            { error: "No URL provided" },
            { status: 400 }
          );
        }

        // Validate that url is a string
        if (typeof url !== 'string') {
          return NextResponse.json(
            { error: "URL must be a string" },
            { status: 400 }
          );
        }

        // Extract the key from the S3 URL
        // URL format: https://bucket-name.s3.region.amazonaws.com/key
        const urlParts = url.split(".amazonaws.com/");
        if (urlParts.length !== 2) {
          return NextResponse.json(
            { error: "Invalid S3 URL" },
            { status: 400 }
          );
        }

        const key = urlParts[1];

        console.log("Deleting S3 file with key:", key);

        // Delete from S3
        const command = new DeleteObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET_NAME!,
          Key: key,
        });

        await s3Client.send(command);

        console.log("File deleted successfully:", key);

        return NextResponse.json({ success: true, key }, { status: 200 });
      }

      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("S3 error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process S3 request" },
      { status: 500 }
    );
  }
}