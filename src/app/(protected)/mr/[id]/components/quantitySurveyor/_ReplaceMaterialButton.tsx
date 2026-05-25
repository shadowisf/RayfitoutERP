"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { toast } from "@/app/components/Toast";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import Button from "@/app/components/Button";
import SingleSelectDropdown from "@/app/components/SingleSelectDropdown";
import MultipleSelectMaterialItemButton, {
  PredefinedItem,
} from "@/app/components/_MultipleSelectMaterialItemButton";
import { UNIT_OPTIONS, mapPredefinedUnit } from "@/constants/units";
import { MrLine } from "../../types/mrLine";
import { useAuth } from "@/app/context/AuthContext";
import { useRefresh } from "@/app/context/RefreshContext";

type Props = {
  item: MrLine;
  /** Render a custom trigger button instead of the default one */
  renderTrigger?: (openPicker: () => void) => React.ReactNode;
  /** When true, picker confirmation submits directly (no intermediate form) */
  directSubmit?: boolean;
};

export default function ReplaceMaterialButton({
  item,
  renderTrigger,
  directSubmit = false,
}: Props) {
  const { refresh } = useRefresh();
  const { userInfo } = useAuth();

  const rewindIcon = "/icons/rewind-two-arrows.svg";
  const pencilIcon = "/icons/pencil.svg";
  const externalLinkIcon = "/icons/external-link.svg";

  // ── Picker (MultipleSelectMaterialItemButton) ─────────────────────────────
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  // ── Shared: selected item + replace reason ────────────────────────────────
  const [selectedItem, setSelectedItem] = useState<PredefinedItem | null>(null);
  const [replaceReason, setReplaceReason] = useState("");

  // ── directSubmit=true: reason dialog ─────────────────────────────────────
  const [isReasonOpen, setIsReasonOpen] = useState(false);

  // ── directSubmit=false: main preview form ─────────────────────────────────
  const [isMainOpen, setIsMainOpen] = useState(false);
  const [brand, setBrand] = useState(item.brand ?? "");
  const [specification, setSpecification] = useState(item.specification ?? "");
  const [notes, setNotes] = useState(item.notes ?? "");
  const [previewDescription, setPreviewDescription] = useState("");
  const [previewCategoryId, setPreviewCategoryId] = useState<number>(0);
  const [previewSubcategoryId, setPreviewSubcategoryId] = useState<number>(0);
  const [previewQuantity, setPreviewQuantity] = useState(() => {
    const num = Number(item.quantity);
    if (!item.quantity || isNaN(num)) return "";
    return String(parseFloat(num.toFixed(3)));
  });
  const [previewUnit, setPreviewUnit] = useState(item.unit ?? "");
  const [categoryValues, setCategoryValues] = useState<any[]>([]);
  const [subcategoryValues, setSubcategoryValues] = useState<any[]>([]);

  // ── Fetch categories when main form opens ────────────────────────────────
  useEffect(() => {
    if (!isMainOpen) return;
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMaterialCategoryValues`,
    )
      .then((r) => r.json())
      .then(setCategoryValues)
      .catch(console.error);
  }, [isMainOpen]);

  const refreshSubcategories = (categoryId: number) => {
    if (!categoryId) return;
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMaterialSubCategoryValuesByCategoryID`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category_id: categoryId }),
      },
    )
      .then((r) => r.json())
      .then(setSubcategoryValues)
      .catch(console.error);
  };

  // ── Picker callback ───────────────────────────────────────────────────────
  const handlePickerSelect = (items: PredefinedItem[]) => {
    if (items.length === 0) return;
    const selected = items[0];
    setSelectedItem(selected);

    if (directSubmit) {
      // Show a small reason dialog before committing
      setIsReasonOpen(true);
    } else {
      // Populate the preview form and keep it open (or open it)
      setPreviewDescription(selected.material_description);
      setPreviewCategoryId(selected.category_id);
      setPreviewSubcategoryId(selected.subcategory_id);
      const mappedUnit = selected.unit ? mapPredefinedUnit(selected.unit) : "";
      setPreviewUnit(mappedUnit);
      refreshSubcategories(selected.category_id);
      // If we came via renderTrigger (no main form open yet), open it now
      if (!isMainOpen) setIsMainOpen(true);
    }
  };

  // ── directSubmit=true: reason confirm ────────────────────────────────────
  const handleDirectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    if (!replaceReason.trim()) {
      toast("Please enter a reason for replacing material", "error");
      return;
    }

    const mappedUnit = selectedItem.unit
      ? mapPredefinedUnit(selectedItem.unit)
      : (item.unit ?? "");

    const updateRes = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateAll",
          id: item.id,
          material_category_id: selectedItem.category_id,
          material_subcategory_id: [selectedItem.subcategory_id],
          material_description: selectedItem.material_description,
          quantity: Number(item.quantity),
          unit: mappedUnit || item.unit || "",
          notes: item.notes || null,
          specification: item.specification || null,
          brand: item.brand || null,
          delivery_location: item.delivery_location,
          predefined_item_id: selectedItem.id,
          boq_line_ids: item.boq_line_ids
            ? typeof item.boq_line_ids === "string"
              ? item.boq_line_ids.split(",").map(Number).filter(Boolean)
              : [item.boq_line_ids]
            : [],
        }),
      },
    );

    if (!updateRes.ok) {
      toast("Failed to replace material", "error");
      setIsReasonOpen(false);
      return;
    }

    // Insert QS replacement note into progress log
    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "setQSReplaced",
        id: item.id,
        mr_header_id: item.mr_header_id,
        qs_replace_reason: replaceReason.trim() || null,
        qs_original_material_description: item.material_description,
        qs_original_category_name: item.material_category,
        qs_original_subcategory_name: item.material_subcategory,
        replacement_category_id: selectedItem.category_id,
        replacement_subcategory_id: selectedItem.subcategory_id,
        replacement_item_code: selectedItem.item_code,
        replacement_description: selectedItem.material_description,
        changed_by: userInfo?.name || userInfo?.email || "QS",
      }),
    });

    toast(`Replaced with ${selectedItem.material_description}`, "success");
    setIsReasonOpen(false);
    setReplaceReason("");
    await refresh();
  };

  // ── directSubmit=false: main form confirm ─────────────────────────────────
  const handleMainConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    const updateRes = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateAll",
          id: item.id,
          material_category_id: previewCategoryId,
          material_subcategory_id: [previewSubcategoryId],
          material_description: previewDescription.trim(),
          quantity: Number(previewQuantity),
          unit: previewUnit,
          notes: notes || null,
          specification: specification || null,
          brand: brand || null,
          delivery_location: item.delivery_location,
          predefined_item_id: selectedItem.id,
          boq_line_ids: item.boq_line_ids
            ? typeof item.boq_line_ids === "string"
              ? item.boq_line_ids.split(",").map(Number).filter(Boolean)
              : [item.boq_line_ids]
            : [],
        }),
      },
    );

    if (!updateRes.ok) {
      toast("Failed to replace material", "error");
      return;
    }

    // Insert QS replacement note into progress log
    const replacedRes = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "setQSReplaced",
          id: item.id,
          mr_header_id: item.mr_header_id,
          qs_replace_reason: replaceReason.trim() || null,
          qs_original_material_description: item.material_description,
          qs_original_category_name: item.material_category,
          qs_original_subcategory_name: item.material_subcategory,
          replacement_category_id: previewCategoryId,
          replacement_subcategory_id: previewSubcategoryId,
          replacement_item_code: selectedItem.item_code,
          replacement_description: previewDescription.trim(),
          changed_by: userInfo?.name || userInfo?.email || "QS",
        }),
      },
    );

    if (!replacedRes.ok) {
      toast("Material updated but failed to mark as replaced", "error");
      return;
    }

    toast(`Replaced with ${previewDescription}`, "success");
    setIsMainOpen(false);
    setReplaceReason("");
    await refresh();
  };

  // ── Open helpers ──────────────────────────────────────────────────────────
  const openPicker = () => {
    setReplaceReason("");
    setIsPickerOpen(true);
  };

  const openMainForm = () => {
    setSelectedItem(null);
    setReplaceReason("");
    setIsMainOpen(true);
  };

  return (
    <>
      {/* ── Trigger ── */}
      {renderTrigger ? (
        renderTrigger(openPicker)
      ) : (
        <Button
          componentType="button"
          onClick={openMainForm}
          bgColor="white"
          borderColor="rgba(207, 207, 207, 1)"
          textColor="black"
          style={{ borderRadius: "25px", padding: "7px 20px" }}
        >
          Replace Material Item
          <img
            src={rewindIcon}
            alt="replace"
            style={{ width: "16px", height: "16px" }}
          />
        </Button>
      )}

      {/* ── Picker (same UI as MultipleSelectMaterialItemButton, single-select) ── */}
      <MultipleSelectMaterialItemButton
        isOpen={isPickerOpen}
        setIsOpen={setIsPickerOpen}
        singleSelect={true}
        onSelectItems={handlePickerSelect}
        currentItemIDs={selectedItem ? [selectedItem.id] : []}
      />

      {/* ── Reason dialog — directSubmit=true only ── */}
      {isReasonOpen &&
        typeof window !== "undefined" &&
        createPortal(
          <FormPopUp
            header="REPLACE MATERIALS"
            setIsOpen={setIsReasonOpen}
            handleSubmit={handleDirectSubmit}
            addButtonLabel="CONFIRM"
          >
            <div style={{ marginBottom: "20px" }}>
              <small>REPLACEMENT MATERIALS</small>
              <h3 style={{ fontWeight: 600 }}>
                {selectedItem?.material_description}
              </h3>
            </div>
            <div className="input-row full">
              <InputItem
                label="REPLACE REASON"
                value={replaceReason}
                type="textarea"
                noOptionalLabel
                onChange={(e) =>
                  setReplaceReason(
                    (e as React.ChangeEvent<HTMLTextAreaElement>).target.value,
                  )
                }
              />
            </div>
          </FormPopUp>,
          document.body,
        )}

      {/* ── Main preview form — directSubmit=false ── */}
      {isMainOpen && (
        <FormPopUp
          header="REPLACE MATERIAL REQUEST ITEM"
          setIsOpen={setIsMainOpen}
          handleSubmit={handleMainConfirm}
          addButtonLabel="CONFIRM"
          style={{ minWidth: "95dvw", height: "95dvh" }}
        >
          {/* Require a material to be selected */}
          <input
            type="text"
            value={selectedItem ? String(selectedItem.id) : ""}
            required
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

          {/* Material picker trigger */}
          <div className="input-row full">
            <div className="input-item" style={{ width: "100%" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "10px",
                }}
              >
                <label className="custom" style={{ margin: 0 }}>
                  <span>REPLACEMENT MATERIAL</span>
                </label>
                <Button
                  componentType="button"
                  bgColor="black"
                  borderColor="black"
                  textColor="white"
                  full={!selectedItem}
                  onClick={(e) => {
                    e.preventDefault();
                    setIsPickerOpen(true);
                  }}
                  style={{ padding: "7px 20px" }}
                >
                  {selectedItem ? (
                    <>
                      EDIT
                      <img
                        src={pencilIcon}
                        alt="edit"
                        style={{ filter: "invert(1)", marginBottom: "2px" }}
                      />
                    </>
                  ) : (
                    <>
                      SELECT REPLACEMENT MATERIAL
                      <img
                        src={externalLinkIcon}
                        alt="select"
                        style={{ filter: "invert(1)", marginBottom: "2px" }}
                      />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Hidden validity guards */}
          {selectedItem && (
            <>
              <input
                type="text"
                required
                value={previewCategoryId > 0 ? String(previewCategoryId) : ""}
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
                  previewSubcategoryId > 0 ? String(previewSubcategoryId) : ""
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
                  previewQuantity && Number(previewQuantity) > 0
                    ? previewQuantity
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
                value={previewUnit ?? ""}
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
            </>
          )}

          {/* Preview table */}
          {selectedItem && (
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
                        selectedValue={previewCategoryId}
                        onChange={(val) => {
                          setPreviewCategoryId(Number(val));
                          setPreviewSubcategoryId(0);
                          refreshSubcategories(Number(val));
                        }}
                        placeholder="SELECT CATEGORY"
                        style={{ width: "250px" }}
                      />
                    </td>
                    <td>
                      <SingleSelectDropdown
                        label=""
                        noLabel
                        dbData={subcategoryValues}
                        selectedValue={previewSubcategoryId}
                        onChange={(val) => setPreviewSubcategoryId(Number(val))}
                        placeholder="SELECT SUBCATEGORY"
                        style={{ width: "250px" }}
                      />
                    </td>
                    <td>
                      <InputItem
                        label=""
                        value={previewDescription}
                        type="text"
                        placeholder="ITEM"
                        noOptionalLabel
                        style={{ width: "500px" }}
                        onChange={(e) => setPreviewDescription(e.target.value)}
                      />
                    </td>
                    <td>
                      <InputItem
                        label=""
                        value={previewQuantity}
                        type="text"
                        placeholder="QTY"
                        noOptionalLabel
                        style={{ width: "80px" }}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "" || /^\d*\.?\d*$/.test(val))
                            setPreviewQuantity(val);
                        }}
                      />
                    </td>
                    <td>
                      <SingleSelectDropdown
                        label=""
                        noLabel
                        selectOptions={[...UNIT_OPTIONS]}
                        selectedValue={previewUnit}
                        onChange={(val) => setPreviewUnit(String(val))}
                        placeholder="SELECT UNIT"
                        style={{ width: "120px" }}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
              <br />
            </div>
          )}

          {/* Brand */}
          <div className="input-row full">
            <InputItem
              label="BRAND"
              value={brand}
              type="text"
              onChange={(e) => setBrand(e.target.value)}
              placeholder="ENTER BRAND"
            />
          </div>

          {/* Specification */}
          <div className="input-row full">
            <InputItem
              label="SPECIFICATION / NOTES"
              value={specification}
              type="textarea"
              onChange={(e) => setSpecification(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="input-row full">
            <InputItem
              label="NOTES"
              value={notes}
              type="textarea"
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Replace reason */}
          <div className="input-row full">
            <InputItem
              label="REPLACE REASON"
              value={replaceReason}
              type="textarea"
              placeholder="ENTER REPLACE REASON"
              noOptionalLabel
              onChange={(e) =>
                setReplaceReason(
                  (e as React.ChangeEvent<HTMLTextAreaElement>).target.value,
                )
              }
            />
          </div>
        </FormPopUp>
      )}
    </>
  );
}
