"use client";

import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import { useEffect, useState } from "react";
import { toast } from "@/app/components/Toast";
import { useRouter } from "next/navigation";
import SingleSelectDropdown from "@/app/components/SingleSelectDropdown";
import { useAuth } from "@/app/context/AuthContext";
import SingleUploadFileBox from "@/app/components/SingleUploadFileBox";
import FormContextHeader from "@/app/components/FormContextHeader";
import MultipleSelectBoqItemButton from "@/app/components/_MultipleSelectBoqItemButton";

type SelectedItem = {
  inventory_item_id: number;
  description: string;
  unit: string;
  available_qty: number;
  quantity: string;
  serial_number?: string;
  attachment?: File | null;
  image: string;
  length: string;
  width: string;
  height: string;
};

type TransferIssueMultipleStocksProps = {
  onSuccess?: () => void;
};

export default function TransferIssueMultipleStocks({
  onSuccess,
}: TransferIssueMultipleStocksProps) {
  const trashIcon = "/icons/trash.svg";
  const uploadIcon = "/icons/upload.svg";
  const crossIcon = "/icons/cross-small.svg";
  const noImageIcon = "/icons/no-image.jpg";
  const searchIcon = "/icons/search.svg";

  const router = useRouter();

  const { userInfo } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [isSelectMaterialOpen, setIsSelectMaterialOpen] = useState(false);
  const [isAttachmentModalOpen, setIsAttachmentModalOpen] = useState(false);
  const [currentItemForAttachment, setCurrentItemForAttachment] = useState<
    number | null
  >(null);
  const [tempAttachment, setTempAttachment] = useState<File | null>(null);

  const [type, setType] = useState("");
  const [from, setFrom] = useState<string | number>("");
  const [to, setTo] = useState("");
  const [purpose, setPurpose] = useState("");
  const [receiverName, setReceiverName] = useState<string | number>("");
  const [file, setFile] = useState<File | null>(null);
  const [thirdParty, setThirdParty] = useState(false);
  const [packingList, setPackingList] = useState(false);
  const [projectID, setProjectID] = useState<string | number>("");
  const [boqLineIDs, setBoqLineIDs] = useState<number[]>([]); // ✅ Changed to array
  const [containerNumber, setContainerNumber] = useState("");

  const [fromValues, setFromValues] = useState<any>([]);
  const [toValues, setToValues] = useState<any>([]);
  const [projectValues, setProjectValues] = useState<any>([]);

  // Inventory items for selection
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [materialQuantities, setMaterialQuantities] = useState<{
    [key: number]: number;
  }>({});
  const [searchQuery, setSearchQuery] = useState<string>("");

  // ✅ Handle BOQ selection
  const handleBoqSelection = (boqIDs: number[], boqInfo: string) => {
    setBoqLineIDs(boqIDs);
  };

  // Fetch available locations dynamically
  useEffect(() => {
    if (isOpen) {
      // Fetch all inventory items
      fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/inventory`, {
        method: "GET",
      })
        .then((res) => res.json())
        .then((data) => {
          // Ensure data is an array
          if (Array.isArray(data)) {
            setInventoryItems(data);
          } else if (data && data.data && Array.isArray(data.data)) {
            setInventoryItems(data.data);
          } else {
            setInventoryItems([]);
          }
        })
        .catch((err) => {
          console.error("Error fetching inventory:", err);
          setInventoryItems([]);
        });

      // Fetch available locations from stocks
      fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/stock/getAvailableLocations`,
        {
          method: "GET",
        },
      )
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.locations) {
            setFromValues(data.locations);
          } else {
            setFromValues([]);
          }
        })
        .catch((err) => {
          console.error("Error fetching locations:", err);
          setFromValues([]);
        });

      // Fetch projects for "to" locations
      fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/projects`, {
        method: "GET",
      })
        .then((res) => res.json())
        .then((data) => {
          const locations = data.map((item: { name: string }) => item.name);
          setToValues([
            "Headquarters",
            "Umm Al Quwain Warehouse",
            ...locations,
          ]);
          setProjectValues(data);
        })
        .catch((err) => {
          console.error("Error fetching projects:", err);
        });
    }
  }, [isOpen]);

  // Fetch quantities for specific location when opening the select material modal
  useEffect(() => {
    if (isSelectMaterialOpen && inventoryItems.length > 0 && from) {
      async function fetchMaterialQuantitiesForLocation() {
        const quantities: { [key: number]: number } = {};

        await Promise.all(
          inventoryItems.map(async (item) => {
            try {
              const qty = await fetchAvailableQuantity(item.id, String(from));
              quantities[item.id] = qty;
            } catch (error) {
              console.error(
                `Error fetching quantity for item ${item.id}:`,
                error,
              );
              quantities[item.id] = 0;
            }
          }),
        );

        setMaterialQuantities(quantities);
      }

      fetchMaterialQuantitiesForLocation();
    }
  }, [isSelectMaterialOpen, inventoryItems, from]);

  useEffect(() => {
    setFrom("");
    setTo("");
    setPurpose("");
    setReceiverName("");
    setFile(null);
    setThirdParty(false);
    setProjectID("");
    setBoqLineIDs([]); // ✅ Reset array
    setSelectedItems([]);
  }, [type]);

  // Fetch available quantity for a specific item from a location
  async function fetchAvailableQuantity(
    inventoryItemId: number,
    location: string,
  ): Promise<number> {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/stock/getStocksByInventoryItemID`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            inventoryItemId,
          }),
        },
      );

      const data = await res.json();

      let locationQuantity = 0;
      const round = (n: number) => Math.round(n * 1000) / 1000;

      // ✅ Step 1: Add quantity from stocks table for this location
      if (data.stocks && Array.isArray(data.stocks)) {
        data.stocks.forEach((stock: any) => {
          if (stock.location === location) {
            locationQuantity = round(
              locationQuantity + (parseFloat(stock.quantity) || 0),
            );
          }
        });
      }

      // ✅ Step 2: Process transfers and issues for this location
      if (data.stocksTransferIssue && Array.isArray(data.stocksTransferIssue)) {
        data.stocksTransferIssue.forEach((transaction: any) => {
          const transactionType = transaction.type?.toLowerCase() || "";
          const transactionQty = parseFloat(transaction.quantity) || 0;

          // ✅ Issue for use - subtract from from_location immediately
          if (transactionType.includes("issue")) {
            if (transaction.from_location === location) {
              locationQuantity = round(locationQuantity - transactionQty);
            }
          }
          // ✅ Send for processing - subtract from from_location immediately
          else if (transactionType.includes("send")) {
            if (transaction.from_location === location) {
              locationQuantity = round(locationQuantity - transactionQty);
            }
          }
          // ✅ Material transfer - move stock between locations
          else if (transactionType.includes("transfer")) {
            // Subtract from from_location
            if (transaction.from_location === location) {
              locationQuantity = round(locationQuantity - transactionQty);
            }
            // Add to to_location
            if (transaction.to_location === location) {
              locationQuantity = round(locationQuantity + transactionQty);
            }
          }
        });
      }

      return locationQuantity > 0 ? round(locationQuantity) : 0;
    } catch (error) {
      console.error("Error fetching available quantity:", error);
      return 0;
    }
  }

  async function handleAddMaterial(selectedIds: number[]) {
    if (!from) {
      toast("Please select a location first", "error");
      return;
    }

    const newItems: SelectedItem[] = [];

    for (const id of selectedIds) {
      // Check if already added
      if (selectedItems.some((item) => item.inventory_item_id === id)) {
        continue;
      }

      const inventoryItem = inventoryItems.find((item) => item.id === id);
      if (!inventoryItem) continue;

      const availableQty = materialQuantities[id] || 0;

      if (availableQty > 0) {
        newItems.push({
          inventory_item_id: id,
          description: inventoryItem.description,
          unit: inventoryItem.unit,
          available_qty: availableQty,
          quantity: "",
          serial_number: "",
          attachment: null,
          image: inventoryItem.image || "",
          length: "",
          width: "",
          height: "",
        });
      }
    }

    setSelectedItems([...selectedItems, ...newItems]);
    setIsSelectMaterialOpen(false);
  }

  function handleQuantityChange(inventoryItemId: number, quantity: string) {
    setSelectedItems(
      selectedItems.map((item) =>
        item.inventory_item_id === inventoryItemId
          ? { ...item, quantity }
          : item,
      ),
    );
  }

  function handleSerialNumberChange(
    inventoryItemId: number,
    serialNumber: string,
  ) {
    setSelectedItems(
      selectedItems.map((item) =>
        item.inventory_item_id === inventoryItemId
          ? { ...item, serial_number: serialNumber }
          : item,
      ),
    );
  }

  function handleLengthChange(inventoryItemId: number, serialNumber: string) {
    setSelectedItems(
      selectedItems.map((item) =>
        item.inventory_item_id === inventoryItemId
          ? { ...item, length: serialNumber }
          : item,
      ),
    );
  }

  function handleWidthChange(inventoryItemId: number, serialNumber: string) {
    setSelectedItems(
      selectedItems.map((item) =>
        item.inventory_item_id === inventoryItemId
          ? { ...item, width: serialNumber }
          : item,
      ),
    );
  }

  function handleHeightChange(inventoryItemId: number, serialNumber: string) {
    setSelectedItems(
      selectedItems.map((item) =>
        item.inventory_item_id === inventoryItemId
          ? { ...item, height: serialNumber }
          : item,
      ),
    );
  }

  function handleRemoveItem(inventoryItemId: number) {
    setSelectedItems(
      selectedItems.filter(
        (item) => item.inventory_item_id !== inventoryItemId,
      ),
    );
  }

  function handleOpenAttachmentModal(inventoryItemId: number) {
    setCurrentItemForAttachment(inventoryItemId);
    const item = selectedItems.find(
      (i) => i.inventory_item_id === inventoryItemId,
    );
    setTempAttachment(item?.attachment || null);
    setIsAttachmentModalOpen(true);
  }

  function handleSaveAttachment(e: React.FormEvent) {
    e.preventDefault();

    if (currentItemForAttachment !== null) {
      setSelectedItems(
        selectedItems.map((item) =>
          item.inventory_item_id === currentItemForAttachment
            ? { ...item, attachment: tempAttachment }
            : item,
        ),
      );
    }

    setIsAttachmentModalOpen(false);
    setCurrentItemForAttachment(null);
    setTempAttachment(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (selectedItems.length === 0) {
      toast("Please add at least one material", "error");
      return;
    }

    // Validate quantities
    for (const item of selectedItems) {
      const qty = parseFloat(item.quantity);

      if (!item.quantity || isNaN(qty) || qty <= 0) {
        toast(`Please enter a valid quantity for ${item.description}`, "error");
        return;
      }
      if (qty > item.available_qty) {
        toast(
          `Quantity for ${item.description} exceeds available quantity`,
          "error",
        );
        return;
      }
    }

    // Validate attachments - all items must have attachments
    for (const item of selectedItems) {
      if (!item.attachment) {
        toast(`Please attach a file for ${item.description}`, "error");
        return;
      }
    }

    try {
      // ✅ Upload each item's attachment individually and prepare items with their attachment URLs
      const itemsForBackend = await Promise.all(
        selectedItems.map(async (item) => {
          let attachmentUrl = null;

          if (item.attachment) {
            try {
              const formData = new FormData();
              formData.append("files", item.attachment);
              formData.append("folder", "stock-issue-attachments");

              const uploadResponse = await fetch("/api/s3", {
                method: "POST",
                body: formData,
              });

              if (!uploadResponse.ok) {
                throw new Error(
                  `Failed to upload file for ${item.description}`,
                );
              }

              const uploadResult = await uploadResponse.json();
              attachmentUrl = uploadResult.urls[0]; // Get the S3 URL
            } catch (error) {
              console.error(
                `Error uploading file for ${item.description}:`,
                error,
              );
              toast(`Failed to upload file for ${item.description}`, "error");
              throw error;
            }
          }

          // ✅ Return item with its individual attachment URL
          return {
            inventory_item_id: item.inventory_item_id,
            quantity: item.quantity,
            serial_number: item.serial_number || null,
            attachment: attachmentUrl, // ✅ Each item has its own attachment
            length: item.length,
            width: item.width,
            height: item.height,
          };
        }),
      );

      // ✅ Submit to backend with items containing their individual attachments
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "transferIssueMultipleStocks",
          items: itemsForBackend.map((item, index) => ({
            ...item,
            inventory_item_name: selectedItems[index].description, // ✅ Add item name
          })),
          project_id: projectID,
          boq_line_ids: boqLineIDs,
          type,
          transferee: userInfo?.name,
          from,
          to,
          purpose,
          third_party_involved: thirdParty,
          packing_list_required: packingList,
          receiver_name: receiverName,
          container_number: containerNumber,
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

        {
          onSuccess && onSuccess();
        }

        // Reset form
        setType("");
        setFrom("");
        setTo("");
        setPurpose("");
        setReceiverName("");
        setFile(null);
        setThirdParty(false);
        setPackingList(false);
        setProjectID("");
        setBoqLineIDs([]); // ✅ Reset array
        setSelectedItems([]);

        router.refresh();
        setIsOpen(false);
      } else {
        const errorData = await res.json();
        toast(errorData.error || "Failed to transfer or issue stock", "error");
      }
    } catch (error) {
      console.error("Error submitting transfer:", error);
      toast("Failed to transfer or issue stock", "error");
    }
  }

  function formatQuantity(qty: number | string | undefined | null) {
    if (qty == null) return "0"; // handles undefined or null
    const num = Number(qty);
    if (isNaN(num)) return "0"; // fallback if it's not a valid number
    return Number.isInteger(num)
      ? num.toString()
      : num.toFixed(3).replace(/\.?0+$/, "");
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
        ISSUE/TRANSFER MULTIPLE STOCK -
      </Button>

      {isOpen && (
        <FormPopUp
          header={"ISSUE/TRANSFER MULTIPLE STOCK"}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"CONFIRM"}
          style={{ minWidth: from ? "1800px" : "" }}
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
              <div className="input-item">
                <label className="custom">
                  <span>BILL OF QUANTITY REFERENCE</span>
                  <small style={{ fontStyle: "italic", fontWeight: "100" }}>
                    (OPTIONAL)
                  </small>
                </label>

                {/* ✅ Updated to support multiple BOQ items */}
                <MultipleSelectBoqItemButton
                  projectID={Number(projectID)}
                  onSelectBoq={handleBoqSelection}
                  disabled={projectID === ""}
                  currentBoqLineIDs={boqLineIDs}
                  style={{ height: "30.5px" }}
                />
              </div>
            </div>
          )}

          <br />

          {type !== "" && (
            <>
              <FormContextHeader>LOCATION & RESPONSIBILITY</FormContextHeader>
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
                  placeholder={"SELECT LOCATION"}
                  required
                  onChange={(e) => {
                    setFrom(e.target.value);
                    // Clear selected items when location changes
                    setSelectedItems([]);
                    // Clear material quantities to trigger refetch
                    setMaterialQuantities({});
                  }}
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
                    selectOptions={toValues.filter(
                      (val: string) => val !== from,
                    )}
                  />
                ) : (
                  <InputItem
                    label={
                      type.toLowerCase().includes("send")
                        ? "FULL NAME OF RECIPIENT / ORGANIZATION"
                        : "FULL NAME OF RECIPIENT"
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
                    <InputItem
                      label={"FULL NAME OF SITE RECIPIENT"}
                      value={receiverName}
                      type={"text"}
                      onChange={(e) => setReceiverName(e.target.value)}
                      required
                    />
                  </div>
                </>
              )}

              {(type.toLowerCase().includes("transfer") ||
                type.toLowerCase().includes("send")) && (
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
                </>
              )}

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

                  <div className="input-row half">
                    <InputItem
                      label={"CONTAINER NUMBER / VEHICLE REFERENCE NUMBER"}
                      value={containerNumber}
                      type={"text"}
                      onChange={(e) => setContainerNumber(e.target.value)}
                      required
                    />
                  </div>
                </>
              )}

              <br />

              {from && (
                <>
                  <FormContextHeader>LINE ITEMS TABLE</FormContextHeader>
                  {selectedItems.length > 0 ? (
                    <table className="items-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>ITEM</th>
                          <th>AVAILABLE QUANTITY</th>
                          <th>
                            QUANTITY TO{" "}
                            {type.toLowerCase().includes("issue")
                              ? "ISSUE"
                              : type.toLowerCase().includes("transfer")
                                ? "TRANSFER"
                                : "SEND"}
                          </th>
                          <th>SERIAL/MODEL NUMBER</th>
                          {packingList && (
                            <>
                              <th>LENGTH</th>
                              <th>WIDTH</th>
                              <th>HEIGHT</th>
                            </>
                          )}
                          <th>PROOF/ATTACHMENTS</th>
                          <th>ACTION</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedItems.map((item, index) => (
                          <tr key={item.inventory_item_id}>
                            <td>{index + 1}</td>
                            <td>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "25px",
                                }}
                              >
                                <div style={{ width: "50px" }}>
                                  {item.image ? (
                                    <img
                                      src={item.image}
                                      alt={item.description}
                                      width={50}
                                      style={{
                                        aspectRatio: "1/1",
                                        borderRadius: "5px",
                                        objectFit: "cover",
                                      }}
                                    />
                                  ) : (
                                    <img
                                      src={noImageIcon}
                                      alt="reference image"
                                      width={50}
                                      style={{
                                        aspectRatio: "1/1",
                                        objectFit: "cover",
                                        borderRadius: "5px",
                                      }}
                                    />
                                  )}
                                </div>
                                <div>{item.description}</div>
                              </div>
                            </td>
                            <td>
                              {formatQuantity(item.available_qty)} {item.unit}
                            </td>
                            <td>
                              <InputItem
                                label=""
                                placeholder="ENTER QUANTITY"
                                noOptionalLabel={true}
                                value={item.quantity || ""}
                                type={"text"}
                                onChange={(e) => {
                                  let val = e.target.value;

                                  // Remove any commas
                                  val = val.replace(/,/g, "");

                                  // Clear input if empty
                                  if (val === "") {
                                    handleQuantityChange(
                                      item.inventory_item_id,
                                      "",
                                    );
                                    return;
                                  }

                                  // Allow only numbers and a single decimal point
                                  if (!/^\d*\.?\d*$/.test(val)) {
                                    return;
                                  }

                                  // Set the value as-is (with decimal if present)
                                  handleQuantityChange(
                                    item.inventory_item_id,
                                    val,
                                  );
                                }}
                                required
                              />
                            </td>
                            <td>
                              <InputItem
                                label=""
                                placeholder="ENTER MODEL/SERIAL NUMBER"
                                noOptionalLabel={true}
                                value={item.serial_number || ""}
                                type={"text"}
                                onChange={(e) => {
                                  handleSerialNumberChange(
                                    item.inventory_item_id,
                                    e.target.value,
                                  );
                                }}
                              />
                            </td>
                            {packingList && (
                              <>
                                <td>
                                  <InputItem
                                    label=""
                                    placeholder="ENTER LENGTH"
                                    noOptionalLabel={true}
                                    value={item.length || ""}
                                    type={"text"}
                                    onChange={(e) => {
                                      handleLengthChange(
                                        item.inventory_item_id,
                                        e.target.value,
                                      );
                                    }}
                                  />
                                </td>
                                <td>
                                  <InputItem
                                    label=""
                                    placeholder="ENTER WIDTH"
                                    noOptionalLabel={true}
                                    value={item.width || ""}
                                    type={"text"}
                                    onChange={(e) => {
                                      handleWidthChange(
                                        item.inventory_item_id,
                                        e.target.value,
                                      );
                                    }}
                                  />
                                </td>
                                <td>
                                  <InputItem
                                    label=""
                                    placeholder="ENTER HEIGHT"
                                    noOptionalLabel={true}
                                    value={item.height || ""}
                                    type={"text"}
                                    onChange={(e) => {
                                      handleHeightChange(
                                        item.inventory_item_id,
                                        e.target.value,
                                      );
                                    }}
                                  />
                                </td>
                              </>
                            )}

                            <td>
                              {item.attachment ? (
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "10px",
                                  }}
                                >
                                  <img
                                    src={URL.createObjectURL(item.attachment)}
                                    alt="Preview"
                                    style={{
                                      width: "50px",
                                      height: "50px",
                                      objectFit: "cover",
                                      borderRadius: "5px",
                                      border: "1px solid #ddd",
                                    }}
                                  />
                                  <Button
                                    componentType={"button"}
                                    bgColor={"rgba(239, 239, 239, 1)"}
                                    borderColor={"rgba(223, 223, 223, 1)"}
                                    textColor={"black"}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      setSelectedItems(
                                        selectedItems.map((i) =>
                                          i.inventory_item_id ===
                                          item.inventory_item_id
                                            ? { ...i, attachment: null }
                                            : i,
                                        ),
                                      );
                                    }}
                                    style={{ padding: "7px 7px" }}
                                  >
                                    <img src={crossIcon} alt="Remove" />
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  componentType={"button"}
                                  bgColor={"rgba(239, 239, 239, 1)"}
                                  borderColor={"rgba(223, 223, 223, 1)"}
                                  textColor={"black"}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleOpenAttachmentModal(
                                      item.inventory_item_id,
                                    );
                                  }}
                                  style={{ padding: "7px 7px" }}
                                >
                                  <img
                                    src={uploadIcon}
                                    style={{
                                      filter: "invert(1)",
                                    }}
                                  />
                                </Button>
                              )}
                            </td>
                            <td>
                              <Button
                                componentType={"button"}
                                bgColor={"rgba(239, 239, 239, 1)"}
                                borderColor={"rgba(223, 223, 223, 1)"}
                                textColor={"black"}
                                onClick={() =>
                                  handleRemoveItem(item.inventory_item_id)
                                }
                                style={{ padding: "7px 7px" }}
                              >
                                <img src={trashIcon} alt="delete" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "40px",
                        color: "#888",
                        backgroundColor: "#f9f9f9",
                        borderRadius: "5px",
                      }}
                    >
                      NO MATERIALS ADDED
                    </div>
                  )}

                  <br />

                  <Button
                    componentType={"button"}
                    bgColor="rgba(239, 239, 239, 1)"
                    borderColor="rgba(239, 239, 239, 1)"
                    textColor={"black"}
                    onClick={(e) => {
                      e.preventDefault();
                      setIsSelectMaterialOpen(true);
                    }}
                    disabled={!from}
                    full
                    style={{ padding: "20px 0px" }}
                  >
                    ADD MATERIAL +
                  </Button>

                  <br />
                  <br />
                </>
              )}
            </>
          )}
        </FormPopUp>
      )}

      {/* Select Material Modal */}
      {isSelectMaterialOpen && (
        <FormPopUp
          header={`SELECT MATERIALS`}
          setIsOpen={setIsSelectMaterialOpen}
          handleSubmit={(e) => {
            e.preventDefault();
            const checkboxes = document.querySelectorAll<HTMLInputElement>(
              'input[name="material-select"]:checked',
            );
            const selectedIds = Array.from(checkboxes).map((cb) =>
              Number(cb.value),
            );
            handleAddMaterial(selectedIds);
          }}
          addButtonLabel={"CONFIRM"}
          style={{ minWidth: "1300px" }}
        >
          <div
            style={{
              position: "relative",
              flex: 1,
              maxWidth: "400px",
              backgroundColor: "white",
            }}
          >
            <input
              type="text"
              placeholder="SEARCH"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "400px",
                padding: "10px 40px 10px 15px",
                borderRadius: "8px",
                border: "1px solid rgba(223, 223, 223, 1)",
                fontSize: "14px",
              }}
            />
            <img
              src={searchIcon}
              alt="search"
              style={{
                position: "absolute",
                right: "15px",
                top: "50%",
                transform: "translateY(-50%)",
                width: "16px",
                height: "16px",
                opacity: 0.5,
              }}
            />
          </div>

          <br />

          <table className="items-table two-toned">
            <thead>
              <tr>
                <th></th>
                <th>#</th>
                <th>ID</th>
                <th>MATERIAL</th>
                <th>AVAILABLE QUANTITY</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {inventoryItems.length > 0 ? (
                inventoryItems
                  .filter((item) => {
                    // Only show items with stock at this location
                    const qty = materialQuantities[item.id] ?? 0;
                    return qty > 0;
                  })
                  .filter((item) => {
                    // ✅ Search filter - search by ID or description
                    if (!searchQuery.trim()) return true;

                    const query = searchQuery.toLowerCase();
                    const itemId =
                      `INV-${String(item.id).padStart(5, "0")}`.toLowerCase();
                    const description = (item.description || "").toLowerCase();

                    return (
                      itemId.includes(query) || description.includes(query)
                    );
                  })
                  .map((item, index) => {
                    const isAlreadyAdded = selectedItems.some(
                      (selected) => selected.inventory_item_id === item.id,
                    );

                    // Get available quantity from state
                    const availableQty = materialQuantities[item.id] ?? 0;

                    // Calculate stock status
                    const stockStatus =
                      availableQty === 0
                        ? {
                            label: "OUT OF STOCK",
                            bgColor: "rgba(255, 181, 181, 1)",
                            textColor: "rgba(248, 77, 77, 1)",
                          }
                        : availableQty <= (item.minimum_stock_quantity || 0)
                          ? {
                              label: "LOW STOCK",
                              bgColor: "rgba(255, 250, 189, 1)",
                              textColor: "rgba(134, 83, 47, 1)",
                            }
                          : {
                              label: "IN STOCK",
                              bgColor: "rgba(149, 222, 189, 1)",
                              textColor: "rgba(0, 108, 60, 1)",
                            };

                    return (
                      <tr key={item.id}>
                        <td>
                          <input
                            type="checkbox"
                            name="material-select"
                            value={item.id}
                            disabled={isAlreadyAdded}
                            style={{
                              width: "18px",
                              height: "18px",
                              cursor: isAlreadyAdded
                                ? "not-allowed"
                                : "pointer",
                              accentColor: "#10b981",
                            }}
                          />
                        </td>
                        <td>{index + 1}</td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          INV-{String(item.id).padStart(5, "0")}
                        </td>
                        <td>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "25px",
                            }}
                          >
                            <div style={{ width: "50px" }}>
                              {item.image ? (
                                <img
                                  src={item.image}
                                  alt={item.description}
                                  width={50}
                                  style={{
                                    aspectRatio: "1/1",
                                    borderRadius: "5px",
                                    objectFit: "cover",
                                  }}
                                />
                              ) : (
                                <img
                                  src={noImageIcon}
                                  alt="reference image"
                                  width={50}
                                  style={{
                                    aspectRatio: "1/1",
                                    objectFit: "cover",
                                    borderRadius: "5px",
                                  }}
                                />
                              )}
                            </div>
                            <div>{item.description}</div>
                          </div>
                        </td>
                        <td>
                          {materialQuantities[item.id] === undefined
                            ? "Loading..."
                            : `${formatQuantity(availableQty)} ${item.unit || ""}`}
                        </td>
                        <td>
                          <div
                            className="approval-pill normal-text"
                            style={{
                              backgroundColor: stockStatus.bgColor,
                              color: stockStatus.textColor,
                            }}
                          >
                            {stockStatus.label}
                          </div>
                        </td>
                      </tr>
                    );
                  })
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    style={{ textAlign: "center", padding: "40px" }}
                  >
                    {Object.keys(materialQuantities).length > 0
                      ? "No items with stock at this location"
                      : "Loading..."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </FormPopUp>
      )}

      {/* Attachment Modal */}
      {isAttachmentModalOpen && (
        <FormPopUp
          header={"UPLOAD FILE"}
          setIsOpen={setIsAttachmentModalOpen}
          handleSubmit={handleSaveAttachment}
          addButtonLabel={"CONFIRM"}
        >
          <div className="input-row full">
            <SingleUploadFileBox
              fileState={tempAttachment}
              setFileState={setTempAttachment}
              label={"IMAGE OF MATERIAL / EQUIPMENT"}
              acceptedFileTypes={".png,.jpg,.jpeg"}
              required
            />
          </div>
        </FormPopUp>
      )}
    </>
  );
}
