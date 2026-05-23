"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { pdf } from "@react-pdf/renderer";
import Button from "@/app/components/Button";
import { MrLine } from "../../types/mrLine";
import { MrHeader } from "../../types/mrHeader";
import { MrPDF } from "../MrPDF";
import { toast } from "@/app/components/Toast";
import SupplierAndQuotationButton from "./_SupplierAndQuotationButton";
import BulkQuotationCreator, {
  BulkQuotationItem,
} from "@/app/(protected)/mr/components/_BulkQuotationCreator";
import { useRefresh } from "@/app/context/RefreshContext";

type Props = {
  selectedItemIds: Set<number>;
  setSelectedItemIds: (ids: Set<number>) => void;
  allCategoryItems: MrLine[];
  mrHeader: MrHeader;
};

export default function ProcurementActionsButton({
  selectedItemIds,
  setSelectedItemIds,
  allCategoryItems,
  mrHeader,
}: Props) {
  const router = useRouter();
  const { refresh } = useRefresh();

  const downloadIcon = "/icons/download.svg";

  // ── Dropdown states ────────────────────────────────────────────────────────
  const [actionsOpen, setActionsOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // ── Single-item quotation trigger ─────────────────────────────────────────
  const [singleItemForQuotation, setSingleItemForQuotation] =
    useState<MrLine | null>(null);
  const [singleItemKey, setSingleItemKey] = useState(0);

  // ── Bulk quotation trigger ────────────────────────────────────────────────
  const [showBulkQuotation, setShowBulkQuotation] = useState(false);
  const [bulkQuotationKey, setBulkQuotationKey] = useState(0);

  // ── Outside-click refs ────────────────────────────────────────────────────
  const actionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node))
        setActionsOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Actions ────────────────────────────────────────────────────────────────
  function handleAddVendorAndQuotation() {
    setActionsOpen(false);

    if (selectedItemIds.size === 1) {
      const itemId = Array.from(selectedItemIds)[0];
      const item = allCategoryItems.find((i) => i.id === itemId) ?? null;
      if (item) {
        setSingleItemForQuotation(item);
        setSingleItemKey((k) => k + 1);
      }
    } else if (selectedItemIds.size > 1) {
      setBulkQuotationKey((k) => k + 1);
      setShowBulkQuotation(true);
    }
  }

  // ── PDF download ───────────────────────────────────────────────────────────
  async function urlToBase64(url: string): Promise<string> {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/s3/getImage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        },
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      return data.dataUrl || "";
    } catch {
      return "";
    }
  }

  async function downloadPDF(items: MrLine[], label: string) {
    if (!items.length) {
      toast("No items to export", "error");
      return;
    }
    setIsDownloading(true);
    try {
      const processed = await Promise.all(
        items.map(async (line) => {
          if (!line.attachment) return line;
          const b64 = await urlToBase64(line.attachment);
          return { ...line, attachment: b64 || line.attachment };
        }),
      );
      const blob = await pdf(
        <MrPDF mrHeader={mrHeader} mrLines={processed} />,
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `MR-${String(mrHeader.id).padStart(5, "0")}-${label}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      toast("Failed to generate PDF. Please try again.", "error");
    } finally {
      setIsDownloading(false);
    }
  }

  function handleDownloadSelected() {
    const selected = allCategoryItems.filter((item) =>
      selectedItemIds.has(item.id),
    );
    downloadPDF(selected, "SELECTED");
  }

  // ── Bulk quotation items ───────────────────────────────────────────────────
  const bulkItems: BulkQuotationItem[] = Array.from(selectedItemIds)
    .map((id) => allCategoryItems.find((i) => i.id === id))
    .filter((item): item is MrLine => !!item)
    .map((item) => ({
      line_id: item.id,
      mr_header_id: item.mr_header_id,
      material_description: item.material_description,
      quantity: item.quantity,
      unit: item.unit,
      progress_id: mrHeader.progress_id,
      type: mrHeader.type,
      delivery_location: item.delivery_location,
      progress_name: mrHeader.progress_name,
      requested_by: mrHeader.requested_by,
      project_name: item.project_name || mrHeader.project_name,
      lpo_id: null,
    }));

  // ── Shared dropdown styles ─────────────────────────────────────────────────
  const dropdownStyle: React.CSSProperties = {
    position: "absolute",
    top: "calc(100% + 4px)",
    right: 0,
    backgroundColor: "white",
    border: "1px solid rgba(207, 207, 207, 1)",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
    zIndex: 100,
    minWidth: "200px",
    overflow: "hidden",
  };

  const dropdownItemStyle: React.CSSProperties = {
    display: "block",
    width: "100%",
    padding: "10px 16px",
    textAlign: "left",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "black",
    fontWeight: "600",
    fontSize: "13px",
  };

  return (
    <>
      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        {/* ── Actions dropdown ───────────────────────────────────────────── */}
        <div ref={actionsRef} style={{ position: "relative" }}>
          <Button
            componentType="button"
            bgColor={selectedItemIds.size === 0 ? "white" : "black"}
            borderColor={
              selectedItemIds.size === 0 ? "rgba(211, 211, 211, 1)" : "black"
            }
            textColor={selectedItemIds.size === 0 ? "black" : "white"}
            disabled={selectedItemIds.size === 0}
            onClick={() => setActionsOpen((v) => !v)}
          >
            ACTIONS
          </Button>

          {actionsOpen && (
            <div style={dropdownStyle}>
              <button
                type="button"
                onClick={handleAddVendorAndQuotation}
                style={dropdownItemStyle}
                onMouseEnter={(e) =>
                  ((e.target as HTMLElement).style.backgroundColor =
                    "rgba(245,245,245,1)")
                }
                onMouseLeave={(e) =>
                  ((e.target as HTMLElement).style.backgroundColor =
                    "transparent")
                }
              >
                Add Vendor &amp; Quotation
              </button>
            </div>
          )}
        </div>

        {/* ── Download button (selected items only) ─────────────────────── */}
        <Button
          componentType="button"
          bgColor={selectedItemIds.size === 0 ? "white" : "black"}
          borderColor={
            selectedItemIds.size === 0 ? "rgba(211, 211, 211, 1)" : "black"
          }
          textColor={selectedItemIds.size === 0 ? "black" : "white"}
          style={{ padding: "9px 9px" }}
          disabled={selectedItemIds.size === 0 || isDownloading}
          onClick={() => {
            setActionsOpen(false);
            handleDownloadSelected();
          }}
        >
          <img
            src={downloadIcon}
            alt="download"
            style={
              selectedItemIds.size === 0
                ? { filter: "invert(0)" }
                : { filter: "invert(1)" }
            }
          />
        </Button>
      </div>

      {/* ── Single-item quotation popup (trigger button hidden off-screen) ── */}
      {singleItemForQuotation && (
        <div
          style={{
            position: "absolute",
            left: "-9999px",
            width: "1px",
            height: "1px",
            overflow: "hidden",
          }}
        >
          <SupplierAndQuotationButton
            key={singleItemKey}
            mrHeader={mrHeader}
            mrLine={singleItemForQuotation}
            initialOpen
            noTrigger
          />
        </div>
      )}

      {/* ── Bulk quotation creator ─────────────────────────────────────── */}
      {showBulkQuotation && bulkItems.length > 1 && (
        <BulkQuotationCreator
          key={bulkQuotationKey}
          selectedItems={bulkItems}
          onClear={() => {
            setShowBulkQuotation(false);
            setSelectedItemIds(new Set());
          }}
          onSuccess={async () => {
            setShowBulkQuotation(false);
            setSelectedItemIds(new Set());
            await refresh();
          }}
          openOnMount
          mrRef={mrHeader.identifier || String(mrHeader.id)}
        />
      )}
    </>
  );
}
