"use client";

import { useState } from "react";
import { pdf } from "@react-pdf/renderer";
import Button from "@/app/components/Button";
import { RtvPDF, RtvData } from "./RtvPDF";

type DownloadRTVButtonProps = {
  resolutionId: number;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  bgColor?: string;
};

export default function DownloadRTVButton({
  resolutionId,
  children,
  style,
  bgColor = "rgba(239, 239, 239, 1)",
}: DownloadRTVButtonProps) {
  const downloadIcon = "/icons/download.svg";

  async function handleDownload() {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/qc/getRtvData`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resolution_id: resolutionId }),
        },
      );

      const result = await response.json();

      if (!result.success || !result.data) {
        console.error("Failed to fetch RTV data:", result.message);
        return;
      }

      const rtvData: RtvData = result.data;

      // Generate PDF
      const blob = await pdf(<RtvPDF data={rtvData} />).toBlob();

      // Download
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `RTV-${String(rtvData.resolution_id).padStart(5, "0")}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating RTV PDF:", error);
    }
  }

  return (
    <Button
      componentType={"none"}
      bgColor={bgColor}
      borderColor={"rgba(223, 223, 223, 1)"}
      textColor={"black"}
      style={style || { padding: "7px 7px" }}
    >
      RTV
      <img src={downloadIcon} alt="download" onClick={handleDownload} />
    </Button>
  );
}
