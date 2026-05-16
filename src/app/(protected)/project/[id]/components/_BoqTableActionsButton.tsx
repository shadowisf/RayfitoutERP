"use client";

import { useEffect, useRef, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import Button from "@/app/components/Button";
import { BoqHeader } from "../boq/[boqId]/types/boqHeader";
import { BoqPDF } from "../boq/[boqId]/components/BoqPDF";
import { toast } from "@/app/components/Toast";
import { useAuth } from "@/app/context/AuthContext";

// ── Spinner ───────────────────────────────────────────────────────────────────
const Spinner = ({ color = "black" }: { color?: string }) => (
  <div
    style={{
      width: "14px",
      height: "14px",
      border: `2px solid ${color}`,
      borderTop: "2px solid transparent",
      borderRadius: "50%",
      animation: "boqActSpin 0.6s linear infinite",
      flexShrink: 0,
    }}
  />
);

// ── Shared styles ─────────────────────────────────────────────────────────────
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

// ── Types ─────────────────────────────────────────────────────────────────────
type Props = {
  selectedCount: number;
  selectedBoqs: BoqHeader[];
  onReset: () => void;
  onMerge: () => void;
  onDelete: () => void;
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function BoqTableActionsButton({
  selectedCount,
  selectedBoqs,
  onReset,
  onMerge,
  onDelete,
}: Props) {
  const { userInfo } = useAuth();
  const canSeePrice =
    userInfo?.departmentID === 8 ||
    userInfo?.departmentID === 12 ||
    userInfo?.departmentID === 10 ||
    userInfo?.departmentID === 16;

  const [actionsOpen, setActionsOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const actionsRef = useRef<HTMLDivElement>(null);
  const downloadRef = useRef<HTMLDivElement>(null);

  const hasSelection = selectedCount > 0;

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node))
        setActionsOpen(false);
      if (downloadRef.current && !downloadRef.current.contains(e.target as Node))
        setDownloadOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Download PDFs ─────────────────────────────────────────────────────────
  async function handleDownload(mode: "priced" | "unpriced" | "dn") {
    if (!hasSelection || isDownloading) return;
    setDownloadOpen(false);
    setIsDownloading(true);

    let successCount = 0;

    try {
      for (const boq of selectedBoqs) {
        const linesRes = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/boq/getBoqLineByBoqID`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ boq_id: boq.id }),
          },
        );
        if (!linesRes.ok) continue;
        const grouped = await linesRes.json();

        const blob = await pdf(
          <BoqPDF
            boqHeader={boq}
            boqLines={grouped}
            showPrices={mode === "priced"}
            showDN={mode === "dn"}
          />,
        ).toBlob();

        const suffix =
          mode === "priced" ? "PRICED" : mode === "dn" ? "DN" : "UNPRICED";
        const objUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = objUrl;
        link.download = `BOQ-${suffix}-${String(boq.id).padStart(5, "0")}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(objUrl);
        successCount++;

        if (selectedBoqs.length > 1) await new Promise((r) => setTimeout(r, 300));
      }

      if (successCount > 0) {
        toast(
          `Downloaded ${successCount} BOQ PDF${successCount !== 1 ? "s" : ""}`,
          "success",
        );
      } else {
        toast("No BOQ PDFs could be generated", "error");
      }
    } catch {
      toast("Failed to generate BOQ PDFs. Please try again.", "error");
    } finally {
      setIsDownloading(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const downloadOptions = [
    ...(canSeePrice
      ? [
          {
            label: `Download Priced PDF (${selectedCount})`,
            onClick: () => handleDownload("priced"),
          },
        ]
      : []),
    {
      label: `Download Unpriced PDF (${selectedCount})`,
      onClick: () => handleDownload("unpriced"),
    },
    {
      label: `Download DN PDF (${selectedCount})`,
      onClick: () => handleDownload("dn"),
    },
  ];

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
              {/* Merge — only enabled when exactly 2 BOQs are selected */}
              {(() => {
                const canMerge = selectedCount === 2;
                return (
                  <button
                    type="button"
                    style={{
                      ...dropdownItemStyle,
                      opacity: canMerge ? 1 : 0.4,
                      cursor: canMerge ? "pointer" : "not-allowed",
                    }}
                    onMouseEnter={(e) => {
                      if (canMerge)
                        (e.currentTarget as HTMLElement).style.backgroundColor =
                          "rgba(245,245,245,1)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor =
                        "transparent";
                    }}
                    onClick={() => {
                      if (!canMerge) return;
                      setActionsOpen(false);
                      onMerge();
                    }}
                  >
                    Merge (select exactly 2)
                  </button>
                );
              })()}

              {/* Delete */}
              <button
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
                onClick={() => {
                  setActionsOpen(false);
                  onDelete();
                }}
              >
                {`Delete (${selectedCount} BOQ${selectedCount !== 1 ? "s" : ""})`}
              </button>
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
                src="/icons/download.svg"
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
              {downloadOptions.map(({ label, onClick }) => (
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
        @keyframes boqActSpin {
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
