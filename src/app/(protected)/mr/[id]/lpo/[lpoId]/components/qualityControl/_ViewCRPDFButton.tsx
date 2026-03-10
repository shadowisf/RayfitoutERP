"use client";

import { useEffect, useState } from "react";
import Button from "@/app/components/Button";
import { LpoHeader } from "../../../../types/lpoHeader";
import { LpoPDF } from "../LpoPDF";
import { pdf } from "@react-pdf/renderer";
import { useAuth } from "@/app/context/AuthContext";
import { MrHeader } from "../../../../types/mrHeader";

type ViewCRButton = {
  lpoID: number;
  mrHeader: MrHeader;
};

export default function ViewCRButton({ lpoID, mrHeader }: ViewCRButton) {
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
          },
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
      CR
    </Button>
  );
}
