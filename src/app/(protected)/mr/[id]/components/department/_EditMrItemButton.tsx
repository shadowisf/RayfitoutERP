"use client";

import { useState, useEffect } from "react";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import Button from "@/app/components/Button";
import { useRouter } from "next/navigation";
import SingleSelectDropdown from "@/app/components/SingleSelectDropdown";
import { MrLine } from "../../types/mrLine";
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

  const [materialCategoryValues, setMaterialCategoryValues] = useState<any[]>(
    []
  );
  const [materialSubCategoryValues, setMaterialSubCategoryValues] = useState<
    any[]
  >([]);
  const [locationValues, setLocationValues] = useState<any[]>([]);
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
  const [notes, setNotes] = useState(item.notes ?? "");
  const [specification, setSpecification] = useState(item.specification ?? "");
  const [brand, setBrand] = useState(item.brand ?? "");
  const [deliveryLocation, setDeliveryLocation] = useState(
    item.delivery_location
  );

  useEffect(() => {
    fetch("/api/mr/getMaterialCategoryValues")
      .then((res) => res.json())
      .then((data) => {
        setMaterialCategoryValues(data);
      })
      .catch((err) => {
        console.error(err);
      });

    // Fetch all subcategories initially
    fetch("/api/mr/getMaterialSubCategoryValues", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    })
      .then((res) => res.json())
      .then((data) => {
        setMaterialSubCategoryValues(data);
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
  }, [projectID]);

  useEffect(() => {
    if (materialCategoryID) {
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
    } else {
      // If category is reset, load all subcategories
      fetch("/api/mr/getMaterialSubCategoryValues", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      })
        .then((res) => res.json())
        .then((data) => {
          setMaterialSubCategoryValues(data);
        });
    }
  }, [materialCategoryID]);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/projects`, {
      method: "GET",
    })
      .then((res) => res.json())
      .then((data) => {
        const names = data.map((item: any) => item.name);
        setLocationValues(names);
      });
  }, []);

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
        quantity,
        unit,
        notes,
        delivery_location: deliveryLocation,
        id: item.id,
      }),
    });

    if (res.ok) {
      toast(`${materialDescription} updated`, "success");

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
          style={{ minWidth: "900px" }}
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
            />

            <SingleSelectDropdown
              label={"SUBCATEGORY"}
              dbData={materialSubCategoryValues}
              selectedValue={materialSubCategoryID}
              onChange={(subCategoryId) => {
                setMaterialSubCategoryID(subCategoryId);

                const selectedSubCategory = materialSubCategoryValues.find(
                  (sc: any) => sc.id === subCategoryId
                ) as any;

                if (selectedSubCategory?.category_id) {
                  setMaterialCategoryID(selectedSubCategory.category_id);
                }
              }}
              placeholder="SELECT SUBCATEGORY"
              required
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

            <SingleSelectDropdown
              label={"BILL OF QUANTITY"}
              dbData={boqLineValues}
              selectedValue={boqLineID}
              onChange={setBoqLineID}
              placeholder="SELECT BILL OF QUANTITY"
              required={false}
              disabled={projectID ? false : true}
            />
          </div>

          <div className="input-row half">
            <InputItem
              label={"QUANTITY"}
              value={quantity}
              type={"text"}
              placeholder={"ENTER QUANTITY"}
              required
              onChange={(e) => {
                const val = e.target.value;

                if (val === "" || /^\d+$/.test(val)) {
                  setQuantity(val);
                }
              }}
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
              label={"BRAND"}
              value={brand}
              type={"text"}
              onChange={(e) => setBrand(e.target.value)}
            />
          </div>

          <div className="input-row full">
            <InputItem
              label={"SPECIFICATION"}
              value={specification}
              type={"textarea"}
              onChange={(e) => setSpecification(e.target.value)}
            />
          </div>

          <div className="input-row half">
            <InputItem
              label="DELIVERY LOCATION"
              value={deliveryLocation}
              type="select"
              onChange={(e) => setDeliveryLocation(e.target.value)}
              selectOptions={[
                "Headquarters",
                "Umm Al Quwain Warehouse",
                ...locationValues,
              ]}
              required
            />
            <InputItem
              label={"NOTES"}
              value={notes}
              type={"text"}
              placeholder={"ENTER NOTES"}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </FormPopUp>
      )}
    </>
  );
}
