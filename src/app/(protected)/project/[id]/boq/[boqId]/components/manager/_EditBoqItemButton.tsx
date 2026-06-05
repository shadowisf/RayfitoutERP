"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import { UNIT_OPTIONS } from "@/constants/units";
import Button from "@/app/components/Button";
import { useRouter } from "next/navigation";
import { BoqLine } from "../../types/boqLine";
import SingleSelectDropdown from "@/app/components/SingleSelectDropdown";
import { toast } from "@/app/components/Toast";
import MultiSelectDropdown from "@/app/components/MultiSelectDropdown";
import MultipleUploadFileBox from "@/app/components/MultipleUploadFileBox";
import CreateLocationButton from "./_AddLocationButton";
import { useRefresh } from "@/app/context/RefreshContext";

function addCommas(val: string): string {
  if (!val) return val;
  const parts = val.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}
function formatMoneyOpen(val: string | number): string {
  const n = Number(val);
  if (!val && val !== 0) return "";
  if (isNaN(n)) return "";
  return n.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}
function formatQtyOpen(val: string | number): string {
  const n = Number(val);
  if (!val && val !== 0) return "";
  if (isNaN(n)) return "";
  return n % 1 === 0 ? String(n) : parseFloat(n.toFixed(10)).toString();
}
function stripCommas(val: string | number): number {
  return Number(String(val).replace(/,/g, "")) || 0;
}

type EditBoqItemButtonProps = {
  item: BoqLine;
  onSuccess?: () => void;
};

export default function EditBoqItemButton({
  item,
  onSuccess,
}: EditBoqItemButtonProps) {
  const router = useRouter();
  const { refresh } = useRefresh();

  const pencilIcon = "/icons/pencil.svg";

  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [locationValues, setLocationValues] = useState<[]>([]);

  // Form states
  const [itemName, setItemName] = useState(item.item_name);
  const [category, setCategory] = useState(item.category);
  const [subCategory, setSubCategory] = useState(item.sub_category);
  const [scopeOfWork, setScopeOfWork] = useState<string | number>(
    item.scope_of_work || "",
  );
  const [locationID, setLocationID] = useState<(string | number)[]>([]);
  const [quantity, setQuantity] = useState<string>(formatQtyOpen(item.quantity ?? ""));
  const [unit, setUnit] = useState(item.unit || "");
  const [ratePerQuantity, setRatePerQuantity] = useState<string>(formatMoneyOpen(item.rate_per_quantity ?? ""));
  const [totalCost, setTotalCost] = useState<string>(formatMoneyOpen(item.total_cost ?? ""));
  const [itemDescription, setItemDescription] = useState(
    item.item_description || "",
  );
  const [dnNumberAndDate, setDnNumberAndDate] = useState(
    item.dn_number_and_date || "",
  );
  const [remarks, setRemarks] = useState(item.remarks || "");

  // File states
  const [originalAttachments, setOriginalAttachments] = useState<string[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<string[]>([]);
  const [newAttachmentFiles, setNewAttachmentFiles] = useState<File[]>([]);
  const [filesToDelete, setFilesToDelete] = useState<string[]>([]);

  // Parse location_ids safely on mount
  useEffect(() => {
    const parsedIds = Array.isArray(item.location_ids)
      ? item.location_ids
      : typeof item.location_ids === "string" && item.location_ids.trim() !== ""
        ? item.location_ids
            .split(",")
            .map((id) => Number(id.trim()))
            .filter((id) => !isNaN(id))
        : [];
    setLocationID(parsedIds);
  }, [item.location_ids]);

  // Fetch locations when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;

    const fetchLocations = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/boq/getLocationValues`,
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (mounted) setLocationValues(data);
      } catch (err) {
        console.error("Failed to fetch locations:", err);
      }
    };

    fetchLocations();

    return () => {
      mounted = false;
    };
  }, [isOpen]);

  // Parse attachments when modal opens
  useEffect(() => {
    if (!isOpen) return;

    try {
      let parsed: string[] = [];
      if (item.attachments) {
        if (Array.isArray(item.attachments)) {
          parsed = [...item.attachments];
        } else if (
          typeof item.attachments === "string" &&
          item.attachments.trim() !== "" &&
          item.attachments !== "null" &&
          item.attachments !== "[]"
        ) {
          const parsedJson = JSON.parse(item.attachments);
          parsed = Array.isArray(parsedJson) ? [...parsedJson] : [];
        }
      }
      setOriginalAttachments(parsed);
      setExistingAttachments(parsed);
    } catch (error) {
      console.error("Failed to parse attachments:", error);
      setOriginalAttachments([]);
      setExistingAttachments([]);
    }

    setFilesToDelete([]);
    setNewAttachmentFiles([]);
  }, [isOpen, item.attachments]);

  // Track deleted files immediately
  const handleExistingFilesChange = useCallback(
    (newFiles: string[]) => {
      setExistingAttachments(newFiles);
      const removed = originalAttachments.filter(
        (url) => !newFiles.includes(url),
      );
      setFilesToDelete(removed);
    },
    [originalAttachments],
  );

  // Calculate total cost
  useEffect(() => {
    const timer = setTimeout(() => {
      const rate = stripCommas(ratePerQuantity);
      const qty = stripCommas(quantity);
      if (rate > 0 && qty > 0) {
        setTotalCost(formatMoneyOpen(rate * qty));
      } else {
        setTotalCost("");
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [ratePerQuantity, quantity]);

  const deleteFilesFromS3 = async (urls: string[]) => {
    if (urls.length === 0) return;

    const results = await Promise.allSettled(
      urls.map(async (url) => {
        const res = await fetch("/api/s3", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "delete", url }),
        });
        if (!res.ok) throw new Error(`Failed to delete: ${url}`);
        return url;
      }),
    );

    const failed = results
      .filter((r): r is PromiseRejectedResult => r.status === "rejected")
      .map((r) => r.reason);

    if (failed.length > 0) {
      console.warn("Some files failed to delete:", failed);
    }

    return results.filter((r) => r.status === "fulfilled").length;
  };

  const uploadFiles = async (files: File[]): Promise<string[]> => {
    if (files.length === 0) return [];

    setIsUploading(true);
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));

      const res = await fetch("/api/s3", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Upload failed");
      }

      const data = await res.json();

      if (data.failedFiles?.length > 0) {
        toast(`${data.failedFiles.length} file(s) failed to upload`, "warning");
      }

      if (!Array.isArray(data.urls)) {
        throw new Error("Invalid upload response");
      }

      return data.urls;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || isUploading) return;

    setIsLoading(true);

    try {
      // Step 1: Delete removed files
      if (filesToDelete.length > 0) {
        await deleteFilesFromS3(filesToDelete);
      }

      // Step 2: Upload new files
      const newUrls = await uploadFiles(newAttachmentFiles);

      // Step 3: Combine final attachment list
      const finalAttachments = [...existingAttachments, ...newUrls];

      // Step 4: Update database
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/boq`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateAll",
          id: item.id,
          item_name: itemName,
          category,
          sub_category: subCategory,
          scope_of_work: scopeOfWork || null,
          location_ids: locationID,
          quantity: stripCommas(quantity),
          unit,
          rate_per_quantity: stripCommas(ratePerQuantity),
          total_cost: stripCommas(totalCost),
          item_description: itemDescription || null,
          attachments: JSON.stringify(finalAttachments),
          dn_number_and_date: dnNumberAndDate || null,
          remarks: remarks || null,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Update failed");
      }

      toast("Bill of quantity item updated", "success");

      // Reset all states
      setIsOpen(false);
      setFilesToDelete([]);
      setNewAttachmentFiles([]);
      setExistingAttachments([]);
      setOriginalAttachments([]);

      onSuccess?.();
      await refresh();
    } catch (error: any) {
      console.error("Update error:", error);
      toast(error.message || "Failed to update item", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Reset form when item changes
  useEffect(() => {
    setItemName(item.item_name);
    setCategory(item.category);
    setSubCategory(item.sub_category);
    setScopeOfWork(item.scope_of_work || "");
    setQuantity(formatQtyOpen(item.quantity ?? ""));
    setUnit(item.unit || "");
    setRatePerQuantity(formatMoneyOpen(item.rate_per_quantity ?? ""));
    setTotalCost(formatMoneyOpen(item.total_cost ?? ""));
    setItemDescription(item.item_description || "");
    setDnNumberAndDate(item.dn_number_and_date || "");
    setRemarks(item.remarks || "");
  }, [item]);

  return (
    <>
      <Button
        componentType="button"
        bgColor="transparent"
        borderColor="transparent"
        textColor="black"
        onClick={() => setIsOpen(true)}
        full
        style={{ justifyContent: "flex-start" }}
      >
        <img src={pencilIcon} alt="pencil" /> Edit
      </Button>

      {isOpen && typeof window !== "undefined" && createPortal(<FormPopUp
          header="UPDATE BILL OF QUANTITY ITEM"
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={isLoading ? "SAVING..." : "CONFIRM"}
        >
          <div className="input-row three-col">
            <InputItem
              label="CATEGORY"
              value={category}
              type="text"
              placeholder="ENTER CATEGORY"
              onChange={(e) => setCategory(e.target.value)}
              required
              disabled
            />
            <InputItem
              label="SUBCATEGORY"
              value={subCategory}
              type="text"
              placeholder="ENTER SUB CATEGORY"
              onChange={(e) => setSubCategory(e.target.value)}
              required
              disabled
            />
            <InputItem
              label="NAME"
              value={itemName}
              type="text"
              placeholder="ENTER NAME"
              onChange={(e) => setItemName(e.target.value)}
              required
            />
          </div>

          <div className="input-row full">
            <InputItem
              label="DN NUMBER & DATE"
              value={dnNumberAndDate}
              type="text"
              onChange={(e) => setDnNumberAndDate(e.target.value)}
            />
          </div>

          <div className="input-row half">
            <SingleSelectDropdown
              label="SCOPE OF WORK"
              selectedValue={scopeOfWork}
              onChange={setScopeOfWork}
              selectOptions={[
                "Supply",
                "Supply & installation",
                "Installation",
                "Demolition & cart away",
              ]}
              placeholder="SELECT SCOPE OF WORK"
            />
            <MultiSelectDropdown
              label="LOCATION"
              selectedValues={locationID}
              onChange={setLocationID}
              placeholder="SELECT LOCATION"
              dbData={locationValues}
              style={{ width: "400px" }}
              bottomButtonComponent={
                <CreateLocationButton
                  onSuccess={() => {
                    fetch(
                      `${process.env.NEXT_PUBLIC_BASE_URL}/api/boq/getLocationValues`,
                    )
                      .then((r) => r.json())
                      .then((data) => setLocationValues(data))
                      .catch(console.error);
                  }}
                />
              }
            />
          </div>

          <div className="input-row half">
            <InputItem
              label="QUANTITY"
              value={quantity}
              type="text"
              onChange={(e) => {
                const raw = e.target.value.replace(/,/g, "");
                if (raw === "" || /^\d*\.?\d{0,3}$/.test(raw)) setQuantity(addCommas(raw));
              }}
              onBlur={() => { if (quantity !== "") setQuantity(formatMoneyOpen(stripCommas(quantity))); }}
              required
            />
            <InputItem
              label="UNIT"
              value={unit}
              type="select"
              placeholder="SELECT UNIT"
              onChange={(e) => setUnit(e.target.value)}
              selectOptions={[...UNIT_OPTIONS]}
              required
            />
          </div>

          <div className="input-row half">
            <InputItem
              label="RATE / QUANTITY"
              value={ratePerQuantity}
              type="text"
              placeholder="ENTER RATE / QUANTITY"
              onChange={(e) => {
                const raw = e.target.value.replace(/,/g, "");
                if (raw === "" || /^\d*\.?\d{0,3}$/.test(raw)) setRatePerQuantity(addCommas(raw));
              }}
              onBlur={() => { if (ratePerQuantity !== "") setRatePerQuantity(formatMoneyOpen(stripCommas(ratePerQuantity))); }}
              required
            />
            <InputItem
              label="TOTAL PRICE"
              value={totalCost}
              type="text"
              placeholder="CALCULATING..."
              onChange={() => {}}
              required
              disabled
            />
          </div>

          <div className="input-row full">
            <InputItem
              label="DESCRIPTION"
              value={itemDescription || ""}
              type="textarea"
              placeholder="ENTER DESCRIPTION"
              onChange={(e) => setItemDescription(e.target.value)}
              required={false}
            />
          </div>

          <div className="input-row full">
            <InputItem
              label="REMARKS"
              value={remarks}
              type="textarea"
              onChange={(e) => setRemarks(e.target.value)}
              required={false}
            />
          </div>

          <div className="input-row full">
            <MultipleUploadFileBox
              fileState={newAttachmentFiles}
              setFileState={setNewAttachmentFiles}
              label="ATTACHMENTS"
              acceptedFileTypes=".jpeg,.jpg,.png,.webp"
              existingFileUrls={existingAttachments}
              onExistingFilesChange={handleExistingFilesChange}
            />
          </div>
        </FormPopUp>, document.body)}
    </>
  );
}
