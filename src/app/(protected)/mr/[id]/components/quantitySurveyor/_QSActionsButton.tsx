"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { pdf } from "@react-pdf/renderer";
import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import { MrLine } from "../../types/mrLine";
import { MrHeader } from "../../types/mrHeader";
import { MrPDF } from "../MrPDF";
import { toast } from "@/app/components/Toast";

type Props = {
  selectedItemIds: Set<number>;
  setSelectedItemIds: (ids: Set<number>) => void;
  allCategoryItems: MrLine[]; // all flat items visible in current category view
  mrHeader: MrHeader;
  category: string; // label shown in the PDF filename, e.g. "MECHANICAL" or "ALL"
};

export default function QSActionsButton({
  selectedItemIds,
  setSelectedItemIds,
  allCategoryItems,
  mrHeader,
  category,
}: Props) {
  const router = useRouter();

  const downloadIcon = "/icons/download.svg";

  // ── Dropdown states ────────────────────────────────────────────────────────
  const [actionsOpen, setActionsOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);

  // ── Confirm dialog states ──────────────────────────────────────────────────
  const [confirmRejectOpen, setConfirmRejectOpen] = useState(false);
  const [rejectText, setRejectText] = useState("");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const [isDownloading, setIsDownloading] = useState(false);

  // ── Outside-click refs ────────────────────────────────────────────────────
  const actionsRef = useRef<HTMLDivElement>(null);
  const downloadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node))
        setActionsOpen(false);
      if (
        downloadRef.current &&
        !downloadRef.current.contains(e.target as Node)
      )
        setDownloadOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Bulk actions ───────────────────────────────────────────────────────────
  async function handleBulkApprove() {
    setActionsOpen(false);
    const ids = Array.from(selectedItemIds);
    await Promise.all(
      ids.map((id) =>
        fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "setQSReviewNeedOrder", id }),
        }),
      ),
    );
    setSelectedItemIds(new Set());
    router.refresh();
  }

  async function handleBulkReject() {
    const ids = Array.from(selectedItemIds);
    await Promise.all(
      ids.map((id) =>
        fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "rejectItemQS",
            id,
            comment: rejectText,
          }),
        }),
      ),
    );
    setSelectedItemIds(new Set());
    setConfirmRejectOpen(false);
    setRejectText("");
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
    setDownloadOpen(false);
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

  function handleDownloadAll() {
    downloadPDF(allCategoryItems, category.replace(/\s+/g, "_") || "ALL");
  }

  function handleDownloadSelected() {
    const selected = allCategoryItems.filter((item) =>
      selectedItemIds.has(item.id),
    );
    downloadPDF(selected, "SELECTED");
  }

  // ── Shared dropdown menu styles ────────────────────────────────────────────
  const dropdownStyle: React.CSSProperties = {
    position: "absolute",
    top: "calc(100% + 4px)",
    right: 0,
    backgroundColor: "white",
    border: "1px solid rgba(207, 207, 207, 1)",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
    zIndex: 100,
    minWidth: "160px",
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
            componentType={"button"}
            bgColor={selectedItemIds.size === 0 ? "white" : "black"}
            borderColor={
              selectedItemIds.size === 0 ? "rgba(211, 211, 211, 1)" : "black"
            }
            textColor={selectedItemIds.size === 0 ? "black" : "white"}
            disabled={selectedItemIds.size === 0}
            onClick={() => {
              setActionsOpen((v) => !v);
              setDownloadOpen(false);
            }}
          >
            ACTIONS
          </Button>

          {actionsOpen && (
            <div style={dropdownStyle}>
              {[
                { label: "Approve", onClick: handleBulkApprove },
                {
                  label: "Reject",
                  onClick: () => {
                    setActionsOpen(false);
                    setConfirmRejectOpen(true);
                  },
                },
                {
                  label: "Delete",
                  onClick: () => {
                    setActionsOpen(false);
                    setConfirmDeleteOpen(true);
                  },
                },
              ].map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={opt.onClick}
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
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Download dropdown ──────────────────────────────────────────── */}
        <div ref={downloadRef} style={{ position: "relative" }}>
          <Button
            componentType={"button"}
            bgColor={selectedItemIds.size === 0 ? "white" : "black"}
            borderColor={
              selectedItemIds.size === 0 ? "rgba(211, 211, 211, 1)" : "black"
            }
            textColor={selectedItemIds.size === 0 ? "black" : "white"}
            style={{ padding: "9px 9px" }}
            disabled={isDownloading}
            onClick={() => {
              setDownloadOpen((v) => !v);
              setActionsOpen(false);
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

          {downloadOpen && (
            <div style={dropdownStyle}>
              {[
                { label: "All items", onClick: handleDownloadAll },
                {
                  label: "Selected items",
                  onClick: handleDownloadSelected,
                  disabled: selectedItemIds.size === 0,
                },
              ].map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  disabled={opt.disabled}
                  onClick={opt.onClick}
                  style={{
                    ...dropdownItemStyle,
                    opacity: opt.disabled ? 0.4 : 1,
                    cursor: opt.disabled ? "not-allowed" : "pointer",
                  }}
                  onMouseEnter={(e) => {
                    if (!opt.disabled)
                      (e.target as HTMLElement).style.backgroundColor =
                        "rgba(245,245,245,1)";
                  }}
                  onMouseLeave={(e) =>
                    ((e.target as HTMLElement).style.backgroundColor =
                      "transparent")
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Confirm reject ─────────────────────────────────────────────────── */}
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
          Are you sure you want to reject {selectedItemIds.size} selected item
          {selectedItemIds.size !== 1 ? "s" : ""}?
          <br />
          <br />
          <br />
          <div className="input-row full">
            <InputItem
              label={"COMMENTS"}
              value={rejectText}
              type={"textarea"}
              placeholder={"ENTER COMMENTS"}
              required
              onChange={(e) => setRejectText(e.target.value)}
            />
          </div>
        </FormPopUp>
      )}

      {/* ── Confirm delete ─────────────────────────────────────────────────── */}
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
          {selectedItemIds.size !== 1 ? "s" : ""}? This action cannot be undone.
        </FormPopUp>
      )}
    </>
  );
}
