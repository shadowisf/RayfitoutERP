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
import { useRefresh } from "@/app/context/RefreshContext";

type TransactionItem = {
  id: number;
  inventory_item_id: number;
  description: string;
  unit: string;
  quantity: number | string;
  serial_number?: string;
  attachment: string | null;
  image?: string;
  available_qty?: number;
  length?: string;
  width?: string;
  height?: string;
};

type EditTransactionButtonProps = {
  transaction: {
    id: number;
    type: string;
    from_location: string;
    to_location?: string;
    purpose: string;
    receiver_name?: string;
    project_id?: number;
    boq_line_ids?: number[];
    third_party_involved?: boolean;
    packing_list_required?: boolean;
    container_number?: string;
    items: TransactionItem[];
  };
  onSuccess?: () => void;
};

export default function EditTransactionButton({
  transaction,
  onSuccess,
}: EditTransactionButtonProps) {
  const pencilIcon = "/icons/pencil.svg";
  const trashIcon = "/icons/trash.svg";
  const uploadIcon = "/icons/upload.svg";
  const crossIcon = "/icons/cross-small.svg";
  const noImageIcon = "/icons/no-image.jpg";

  const router = useRouter();
  const { refresh } = useRefresh();

  const { userInfo } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [isAttachmentModalOpen, setIsAttachmentModalOpen] = useState(false);
  const [currentItemForAttachment, setCurrentItemForAttachment] = useState<
    number | null
  >(null);
  const [originalAttachmentUrl, setOriginalAttachmentUrl] = useState<
    string | null
  >(null);
  const [newAttachmentFile, setNewAttachmentFile] = useState<File | null>(null);

  // Form states
  const [type, setType] = useState(transaction.type || "");
  const [from, setFrom] = useState<string | number>(
    transaction.from_location || "",
  );
  const [to, setTo] = useState(transaction.to_location || "");
  const [purpose, setPurpose] = useState(transaction.purpose || "");
  const [receiverName, setReceiverName] = useState<string | number>(
    transaction.receiver_name || "",
  );
  const [projectID, setProjectID] = useState<string | number>(
    transaction.project_id || "",
  );
  const [boqLineIDs, setBoqLineIDs] = useState<number[]>(
    transaction.boq_line_ids || [],
  );
  const [thirdParty, setThirdParty] = useState(
    transaction.third_party_involved || false,
  );
  const [packingList, setPackingList] = useState(
    transaction.packing_list_required || false,
  );
  const [containerNumber, setContainerNumber] = useState(
    transaction.container_number || "",
  );

  const [fromValues, setFromValues] = useState<any>([]);
  const [toValues, setToValues] = useState<any>([]);
  const [projectValues, setProjectValues] = useState<any>([]);

  const [selectedItems, setSelectedItems] = useState<TransactionItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);

  function formatQuantityInput(
    qty: number | string | undefined | null,
  ): string {
    if (qty == null || qty === "") return "";
    const num = Number(qty);
    if (isNaN(num)) return "";
    return Number.isInteger(num) ? num.toString() : num.toString();
  }

  const handleBoqSelection = (boqIDs: number[]) => {
    setBoqLineIDs(boqIDs);
  };

  useEffect(() => {
    if (isOpen && transaction.items.length > 0) {
      setIsLoadingItems(true);

      Promise.all(
        transaction.items.map(async (item) => {
          try {
            const res = await fetch(
              `${process.env.NEXT_PUBLIC_BASE_URL}/api/stock/getTransactionItemDetails`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  inventory_item_id: item.inventory_item_id,
                  from_location: transaction.from_location,
                  transaction_id: transaction.id,
                }),
              },
            );

            if (res.ok) {
              const data = await res.json();
              if (data.success) {
                return {
                  ...item,
                  description: data.data.description,
                  unit: data.data.unit,
                  image: data.data.image,
                  available_qty: data.data.available_qty,
                  attachment: data.data.attachment || null,
                  quantity: formatQuantityInput(item.quantity),
                };
              }
            }
            return {
              ...item,
              quantity: formatQuantityInput(item.quantity),
              attachment: item.attachment || null,
            };
          } catch (error) {
            console.error(
              `Error fetching details for item ${item.inventory_item_id}:`,
              error,
            );
            return {
              ...item,
              quantity: formatQuantityInput(item.quantity),
              attachment: item.attachment || null,
            };
          }
        }),
      ).then((enrichedItems) => {
        setSelectedItems(enrichedItems);
        setIsLoadingItems(false);
      });

      fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/stock/getAvailableLocations`,
        { method: "GET" },
      )
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.locations) setFromValues(data.locations);
        })
        .catch((err) => console.error("Error fetching locations:", err));

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
        .catch((err) => console.error("Error fetching projects:", err));
    }
  }, [isOpen, transaction]);

  useEffect(() => {
    if (isOpen && from && from !== transaction.from_location) {
      setSelectedItems([]);
    }
  }, [from, isOpen, transaction.from_location]);

  const handleQuantityChange = (inventoryItemId: number, quantity: string) => {
    setSelectedItems(
      selectedItems.map((item) =>
        item.inventory_item_id === inventoryItemId
          ? { ...item, quantity }
          : item,
      ),
    );
  };

  const handleSerialNumberChange = (
    inventoryItemId: number,
    serialNumber: string,
  ) => {
    setSelectedItems(
      selectedItems.map((item) =>
        item.inventory_item_id === inventoryItemId
          ? { ...item, serial_number: serialNumber }
          : item,
      ),
    );
  };

  const handleDimensionChange = (
    inventoryItemId: number,
    field: "length" | "width" | "height",
    value: string,
  ) => {
    setSelectedItems(
      selectedItems.map((item) =>
        item.inventory_item_id === inventoryItemId
          ? { ...item, [field]: value }
          : item,
      ),
    );
  };

  const handleRemoveItem = (inventoryItemId: number) => {
    setSelectedItems(
      selectedItems.filter(
        (item) => item.inventory_item_id !== inventoryItemId,
      ),
    );
  };

  const handleOpenAttachmentModal = (inventoryItemId: number) => {
    const item = selectedItems.find(
      (i) => i.inventory_item_id === inventoryItemId,
    );
    if (!item) return;

    setCurrentItemForAttachment(inventoryItemId);
    setOriginalAttachmentUrl(item.attachment);
    setNewAttachmentFile(null);
    setIsAttachmentModalOpen(true);
  };

  const handleSaveAttachment = (e: React.FormEvent) => {
    e.preventDefault();

    if (currentItemForAttachment === null) {
      setIsAttachmentModalOpen(false);
      return;
    }

    setSelectedItems(
      selectedItems.map((item) => {
        if (item.inventory_item_id !== currentItemForAttachment) return item;

        if (newAttachmentFile) {
          return {
            ...item,
            attachment: URL.createObjectURL(newAttachmentFile),
          };
        }
        return { ...item, attachment: originalAttachmentUrl };
      }),
    );

    setIsAttachmentModalOpen(false);
    setCurrentItemForAttachment(null);
    setNewAttachmentFile(null);
    setOriginalAttachmentUrl(null);
  };

  const handleClearAttachment = (inventoryItemId: number) => {
    setSelectedItems(
      selectedItems.map((item) =>
        item.inventory_item_id === inventoryItemId
          ? { ...item, attachment: null }
          : item,
      ),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedItems.length === 0) {
      toast("Please add at least one material", "error");
      return;
    }

    for (const item of selectedItems) {
      const qty = parseFloat(String(item.quantity));
      if (!item.quantity || isNaN(qty) || qty <= 0) {
        toast(`Please enter a valid quantity for ${item.description}`, "error");
        return;
      }

      const originalItem = transaction.items.find(
        (i) => i.inventory_item_id === item.inventory_item_id,
      );
      const originalQty = originalItem
        ? parseFloat(String(originalItem.quantity)) || 0
        : 0;
      const netAvailable = (item.available_qty || 0) + originalQty;

      if (qty > netAvailable) {
        toast(
          `Quantity for ${item.description} exceeds available quantity (${formatQuantity(netAvailable)} ${item.unit})`,
          "error",
        );
        return;
      }
    }

    try {
      const itemsForBackend = await Promise.all(
        selectedItems.map(async (item) => {
          let finalAttachment: string | null = null;
          const isNewFile =
            item.attachment && item.attachment.startsWith("blob:");

          if (isNewFile && item.attachment) {
            const response = await fetch(item.attachment);
            const blob = await response.blob();
            const file = new File([blob], "attachment.jpg", {
              type: blob.type,
            });

            const formData = new FormData();
            formData.append("files", file);
            formData.append("folder", "stock-issue-attachments");

            const uploadResponse = await fetch("/api/s3", {
              method: "POST",
              body: formData,
            });

            if (!uploadResponse.ok) {
              throw new Error(`Failed to upload file for ${item.description}`);
            }

            const uploadResult = await uploadResponse.json();
            finalAttachment = uploadResult.urls[0];
          } else if (item.attachment && !item.attachment.startsWith("blob:")) {
            finalAttachment = item.attachment;
          }

          return {
            inventory_item_id: item.inventory_item_id,
            quantity: item.quantity,
            serial_number: item.serial_number || null,
            attachment: finalAttachment,
            length: item.length,
            width: item.width,
            height: item.height,
          };
        }),
      );

      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/stock`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateTransferIssueTransaction",
          transaction_id: transaction.id,
          items: itemsForBackend,
          project_id: projectID,
          boq_line_ids: boqLineIDs,
          type,
          from,
          to,
          purpose,
          receiver_name: receiverName,
          third_party_involved: thirdParty,
          packing_list_required: packingList,
          container_number: containerNumber,
        }),
      });

      if (res.ok) {
        toast("Transaction updated successfully", "success");
        onSuccess && onSuccess();
        await refresh();
        setIsOpen(false);
      } else {
        const errorData = await res.json();
        toast(errorData.error || "Failed to update transaction", "error");
      }
    } catch (error) {
      console.error("Error updating transaction:", error);
      toast("Failed to update transaction", "error");
    }
  };

  const formatQuantity = (qty: number | string | undefined | null) => {
    if (qty == null) return "0";
    const num = Number(qty);
    if (isNaN(num)) return "0";
    return Number.isInteger(num)
      ? num.toString()
      : num.toFixed(3).replace(/\.?0+$/, "");
  };

  return (
    <>
      <Button
        componentType="button"
        bgColor="rgba(239, 239, 239, 1)"
        borderColor="rgba(223, 223, 223, 1)"
        textColor="black"
        onClick={() => setIsOpen(true)}
        style={{ padding: "7px 7px" }}
      >
        <img src={pencilIcon} alt="edit" />
      </Button>

      {isOpen && (
        <FormPopUp
          header={`EDIT TRANSACTION - TA-${String(transaction.id).padStart(5, "0")}`}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel="CONFIRM"
          style={{ minWidth: "1800px" }}
        >
          <FormContextHeader>TRANSFER CONTEXT</FormContextHeader>
          <div className="input-row half">
            <InputItem
              label="TYPE"
              value={type}
              type="select"
              required
              onChange={(e) => setType(e.target.value)}
              selectOptions={[
                "Material transfer",
                "Issue for use",
                "Send for processing",
              ]}
              disabled
            />
            <InputItem
              label={
                type.toLowerCase().includes("transfer")
                  ? "PURPOSE OF TRANSFER"
                  : type.toLowerCase().includes("issue")
                    ? "PURPOSE OF ISSUE"
                    : "PURPOSE OF SENDING"
              }
              value={purpose}
              type="select"
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
              type="select"
              placeholder="SELECT LOCATION"
              required
              onChange={(e) => setFrom(e.target.value)}
              selectOptions={fromValues.filter((val: string) => val !== to)}
            />

            {type.toLowerCase().includes("transfer") ? (
              <InputItem
                label="TRANSFER TO"
                value={to}
                type="select"
                placeholder="SELECT TRANSFER TO"
                required
                onChange={(e) => setTo(e.target.value)}
                selectOptions={toValues.filter((val: string) => val !== from)}
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
            <div className="input-row half">
              <InputItem
                label="FULL NAME OF SITE RECIPIENT"
                value={receiverName}
                type="text"
                onChange={(e) => setReceiverName(e.target.value)}
                required
              />
            </div>
          )}

          {(type.toLowerCase().includes("transfer") ||
            type.toLowerCase().includes("send")) && (
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
                      backgroundColor: thirdParty ? "#10b981" : "transparent",
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
                  style={{ maxWidth: "500px", textTransform: "uppercase" }}
                >
                  3RD PARTY TRANSPORT INVOLVED?
                </label>
              </div>
            </div>
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
                    style={{ maxWidth: "500px", textTransform: "uppercase" }}
                  >
                    PACKING LIST REQUIRED?
                  </label>
                </div>
              </div>

              <div className="input-row half">
                <InputItem
                  label="CONTAINER NUMBER / VEHICLE REFERENCE NUMBER"
                  value={containerNumber}
                  type="text"
                  onChange={(e) => setContainerNumber(e.target.value)}
                  required
                />
              </div>
            </>
          )}

          <br />

          <FormContextHeader>LINE ITEMS TABLE</FormContextHeader>
          {isLoadingItems ? (
            <div
              style={{ textAlign: "center", padding: "40px", color: "#888" }}
            >
              Loading item details...
            </div>
          ) : selectedItems.length > 0 ? (
            <table className="items-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>ITEM</th>
                  <th>AVAILABLE QTY</th>
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
                              alt="no image"
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
                    <td
                      style={{
                        fontWeight: "600",
                        color: "rgba(107, 107, 107, 1)",
                      }}
                    >
                      {formatQuantity(item.available_qty)} {item.unit}
                    </td>
                    <td>
                      <InputItem
                        label=""
                        placeholder="ENTER QUANTITY"
                        noOptionalLabel
                        value={String(item.quantity) || ""}
                        type="text"
                        onChange={(e) => {
                          let val = e.target.value.replace(/,/g, "");
                          if (val === "") {
                            handleQuantityChange(item.inventory_item_id, "");
                            return;
                          }
                          if (!/^\d*\.?\d*$/.test(val)) return;
                          handleQuantityChange(item.inventory_item_id, val);
                        }}
                        required
                      />
                    </td>
                    <td>
                      <InputItem
                        label=""
                        placeholder="ENTER MODEL/SERIAL NUMBER"
                        noOptionalLabel
                        value={item.serial_number || ""}
                        type="text"
                        onChange={(e) =>
                          handleSerialNumberChange(
                            item.inventory_item_id,
                            e.target.value,
                          )
                        }
                      />
                    </td>
                    {packingList && (
                      <>
                        <td>
                          <InputItem
                            label=""
                            placeholder="ENTER LENGTH"
                            noOptionalLabel
                            value={item.length || ""}
                            type="text"
                            onChange={(e) =>
                              handleDimensionChange(
                                item.inventory_item_id,
                                "length",
                                e.target.value,
                              )
                            }
                          />
                        </td>
                        <td>
                          <InputItem
                            label=""
                            placeholder="ENTER WIDTH"
                            noOptionalLabel
                            value={item.width || ""}
                            type="text"
                            onChange={(e) =>
                              handleDimensionChange(
                                item.inventory_item_id,
                                "width",
                                e.target.value,
                              )
                            }
                          />
                        </td>
                        <td>
                          <InputItem
                            label=""
                            placeholder="ENTER HEIGHT"
                            noOptionalLabel
                            value={item.height || ""}
                            type="text"
                            onChange={(e) =>
                              handleDimensionChange(
                                item.inventory_item_id,
                                "height",
                                e.target.value,
                              )
                            }
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
                            src={item.attachment}
                            alt="Preview"
                            style={{
                              width: "50px",
                              height: "50px",
                              objectFit: "cover",
                              borderRadius: "5px",
                              border: "1px solid #ddd",
                            }}
                          />
                          {/* <Button
                            componentType="button"
                            bgColor="rgba(239, 239, 239, 1)"
                            borderColor="rgba(223, 223, 223, 1)"
                            textColor="black"
                            onClick={(e) => {
                              e.preventDefault();
                              handleOpenAttachmentModal(item.inventory_item_id);
                            }}
                            style={{ padding: "7px 7px" }}
                          >
                            <img src={pencilIcon} alt="edit" />
                          </Button> */}
                          <Button
                            componentType="button"
                            bgColor="rgba(239, 239, 239, 1)"
                            borderColor="rgba(223, 223, 223, 1)"
                            textColor="black"
                            onClick={(e) => {
                              e.preventDefault();
                              handleClearAttachment(item.inventory_item_id);
                            }}
                            style={{ padding: "7px 7px" }}
                          >
                            <img src={crossIcon} alt="remove" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          componentType="button"
                          bgColor="rgba(239, 239, 239, 1)"
                          borderColor="rgba(223, 223, 223, 1)"
                          textColor="black"
                          onClick={(e) => {
                            e.preventDefault();
                            handleOpenAttachmentModal(item.inventory_item_id);
                          }}
                          style={{ padding: "7px 7px" }}
                        >
                          <img
                            src={uploadIcon}
                            style={{ filter: "invert(1)" }}
                            alt="upload"
                          />
                        </Button>
                      )}
                    </td>
                    <td>
                      <Button
                        componentType="button"
                        bgColor="rgba(239, 239, 239, 1)"
                        borderColor="rgba(223, 223, 223, 1)"
                        textColor="black"
                        onClick={() => handleRemoveItem(item.inventory_item_id)}
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
        </FormPopUp>
      )}

      {isAttachmentModalOpen && (
        <FormPopUp
          header="UPLOAD FILE"
          setIsOpen={setIsAttachmentModalOpen}
          handleSubmit={handleSaveAttachment}
          addButtonLabel="CONFIRM"
        >
          <div className="input-row full">
            <SingleUploadFileBox
              fileState={newAttachmentFile}
              setFileState={setNewAttachmentFile}
              existingFileUrl={originalAttachmentUrl || undefined}
              label="IMAGE OF MATERIAL / EQUIPMENT"
              acceptedFileTypes=".png,.jpg,.jpeg"
              required={false}
            />
          </div>
        </FormPopUp>
      )}
    </>
  );
}
