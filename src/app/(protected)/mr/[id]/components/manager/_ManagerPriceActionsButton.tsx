"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { pdf } from "@react-pdf/renderer";
import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import { MrLine } from "../../types/mrLine";
import { MrHeader } from "../../types/mrHeader";
import { toast } from "@/app/components/Toast";
import { MrPDF } from "../MrPDF";

type Props = {
  selectedItemIds: Set<number>;
  setSelectedItemIds: (ids: Set<number>) => void;
  allCategoryItems: MrLine[];
  mrHeader: MrHeader;
  mrLines: any;
};

const Spinner = ({ color = "white" }: { color?: string }) => (
  <div
    style={{
      width: "16px",
      height: "16px",
      border: `2px solid ${color}`,
      borderTop: "2px solid transparent",
      borderRadius: "50%",
      animation: "spin 0.6s linear infinite",
      flexShrink: 0,
    }}
  />
);

export default function ManagerPriceActionsButton({
  selectedItemIds,
  setSelectedItemIds,
  allCategoryItems,
  mrHeader,
  mrLines,
}: Props) {
  const router = useRouter();
  const diamondIcon = "/icons/diamond.svg";
  const downloadIcon = "/icons/download.svg";

  const [actionsOpen, setActionsOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isAutoSelecting, setIsAutoSelecting] = useState(false);
  const [confirmRejectOpen, setConfirmRejectOpen] = useState(false);
  const [rejectText, setRejectText] = useState("");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const actionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node))
        setActionsOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function handleAutoSelect() {
    setActionsOpen(false);
    setIsAutoSelecting(true);

    const ids = Array.from(selectedItemIds);
    let successful = 0;
    let failed = 0;

    try {
      for (const itemId of ids) {
        try {
          const res = await fetch(
            "/api/supplier/getAllSupplierAndQuotationByMrLineID",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: itemId }),
            },
          );
          if (!res.ok) {
            failed++;
            continue;
          }
          const quotations = await res.json();
          if (!quotations || quotations.length === 0) {
            failed++;
            continue;
          }

          const lowest = quotations.reduce((prev: any, curr: any) =>
            Number(curr.total_price) < Number(prev.total_price) ? curr : prev,
          );

          const approveRes = await fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL}/api/supplier`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "approveSupplierAndQuotation",
                quotation_id: lowest.id,
                mr_line_id: itemId,
                supplier_id: lowest.supplier_id,
              }),
            },
          );
          if (approveRes.ok) successful++;
          else failed++;
        } catch {
          failed++;
        }
      }

      if (successful > 0 && failed === 0) {
        toast(
          `Auto select: ${successful} vendor${successful > 1 ? "s" : ""} approved`,
          "success",
        );
      } else if (successful > 0) {
        toast(
          `Auto select: ${successful} approved, ${failed} failed`,
          "warning",
        );
      } else {
        toast("Auto select failed", "error");
      }

      setSelectedItemIds(new Set());
      window.dispatchEvent(new CustomEvent("quotationsUpdated"));
      router.refresh();
    } finally {
      setIsAutoSelecting(false);
    }
  }

  async function handleBulkReject() {
    const ids = Array.from(selectedItemIds);
    await Promise.all(
      ids.map((id) =>
        fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/supplier`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "rejectAllSupplierAndQuotation",
            reject_comment: rejectText,
            mr_line_id: id,
          }),
        }),
      ),
    );
    setSelectedItemIds(new Set());
    setConfirmRejectOpen(false);
    setRejectText("");
    window.dispatchEvent(new CustomEvent("quotationsUpdated"));
    router.refresh();
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedItemIds);
    await Promise.all(
      ids.map((id) =>
        fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "deleteItem", id }),
        }),
      ),
    );
    setSelectedItemIds(new Set());
    setConfirmDeleteOpen(false);
    router.refresh();
  }

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
      if (!response.ok) return "";
      const data = await response.json();
      if (!data.success || !data.dataUrl) return "";
      return data.dataUrl;
    } catch {
      return "";
    }
  }

  async function handleDownloadSelected() {
    if (isDownloading || selectedItemIds.size === 0) return;

    const selectedLines = allCategoryItems.filter((item) =>
      selectedItemIds.has(item.id),
    );

    setIsDownloading(true);
    try {
      const processedLines = await Promise.all(
        selectedLines.map(async (line) => {
          if (!line.attachment) return line;
          try {
            let urls: string[] = [];
            if (Array.isArray(line.attachment)) {
              urls = line.attachment;
            } else if (typeof line.attachment === "string") {
              if (line.attachment.trim() === "") return line;
              try {
                urls = JSON.parse(line.attachment);
              } catch {
                urls = [line.attachment];
              }
            }
            if (!Array.isArray(urls) || urls.length === 0) return line;
            const base64Images = await Promise.all(urls.map(urlToBase64));
            return {
              ...line,
              attachment: base64Images.filter((img) => img !== ""),
            };
          } catch {
            return line;
          }
        }),
      );

      const blob = await pdf(
        <MrPDF mrHeader={mrHeader} mrLines={processedLines as any[]} />,
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `MR-${String(mrHeader.id).padStart(5, "0")}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast("Failed to generate PDF. Please try again.", "error");
    } finally {
      setIsDownloading(false);
    }
  }

  const isBusy = isAutoSelecting || isDownloading;

  const dropdownStyle: React.CSSProperties = {
    position: "absolute",
    top: "calc(100% + 4px)",
    right: 0,
    backgroundColor: "white",
    border: "1px solid rgba(207, 207, 207, 1)",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
    zIndex: 100,
    minWidth: "220px",
    overflow: "hidden",
  };

  const dropdownItemStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
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
        {/* ACTIONS dropdown */}
        <div ref={actionsRef} style={{ position: "relative" }}>
          <Button
            componentType="button"
            bgColor={selectedItemIds.size === 0 ? "white" : "black"}
            borderColor={
              selectedItemIds.size === 0 ? "rgba(211,211,211,1)" : "black"
            }
            textColor={selectedItemIds.size === 0 ? "black" : "white"}
            onClick={() => !isAutoSelecting && setActionsOpen((v) => !v)}
            disabled={selectedItemIds.size === 0 || isAutoSelecting}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor:
                selectedItemIds.size === 0 || isAutoSelecting
                  ? "not-allowed"
                  : "pointer",
              opacity: isAutoSelecting ? 0.7 : 1,
              transition: "opacity 0.2s ease",
              pointerEvents: isAutoSelecting ? "none" : "auto",
            }}
          >
            {isAutoSelecting ? (
              <>
                <Spinner color="white" />
                LOADING
              </>
            ) : (
              "ACTIONS"
            )}
          </Button>

          {actionsOpen && (
            <div style={dropdownStyle}>
              {/* Auto select */}
              <button
                type="button"
                onClick={handleAutoSelect}
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
                <span>Auto select ({selectedItemIds.size})</span>
                <img src={diamondIcon} alt="smart select" />
              </button>

              {/* Reject */}
              <button
                type="button"
                onClick={() => {
                  setActionsOpen(false);
                  setConfirmRejectOpen(true);
                }}
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
                Reject
              </button>

              {/* Delete */}
              <button
                type="button"
                onClick={() => {
                  setActionsOpen(false);
                  setConfirmDeleteOpen(true);
                }}
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
                Delete
              </button>
            </div>
          )}
        </div>

        {/* Download selected items as PDF */}
        <Button
          componentType="button"
          bgColor={selectedItemIds.size === 0 ? "white" : "black"}
          borderColor={
            selectedItemIds.size === 0 ? "rgba(211, 211, 211, 1)" : "black"
          }
          textColor={selectedItemIds.size === 0 ? "black" : "white"}
          style={{
            padding: "9px 9px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor:
              selectedItemIds.size === 0 || isDownloading
                ? "not-allowed"
                : "pointer",
            opacity: isDownloading ? 0.7 : 1,
            transition: "opacity 0.2s ease",
            pointerEvents: isDownloading ? "none" : "auto",
          }}
          disabled={selectedItemIds.size === 0 || isDownloading}
          onClick={() => {
            setActionsOpen(false);
            handleDownloadSelected();
          }}
        >
          {isDownloading ? (
            <Spinner
              color={selectedItemIds.size === 0 ? "black" : "white"}
            />
          ) : (
            <img
              src={downloadIcon}
              alt="download"
              style={
                selectedItemIds.size === 0
                  ? { filter: "invert(0)" }
                  : { filter: "invert(1)" }
              }
            />
          )}
        </Button>
      </div>

      {/* Confirm reject */}
      {confirmRejectOpen && (
        <FormPopUp
          header="REJECT SELECTED ITEMS"
          setIsOpen={(open) => {
            if (!open) {
              setConfirmRejectOpen(false);
              setRejectText("");
            }
          }}
          handleSubmit={handleBulkReject}
          addButtonLabel="CONFIRM"
        >
          Are you sure you want to reject all quotations for{" "}
          {selectedItemIds.size} item
          {selectedItemIds.size !== 1 ? "s" : ""}?
          <br />
          <br />
          <br />
          <div className="input-row full">
            <InputItem
              label="COMMENTS"
              value={rejectText}
              type="textarea"
              placeholder="ENTER COMMENTS"
              required
              onChange={(e) => setRejectText(e.target.value)}
            />
          </div>
        </FormPopUp>
      )}

      {/* Confirm delete */}
      {confirmDeleteOpen && (
        <FormPopUp
          header="DELETE SELECTED ITEMS"
          setIsOpen={(open) => {
            if (!open) setConfirmDeleteOpen(false);
          }}
          handleSubmit={handleBulkDelete}
          addButtonLabel="CONFIRM"
        >
          Are you sure you want to delete {selectedItemIds.size} selected item
          {selectedItemIds.size !== 1 ? "s" : ""}? This action cannot be
          undone.
        </FormPopUp>
      )}

      <style jsx>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </>
  );
}
