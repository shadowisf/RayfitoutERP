"use client";

import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import { useEffect, useState } from "react";
import { toast } from "@/app/components/Toast";
import { useRouter } from "next/navigation";
import { InventoryItem } from "../../types/inventoryItem";
import SingleSelectDropdown from "@/app/components/SingleSelectDropdown";
import { useAuth } from "@/app/context/AuthContext";
import SingleUploadFileBox from "@/app/components/SingleUploadFileBox";
import FormContextHeader from "@/app/components/FormContextHeader";
import MultipleSelectBoqItemButton from "@/app/components/_MultipleSelectBoqItemButton";

type TransferIssueStockButtonProps = {
  inventoryItem: InventoryItem;
};

export default function TransferIssueStocksButton({
  inventoryItem,
}: TransferIssueStockButtonProps) {
  const router = useRouter();

  const { userInfo } = useAuth();

  const [isOpen, setIsOpen] = useState(false);

  const [type, setType] = useState("");
  const [from, setFrom] = useState<string | number>("");
  const [to, setTo] = useState("");
  const [quantity, setQuantity] = useState<string | number>("");
  const [purpose, setPurpose] = useState("");
  const [receiverName, setReceiverName] = useState<string | number>("");
  const [serialNumber, setSerialNumber] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [thirdParty, setThirdParty] = useState(false);
  const [packingList, setPackingList] = useState(false);
  const [projectID, setProjectID] = useState<string | number>("");
  const [boqLineID, setBoqLineID] = useState<string | number>("");

  const [availableQuantity, setAvailableQuantity] = useState<number | string>(
    "",
  );
  const [fromValues, setFromValues] = useState<any>([]);
  const [toValues, setToValues] = useState<any>([]);
  const [projectValues, setProjectValues] = useState<any>([]);

  // Store the full stock data for quantity calculation
  const [stocksData, setStocksData] = useState<any>(null);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/projects`, {
      method: "GET",
    })
      .then((res) => res.json())
      .then((data) => {
        setProjectValues(data);
      });
  }, []);

  useEffect(() => {
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/stock/getStocksByInventoryItemID`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventoryItemId: inventoryItem.id,
        }),
      },
    )
      .then((res) => res.json())
      .then((data) => {
        console.log(data);
        // Store the full data for later quantity calculation
        setStocksData(data);

        // Get locations from stocks table
        const stockLocations = data.stocks.map(
          (item: { location: string }) => item.location,
        );

        // Get to_location from received transfers (stocks_transfer_issue)
        const transferredLocations = data.stocksTransferIssue
          .filter((item: any) => item.type.toLowerCase().includes("transfer"))
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
  }, [isOpen]);

  // Calculate available quantity when "from" location changes
  useEffect(() => {
    if (!from || !stocksData) {
      setAvailableQuantity("");
      return;
    }

    // Calculate quantity for the selected location
    let locationQuantity = 0;
    const round = (n: number) => Math.round(n * 1000) / 1000;

    // Add quantity from stocks table for this location
    stocksData.stocks.forEach((stock: any) => {
      if (stock.location === from) {
        locationQuantity = round(locationQuantity + Number(stock.quantity));
      }
    });

    // Process transfers and issues for this location
    stocksData.stocksTransferIssue.forEach((transaction: any) => {
      if (transaction.type.includes("Issue")) {
        // Subtract issues from the location if received
        if (transaction.received && transaction.from_location === from) {
          locationQuantity = round(
            locationQuantity - Number(transaction.quantity),
          );
        }
      } else if (transaction.type.toLowerCase().includes("transfer")) {
        // Subtract from from_location
        if (transaction.from_location === from) {
          locationQuantity = round(
            locationQuantity - Number(transaction.quantity),
          );
        }
        // Add to to_location
        if (transaction.to_location === from) {
          locationQuantity = round(
            locationQuantity + Number(stocksData.quantity),
          );
        }
      }
    });

    setAvailableQuantity(locationQuantity > 0 ? round(locationQuantity) : 0);
  }, [from, stocksData]);

  useEffect(() => {
    setFrom("");
    setTo("");
    setPurpose("");
    setReceiverName("");
    setFile(null);
    setThirdParty(false);
    setProjectID("");
    setBoqLineID("");
  }, [type]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (availableQuantity === "" || availableQuantity === 0) {
      toast("No stock available at selected location", "error");
      return;
    }

    const qty = Number(quantity);
    const available = Number(availableQuantity);

    if (isNaN(qty) || qty <= 0) {
      toast("Please enter a valid quantity", "error");
      return;
    }

    if (qty > available) {
      toast("Quantity cannot exceed available quantity", "error");
      return;
    }

    let attachmentUrls: string[] = [];

    // Upload files if any selected (only for issues)
    if (file) {
      try {
        const formData = new FormData();

        formData.append("files", file);
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
        project_id: projectID,
        boq_line_id: boqLineID,
        type,
        transferee: userInfo?.name,
        from,
        to,
        quantity,
        purpose,
        third_party_involved: thirdParty,
        packing_list_required: packingList,
        receiver_name: receiverName,
        serial_number: serialNumber,
        attachment: JSON.stringify(attachmentUrls),
      }),
    });

    if (res.ok) {
      toast(
        type.toLowerCase().includes("transfer")
          ? "Stock transferred"
          : type.toLowerCase().includes("issue")
            ? "Stock issued"
            : "Stock sent",
        "success",
      );

      // Reset form fields
      setType("");
      setFrom("");
      setTo("");
      setQuantity("");
      setPurpose("");
      setReceiverName("");
      setSerialNumber("");
      setAvailableQuantity("");
      setFile(null);
      setThirdParty(false);
      setProjectID("");
      setBoqLineID("");

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
          header={`ISSUE/TRANSFER STOCK - ${inventoryItem.description.toUpperCase()}`}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"CONFIRM"}
          style={{ minWidth: "1000px" }}
        >
          <FormContextHeader>TRANSFER CONTEXT</FormContextHeader>
          <div className="input-row half">
            <InputItem
              label={"TYPE"}
              value={type}
              type={"select"}
              required
              onChange={(e) => setType(e.target.value)}
              selectOptions={[
                "Material transfer",
                "Issue for use",
                "Send for processing",
              ]}
            />
            {type !== "" && (
              <InputItem
                label={
                  type.toLowerCase().includes("transfer")
                    ? "PURPOSE OF TRANSFER"
                    : type.toLowerCase().includes("issue")
                      ? "PURPOSE OF ISSUE"
                      : "PURPOSE OF SENDING"
                }
                value={purpose}
                type={"select"}
                required
                onChange={(e) => setPurpose(e.target.value)}
                selectOptions={
                  type.toLowerCase().includes("transfer")
                    ? [
                        "Relocation/re-racking",
                        "Storage consolidation",
                        "Temporary holding",
                        "Space optimization",
                      ]
                    : type.toLowerCase().includes("issue")
                      ? [
                          "Project execution",
                          "Equipment/laptop/tools",
                          "Administrative/non-project work",
                        ]
                      : [
                          "Veneer pressing",
                          "Painting/coating",
                          "Polishing/finishing",
                          "CNC cutting/trimming",
                          "Repair/rectification",
                          "Testing/certification",
                        ]
                }
              />
            )}
          </div>

          {type.toLowerCase().includes("issue") && (
            <div className="input-row half">
              <SingleSelectDropdown
                label="PROJECT REFERENCE"
                dbData={projectValues}
                selectedValue={projectID}
                onChange={setProjectID}
                placeholder="SELECT PROJECT"
                idField="id"
                labelField="name"
                required={false}
              />
              {/* <SingleSelectDropdown
                label={"BILL OF QUANTITY REFERENCE"}
                dbData={boqLineValues}
                selectedValue={boqLineID}
                onChange={setBoqLineID}
                placeholder="SELECT BILL OF QUANTITY REFERENCE"
                required={false}
                disabled={projectID === ""}
                categorized={true}
                categoryField="category"
                subCategoryField="sub_category"
              /> */}
              <div className="input-item">
                <label className="custom">
                  <span>BILL OF QUANTITY REFERENCE</span>
                  <small style={{ fontStyle: "italic", fontWeight: "100" }}>
                    (OPTIONAL)
                  </small>
                </label>

                <MultipleSelectBoqItemButton
                  projectID={Number(projectID)}
                  onSelectBoq={setBoqLineID}
                  disabled={projectID === ""}
                  currentBoqLineID={boqLineID}
                  style={{ height: "30.5px" }}
                />
              </div>
            </div>
          )}

          <br />

          {type !== "" && (
            <>
              <FormContextHeader>QUANTITY & RESPONSIBILITY</FormContextHeader>
              <div className="input-row half">
                <InputItem
                  label={
                    type.toLowerCase().includes("transfer")
                      ? "TRANSFER FROM"
                      : type.toLowerCase().includes("issue")
                        ? "ISSUE FROM"
                        : "SEND FROM"
                  }
                  value={from}
                  type={"select"}
                  placeholder={
                    type.toLowerCase().includes("transfer")
                      ? "SELECT TRANSFER FROM"
                      : "SELECT ISSUE FROM"
                  }
                  required
                  onChange={(e) => setFrom(e.target.value)}
                  selectOptions={fromValues.filter((val: string) => val !== to)}
                />

                {type.toLowerCase().includes("transfer") ? (
                  <InputItem
                    label={"TRANSFER TO"}
                    value={to}
                    type={"select"}
                    placeholder={"SELECT TRANSFER TO"}
                    required
                    onChange={(e) => setTo(e.target.value)}
                    selectOptions={[
                      "Headquarters",
                      "Umm Al Quwain Warehouse",
                      ...toValues,
                    ].filter((val: string) => val !== from)}
                  />
                ) : (
                  <InputItem
                    label={
                      type.toLowerCase().includes("send")
                        ? "FULL NAME OF RECEPIENT / ORGANIZATION"
                        : "FULL NAME OF RECEPIENT"
                    }
                    type="text"
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    required
                  />
                )}
              </div>

              {type.toLowerCase().includes("transfer") && (
                <>
                  <div className="input-row half">
                    <div
                      className="input-item"
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          height: "100%",
                        }}
                      >
                        <div
                          onClick={() => setThirdParty(!thirdParty)}
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "5px",
                            border: thirdParty ? "none" : "2px solid #d1d5db",
                            backgroundColor: thirdParty
                              ? "#10b981"
                              : "transparent",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                          }}
                        >
                          {thirdParty && (
                            <svg
                              width="24"
                              height="24"
                              viewBox="0 0 20 20"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M16.6667 5L7.50004 14.1667L3.33337 10"
                                stroke="white"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </div>
                      </div>
                      <label
                        style={{
                          maxWidth: "500px",
                          textTransform: "uppercase",
                        }}
                      >
                        3RD PARTY TRANSPORT INVOLVED?
                      </label>
                    </div>
                  </div>

                  <div className="input-row half">
                    <div
                      className="input-item"
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          height: "100%",
                        }}
                      >
                        <div
                          onClick={() => setPackingList(!packingList)}
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "5px",
                            border: packingList ? "none" : "2px solid #d1d5db",
                            backgroundColor: packingList
                              ? "#10b981"
                              : "transparent",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                          }}
                        >
                          {packingList && (
                            <svg
                              width="24"
                              height="24"
                              viewBox="0 0 20 20"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M16.6667 5L7.50004 14.1667L3.33337 10"
                                stroke="white"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </div>
                      </div>
                      <label
                        style={{
                          maxWidth: "500px",
                          textTransform: "uppercase",
                        }}
                      >
                        PACKING LIST REQUIRED?
                      </label>
                    </div>
                  </div>
                </>
              )}

              <div className="input-row three-col">
                <InputItem
                  label={"AVAILABLE QUANTITY"}
                  value={
                    availableQuantity === ""
                      ? ""
                      : Number.isInteger(Number(availableQuantity))
                        ? String(availableQuantity)
                        : Number(availableQuantity)
                            .toFixed(3)
                            .replace(/\.?0+$/, "")
                  }
                  type={"text"}
                  placeholder={""}
                  required
                  disabled
                  onChange={() => {}}
                />
                <InputItem
                  label={
                    type.toLowerCase().includes("transfer")
                      ? "QUANTITY TO TRANSFER"
                      : type.toLowerCase().includes("issue")
                        ? "QUANTITY TO ISSUE"
                        : "QUANTITY TO SEND"
                  }
                  value={quantity}
                  type={"text"}
                  placeholder={
                    type.toLowerCase().includes("transfer")
                      ? "ENTER QUANTITY TO TRANSFER"
                      : "ENTER QUANTITY TO ISSUE"
                  }
                  required
                  /* onChange={(e) => {
                    const val = e.target.value;
                    if (val === "" || /^\d+$/.test(val)) {
                      setQuantity(val === "" ? "" : Number(val));
                    }
                  }} */
                  onChange={(e) => {
                    let val = e.target.value;

                    // Allow up to 3 decimal places
                    if (val === "" || /^\d*\.?\d{0,3}$/.test(val)) {
                      setQuantity(val);
                    }
                  }}
                  disabled={from === ""}
                />

                {type.toLowerCase().includes("transfer") && (
                  <InputItem
                    label={"FULL NAME OF SITE RECIPIENT"}
                    value={receiverName}
                    type={"text"}
                    onChange={(e) => setReceiverName(e.target.value)}
                    required
                  />
                )}

                {type.toLowerCase().includes("issue") && (
                  <InputItem
                    label={"MODEL NUMBER / SERIAL NUMBER"}
                    value={serialNumber}
                    type={"text"}
                    required={false}
                    onChange={(e) => setSerialNumber(e.target.value)}
                  />
                )}

                {type.toLowerCase().includes("send") && (
                  <div
                    className="input-item"
                    style={{ flexDirection: "row", alignItems: "center" }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        height: "100%",
                      }}
                    >
                      <div
                        onClick={() => setThirdParty(!thirdParty)}
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "5px",
                          border: thirdParty ? "none" : "2px solid #d1d5db",
                          backgroundColor: thirdParty
                            ? "#10b981"
                            : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                        }}
                      >
                        {thirdParty && (
                          <svg
                            width="24"
                            height="24"
                            viewBox="0 0 20 20"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M16.6667 5L7.50004 14.1667L3.33337 10"
                              stroke="white"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>
                    </div>
                    <label
                      style={{
                        maxWidth: "500px",
                        textTransform: "uppercase",
                      }}
                    >
                      3RD PARTY TRANSPORT INVOLVED?
                    </label>
                  </div>
                )}
              </div>

              <br />

              <FormContextHeader>PROOF/ATTACHMENTS</FormContextHeader>
              <div className="input-row half">
                <SingleUploadFileBox
                  fileState={file}
                  setFileState={setFile}
                  label={"IMAGE OF MATERIAL / EQUIPMENT"}
                  acceptedFileTypes={".png,.jpg,.jpeg"}
                  required
                />
              </div>
            </>
          )}
        </FormPopUp>
      )}
    </>
  );
}
