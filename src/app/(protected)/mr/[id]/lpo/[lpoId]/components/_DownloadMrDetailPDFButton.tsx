"use client";

import { useState } from "react";
import { pdf } from "@react-pdf/renderer";
import Button from "@/app/components/Button";
import { MrDetailPDF } from "./MrDetailPDF";
import { MrHeader } from "@/app/(protected)/mr/[id]/types/mrHeader";

type props = {
  mrHeader: MrHeader;
  lpo: any;
  flatLines: any[];
};

export default function DownloadMrDetailPDFButton({
  mrHeader,
  lpo,
  flatLines,
}: props) {
  const downloadIcon = "/icons/download.svg";

  const [isProcessing, setIsProcessing] = useState(false);

  async function handleDownload() {
    if (isProcessing) return;

    setIsProcessing(true);

    try {
      // Fetch progress log
      const progressRes = await fetch("/api/mr/getProgressLog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mr_header_id: mrHeader.id,
          lpo_id: lpo.id,
        }),
      });

      const progressLog = progressRes.ok ? await progressRes.json() : [];

      // Generate PDF blob
      const blob = await pdf(
        <MrDetailPDF
          mrHeader={mrHeader}
          lpo={lpo}
          flatLines={flatLines}
          progressLog={Array.isArray(progressLog) ? progressLog : []}
        />,
      ).toBlob();

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `MR-${String(mrHeader.id).padStart(5, "0")}-LPO-${String(lpo.id).padStart(5, "0")}.pdf`;

      // Trigger download
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating MR PDF:", error);
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
      disabled={isProcessing}
    >
      EXPORT MR
      <img src={downloadIcon} alt="download" />
    </Button>
  );
}
