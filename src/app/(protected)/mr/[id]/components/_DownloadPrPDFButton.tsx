"use client";

import { useEffect, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { PrPDF, PrPDFLine } from "./PrPDF";
import Button from "@/app/components/Button";
import { MrHeader } from "../types/mrHeader";
import { toast } from "@/app/components/Toast";

type DownloadPrPDFButtonProps = {
  mrHeader: MrHeader;
  prLines?: PrPDFLine[];
};

export default function DownloadPrPDFButton({
  mrHeader,
  prLines: externalPrLines,
}: DownloadPrPDFButtonProps) {
  const downloadIcon = "/icons/download.svg";
  const [isGenerating, setIsGenerating] = useState(false);
  const [fetchedLines, setFetchedLines] = useState<PrPDFLine[] | null>(null);

  // Self-fetch PR lines if not provided
  useEffect(() => {
    if (externalPrLines) return;

    async function fetchPrLines() {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/pr`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "getPrLines",
            mr_header_id: mrHeader.id,
          }),
        });
        const data = await res.json();
        setFetchedLines(data);
      } catch {
        setFetchedLines([]);
      }
    }

    fetchPrLines();
  }, [mrHeader.id, externalPrLines]);

  const prLines = externalPrLines || fetchedLines || [];

  async function handleDownload() {
    if (prLines.length === 0) return;
    setIsGenerating(true);

    try {
      const blob = await pdf(
        <PrPDF mrHeader={mrHeader} prLines={prLines} />,
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `PR-${String(mrHeader.id).padStart(5, "0")}.pdf`;

      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast("Failed to generate PDF", "error");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <Button
      componentType={"button"}
      bgColor={"white"}
      borderColor={"rgba(223, 223, 223, 1)"}
      textColor={"black"}
      onClick={handleDownload}
      disabled={isGenerating || prLines.length === 0}
    >
      EXPORT PR <img src={downloadIcon} alt="download" />
    </Button>
  );
}
