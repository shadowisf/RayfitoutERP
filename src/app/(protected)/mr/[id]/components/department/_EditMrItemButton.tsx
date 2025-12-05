"use client";

import { useState, useEffect } from "react";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import Button from "@/app/components/Button";
import { useRouter } from "next/navigation";
import SingleSelectDropdown from "@/app/components/SingleSelectDropdown";
import { MrLine } from "../../types/mrLine";
import MultiSelectDropdown from "@/app/components/MultiSelectDropdown";
import { toast } from "@/app/components/Toast";

type EditMrItemButtonProps = {
  projectID: number;
  item: MrLine;
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
  children?: React.ReactNode;
  full?: boolean;
};

export default function EditMrItemButton({
  projectID,
  item,
  bgColor = "rgba(239, 239, 239, 1)",
  textColor = "black",
  borderColor = "rgba(239, 239, 239, 1)",
  children,
  full,
}: EditMrItemButtonProps) {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);

  const [materialCategoryValues, setMaterialCategoryValues] = useState<[]>([]);
  const [materialSubCategoryValues, setMaterialSubCategoryValues] = useState<
    []
  >([]);
  const [boqLineValues, setBoqLineValues] = useState<any[]>([]);

  const [materialCategoryID, setMaterialCategoryID] = useState<string | number>(
    item.material_category_id
  );
  const [materialSubCategoryID, setMaterialSubCategoryID] = useState<
    string | number
  >(item.material_subcategory_id);
  const [boqLineID, setBoqLineID] = useState<string | number>(item.boq_line_id);
  const [materialDescription, setMaterialDescription] = useState(
    item.material_description
  );
  const [quantity, setQuantity] = useState<string | number>(item.quantity);
  const [unit, setUnit] = useState(item.unit);
  const [notes, setNotes] = useState(item.notes);

  useEffect(() => {
    fetch("/api/mr/getMaterialCategoryValues")
      .then((res) => res.json())
      .then((data) => {
        setMaterialCategoryValues(data);
      })
      .catch((err) => {
        console.error(err);
      });

    fetch("/api/boq/getAllBoqLinesWithNumberRef", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_id: projectID,
      }),
    })
      .then((res) => res.json())
      .then(function (data) {
        setBoqLineValues(data);

        const map = data.reduce(function (acc: any, boqL: any) {
          acc[boqL.id] = `${boqL.item_name} (${boqL.item_number})`;
          return acc;
        }, {});

        const array = Object.entries(map).map(function ([id, label]) {
          return {
            id: Number(id),
            value: label,
          };
        });

        setBoqLineValues(array);
      });
  }, []);

  useEffect(() => {
    fetch("/api/mr/getMaterialSubCategoryValuesByCategoryID", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category_id: materialCategoryID,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        setMaterialSubCategoryValues(data);
      })
      .catch((err) => {
        console.error(err);
      });
  }, [materialCategoryID]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "updateAll",
        boq_line_id: boqLineID,
        material_category_id: materialCategoryID,
        material_subcategory_id: materialSubCategoryID,
        material_description: materialDescription,
        quantity: quantity,
        unit: unit,
        notes: notes,
        id: item.id,
      }),
    });

    if (res.ok) {
      toast("Material request item updated", "success");

      setIsOpen(false);

      setMaterialCategoryID("");
      setMaterialSubCategoryID("");
      setMaterialDescription("");
      setQuantity("");
      setUnit("");
      setNotes("");
      setBoqLineID("");

      router.refresh();
    } else {
      toast(
        "Failed to update material request item. Something went wrong",
        "error"
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
        style={{ padding: "7px 7px" }}
      >
        {children}
      </Button>

      {isOpen && (
        <FormPopUp
          header={"UPDATE MATERIAL REQUEST ITEM"}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"CONFIRM"}
        >
          {/* 1st row */}
          <div className="input-row half">
            <SingleSelectDropdown
              label={"CATEGORY"}
              dbData={materialCategoryValues}
              selectedValue={materialCategoryID}
              onChange={setMaterialCategoryID}
              placeholder="SELECT CATEGORY"
              required
              disabled
            />

            <SingleSelectDropdown
              label={"SUB CATEGORY"}
              dbData={materialSubCategoryValues}
              selectedValue={materialSubCategoryID}
              onChange={setMaterialSubCategoryID}
              placeholder="SELECT SUB CATEGORY"
              required
              disabled
            />
          </div>

          <div className="input-row half">
            <InputItem
              label={"DESCRIPTION"}
              value={materialDescription}
              type={"text"}
              placeholder={"ENTER DESCRIPTION"}
              required
              onChange={(e) => setMaterialDescription(e.target.value)}
            />

            {/* <MultiSelectDropdown
              label="BOQ LINE"
              dbData={boqLineValues}
              selectedValues={boqLineID}
              onChange={setBoqLineID}
              placeholder="SELECT BOQ LINE"
              required={false}
            /> */}

            <SingleSelectDropdown
              label={"BOQ LINE"}
              dbData={boqLineValues}
              selectedValue={boqLineID}
              onChange={setBoqLineID}
              placeholder="SELECT BOQ LINE"
              required={false}
            />
          </div>

          <div className="input-row half">
            <InputItem
              label={"QUANTITY"}
              value={quantity}
              type={"text"}
              placeholder={"ENTER QUANTITY"}
              required
              onChange={(e) => setQuantity(e.target.value)}
            />

            <InputItem
              label={"UNIT"}
              value={unit}
              type={"select"}
              placeholder={"SELECT UNIT"}
              required
              onChange={(e) => setUnit(e.target.value)}
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
            />
          </div>

          <div className="input-row full">
            <InputItem
              label={"NOTES"}
              value={notes}
              type={"textarea"}
              placeholder={"ENTER NOTES"}
              required={false}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </FormPopUp>
      )}
    </>
  );
}
