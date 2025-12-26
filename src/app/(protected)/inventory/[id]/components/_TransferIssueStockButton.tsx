"use client";

import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import { useEffect, useState, useRef } from "react";
import { toast } from "@/app/components/Toast";
import { useRouter } from "next/navigation";
import { InventoryItem } from "../../types/inventoryItem";
import SingleSelectDropdown from "@/app/components/SingleSelectDropdown";
import { useAuth } from "@/app/context/AuthContext";

type TransferIssueStockButtonProps = {
  inventoryItem: InventoryItem;
};

export default function TransferIssueStocksButton({
  inventoryItem,
}: TransferIssueStockButtonProps) {
  const router = useRouter();

  const { userInfo } = useAuth();

  const uploadIcon = "/icons/upload.svg";

  const [isOpen, setIsOpen] = useState(false);

  const [type, setType] = useState("");
  const [from, setFrom] = useState<string | number>("");
  const [to, setTo] = useState("");
  const [quantity, setQuantity] = useState<string | number>("");
  const [purpose, setPurpose] = useState("");
  const [receiverName, setReceiverName] = useState<string | number>("");
  const [notes, setNotes] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const [availableQuantity, setAvailableQuantity] = useState<number | string>(
    ""
  );
  const [fromValues, setFromValues] = useState<any>([]);
  const [toValues, setToValues] = useState<any>([]);
  const [receiverValues, setReceiverValues] = useState<any>([]);

  // Store the full stock data for quantity calculation
  const [stocksData, setStocksData] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setReceiverName("");

    if (type.includes("Issue")) {
      fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/cognito/`, {
        method: "GET",
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setReceiverValues(
              data.users
                .filter((user: any) => {
                  const currentUserLabel = `${userInfo?.name} (${userInfo?.role})`;
                  const userLabel = `${user.name} (${user.role})`;

                  return userLabel !== currentUserLabel;
                })
                .map((user: any) => ({
                  id: `${user.name} (${user.role})`,
                  value: `${user.name} (${user.role})`,
                }))
            );
          }
        })
        .catch((err) => console.error(err));
    }
  }, [type, isOpen]);

  useEffect(() => {
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/stock/getStocksByInventoryItemID`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventoryItemId: inventoryItem.id,
        }),
      }
    )
      .then((res) => res.json())
      .then((data) => {
        // Store the full data for later quantity calculation
        setStocksData(data);

        // Get locations from stocks table
        const stockLocations = data.stocks.map(
          (item: { location: string }) => item.location
        );

        // Get to_location from received transfers (stocks_transfer_issue)
        const transferredLocations = data.stocksTransferIssue
          .filter((item: any) => item.type.includes("Transfer"))
          .map((item: any) => item.to_location);

        // Combine and remove duplicates
        const allLocations = [
          ...new Set([...stockLocations, ...transferredLocations]),
        ];

        setFromValues(allLocations);
      });

    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/projects`, {
      method: "GET",
    })
      .then((res) => res.json())
      .then((data) => {
        const locations = data.map((item: { name: string }) => item.name);
        setToValues(locations);
      });
  }, []);

  // Calculate available quantity when "from" location changes
  useEffect(() => {
    if (!from || !stocksData) {
      setAvailableQuantity("");
      return;
    }

    // Calculate quantity for the selected location
    let locationQuantity = 0;

    // Add quantity from stocks table for this location
    stocksData.stocks.forEach((stock: any) => {
      if (stock.location === from) {
        locationQuantity += stock.quantity;
      }
    });

    // Process transfers and issues for this location
    stocksData.stocksTransferIssue.forEach((transaction: any) => {
      if (transaction.type.includes("Issue")) {
        // Subtract issues from the location if received
        if (transaction.received && transaction.from_location === from) {
          locationQuantity -= transaction.quantity;
        }
      } else if (transaction.type.includes("Transfer")) {
        // Subtract from from_location
        if (transaction.from_location === from) {
          locationQuantity -= transaction.quantity;
        }
        // Add to to_location
        if (transaction.to_location === from) {
          locationQuantity += transaction.quantity;
        }
      }
    });

    setAvailableQuantity(locationQuantity > 0 ? locationQuantity : 0);
  }, [from, stocksData]);

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

    if (availableQuantity === "" || availableQuantity === 0) {
      toast("No stock available at selected location", "error");
      return;
    }

    if (Number(quantity) > Number(availableQuantity)) {
      toast(`Quantity cannot exceed available quantity`, "error");
      return;
    }

    let attachmentUrls: string[] = [];

    // Upload files if any selected (only for issues)
    if (files.length > 0 && type.includes("Issue")) {
      try {
        const formData = new FormData();
        files.forEach((file) => {
          formData.append("files", file);
        });
        formData.append("folder", "stock-issue-attachments");

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
        action: "transferIssueStock",
        inventory_item_id: inventoryItem.id,
        type,
        from,
        to,
        quantity,
        purpose,
        receiver_name: receiverName,
        notes,
        serial_number: serialNumber,
        attachment: JSON.stringify(attachmentUrls),
      }),
    });

    if (res.ok) {
      toast(
        type.includes("Transfer") ? "Stock transferred" : "Stock issued",
        "success"
      );

      // Reset form fields
      setType("");
      setFrom("");
      setTo("");
      setQuantity("");
      setPurpose("");
      setReceiverName("");
      setNotes("");
      setSerialNumber("");
      setAvailableQuantity("");
      setFiles([]);

      router.refresh();
      setIsOpen(false);
    } else {
      toast("Failed to transfer or issue stock", "error");
    }
  }

  return (
    <>
      <Button
        componentType={"button"}
        bgColor={"rgba(223, 55, 58, 1)"}
        borderColor={"rgba(223, 55, 58, 1)"}
        textColor={"white"}
        onClick={() => setIsOpen(true)}
      >
        ISSUE/TRANSFER STOCK -
      </Button>

      {isOpen && (
        <FormPopUp
          header={"ISSUE/TRANSFER STOCK"}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"CONFIRM"}
        >
          <div className="input-row full">
            <InputItem
              label={"TYPE"}
              value={type}
              type={"select"}
              placeholder={"SELECT TRANSFER TYPE"}
              required
              onChange={(e) => setType(e.target.value)}
              selectOptions={["Transfer stock", "Issue material/equipment"]}
            />
          </div>
          {type !== "" && (
            <>
              <div className="input-row half">
                <InputItem
                  label={
                    type.includes("Transfer") ? "TRANSFER FROM" : "ISSUE FROM"
                  }
                  value={from}
                  type={"select"}
                  placeholder={
                    type.includes("Transfer")
                      ? "SELECT TRANSFER FROM"
                      : "SELECT ISSUE FROM"
                  }
                  required
                  onChange={(e) => setFrom(e.target.value)}
                  selectOptions={fromValues.filter((val: string) => val !== to)}
                />

                {type.includes("Transfer") ? (
                  <InputItem
                    label={"TRANSFER TO"}
                    value={to}
                    type={"select"}
                    placeholder={"SELECT TRANSFER TO"}
                    required
                    onChange={(e) => setTo(e.target.value)}
                    selectOptions={[
                      "Headquarters",
                      "Umm Al Quwain warehouse",
                      ...toValues,
                    ].filter((val: string) => val !== from)}
                  />
                ) : (
                  <SingleSelectDropdown
                    label={"ISSUE TO"}
                    selectedValue={receiverName}
                    onChange={setReceiverName}
                    placeholder={"SELECT ISSUE TO"}
                    dbData={receiverValues}
                  />
                )}
              </div>
              <div className="input-row three-col">
                <InputItem
                  label={"AVAILABLE QUANTITY"}
                  value={availableQuantity === "" ? "" : `${availableQuantity}`}
                  type={"text"}
                  placeholder={""}
                  required
                  disabled
                  onChange={() => {}}
                />
                <InputItem
                  label={
                    type.includes("Transfer")
                      ? "QUANTITY TO TRANSFER"
                      : "QUANTITY TO ISSUE"
                  }
                  value={quantity}
                  type={"text"}
                  placeholder={
                    type.includes("Transfer")
                      ? "ENTER QUANTITY TO TRANSFER"
                      : "ENTER QUANTITY TO ISSUE"
                  }
                  required
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "" || /^\d+$/.test(val)) {
                      setQuantity(val === "" ? "" : Number(val));
                    }
                  }}
                  disabled={from === ""}
                />
                <InputItem
                  label={
                    type.includes("Transfer")
                      ? "PURPOSE OF TRANSFER"
                      : "PURPOSE OF ISSUE"
                  }
                  value={purpose}
                  type={"select"}
                  placeholder={
                    type.includes("Transfer")
                      ? "SELECT PURPOSE OF TRANSFER"
                      : "SELECT PURPOSE OF ISSUE"
                  }
                  required
                  onChange={(e) => setPurpose(e.target.value)}
                  selectOptions={
                    type.includes("Transfer")
                      ? [
                          "Project execution",
                          "Internal reallocation",
                          "Replacement",
                        ]
                      : [
                          "Installation",
                          "Trial/mockup",
                          "Temporary use",
                          "Replacement/repair",
                        ]
                  }
                />
              </div>
              {!type.includes("Transfer") && (
                <>
                  <div className="input-row full">
                    <InputItem
                      label={"MODEL NUMBER/SERIAL NUMBER"}
                      value={serialNumber}
                      type={"text"}
                      placeholder={"ENTER MODEL NUMBER/SERIAL NUMBER"}
                      required={false}
                      onChange={(e) => setSerialNumber(e.target.value)}
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
                                    <div
                                      style={{
                                        fontSize: "12px",
                                        color: "#6b7280",
                                      }}
                                    >
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
                </>
              )}
            </>
          )}
        </FormPopUp>
      )}
    </>
  );
}
