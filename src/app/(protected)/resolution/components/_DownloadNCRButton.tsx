"use client";

import { useState } from "react";
import { pdf } from "@react-pdf/renderer";
import Button from "@/app/components/Button";
import { NcrPDF, NcrData } from "./NcrPDF";

type DownloadNCRButtonProps = {
  qcId: number;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  bgColor?: string;
  label?: string;
};

export default function DownloadNCRButton({
  qcId,
  children,
  style,
  bgColor = "rgba(239, 239, 239, 1)",
  label = "NCR",
}: DownloadNCRButtonProps) {
  const downloadIcon = "/icons/download.svg";

  async function urlToBase64(url: string): Promise<string> {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/s3/getImage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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

  function parseAttachments(raw: any): string[] {
    if (!raw) return [];
    try {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
      return [];
    } catch {
      return [];
    }
  }

  async function handleDownload() {
    try {
      // 1. Fetch NCR data
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/qc/getNcrData`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qc_id: qcId }),
        },
      );

      const result = await response.json();

      if (!result.success || !result.data) {
        console.error("Failed to fetch NCR data:", result.message);
        return;
      }

      const ncrData: NcrData = result.data;

      // 2. Convert first available attachment image to base64
      const attachmentImages: { [key: number]: string } = {};

      for (const cp of ncrData.failed_checkpoints) {
        const urls = parseAttachments(cp.attachments);
        if (urls.length > 0) {
          const base64 = await urlToBase64(urls[0]);
          if (base64) {
            attachmentImages[cp.checkpoint_number] = base64;
            break; // Only need one image for the PDF
          }
        }
      }

      // 3. Generate PDF
      const blob = await pdf(
        <NcrPDF data={ncrData} attachmentImages={attachmentImages} />,
      ).toBlob();

      // 4. Download
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `NCR-${String(ncrData.mr_line_id).padStart(5, "0")}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating NCR PDF:", error);
    }
  }

  if (children) {
    return (
      <Button
        componentType={"button"}
        bgColor={bgColor}
        borderColor="rgba(223, 223, 223, 1)"
        textColor={"black"}
        style={style || { padding: "7px 7px" }}
        onClick={handleDownload}
      >
        {children}
      </Button>
    );
  }

  return (
    <Button
      componentType={"none"}
      bgColor={bgColor}
      borderColor="rgba(223, 223, 223, 1)"
      textColor={"black"}
      style={style || { padding: "7px 7px" }}
    >
      {label} <img src={downloadIcon} alt="download" onClick={handleDownload} />
    </Button>
  );
}
