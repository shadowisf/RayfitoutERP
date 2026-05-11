"use client";

import { useEffect, useRef, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import Button from "@/app/components/Button";
import { MrPDF } from "@/app/(protected)/mr/[id]/components/MrPDF";
import { MrHeader } from "@/app/(protected)/mr/[id]/types/mrHeader";
import { toast } from "@/app/components/Toast";

// ── Spinner ──────────────────────────────────────────────────────────────────
const Spinner = ({ color = "black" }: { color?: string }) => (
  <div
    style={{
      width: "14px",
      height: "14px",
      border: `2px solid ${color}`,
      borderTop: "2px solid transparent",
      borderRadius: "50%",
      animation: "payActSpin 0.6s linear infinite",
      flexShrink: 0,
    }}
  />
);

// ── Helpers ──────────────────────────────────────────────────────────────────
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

function flattenLines(grouped: any): any[] {
  const flat: any[] = [];
  if (!grouped || typeof grouped !== "object") return flat;
  for (const category of Object.keys(grouped)) {
    const subs = grouped[category];
    if (!subs || typeof subs !== "object") continue;
    for (const sub of Object.keys(subs)) {
      const suppliers = subs[sub];
      if (!suppliers || typeof suppliers !== "object") continue;
      for (const supplier of Object.keys(suppliers)) {
        const items = suppliers[supplier];
        if (!Array.isArray(items)) continue;
        items.forEach((item) =>
          flat.push({
            ...item,
            material_category: category,
            material_subcategory: sub,
            approved_supplier_name: supplier,
          }),
        );
      }
    }
  }
  return flat;
}

function parseFileUrl(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed[0] ?? null) : raw;
  } catch {
    return raw;
  }
}

async function triggerDownload(url: string, filename: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error();
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objUrl);
  } catch {
    // Fallback: direct link with download attribute
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────
type SelectedRow = {
  id: number;
  mr_header_id: number;
  invoice_file: string | null;
  signed_lpo_file: string | null;
};

type Props = {
  selectedCount: number;
  selectedRows: SelectedRow[];
  onReset: () => void;
  onRecordPayment: () => void;
  onReject: () => void;
};

// ── Dropdown item style ───────────────────────────────────────────────────────
const dropdownItemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  width: "100%",
  padding: "10px 16px",
  textAlign: "left",
  background: "none",
  border: "none",
  cursor: "pointer",
  color: "black",
  fontSize: "13px",
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function PaymentActionsButton({
  selectedCount,
  selectedRows,
  onReset,
  onRecordPayment,
  onReject,
}: Props) {
  const downloadIcon = "/icons/download.svg";

  const [actionsOpen, setActionsOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const actionsRef = useRef<HTMLDivElement>(null);
  const downloadRef = useRef<HTMLDivElement>(null);

  // Close both dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        actionsRef.current &&
        !actionsRef.current.contains(e.target as Node)
      ) {
        setActionsOpen(false);
      }
      if (
        downloadRef.current &&
        !downloadRef.current.contains(e.target as Node)
      ) {
        setDownloadOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const hasSelection = selectedCount > 0;

  // ── Unique MR count ─────────────────────────────────────────────────────────
  const uniqueMrCount = new Set(selectedRows.map((r) => r.mr_header_id)).size;
  const invoiceCount = selectedRows.filter((r) =>
    parseFileUrl(r.invoice_file),
  ).length;
  const lpoFileCount = selectedRows.filter((r) =>
    parseFileUrl(r.signed_lpo_file),
  ).length;

  // ── Download MR PDFs ────────────────────────────────────────────────────────
  async function handleDownloadMR() {
    if (!hasSelection || isDownloading) return;
    setDownloadOpen(false);
    setIsDownloading(true);

    const uniqueMrIds = Array.from(
      new Set(selectedRows.map((r) => r.mr_header_id)),
    );
    let successCount = 0;

    try {
      for (const mrId of uniqueMrIds) {
        // Fetch MR header
        const headerRes = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMrHeaderByID`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: mrId }),
          },
        );
        if (!headerRes.ok) continue;
        const header: MrHeader = await headerRes.json();

        // Fetch MR lines
        const linesRes = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMrLinesByMrHeaderID`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: mrId }),
          },
        );
        if (!linesRes.ok) continue;
        const grouped = await linesRes.json();
        const lines = flattenLines(grouped);
        if (!lines.length) continue;

        // Convert image attachments to base64
        const processed = await Promise.all(
          lines.map(async (line) => {
            if (!line.attachments) return line;
            let urls: string[] = [];
            if (Array.isArray(line.attachments)) {
              urls = line.attachments;
            } else if (
              typeof line.attachments === "string" &&
              line.attachments.trim()
            ) {
              try {
                urls = JSON.parse(line.attachments);
              } catch {
                urls = [line.attachments];
              }
            }
            if (!urls.length) return line;
            const b64 = await Promise.all(urls.map(urlToBase64));
            return { ...line, attachments: b64.filter(Boolean) };
          }),
        );

        const blob = await pdf(
          <MrPDF mrHeader={header} mrLines={processed} />,
        ).toBlob();
        const objUrl = URL.createObjectURL(blob);
        triggerDownload(objUrl, `MR-${String(mrId).padStart(5, "0")}.pdf`);
        URL.revokeObjectURL(objUrl);
        successCount++;
      }

      if (successCount > 0) {
        toast(
          `Downloaded ${successCount} MR PDF${successCount !== 1 ? "s" : ""}`,
          "success",
        );
      } else {
        toast("No MR PDFs could be generated", "error");
      }
    } catch {
      toast("Failed to generate MR PDFs. Please try again.", "error");
    } finally {
      setIsDownloading(false);
    }
  }

  // ── Download signed LPO files ────────────────────────────────────────────────
  async function handleDownloadLPO() {
    if (!hasSelection || isDownloading) return;
    setDownloadOpen(false);
    setIsDownloading(true);

    let successCount = 0;
    try {
      for (const row of selectedRows) {
        const url = parseFileUrl(row.signed_lpo_file);
        if (!url) continue;
        await triggerDownload(url, `LPO-${String(row.id).padStart(5, "0")}`);
        successCount++;
        // Small delay between multiple downloads to avoid browser blocking
        if (selectedRows.length > 1)
          await new Promise((r) => setTimeout(r, 300));
      }
      if (successCount > 0) {
        toast(
          `Downloading ${successCount} LPO file${successCount !== 1 ? "s" : ""}`,
          "success",
        );
      } else {
        toast("No signed LPO files available for selected rows", "error");
      }
    } catch {
      toast("Failed to download LPO files. Please try again.", "error");
    } finally {
      setIsDownloading(false);
    }
  }

  // ── Download invoice files ───────────────────────────────────────────────────
  async function handleDownloadInvoice() {
    if (!hasSelection || isDownloading) return;
    setDownloadOpen(false);
    setIsDownloading(true);

    let successCount = 0;
    try {
      for (const row of selectedRows) {
        const url = parseFileUrl(row.invoice_file);
        if (!url) continue;
        await triggerDownload(
          url,
          `Invoice-LPO-${String(row.id).padStart(5, "0")}`,
        );
        successCount++;
        if (selectedRows.length > 1)
          await new Promise((r) => setTimeout(r, 300));
      }
      if (successCount > 0) {
        toast(
          `Downloading ${successCount} invoice${successCount !== 1 ? "s" : ""}`,
          "success",
        );
      } else {
        toast("No invoice files available for selected rows", "error");
      }
    } catch {
      toast("Failed to download invoice files. Please try again.", "error");
    } finally {
      setIsDownloading(false);
    }
  }

  // ── Shared dropdown container style ─────────────────────────────────────────
  const dropdownStyle: React.CSSProperties = {
    position: "absolute",
    top: "calc(100% + 4px)",
    right: 0,
    backgroundColor: "white",
    border: "1px solid rgba(207,207,207,1)",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
    zIndex: 200,
    minWidth: "240px",
    overflow: "hidden",
  };

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {/* Reset selection */}
        <Button
          componentType="button"
          bgColor={hasSelection ? "black" : "white"}
          borderColor={hasSelection ? "black" : "rgba(211,211,211,1)"}
          textColor={hasSelection ? "white" : "black"}
          disabled={!hasSelection}
          onClick={onReset}
        >
          RESET
        </Button>

        {/* Actions dropdown */}
        <div ref={actionsRef} style={{ position: "relative" }}>
          <Button
            componentType="button"
            bgColor={hasSelection ? "black" : "white"}
            borderColor={hasSelection ? "black" : "rgba(211,211,211,1)"}
            textColor={hasSelection ? "white" : "black"}
            disabled={!hasSelection}
            onClick={() => hasSelection && setActionsOpen((v) => !v)}
          >
            ACTIONS
          </Button>

          {actionsOpen && (
            <div style={dropdownStyle}>
              {[
                {
                  label: `Record Payment (${selectedCount} LPO${selectedCount !== 1 ? "s" : ""})`,
                  onClick: () => {
                    setActionsOpen(false);
                    onRecordPayment();
                  },
                },
                {
                  label: `Reject Payment (${selectedCount} LPO${selectedCount !== 1 ? "s" : ""})`,
                  onClick: () => {
                    setActionsOpen(false);
                    onReject();
                  },
                },
              ].map(({ label, onClick }) => (
                <button
                  key={label}
                  type="button"
                  style={dropdownItemStyle}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLElement).style.backgroundColor =
                      "rgba(245,245,245,1)")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLElement).style.backgroundColor =
                      "transparent")
                  }
                  onClick={onClick}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Download dropdown */}
        <div ref={downloadRef} style={{ position: "relative" }}>
          <Button
            componentType="button"
            bgColor={hasSelection ? "black" : "white"}
            borderColor={hasSelection ? "black" : "rgba(211,211,211,1)"}
            textColor={hasSelection ? "white" : "black"}
            disabled={!hasSelection || isDownloading}
            onClick={() =>
              hasSelection && !isDownloading && setDownloadOpen((v) => !v)
            }
            style={{ padding: "9.5px 9.5px" }}
          >
            {isDownloading ? (
              <Spinner color={hasSelection ? "white" : "black"} />
            ) : (
              <img
                src={downloadIcon}
                alt="download"
                style={{
                  filter: hasSelection ? "invert(1)" : "none",
                  display: "block",
                }}
              />
            )}
          </Button>

          {downloadOpen && (
            <div style={dropdownStyle}>
              {[
                {
                  label: `Download MR (${uniqueMrCount} MR${uniqueMrCount !== 1 ? "s" : ""})`,
                  onClick: handleDownloadMR,
                },
                {
                  label: `Download LPO (${lpoFileCount} LPO${lpoFileCount !== 1 ? "s" : ""})`,
                  onClick: handleDownloadLPO,
                },
                {
                  label: `Download Invoice (${invoiceCount} Invoice${invoiceCount !== 1 ? "s" : ""})`,
                  onClick: handleDownloadInvoice,
                },
              ].map(({ label, onClick }) => (
                <button
                  key={label}
                  type="button"
                  style={dropdownItemStyle}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLElement).style.backgroundColor =
                      "rgba(245,245,245,1)")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLElement).style.backgroundColor =
                      "transparent")
                  }
                  onClick={onClick}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes payActSpin {
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
