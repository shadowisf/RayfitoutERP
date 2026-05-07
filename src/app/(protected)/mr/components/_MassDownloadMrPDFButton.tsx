"use client";

import { useState } from "react";
import { pdf } from "@react-pdf/renderer";
import Button from "@/app/components/Button";
import { MrHeader } from "@/app/(protected)/mr/[id]/types/mrHeader";
import { MrPDF } from "../[id]/components/MrPDF";
import { toast } from "@/app/components/Toast";

const Spinner = ({ color = "black" }: { color?: string }) => (
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

type Props = {
  selectedMrIds: Set<number>;
  mrHeaders: MrHeader[];
};

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

export default function MassDownloadMrPDFButton({
  selectedMrIds,
  mrHeaders,
}: Props) {
  const downloadIcon = "/icons/download.svg";
  const [isDownloading, setIsDownloading] = useState(false);
  const hasSelection = selectedMrIds.size > 0;
  const isDisabled = !hasSelection || isDownloading;

  async function handleDownload() {
    if (isDisabled) return;
    setIsDownloading(true);

    const ids = Array.from(selectedMrIds);
    let successCount = 0;

    try {
      for (const mrId of ids) {
        const header = mrHeaders.find((h) => h.id === mrId);
        if (!header) continue;

        // Fetch lines
        const linesRes = await fetch("/api/mr/getMrLinesByMrHeaderID", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: mrId }),
        });
        if (!linesRes.ok) continue;
        const grouped = await linesRes.json();
        const lines = flattenLines(grouped);
        if (!lines.length) continue;

        // Convert attachments to base64
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
            const b64Images = await Promise.all(urls.map(urlToBase64));
            return { ...line, attachments: b64Images.filter(Boolean) };
          }),
        );

        // Generate and trigger download
        const blob = await pdf(
          <MrPDF mrHeader={header} mrLines={processed} />,
        ).toBlob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `MR-${String(mrId).padStart(5, "0")}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        successCount++;
      }

      if (successCount > 0) {
        toast(
          `Downloaded ${successCount} MR PDF${successCount > 1 ? "s" : ""}`,
          "success",
        );
      } else {
        toast("No PDFs could be generated", "error");
      }
    } catch {
      toast("Failed to generate PDFs. Please try again.", "error");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <>
      <Button
        componentType="button"
        bgColor={hasSelection ? "black" : "white"}
        borderColor={hasSelection ? "black" : "rgba(211, 211, 211, 1)"}
        textColor={hasSelection ? "white" : "black"}
        disabled={isDisabled}
        onClick={handleDownload}
        style={{
          padding: "9.5px 9.5px",
        }}
      >
        {isDownloading ? (
          <Spinner color="white" />
        ) : (
          <img
            src={downloadIcon}
            alt="download"
            style={{ filter: hasSelection ? "invert(1)" : "invert(0)" }}
          />
        )}
      </Button>

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
