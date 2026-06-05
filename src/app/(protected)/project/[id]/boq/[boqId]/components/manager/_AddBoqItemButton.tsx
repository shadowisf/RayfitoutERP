"use client";

import { useState, useEffect } from "react";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import { UNIT_OPTIONS } from "@/constants/units";
import Button from "@/app/components/Button";
import { useRouter } from "next/navigation";
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
function stripCommas(val: string | number): number {
  return Number(String(val).replace(/,/g, "")) || 0;
}

type AddBoqItemButtonProps = {
  boqHeaderID: number;
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
  autoCategory?: string;
  autoSubCategory?: string;
  currency: string;
  children: React.ReactNode;
  full?: boolean;
  style?: React.CSSProperties;
};

export default function AddBoqItemButton({
  boqHeaderID,
  bgColor = "rgba(239, 239, 239, 1)",
  textColor = "black",
  borderColor = "rgba(239, 239, 239, 1)",
  autoCategory = "",
  autoSubCategory = "",
  currency,
  children,
  full,
  style,
}: AddBoqItemButtonProps) {
  const router = useRouter();
  const { refresh } = useRefresh();


  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [locationValues, setLocationValues] = useState<[]>([]);

  const [itemName, setItemName] = useState("");
  const [category, setCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [scopeOfWork, setScopeOfWork] = useState<string | number>("");
  const [locationID, setLocationID] = useState<(string | number)[]>([]);
  const [quantity, setQuantity] = useState<string | number>("");
  const [unit, setUnit] = useState("");
  const [ratePerQuantity, setRatePerQuantity] = useState<string | number>("");
  const [totalCost, setTotalCost] = useState<string | number>("");
  const [itemDescription, setItemDescription] = useState("");
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [dnNumberAndDate, setDnNumberAndDate] = useState("");
  const [remarks, setRemarks] = useState("");

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
        console.error("Failed to fetch location values:", err);
      }
    };

    fetchLocations();

    return () => {
      mounted = false;
    };
  }, [isOpen]);

  useEffect(() => {
    const rate = stripCommas(ratePerQuantity);
    const qty = stripCommas(quantity);
    if (rate > 0 && qty > 0) {
      setTotalCost(formatMoneyOpen(rate * qty));
    } else {
      setTotalCost("");
    }
  }, [ratePerQuantity, quantity]);

  useEffect(() => {
    if (isOpen && autoCategory) {
      setCategory(autoCategory);
    }
    if (isOpen && autoSubCategory) {
      setSubCategory(autoSubCategory);
    }
  }, [isOpen, autoCategory, autoSubCategory]);

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

      if (data.urls.length === 0 && files.length > 0) {
        throw new Error("All file uploads failed");
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
      // Step 1: Upload files
      const attachmentUrls = await uploadFiles(attachmentFiles);

      // Step 2: Create BOQ item
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/boq`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "createBoqLine",
          boq_id: boqHeaderID,
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
          attachments: JSON.stringify(attachmentUrls),
          dn_number_and_date: dnNumberAndDate || null,
          remarks: remarks || null,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create BOQ item");
      }

      toast("Bill of quantity item created", "success");

      // Reset all states
      setItemName("");
      setCategory("");
      setSubCategory("");
      setScopeOfWork("");
      setLocationID([]);
      setQuantity("");
      setUnit("");
      setRatePerQuantity("");
      setTotalCost("");
      setItemDescription("");
      setAttachmentFiles([]);
      setDnNumberAndDate("");
      setRemarks("");

      await refresh();
      setIsOpen(false);
    } catch (error: any) {
      console.error("Create error:", error);
      toast(error.message || "Failed to create bill of quantity item", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        componentType="button"
        bgColor={bgColor}
        borderColor={borderColor}
        textColor={textColor}
        onClick={() => setIsOpen(true)}
        full={full ? true : false}
        style={style}
      >
        {children}
      </Button>

      {isOpen && (
        <FormPopUp
          header="CREATE BILL OF QUANTITY ITEM"
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={isLoading ? "CREATING..." : "CONFIRM"}
        >
          <div className="input-row three-col">
            <InputItem
              label="CATEGORY"
              value={category}
              type="text"
              placeholder="ENTER CATEGORY"
              onChange={(e) => setCategory(e.target.value)}
              required
              disabled={!!autoCategory}
            />
            <InputItem
              label="SUBCATEGORY"
              value={subCategory}
              type="text"
              placeholder="ENTER SUB CATEGORY"
              onChange={(e) => setSubCategory(e.target.value)}
              required
              disabled={!!autoSubCategory}
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
              postfixText={currency}
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
              postfixText={currency}
              placeholder="CALCULATING..."
              onChange={() => {}}
              required
              disabled
            />
          </div>

          <div className="input-row full">
            <InputItem
              label="DESCRIPTION"
              value={itemDescription}
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
              fileState={attachmentFiles}
              setFileState={setAttachmentFiles}
              label="ATTACHMENTS"
              acceptedFileTypes=".jpeg,.jpg,.png,.webp"
            />
          </div>
        </FormPopUp>
      )}
    </>
  );
}
