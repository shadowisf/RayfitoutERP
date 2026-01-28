"use client";

import { useState, useEffect } from "react";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import Button from "@/app/components/Button";
import { useRouter } from "next/navigation";
import SingleSelectDropdown from "@/app/components/SingleSelectDropdown";
import MultiSelectDropdown from "@/app/components/MultiSelectDropdown";
import SingleUploadFileBox from "@/app/components/SingleUploadFileBox";
import { MrLine } from "../../types/mrLine";
import { toast } from "@/app/components/Toast";
import MultipleSelectBoqItemButton from "@/app/components/_MultipleSelectBoqItemButton";

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

  // Track if category was manually selected by user
  const [categoriesManuallySelected, setCategoriesManuallySelected] =
    useState(true); // Set to true initially since we're editing existing data
  const [userInitiatedCategorySelection, setUserInitiatedCategorySelection] =
    useState(false);

  const [materialCategoryValues, setMaterialCategoryValues] = useState<any[]>(
    [],
  );
  const [materialSubCategoryValues, setMaterialSubCategoryValues] = useState<
    any[]
  >([]);
  const [locationValues, setLocationValues] = useState<any[]>([]);

  const [materialCategoryID, setMaterialCategoryID] = useState<string | number>(
    item.material_category_id,
  );

  // Parse material_subcategory_id from the view (comma-separated string to array)
  const [materialSubCategoryIDs, setMaterialSubCategoryIDs] = useState<
    (string | number)[]
  >(() => {
    if (item.material_subcategory_id) {
      if (typeof item.material_subcategory_id === "string") {
        const ids = item.material_subcategory_id
          .split(",")
          .map((id) => id.trim())
          .filter((id) => id && id !== "")
          .map((id) => Number(id))
          .filter((id) => !isNaN(id));
        return ids;
      }
      if (Array.isArray(item.material_subcategory_id)) {
        return item.material_subcategory_id
          .map((id) => Number(id))
          .filter((id) => !isNaN(id));
      }
      if (typeof item.material_subcategory_id === "number") {
        return [item.material_subcategory_id];
      }
    }
    return [];
  });

  // ✅ Parse boq_ids from the view (comma-separated string to array)
  const [boqLineIDs, setBoqLineIDs] = useState<number[]>(() => {
    if (item.boq_line_ids) {
      if (typeof item.boq_line_ids === "string") {
        const ids = item.boq_line_ids
          .split(",")
          .map((id) => id.trim())
          .filter((id) => id && id !== "")
          .map((id) => Number(id))
          .filter((id) => !isNaN(id));
        return ids;
      }

      if (typeof item.boq_line_ids === "number") {
        return [item.boq_line_ids];
      }
    }
    return [];
  });

  const [materialDescription, setMaterialDescription] = useState(
    item.material_description,
  );
  const [quantity, setQuantity] = useState<string | number>(item.quantity);
  const [unit, setUnit] = useState(item.unit);
  const [notes, setNotes] = useState(item.notes ?? "");
  const [specification, setSpecification] = useState(item.specification ?? "");
  const [brand, setBrand] = useState(item.brand ?? "");
  const [deliveryLocation, setDeliveryLocation] = useState(
    item.delivery_location ?? "",
  );
  const [attachment, setAttachment] = useState<File | null>(null);

  // Fetch initial data
  useEffect(() => {
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMaterialCategoryValues`,
    )
      .then((res) => res.json())
      .then((data) => {
        setMaterialCategoryValues(data);
      })
      .catch((err) => {
        console.error("Error fetching categories:", err);
      });

    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMaterialSubCategoryValues`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      },
    )
      .then((res) => res.json())
      .then((data) => {
        setMaterialSubCategoryValues(data);
      })
      .catch((err) => {
        console.error("Error fetching subcategories:", err);
      });

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

  // Filter subcategories based on selected category - only if category was selected by user
  useEffect(() => {
    if (materialCategoryID && userInitiatedCategorySelection) {
      fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMaterialSubCategoryValuesByCategoryID`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category_id: materialCategoryID,
          }),
        },
      )
        .then((res) => res.json())
        .then((data) => {
          setMaterialSubCategoryValues(data);
        })
        .catch((err) => {
          console.error(err);
        });
    } else if (!materialCategoryID) {
      // If category is reset, load all subcategories
      fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMaterialSubCategoryValues`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        },
      )
        .then((res) => res.json())
        .then((data) => {
          setMaterialSubCategoryValues(data);
        });
    }
  }, [materialCategoryID, userInitiatedCategorySelection]);

  // Handle subcategory change - auto-select category if needed
  const handleSubCategoryChange = (selectedIds: (string | number)[]) => {
    setMaterialSubCategoryIDs(selectedIds);

    // If subcategories are cleared
    if (selectedIds.length === 0) {
      if (!categoriesManuallySelected) {
        setMaterialCategoryID("");
      }
      // Reset to all subcategories
      fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMaterialSubCategoryValues`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        },
      )
        .then((res) => res.json())
        .then((data) => {
          setMaterialSubCategoryValues(data);
        });
      return;
    }

    // Get category from first selected subcategory
    const firstSelectedSubCategory = materialSubCategoryValues.find(
      (sc: any) => sc.id === selectedIds[0],
    ) as any;

    if (firstSelectedSubCategory?.category_id) {
      // If category was manually selected, keep it and merge
      if (categoriesManuallySelected && materialCategoryID) {
        // Don't override the manually selected category
      } else {
        // Auto-select the category based on subcategory
        setMaterialCategoryID(firstSelectedSubCategory.category_id);
      }
    }
  };

  // ✅ Handle BOQ selection
  const handleBoqSelection = (boqIDs: number[], boqInfo: string) => {
    setBoqLineIDs(boqIDs);
  };

  // Handle category change
  const handleCategoryChange = (categoryId: string | number) => {
    setCategoriesManuallySelected(true);
    setUserInitiatedCategorySelection(true);
    setMaterialCategoryID(categoryId);
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

    /* if (boqLineIDs.length === 0 && purposeID === 1) {
      toast("Please select at least one bill of quantity line", "error");
      return;
    } */

    const cleanedSubcategoryIds = materialSubCategoryIDs
      .filter((id) => id && !isNaN(Number(id)))
      .map((id) => Number(id));

    if (cleanedSubcategoryIds.length === 0) {
      toast("Invalid subcategory selection", "error");
      return;
    }

    try {
      let attachmentUrl = null;

      if (attachment) {
        const formData = new FormData();
        formData.append("files", attachment);
        formData.append("folder", "mr-attachments");

        const uploadRes = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/s3`,
          {
            method: "POST",
            body: formData,
          },
        );

        if (!uploadRes.ok) {
          throw new Error("Failed to upload file");
        }

        const uploadResult = await uploadRes.json();
        attachmentUrl = uploadResult.urls[0];
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateAll",
          id: Number(item.id),
          boq_line_ids: boqLineIDs, // ✅ Send as array
          material_category_id: Number(materialCategoryID),
          material_subcategory_id: cleanedSubcategoryIds,
          material_description: materialDescription.trim(),
          quantity: Number(quantity),
          unit: unit,
          notes: notes || null,
          specification: specification || null,
          brand: brand || null,
          delivery_location: deliveryLocation,
          attachment: attachmentUrl
            ? JSON.stringify(attachmentUrl)
            : item.attachment,
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
          "error",
        );
      }
    } catch (error) {
      console.error("Update error:", error);
      toast(
        "Failed to update material request item. Something went wrong",
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
              onChange={handleCategoryChange}
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

            <div className="input-item">
              <label className="custom">
                <span>BILL OF QUANTITY</span>
                <small>(OPTIONAL)</small>
              </label>

              {/* ✅ Updated to use checkbox component with multiple selection */}
              <MultipleSelectBoqItemButton
                projectID={projectID}
                onSelectBoq={handleBoqSelection}
                currentBoqLineIDs={boqLineIDs}
              />
            </div>
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
              onChange={(e) => setBrand(e.target.value)}
            />
          </div>

          {/* Specification Row */}
          <div className="input-row full">
            <InputItem
              label={"SPECIFICATION"}
              value={specification}
              type={"textarea"}
              onChange={(e) => setSpecification(e.target.value)}
            />
          </div>

          {/* Delivery Location and Attachment Row */}
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
            <SingleUploadFileBox
              fileState={attachment}
              setFileState={setAttachment}
              label={"ATTACHMENT"}
              acceptedFileTypes={".pdf,.png,.jpg,.jpeg"}
            />
          </div>
        </FormPopUp>
      )}
    </>
  );
}
