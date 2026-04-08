"use client";

import { useState } from "react";
import { pdf } from "@react-pdf/renderer";
import Button from "@/app/components/Button";
import { InventoryListPdf } from "./InventoryListPdf";
import { InventoryItem } from "../types/inventoryItem";
import { toast } from "@/app/components/Toast";

type ActiveFilters = {
  subcategories?: string[];
  stockAddedIn?: string;
  stockStatuses?: string[];
  projects?: string[];
  locations?: string[];
};

type Props = {
  filteredItems: InventoryItem[];
  pageQuantities: {
    [itemId: number]: {
      available_quantity: number;
      total_stock: number;
      total_issued: number;
    };
  };
  activeFilters: ActiveFilters;
};

export default function DownloadInventoryListPdfButton({
  filteredItems,
  pageQuantities,
  activeFilters,
}: Props) {
  const downloadIcon = "/icons/download.svg";
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

  async function handleDownload() {
    if (isProcessing || filteredItems.length === 0) return;

    setIsProcessing(true);

    try {
      // Fetch ALL quantities for filtered items (not just current page)
      const allQuantities: {
        [itemId: number]: {
          available_quantity: number;
          total_stock: number;
          total_issued: number;
        };
      } = { ...pageQuantities };

      // Fetch quantities for items not in pageQuantities
      const missingItems = filteredItems.filter(
        (item) => !allQuantities[item.id],
      );

      if (missingItems.length > 0) {
        const batchSize = 10;
        for (let i = 0; i < missingItems.length; i += batchSize) {
          const batch = missingItems.slice(i, i + batchSize);
          const results = await Promise.all(
            batch.map(async (item) => {
              try {
                const response = await fetch(
                  `${process.env.NEXT_PUBLIC_BASE_URL}/api/stock/getTotalQuantityByInventoryItemID`,
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ inventory_item_id: item.id }),
                  },
                );
                const data = await response.json();
                if (data.success && data.data) {
                  return {
                    itemId: item.id,
                    quantity: {
                      available_quantity: data.data.available_quantity || 0,
                      total_stock: data.data.total_stock || 0,
                      total_issued: data.data.total_issued || 0,
                    },
                  };
                }
              } catch {
                // ignore
              }
              return {
                itemId: item.id,
                quantity: {
                  available_quantity: 0,
                  total_stock: 0,
                  total_issued: 0,
                },
              };
            }),
          );

          results.forEach((r) => {
            allQuantities[r.itemId] = r.quantity;
          });
        }
      }

      // Convert images to base64 (limit to first 5 per batch for performance)
      const pdfItems = await Promise.all(
        filteredItems.map(async (item) => {
          let imageBase64: string | null = null;
          if (item.image) {
            try {
              imageBase64 = await urlToBase64(item.image);
            } catch {
              imageBase64 = null;
            }
          }

          const qty = allQuantities[item.id];

          return {
            id: item.id,
            description: item.description,
            image: item.image,
            imageBase64,
            unit: item.unit,
            availableQty: qty?.available_quantity ?? 0,
            minimumStockQuantity: item.minimum_stock_quantity,
          };
        }),
      );

      const generatedDate = new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const blob = await pdf(
        <InventoryListPdf
          items={pdfItems}
          activeFilters={activeFilters}
          generatedDate={generatedDate}
        />,
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Inventory-List-${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("PDF download failed:", error);
      toast("Failed to generate PDF", "error");
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <Button
      componentType={"button"}
      bgColor={"white"}
      borderColor={"rgba(231, 231, 231, 1)"}
      textColor={"black"}
      onClick={handleDownload}
      disabled={isProcessing || filteredItems.length === 0}
      style={{
        opacity: isProcessing ? 0.5 : 1,
        cursor: isProcessing ? "not-allowed" : "pointer",
      }}
    >
      EXPORT INVENTORY LIST
      <img src={downloadIcon} alt="download" />
    </Button>
  );
}
