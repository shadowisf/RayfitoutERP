"use client";

import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import SingleSelectDropdown from "@/app/components/SingleSelectDropdown";
import { toast } from "@/app/components/Toast";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import AttachQuotationButton from "../[id]/components/procurement/_AttachQuotationButton";
import CreateSupplierButton from "../../vendor/components/_CreateSupplierButton";
import { useAuth } from "@/app/context/AuthContext";
import { pdf } from "@react-pdf/renderer";
import RequestedItemsPDF from "./RequestedItemsPDF";

export type BulkQuotationItem = {
  line_id: number;
  mr_header_id: number;
  material_description: string;
  quantity: number;
  unit: string;
  progress_id: number;
  type: string;
  // Additional fields used for PDF export
  delivery_location?: string;
  progress_name?: string;
  requested_by?: string;
  project_name?: string;
  lpo_id?: number | null;
};

type QuotationRow = {
  supplier_id: string | number;
  quotation_file: File | null;
  quotation_url: string;
  unit_price: string;
  total_price: string;
  created_by: string;
};

type BulkQuotationCreatorProps = {
  selectedItems: BulkQuotationItem[];
  onClear: () => void;
  onSuccess: () => void;
  openOnMount?: boolean;
  mrRef?: string;
};

export default function BulkQuotationCreator({
  selectedItems,
  onClear,
  onSuccess,
  openOnMount = false,
  mrRef,
}: BulkQuotationCreatorProps) {
  const closeIcon = "/icons/cross-small.svg";
  const router = useRouter();
  const { userInfo } = useAuth();

  const [quotationPopupOpen, setQuotationPopupOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [quotationRows, setQuotationRows] = useState<QuotationRow[]>([]);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Export selected items state
  const [showExportPopup, setShowExportPopup] = useState(false);
  const [exportMrRef, setExportMrRef] = useState(false);
  const [exportRequester, setExportRequester] = useState(false);
  const [exportProject, setExportProject] = useState(false);

  const downloadIcon = "/icons/download.svg";

  async function handleExportSelected() {
    if (selectedItems.length === 0) return;
    try {
      const exportDate = new Date().toLocaleDateString("en-GB");
      const pdfItems = selectedItems.map((item) => ({
        line_id: item.line_id,
        mr_header_id: item.mr_header_id,
        material_description: item.material_description,
        quantity: item.quantity,
        unit: item.unit,
        delivery_location: item.delivery_location || "",
        progress_name: item.progress_name || "",
        requested_by: item.requested_by || "",
        project_name: item.project_name || "",
        lpo_id: item.lpo_id,
        type: item.type,
      }));
      const blob = await pdf(
        <RequestedItemsPDF
          items={pdfItems}
          showMrRef={exportMrRef}
          showRequester={exportRequester}
          showProject={exportProject}
          exportDate={exportDate}
        />,
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Selected-Items-${exportDate.replace(/\//g, "-")}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setShowExportPopup(false);
    } catch (err) {
      console.error("Export failed", err);
    }
  }

  const formatNumber = (value: unknown): string => {
    const num = Number(value);
    if (isNaN(num)) return "";
    if (Number.isInteger(num)) return num.toString();
    return parseFloat(num.toFixed(3)).toString();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}kb`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}mb`;
  };

  const qtyByUnit = selectedItems.reduce(
    (acc, item) => {
      const unit = (item.unit || "").toUpperCase();
      acc[unit] = (acc[unit] || 0) + Number(item.quantity || 0);
      return acc;
    },
    {} as Record<string, number>,
  );

  const formattedQty = Object.entries(qtyByUnit)
    .map(([unit, qty]) => `${formatNumber(qty)} ${unit}`)
    .join(" + ");

  const totalSelectedQty = selectedItems.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0,
  );

  async function fetchSuppliers() {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/supplier`,
        { method: "GET", headers: { "Content-Type": "application/json" } },
      );
      const data = await res.json();
      setSuppliers(data);
    } catch (err) {
      console.error(err);
    }
  }

  function openQuotationPopup() {
    fetchSuppliers();
    setQuotationRows([
      {
        supplier_id: "",
        quotation_file: null,
        quotation_url: "",
        unit_price: "",
        total_price: "",
        created_by: userInfo?.name || "",
      },
    ]);
    setQuotationPopupOpen(true);
  }

  useEffect(() => {
    if (openOnMount) openQuotationPopup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addQuotationRow() {
    setQuotationRows((prev) => [
      ...prev,
      {
        supplier_id: "",
        quotation_file: null,
        quotation_url: "",
        unit_price: "",
        total_price: "",
        created_by: userInfo?.name || "",
      },
    ]);
  }

  function removeQuotationRow(index: number) {
    if (quotationRows.length <= 1) {
      toast("You must have at least 1 row", "error");
      return;
    }
    setQuotationRows((prev) => prev.filter((_, i) => i !== index));
  }

  function updateQuotationRow(
    index: number,
    field: string,
    value: string | number | File | null,
  ) {
    setQuotationRows((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };

      if (field === "unit_price") {
        const unitPrice = parseFloat(String(value) || "0");
        const total = unitPrice * totalSelectedQty;
        updated[index].total_price =
          isNaN(total) || total === 0
            ? ""
            : Number.isInteger(total)
              ? total.toString()
              : parseFloat(total.toFixed(3)).toString();
      }

      return updated;
    });
  }

  function handleNumericInput(index: number, value: string) {
    if (value === "") {
      updateQuotationRow(index, "unit_price", "");
      return;
    }
    if (!/^\d*\.?\d*$/.test(value)) return;
    if ((value.match(/\./g) || []).length > 1) return;
    updateQuotationRow(index, "unit_price", value);
  }

  async function handleQuotationSubmit(e: React.FormEvent) {
    e.preventDefault();

    for (const row of quotationRows) {
      if (!row.supplier_id) {
        toast("Please select a vendor", "error");
        return;
      }
      if (!row.quotation_file && !row.quotation_url) {
        toast("Please upload a quotation", "error");
        return;
      }
      if (!row.unit_price || row.unit_price.trim() === "") {
        toast("Please enter unit price", "error");
        return;
      }
    }

    try {
      // Upload files to S3
      const uploadedRows = [...quotationRows];
      for (let i = 0; i < uploadedRows.length; i++) {
        const row = uploadedRows[i];
        if (!row.quotation_file) continue;

        const formData = new FormData();
        formData.append("files", row.quotation_file, row.quotation_file.name);
        formData.append("folder", "mr-quotations");

        const uploadRes = await fetch("/api/s3", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) throw new Error("Failed to upload file to S3");

        const uploadData = await uploadRes.json();
        const fileUrl = uploadData.urls?.[0];
        if (!fileUrl) throw new Error("No URL returned from upload");

        uploadedRows[i].quotation_url = fileUrl;
      }

      // Create quotations for each selected item
      for (const item of selectedItems) {
        const itemQty = Number(item.quantity || 0);

        for (const row of uploadedRows) {
          const unitPrice = parseFloat(row.unit_price || "0");
          const itemTotalPrice = unitPrice * itemQty;

          const formatNum = (v: number) =>
            Number.isInteger(v)
              ? v.toString()
              : parseFloat(v.toFixed(3)).toString();

          const payload = {
            action: "addSupplierAndQuotation",
            mr_line_id: item.line_id,
            quotations: [
              {
                supplier_id: row.supplier_id,
                quotation_file: row.quotation_url,
                rating: null,
                unit_price: formatNum(unitPrice),
                total_price: formatNum(itemTotalPrice),
                proposed_quantity: formatNum(itemQty),
                created_by: userInfo?.name || "",
              },
            ],
          };

          const res = await fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL}/api/supplier`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            },
          );

          if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || "Failed to create quotation");
          }
        }
      }

      toast(
        `Quotations created for ${selectedItems.length} item(s)`,
        "success",
      );
      setQuotationPopupOpen(false);
      window.dispatchEvent(new CustomEvent("quotations-created"));
      onSuccess();
      router.refresh();
    } catch (error: any) {
      console.error("Submit error:", error);
      toast(error.message || "Failed to create quotations", "error");
    }
  }

  if (selectedItems.length === 0) return null;

  return (
    <>
      {/* Bottom nav */}
      <div className="bottom-nav">
        <div></div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Button
            componentType="button"
            bgColor="black"
            borderColor="white"
            textColor="white"
            onClick={onClear}
          >
            CANCEL
          </Button>
          <Button
            componentType="button"
            bgColor="black"
            borderColor="white"
            textColor="white"
            onClick={() => setShowExportPopup(true)}
          >
            EXPORT SELECTED ITEM(S){" "}
            <img
              src={downloadIcon}
              alt="download"
              style={{ filter: "invert(1)" }}
            />
          </Button>
          <Button
            componentType="button"
            bgColor="white"
            borderColor="white"
            textColor="black"
            onClick={openQuotationPopup}
          >
            CREATE QUOTATIONS
          </Button>
        </div>
      </div>

      {/* Quotation creation popup */}
      {quotationPopupOpen &&
        (() => {
          const validTotalPrices = quotationRows
            .map((r) => parseFloat(r.total_price || ""))
            .filter((p) => !isNaN(p) && p > 0);
          const minTotal =
            validTotalPrices.length > 0 ? Math.min(...validTotalPrices) : null;

          return (
            <FormPopUp
              header={`ADD VENDOR & QUOTATION FOR ${selectedItems.length} ITEM(S)`}
              setIsOpen={setQuotationPopupOpen}
              handleSubmit={handleQuotationSubmit}
              addButtonLabel="CONFIRM"
              style={{ minWidth: "97dvw" }}
            >
              <>
                {/* Info card */}
                <div
                  style={{
                    border: "1px solid rgba(239,239,239,1)",
                    borderRadius: "10px",
                    padding: "18px 24px",
                    display: "flex",
                    gap: "48px",
                    marginBottom: "24px",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <small>MR NUMBER</small>
                    <h2>MR-{String(mrRef || "—").padStart(5, "0")}</h2>
                  </div>
                  <div>
                    <small>PROJECT</small>
                    <h2>{selectedItems[0]?.project_name || "—"}</h2>
                  </div>
                  <div>
                    <small>ITEM(S)</small>
                    {selectedItems.map((item, i) => (
                      <h2 key={i}>{item.material_description}</h2>
                    ))}
                  </div>
                  <div>
                    <small>QUOTED BY</small>
                    <h2>{userInfo?.name}</h2>
                  </div>
                </div>

                <h4 style={{ marginBottom: "16px" }}>
                  VENDORS &amp; QUOTATIONS
                </h4>

                <table className="items-table">
                  <thead>
                    <tr>
                      <th style={{ width: "40px" }}>#</th>
                      <th style={{ width: "275px" }}>VENDOR</th>
                      <th>QUOTATION</th>
                      <th style={{ width: "100px" }}>REQ. QTY</th>
                      <th style={{ width: "180px" }}>UNIT PRICE</th>
                      <th style={{ width: "180px" }}>TOTAL PRICE</th>
                      <th style={{ width: "100px" }}>LEAD TIME</th>
                      <th style={{ width: "130px" }}>PAYMENT TYPE</th>
                      <th style={{ width: "40px" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotationRows.map((row, index) => {
                      const supplier = suppliers.find(
                        (s) => String(s.id) === String(row.supplier_id),
                      );
                      const unitVal = parseFloat(row.unit_price || "");
                      const totalVal = parseFloat(row.total_price || "");
                      const totalAlert =
                        !isNaN(totalVal) && totalVal > 0 && minTotal !== null
                          ? totalVal === minTotal
                            ? "lowest"
                            : `+${Math.round(((totalVal - minTotal) / minTotal) * 100)}% vs lowest`
                          : null;

                      const hasFile = row.quotation_file || row.quotation_url;
                      const fileName = row.quotation_file
                        ? row.quotation_file.name
                        : (row.quotation_url.split("/").pop()?.split("?")[0] ??
                          "quotation");
                      const fileExt = (
                        fileName.split(".").pop() ?? "FILE"
                      ).toUpperCase();
                      const fileSize = row.quotation_file
                        ? formatFileSize(row.quotation_file.size)
                        : null;
                      const isImage = [
                        "JPG",
                        "JPEG",
                        "PNG",
                        "GIF",
                        "WEBP",
                      ].includes(fileExt);
                      const imagePreviewUrl = isImage
                        ? row.quotation_file
                          ? URL.createObjectURL(row.quotation_file)
                          : row.quotation_url
                        : null;

                      return (
                        <tr key={index}>
                          <td>{index + 1}</td>
                          <td style={{ width: "275px", maxWidth: "275px" }}>
                            <SingleSelectDropdown
                              label="VENDOR"
                              selectedValue={row.supplier_id}
                              onChange={(value) =>
                                updateQuotationRow(index, "supplier_id", value)
                              }
                              placeholder="SELECT VENDOR"
                              dbData={suppliers}
                              idField="id"
                              labelField="name"
                              noLabel
                              required
                              bottomButtonComponent={
                                <CreateSupplierButton
                                  full
                                  onSuccess={() => fetchSuppliers()}
                                />
                              }
                            />
                          </td>
                          <td style={{ width: "250px", maxWidth: "250px" }}>
                            {hasFile ? (
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  gap: "10px",
                                  border: "1px solid rgba(207,207,207,1)",
                                  borderRadius: "8px",
                                  padding: "0px 8px",
                                  height: "40px",
                                  boxSizing: "border-box",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "10px",
                                    overflow: "hidden",
                                  }}
                                >
                                  {isImage ? (
                                    <img
                                      src={imagePreviewUrl!}
                                      alt="preview"
                                      style={{
                                        width: "32px",
                                        height: "32px",
                                        objectFit: "cover",
                                        borderRadius: "4px",
                                        flexShrink: 0,
                                      }}
                                    />
                                  ) : (
                                    <img
                                      src="/icons/pdf.svg"
                                      alt="file"
                                      style={{
                                        width: "24px",
                                        flexShrink: 0,
                                      }}
                                    />
                                  )}
                                  <div style={{ overflow: "hidden" }}>
                                    <div
                                      style={{
                                        fontWeight: 600,
                                        fontSize: "12px",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      {fileName}
                                    </div>
                                    {fileSize && (
                                      <div
                                        style={{
                                          color: "rgba(150,150,150,1)",
                                          fontSize: "10px",
                                        }}
                                      >
                                        {fileSize}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <Button
                                  componentType={"button"}
                                  bgColor={"rgba(239, 239, 239, 1)"}
                                  borderColor={"rgba(223, 223, 223, 1)"}
                                  textColor={"black"}
                                  style={{ padding: "7px 7px" }}
                                  onClick={() => {
                                    const updated = [...quotationRows];
                                    updated[index] = {
                                      ...updated[index],
                                      quotation_file: null,
                                      quotation_url: "",
                                    };
                                    setQuotationRows(updated);
                                  }}
                                >
                                  <img src="/icons/trash.svg" alt="remove" />
                                </Button>
                              </div>
                            ) : (
                              <label
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent:
                                    dragOverIndex === index
                                      ? "center"
                                      : "space-between",
                                  gap: "10px",
                                  border: `1.5px dashed ${dragOverIndex === index ? "rgba(169,255,218,1)" : "rgba(207,207,207,1)"}`,
                                  borderRadius: "8px",
                                  padding: "0px 8px",
                                  height: "40px",
                                  cursor: "pointer",
                                  boxSizing: "border-box",
                                  backgroundColor:
                                    dragOverIndex === index
                                      ? "rgba(169,255,218,1)"
                                      : "white",
                                }}
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  setDragOverIndex(index);
                                }}
                                onDragLeave={() => setDragOverIndex(null)}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  setDragOverIndex(null);
                                  const file = e.dataTransfer.files?.[0];
                                  if (file)
                                    updateQuotationRow(
                                      index,
                                      "quotation_file",
                                      file,
                                    );
                                }}
                              >
                                <input
                                  type="file"
                                  style={{ display: "none" }}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file)
                                      updateQuotationRow(
                                        index,
                                        "quotation_file",
                                        file,
                                      );
                                    e.target.value = "";
                                  }}
                                />
                                {dragOverIndex === index ? (
                                  <span
                                    style={{
                                      color: "rgba(34,150,100,1)",
                                      fontSize: "12px",
                                      fontWeight: 600,
                                    }}
                                  >
                                    DROP HERE
                                  </span>
                                ) : (
                                  <>
                                    <span
                                      style={{
                                        color: "rgba(150,150,150,1)",
                                        fontSize: "12px",
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      Select File or Drop
                                    </span>
                                    <Button
                                      componentType={"none"}
                                      bgColor={"black"}
                                      borderColor={"black"}
                                      textColor={"black"}
                                      style={{ padding: "7px 7px" }}
                                    >
                                      <img
                                        src="/icons/upload.svg"
                                        alt="upload"
                                      />
                                    </Button>
                                  </>
                                )}
                              </label>
                            )}
                          </td>
                          <td>{formattedQty}</td>
                          <td style={{ minWidth: "225px" }}>
                            <div className="input-prefix right">
                              <span>AED</span>
                              <input
                                style={{ paddingRight: "50px" }}
                                type="text"
                                placeholder="ENTER UNIT PRICE"
                                value={row.unit_price}
                                onChange={(e) =>
                                  handleNumericInput(index, e.target.value)
                                }
                                required
                              />
                            </div>
                          </td>
                          <td style={{ minWidth: "210px" }}>
                            <div className="input-prefix right">
                              <span>AED</span>
                              <input
                                style={{ paddingRight: "50px" }}
                                type="text"
                                placeholder="CALCULATING..."
                                value={row.total_price}
                                disabled
                              />
                            </div>
                            {totalAlert && (
                              <div
                                style={{
                                  height: 0,
                                  overflow: "visible",
                                  position: "relative",
                                }}
                              >
                                <div
                                  style={{
                                    position: "absolute",
                                    top: "4px",
                                    left: 0,
                                    fontSize: "10px",
                                    fontWeight: 600,
                                    whiteSpace: "nowrap",
                                    color:
                                      totalAlert === "lowest"
                                        ? "rgba(0,163,93,1)"
                                        : "rgba(220,38,38,1)",
                                  }}
                                >
                                  {totalAlert === "lowest"
                                    ? "Lowest ✓"
                                    : totalAlert}
                                </div>
                              </div>
                            )}
                          </td>
                          <td>{supplier?.avg_lead_time || "-"}</td>
                          <td>{supplier?.type || "-"}</td>
                          {quotationRows.length > 1 && index > 0 ? (
                            <td>
                              <Button
                                componentType="button"
                                bgColor="rgba(239, 239, 239, 1)"
                                borderColor="rgba(223, 223, 223, 1)"
                                textColor="black"
                                style={{ padding: "7px 7px" }}
                                onClick={(e) => {
                                  e.preventDefault();
                                  removeQuotationRow(index);
                                }}
                              >
                                <img src="/icons/trash.svg" alt="trash icon" />
                              </Button>
                            </td>
                          ) : (
                            <td></td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <br />

                <Button
                  componentType="button"
                  bgColor="rgba(239, 239, 239, 1)"
                  borderColor="rgba(239, 239, 239, 1)"
                  textColor="black"
                  onClick={(e) => {
                    e.preventDefault();
                    addQuotationRow();
                  }}
                  full
                  style={{ padding: "20px 0px" }}
                >
                  + ADD MORE
                </Button>

                <br />
              </>
            </FormPopUp>
          );
        })()}

      {/* Export selected items popup */}
      {showExportPopup && (
        <FormPopUp
          header={"EXPORT SELECTED ITEM(S)"}
          setIsOpen={setShowExportPopup}
          handleSubmit={async (e) => {
            e.preventDefault();
            await handleExportSelected();
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
