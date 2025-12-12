"use client";

import { useEffect, useState } from "react";
import Button from "@/app/components/Button";
import { pdf } from "@react-pdf/renderer";
import { LPOPDF } from "@/app/components/LPOPDF";
import { LPO } from "../../types/lpo";

type DownloadLPOButtonProps = {
  lpoID: number;
  children: React.ReactNode;
  bgColor: string;
  textColor: string;
  borderColor: string;
  style?: React.CSSProperties;
};

export default function DownloadLPOButton({
  lpoID,
  children,
  bgColor,
  textColor,
  borderColor,
  style,
}: DownloadLPOButtonProps) {
  const [lpo, setLpo] = useState<LPO | null>(null);

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
      const blob = await pdf(<LPOPDF lpo={lpo} />).toBlob();

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

  return (
    <Button
      componentType={"button"}
      bgColor={bgColor}
      borderColor={borderColor}
      textColor={textColor}
      onClick={handleDownload}
      style={style}
    >
      {children}
    </Button>
  );
}
