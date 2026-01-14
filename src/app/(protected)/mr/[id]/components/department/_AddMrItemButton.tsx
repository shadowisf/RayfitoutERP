"use client";

import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import MultiSelectDropdown from "@/app/components/MultiSelectDropdown";
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
  autoSubCategoryIDs?: (string | number)[];
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
  autoSubCategoryIDs,
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
  const [materialSubCategoryIDs, setMaterialSubCategoryIDs] = useState<
    (string | number)[]
  >([]);
  const [boqLineID, setBoqLineID] = useState<string | number>("");
  const [materialDescription, setMaterialDescription] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [notes, setNotes] = useState("");
  const [brand, setBrand] = useState("");
  const [specification, setSpecification] = useState("");
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [selectedBoqLineId, setSelectedBoqLineId] = useState<
    number | undefined
  >();

  function handleBoqSelect(selectedId: number) {
    setSelectedBoqLineId(selectedId);
    console.log("Selected BOQ ID:", selectedId);
  }

  // Set auto-populated values when modal opens
  useEffect(() => {
    if (isOpen) {
      if (autoCategoryID) {
        setMaterialCategoryID(autoCategoryID);
      }
      if (autoSubCategoryIDs && autoSubCategoryIDs.length > 0) {
        setMaterialSubCategoryIDs(autoSubCategoryIDs);
      }
    }
  }, [isOpen, autoCategoryID, autoSubCategoryIDs]);

  // Fetch initial data
  useEffect(() => {
    // Fetch material categories
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

    // Fetch projects for delivery location
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/projects`, {
      method: "GET",
    })
      .then((res) => res.json())
      .then((data) => {
        const names = data.map((item: any) => item.name);
        setLocationValues(names);
      });
  }, []);

  // Fetch BOQ lines when projectID is available
  useEffect(() => {
    if (projectID) {
      fetch("/api/boq/getAllBoqLinesWithNumberRef", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectID,
        }),
      })
        .then((res) => res.json())
        .then(function (data) {
          // Transform data to include category and sub_category for categorized dropdown
          const transformedData = data.map(function (boqLine: any) {
            return {
              id: boqLine.id,
              value: `${boqLine.item_number} ${boqLine.item_name}`,
              category: boqLine.category,
              sub_category: boqLine.sub_category,
              raw: boqLine,
            };
          });

          setBoqLineValues(transformedData);
        });
    }
  }, [projectID]);

  // Filter subcategories based on selected category
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

          // Filter out any selected subcategories that don't belong to the new category
          setMaterialSubCategoryIDs((prev) =>
            prev.filter((id) => data.some((item: any) => item.id === id))
          );
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

  // Handle subcategory change - auto-select category if needed
  const handleSubCategoryChange = (selectedIds: (string | number)[]) => {
    setMaterialSubCategoryIDs(selectedIds);

    // If a subcategory is selected and no category is set, auto-select the category
    if (selectedIds.length > 0 && !materialCategoryID) {
      const firstSelectedSubCategory = materialSubCategoryValues.find(
        (sc: any) => sc.id === selectedIds[0]
      ) as any;

      if (firstSelectedSubCategory?.category_id) {
        setMaterialCategoryID(firstSelectedSubCategory.category_id);
      }
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validation
    if (!materialCategoryID) {
      toast("Please select a material category", "error");
      return;
    }

    if (materialSubCategoryIDs.length === 0) {
      toast("Please select at least one material subcategory", "error");
      return;
    }

    if (!boqLineID && purposeID === 1) {
      toast("Please select a bill of quantity line", "error");
      return;
    }

    if (!materialDescription.trim()) {
      toast("Please enter a material description", "error");
      return;
    }

    if (!quantity) {
      toast("Please enter quantity", "error");
      return;
    }

    if (!unit) {
      toast("Please select unit", "error");
      return;
    }

    if (!deliveryLocation) {
      toast("Please select delivery location", "error");
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "createMrLine",
          mr_header_id: mrHeaderID,
          material_category_id: materialCategoryID,
          material_subcategory_ids: materialSubCategoryIDs, // Send as array
          material_description: materialDescription,
          quantity: Number(quantity),
          unit,
          notes,
          brand,
          specification,
          delivery_location: deliveryLocation,
          boq_line_id: boqLineID || null,
        }),
      });

      if (res.ok) {
        toast(`${materialDescription} added`, "success");

        // Reset form
        setIsOpen(false);
        setMaterialCategoryID("");
        setMaterialSubCategoryIDs([]);
        setMaterialDescription("");
        setQuantity("");
        setUnit("");
        setNotes("");
        setBoqLineID("");
        setBrand("");
        setSpecification("");
        setDeliveryLocation("");

        router.refresh();
      } else {
        const errorData = await res.json();
        toast(
          errorData.error || "Failed to add material request item",
          "error"
        );
      }
    } catch (error) {
      console.error("Submit error:", error);
      toast(
        "Failed to add material request item. Something went wrong",
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
          {/* Category and Subcategory Row */}
          <div className="input-row half">
            <SingleSelectDropdown
              label={"CATEGORY"}
              dbData={materialCategoryValues}
              selectedValue={materialCategoryID}
              onChange={setMaterialCategoryID}
              placeholder="SELECT CATEGORY"
              required
            />

            <MultiSelectDropdown
              label={"SUBCATEGORIES"}
              dbData={materialSubCategoryValues}
              selectedValues={materialSubCategoryIDs}
              onChange={handleSubCategoryChange}
              placeholder="SELECT SUBCATEGORIES"
              required
              style={{ width: "350px" }}
            />
          </div>

          {/* Description and BOQ Line Row */}
          <div className="input-row half">
            <InputItem
              label={"ITEM"}
              value={materialDescription}
              type={"text"}
              required
              onChange={(e) => setMaterialDescription(e.target.value)}
            />

            <SingleSelectDropdown
              label={"BILL OF QUANTITY"}
              dbData={boqLineValues}
              selectedValue={boqLineID}
              onChange={setBoqLineID}
              placeholder="SELECT BILL OF QUANTITY"
              required={purposeID === 1}
              disabled={!projectID}
              categorized={true}
              categoryField="category"
              subCategoryField="sub_category"
              style={{ width: "350px" }}
            />

            {/*  <SelectBoqButton
              projectID={projectID}
              selectedBoqLine={selectedBoqLineId}
              onBoqSelect={handleBoqSelect}
            /> */}
          </div>

          {/* Quantity and Unit Row */}
          <div className="input-row half">
            <InputItem
              label={"QUANTITY"}
              value={quantity}
              type={"text"}
              placeholder={"ENTER QUANTITY"}
              required
              onChange={(e) => {
                const val = e.target.value;
                // Allow only positive numbers
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

          {/* Brand Row */}
          <div className="input-row full">
            <InputItem
              label={"BRAND"}
              value={brand}
              type={"text"}
              placeholder={"ENTER BRAND (OPTIONAL)"}
              onChange={(e) => setBrand(e.target.value)}
            />
          </div>

          {/* Specification Row */}
          <div className="input-row full">
            <InputItem
              label={"SPECIFICATION"}
              value={specification}
              type={"textarea"}
              placeholder={"ENTER SPECIFICATION (OPTIONAL)"}
              onChange={(e) => setSpecification(e.target.value)}
            />
          </div>

          {/* Delivery Location Row */}
          <div className="input-row half">
            <InputItem
              label="DELIVERY LOCATION"
              value={deliveryLocation}
              type="select"
              placeholder="SELECT DELIVERY LOCATION"
              onChange={(e) => setDeliveryLocation(e.target.value)}
              selectOptions={[
                "Headquarters",
                "Umm Al Quwain Warehouse",
                ...locationValues,
              ]}
              required
            />
          </div>
        </FormPopUp>
      )}
    </>
  );
}
