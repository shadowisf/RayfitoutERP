"use client";

import { useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { MaterialListPDF } from "./MaterialListPDF";
import { PredefinedItem } from "@/app/components/_MultipleSelectMaterialItemButton";
import Button from "@/app/components/Button";
import LoadingSpinner from "@/app/components/LoadingSpinner";

type Props = {
  allItems: PredefinedItem[];
  style?: React.CSSProperties;
};

export default function ExportMaterialListPDFButton({
  allItems,
  style,
}: Props) {
  const downloadIcon = "/icons/download.svg";
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    if (isExporting || allItems.length === 0) return;
    setIsExporting(true);
    try {
      const exportDate = new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      const blob = await pdf(
        <MaterialListPDF items={allItems} exportDate={exportDate} />,
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Material-List-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error generating material list PDF:", err);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <Button
      componentType="button"
      bgColor="rgba(255,255,255,1)"
      borderColor="rgba(207,207,207,1)"
      textColor="black"
      onClick={handleExport}
      disabled={isExporting || allItems.length === 0}
      style={style}
    >
      {isExporting ? (
        <LoadingSpinner
          size={14}
          color="black"
          style={{ padding: 0 }}
        />
      ) : (
        <>
          EXPORT MATERIAL LIST
          <img src={downloadIcon} alt="" />
        </>
      )}
    </Button>
  );
}
