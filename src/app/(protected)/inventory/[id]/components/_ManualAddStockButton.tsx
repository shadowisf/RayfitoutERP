"use client";

import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { toast } from "@/app/components/Toast";
import { useRouter } from "next/navigation";
import { InventoryItem } from "../../types/inventoryItem";
import SingleSelectDropdown from "@/app/components/SingleSelectDropdown";

type ManualAddToStockButtonProp = {
  inventoryItem: InventoryItem;
};

export default function ManualAddToStockButton({
  inventoryItem,
}: ManualAddToStockButtonProp) {
  const { userInfo } = useAuth();

  const router = useRouter();

  const uploadIcon = "/icons/upload.svg";

  const [isOpen, setIsOpen] = useState(false);

  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [supplierID, setSupplierID] = useState<string | number>("");
  const [quantity, setQuantity] = useState("");
  const [reasonForEntry, setReasonForEntry] = useState("");
  const [projectID, setProjectID] = useState<string | number>("");
  const [boqLineID, setBoqLineID] = useState<string | number>("");
  const [condition, setCondition] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [unitPrice, setUnitPrice] = useState("");

  const [supplierValues, setSupplierValues] = useState<any>([]);
  const [stockLocationValues, setStockLocationValues] = useState<any>([]);
  const [projectValues, setProjectValues] = useState<any>([]);
  const [boqLineValues, setBoqLineValues] = useState<any>([]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetch("/api/boq/getAllBoqLinesWithNumberRef", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_id: projectID,
      }),
    })
      .then((res) => res.json())
      .then(function (data) {
        setBoqLineValues(data);

        const map = data.reduce(function (acc: any, boqL: any) {
          acc[boqL.id] = `${boqL.item_name} (${boqL.item_number})`;
          return acc;
        }, {});

        const array = Object.entries(map).map(function ([id, label]) {
          return {
            id: Number(id),
            value: label,
          };
        });

        setBoqLineValues(array);
      });
  }, [projectID]);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/supplier`, {
      method: "GET",
    })
      .then((res) => res.json())
      .then((data) => {
        setSupplierValues(data);
      });

    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/projects`, {
      method: "GET",
    })
      .then((res) => res.json())
      .then((data) => {
        const names = data.map((item: any) => item.name);
        setStockLocationValues(names);

        setProjectValues(data);
      });
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    const fileArray = Array.from(selectedFiles);

    // Validate file types (images and PDFs only)
    const validFiles = fileArray.filter((file) => {
      const isImage = file.type.startsWith("image/");
      const isPDF = file.type === "application/pdf";
      return isImage || isPDF;
    });

    if (validFiles.length !== fileArray.length) {
      toast("Only images and PDF files are allowed", "error");
    }

    setFiles((prevFiles) => [...prevFiles, ...validFiles]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const droppedFiles = e.dataTransfer.files;
    if (!droppedFiles || droppedFiles.length === 0) return;

    const fileArray = Array.from(droppedFiles);

    // Validate file types (images and PDFs only)
    const validFiles = fileArray.filter((file) => {
      const isImage = file.type.startsWith("image/");
      const isPDF = file.type === "application/pdf";
      return isImage || isPDF;
    });

    if (validFiles.length !== fileArray.length) {
      toast("Only images and PDF files are allowed", "error");
    }

    setFiles((prevFiles) => [...prevFiles, ...validFiles]);
  };

  const removeFile = (indexToRemove: number) => {
    setFiles((prevFiles) =>
      prevFiles.filter((_, index) => index !== indexToRemove)
    );
  };

  const getFilePreview = (file: File) => {
    if (file.type.startsWith("image/")) {
      return URL.createObjectURL(file);
    }
    return null;
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    let attachmentUrls: string[] = [];

    // Upload files if any selected
    if (files.length > 0) {
      try {
        const formData = new FormData();
        files.forEach((file) => {
          formData.append("files", file);
        });
        formData.append("folder", "stock-attachments");

        const uploadResponse = await fetch("/api/s3", {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload files");
        }

        const uploadResult = await uploadResponse.json();
        attachmentUrls = uploadResult.urls;
      } catch (error) {
        console.error("Error uploading files:", error);
        toast("Failed to upload files", "error");
        return;
      }
    }

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/stock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "addStock",
        inventory_item_id: inventoryItem.id,
        supplier_id: supplierID,
        received_by: userInfo?.name,
        reason_for_entry: reasonForEntry,
        quantity,
        location,
        notes,
        unit_price: unitPrice,
        project_id: projectID,
        boq_line_id: boqLineID,
        condition,
        attachment: JSON.stringify(attachmentUrls),
      }),
    });

    if (res.ok) {
      toast("Added to stock", "success");

      // Reset form fields
      setLocation("");
      setNotes("");
      setSupplierID("");
      setQuantity("");
      setReasonForEntry("");
      setProjectID("");
      setBoqLineID("");
      setCondition("");
      setFiles([]);
      setUnitPrice("");

      router.refresh();

      setIsOpen(false);
    } else {
      toast("Failed to add to stock", "error");
    }
  }

  return (
    <>
      <Button
        componentType={"button"}
        bgColor={"rgba(0, 163, 93, 1)"}
        borderColor={"rgba(0, 163, 93, 1)"}
        textColor={"white"}
        onClick={() => setIsOpen(true)}
      >
        ADD STOCK +
      </Button>

      {isOpen && (
        <FormPopUp
          header={"ADD STOCK"}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"CONFIRM"}
        >
          <div className="input-row full">
            <InputItem
              label={"RECEIVED BY"}
              value={userInfo?.name || ""}
              type={"text"}
              placeholder={"ENTER NAME"}
              required
              disabled
              onChange={() => {}}
            />
          </div>
          <div className="input-row half">
            <InputItem
              label={"REASON FOR ENTRY"}
              value={reasonForEntry}
              type={"select"}
              placeholder={"SELECT REASON FOR ENTRY"}
              required
              onChange={(e) => setReasonForEntry(e.target.value)}
              selectOptions={[
                "Purchase order",
                "New shipment",
                "Vendor delivery",
                "Stock transfer",
                "Production return",
                "Finished goods",
                "Customer return",
                "Order cancellation",
                "Inventory adjustment",
                "Found stock",
                "Data entry correction",
              ]}
            />
            <SingleSelectDropdown
              label={"SUPPLIER"}
              selectedValue={supplierID}
              onChange={setSupplierID}
              placeholder={"SELECT SUPPLIER"}
              dbData={supplierValues}
              idField="id"
              labelField="name"
              required={false}
            />
          </div>

          <div className="input-row half">
            <div className="input-item">
              <label>
                QUANTITY <span style={{ color: "red" }}>*</span>
              </label>
              <div className="input-prefix right">
                <span>{inventoryItem.unit}</span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="ENTER QUANTITY"
                  required
                  value={quantity}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    setQuantity(value);
                  }}
                />
              </div>
            </div>
            <InputItem
              label={"UNIT PRICE"}
              value={unitPrice}
              type={"text"}
              placeholder={"ENTER UNIT PRICE"}
              required
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "");
                setUnitPrice(value);
              }}
            />
          </div>

          <div className="input-row half">
            <SingleSelectDropdown
              label="PROJECT REFERENCE"
              dbData={projectValues}
              selectedValue={projectID}
              onChange={(id) => setProjectID(id)}
              placeholder="SELECT PROJECT"
              idField="id"
              labelField="name"
              required={false}
            />
            <SingleSelectDropdown
              label={"BILL OF QUANTITY CODE"}
              dbData={boqLineValues}
              selectedValue={boqLineID}
              onChange={setBoqLineID}
              placeholder="SELECT BILL OF QUANTITY"
              required={false}
              disabled={projectID === ""}
            />
          </div>

          <div className="input-row half">
            <InputItem
              label={"CONDITION AT ENTRY"}
              value={condition}
              type={"select"}
              placeholder={"SELECT CONDITION"}
              required={false}
              onChange={(e) => setCondition(e.target.value)}
              selectOptions={["Good", "Fair", "Damaged"]}
            />

            <InputItem
              label={"STOCK LOCATION"}
              value={location}
              type={"select"}
              placeholder={"SELECT LOCATION"}
              required
              onChange={(e) => setLocation(e.target.value)}
              selectOptions={[
                "Headquarters",
                "Umm Al Quwain warehouse",
                ...stockLocationValues,
              ]}
            />
          </div>

          <div className="input-row full">
            <InputItem
              label={"NOTES"}
              value={notes}
              type={"textarea"}
              placeholder={"ENTER NOTES"}
              required={false}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="input-row half">
            <div className="input-item">
              <label>ATTACHMENT</label>

              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                style={{
                  border: "1px dashed #d1d5db",
                  borderRadius: "5px",
                  padding: "40px",
                  textAlign: "center",
                  backgroundColor: "#f9fafb",
                  flexDirection: "column",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                {files.length > 0 ? (
                  <div
                    style={{
                      width: "100%",
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                    }}
                  >
                    {files.map((file, index) => {
                      const preview = getFilePreview(file);
                      const isPDF = file.type === "application/pdf";

                      return (
                        <div
                          key={index}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            padding: "10px",
                            border: "1px solid #e5e7eb",
                            borderRadius: "5px",
                            backgroundColor: "white",
                          }}
                        >
                          {preview ? (
                            <img
                              src={preview}
                              alt={file.name}
                              style={{
                                width: "60px",
                                height: "60px",
                                objectFit: "cover",
                                borderRadius: "3px",
                              }}
                            />
                          ) : isPDF ? (
                            <div
                              style={{
                                width: "60px",
                                height: "60px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                backgroundColor: "#ef4444",
                                borderRadius: "3px",
                                color: "white",
                                fontSize: "12px",
                                fontWeight: "bold",
                              }}
                            >
                              PDF
                            </div>
                          ) : null}
                          <div style={{ flex: 1, textAlign: "left" }}>
                            <div
                              style={{
                                fontSize: "14px",
                                fontWeight: "500",
                                color: "#111827",
                              }}
                            >
                              {file.name}
                            </div>
                            <div style={{ fontSize: "12px", color: "#6b7280" }}>
                              {(file.size / 1024).toFixed(2)} KB
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            style={{
                              width: "30px",
                              height: "30px",
                              borderRadius: "50%",
                              border: "none",
                              backgroundColor: "rgba(0,0,0,0.6)",
                              color: "white",
                              cursor: "pointer",
                            }}
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                    <Button
                      componentType="button"
                      bgColor="black"
                      borderColor="black"
                      textColor="white"
                      onClick={(e) => {
                        e.preventDefault();
                        fileInputRef.current?.click();
                      }}
                      full
                    >
                      <img src={uploadIcon} alt="upload" />
                      ADD MORE FILES
                    </Button>
                  </div>
                ) : (
                  <>
                    UPLOAD OR DRAG ATTACHMENT
                    <br />
                    <br />
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileSelect}
                      style={{ display: "none" }}
                      multiple
                    />
                    <Button
                      componentType="button"
                      bgColor="black"
                      borderColor="black"
                      textColor="white"
                      onClick={(e) => {
                        e.preventDefault();
                        fileInputRef.current?.click();
                      }}
                    >
                      <img src={uploadIcon} alt="upload" />
                      UPLOAD FILE
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </FormPopUp>
      )}
    </>
  );
}
