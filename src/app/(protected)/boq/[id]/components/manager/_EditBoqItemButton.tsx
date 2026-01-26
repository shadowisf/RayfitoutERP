"use client";

import { useState, useEffect, SetStateAction } from "react";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import Button from "@/app/components/Button";
import UploadFilesButton from "./_UploadFilesButton";
import { useRouter } from "next/navigation";
import { BoqLine } from "../../types/boqLine";
import SingleSelectDropdown from "@/app/components/SingleSelectDropdown";
import { toast } from "@/app/components/Toast";
import MultiSelectDropdown from "@/app/components/MultiSelectDropdown";
import MultipleUploadFileBox from "@/app/components/MultipleUploadFileBox";
import CreateLocationButton from "./_AddLocationButton";

type EditBoqItemButtonProps = {
  item: BoqLine;
  onSuccess?: () => void;
};

export default function EditBoqItemButton({
  item,
  onSuccess,
}: EditBoqItemButtonProps) {
  const router = useRouter();

  const pencilIcon = "/icons/pencil.svg";

  const [isOpen, setIsOpen] = useState(false);

  const [locationValues, setLocationValues] = useState<[]>([]);

  const [itemName, setItemName] = useState(item.item_name);
  const [category, setCategory] = useState(item.category);
  const [subCategory, setSubCategory] = useState(item.sub_category);
  const [scopeOfWork, setScopeOfWork] = useState<string | number>(
    item.scope_of_work,
  );
  const [locationID, setLocationID] = useState<(string | number)[]>(
    Array.isArray(item.location_ids)
      ? item.location_ids
      : typeof item.location_ids === "string"
        ? item.location_ids
            .split(",")
            .map((id) => Number(id.trim()))
            .filter((id) => !isNaN(id))
        : [],
  );
  const [quantity, setQuantity] = useState<string | number>(
    String(item.quantity),
  );
  const [unit, setUnit] = useState(item.unit);
  const [ratePerQuantity, setRatePerQuantity] = useState<string | number>(
    String(item.rate_per_quantity),
  );
  const [totalCost, setTotalCost] = useState<string | number>(item.total_cost);
  const [itemDescription, setItemDescription] = useState(item.item_description);

  const [originalAttachments, setOriginalAttachments] = useState<string[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<string[]>([]);
  const [newAttachmentFiles, setNewAttachmentFiles] = useState<File[] | null>(
    null,
  );
  const [filesToDelete, setFilesToDelete] = useState<string[]>([]);

  const [isMounted, setIsMounted] = useState(true);

  // EditBoqItemLocationButton.tsx
  useEffect(() => {
    if (!isOpen) return; // Don't fetch unless modal is open

    setIsMounted(true);

    fetchLocationValues();

    return () => {
      setIsMounted(false);
    };
  }, [isOpen]); // Only fetch when modal opens

  useEffect(() => {
    if (isOpen) {
      // Parse existing attachments when modal opens
      try {
        if (item.attachments) {
          let parsed: string[] = [];

          if (Array.isArray(item.attachments)) {
            parsed = item.attachments;
          } else if (
            typeof item.attachments === "string" &&
            item.attachments.trim() !== ""
          ) {
            const parsedJson = JSON.parse(item.attachments);
            if (Array.isArray(parsedJson)) {
              parsed = parsedJson;
            }
          }

          setOriginalAttachments(parsed);
          setExistingAttachments(parsed);
        }
      } catch (error) {
        console.error("Failed to parse existing attachments:", error);
        setOriginalAttachments([]);
        setExistingAttachments([]);
      }
    } else {
      // Reset all states when modal closes
      setFilesToDelete([]);
      setNewAttachmentFiles(null);
    }
  }, [isOpen, item.attachments]);

  // Track which existing files were removed
  useEffect(() => {
    if (isOpen && originalAttachments.length > 0) {
      const removed = originalAttachments.filter(
        (url) => !existingAttachments.includes(url),
      );
      setFilesToDelete(removed);
    }
  }, [existingAttachments, originalAttachments, isOpen]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (ratePerQuantity !== "" && quantity !== "") {
        const total = Number(ratePerQuantity) * Number(quantity);

        // ✅ force 2 decimal places
        setTotalCost(Number(total.toFixed(2)));
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [ratePerQuantity, quantity]);

  const fetchLocationValues = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/boq/getLocationValues`,
      );

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();

      if (isMounted) {
        setLocationValues(data);
      }
    } catch (err) {
      console.error("Failed to fetch location values:", err);
    }
  };

  async function deleteFilesFromS3(urls: string[]) {
    const deletePromises = urls.map(async (url) => {
      try {
        const deleteResponse = await fetch("/api/s3", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "delete",
            url: url,
          }),
        });

        if (!deleteResponse.ok) {
          const errorText = await deleteResponse.text();
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { error: errorText || "Failed to delete file" };
          }
          console.error("Failed to delete file from S3:", errorData);
          throw new Error(`Failed to delete ${url}`);
        }
      } catch (error) {
        console.error(`Error deleting ${url}:`, error);
        throw error;
      }
    });

    await Promise.all(deletePromises);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      // Step 1: Delete marked files from S3
      if (filesToDelete.length > 0) {
        await deleteFilesFromS3(filesToDelete);
        console.log(`${filesToDelete.length} file(s) deleted from S3`);
      }

      // Step 2: Upload new files to S3 if there are any
      let newAttachmentUrls: string[] = [];

      if (newAttachmentFiles && newAttachmentFiles.length > 0) {
        const formData = new FormData();
        newAttachmentFiles.forEach((file) => {
          formData.append("files", file);
        });

        const uploadResponse = await fetch("/api/s3", {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload files");
        }

        const uploadData = await uploadResponse.json();
        console.log("Upload response:", uploadData);

        newAttachmentUrls = uploadData.urls || [];

        if (!Array.isArray(newAttachmentUrls)) {
          throw new Error("Invalid response from upload API");
        }
      }

      // Step 3: Combine existing (not deleted) and new attachments
      const allAttachments = [...existingAttachments, ...newAttachmentUrls];

      // Step 4: Update BOQ item
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/boq`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateAll",
          id: item.id,
          item_name: itemName,
          category: category,
          sub_category: subCategory,
          scope_of_work: scopeOfWork,
          location_ids: locationID,
          quantity: Number(quantity),
          unit,
          rate_per_quantity: Number(ratePerQuantity),
          total_cost: Number(totalCost),
          item_description: itemDescription,
          attachments: JSON.stringify(allAttachments),
        }),
      });

      if (res.ok) {
        toast("Bill of quantity item updated", "success");

        setIsOpen(false);

        onSuccess && onSuccess();

        // Reset states
        setFilesToDelete([]);
        setNewAttachmentFiles(null);

        router.refresh();
      } else {
        toast(
          "Failed to update bill of quantity item. Something went wrong",
          "error",
        );
      }
    } catch (error: any) {
      console.error("Update error:", error);
      toast(
        "Failed to update bill of quantity item. Something went wrong",
        "error",
      );
    }
  }

  return (
    <>
      <Button
        componentType="button"
        bgColor={"transparent"}
        borderColor={"transparent"}
        textColor={"black"}
        onClick={() => setIsOpen(true)}
        full
        style={{ justifyContent: "flex-start" }}
      >
        <img src={pencilIcon} alt="pencil" /> Edit
      </Button>

      {isOpen && (
        <FormPopUp
          header={"UPDATE BILL OF QUANTITY ITEM"}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"CONFIRM"}
        >
          {/* 1st row */}
          <div className="input-row three-col">
            <InputItem
              label={"CATEGORY"}
              value={category}
              type={"text"}
              placeholder={"ENTER CATEGORY"}
              onChange={(e) => setCategory(e.target.value)}
              required
              disabled
            />
            <InputItem
              label={"SUBCATEGORY"}
              value={subCategory}
              type={"text"}
              placeholder={"ENTER SUB CATEGORY"}
              onChange={(e) => setSubCategory(e.target.value)}
              required
              disabled
            />
            <InputItem
              label={"NAME"}
              value={itemName}
              type={"text"}
              placeholder={"ENTER NAME"}
              onChange={(e) => setItemName(e.target.value)}
              required
            />
          </div>

          {/* 2nd row */}
          <div className="input-row half">
            <SingleSelectDropdown
              label={"SCOPE OF WORK"}
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
              label={"LOCATION"}
              selectedValues={locationID}
              onChange={setLocationID}
              placeholder="SELECT LOCATION"
              dbData={locationValues}
              style={{ width: "400px" }}
              bottomButtonComponent={
                <CreateLocationButton onSuccess={() => fetchLocationValues()} />
              }
            />
          </div>

          {/* 3rd row */}
          <div className="input-row half">
            <InputItem
              label={"QUANTITY"}
              value={quantity}
              type={"text"}
              onChange={(e) => {
                const val = e.target.value;

                if (val === "" || /^\d*\.?\d*$/.test(val)) {
                  setQuantity(val);
                }
              }}
              required
            />
            <InputItem
              label={"UNIT"}
              value={unit}
              type={"select"}
              placeholder={"SELECT UNIT"}
              onChange={(e) => {
                setUnit(e.target.value);
              }}
              selectOptions={[
                "ITEM",
                "NOS",
                "SQM",
                "SQFT",
                "M",
                "LM",
                "FT",
                "CUM",
                "KG",
                "TON",
                "LTR",
                "GAL",
                "SET",
                "LOT",
                "LS",
                "PAIR",
                "BOX",
                "BAG",
                "ROLL",
                "MONTHS",
                "DAYS",
                "GLB",
              ]}
              required
            />
          </div>

          {/* 4th row */}
          <div className="input-row half">
            <InputItem
              label={"RATE / QUANTITY"}
              value={ratePerQuantity}
              type={"text"}
              placeholder={"ENTER RATE / QUANTITY"}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "" || /^\d*\.?\d*$/.test(val)) {
                  setRatePerQuantity(val);
                }
              }}
              required
            />
            <InputItem
              label={"TOTAL COST"}
              value={totalCost}
              type={"text"}
              placeholder={"CALCULATING..."}
              onChange={() => {}}
              required
              disabled
            />
          </div>

          {/* 5th row */}
          <div className="input-row full">
            <InputItem
              label={"DESCRIPTION"}
              value={itemDescription || ""}
              type={"textarea"}
              placeholder={"ENTER DESCRIPTION"}
              onChange={(e) => setItemDescription(e.target.value)}
              required={false}
            />
          </div>

          {/* 6th row - Attachments */}
          <div className="input-row full">
            <MultipleUploadFileBox
              fileState={newAttachmentFiles}
              setFileState={setNewAttachmentFiles}
              label={"ATTACHMENTS"}
              acceptedFileTypes={".jpeg,.jpg,.png,.webp"}
              existingFileUrls={existingAttachments}
              onExistingFilesChange={setExistingAttachments}
            />
          </div>
        </FormPopUp>
      )}
    </>
  );
}
