"use client";

import { useState } from "react";
import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import { pdf } from "@react-pdf/renderer";
import RequestedItemsPDF, { RequestedItem } from "./RequestedItemsPDF";

type Props = {
  selectedItems: RequestedItem[];
  disabled?: boolean;
};

export default function ExportItemsButton({ selectedItems, disabled }: Props) {
  const [showPopup, setShowPopup] = useState(false);
  const [exportMrRef, setExportMrRef] = useState(false);
  const [exportRequester, setExportRequester] = useState(false);
  const [exportProject, setExportProject] = useState(false);

  const downloadIcon = "/icons/download.svg";

  async function handleExport() {
    if (selectedItems.length === 0) return;
    try {
      const exportDate = new Date().toLocaleDateString("en-GB");
      const blob = await pdf(
        <RequestedItemsPDF
          items={selectedItems}
          showMrRef={exportMrRef}
          showRequester={exportRequester}
          showProject={exportProject}
          exportDate={exportDate}
        />,
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `All-Requested-Items-${exportDate.replace(/\//g, "-")}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setShowPopup(false);
    } catch (err) {
      console.error("Export failed", err);
    }
  }

  return (
    <>
      <Button
        componentType={"button"}
        bgColor={"black"}
        borderColor={"black"}
        textColor={"white"}
        onClick={() => !disabled && setShowPopup(true)}
        style={{
          padding: "7px 20px",
        }}
        disabled={disabled}
      >
        EXPORT ALL ITEMS{" "}
        <img
          src={downloadIcon}
          alt="download"
          style={{ filter: disabled ? "invert(0.6)" : "invert(1)" }}
        />
      </Button>

      {showPopup && (
        <FormPopUp
          header={"EXPORT ALL ITEMS"}
          setIsOpen={setShowPopup}
          handleSubmit={async (e) => {
            e.preventDefault();
            await handleExport();
          }}
          addButtonLabel={"CONFIRM"}
        >
          <h4>SHOW ON TABLE</h4>
          <br />
          <div
            style={{
              display: "flex",
              gap: "20px",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={exportMrRef}
                onChange={(e) => setExportMrRef(e.target.checked)}
                style={{
                  width: "18px",
                  height: "18px",
                  accentColor: "rgba(0, 163, 93, 1)",
                }}
              />
              <h3 style={{ fontWeight: "normal" }}>MR Ref.</h3>
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
                type="checkbox"
                checked={exportRequester}
                onChange={(e) => setExportRequester(e.target.checked)}
                style={{
                  width: "18px",
                  height: "18px",
                  accentColor: "rgba(0, 163, 93, 1)",
                }}
              />
              <h3 style={{ fontWeight: "normal" }}>Requester</h3>
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
                type="checkbox"
                checked={exportProject}
                onChange={(e) => setExportProject(e.target.checked)}
                style={{
                  width: "18px",
                  height: "18px",
                  accentColor: "rgba(0, 163, 93, 1)",
                }}
              />
              <h3 style={{ fontWeight: "normal" }}>Project</h3>
            </label>
          </div>
        </FormPopUp>
      )}
    </>
  );
}
