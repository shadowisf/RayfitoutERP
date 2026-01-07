"use client";

import { useState, useEffect } from "react";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import Button from "@/app/components/Button";
import UploadFilesButton from "./_UploadFilesButton";
import { useRouter } from "next/navigation";
import { BoqLine } from "../../types/boqLine";
import SingleSelectDropdown from "@/app/components/SingleSelectDropdown";
import { toast } from "@/app/components/Toast";

type EditBoqItemButtonProps = {
  item: BoqLine;
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
  children?: React.ReactNode;
};

export default function EditBoqItemButton({
  item,
  bgColor = "rgba(239, 239, 239, 1)",
  textColor = "black",
  borderColor = "rgba(239, 239, 239, 1)",
  children,
}: EditBoqItemButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [locationValues, setLocationValues] = useState<[]>([]);

  const [itemName, setItemName] = useState(item.item_name);
  const [category, setCategory] = useState(item.category);
  const [subCategory, setSubCategory] = useState(item.sub_category);
  const [scopeOfWork, setScopeOfWork] = useState(item.scope_of_work);
  const [locationID, setLocationID] = useState<string | number>(
    item.location_id
  );
  const [quantity, setQuantity] = useState<string | number>(item.quantity);
  const [unit, setUnit] = useState(item.unit);
  const [ratePerQuantity, setRatePerQuantity] = useState<string | number>(
    item.rate_per_quantity
  );
  const [totalCost, setTotalCost] = useState<string | number>(item.total_cost);
  const [itemDescription, setItemDescription] = useState(item.item_description);

  // Existing attachments (S3 URLs)
  const [existingAttachments, setExistingAttachments] = useState<string[]>([]);
  // New files to upload
  const [newAttachmentFiles, setNewAttachmentFiles] = useState<File[]>([]);
  // Files marked for deletion
  const [filesToDelete, setFilesToDelete] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/boq/getLocationValues")
      .then((res) => res.json())
      .then((data) => setLocationValues(data))
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    if (isOpen) {
      // Parse existing attachments when modal opens
      try {
        if (item.attachments) {
          if (Array.isArray(item.attachments)) {
            setExistingAttachments(item.attachments);
          } else if (
            typeof item.attachments === "string" &&
            item.attachments.trim() !== ""
          ) {
            const parsed = JSON.parse(item.attachments);
            if (Array.isArray(parsed)) {
              setExistingAttachments(parsed);
            }
          }
        }
      } catch (error) {
        console.error("Failed to parse existing attachments:", error);
        setExistingAttachments([]);
      }
    } else {
      // Reset filesToDelete when modal closes
      setFilesToDelete([]);
    }
  }, [isOpen, item.attachments]);

  useEffect(
    function () {
      const timer = setTimeout(function () {
        if (ratePerQuantity && quantity) {
          setTotalCost(Number(ratePerQuantity) * Number(quantity));
        }
      }, 500);

      return function () {
        clearTimeout(timer);
      };
    },
    [ratePerQuantity, quantity]
  );

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

    setIsSubmitting(true);

    try {
      // Step 1: Delete marked files from S3
      if (filesToDelete.length > 0) {
        await deleteFilesFromS3(filesToDelete);
        console.log(`${filesToDelete.length} file(s) deleted from S3`);
      }

      // Step 2: Upload new files to S3 if there are any
      let newAttachmentUrls: string[] = [];

      if (newAttachmentFiles.length > 0) {
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

      // Step 3: Combine existing and new attachments
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
          location_id: locationID,
          quantity,
          unit,
          rate_per_quantity: ratePerQuantity,
          total_cost: totalCost,
          item_description: itemDescription,
          attachments: JSON.stringify(allAttachments),
        }),
      });

      if (res.ok) {
        toast("Bill of quantity item updated", "success");

        setIsOpen(false);

        // Reset states
        setFilesToDelete([]);
        setNewAttachmentFiles([]);

        router.refresh();
      } else {
        toast(
          "Failed to update bill of quantity item. Something went wrong",
          "error"
        );
      }
    } catch (error: any) {
      console.error("Update error:", error);
      toast(
        "Failed to update bill of quantity item. Something went wrong",
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Button
        componentType="button"
        bgColor={bgColor}
        borderColor={borderColor}
        textColor={textColor}
        onClick={() => setIsOpen(true)}
        style={{ padding: "7px 7px" }}
      >
        {children}
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
            <InputItem
              label={"SCOPE OF WORK"}
              value={scopeOfWork}
              type={"select"}
              placeholder={"SELECT SCOPE OF WORK"}
              onChange={(e) => setScopeOfWork(e.target.value)}
              selectOptions={[
                "Supply",
                "Supply & installation",
                "Installation",
              ]}
              required
            />
            <SingleSelectDropdown
              label={"LOCATION"}
              selectedValue={locationID}
              onChange={setLocationID}
              placeholder={"SELECT LOCATION"}
              dbData={locationValues}
            />
          </div>

          {/* 3rd row */}
          <div className="input-row half">
            <InputItem
              label={"QUANTITY"}
              value={quantity}
              type={"text"}
              placeholder={"ENTER QUANTITY"}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "" || /^\d+$/.test(val)) {
                  setQuantity(val === "" ? "" : Number(val));
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
                if (val === "" || /^\d+$/.test(val)) {
                  setRatePerQuantity(val === "" ? "" : Number(val));
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
          <div className="input-row">
            <div className="input-item">
              <label>ATTACHMENTS</label>
              <UploadFilesButton
                onFilesChange={setNewAttachmentFiles}
                onExistingFilesChange={setExistingAttachments}
                onFilesToDeleteChange={setFilesToDelete}
                existingFiles={existingAttachments}
                stageDeletion={true}
              />
            </div>
          </div>
        </FormPopUp>
      )}
    </>
  );
}
