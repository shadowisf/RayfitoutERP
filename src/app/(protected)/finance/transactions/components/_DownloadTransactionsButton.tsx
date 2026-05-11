"use client";

import { useEffect, useRef, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import Button from "@/app/components/Button";
import { toast } from "@/app/components/Toast";
import {
  TransactionsPDF,
  type TransactionRow,
} from "./TransactionsPDF";

// ── Types ─────────────────────────────────────────────────────────────────────

type Transaction = {
  lpo_id: number;
  payment_entry_id: number | null;
  mr_header_id: number;
  display_id: string;
  vendor_name: string;
  vendor_type: string;
  requester: string;
  project_name: string;
  total: number;
  payment_date: string | null;
  created_at: string;
  payment_file: string | null;
  material_categories: string[];
};

type Props = {
  /** All filtered+sorted rows — used for the "All" download option. */
  allRows: Transaction[];
  /** IDs of rows the user has checked — used for "Selected" option. */
  selectedIds: Set<number>;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildDateLabel(rows: Transaction[]): string {
  const fmtDate = (d: Date) =>
    d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  // Only use actual payment_date values — ignore rows with no payment date
  const timestamps = rows
    .map((r) => r.payment_date)
    .filter(Boolean)
    .map((d) => new Date(d!).getTime());

  if (!timestamps.length) return "-";
  const min = new Date(Math.min(...timestamps));
  const max = new Date(Math.max(...timestamps));
  if (min.getTime() === max.getTime()) return fmtDate(min);
  return `${fmtDate(min)} - ${fmtDate(max)}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DownloadTransactionsButton({
  allRows,
  selectedIds,
}: Props) {
  const downloadIcon = "/icons/download.svg";

  const [open, setOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectedRows = allRows.filter((r) => selectedIds.has(r.lpo_id));
  const selectedCount = selectedRows.length;

  const handleDownload = async (mode: "all" | "selected") => {
    setOpen(false);
    const rows = mode === "all" ? allRows : selectedRows;

    if (!rows.length) {
      toast("No transactions to export", "error");
      return;
    }

    setIsDownloading(true);
    try {
      const dateLabel = buildDateLabel(rows);
      const totalValue = rows.reduce((s, r) => s + r.total, 0);

      const blob = await pdf(
        <TransactionsPDF
          transactions={rows as TransactionRow[]}
          dateLabel={dateLabel}
          totalTransactions={rows.length}
          totalValue={totalValue}
        />,
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `transactions-${Date.now()}.pdf`;
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
          {/* All */}
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
              textAlign: "left",
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
            <span
              style={{ fontSize: 11, fontWeight: 600, color: "rgba(130,130,130,1)" }}
            >
              {allRows.length.toLocaleString()}
            </span>
          </button>

          {/* Selected */}
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
              textAlign: "left",
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
            <span
              style={{ fontSize: 11, fontWeight: 600, color: "rgba(130,130,130,1)" }}
            >
              {selectedCount.toLocaleString()}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
