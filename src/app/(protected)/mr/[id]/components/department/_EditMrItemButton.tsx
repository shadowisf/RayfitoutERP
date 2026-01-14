"use client";

import { useState, useEffect } from "react";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import Button from "@/app/components/Button";
import { useRouter } from "next/navigation";
import SingleSelectDropdown from "@/app/components/SingleSelectDropdown";
import MultiSelectDropdown from "@/app/components/MultiSelectDropdown";
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
  purposeID: number;
};

export default function EditMrItemButton({
  projectID,
  item,
  bgColor = "rgba(239, 239, 239, 1)",
  textColor = "black",
  borderColor = "rgba(239, 239, 239, 1)",
  children,
  full,
  purposeID,
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

  // Parse material_subcategory_id from the view (comma-separated string to array)
  const [materialSubCategoryIDs, setMaterialSubCategoryIDs] = useState<
    (string | number)[]
  >(() => {
    // Try to parse from material_subcategory_id field (from the view)
    if (item.material_subcategory_id) {
      // If it's a string like "1, 3, 5", split and convert to numbers
      if (typeof item.material_subcategory_id === "string") {
        const ids = item.material_subcategory_id
          .split(",")
          .map((id) => id.trim())
          .filter((id) => id && id !== "")
          .map((id) => Number(id))
          .filter((id) => !isNaN(id));
        return ids;
      }
      // If it's already an array
      if (Array.isArray(item.material_subcategory_id)) {
        return item.material_subcategory_id
          .map((id) => Number(id))
          .filter((id) => !isNaN(id));
      }
      // If it's a single number
      if (typeof item.material_subcategory_id === "number") {
        return [item.material_subcategory_id];
      }
    }

    // Fallback: if no IDs found, return empty array
    return [];
  });

  const [boqLineID, setBoqLineID] = useState<string | number>(
    item.boq_line_id || ""
  );
  const [materialDescription, setMaterialDescription] = useState(
    item.material_description
  );
  const [quantity, setQuantity] = useState<string | number>(item.quantity);
  const [unit, setUnit] = useState(item.unit);
  const [notes, setNotes] = useState(item.notes ?? "");
  const [specification, setSpecification] = useState(item.specification ?? "");
  const [brand, setBrand] = useState(item.brand ?? "");
  const [deliveryLocation, setDeliveryLocation] = useState(
    item.delivery_location ?? ""
  );

  // Fetch initial data
  useEffect(() => {
    // Fetch material categories
    fetch("/api/mr/getMaterialCategoryValues")
      .then((res) => res.json())
      .then((data) => {
        setMaterialCategoryValues(data);
      })
      .catch((err) => {
        console.error("Error fetching categories:", err);
      });

    // Fetch all subcategories initially
    fetch("/api/mr/getMaterialSubCategoryValues", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    })
      .then((res) => res.json())
      .then((data) => {
        setMaterialSubCategoryValues(data);
      })
      .catch((err) => {
        console.error("Error fetching subcategories:", err);
      });

    // Fetch projects for delivery location
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/projects`, {
      method: "GET",
    })
      .then((res) => res.json())
      .then((data) => {
        const names = data.map((item: any) => item.name);
        setLocationValues(names);
      })
      .catch((err) => {
        console.error("Error fetching projects:", err);
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
        })
        .catch((err) => {
          console.error("Error fetching BOQ lines:", err);
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
            prev.filter((id) =>
              data.some((item: any) => item.id === Number(id))
            )
          );
        })
        .catch((err) => {
          console.error("Error filtering subcategories:", err);
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
        })
        .catch((err) => {
          console.error("Error fetching subcategories:", err);
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

    if (!materialDescription.trim()) {
      toast("Please enter a material description", "error");
      return;
    }

    if (!quantity || isNaN(Number(quantity))) {
      toast("Please enter a valid quantity", "error");
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

    // Clean the data before sending
    const cleanedSubcategoryIds = materialSubCategoryIDs
      .filter((id) => id && !isNaN(Number(id)))
      .map((id) => Number(id));

    if (cleanedSubcategoryIds.length === 0) {
      toast("Invalid subcategory selection", "error");
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateAll",
          id: Number(item.id),
          boq_line_id: boqLineID ? Number(boqLineID) : null,
          material_category_id: Number(materialCategoryID),
          material_subcategory_id: cleanedSubcategoryIds, // Array of IDs
          material_description: materialDescription.trim(),
          quantity: Number(quantity),
          unit: unit,
          notes: notes || null,
          specification: specification || null,
          brand: brand || null,
          delivery_location: deliveryLocation,
        }),
      });

      if (res.ok) {
        toast(`${materialDescription} updated`, "success");
        setIsOpen(false);
        router.refresh();
      } else {
        const errorData = await res.json();
        toast(
          errorData.error || "Failed to update material request item",
          "error"
        );
      }
    } catch (error) {
      console.error("Update error:", error);
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
              required={purposeID === 1}
              disabled={!projectID}
              categorized={true}
              categoryField="category"
              subCategoryField="sub_category"
              style={{ width: "350px" }}
            />
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
