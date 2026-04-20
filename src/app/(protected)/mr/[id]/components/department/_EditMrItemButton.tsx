"use client";

import { useState, useEffect } from "react";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import SingleSelectDropdown from "@/app/components/SingleSelectDropdown";
import { UNIT_OPTIONS, mapPredefinedUnit } from "@/constants/units";
import Button from "@/app/components/Button";
import { useRouter } from "next/navigation";
import SingleUploadFileBox from "@/app/components/SingleUploadFileBox";
import { MrLine } from "../../types/mrLine";
import { toast } from "@/app/components/Toast";
import MultipleSelectBoqItemButton from "@/app/components/_MultipleSelectBoqItemButton";
import MultipleSelectMaterialItemButton, {
  PredefinedItem,
} from "@/app/components/_MultipleSelectMaterialItemButton";
import CreateNewMaterialButton from "@/app/components/_CreateNewMaterialButton";

type SelectedMaterialRow = {
  predefinedItem: PredefinedItem | null;
  quantity: string;
  unit: string;
  unitWasNull: boolean;
  materialDescription: string;
  categoryId: number;
  subcategoryId: number;
  brand: string;
};

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

  // Selected material row (single item for edit)
  const [selectedRow, setSelectedRow] = useState<SelectedMaterialRow | null>(
    null,
  );
  const [selectedItemIDs, setSelectedItemIDs] = useState<number[]>([]);

  // Brand state
  const [brand, setBrand] = useState(item.brand ?? "");

  // Parse boq_ids from the view (comma-separated string to array)
  const [boqLineIDs, setBoqLineIDs] = useState<number[]>(() => {
    if (item.boq_line_ids) {
      if (typeof item.boq_line_ids === "string") {
        return item.boq_line_ids
          .split(",")
          .map((id) => id.trim())
          .filter((id) => id && id !== "")
          .map((id) => Number(id))
          .filter((id) => !isNaN(id));
      }
      if (typeof item.boq_line_ids === "number") {
        return [item.boq_line_ids];
      }
    }
    return [];
  });

  const [specification, setSpecification] = useState(item.specification ?? "");
  const [deliveryLocation, setDeliveryLocation] = useState(
    item.delivery_location ?? "",
  );
  const [attachment, setAttachment] = useState<File | null>(null);
  const [locationValues, setLocationValues] = useState<any[]>([]);
  const [categoryValues, setCategoryValues] = useState<any[]>([]);
  const [subcategoryValues, setSubcategoryValues] = useState<any[]>([]);

  // Initialize the selected row from the existing item
  useEffect(() => {
    if (isOpen && !selectedRow) {
      const num = Number(item.quantity);
      const qtyStr = isNaN(num)
        ? String(item.quantity)
        : num % 1 === 0
          ? String(Math.round(num))
          : String(num);

      const initCategoryId = item.material_category_id;
      const initSubcategoryId =
        typeof item.material_subcategory_id === "number"
          ? item.material_subcategory_id
          : typeof item.material_subcategory_id === "string"
            ? Number(item.material_subcategory_id.split(",")[0])
            : Array.isArray(item.material_subcategory_id)
              ? item.material_subcategory_id[0]
              : 0;

      setSelectedRow({
        predefinedItem: null,
        quantity: qtyStr,
        unit: item.unit || "",
        unitWasNull: false,
        materialDescription: item.material_description,
        categoryId: initCategoryId,
        subcategoryId: initSubcategoryId,
        brand: item.brand ?? "",
      });

      // Fetch categories
      fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMaterialCategoryValues`,
      )
        .then((res) => res.json())
        .then((data) => setCategoryValues(data))
        .catch(console.error);

      // Fetch subcategories for the current category
      if (initCategoryId) {
        fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMaterialSubCategoryValuesByCategoryID`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ category_id: initCategoryId }),
          },
        )
          .then((res) => res.json())
          .then((data) => setSubcategoryValues(data))
          .catch(console.error);
      } else {
        fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMaterialSubCategoryValues`,
        )
          .then((res) => res.json())
          .then((data) => setSubcategoryValues(data))
          .catch(console.error);
      }
    }
  }, [isOpen]);

  // When a new predefined item is selected, also refresh subcategories for its category
  const handleCategoryChange = (val: string | number) => {
    setSelectedRow((prev) =>
      prev ? { ...prev, categoryId: Number(val), subcategoryId: 0 } : prev,
    );
    if (val) {
      fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMaterialSubCategoryValuesByCategoryID`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category_id: val }),
        },
      )
        .then((res) => res.json())
        .then((data) => setSubcategoryValues(data))
        .catch(console.error);
    } else {
      fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMaterialSubCategoryValues`,
      )
        .then((res) => res.json())
        .then((data) => setSubcategoryValues(data))
        .catch(console.error);
    }
  };

  // Fetch locations
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/projects`, { method: "GET" })
      .then((res) => res.json())
      .then((data) => setLocationValues(data.map((d: any) => d.name)))
      .catch(console.error);
  }, []);

  // Refresh subcategories for a given category ID
  const refreshSubcategoriesForCategory = (categoryId: number) => {
    if (categoryId) {
      fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMaterialSubCategoryValuesByCategoryID`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category_id: categoryId }),
        },
      )
        .then((res) => res.json())
        .then((data) => setSubcategoryValues(data))
        .catch(console.error);
    }
  };

  // Handle new material created via CreateNewMaterialButton
  const handleNewMaterialCreated = (newItem: PredefinedItem) => {
    toast(`${newItem.material_description} created`, "success");
    setSelectedItemIDs([newItem.id]);
    setSelectedRow({
      predefinedItem: newItem,
      quantity: selectedRow?.quantity || "",
      unit: newItem.unit ? mapPredefinedUnit(newItem.unit) : "",
      unitWasNull: !newItem.unit,
      materialDescription: newItem.material_description,
      categoryId: newItem.category_id,
      subcategoryId: newItem.subcategory_id,
      brand: newItem.brand || "",
    });
    refreshSubcategoriesForCategory(newItem.category_id);
  };

  // Handle material items selection from popup (take only last selected item for edit)
  const handleMaterialSelect = (items: PredefinedItem[]) => {
    if (items.length === 0) {
      setSelectedRow(null);
      setSelectedItemIDs([]);
      return;
    }
    const lastItem = items[items.length - 1];
    setSelectedItemIDs([lastItem.id]);
    setSelectedRow({
      predefinedItem: lastItem,
      quantity: selectedRow?.quantity || "",
      unit: lastItem.unit ? mapPredefinedUnit(lastItem.unit) : "",
      unitWasNull: !lastItem.unit,
      materialDescription: lastItem.material_description,
      categoryId: lastItem.category_id,
      subcategoryId: lastItem.subcategory_id,
      brand: lastItem.brand || "",
    });
    refreshSubcategoriesForCategory(lastItem.category_id);
  };

  const handleBoqSelection = (boqIDs: number[]) => {
    setBoqLineIDs(boqIDs);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedRow) {
      toast("Please select a material item", "error");
      return;
    }

    if (!selectedRow.quantity || Number(selectedRow.quantity) <= 0) {
      toast("Please enter a valid quantity", "error");
      return;
    }

    if (!selectedRow.unit) {
      toast("Please select a unit", "error");
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
          { method: "POST", body: formData },
        );

        if (!uploadRes.ok) throw new Error("Failed to upload file");
        const uploadResult = await uploadRes.json();
        attachmentUrl = uploadResult.urls[0];
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateAll",
          id: Number(item.id),
          boq_line_ids: boqLineIDs,
          material_category_id: Number(selectedRow.categoryId),
          material_subcategory_id: [Number(selectedRow.subcategoryId)],
          material_description: selectedRow.materialDescription.trim(),
          quantity: Number(selectedRow.quantity),
          unit: selectedRow.unit,
          notes: null,
          specification: specification || null,
          brand: brand || selectedRow.brand || null,
          delivery_location: deliveryLocation,
          attachment: attachmentUrl
            ? JSON.stringify(attachmentUrl)
            : item.attachment,
        }),
      });

      if (res.ok) {
        toast(`${selectedRow.materialDescription} updated`, "success");
        setIsOpen(false);

        // Save unit back if it was null
        if (
          selectedRow.predefinedItem &&
          selectedRow.unitWasNull &&
          selectedRow.unit
        ) {
          await fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getPredefinedItems`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: selectedRow.predefinedItem.id,
                unit: selectedRow.unit,
              }),
            },
          );
        }

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
      toast("Failed to update material request item", "error");
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
          style={{ minWidth: "95dvw", height: "95dvh" }}
        >
          {/* Material Items Selection */}
          <div className="input-row full">
            <div className="input-item" style={{ width: "100%" }}>
              {selectedRow ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    justifyContent: "space-between",
                  }}
                >
                  <label className="custom" style={{ margin: 0 }}>
                    <span>MATERIAL ITEM(S)</span>
                  </label>

                  {/* <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <CreateNewMaterialButton
                      onSuccess={handleNewMaterialCreated}
                    />

                    <MultipleSelectMaterialItemButton
                      onSelectItems={handleMaterialSelect}
                      currentItemIDs={selectedItemIDs}
                    />
                  </div> */}
                </div>
              ) : (
                <>
                  <label className="custom">
                    <span>MATERIAL ITEM(S)</span>
                    <small></small>
                  </label>
                  <MultipleSelectMaterialItemButton
                    onSelectItems={handleMaterialSelect}
                    currentItemIDs={selectedItemIDs}
                  />
                </>
              )}
            </div>
          </div>

          {/* Preview Table */}
          {selectedRow && (
            <>
              <div className="input-row full">
                <table className="items-table two-toned">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>CATEGORY</th>
                      <th>SUBCATEGORY</th>
                      <th>ITEM</th>
                      <th>QTY</th>
                      <th>UNIT</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>1</td>
                      <td>
                        <SingleSelectDropdown
                          label=""
                          noLabel
                          dbData={categoryValues}
                          selectedValue={selectedRow.categoryId}
                          onChange={handleCategoryChange}
                          placeholder="SELECT CATEGORY"
                          style={{ width: "250px" }}
                        />
                      </td>
                      <td>
                        <SingleSelectDropdown
                          label=""
                          noLabel
                          dbData={subcategoryValues}
                          selectedValue={selectedRow.subcategoryId}
                          onChange={(val) =>
                            setSelectedRow((prev) =>
                              prev
                                ? { ...prev, subcategoryId: Number(val) }
                                : prev,
                            )
                          }
                          placeholder="SELECT SUBCATEGORY"
                          style={{ width: "250px" }}
                        />
                      </td>
                      <td>
                        <InputItem
                          label=""
                          value={selectedRow.materialDescription}
                          type="text"
                          placeholder="ITEM"
                          noOptionalLabel
                          style={{ width: "500px" }}
                          onChange={(e) =>
                            setSelectedRow((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    materialDescription: e.target.value,
                                  }
                                : prev,
                            )
                          }
                        />
                      </td>

                      <td>
                        <InputItem
                          label=""
                          value={selectedRow.quantity}
                          type="text"
                          placeholder="QTY"
                          noOptionalLabel
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "" || /^\d*\.?\d*$/.test(val)) {
                              setSelectedRow((prev) =>
                                prev ? { ...prev, quantity: val } : prev,
                              );
                            }
                          }}
                          style={{ width: "80px" }}
                        />
                      </td>
                      <td>
                        <SingleSelectDropdown
                          label=""
                          noLabel
                          selectOptions={[...UNIT_OPTIONS]}
                          selectedValue={selectedRow.unit}
                          onChange={(val) =>
                            setSelectedRow((prev) =>
                              prev ? { ...prev, unit: String(val) } : prev,
                            )
                          }
                          placeholder="SELECT UNIT"
                          style={{ width: "120px" }}
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <br />
            </>
          )}

          {/* BOQ REF */}
          <div className="input-row full">
            <div className="input-item">
              <label className="custom">
                <span>BOQ REF.</span>
                <small></small>
              </label>
              <MultipleSelectBoqItemButton
                projectID={projectID}
                onSelectBoq={handleBoqSelection}
                currentBoqLineIDs={boqLineIDs}
              />
            </div>
          </div>

          {/* Brand */}
          <div className="input-row full">
            <InputItem
              label={"BRAND"}
              value={brand}
              type={"text"}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="ENTER BRAND"
            />
          </div>

          {/* Specification */}
          <div className="input-row full">
            <InputItem
              label={"SPECIFICATION / NOTES"}
              value={specification}
              type={"textarea"}
              onChange={(e) => setSpecification(e.target.value)}
            />
          </div>

          {/* Delivery Location and Attachment */}
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
              existingFileUrl={item.attachment}
            />
          </div>
        </FormPopUp>
      )}
    </>
  );
}
