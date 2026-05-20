"use client";

import SingleSelectBoqItemButton from "@/app/components/_SingleSelectBoqItemButton";
import MultipleSelectMaterialItemButton, {
  PredefinedItem,
} from "@/app/components/_MultipleSelectMaterialItemButton";
import CreateNewMaterialButton from "@/app/components/_CreateNewMaterialButton";
import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import { UNIT_OPTIONS, mapPredefinedUnit } from "@/constants/units";
import InputItem from "@/app/components/InputItem";
import SingleSelectDropdown from "@/app/components/SingleSelectDropdown";
import SingleUploadFileBox from "@/app/components/SingleUploadFileBox";
import { toast } from "@/app/components/Toast";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/app/context/AuthContext";

type SelectedMaterialRow = {
  predefinedItem: PredefinedItem;
  quantity: string;
  unit: string;
  unitWasNull: boolean;
  boqLineIDs: number[];
  // Per-row overrides (only used if explicitly set)
  descriptionOverride?: string;
  brandOverride?: string;
  specificationOverride?: string;
  deliveryLocationOverride?: string;
  categoryIdOverride?: number | string;
  subcategoryIdOverride?: number | string;
  categoryNameOverride?: string;
  subcategoryNameOverride?: string;
};

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
  style?: React.CSSProperties;
  stageName?: string;
};

export default function AddMrItemButton({
  mrHeaderID,
  projectID,
  bgColor = "rgba(239, 239, 239, 1)",
  textColor = "black",
  borderColor = "rgba(239, 239, 239, 1)",
  children,
  full,
  style,
  stageName,
}: AddMrItemButtonProps) {
  const router = useRouter();
  const crossSmallIcon = "/icons/cross-small.svg";
  const searchIcon = "/icons/search.svg";
  const arrowRight = "/icons/arrow-right.svg";
  const pencilIcon = "/icons/pencil.svg";

  const { userInfo } = useAuth();

  const [isOpen, setIsOpen] = useState(false);

  // Selected material items with qty/unit
  const [selectedRows, setSelectedRows] = useState<SelectedMaterialRow[]>([]);
  const [selectedItemIDs, setSelectedItemIDs] = useState<number[]>([]);

  // Preview filter states
  const [previewActiveCategory, setPreviewActiveCategory] =
    useState<string>("ALL");
  const [previewSearchQuery, setPreviewSearchQuery] = useState("");
  const previewScrollRef = useRef<HTMLDivElement>(null);
  const [previewShowLeftArrow, setPreviewShowLeftArrow] = useState(false);
  const [previewShowRightArrow, setPreviewShowRightArrow] = useState(false);

  // Per-row edit popup state
  const [editingRowId, setEditingRowId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<{
    description: string;
    brand: string;
    specification: string;
    deliveryLocation: string;
    categoryId: number | string;
    subcategoryId: number | string;
  } | null>(null);
  const [editCategoryValues, setEditCategoryValues] = useState<any[]>([]);
  const [editSubcategoryValues, setEditSubcategoryValues] = useState<any[]>([]);

  // Shared fields
  const [brand, setBrand] = useState("");
  const [specification, setSpecification] = useState("");
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [locationValues, setLocationValues] = useState<any[]>([]);

  // Fetch location values on mount
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/projects`, { method: "GET" })
      .then((res) => res.json())
      .then((data) => setLocationValues(data.map((item: any) => item.name)))
      .catch(console.error);
  }, []);

  // Handle new material created from CreateNewMaterialButton
  const handleNewMaterialCreated = (newItem: PredefinedItem) => {
    toast(`${newItem.material_description} created`, "success");
    const newRow: SelectedMaterialRow = {
      predefinedItem: newItem,
      quantity: "",
      unit: newItem.unit ? mapPredefinedUnit(newItem.unit) : "",
      unitWasNull: !newItem.unit,
      boqLineIDs: [],
    };
    setSelectedRows((prev) => [...prev, newRow]);
    setSelectedItemIDs((prev) => [...prev, newItem.id]);
  };

  // Preview category tabs scroll
  const checkPreviewScroll = () => {
    if (previewScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = previewScrollRef.current;
      setPreviewShowLeftArrow(scrollLeft > 0);
      setPreviewShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  const scrollPreview = (direction: "left" | "right") => {
    if (previewScrollRef.current) {
      previewScrollRef.current.scrollBy({
        left: direction === "left" ? -300 : 300,
        behavior: "smooth",
      });
    }
  };

  // Get preview categories from selected rows
  const previewCategories = [
    ...new Set(
      selectedRows.map(
        (r) => r.predefinedItem.category_name || "Uncategorized",
      ),
    ),
  ];

  // Filter selected rows for preview
  const filteredPreviewRows = selectedRows.filter((row) => {
    const matchesCategory =
      previewActiveCategory === "ALL" ||
      (row.predefinedItem.category_name || "Uncategorized") ===
        previewActiveCategory;

    const matchesSearch =
      !previewSearchQuery.trim() ||
      row.predefinedItem.material_description
        ?.toLowerCase()
        .includes(previewSearchQuery.toLowerCase()) ||
      row.predefinedItem.item_code
        ?.toLowerCase()
        .includes(previewSearchQuery.toLowerCase()) ||
      row.predefinedItem.brand
        ?.toLowerCase()
        .includes(previewSearchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  // Handle material items selection from popup
  const handleMaterialSelect = (items: PredefinedItem[]) => {
    const newIDs = items.map((i) => i.id);
    setSelectedItemIDs(newIDs);

    // Keep existing rows that are still selected, add new ones
    setSelectedRows((prev) => {
      const existingMap = new Map(prev.map((r) => [r.predefinedItem.id, r]));
      return items.map((item) => {
        if (existingMap.has(item.id)) {
          return existingMap.get(item.id)!;
        }
        return {
          predefinedItem: item,
          quantity: "",
          unit: item.unit ? mapPredefinedUnit(item.unit) : "",
          unitWasNull: !item.unit,
          boqLineIDs: [],
        };
      });
    });
  };

  // Update row quantity
  const updateRowQuantity = (index: number, val: string) => {
    if (val !== "" && !/^\d*\.?\d*$/.test(val)) return;
    setSelectedRows((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], quantity: val };
      return updated;
    });
  };

  // Update row unit
  const updateRowUnit = (index: number, val: string) => {
    setSelectedRows((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], unit: val };
      return updated;
    });
  };

  // Remove row
  const removeRow = (itemId: number) => {
    setSelectedRows((prev) => {
      const updated = prev.filter((r) => r.predefinedItem.id !== itemId);
      setSelectedItemIDs(updated.map((r) => r.predefinedItem.id));
      return updated;
    });
  };

  // Open the per-row edit popup — also fetches category/subcategory data
  const openRowEdit = (row: SelectedMaterialRow) => {
    setEditingRowId(row.predefinedItem.id);

    const initCategoryId =
      row.categoryIdOverride ?? row.predefinedItem.category_id ?? "";
    const initSubcategoryId =
      row.subcategoryIdOverride ?? row.predefinedItem.subcategory_id ?? "";

    setEditDraft({
      description:
        row.descriptionOverride ??
        row.predefinedItem.material_description ??
        "",
      brand: row.brandOverride ?? "",
      specification: row.specificationOverride ?? "",
      deliveryLocation: row.deliveryLocationOverride ?? "",
      categoryId: initCategoryId,
      subcategoryId: initSubcategoryId,
    });

    // Fetch categories
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMaterialCategoryValues`,
    )
      .then((res) => res.json())
      .then((data) => setEditCategoryValues(data))
      .catch(console.error);

    // Fetch subcategories filtered by initial category if present
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
        .then((data) => setEditSubcategoryValues(data))
        .catch(console.error);
    } else {
      fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMaterialSubCategoryValues`,
      )
        .then((res) => res.json())
        .then((data) => setEditSubcategoryValues(data))
        .catch(console.error);
    }
  };

  // When category changes in edit draft, refetch subcategories
  const handleEditCategoryChange = (val: string | number) => {
    setEditDraft((d) => (d ? { ...d, categoryId: val, subcategoryId: "" } : d));
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
        .then((data) => setEditSubcategoryValues(data))
        .catch(console.error);
    } else {
      fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMaterialSubCategoryValues`,
      )
        .then((res) => res.json())
        .then((data) => setEditSubcategoryValues(data))
        .catch(console.error);
    }
  };

  // Save edits back to the row
  const saveRowEdit = () => {
    if (editingRowId === null || !editDraft) return;

    // Resolve names from the loaded dropdown data
    const categoryName = editDraft.categoryId
      ? editCategoryValues.find((c) => c.id === editDraft.categoryId)?.value
      : undefined;
    const subcategoryName = editDraft.subcategoryId
      ? editSubcategoryValues.find((s) => s.id === editDraft.subcategoryId)
          ?.value
      : undefined;

    setSelectedRows((prev) =>
      prev.map((r) =>
        r.predefinedItem.id === editingRowId
          ? {
              ...r,
              descriptionOverride: editDraft.description,
              brandOverride: editDraft.brand,
              specificationOverride: editDraft.specification,
              deliveryLocationOverride: editDraft.deliveryLocation,
              categoryIdOverride: editDraft.categoryId || undefined,
              subcategoryIdOverride: editDraft.subcategoryId || undefined,
              categoryNameOverride: categoryName,
              subcategoryNameOverride: subcategoryName,
            }
          : r,
      ),
    );
    setEditingRowId(null);
    setEditDraft(null);
  };

  // Update per-row BOQ line IDs
  const updateRowBoqLineIDs = (itemId: number, ids: number[]) => {
    setSelectedRows((prev) =>
      prev.map((r) =>
        r.predefinedItem.id === itemId ? { ...r, boqLineIDs: ids } : r,
      ),
    );
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (selectedRows.length === 0) {
      toast("Please select at least one material item", "error");
      return;
    }

    for (const row of selectedRows) {
      if (!row.quantity || Number(row.quantity) <= 0) {
        toast(
          `Please enter a quantity for ${row.predefinedItem.material_description}`,
          "error",
        );
        return;
      }
      if (!row.unit) {
        toast(
          `Please select a unit for ${row.predefinedItem.material_description}`,
          "error",
        );
        return;
      }
    }

    for (const row of selectedRows) {
      if (!row.boqLineIDs || row.boqLineIDs.length === 0) {
        toast(
          `BOQ reference is required for "${row.descriptionOverride?.trim() || row.predefinedItem.material_description}". Please add a BOQ reference before confirming.`,
          "error",
        );
        return;
      }
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

      for (const row of selectedRows) {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "createMrLine",
            mr_header_id: mrHeaderID,
            changed_by: userInfo?.name || null,
            stage_name: stageName || "INITIAL APPROVAL",
            material_category_id:
              row.categoryIdOverride ?? row.predefinedItem.category_id,
            material_subcategory_ids: [
              row.subcategoryIdOverride ?? row.predefinedItem.subcategory_id,
            ],
            material_description:
              row.descriptionOverride?.trim() ||
              row.predefinedItem.material_description,
            quantity: Number(row.quantity),
            unit: row.unit,
            notes: null,
            brand:
              row.brandOverride !== undefined
                ? row.brandOverride || null
                : brand || null,
            specification:
              row.specificationOverride !== undefined
                ? row.specificationOverride || null
                : specification || null,
            delivery_location:
              row.deliveryLocationOverride !== undefined &&
              row.deliveryLocationOverride !== ""
                ? row.deliveryLocationOverride
                : deliveryLocation,
            boq_line_ids: row.boqLineIDs,
            attachment: attachmentUrl ? JSON.stringify(attachmentUrl) : null,
          }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          toast(
            errorData.error ||
              `Failed to add ${row.predefinedItem.material_description}`,
            "error",
          );
          return;
        }

        // Save unit back if it was null
        if (row.unitWasNull && row.unit) {
          await fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getPredefinedItems`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: row.predefinedItem.id,
                unit: row.unit,
              }),
            },
          );
        }
      }

      toast(
        `${selectedRows.length} item${selectedRows.length !== 1 ? "s" : ""} added`,
        "success",
      );

      setIsOpen(false);
      setSelectedRows([]);
      setSelectedItemIDs([]);
      setBrand("");
      setSpecification("");
      setDeliveryLocation("");
      setAttachment(null);
      setPreviewActiveCategory("ALL");
      setPreviewSearchQuery("");

      router.refresh();
    } catch (error) {
      console.error("Submit error:", error);
      toast("Failed to add material request items", "error");
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
          header={"CREATE MATERIAL REQUEST ITEM(S)"}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"CONFIRM"}
          style={{ width: "75dvw", height: "95dvh" }}
        >
          {/* Material Items Selection */}
          <div className="input-row full">
            <div className="input-item" style={{ width: "100%" }}>
              {selectedRows.length > 0 ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    justifyContent: "space-between",
                  }}
                >
                  <label className="custom" style={{ margin: 0 }}>
                    <span>MATERIAL(S)</span>
                  </label>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    {/* {(userInfo?.departmentID === 16 ||
                      userInfo?.departmentID === 8) && (
                      <CreateNewMaterialButton
                        onSuccess={handleNewMaterialCreated}
                      />
                    )} */}

                    <MultipleSelectMaterialItemButton
                      onSelectItems={handleMaterialSelect}
                      currentItemIDs={selectedItemIDs}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <label className="custom">
                    <span>MATERIAL(S)</span>
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

          {/* Preview section with category tabs + search */}
          {selectedRows.length > 0 && (
            <>
              <div className="input-row full">
                <div style={{ width: "100%" }}>
                  {/* Category grid + search for preview */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "15px",
                      marginBottom: "15px",
                    }}
                  >
                    {/* Category tabs */}
                    <div
                      className="category-grid"
                      style={{ flex: 1, marginBottom: 0 }}
                    >
                      <div
                        style={{
                          position: "relative",
                          flex: 1,
                        }}
                      >
                        {previewShowLeftArrow && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              scrollPreview("left");
                            }}
                            style={{
                              position: "absolute",
                              left: "5px",
                              top: "50%",
                              transform: "translateY(-50%)",
                              zIndex: 10,
                              backgroundColor: "black",
                              color: "white",
                              border: "none",
                              borderRadius: "8px",
                              width: "30px",
                              height: "30px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                            }}
                          >
                            <img
                              src={arrowRight}
                              style={{
                                transform: "rotate(-180deg)",
                                width: "10px",
                              }}
                              alt="scroll left"
                            />
                          </button>
                        )}

                        <div
                          ref={previewScrollRef}
                          onScroll={checkPreviewScroll}
                          style={{
                            overflowX: "auto",
                            scrollbarWidth: "none",
                            msOverflowStyle: "none",
                          }}
                        >
                          <div style={{ display: "flex", gap: "1px" }}>
                            <div
                              className={`item ${previewActiveCategory === "ALL" ? "active" : ""}`}
                              onClick={() => setPreviewActiveCategory("ALL")}
                              style={{ flexShrink: 0, cursor: "pointer" }}
                            >
                              ALL
                            </div>
                            {previewCategories.map((cat) => (
                              <div
                                key={cat}
                                className={`item ${previewActiveCategory === cat ? "active" : ""}`}
                                onClick={() => setPreviewActiveCategory(cat)}
                                style={{
                                  flexShrink: 0,
                                  cursor: "pointer",
                                  textTransform: "capitalize",
                                }}
                              >
                                {cat.toUpperCase()}
                              </div>
                            ))}
                          </div>
                        </div>

                        {previewShowRightArrow && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              scrollPreview("right");
                            }}
                            style={{
                              position: "absolute",
                              right: "5px",
                              top: "50%",
                              transform: "translateY(-50%)",
                              zIndex: 10,
                              backgroundColor: "black",
                              color: "white",
                              border: "none",
                              borderRadius: "8px",
                              width: "30px",
                              height: "30px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                            }}
                          >
                            <img
                              src={arrowRight}
                              style={{ width: "10px" }}
                              alt="scroll right"
                            />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Search bar for preview */}
                    <div
                      style={{
                        position: "relative",
                        flex: "0 0 350px",
                      }}
                    >
                      <input
                        type="text"
                        placeholder="SEARCH"
                        value={previewSearchQuery}
                        onChange={(e) => setPreviewSearchQuery(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "7px 40px 7px 15px",
                          borderRadius: "8px",
                          border: "1px solid rgba(223, 223, 223, 1)",
                        }}
                      />
                      <img
                        src={searchIcon}
                        alt="search"
                        style={{
                          position: "absolute",
                          right: "10px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          width: "16px",
                          height: "16px",
                          opacity: 0.5,
                        }}
                      />
                    </div>
                  </div>

                  {/* Preview Table */}
                  <table
                    className="items-table two-toned"
                    style={{ width: "100%" }}
                  >
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>CATEGORY</th>
                        <th>SUBCATEGORY</th>
                        <th>ITEM</th>
                        <th>QTY</th>
                        <th>UNIT</th>
                        <th>BOQ REF.</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPreviewRows.map((row) => {
                        // Find the original index in selectedRows for updating
                        const originalIndex = selectedRows.findIndex(
                          (r) => r.predefinedItem.id === row.predefinedItem.id,
                        );
                        return (
                          <tr key={row.predefinedItem.id}>
                            <td>
                              {selectedRows.findIndex(
                                (r) =>
                                  r.predefinedItem.id === row.predefinedItem.id,
                              ) + 1}
                            </td>
                            <td>
                              {row.categoryNameOverride ||
                                row.predefinedItem.category_name ||
                                "-"}
                            </td>
                            <td>
                              {row.subcategoryNameOverride ||
                                row.predefinedItem.subcategory_name ||
                                "-"}
                            </td>
                            <td>
                              {row.descriptionOverride?.trim() ||
                                row.predefinedItem.material_description}
                            </td>
                            <td>
                              <InputItem
                                label=""
                                value={row.quantity}
                                type="text"
                                placeholder="ENTER QTY"
                                noOptionalLabel
                                onChange={(e) =>
                                  updateRowQuantity(
                                    originalIndex,
                                    e.target.value,
                                  )
                                }
                                style={{
                                  width: "150px",
                                  backgroundColor: "white",
                                }}
                                required
                              />
                            </td>
                            <td>
                              <SingleSelectDropdown
                                label=""
                                noLabel
                                selectOptions={[...UNIT_OPTIONS]}
                                selectedValue={row.unit}
                                onChange={(val) =>
                                  updateRowUnit(originalIndex, String(val))
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
                                  onSelectBoq={(ids) =>
                                    updateRowBoqLineIDs(
                                      row.predefinedItem.id,
                                      ids,
                                    )
                                  }
                                  currentBoqLineIDs={row.boqLineIDs}
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
                            <td>
                              <div
                                style={{
                                  display: "flex",
                                  gap: "10px",
                                  alignItems: "center",
                                }}
                              >
                                <Button
                                  componentType={"button"}
                                  bgColor={"transparent"}
                                  borderColor={"transparent"}
                                  textColor={"black"}
                                  style={{
                                    padding: "0px",
                                    marginBottom: "2px",
                                  }}
                                >
                                  <img
                                    src={crossSmallIcon}
                                    alt="remove"
                                    onClick={() =>
                                      removeRow(row.predefinedItem.id)
                                    }
                                  />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {filteredPreviewRows.length === 0 && previewSearchQuery && (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "20px",
                        color: "rgba(128, 128, 128, 1)",
                        fontSize: "13px",
                      }}
                    >
                      No items found for &quot;{previewSearchQuery}&quot;
                    </div>
                  )}
                </div>
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
            />
          </div>
        </FormPopUp>
      )}

      {/* Per-row edit popup — sibling to main FormPopUp to avoid nested <form> */}
      {editingRowId !== null && editDraft && (
        <FormPopUp
          header={"UPDATE MATERIAL REQUEST ITEM DETAILS"}
          setIsOpen={() => {
            setEditingRowId(null);
            setEditDraft(null);
          }}
          handleSubmit={(e) => {
            e.preventDefault();
            saveRowEdit();
          }}
          addButtonLabel={"CONFIRM"}
        >
          <div className="input-row half">
            <SingleSelectDropdown
              label={"CATEGORY"}
              dbData={editCategoryValues}
              selectedValue={editDraft.categoryId}
              onChange={handleEditCategoryChange}
              placeholder="SELECT CATEGORY"
              required
            />

            <SingleSelectDropdown
              label={"SUBCATEGORY"}
              dbData={editSubcategoryValues}
              selectedValue={editDraft.subcategoryId}
              onChange={(val) =>
                setEditDraft((d) => (d ? { ...d, subcategoryId: val } : d))
              }
              placeholder="SELECT SUBCATEGORY"
              required
            />
          </div>

          <div className="input-row full">
            <InputItem
              label={"ITEM"}
              value={editDraft.description}
              type={"textarea"}
              onChange={(e) =>
                setEditDraft((d) =>
                  d ? { ...d, description: e.target.value } : d,
                )
              }
              required
            />
          </div>
        </FormPopUp>
      )}
    </>
  );
}
