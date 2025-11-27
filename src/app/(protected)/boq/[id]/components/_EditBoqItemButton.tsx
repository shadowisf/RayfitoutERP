"use client";

import { useState, useEffect } from "react";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import Button from "@/app/components/Button";
import UploadFilesButton from "./_UploadFilesButton";
import { useRouter } from "next/navigation";
import { BoqLine } from "../types/boqLine";
import SingleSelectDropdown from "@/app/components/SingleSelectDropdown";

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
  const [attachments, setAttachments] = useState<File[]>([]);

  useEffect(() => {
    fetch("/api/boq/getLocationValues")
      .then((res) => res.json())
      .then((data) => setLocationValues(data))
      .catch((err) => console.error(err));
  }, []);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

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
        attachments,
      }),
    });

    if (res.ok) {
      alert("Item updated");

      setIsOpen(false);

      router.refresh();
    } else {
      alert("Failed to update item. Something went wrong");
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
      >
        {children}
      </Button>

      {isOpen && (
        <FormPopUp
          header={"EDIT ITEM"}
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
              label={"SUB CATEGORY"}
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
              selectOptions={["Supply only", "Supply + install"]}
              required
            />
            {/* <InputItem
              label={"LOCATION"}
              value={locationID}
              type={"select"}
              placeholder={"SELECT LOCATION"}
              onChange={(e) => setLocationID(Number(e.target.value))}
              dbMap={locationValues.map((location: any) => (
                <option key={location.id} value={location.id}>
                  {location.value}
                </option>
              ))}
              required
            /> */}
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
              onChange={(e) => setItemDescription(e.target.value)}
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
