"use client";

import Button from "@/app/components/Button";
import { BoqHeader } from "../../types/boqHeader";
import { BoqLine } from "../../types/boqLine";
import { pdf } from "@react-pdf/renderer";
import { BoqPDFWithPrice } from "../BoqPDFWithPrice";

type GroupedBoqLines = {
  [category: string]: {
    [subCategory: string]: BoqLine[];
  };
};

type DownloadBoqWithPriceButtonProps = {
  boqHeader: BoqHeader;
  boqLines: GroupedBoqLines;
  children: React.ReactNode;
};

export default function DownloadBoqWithPriceButton({
  boqHeader,
  boqLines,
  children,
}: DownloadBoqWithPriceButtonProps) {
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

  async function handleDownload() {
    if (!boqHeader || !boqLines) {
      return;
    }

    try {
      console.log("Processing images...");

      // Process BOQ lines and convert images to base64
      const processedLines: any = {};

      for (const category of Object.keys(boqLines)) {
        processedLines[category] = {};

        for (const subCategory of Object.keys(boqLines[category])) {
          const items = boqLines[category][subCategory];

          processedLines[category][subCategory] = await Promise.all(
            items.map(async (item) => {
              if (!item.attachments) return item;

              try {
                let urls: string[] = [];

                if (Array.isArray(item.attachments)) {
                  urls = item.attachments;
                } else if (typeof item.attachments === "string") {
                  if (item.attachments.trim() === "") return item;
                  urls = JSON.parse(item.attachments);
                }

                if (!Array.isArray(urls) || urls.length === 0) return item;

                console.log(
                  `Processing ${urls.length} images for item: ${item.item_name}`
                );

                // Convert first 3 images to base64
                // Convert all images to base64
                const base64Images = await Promise.all(
                  urls.map((url) => urlToBase64(url)) // ← Removed .slice(0, 3)
                );

                // Filter out failed conversions
                const validImages = base64Images.filter((img) => img !== "");

                console.log(
                  `Successfully converted ${validImages.length} images`
                );

                return {
                  ...item,
                  attachments: validImages,
                };
              } catch (error) {
                console.error("Error processing item attachments:", error);
                return item;
              }
            })
          );
        }
      }

      // Generate PDF blob
      const blob = await pdf(
        <BoqPDFWithPrice boqHeader={boqHeader} boqLines={processedLines} />
      ).toBlob();

      console.log("PDF generated successfully");

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `BOQ-WP-${String(boqHeader.id).padStart(5, "0")}.pdf`;

      // Trigger download
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log("Download complete");
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please check console for details.");
    }
  }

  return (
    <Button
      componentType={"button"}
      onClick={handleDownload}
      bgColor="white"
      borderColor="rgba(215, 215, 215, 1)"
      textColor="black"
      full
      style={{ padding: "20px 0px" }}
    >
      {children}
    </Button>
  );
}
