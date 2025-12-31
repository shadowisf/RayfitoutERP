"use client";

import { useEffect, useState } from "react";
import Button from "@/app/components/Button";
import { LpoHeader } from "../../types/lpoHeader";
import DownloadLPOButton from "./_DownloadLPOButton";
import { LpoPDF } from "../LpoPDF";
import { pdf } from "@react-pdf/renderer";
import EditLPOButton from "./_EditLPOButton";
import { useAuth } from "@/app/context/AuthContext";
import { MrHeader } from "../../types/mrHeader";

type ViewLPOButtonProps = {
  lpoID: number;
  mrHeader: MrHeader;
};

export default function ViewLPOButton({ lpoID, mrHeader }: ViewLPOButtonProps) {
  const { userInfo } = useAuth();

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
        setLpo(data.data);
      } catch (error) {
        console.error("Error fetching LPO:", error);
      }
    }
    fetchLpo();
  }, [lpoID]);

  useEffect(() => {
    async function generatePdfBlob() {
      if (!lpo) return;

      try {
        // Generate PDF blob
        const blob = await pdf(<LpoPDF lpo={lpo} />).toBlob();

        // Create blob URL
        const url = URL.createObjectURL(blob);

        // Cleanup function to revoke the URL when component unmounts
        return () => {
          URL.revokeObjectURL(url);
        };
      } catch (error) {
        console.error("Error generating PDF blob:", error);
      }
    }

    generatePdfBlob();
  }, [lpo]);

  return (
    <Button
      componentType={"none"}
      bgColor={"white"}
      borderColor={"rgba(207, 207, 207, 1)"}
      textColor={"black"}
      style={{ padding: "7px 20px", borderRadius: "25px" }}
    >
      LPO
      {/* <a
        href={pdfUrl ? pdfUrl : "#"}
        target="_blank"
        style={{ display: "flex" }}
      >
        <img src={externalLinkIcon} alt="external link" />
      </a> */}
      {userInfo?.departmentID === 9 &&
        (mrHeader.progress_id === 12 ||
          mrHeader.progress_id === 13 ||
          mrHeader.progress_id === 16) && <EditLPOButton lpoId={lpoID} />}
      <DownloadLPOButton lpoID={lpoID} />
    </Button>
  );
}
