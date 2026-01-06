"use client";

import BOQ from "@/app/(protected)/boq/[id]/page";
import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import SingleSelectDropdown from "@/app/components/SingleSelectDropdown";
import { toast } from "@/app/components/Toast";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

type AddMrItemButtonProps = {
  mrHeaderID: number;
  projectID: number;
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
  autoCategoryID?: string;
  autoSubCategoryID?: string;
  children: React.ReactNode;
  full?: boolean;
  purposeID: number;
  style?: React.CSSProperties;
};

export default function AddMrItemButton({
  mrHeaderID,
  projectID,
  bgColor = "rgba(239, 239, 239, 1)",
  textColor = "black",
  borderColor = "rgba(239, 239, 239, 1)",
  autoCategoryID,
  autoSubCategoryID,
  children,
  full,
  purposeID,
  style,
}: AddMrItemButtonProps) {
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
    ""
  );
  const [materialSubCategoryID, setMaterialSubCategoryID] = useState<
    string | number
  >("");
  const [boqLineID, setBoqLineID] = useState<string | number>("");
  const [materialDescription, setMaterialDescription] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [notes, setNotes] = useState("");
  const [brand, setBrand] = useState("");
  const [specification, setSpecification] = useState("");
  const [deliveryLocation, setDeliveryLocation] = useState("");

  useEffect(() => {
    if (isOpen) {
      if (autoCategoryID) {
        setMaterialCategoryID(autoCategoryID);
      }
      if (autoSubCategoryID) {
        setMaterialSubCategoryID(autoSubCategoryID);
      }
    }
  }, [isOpen, autoCategoryID, autoSubCategoryID]);

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

    if (materialCategoryID === "") {
      toast("Please select a material category", "error");
      return;
    }
    if (materialSubCategoryID === "") {
      toast("Please select a material subcategory", "error");
      return;
    }

    if (boqLineID === "" && purposeID === 1) {
      toast("Please select a bill of quantity line", "error");
      return;
    }

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "createMrLine",
        mr_header_id: mrHeaderID,
        material_category_id: materialCategoryID,
        material_subcategory_id: materialSubCategoryID,
        material_description: materialDescription,
        quantity,
        unit,
        notes,
        brand,
        specification,
        delivery_location: deliveryLocation,
        boq_line_id: boqLineID,
      }),
    });

    if (res.ok) {
      toast(`${materialDescription} added`, "success");

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
      toast("Failed to add material request item", "error");
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
          header={"ADD MATERIAL REQUEST ITEM"}
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
              label={"ITEM"}
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
              required={purposeID === 1 ? true : false}
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
            {/* <InputItem
              label={"NOTES"}
              value={notes}
              type={"text"}
              placeholder={"ENTER NOTES"}
              onChange={(e) => setNotes(e.target.value)}
            /> */}
          </div>
        </FormPopUp>
      )}
    </>
  );
}
