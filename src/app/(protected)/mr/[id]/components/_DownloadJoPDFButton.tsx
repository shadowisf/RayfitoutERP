"use client";

import { useState } from "react";
import { pdf } from "@react-pdf/renderer";
import Button from "@/app/components/Button";
import { MrHeader } from "@/app/(protected)/mr/[id]/types/mrHeader";
import { JoLine } from "../types/joLine";
import { toast } from "@/app/components/Toast";
import { JoPDF } from "./JoPDF";

const IMAGE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".bmp",
  ".webp",
  ".svg",
];

const isImageUrl = (url: string): boolean => {
  const lower = url.toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => lower.includes(ext));
};

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
      // Process JO lines: convert typed attachment images to base64
      const processedLines = await Promise.all(
        joLines.map(async (line) => {
          const typedAttachments = line.jo_attachments || [];
          if (typedAttachments.length === 0) return line;

          const processedAttachments = await Promise.all(
            typedAttachments.map(async (att) => {
              const fileUrl = att.file_url || "";
              if (!fileUrl || !isImageUrl(fileUrl)) return att;

              const base64 = await urlToBase64(fileUrl);
              if (!base64) return att;

              return { ...att, file_url: base64 };
            }),
          );

          return {
            ...line,
            jo_attachments: processedAttachments,
          };
        }),
      );

      // Generate PDF blob
      const blob = await pdf(
        <JoPDF mrHeader={mrHeader} joLines={processedLines} />,
      ).toBlob();

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `JO-${String(mrHeader.id).padStart(5, "0")}.pdf`;

      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      URL.revokeObjectURL(url);
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
