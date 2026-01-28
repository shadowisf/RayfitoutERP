"use client";

import { useState, useEffect } from "react";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import Button from "@/app/components/Button";
import { useRouter } from "next/navigation";
import SingleSelectDropdown from "@/app/components/SingleSelectDropdown";
import { toast } from "@/app/components/Toast";
import MultiSelectDropdown from "@/app/components/MultiSelectDropdown";
import MultipleUploadFileBox from "@/app/components/MultipleUploadFileBox";
import CreateLocationButton from "./_AddLocationButton";

type AddBoqItemButtonProps = {
  boqHeaderID: number;
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
  autoCategory?: string;
  autoSubCategory?: string;
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
  children,
  full,
  style,
}: AddBoqItemButtonProps) {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);

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
  const [attachmentFiles, setAttachmentFiles] = useState<File[] | null>(null);

  const [isMounted, setIsMounted] = useState(true);

  useEffect(() => {
    if (!isOpen) return; // Don't fetch unless modal is open

    setIsMounted(true);

    fetchLocationValues();

    return () => {
      setIsMounted(false);
    };
  }, [isOpen]); // Only fetch when modal opens

  useEffect(
    function () {
      if (ratePerQuantity && quantity) {
        setTotalCost(Number(ratePerQuantity) * Number(quantity));
      } else {
        setTotalCost("");
      }
    },
    [ratePerQuantity, quantity],
  );

  useEffect(
    function () {
      if (isOpen && autoCategory) {
        setCategory(autoCategory);
      }
      if (isOpen && autoSubCategory) {
        setSubCategory(autoSubCategory);
      }
    },
    [isOpen, autoCategory, autoSubCategory],
  );

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      // Step 1: Upload files to S3 if there are any
      let attachmentUrls: string[] = [];

      if (attachmentFiles && attachmentFiles.length > 0) {
        const formData = new FormData();
        attachmentFiles.forEach((file) => {
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
        attachmentUrls = uploadData.urls || [];

        if (!Array.isArray(attachmentUrls)) {
          throw new Error("Invalid response from upload API");
        }

        console.log(`Successfully uploaded ${attachmentUrls.length} file(s)`);
      }

      // Step 2: Create BOQ item with attachment URLs
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/boq`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "createBoqLine",
          boq_id: boqHeaderID,
          item_name: itemName,
          category,
          sub_category: subCategory,
          scope_of_work: scopeOfWork,
          location_ids: locationID,
          quantity,
          unit,
          rate_per_quantity: ratePerQuantity,
          total_cost: totalCost,
          item_description: itemDescription,
          attachments: JSON.stringify(attachmentUrls),
        }),
      });

      if (res.ok) {
        toast("Bill of quantity item created", "success");

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

        setIsOpen(false);

        setTimeout(() => {
          router.refresh();
        }, 1000);
      } else {
        toast(
          "Failed to create bill of quantity item. Something went wrong",
          "error",
        );
      }
    } catch (error: any) {
      console.error("Create error:", error);
      toast(
        "Failed to create bill of quantity item. Something went wrong",
        "error",
      );
    }
  }

  return (
    <>
      <Button
        componentType={"button"}
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
          header={"CREATE BILL OF QUANTITY ITEM"}
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
              onChange={(e) => {
                setCategory(e.target.value);
              }}
              required
              disabled={autoCategory ? true : false}
            />
            <InputItem
              label={"SUBCATEGORY"}
              value={subCategory}
              type={"text"}
              placeholder={"ENTER SUB CATEGORY"}
              onChange={(e) => {
                setSubCategory(e.target.value);
              }}
              required
              disabled={autoSubCategory ? true : false}
            />
            <InputItem
              label={"NAME"}
              value={itemName}
              type={"text"}
              placeholder={"ENTER NAME"}
              onChange={(e) => {
                setItemName(e.target.value);
              }}
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

            {/* <SingleSelectDropdown
              label={"LOCATION"}
              selectedValue={locationID}
              onChange={setLocationID}
              placeholder={"SELECT LOCATION"}
              dbData={locationValues}
            /> */}
            <MultiSelectDropdown
              label={"LOCATION"}
              selectedValues={locationID}
              onChange={setLocationID}
              placeholder="SELECT LOCATION"
              dbData={locationValues}
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
              value={itemDescription}
              type={"textarea"}
              placeholder={"ENTER DESCRIPTION"}
              onChange={(e) => {
                setItemDescription(e.target.value);
              }}
              required={false}
            />
          </div>

          {/* 6th row */}
          <div className="input-row full">
            {/* <div className="input-item">
              <label>ATTACHMENTS</label>

              <UploadFilesButton
                onFilesChange={setAttachmentFiles}
                stageDeletion={true}
              />
            </div> */}

            <MultipleUploadFileBox
              fileState={attachmentFiles}
              setFileState={setAttachmentFiles}
              label={"ATTACHMENTS"}
              acceptedFileTypes={".jpeg,.jpg,.png,.webp"}
            />
          </div>
        </FormPopUp>
      )}
    </>
  );
}
