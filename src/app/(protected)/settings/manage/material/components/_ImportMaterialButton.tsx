"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import FormPopUp from "@/app/components/FormPopup";
import SingleUploadFileBox from "@/app/components/SingleUploadFileBox";
import InputItem from "@/app/components/InputItem";
import Button from "@/app/components/Button";
import { toast } from "@/app/components/Toast";
import { useAuth } from "@/app/context/AuthContext";

type Props = {
  onSuccess: (newDbId: number, newDbName: string) => void;
};

type FailedRow = { row: number; name: string; reason: string };

export default function ImportMaterialButton({ onSuccess }: Props) {
  const { userInfo } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [dbName, setDbName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<{
    imported: number;
    failed: FailedRow[];
    database_name: string;
  } | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setDbName("");
      setFile(null);
      setResult(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = dbName.trim();
    if (!trimmed) { toast("Database name is required.", "error"); return; }
    if (!file) { toast("Please select a file.", "error"); return; }

    setResult(null);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("database_name", trimmed);
    if (userInfo?.name) formData.append("added_by", userInfo.name);

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/importMaterials`,
      { method: "POST", body: formData },
    );
    const data = await res.json();
    if (!res.ok) {
      toast(data?.error || "Import failed.", "error");
      return;
    }

    setResult({
      imported: data.imported,
      failed: data.failed ?? [],
      database_name: data.database_name,
    });

    if (data.imported > 0) {
      toast(
        `${data.imported} material${data.imported !== 1 ? "s" : ""} imported into "${data.database_name}".`,
        "success",
      );
      onSuccess(data.database_id, data.database_name);
    } else if ((data.failed ?? []).length === 0) {
      toast("No rows found in the file.", "error");
    }
  };

  const downloadTemplate = () => {
    const header = [
      "item_code",
      "category",
      "subcategory",
      "material",
      "brand",
      "unit",
    ];
    const csvContent = header.map((c) => `"${c}"`).join(",");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "material_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Button
        componentType="button"
        bgColor="black"
        borderColor="black"
        textColor="white"
        type="button"
        onClick={() => setIsOpen(true)}
      >
        IMPORT
        <img src="/icons/import.svg" alt="import" />
      </Button>

      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <FormPopUp
            header="IMPORT MATERIALS"
            setIsOpen={setIsOpen}
            handleSubmit={handleSubmit}
            addButtonLabel="CONFIRM"
            secondButton={
              <Button
                componentType="button"
                bgColor="white"
                borderColor="rgba(211,211,211,1)"
                textColor="black"
                type="button"
                onClick={downloadTemplate}
              >
                DOWNLOAD TEMPLATE
                <img src="/icons/download.svg" alt="" />
              </Button>
            }
          >
            <div className="input-row full">
              <InputItem
                label="DATABASE NAME"
                value={dbName}
                type="text"
                required
                noOptionalLabel
                onChange={(e) => setDbName(e.target.value)}
              />
            </div>

            {/* Format reference */}
            <div
              style={{
                backgroundColor: "rgba(248,248,248,1)",
                borderRadius: "8px",
                padding: "12px 14px",
                marginBottom: "16px",
              }}
            >
              <p
                style={{
                  textTransform: "uppercase",
                  marginBottom: "8px",
                }}
              >
                Expected Column Order
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr",
                  gap: "4px 14px",
                }}
              >
                {[
                  ["A", "item_code — leave blank to auto-generate"],
                  ["B", "category *"],
                  ["C", "subcategory *"],
                  ["D", "material *"],
                  ["E", "brand"],
                  ["F", "unit"],
                ].map(([col, label]) => (
                  <>
                    <span
                      key={`col-${col}`}
                      style={{ fontWeight: 700, color: "black" }}
                    >
                      {col}
                    </span>
                    <span key={`lbl-${col}`}>{label}</span>
                  </>
                ))}
              </div>
              <p
                style={{
                  marginTop: "8px",
                }}
              >
                Categories and subcategories are matched case-insensitively. New
                ones are created automatically.
                <br /> All imported items are placed into a new database named{" "}
                <strong>"Imported MM/DD/YYYY"</strong>.
              </p>
            </div>

            {/* File upload */}
            <div className="input-row full">
              <SingleUploadFileBox
                fileState={file}
                setFileState={setFile}
                label="FILE"
                required
                acceptedFileTypes=".xlsx,.xls,.csv"
                placeholder="UPLOAD OR DRAG YOUR EXCEL / CSV FILE"
                buttonLabel="SELECT FILE"
              />
            </div>

            {/* Result summary */}
            {result && (
              <div style={{ marginTop: "12px" }}>
                {result.imported > 0 && (
                  <p
                    style={{
                      fontSize: "12px",
                      color: "rgba(0,163,93,1)",
                      fontWeight: 600,
                      marginBottom: "4px",
                    }}
                  >
                    ✓ {result.imported} material
                    {result.imported !== 1 ? "s" : ""} imported into &ldquo;
                    {result.database_name}&rdquo;
                  </p>
                )}
                {result.failed.length > 0 && (
                  <>
                    <p
                      style={{
                        fontSize: "12px",
                        color: "rgba(200,60,60,1)",
                        fontWeight: 600,
                        marginBottom: "6px",
                      }}
                    >
                      {result.failed.length} row
                      {result.failed.length !== 1 ? "s" : ""} failed
                    </p>
                    <div
                      style={{
                        maxHeight: "140px",
                        overflowY: "auto",
                        border: "1px solid rgba(220,220,220,1)",
                        borderRadius: "6px",
                      }}
                    >
                      {result.failed.map((f, i) => (
                        <div
                          key={i}
                          style={{
                            padding: "6px 10px",
                            borderBottom:
                              i < result.failed.length - 1
                                ? "1px solid rgba(239,239,239,1)"
                                : "none",
                            fontSize: "11px",
                          }}
                        >
                          <span style={{ fontWeight: 600 }}>Row {f.row}:</span>{" "}
                          {f.name} —{" "}
                          <span style={{ color: "rgba(200,60,60,1)" }}>
                            {f.reason}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </FormPopUp>,
          document.body,
        )}
    </>
  );
}
