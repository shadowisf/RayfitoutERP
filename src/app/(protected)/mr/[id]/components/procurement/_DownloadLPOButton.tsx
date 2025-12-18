"use client";

import { useEffect, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { LpoPDF } from "@/app/(protected)/mr/[id]/components/LpoPDF";
import { LpoHeader } from "../../types/lpoHeader";

type DownloadLPOButtonProps = {
  lpoID: number;
};

export default function DownloadLPOButton({ lpoID }: DownloadLPOButtonProps) {
  const downloadIcon = "/icons/download.svg";

  const [lpo, setLpo] = useState<LpoHeader | null>(null);

  useEffect(() => {
    async function fetchLpo() {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo/getLPODetails`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lpo_id: lpoID }),
          }
        );
        const data = await response.json();
        if (data.success && data.data) {
          setLpo(data.data);
        }
      } catch (error) {
        console.error("Error fetching LPO:", error);
      }
    }
    fetchLpo();
  }, [lpoID]);

  async function handleDownload() {
    if (!lpo) {
      return;
    }

    try {
      // Generate PDF blob
      const blob = await pdf(<LpoPDF lpo={lpo} />).toBlob();

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `LPO-${String(lpo.id).padStart(5, "0")}.pdf`;

      // Trigger download
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  }

  return <img src={downloadIcon} alt="download" onClick={handleDownload} />;
}
