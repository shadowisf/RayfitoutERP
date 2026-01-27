"use client";

import Button from "@/app/components/Button";
import { useEffect, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { DnPdf } from "../../components/DnPdf";

type props = {
  transactionID: number;
};

export default function DownloadDnPdfButton({ transactionID }: props) {
  const downloadIcon = "/icons/download.svg";

  const [transaction, setTransaction] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  async function urlToBase64(url: string): Promise<string> {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/s3/getImage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        },
      );

      const data = await response.json();
      return data.success && data.dataUrl ? data.dataUrl : "";
    } catch (error) {
      console.error("Failed to convert image:", url, error);
      return "";
    }
  }

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
      let processedTransaction = { ...transaction };

      // ✅ Process attachments for each item in the items array
      if (transaction.items && Array.isArray(transaction.items)) {
        processedTransaction.items = await Promise.all(
          transaction.items.map(async (item: any) => {
            let attachmentBase64 = null;

            // If item has an attachment URL, convert it to base64
            if (item.attachment) {
              attachmentBase64 = await urlToBase64(item.attachment);
            }

            return {
              ...item,
              attachmentBase64, // ✅ Add base64 version for PDF rendering
            };
          }),
        );
      }

      const blob = await pdf(
        <DnPdf transaction={processedTransaction} />,
      ).toBlob();

      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `DN-${transactionID.toString().padStart(5, "0")}.pdf`;

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
      disabled={isProcessing}
      onClick={handleDownload}
    >
      DN (UNSIGNED)
      <img src={downloadIcon} alt="download" />
    </Button>
  );
}
