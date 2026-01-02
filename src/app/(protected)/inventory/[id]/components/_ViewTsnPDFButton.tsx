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

  const [transaction, setTransaction] = useState<any>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  async function urlToBase64(url: string): Promise<string> {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/s3/getImage`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success || !data.dataUrl) {
        throw new Error("Invalid response from proxy");
      }

      return data.dataUrl;
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
            body: JSON.stringify({ id: transferID }),
          }
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
  }, [transferID]);

  useEffect(() => {
    async function generatePdfBlob() {
      if (!transaction) return;

      setIsProcessing(true);

      try {
        // Process attachment images if they exist
        let processedTransaction: any = { ...transaction };

        if (transaction.attachment) {
          try {
            let urls: string[] = [];

            // Parse attachment field
            if (Array.isArray(transaction.attachment)) {
              urls = transaction.attachment;
            } else if (typeof transaction.attachment === "string") {
              if (transaction.attachment.trim() !== "") {
                const parsed = JSON.parse(transaction.attachment);

                urls = Array.isArray(parsed) ? parsed : [];
              }
            } else if (typeof transaction.attachment === "object") {
              // It might be a JSON object already parsed by the database driver
              if (Array.isArray(transaction.attachment)) {
                urls = transaction.attachment;
              }
            }

            if (Array.isArray(urls) && urls.length > 0) {
              // Convert all images to base64
              const base64Images = await Promise.all(
                urls.map((url) => {
                  return urlToBase64(url);
                })
              );

              // Filter out failed conversions
              const validImages = base64Images.filter((img) => img !== "");

              processedTransaction = {
                ...transaction,
                attachment: validImages,
              };
            }
          } catch (error) {
            console.error("Error processing transaction attachments:", error);
          }
        }

        // Generate PDF blob with processed images
        const blob = await pdf(
          <TsnPDF transaction={processedTransaction} />
        ).toBlob();

        // Create blob URL
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);

        // Cleanup function to revoke the URL when component unmounts
        return () => {
          URL.revokeObjectURL(url);
        };
      } catch (error) {
        console.error("Error generating PDF blob:", error);
      } finally {
        setIsProcessing(false);
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
        target="_blank"
        style={{
          padding: "7px 7px",
          cursor: isProcessing ? "not-allowed" : "pointer",
          opacity: isProcessing ? 0.5 : 1,
        }}
        disabled={isProcessing || !pdfUrl}
      >
        <img src={externalLinkIcon} alt="view pdf" />
      </Button>
    </>
  );
}
