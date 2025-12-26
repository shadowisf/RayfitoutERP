"use client";

import Button from "@/app/components/Button";
import { useEffect, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { TsnPDF } from "../../components/TsnPDF";

type ViewTSNPDFButtonProps = {
  transferID: number;
};

export default function ViewTSNPDFButton({
  transferID,
}: ViewTSNPDFButtonProps) {
  const externalLinkIcon = "/icons/external-link.svg";

  const [transaction, setTransaction] = useState(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTransferDetails() {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/stock/getStockDetailsByID`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: transferID }),
          }
        );
        const data = await response.json();
        setTransaction(data.data);
      } catch (error) {
        console.error("Error fetching:", error);
      }
    }
    fetchTransferDetails();
  }, [transferID]);

  useEffect(() => {
    async function generatePdfBlob() {
      if (!transferID) return;

      try {
        // Generate PDF blob
        const blob = await pdf(<TsnPDF transaction={transaction} />).toBlob();

        // Create blob URL
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);

        // Cleanup function to revoke the URL when component unmounts
        return () => {
          URL.revokeObjectURL(url);
        };
      } catch (error) {
        console.error("Error generating PDF blob:", error);
      }
    }

    generatePdfBlob();
  }, [transaction]);

  return (
    <>
      <Button
        componentType={"link"}
        bgColor={"rgba(239, 239, 239, 1)"}
        borderColor={"rgba(223, 223, 223, 1)"}
        textColor={"black"}
        href={pdfUrl ?? ""}
        target="_target"
        style={{ padding: "7px 7px" }}
      >
        <img src={externalLinkIcon} alt="trash" />
      </Button>
    </>
  );
}
