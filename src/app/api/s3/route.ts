import { NextResponse } from "next/server";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import crypto from "crypto";

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Helper function to verify upload
async function verifyUpload(
  bucket: string,
  key: string,
  maxRetries = 3,
): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await s3Client.send(
        new HeadObjectCommand({
          Bucket: bucket,
          Key: key,
        }),
      );
      return true; // File exists
    } catch (error) {
      if (i === maxRetries - 1) return false;
      // Wait before retry (exponential backoff)
      await new Promise((resolve) =>
        setTimeout(resolve, 1000 * Math.pow(2, i)),
      );
    }
  }
  return false;
}

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type");

    // Check if it's a file upload (multipart/form-data) or JSON (delete request)
    if (contentType?.includes("multipart/form-data")) {
      // UPLOAD ACTION
      const formData = await req.formData();
      const files = formData.getAll("files") as File[];
      const folder = (formData.get("folder") as string) || "boq-files";

      console.log("Files received:", files.length);
      console.log("Target folder:", folder);

      if (!files || files.length === 0) {
        return NextResponse.json(
          { error: "No files provided" },
          { status: 400 },
        );
      }

      // Validate bucket name exists
      if (!process.env.AWS_S3_BUCKET_NAME) {
        console.error("AWS_S3_BUCKET_NAME is not defined");
        return NextResponse.json(
          { error: "S3 bucket configuration missing" },
          { status: 500 },
        );
      }

      const uploadedUrls: string[] = [];
      const failedFiles: string[] = [];

      for (const file of files) {
        try {
          console.log("Processing file:", file.name, "Size:", file.size);

          // Validate file
          if (!file.name || file.size === 0) {
            console.error("Invalid file:", file.name);
            failedFiles.push(file.name);
            continue;
          }

          // Generate unique filename
          const fileExtension = file.name.split(".").pop();
          const uniqueId = crypto.randomBytes(16).toString("hex");
          const fileName = `${Date.now()}-${uniqueId}.${fileExtension}`;
          const key = `${folder}/${fileName}`;

          // Convert file to buffer
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          console.log("Uploading to S3:", key, "Buffer size:", buffer.length);

          // Upload to S3 with additional metadata
          const command = new PutObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME!,
            Key: key,
            Body: buffer,
            ContentType: file.type || "application/octet-stream",
            ContentLength: buffer.length,
            Metadata: {
              "original-filename": file.name,
              "upload-timestamp": new Date().toISOString(),
            },
          });

          await s3Client.send(command);

          // ✅ Verify the upload succeeded
          const uploadVerified = await verifyUpload(
            process.env.AWS_S3_BUCKET_NAME!,
            key,
          );

          if (!uploadVerified) {
            console.error("Upload verification failed for:", key);
            failedFiles.push(file.name);
            continue;
          }

          // Construct the public URL
          const url = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
          uploadedUrls.push(url);

          console.log("Upload successful and verified:", url);
        } catch (fileError: any) {
          console.error("Failed to upload file:", file.name, fileError);
          failedFiles.push(file.name);
        }
      }

      // Return results with information about failures
      if (failedFiles.length > 0) {
        console.warn("Some files failed to upload:", failedFiles);
        return NextResponse.json(
          {
            urls: uploadedUrls,
            failedFiles,
            partialSuccess: uploadedUrls.length > 0,
          },
          { status: 207 }, // Multi-Status
        );
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
            { status: 400 },
          );
        }

        // Validate that url is a string
        if (typeof url !== "string") {
          return NextResponse.json(
            { error: "URL must be a string" },
            { status: 400 },
          );
        }

        // Extract the key from the S3 URL
        // URL format: https://bucket-name.s3.region.amazonaws.com/key
        const urlParts = url.split(".amazonaws.com/");
        if (urlParts.length !== 2) {
          return NextResponse.json(
            { error: "Invalid S3 URL" },
            { status: 400 },
          );
        }

        const key = decodeURIComponent(urlParts[1]); // Decode URL encoding

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
      { status: 500 },
    );
  }
}
