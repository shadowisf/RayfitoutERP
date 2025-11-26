"use client";

import { useState, useEffect } from "react";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import Button from "@/app/components/Button";
import UploadFilesButton from "./_UploadFilesButton";
import { useRouter } from "next/navigation";
import MultiSelectDropdown from "@/app/components/MultiSelectDropdown";
import SingleSelectDropdown from "@/app/components/SingleSelectDropdown";

type AddItemButtonProps = {
  boqHeaderID: string;
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
  autoCategory?: string;
  autoSubCategory?: string;
  children: React.ReactNode;
  full?: boolean;
};

export default function AddItemButton({
  boqHeaderID,
  bgColor = "rgba(239, 239, 239, 1)",
  textColor = "black",
  borderColor = "rgba(239, 239, 239, 1)",
  autoCategory = "",
  autoSubCategory = "",
  children,
  full,
}: AddItemButtonProps) {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);

  const [locationValues, setLocationValues] = useState<[]>([]);

  const [itemName, setItemName] = useState("");
  const [category, setCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  /*   const [itemCode, setItemCode] = useState(""); */
  const [scopeOfWork, setScopeOfWork] = useState("");
  const [locationID, setLocationID] = useState<string | number>("");
  const [quantity, setQuantity] = useState<string | number>("");
  const [unit, setUnit] = useState("");
  const [ratePerQuantity, setRatePerQuantity] = useState<string | number>("");
  const [totalCost, setTotalCost] = useState<string | number>("");
  const [itemDescription, setItemDescription] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);

  useEffect(() => {
    fetch("/api/boq/getLocationValues")
      .then((res) => res.json())
      .then((data) => {
        setLocationValues(data);
      })
      .catch((err) => {
        console.error(err);
      });
  }, []);

  useEffect(
    function () {
      if (ratePerQuantity && quantity) {
        setTotalCost(Number(ratePerQuantity) * Number(quantity));
      } else {
        setTotalCost("");
      }
    },
    [ratePerQuantity, quantity]
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
    [isOpen, autoCategory, autoSubCategory]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/boq`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "createBoqLine",
        boq_id: boqHeaderID,
        item_name: itemName,
        category,
        sub_category: subCategory,
        /* item_code: itemCode, */
        scope_of_work: scopeOfWork,
        location_id: locationID,
        quantity,
        unit,
        rate_per_quantity: ratePerQuantity,
        total_cost: totalCost,
        item_description: itemDescription,
        attachments,
      }),
    });

    if (res.ok) {
      alert("Item added");

      setItemName("");
      setCategory("");
      setSubCategory("");
      /* setItemCode(""); */
      setScopeOfWork("");
      setLocationID("");
      setQuantity("");
      setUnit("");
      setRatePerQuantity("");
      setTotalCost("");
      setItemDescription("");
      setAttachments([]);

      setIsOpen(false);

      router.refresh();
    } else {
      alert("Failed to add item. Something went wrong");
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
      >
        {children}
      </Button>

      {isOpen && (
        <FormPopUp
          header={"ADD ITEM"}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"ADD ITEM"}
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
              label={"SUB CATEGORY"}
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
            {/* <InputItem
              label={"CODE"}
              value={itemCode}
              type={"text"}
              placeholder={"ENTER CODE"}
              onChange={(e) => {
                setItemCode(e.target.value);
              }}
              required
            /> */}
            <InputItem
              label={"SCOPE OF WORK"}
              value={scopeOfWork}
              type={"select"}
              placeholder={"SELECT SCOPE OF WORK"}
              onChange={(e) => {
                setScopeOfWork(e.target.value);
              }}
              selectOptions={[
                "Supply only",
                "Supply + install",
                "Installation method",
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
              /* onChange={(e) => {
                const val = e.target.value;

                if (val === "" || /^\d+$/.test(val)) {
                  setTotalCost(val === "" ? "" : Number(val));
                }
              }} */
              onChange={() => {}}
              required
              disabled
            />
          </div>

          {/* 5th row */}
          <div className="input-row full">
            <InputItem
              label={"ITEM DESCRIPTION"}
              value={itemDescription}
              type={"textarea"}
              placeholder={"ENTER ITEM DESCRIPTION"}
              onChange={(e) => {
                setItemDescription(e.target.value);
              }}
              required={false}
            />
          </div>

          {/* 6th row */}
          <div className="input-row">
            <div className="input-item">
              <label>ATTACHMENTS</label>

              <UploadFilesButton onFilesChange={setAttachments} />
            </div>
          </div>
        </FormPopUp>
      )}
    </>
  );
}
