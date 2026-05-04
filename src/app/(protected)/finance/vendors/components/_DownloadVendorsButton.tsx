"use client";

import { useEffect, useRef, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import Button from "@/app/components/Button";
import { toast } from "@/app/components/Toast";
import { VendorsPDF, type VendorRow } from "./VendorsPDF";
import type { DateRange } from "../../transactions/components/_DateRangeButton";

type Vendor = {
  supplier_id: number;
  supplier_name: string;
  payment_type: string;
  total_lpos: number;
  amount: number;
  [key: string]: any;
};

type Props = {
  allRows: Vendor[];
  selectedIds: Set<number>;
  dateRange: DateRange;
};

function buildDateLabel(dateRange: DateRange): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  if (dateRange.start && dateRange.end)
    return `${fmt(dateRange.start)} - ${fmt(dateRange.end)}`;
  if (dateRange.start) return fmt(dateRange.start);
  if (dateRange.end) return fmt(dateRange.end);
  return "-";
}

export default function DownloadVendorsButton({
  allRows,
  selectedIds,
  dateRange,
}: Props) {
  const downloadIcon = "/icons/download.svg";

  const [open, setOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      )
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectedRows = allRows.filter((r) => selectedIds.has(r.supplier_id));
  const selectedCount = selectedRows.length;

  const handleDownload = async (mode: "all" | "selected") => {
    setOpen(false);
    const rows = mode === "all" ? allRows : selectedRows;
    if (!rows.length) {
      toast("No vendors to export", "error");
      return;
    }
    setIsDownloading(true);
    try {
      const blob = await pdf(
        <VendorsPDF
          vendors={rows as VendorRow[]}
          dateLabel={buildDateLabel(dateRange)}
          totalVendors={rows.length}
        />,
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `vendors-${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF generation error:", err);
      toast("Failed to generate PDF. Please try again.", "error");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <Button
        componentType="button"
        bgColor="white"
        borderColor="rgba(241,244,246,1)"
        textColor="black"
        onClick={() => setOpen((o) => !o)}
        disabled={isDownloading || allRows.length === 0}
        style={{ padding: "7px 7px" }}
      >
        <img src={downloadIcon} alt="download" />
      </Button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            zIndex: 100,
            backgroundColor: "white",
            border: "1px solid rgba(223,223,223,1)",
            borderRadius: 10,
            padding: "6px 0",
            minWidth: 200,
            boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
          }}
        >
          <button
            onClick={() => handleDownload("all")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              padding: "9px 16px",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              color: "black",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.backgroundColor =
                "rgba(245,245,245,1)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.backgroundColor =
                "transparent")
            }
          >
            <span>All</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(130,130,130,1)" }}>
              {allRows.length.toLocaleString()}
            </span>
          </button>

          <button
            onClick={() => handleDownload("selected")}
            disabled={selectedCount === 0}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              padding: "9px 16px",
              background: "none",
              border: "none",
              cursor: selectedCount === 0 ? "not-allowed" : "pointer",
              fontSize: 13,
              fontWeight: 600,
              opacity: selectedCount === 0 ? 0.4 : 1,
              color: "black",
            }}
            onMouseEnter={(e) => {
              if (selectedCount > 0)
                (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                  "rgba(245,245,245,1)";
            }}
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.backgroundColor =
                "transparent")
            }
          >
            <span>Selected</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(130,130,130,1)" }}>
              {selectedCount.toLocaleString()}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
