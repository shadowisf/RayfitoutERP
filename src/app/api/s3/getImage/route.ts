import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const url: string = Array.isArray(body.url) ? body.url[0] : body.url;

    if (!url) {
      return NextResponse.json(
        { error: "URL is required in request body" },
        { status: 400 }
      );
    }

    console.log("Proxying image:", url);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    let buffer: Buffer = Buffer.from(arrayBuffer);

    let contentType = response.headers.get("content-type") || "image/jpeg";

    // Convert WebP to PNG since @react-pdf/renderer doesn't support WebP
    if (contentType.includes("webp") || url.toLowerCase().endsWith(".webp")) {
      buffer = Buffer.from(await sharp(buffer).jpeg({ quality: 85 }).toBuffer());
      contentType = "image/jpeg";
    }

    console.log("Successfully proxied image, size:", buffer.length);

    // Return base64 encoded image
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${contentType};base64,${base64}`;

    return NextResponse.json({
      success: true,
      dataUrl: dataUrl,
    });
  } catch (error) {
    console.error("Error fetching image:", error);
    return NextResponse.json(
      { error: "Failed to fetch image" },
      { status: 500 }
    );
  }
}
