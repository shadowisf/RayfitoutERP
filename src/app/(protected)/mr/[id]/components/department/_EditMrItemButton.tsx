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
import SingleSelectBoqItemButton from "@/app/components/_SingleSelectBoqItemButton";
import MultipleSelectMaterialItemButton, {
  PredefinedItem,
} from "@/app/components/_MultipleSelectMaterialItemButton";
import { useAuth } from "@/app/context/AuthContext";

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
  stageName?: string;
  /** When true (QS Review / Manager Price Approval), shows category/subcategory/name editors */
  canEditItemDetails?: boolean;
};

export default function EditMrItemButton({
  projectID,
  item,
  bgColor = "rgba(239, 239, 239, 1)",
  textColor = "black",
  borderColor = "rgba(239, 239, 239, 1)",
  children,
  full,
  stageName,
  canEditItemDetails = false,
}: EditMrItemButtonProps) {
  const router = useRouter();
  const { userInfo } = useAuth();

  const [isOpen, setIsOpen] = useState(false);

  // Selected material row (single item for edit)
  const [selectedRow, setSelectedRow] = useState<SelectedMaterialRow | null>(
    null,
  );
  const [selectedItemIDs, setSelectedItemIDs] = useState<number[]>(() =>
    item.predefined_item_id ? [item.predefined_item_id] : [],
  );

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
      brand: "",
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
      brand: "",
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

    if (boqLineIDs.length === 0) {
      toast(
        "BOQ reference is required. Please add a BOQ reference before confirming.",
        "error",
      );
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

      // Determine the predefined_item_id to persist on the mr_line:
      // • If user picked a new item from the catalog → use that item's id.
      // • If user edited inline (canEditItemDetails) without picking a new item → keep existing link.
      // • Otherwise → keep existing link unchanged (pass through current value).
      const newPredefinedItemId = selectedRow.predefinedItem
        ? selectedRow.predefinedItem.id
        : (item.predefined_item_id ?? null);

      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateAll",
          id: Number(item.id),
          changed_by: userInfo?.name || null,
          stage_name: stageName || "INITIAL APPROVAL",
          boq_line_ids: boqLineIDs,
          material_category_id: Number(selectedRow.categoryId),
          material_subcategory_id: [Number(selectedRow.subcategoryId)],
          material_description: selectedRow.materialDescription.trim(),
          quantity: Number(selectedRow.quantity),
          unit: selectedRow.unit,
          notes: null,
          specification: specification || null,
          brand: brand || null,
          delivery_location: deliveryLocation,
          predefined_item_id: newPredefinedItemId,
          attachment: attachmentUrl
            ? JSON.stringify(attachmentUrl)
            : item.attachment,
        }),
      });

      if (res.ok) {
        toast(`${selectedRow.materialDescription} updated`, "success");
        setIsOpen(false);

        // ── Save unit back if it was null on the predefined item ──────────────
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

        // ── Propagate inline edits back to lut_predefined_items ──────────────
        // When the user directly edited name/category/subcategory (no new item
        // selected from picker) and the line is linked to a predefined entry,
        // keep the catalog in sync so all future MRs use the updated values.
        if (
          canEditItemDetails &&
          !selectedRow.predefinedItem &&
          item.predefined_item_id
        ) {
          const descChanged =
            selectedRow.materialDescription.trim() !==
            item.material_description;
          const catChanged =
            selectedRow.categoryId !== item.material_category_id;
          const subCatChanged =
            selectedRow.subcategoryId !==
            (typeof item.material_subcategory_id === "number"
              ? item.material_subcategory_id
              : typeof item.material_subcategory_id === "string"
                ? Number(item.material_subcategory_id.split(",")[0])
                : Array.isArray(item.material_subcategory_id)
                  ? item.material_subcategory_id[0]
                  : 0);

          if (descChanged || catChanged || subCatChanged) {
            await fetch(
              `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getPredefinedItems`,
              {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  id: item.predefined_item_id,
                  ...(descChanged && {
                    material_description:
                      selectedRow.materialDescription.trim(),
                  }),
                  ...(catChanged && { category_id: selectedRow.categoryId }),
                  ...(subCatChanged && {
                    subcategory_id: selectedRow.subcategoryId,
                  }),
                }),
              },
            );
          }
        }

        window.dispatchEvent(new Event("quotationsUpdated"));
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
          style={{ width: "95dvw", height: "95dvh" }}
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

                  {/* {canEditItemDetails && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <MultipleSelectMaterialItemButton
                        onSelectItems={handleMaterialSelect}
                        currentItemIDs={selectedItemIDs}
                      />
                    </div>
                  )} */}
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
              {/* Hidden inputs to enforce required fields via form.checkValidity() */}
              <input
                type="text"
                required
                value={
                  selectedRow.categoryId > 0
                    ? String(selectedRow.categoryId)
                    : ""
                }
                onChange={() => {}}
                style={{
                  position: "absolute",
                  opacity: 0,
                  width: 0,
                  height: 0,
                  pointerEvents: "none",
                }}
                tabIndex={-1}
              />
              <input
                type="text"
                required
                value={
                  selectedRow.subcategoryId > 0
                    ? String(selectedRow.subcategoryId)
                    : ""
                }
                onChange={() => {}}
                style={{
                  position: "absolute",
                  opacity: 0,
                  width: 0,
                  height: 0,
                  pointerEvents: "none",
                }}
                tabIndex={-1}
              />
              <input
                type="text"
                required
                value={
                  selectedRow.quantity && Number(selectedRow.quantity) > 0
                    ? selectedRow.quantity
                    : ""
                }
                onChange={() => {}}
                style={{
                  position: "absolute",
                  opacity: 0,
                  width: 0,
                  height: 0,
                  pointerEvents: "none",
                }}
                tabIndex={-1}
              />
              <input
                type="text"
                required
                value={selectedRow.unit ?? ""}
                onChange={() => {}}
                style={{
                  position: "absolute",
                  opacity: 0,
                  width: 0,
                  height: 0,
                  pointerEvents: "none",
                }}
                tabIndex={-1}
              />
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
                      <th>BOQ REF.</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>1</td>
                      <td>
                        {canEditItemDetails ? (
                          <SingleSelectDropdown
                            label=""
                            noLabel
                            dbData={categoryValues}
                            selectedValue={selectedRow.categoryId}
                            onChange={handleCategoryChange}
                            placeholder="SELECT CATEGORY"
                            style={{ width: "200px" }}
                          />
                        ) : (
                          <span>{item.material_category || "—"}</span>
                        )}
                      </td>
                      <td>
                        {canEditItemDetails ? (
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
                            style={{ width: "200px" }}
                          />
                        ) : (
                          <span>{item.material_subcategory || "—"}</span>
                        )}
                      </td>
                      <td>
                        {canEditItemDetails ? (
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
                        ) : (
                          <span>{item.material_description || "—"}</span>
                        )}
                      </td>

                      <td>
                        <InputItem
                          label=""
                          value={selectedRow.quantity}
                          type="text"
                          placeholder="ENTER QTY"
                          noOptionalLabel
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "" || /^\d*\.?\d*$/.test(val)) {
                              setSelectedRow((prev) =>
                                prev ? { ...prev, quantity: val } : prev,
                              );
                            }
                          }}
                          style={{ width: "150px" }}
                          required
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
                          style={{ width: "150px" }}
                          required
                        />
                      </td>
                      <td>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <SingleSelectBoqItemButton
                            projectID={projectID}
                            onSelectBoq={(ids) => setBoqLineIDs(ids)}
                            currentBoqLineIDs={boqLineIDs}
                            compact
                          />
                          <span
                            style={{
                              color: "red",
                              fontSize: "12px",
                              flexShrink: 0,
                              lineHeight: 1,
                            }}
                          >
                            *
                          </span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <br />
            </>
          )}

          {/* BOQ REF — moved to per-row column in preview table above */}
          {/* <div className="input-row full">
            <div className="input-item">
              <label className="custom">
                <span>BOQ REF.</span>
                <small></small>
              </label>
              <SingleSelectBoqItemButton
                projectID={projectID}
                onSelectBoq={handleBoqSelection}
                currentBoqLineIDs={boqLineIDs}
              />
            </div>
          </div> */}

          {/* Brand */}
          {/* <div className="input-row full">
            <InputItem
              label={"BRAND"}
              value={brand}
              type={"text"}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="ENTER BRAND"
            />
          </div> */}

          <br />

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
