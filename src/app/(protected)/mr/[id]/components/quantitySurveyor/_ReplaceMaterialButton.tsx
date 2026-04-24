"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "@/app/components/Toast";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import Button from "@/app/components/Button";
import SingleSelectDropdown from "@/app/components/SingleSelectDropdown";
import CreateNewMaterialButton from "@/app/components/_CreateNewMaterialButton";
import { UNIT_OPTIONS, mapPredefinedUnit } from "@/constants/units";
import { MrLine } from "../../types/mrLine";
import { useAuth } from "@/app/context/AuthContext";

type PredefinedItem = {
  id: number;
  item_code: string;
  category_id: number;
  subcategory_id: number;
  material_description: string;
  brand: string | null;
  unit: string | null;
  category_name: string;
  subcategory_name: string;
};

type GroupedItems = {
  [category: string]: {
    [subCategory: string]: PredefinedItem[];
  };
};

type Props = {
  item: MrLine;
  /** Render a custom trigger button instead of the default one */
  renderTrigger?: (openPicker: () => void) => React.ReactNode;
  /** When true, picker confirmation submits directly (no intermediate form) */
  directSubmit?: boolean;
};

const ITEMS_PER_PAGE = 50;

export default function ReplaceMaterialButton({
  item,
  renderTrigger,
  directSubmit = false,
}: Props) {
  const router = useRouter();
  const { userInfo } = useAuth();

  const arrowRight = "/icons/arrow-right.svg";
  const searchIcon = "/icons/search.svg";
  const filterIcon = "/icons/filter.svg";
  const pencilIcon = "/icons/pencil.svg";
  const externalLinkIcon = "/icons/external-link.svg";
  const rewindIcon = "/icons/rewind-two-arrows.svg";

  // Main popup state
  const [isMainOpen, setIsMainOpen] = useState(false);
  const [brand, setBrand] = useState(item.brand ?? "");
  const [specification, setSpecification] = useState(item.specification ?? "");
  const [notes, setNotes] = useState(item.notes ?? "");

  // Selected item + editable preview fields
  const [selectedItem, setSelectedItem] = useState<PredefinedItem | null>(null);
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

  // Replace reason
  const [replaceReason, setReplaceReason] = useState("");

  // Picker popup state
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [allItems, setAllItems] = useState<PredefinedItem[]>([]);
  const [groupedItems, setGroupedItems] = useState<GroupedItems>({});
  const [filteredGroupedItems, setFilteredGroupedItems] =
    useState<GroupedItems>({});
  const [tempSelected, setTempSelected] = useState<PredefinedItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter state
  const [filterCategories, setFilterCategories] = useState<Set<string>>(
    new Set(),
  );
  const [filterSubCategories, setFilterSubCategories] = useState<Set<string>>(
    new Set(),
  );
  const [showFilterPopup, setShowFilterPopup] = useState(false);
  const [tempFilterCategories, setTempFilterCategories] = useState<Set<string>>(
    new Set(),
  );
  const [tempFilterSubCategories, setTempFilterSubCategories] = useState<
    Set<string>
  >(new Set());
  const [categorySearchQuery, setCategorySearchQuery] = useState("");
  const [subCategorySearchQuery, setSubCategorySearchQuery] = useState("");

  // Collapsible
  const [collapsedCategories, setCollapsedCategories] = useState<
    Record<string, boolean>
  >({});
  const [collapsedSubCategories, setCollapsedSubCategories] = useState<
    Record<string, boolean>
  >({});

  // Category tabs
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  const allCategoryNames = Object.keys(groupedItems);
  const categories = Object.keys(filteredGroupedItems);

  const hasActiveFilters =
    filterCategories.size > 0 || filterSubCategories.size > 0;

  // ── Fetch predefined items when picker opens ──────────────────────────
  useEffect(() => {
    if (!isPickerOpen) return;

    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getPredefinedItems`)
      .then((res) => res.json())
      .then((data: PredefinedItem[]) => {
        if (!Array.isArray(data)) return;
        setAllItems(data);
        const grouped: GroupedItems = {};
        data.forEach((pi) => {
          const cat = pi.category_name || "Uncategorized";
          const sub = pi.subcategory_name || "General";
          if (!grouped[cat]) grouped[cat] = {};
          if (!grouped[cat][sub]) grouped[cat][sub] = [];
          grouped[cat][sub].push(pi);
        });
        setGroupedItems(grouped);
        setFilteredGroupedItems(grouped);
      })
      .catch(console.error);
  }, [isPickerOpen]);

  // ── Fetch categories when main form opens ────────────────────────────
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

  const handleNewMaterialCreated = (newItem: PredefinedItem) => {
    setAllItems((prev) => [...prev, newItem]);
    const cat = newItem.category_name || "Uncategorized";
    const sub = newItem.subcategory_name || "General";
    const addToGroup = (prev: GroupedItems): GroupedItems => {
      const updated = { ...prev };
      if (!updated[cat]) updated[cat] = {};
      if (!updated[cat][sub]) updated[cat][sub] = [];
      updated[cat][sub] = [...updated[cat][sub], newItem];
      return updated;
    };
    setGroupedItems(addToGroup);
    setFilteredGroupedItems(addToGroup);
    setTempSelected(newItem);
  };

  // ── Filter effect ─────────────────────────────────────────────────────
  useEffect(() => {
    const hasSearch = searchQuery.trim().length > 0;
    const hasCatFilter = filterCategories.size > 0;
    const hasSubFilter = filterSubCategories.size > 0;

    if (!hasSearch && !hasCatFilter && !hasSubFilter) {
      setFilteredGroupedItems(groupedItems);
      setCurrentPage(1);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered: GroupedItems = {};

    Object.entries(groupedItems).forEach(([cat, subCats]) => {
      if (hasCatFilter && !filterCategories.has(cat)) return;
      Object.entries(subCats).forEach(([sub, items]) => {
        if (hasSubFilter && !filterSubCategories.has(sub)) return;
        const filteredItems = hasSearch
          ? items.filter(
              (i) =>
                i.material_description?.toLowerCase().includes(query) ||
                i.item_code?.toLowerCase().includes(query) ||
                i.brand?.toLowerCase().includes(query) ||
                cat.toLowerCase().includes(query) ||
                sub.toLowerCase().includes(query),
            )
          : items;
        if (filteredItems.length > 0) {
          if (!filtered[cat]) filtered[cat] = {};
          filtered[cat][sub] = filteredItems;
        }
      });
    });

    setFilteredGroupedItems(filtered);
    setCurrentPage(1);
  }, [searchQuery, groupedItems, filterCategories, filterSubCategories]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory]);

  // ── Category tab scroll ───────────────────────────────────────────────
  const checkScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setShowLeftArrow(scrollLeft > 0);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1);
  };

  const scroll = (dir: "left" | "right") => {
    scrollContainerRef.current?.scrollBy({
      left: dir === "left" ? -300 : 300,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [categories]);

  // ── Pagination ────────────────────────────────────────────────────────
  const flatItems = (() => {
    const items: PredefinedItem[] = [];
    const source =
      activeCategory === "ALL"
        ? filteredGroupedItems
        : { [activeCategory]: filteredGroupedItems[activeCategory] || {} };
    Object.values(source).forEach((subCats) =>
      Object.values(subCats).forEach((arr) => items.push(...arr)),
    );
    return items;
  })();

  const totalPages = Math.ceil(flatItems.length / ITEMS_PER_PAGE);
  const paginatedItems = flatItems.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const paginatedGrouped = (() => {
    const grouped: GroupedItems = {};
    paginatedItems.forEach((pi) => {
      const cat = pi.category_name || "Uncategorized";
      const sub = pi.subcategory_name || "General";
      if (!grouped[cat]) grouped[cat] = {};
      if (!grouped[cat][sub]) grouped[cat][sub] = [];
      grouped[cat][sub].push(pi);
    });
    return grouped;
  })();

  const getPageNumbers = (): (number | string)[] => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (currentPage <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i);
      pages.push("...");
      pages.push(totalPages);
    } else if (currentPage >= totalPages - 3) {
      pages.push(1);
      pages.push("...");
      for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      pages.push("...");
      for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
      pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  // ── Filter helpers ────────────────────────────────────────────────────
  const getAvailableSubCategories = (
    catSet: Set<string> = tempFilterCategories,
  ): string[] => {
    const subs = new Set<string>();
    Object.entries(groupedItems).forEach(([cat, subCats]) => {
      if (catSet.size > 0 && !catSet.has(cat)) return;
      Object.keys(subCats).forEach((sub) => subs.add(sub));
    });
    return Array.from(subs).sort();
  };

  const getCategoryForSub = (sub: string): string | null => {
    for (const [cat, subCats] of Object.entries(groupedItems)) {
      if (sub in subCats) return cat;
    }
    return null;
  };

  const toggleFilterCategory = (cat: string) => {
    setTempFilterCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
        const subsToRemove = Object.keys(groupedItems[cat] || {});
        setTempFilterSubCategories((ps) => {
          const ns = new Set(ps);
          subsToRemove.forEach((s) => ns.delete(s));
          return ns;
        });
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  const toggleFilterSubCategory = (sub: string) => {
    setTempFilterSubCategories((prev) => {
      const next = new Set(prev);
      if (next.has(sub)) {
        next.delete(sub);
      } else {
        next.add(sub);
        const parentCat = getCategoryForSub(sub);
        if (parentCat)
          setTempFilterCategories((pc) => new Set([...pc, parentCat]));
      }
      return next;
    });
  };

  // ── Picker confirm ────────────────────────────────────────────────────
  async function handlePickerConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (!tempSelected) return;

    if (!replaceReason) {
      toast("Please enter a reason for replacing material", "error");
      return;
    }

    if (directSubmit) {
      // Skip the main form — submit directly using existing item values
      const mappedUnit = tempSelected.unit
        ? mapPredefinedUnit(tempSelected.unit)
        : (item.unit ?? "");

      const updateRes = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "updateAll",
            id: item.id,
            material_category_id: tempSelected.category_id,
            material_subcategory_id: [tempSelected.subcategory_id],
            material_description: tempSelected.material_description,
            quantity: Number(item.quantity),
            unit: mappedUnit || item.unit || "",
            notes: item.notes || null,
            specification: item.specification || null,
            brand: item.brand || null,
            delivery_location: item.delivery_location,
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
        setIsPickerOpen(false);
        return;
      }

      // Mark the line as replaced (stores reason + original description in db,
      // and inserts a QS replacement note into the progress log)
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "setQSReplaced",
          id: item.id,
          mr_header_id: item.mr_header_id,
          qs_replace_reason: replaceReason.trim() || null,
          qs_original_material_description: item.material_description,
          changed_by: userInfo?.name || userInfo?.email || "QS",
        }),
      });

      toast(`Replaced with ${tempSelected.material_description}`, "success");
      setIsPickerOpen(false);
      setReplaceReason("");
      router.refresh();
      return;
    }

    // Normal flow: populate main form and show it
    setSelectedItem(tempSelected);
    setPreviewDescription(tempSelected.material_description);
    setPreviewCategoryId(tempSelected.category_id);
    setPreviewSubcategoryId(tempSelected.subcategory_id);
    const mappedUnit = tempSelected.unit
      ? mapPredefinedUnit(tempSelected.unit)
      : "";
    setPreviewUnit(mappedUnit);
    refreshSubcategories(tempSelected.category_id);
    setIsPickerOpen(false);
    setIsMainOpen(true);
  }

  // ── Main confirm ──────────────────────────────────────────────────────
  async function handleMainConfirm(e: React.FormEvent) {
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

    // Mark as replaced (stores reason + original description, inserts timeline note)
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
    router.refresh();
  }

  // ── Render picker items table ─────────────────────────────────────────
  const renderItemsTable = (items: PredefinedItem[]) => (
    <>
      <table className="items-table two-toned">
        <thead>
          <tr>
            <th></th>
            <th>CODE</th>
            <th>ITEM</th>
            <th>UNIT</th>
          </tr>
        </thead>
        <tbody>
          {items.map((pi) => (
            <tr
              key={pi.id}
              style={{ cursor: "pointer" }}
              onClick={() => setTempSelected(pi)}
            >
              <td onClick={(e) => e.stopPropagation()}>
                <input
                  type="radio"
                  name="replace-material-select"
                  checked={tempSelected?.id === pi.id}
                  onChange={() => setTempSelected(pi)}
                  style={{
                    width: "18px",
                    height: "18px",
                    cursor: "pointer",
                    accentColor: "rgba(0, 163, 93, 1)",
                  }}
                />
              </td>
              <td style={{ whiteSpace: "nowrap" }}>{pi.item_code || "-"}</td>
              <td>{pi.material_description}</td>
              <td>{pi.unit || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <br />
      <br />
    </>
  );

  const renderSubCategoryHeader = (
    category: string,
    subCategory: string,
    label: string,
    itemCount: number,
  ) => {
    const subKey = `${category}::${subCategory}`;
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: collapsedSubCategories[subKey] ? "0px" : "10px",
          cursor: "pointer",
          userSelect: "none",
        }}
        onClick={() =>
          setCollapsedSubCategories((prev) => ({
            ...prev,
            [subKey]: !prev[subKey],
          }))
        }
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 14 14"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            transition: "transform 0.2s ease",
            transform: collapsedSubCategories[subKey]
              ? "rotate(-90deg)"
              : "rotate(0deg)",
          }}
        >
          <path
            d="M3.5 5.25L7 8.75L10.5 5.25"
            stroke="black"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span
          style={{
            fontWeight: 600,
            fontSize: "14px",
            textTransform: "uppercase",
          }}
        >
          {label.toUpperCase()}
        </span>
        <div
          style={{
            backgroundColor: "rgba(239, 239, 239, 1)",
            borderRadius: "50px",
            padding: "2px 8px",
            fontWeight: "600",
            fontSize: "11px",
            color: "rgba(100, 100, 100, 1)",
          }}
        >
          {itemCount} Items
        </div>
      </div>
    );
  };

  // ── Picker modal ──────────────────────────────────────────────────────
  const pickerModal = isPickerOpen && (
    <FormPopUp
      header="SELECT REPLACEMENT MATERIAL"
      setIsOpen={setIsPickerOpen}
      handleSubmit={handlePickerConfirm}
      addButtonLabel="CONFIRM"
      style={{ width: "75dvw", height: "95dvh" }}
    >
      {/* Hidden input to drive form validity */}
      <input
        type="text"
        value={tempSelected ? String(tempSelected.id) : ""}
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

      {/* Search */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div
          style={{
            position: "relative",
            flex: 1,
            maxWidth: "400px",
            backgroundColor: "white",
          }}
        >
          <input
            type="text"
            placeholder="SEARCH"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "400px",
              padding: "8px 40px 8px 15px",
              borderRadius: "8px",
              border: "1px solid rgba(223, 223, 223, 1)",
            }}
          />
          <img
            src={searchIcon}
            alt="search"
            style={{
              position: "absolute",
              right: "15px",
              top: "50%",
              transform: "translateY(-50%)",
              width: "16px",
              height: "16px",
              opacity: 0.5,
            }}
          />
        </div>
        <CreateNewMaterialButton
          onSuccess={handleNewMaterialCreated}
          style={{ padding: "7px 20px" }}
        />
      </div>

      <br />

      {/* Filter button + active filter bubbles */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <Button
          componentType="button"
          bgColor="white"
          borderColor="rgba(223, 223, 223, 1)"
          textColor="black"
          onClick={(e) => {
            e.preventDefault();
            setTempFilterCategories(new Set(filterCategories));
            setTempFilterSubCategories(new Set(filterSubCategories));
            setCategorySearchQuery("");
            setSubCategorySearchQuery("");
            setShowFilterPopup(true);
          }}
          style={{ padding: "7px 20px", borderRadius: "25px" }}
        >
          <img src={filterIcon} alt="filter" />
          FILTER
        </Button>

        {hasActiveFilters && (
          <div
            style={{
              display: "flex",
              gap: "10px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            {filterCategories.size > 0 && (
              <Button
                componentType="none"
                bgColor="rgba(239, 239, 239, 1)"
                borderColor="transparent"
                textColor="black"
                style={{
                  borderRadius: "25px",
                  fontWeight: "600",
                  textWrap: "nowrap",
                }}
              >
                CATEGORY:{" "}
                <span style={{ color: "rgba(1, 139, 80, 1)" }}>
                  {Array.from(filterCategories)[0].toUpperCase()}
                  {filterCategories.size > 1 &&
                    `, +${filterCategories.size - 1} MORE`}
                </span>
              </Button>
            )}
            {filterSubCategories.size > 0 && (
              <Button
                componentType="none"
                bgColor="rgba(239, 239, 239, 1)"
                borderColor="transparent"
                textColor="black"
                style={{
                  borderRadius: "25px",
                  fontWeight: "600",
                  textWrap: "nowrap",
                }}
              >
                SUBCATEGORY:{" "}
                <span style={{ color: "rgba(1, 139, 80, 1)" }}>
                  {Array.from(filterSubCategories)[0].toUpperCase()}
                  {filterSubCategories.size > 1 &&
                    `, +${filterSubCategories.size - 1} MORE`}
                </span>
              </Button>
            )}
            <Button
              componentType="button"
              bgColor="transparent"
              borderColor="transparent"
              textColor="black"
              onClick={() => {
                setFilterCategories(new Set());
                setFilterSubCategories(new Set());
              }}
              style={{ padding: "0px" }}
            >
              RESET FILTER
            </Button>
          </div>
        )}
      </div>

      <br />
      <br />

      {/* Currently selected pill */}
      {tempSelected && (
        <>
          <h3>SELECTED:</h3>
          <br />
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <Button
              componentType="none"
              bgColor="rgba(239, 239, 239, 1)"
              borderColor="transparent"
              textColor="black"
              style={{
                borderRadius: "25px",
                fontWeight: "600",
                textWrap: "nowrap",
              }}
            >
              {tempSelected.material_description}
            </Button>
          </div>
          <br />
          <br />
        </>
      )}

      {/* Replace reason */}
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

      <br />

      {/* No results */}
      {searchQuery.trim() && categories.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "40px",
            color: "rgba(128, 128, 128, 1)",
          }}
        >
          <p>No results found for &quot;{searchQuery}&quot;</p>
        </div>
      )}

      {/* Items grouped by category > subcategory */}
      <div style={{ overflowY: "auto" }}>
        {activeCategory === "ALL"
          ? Object.entries(paginatedGrouped).map(
              ([category, subCatsData], categoryIndex) => (
                <div key={category} style={{ marginBottom: "30px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "15px",
                      marginBottom: collapsedCategories[category]
                        ? "0px"
                        : "15px",
                      padding: "10px 0",
                      borderBottom: "2px solid rgba(0, 0, 0, 0.1)",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                    onClick={() =>
                      setCollapsedCategories((prev) => ({
                        ...prev,
                        [category]: !prev[category],
                      }))
                    }
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      style={{
                        transition: "transform 0.2s ease",
                        transform: collapsedCategories[category]
                          ? "rotate(-90deg)"
                          : "rotate(0deg)",
                      }}
                    >
                      <path
                        d="M3.5 5.25L7 8.75L10.5 5.25"
                        stroke="black"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <h2
                      style={{
                        margin: 0,
                        fontSize: "18px",
                        textTransform: "capitalize",
                      }}
                    >
                      {categoryIndex + 1}. {category.toUpperCase()}
                    </h2>
                    <div
                      style={{
                        backgroundColor: "black",
                        color: "white",
                        borderRadius: "50px",
                        padding: "3px 8px",
                        fontWeight: "600",
                        fontSize: "12px",
                      }}
                    >
                      {Object.values(subCatsData).reduce(
                        (sum, arr) => sum + arr.length,
                        0,
                      )}{" "}
                      Items
                    </div>
                  </div>

                  {!collapsedCategories[category] &&
                    Object.entries(subCatsData).map(
                      ([subCategory, items], subIndex) => (
                        <div
                          key={`${category}-${subCategory}`}
                          style={{ marginBottom: "20px", marginLeft: "20px" }}
                        >
                          {renderSubCategoryHeader(
                            category,
                            subCategory,
                            `${categoryIndex + 1}.${subIndex + 1} ${subCategory}`,
                            items.length,
                          )}
                          {!collapsedSubCategories[
                            `${category}::${subCategory}`
                          ] && renderItemsTable(items)}
                        </div>
                      ),
                    )}
                </div>
              ),
            )
          : Object.entries(paginatedGrouped).map(
              ([category, subCatsData], catIdx) =>
                Object.entries(subCatsData).map(
                  ([subCategory, items], subIdx) => (
                    <div
                      key={`${category}-${subCategory}`}
                      style={{ marginBottom: "30px" }}
                    >
                      {renderSubCategoryHeader(
                        category,
                        subCategory,
                        `${categories.indexOf(activeCategory) + 1}.${subIdx + 1} ${subCategory}`,
                        items.length,
                      )}
                      {!collapsedSubCategories[`${category}::${subCategory}`] &&
                        renderItemsTable(items)}
                    </div>
                  ),
                ),
            )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "8px",
            marginTop: "15px",
          }}
        >
          {getPageNumbers().map((page, index) => (
            <button
              key={index}
              type="button"
              onClick={() => typeof page === "number" && setCurrentPage(page)}
              disabled={page === "..."}
              style={{
                padding: "6px 10px",
                borderRadius: "5px",
                border: "1px solid rgba(223, 223, 223, 1)",
                backgroundColor:
                  page === currentPage
                    ? "black"
                    : page === "..."
                      ? "transparent"
                      : "white",
                color: page === currentPage ? "white" : "black",
                cursor: page === "..." ? "default" : "pointer",
                fontWeight: "600",
                minWidth: "36px",
                fontSize: "13px",
              }}
            >
              {page}
            </button>
          ))}
        </div>
      )}
    </FormPopUp>
  );

  // ── Filter popup ──────────────────────────────────────────────────────
  const filterModal = showFilterPopup && (
    <FormPopUp
      header="FILTER MATERIAL ITEMS"
      setIsOpen={setShowFilterPopup}
      handleSubmit={(e) => {
        e.preventDefault();
        setFilterCategories(new Set(tempFilterCategories));
        setFilterSubCategories(new Set(tempFilterSubCategories));
        setShowFilterPopup(false);
      }}
      addButtonLabel="CONFIRM"
      style={{ height: "95dvh" }}
      secondButton={
        <Button
          componentType="button"
          bgColor="white"
          borderColor="black"
          textColor="black"
          onClick={() => {
            setTempFilterCategories(new Set());
            setTempFilterSubCategories(new Set());
          }}
        >
          RESET
        </Button>
      }
    >
      {/* Categories */}
      <div style={{ marginBottom: "30px" }}>
        <h3
          style={{ marginBottom: "15px", fontSize: "14px", fontWeight: "600" }}
        >
          CATEGORY
        </h3>
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            padding: "10px",
          }}
        >
          <div style={{ position: "relative", marginBottom: "15px" }}>
            <input
              type="text"
              placeholder="SEARCH"
              value={categorySearchQuery}
              onChange={(e) => setCategorySearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 40px 10px 15px",
                borderRadius: "8px",
                border: "1px solid rgba(223, 223, 223, 1)",
                fontSize: "14px",
                backgroundColor: "rgba(245, 245, 245, 1)",
              }}
            />
            <img
              src={searchIcon}
              alt="search"
              style={{
                position: "absolute",
                right: "15px",
                top: "50%",
                transform: "translateY(-50%)",
                width: "16px",
                height: "16px",
                opacity: 0.5,
              }}
            />
          </div>
          <div style={{ maxHeight: "250px", overflowY: "auto" }}>
            {allCategoryNames
              .filter((c) =>
                c.toLowerCase().includes(categorySearchQuery.toLowerCase()),
              )
              .map((cat) => (
                <div key={cat} style={{ marginBottom: "10px" }}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={tempFilterCategories.has(cat)}
                      onChange={() => toggleFilterCategory(cat)}
                      style={{
                        width: "18px",
                        height: "18px",
                        cursor: "pointer",
                        accentColor: "#10b981",
                      }}
                    />
                    <h4>{cat}</h4>
                  </label>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Subcategories */}
      <div style={{ marginBottom: "30px" }}>
        <h3
          style={{ marginBottom: "15px", fontSize: "14px", fontWeight: "600" }}
        >
          SUBCATEGORY
        </h3>
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            padding: "10px",
          }}
        >
          <div style={{ position: "relative", marginBottom: "15px" }}>
            <input
              type="text"
              placeholder="SEARCH"
              value={subCategorySearchQuery}
              onChange={(e) => setSubCategorySearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 40px 10px 15px",
                borderRadius: "8px",
                border: "1px solid rgba(223, 223, 223, 1)",
                fontSize: "14px",
                backgroundColor: "rgba(245, 245, 245, 1)",
              }}
            />
            <img
              src={searchIcon}
              alt="search"
              style={{
                position: "absolute",
                right: "15px",
                top: "50%",
                transform: "translateY(-50%)",
                width: "16px",
                height: "16px",
                opacity: 0.5,
              }}
            />
          </div>
          <div style={{ maxHeight: "250px", overflowY: "auto" }}>
            {getAvailableSubCategories().length === 0 ? (
              <div
                style={{ textAlign: "center", padding: "20px", color: "#888" }}
              >
                Select a category to see subcategories
              </div>
            ) : (
              getAvailableSubCategories()
                .filter((sc) =>
                  sc
                    .toLowerCase()
                    .includes(subCategorySearchQuery.toLowerCase()),
                )
                .map((sub) => (
                  <div key={sub} style={{ marginBottom: "10px" }}>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={tempFilterSubCategories.has(sub)}
                        onChange={() => toggleFilterSubCategory(sub)}
                        style={{
                          width: "18px",
                          height: "18px",
                          cursor: "pointer",
                          accentColor: "#10b981",
                        }}
                      />
                      <h4>{sub}</h4>
                    </label>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </FormPopUp>
  );

  // When directSubmit=true, the picker is triggered directly without isMainOpen
  const openPickerDirectly = () => {
    setTempSelected(null);
    setSearchQuery("");
    setActiveCategory("ALL");
    setCurrentPage(1);
    setReplaceReason("");
    setIsPickerOpen(true);
  };

  return (
    <>
      {renderTrigger ? (
        renderTrigger(openPickerDirectly)
      ) : (
        <Button
          componentType={"button"}
          onClick={() => setIsMainOpen(true)}
          bgColor={"white"}
          borderColor={"rgba(207, 207, 207, 1)"}
          textColor={"black"}
          style={{
            borderRadius: "25px",
            padding: "7px 20px",
          }}
        >
          Replace Material Item
          <img
            src={rewindIcon}
            alt="replace"
            style={{ width: "16px", height: "16px" }}
          />
        </Button>
      )}

      {isMainOpen && (
        <FormPopUp
          header="REPLACE MATERIAL REQUEST ITEM"
          setIsOpen={setIsMainOpen}
          handleSubmit={handleMainConfirm}
          addButtonLabel="CONFIRM"
          style={{ minWidth: "95dvw", height: "95dvh" }}
        >
          {/* Hidden input to require material selection */}
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
                <div
                  style={{ display: "flex", gap: "10px", alignItems: "center" }}
                >
                  <CreateNewMaterialButton
                    onSuccess={handleNewMaterialCreated}
                    style={{ padding: "7px 20px" }}
                  />
                  <Button
                    componentType="button"
                    bgColor="black"
                    borderColor="black"
                    textColor="white"
                    full={!selectedItem}
                    onClick={(e) => {
                      e.preventDefault();
                      setTempSelected(selectedItem);
                      setSearchQuery("");
                      setActiveCategory("ALL");
                      setCurrentPage(1);
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
          </div>

          {/* Preview table */}
          {selectedItem && (
            <>
              {/* Hidden inputs to enforce required fields via form.checkValidity() */}
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

      {/* Picker portal renders whenever isPickerOpen (even without isMainOpen for directSubmit mode) */}
      {typeof window !== "undefined" &&
        isPickerOpen &&
        pickerModal &&
        createPortal(pickerModal, document.body)}
      {typeof window !== "undefined" &&
        filterModal &&
        createPortal(filterModal, document.body)}
    </>
  );
}
