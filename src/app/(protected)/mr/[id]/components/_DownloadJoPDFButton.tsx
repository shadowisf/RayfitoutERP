"use client";

import { useState } from "react";
import { pdf } from "@react-pdf/renderer";
import Button from "@/app/components/Button";
import { MrHeader } from "@/app/(protected)/mr/[id]/types/mrHeader";
import { JoLine } from "../types/joLine";
import { toast } from "@/app/components/Toast";
import { JoPDF } from "./JoPDF";

type props = {
  mrHeader: MrHeader;
  joLines: JoLine[];
};

export default function DownloadJoPDFButton({ mrHeader, joLines }: props) {
  const downloadIcon = "/icons/download.svg";

  const [isProcessing, setIsProcessing] = useState(false);

  // URL to Base64 converter
  async function urlToBase64(url: string): Promise<string> {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/s3/getImage`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url }),
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success || !data.dataUrl) {
        throw new Error("Invalid response from proxy");
      }

      return data.dataUrl;
    } catch (error) {
      console.error("Failed to convert image:", url, error);
      return "";
    }
  }

  async function handleDownload() {
    if (isProcessing) return;

    if (!joLines || joLines.length === 0) {
      toast("No job items to export", "error");
      return;
    }

    setIsProcessing(true);

    try {
      console.log("Processing JO line images...");

      // Process JO lines and convert attachment images to base64
      const processedLines = await Promise.all(
        joLines.map(async (line) => {
          if (!line.attachment) return line;

          try {
            let urls: string[] = [];

            if (Array.isArray(line.attachment)) {
              urls = line.attachment as unknown as string[];
            } else if (typeof line.attachment === "string") {
              if (line.attachment.trim() === "") return line;
              try {
                urls = JSON.parse(line.attachment);
              } catch {
                urls = [line.attachment];
              }
            }

            if (!Array.isArray(urls) || urls.length === 0) return line;

            console.log(
              `Processing ${urls.length} images for item: ${line.job_description}`,
            );

            // Convert all images to base64
            const base64Images = await Promise.all(
              urls.map((url) => urlToBase64(url)),
            );

            // Filter out failed conversions
            const validImages = base64Images.filter((img) => img !== "");

            console.log(`Successfully converted ${validImages.length} images`);

            return {
              ...line,
              attachment: JSON.stringify(validImages),
            };
          } catch (error) {
            console.error("Error processing line attachments:", error);
            return line;
          }
        }),
      );

      // Generate PDF blob
      const blob = await pdf(
        <JoPDF mrHeader={mrHeader} joLines={processedLines} />,
      ).toBlob();

      console.log("JO PDF generated successfully");

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `JO-${String(mrHeader.id).padStart(5, "0")}.pdf`;

      // Trigger download
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log("Download complete");
    } catch (error) {
      console.error("Error generating JO PDF:", error);
      toast("Failed to generate PDF. Please try again.", "error");
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <Button
      componentType={"button"}
      bgColor={"rgba(255, 255, 255, 1)"}
      borderColor={"rgba(207, 207, 207, 1)"}
      textColor={"black"}
      onClick={handleDownload}
      disabled={isProcessing || joLines.length === 0}
    >
      EXPORT JO
      <img src={downloadIcon} alt="download" />
    </Button>
  );
}
