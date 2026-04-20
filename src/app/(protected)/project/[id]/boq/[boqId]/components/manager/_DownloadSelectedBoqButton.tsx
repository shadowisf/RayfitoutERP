"use client";

import FormPopUp from "@/app/components/FormPopup";
import { useState } from "react";
import Button from "@/app/components/Button";
import { BoqHeader } from "../../types/boqHeader";
import { BoqLine } from "../../types/boqLine";
import { useAuth } from "@/app/context/AuthContext";
import { pdf } from "@react-pdf/renderer";
import { BoqPDF } from "../BoqPDF";
import { toast } from "@/app/components/Toast";

type GroupedBoqLines = {
  [category: string]: {
    [subCategory: string]: BoqLine[];
  };
};

type Props = {
  boqHeader: BoqHeader;
  selectedLines: BoqLine[];
  onClearSelection: () => void;
};

function groupSelectedLines(lines: BoqLine[]): GroupedBoqLines {
  const grouped: GroupedBoqLines = {};
  lines.forEach((line) => {
    const cat = line.category || "Uncategorized";
    const sub = line.sub_category || "General";
    if (!grouped[cat]) grouped[cat] = {};
    if (!grouped[cat][sub]) grouped[cat][sub] = [];
    grouped[cat][sub].push(line);
  });
  return grouped;
}

export default function DownloadSelectedBoqButton({
  boqHeader,
  selectedLines,
  onClearSelection,
}: Props) {
  const { userInfo } = useAuth();

  const canSeePrice =
    userInfo?.departmentID === 8 ||
    userInfo?.departmentID === 12 ||
    userInfo?.departmentID === 10 ||
    userInfo?.departmentID === 16;

  const downloadIcon = "/icons/download.svg";

  const [isOpen, setIsOpen] = useState(false);
  const [configMode, setConfigMode] = useState<
    "priced" | "unpriced" | "dn" | ""
  >("");

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
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
      const data = await response.json();
      if (!data.success || !data.dataUrl) throw new Error("Invalid response");
      return data.dataUrl;
    } catch (error) {
      console.error("Failed to convert image:", url, error);
      return "";
    }
  }

  async function handleDownload(e: React.FormEvent) {
    e.preventDefault();

    if (selectedLines.length === 0) {
      toast("No items selected", "error");
      return;
    }

    if (configMode === "") {
      toast("Please select a configuration", "error");
      return;
    }

    try {
      const grouped = groupSelectedLines(selectedLines);
      const processedLines: any = {};

      for (const category of Object.keys(grouped)) {
        processedLines[category] = {};

        for (const subCategory of Object.keys(grouped[category])) {
          const items = grouped[category][subCategory];

          processedLines[category][subCategory] = await Promise.all(
            items.map(async (item) => {
              if (!item.attachments) return item;

              try {
                let urls: string[] = [];
                if (Array.isArray(item.attachments)) {
                  urls = item.attachments;
                } else if (typeof item.attachments === "string") {
                  if (item.attachments.trim() === "") return item;
                  urls = JSON.parse(item.attachments);
                }

                if (!Array.isArray(urls) || urls.length === 0) return item;

                const base64Images = await Promise.all(
                  urls.map((url) => urlToBase64(url)),
                );
                const validImages = base64Images.filter((img) => img !== "");
                return { ...item, attachments: validImages };
              } catch {
                return item;
              }
            }),
          );
        }
      }

      const showPrices = configMode === "priced";
      const showDN = configMode === "dn";

      const blob = await pdf(
        <BoqPDF
          boqHeader={boqHeader}
          boqLines={processedLines}
          showPrices={showPrices}
          showDN={showDN}
        />,
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      let suffix = "";
      if (configMode === "priced") suffix = "PRICED";
      else if (configMode === "unpriced") suffix = "UNPRICED";
      else if (configMode === "dn") suffix = "DN";

      link.download = `BOQ-SELECTED-${suffix}-${String(boqHeader.id).padStart(5, "0")}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setIsOpen(false);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast(
        "Failed to generate PDF. Please check console for details.",
        "error",
      );
    }
  }

  if (selectedLines.length === 0) return null;

  return (
    <>
      {/* bottom-nav has z-index:5 stacking context — FormPopUp must be a sibling
          OUTSIDE this div so its z-index:1000 is evaluated in the root context,
          not trapped below the scroll arrows (z-index:10 in root). */}
      <div className="bottom-nav">
        <div></div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Button
            componentType={"button"}
            bgColor={"black"}
            borderColor={"white"}
            textColor={"white"}
            onClick={onClearSelection}
          >
            CANCEL
          </Button>
          <Button
            componentType={"button"}
            bgColor={"white"}
            borderColor={"white"}
            textColor={"black"}
            onClick={() => setIsOpen(true)}
          >
            EXPORT SELECTED BOQ ITEM(S)
            <img src={downloadIcon} alt="download" />
          </Button>
        </div>
      </div>

      {isOpen && (
        <FormPopUp
          header={"EXPORT SELECTED BOQ ITEM(S)"}
          setIsOpen={setIsOpen}
          addButtonLabel="CONFIRM"
          handleSubmit={handleDownload}
        >
          <div>
            <h3 style={{ marginBottom: "15px" }}>CONFIGURATION</h3>
            <div style={{ display: "flex", gap: "30px", flexWrap: "wrap" }}>
              {canSeePrice && (
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="selectedConfigMode"
                    value="priced"
                    checked={configMode === "priced"}
                    onChange={(e) =>
                      setConfigMode(
                        e.target.value as "priced" | "unpriced" | "dn",
                      )
                    }
                    style={{ width: "18px", height: "18px", cursor: "pointer" }}
                  />
                  <h4>Priced</h4>
                </label>
              )}

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="selectedConfigMode"
                  value="unpriced"
                  checked={configMode === "unpriced"}
                  onChange={(e) =>
                    setConfigMode(
                      e.target.value as "priced" | "unpriced" | "dn",
                    )
                  }
                  style={{ width: "18px", height: "18px", cursor: "pointer" }}
                />
                <h4>Unpriced</h4>
              </label>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="selectedConfigMode"
                  value="dn"
                  checked={configMode === "dn"}
                  onChange={(e) =>
                    setConfigMode(
                      e.target.value as "priced" | "unpriced" | "dn",
                    )
                  }
                  style={{ width: "18px", height: "18px", cursor: "pointer" }}
                />
                <h4>DN Number & Date</h4>
              </label>
            </div>
          </div>
        </FormPopUp>
      )}
    </>
  );
}
