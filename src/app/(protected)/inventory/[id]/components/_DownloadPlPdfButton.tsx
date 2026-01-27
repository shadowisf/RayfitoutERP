"use client";

import Button from "@/app/components/Button";
import { useEffect, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { DnPdf } from "../../components/DnPdf";
import { PlPdf } from "../../components/PlPdf";

type props = {
  transactionID: number;
};

export default function DownloadPlPdfButton({ transactionID }: props) {
  const downloadIcon = "/icons/download.svg";

  const [transaction, setTransaction] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    async function fetchTransferDetails() {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/stock/getStockDetailsByID`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: transactionID }),
          },
        );

        const data = await response.json();
        if (data.success && data.data) {
          setTransaction(data.data);
        }
      } catch (error) {
        console.error("Error fetching transfer details:", error);
      }
    }

    fetchTransferDetails();
  }, [transactionID]);

  const handleDownload = async () => {
    if (!transaction || isProcessing) return;

    setIsProcessing(true);

    try {
      const blob = await pdf(<PlPdf transaction={transaction} />).toBlob();

      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `PL-${transactionID.toString().padStart(5, "0")}.pdf`;

      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("PDF download failed:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Button
      componentType={"button"}
      bgColor={"rgba(255, 255, 255, 1)"}
      borderColor={"rgba(207, 207, 207, 1)"}
      textColor={"black"}
      style={{ padding: "7px 20px", borderRadius: "25px" }}
      onClick={handleDownload}
      disabled={isProcessing}
    >
      PACKING LIST
      <img src={downloadIcon} alt="download" />
    </Button>
  );
}
