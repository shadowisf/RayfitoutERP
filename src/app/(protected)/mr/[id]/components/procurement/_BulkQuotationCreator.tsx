"use client";

import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import SingleSelectDropdown from "@/app/components/SingleSelectDropdown";
import { toast } from "@/app/components/Toast";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AttachQuotationButton from "./_AttachQuotationButton";
import CreateSupplierButton from "../../../../vendor/components/_CreateSupplierButton";
import { useAuth } from "@/app/context/AuthContext";

export type BulkQuotationItem = {
  line_id: number;
  mr_header_id: number;
  material_description: string;
  quantity: number;
  unit: string;
  progress_id: number;
  type: string;
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
};

export default function BulkQuotationCreator({
  selectedItems,
  onClear,
  onSuccess,
}: BulkQuotationCreatorProps) {
  const closeIcon = "/icons/cross-small.svg";
  const router = useRouter();
  const { userInfo } = useAuth();

  const [quotationPopupOpen, setQuotationPopupOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [quotationRows, setQuotationRows] = useState<QuotationRow[]>([]);

  const formatNumber = (value: unknown): string => {
    const num = Number(value);
    if (isNaN(num)) return "";
    if (Number.isInteger(num)) return num.toString();
    return parseFloat(num.toFixed(3)).toString();
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
      {quotationPopupOpen && (
        <FormPopUp
          header={`CREATE QUOTATIONS FOR ${selectedItems.length} ITEM(S)`}
          setIsOpen={setQuotationPopupOpen}
          handleSubmit={handleQuotationSubmit}
          addButtonLabel="CONFIRM"
          style={{ minWidth: "1800px" }}
        >
          <>
            <table className="items-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>VENDOR</th>
                  <th>QUOTATION</th>
                  <th>REQUESTED QTY</th>
                  <th>UNIT PRICE</th>
                  <th>TOTAL PRICE</th>
                  <th>QUOTED BY</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {quotationRows.map((row, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td style={{ minWidth: "300px" }}>
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
                    <td>
                      {(row.quotation_file || row.quotation_url) && (
                        <Button
                          componentType="none"
                          bgColor="white"
                          borderColor="rgba(223, 223, 223, 1)"
                          textColor="black"
                          style={{
                            minWidth: "200px",
                            padding: "7px 20px",
                            borderRadius: "25px",
                          }}
                        >
                          Quotation
                          <img
                            src={closeIcon}
                            alt="remove"
                            style={{ cursor: "pointer" }}
                            onClick={() => {
                              const updated = [...quotationRows];
                              updated[index] = {
                                ...updated[index],
                                quotation_file: null,
                                quotation_url: "",
                              };
                              setQuotationRows(updated);
                            }}
                          />
                        </Button>
                      )}
                      {!row.quotation_file && !row.quotation_url && (
                        <AttachQuotationButton
                          onFileSelect={(file) =>
                            updateQuotationRow(index, "quotation_file", file)
                          }
                        />
                      )}
                    </td>
                    <td>{formattedQty}</td>
                    <td style={{ minWidth: "250px" }}>
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
                    <td style={{ minWidth: "225px" }}>
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
                    </td>
                    <td>{row.created_by || "-"}</td>
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
                ))}
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
              ADD VENDOR +
            </Button>

            <br />
          </>
        </FormPopUp>
      )}
    </>
  );
}
