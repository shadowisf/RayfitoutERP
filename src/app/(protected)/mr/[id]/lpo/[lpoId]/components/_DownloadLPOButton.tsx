"use client";

import { useEffect, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { LpoPDF } from "@/app/(protected)/mr/[id]/lpo/[lpoId]/components/LpoPDF";
import { LpoHeader } from "../../../types/lpoHeader";
import Button from "@/app/components/Button";
import { MrHeader } from "../../../types/mrHeader";

type DownloadLPOButtonProps = {
  lpoID: number;
  children?: React.ReactNode;
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
  style?: React.CSSProperties;
};

export default function DownloadLPOButton({
  lpoID,
  children,
  bgColor = "rgba(239, 239, 239, 1)",
  textColor = "black",
  borderColor = "rgba(223, 223, 223, 1)",
  style = { borderRadius: "25px" },
}: DownloadLPOButtonProps) {
  const downloadIcon = "/icons/download.svg";

  const [lpo, setLpo] = useState<LpoHeader | null>(null);
  const [mrHeader, setMrHeader] = useState<MrHeader | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch LPO first
        const lpoResponse = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo/getLPODetails`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lpo_id: lpoID }),
          },
        );
        const lpoData = await lpoResponse.json();

        if (!lpoData.data) {
          console.error("No LPO data found");
          return;
        }

        setLpo(lpoData.data);

        // Then fetch MR header using mr_header_id from LPO
        if (lpoData.data.mr_header_id) {
          const mrResponse = await fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMrHeaderByID`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: lpoData.data.mr_header_id }),
            },
          );
          const mrData = await mrResponse.json();

          // API returns data directly, not wrapped in success
          if (mrData && mrData.id) {
            setMrHeader(mrData);
          } else {
            console.error("Failed to fetch MR header:", mrData.error);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    }

    if (lpoID) {
      fetchData();
    }
  }, [lpoID]);

  async function handleDownload() {
    if (!lpo || !mrHeader) {
      return;
    }

    setIsLoading(true);

    try {
      // Generate PDF blob
      const blob = await pdf(<LpoPDF lpo={lpo} mr={mrHeader} />).toBlob();

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

  if (children) {
    return (
      <Button
        componentType={"button"}
        bgColor={bgColor}
        borderColor={borderColor}
        textColor={textColor}
        style={style}
        onClick={handleDownload}
        disabled={isLoading || !lpo || !mrHeader}
      >
        {children}
      </Button>
    );
  }

  return (
    <img
      src={downloadIcon}
      alt="download"
      onClick={handleDownload}
      style={{
        cursor: !lpo || !mrHeader ? "not-allowed" : "pointer",
        opacity: !lpo || !mrHeader ? 0.5 : 1,
      }}
    />
  );
}
