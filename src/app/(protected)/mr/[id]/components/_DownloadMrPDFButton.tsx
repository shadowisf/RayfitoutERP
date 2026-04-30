"use client";

import { useState, useMemo } from "react";
import { pdf } from "@react-pdf/renderer";
import Button from "@/app/components/Button";
import { MrHeader } from "@/app/(protected)/mr/[id]/types/mrHeader";
import { toast } from "@/app/components/Toast";
import { MrPDF } from "./MrPDF";

// Type for the nested structure returned by API
type GroupedMrLines = {
  [category: string]: {
    [subCategory: string]: {
      [supplier: string]: any[];
    };
  };
};

type MrLine = {
  id: number;
  material_description: string;
  quantity: number | string;
  approved_proposed_quantity?: number | string;
  unit?: string;
  boq_reference?: string;
  brand_specs?: string;
  attachments?: string[] | string;
  notes?: string;
  material_category?: string;
  material_subcategory?: string;
  approved_supplier_name?: string;
  boq_item_number?: string | null;
  [key: string]: any;
};

type props = {
  mrHeader: MrHeader;
  mrLines: MrLine[] | GroupedMrLines | Record<string, any>;
};

export default function DownloadMrPDFButton({ mrHeader, mrLines }: props) {
  const downloadIcon = "/icons/download.svg";

  const [isProcessing, setIsProcessing] = useState(false);

  // Flatten nested structure if needed (category → subcategory → supplier → items)
  const flattenedLines = useMemo(() => {
    // If already an array, return as-is
    if (Array.isArray(mrLines)) {
      return mrLines;
    }

    // If null/undefined/empty, return empty array
    if (!mrLines || typeof mrLines !== "object") {
      return [];
    }

    // Flatten nested structure
    const flat: MrLine[] = [];

    Object.entries(mrLines as GroupedMrLines).forEach(
      ([category, subCategories]) => {
        if (!subCategories || typeof subCategories !== "object") return;

        Object.entries(subCategories).forEach(([subCategory, suppliers]) => {
          if (!suppliers || typeof suppliers !== "object") return;

          Object.entries(suppliers).forEach(([supplier, items]) => {
            if (!Array.isArray(items)) return;

            items.forEach((item) => {
              flat.push({
                ...item,
                material_category: category,
                material_subcategory: subCategory,
                approved_supplier_name: supplier,
              });
            });
          });
        });
      },
    );

    return flat;
  }, [mrLines]);

  // URL to Base64 converter (same as BOQ)
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
        },
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
    if (isProcessing) return;

    if (!flattenedLines || flattenedLines.length === 0) {
      toast("No material lines to export", "error");
      return;
    }

    setIsProcessing(true);

    try {
      console.log("Processing MR line images...");

      // Process MR lines and convert images to base64 (same pattern as BOQ)
      const processedLines = await Promise.all(
        flattenedLines.map(async (line) => {
          if (!line.attachments) return line;

          try {
            let urls: string[] = [];

            if (Array.isArray(line.attachments)) {
              urls = line.attachments;
            } else if (typeof line.attachments === "string") {
              if (line.attachments.trim() === "") return line;
              try {
                urls = JSON.parse(line.attachments);
              } catch {
                // If not valid JSON, treat as single URL
                urls = [line.attachments];
              }
            }

            if (!Array.isArray(urls) || urls.length === 0) return line;

            console.log(
              `Processing ${urls.length} images for item: ${line.material_description}`,
            );

            // Convert all images to base64
            const base64Images = await Promise.all(
              urls.map((url) => urlToBase64(url)),
            );

            // Filter out failed conversions
            const validImages = base64Images.filter((img) => img !== "");

            console.log(`Successfully converted ${validImages.length} images`);

            return {
              ...line,
              attachments: validImages,
            };
          } catch (error) {
            console.error("Error processing line attachments:", error);
            return line;
          }
        }),
      );

      // Generate PDF blob
      const blob = await pdf(
        <MrPDF mrHeader={mrHeader} mrLines={processedLines} />,
      ).toBlob();

      console.log("MR Lines PDF generated successfully");

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `MR-${String(mrHeader.id).padStart(5, "0")}.pdf`;

      // Trigger download
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log("Download complete");
    } catch (error) {
      console.error("Error generating MR Lines PDF:", error);
      toast("Failed to generate PDF. Please try again.", "error");
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <Button
      componentType={"button"}
      bgColor={"rgba(255, 255, 255, 1)"}
      borderColor={"rgba(207, 207, 207, 1)"}
      textColor={"black"}
      onClick={handleDownload}
      disabled={isProcessing || flattenedLines.length === 0}
    >
      EXPORT MR <img src={downloadIcon} alt="download" />
    </Button>
  );
}
