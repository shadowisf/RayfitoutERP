"use client";

import { useState, useEffect, useCallback } from "react";
import { PredefinedItem } from "@/app/components/_MultipleSelectMaterialItemButton";
import { UNIT_OPTIONS } from "@/constants/units";
import { useAuth } from "@/app/context/AuthContext";
import { toast } from "@/app/components/Toast";
import SingleSelectDropdown from "@/app/components/SingleSelectDropdown";
import InputItem from "@/app/components/InputItem";
import FormPopUp from "@/app/components/FormPopup";
import CreateCategoryButton from "@/app/(protected)/mr/[id]/components/department/_CreateCategoryButton";
import CreateSubCategoryButton from "@/app/(protected)/mr/[id]/components/department/_CreateSubcategoryButton";

// ─── Types ───────────────────────────────────────────────────────────────────

type MobileMaterialSelectProps = {
  onSelectItems: (items: PredefinedItem[]) => void;
  onClose: () => void;
  currentItemIDs?: number[];
};

type Category = { id: number; value: string };
type Subcategory = { id: number; value: string; category_id: number };

// ─── Component ───────────────────────────────────────────────────────────────

export default function MobileMaterialSelect({
  onSelectItems,
  onClose,
  currentItemIDs = [],
}: MobileMaterialSelectProps) {
  const { userInfo } = useAuth();

  // ── Core state ──────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<"library" | "quickadd">("library");
  const [allItems, setAllItems] = useState<PredefinedItem[]>([]);
  const [recentItemIDs, setRecentItemIDs] = useState<number[]>([]);
  const [selectedItems, setSelectedItems] = useState<PredefinedItem[]>([]);

  // ── Search / filter ─────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<
    number | null
  >(null);
  const [selectedSubcategoryIDs, setSelectedSubcategoryIDs] = useState<
    Set<number>
  >(new Set());

  // ── Category / subcategory data ─────────────────────────────────────────────
  const [categories, setCategories] = useState<Category[]>([]);
  const [allSubcategories, setAllSubcategories] = useState<Subcategory[]>([]);

  // ── Quick Add form ───────────────────────────────────────────────────────────
  const [newMatDescription, setNewMatDescription] = useState("");
  const [newMatCategoryID, setNewMatCategoryID] = useState<string | number>("");
  const [newMatSubCategoryID, setNewMatSubCategoryID] = useState<
    string | number
  >("");
  const [newMatUnit, setNewMatUnit] = useState("");
  const [newMatBrand, setNewMatBrand] = useState("");
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);
  const [inventorySuggestion, setInventorySuggestion] = useState<{
    id: number;
    description: string;
  } | null>(null);
  const [quickAddSubcategories, setQuickAddSubcategories] = useState<
    Subcategory[]
  >([]);

  // ── Initialise with already-selected items ───────────────────────────────────
  useEffect(() => {
    // We'll populate selectedItems from allItems once both are loaded
  }, []);

  // ── Fetch all predefined items ───────────────────────────────────────────────
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getPredefinedItems`)
      .then((r) => r.json())
      .then((data: PredefinedItem[]) => setAllItems(data))
      .catch(console.error);
  }, []);

  // ── Fetch recently used items for this department ────────────────────────────
  useEffect(() => {
    if (!userInfo?.departmentID) return;
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "getRecentlyUsedItems",
        department_id: userInfo.departmentID,
      }),
    })
      .then((r) => r.json())
      .then((ids: number[]) => setRecentItemIDs(ids))
      .catch(console.error);
  }, [userInfo?.departmentID]);

  // ── Fetch categories + subcategories ────────────────────────────────────────
  useEffect(() => {
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMaterialCategoryValues`,
    )
      .then((r) => r.json())
      .then(setCategories)
      .catch(console.error);

    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMaterialSubCategoryValues`,
    )
      .then((r) => r.json())
      .then(setAllSubcategories)
      .catch(console.error);
  }, []);

  // ── Initialise activeCategoryFilter to first category once loaded ────────────
  useEffect(() => {
    if (categories.length > 0 && activeCategoryFilter === null) {
      setActiveCategoryFilter(categories[0].id);
    }
  }, [categories, activeCategoryFilter]);

  // ── Pre-select items that were already selected (currentItemIDs) ─────────────
  useEffect(() => {
    if (allItems.length === 0 || currentItemIDs.length === 0) return;
    const preSelected = allItems.filter((i) => currentItemIDs.includes(i.id));
    setSelectedItems(preSelected);
  }, [allItems]); // run once when allItems loads

  // ── Quick Add: refetch subcategories when category changes ───────────────────
  useEffect(() => {
    if (!newMatCategoryID) {
      setQuickAddSubcategories([]);
      setNewMatSubCategoryID("");
      return;
    }
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMaterialSubCategoryValuesByCategoryID`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category_id: newMatCategoryID }),
      },
    )
      .then((r) => r.json())
      .then(setQuickAddSubcategories)
      .catch(console.error);
    setNewMatSubCategoryID("");
  }, [newMatCategoryID]);

  // ── Inventory suggestion hint ────────────────────────────────────────────────
  useEffect(() => {
    if (!newMatDescription.trim() || newMatDescription.trim().length < 3) {
      setInventorySuggestion(null);
      return;
    }
    const timer = setTimeout(() => {
      fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/inventory/searchByDescription`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ descriptions: [newMatDescription.trim()] }),
        },
      )
        .then((r) => r.json())
        .then((data) => {
          const match = data?.data?.[newMatDescription.trim()];
          setInventorySuggestion(match ?? null);
        })
        .catch(() => setInventorySuggestion(null));
    }, 500);
    return () => clearTimeout(timer);
  }, [newMatDescription]);

  // ── Derived: filtered items ──────────────────────────────────────────────────
  const matchesSearch = useCallback(
    (item: PredefinedItem) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        item.material_description.toLowerCase().includes(q) ||
        item.category_name.toLowerCase().includes(q) ||
        item.subcategory_name.toLowerCase().includes(q)
      );
    },
    [search],
  );

  const matchesFilter = useCallback(
    (item: PredefinedItem) => {
      if (selectedSubcategoryIDs.size === 0) return true;
      return selectedSubcategoryIDs.has(item.subcategory_id);
    },
    [selectedSubcategoryIDs],
  );

  const recentItems = allItems.filter(
    (item) =>
      recentItemIDs.includes(item.id) &&
      matchesSearch(item) &&
      matchesFilter(item),
  );

  const libraryItems = allItems.filter(
    (item) => matchesSearch(item) && matchesFilter(item),
  );

  // ── Toggle item selection ────────────────────────────────────────────────────
  const toggleItem = (item: PredefinedItem) => {
    setSelectedItems((prev) => {
      const isSelected = prev.some((i) => i.id === item.id);
      if (isSelected) return prev.filter((i) => i.id !== item.id);
      return [...prev, item];
    });
  };

  // ── Confirm selection ────────────────────────────────────────────────────────
  const handleConfirm = () => {
    onSelectItems(selectedItems);
    onClose();
  };

  // ── Quick Add submit ─────────────────────────────────────────────────────────
  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !newMatDescription.trim() ||
      !newMatCategoryID ||
      !newMatSubCategoryID
    ) {
      toast("Please fill in Category, Subcategory, and Name", "error");
      return;
    }
    setIsSubmittingNew(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getPredefinedItems`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            material_description: newMatDescription.trim(),
            category_id: newMatCategoryID,
            subcategory_id: newMatSubCategoryID,
            unit: newMatUnit || null,
            brand: newMatBrand || null,
          }),
        },
      );
      if (!res.ok) throw new Error("Failed to create material");
      const newItem: PredefinedItem = await res.json();

      setAllItems((prev) => [newItem, ...prev]);
      setSelectedItems((prev) => [...prev, newItem]);

      // Reset form
      setNewMatDescription("");
      setNewMatCategoryID("");
      setNewMatSubCategoryID("");
      setNewMatUnit("");
      setNewMatBrand("");
      setInventorySuggestion(null);

      setTab("library");
      toast("Material created and added to selection.", "success");
    } catch {
      toast("Failed to create material", "error");
    } finally {
      setIsSubmittingNew(false);
    }
  };

  // ── Filter: count helpers ────────────────────────────────────────────────────
  const filteredCount =
    selectedSubcategoryIDs.size === 0
      ? allItems.length
      : allItems.filter((i) => selectedSubcategoryIDs.has(i.subcategory_id))
          .length;

  const subcatsForActiveCategory = allSubcategories.filter(
    (s) => s.category_id === activeCategoryFilter,
  );

  // ── Shared styles ────────────────────────────────────────────────────────────
  const GREY_TEXT = "rgba(150,150,150,1)";
  const BORDER_COLOR = "rgba(217,217,217,1)";
  const LIGHT_BG = "rgba(239,239,239,1)";

  // ── Sticky footer: search + filter + selected pills (library tab only) ───────
  const searchAndFilterFooter = (
    <div>
      {/* Selected items panel */}
      {selectedItems.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          {/* Label row */}
          <div
            style={{
              fontSize: 11,
              color: "#000",
              marginBottom: 8,
            }}
          >
            <p>ITEM SELECTED ({selectedItems.length}):</p>
          </div>

          {/* Horizontally scrollable pills — max-width hard-bounds it to viewport so it scrolls internally */}
          <div
            style={
              {
                overflowX: "auto",
                whiteSpace: "nowrap",
                scrollbarWidth: "none",
                msOverflowStyle: "none",
                maxWidth: "calc(100vw - 40px)",
              } as React.CSSProperties
            }
          >
            {selectedItems.map((item) => (
              <span
                key={item.id}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "rgba(237,237,237,1)",
                  color: "#000",
                  borderRadius: 50,
                  padding: "4px 12px",
                  fontSize: 10,
                  marginRight: 8,
                }}
              >
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: 200,
                  }}
                >
                  {item.material_description}
                </span>
                <button
                  type="button"
                  onClick={() => toggleItem(item)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#000",
                    cursor: "pointer",
                    padding: 0,
                    fontSize: 16,
                    lineHeight: 1,
                    flexShrink: 0,
                    opacity: 0.5,
                  }}
                  aria-label={`Remove ${item.material_description}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Search + filter row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            flex: 1,
            position: "relative",
            display: "flex",
            alignItems: "center",
          }}
        >
          <img
            src="/icons/search.svg"
            alt=""
            style={{
              position: "absolute",
              left: 10,
              width: 14,
              height: 14,
              opacity: 0.4,
              pointerEvents: "none",
            }}
          />
          <input
            type="text"
            placeholder="SEARCH"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "9px 12px 9px 32px",
              borderRadius: 50,
              border: `1px solid ${BORDER_COLOR}`,
              fontSize: 13,
              outline: "none",
              background: LIGHT_BG,
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ position: "relative", flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setShowFilter(true)}
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              border: `1px solid ${BORDER_COLOR}`,
              background: selectedSubcategoryIDs.size > 0 ? "#000" : "#fff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
            aria-label="Filter"
          >
            <img
              src="/icons/mr-filter-mobile.svg"
              alt="Filter"
              style={{
                width: 18,
                height: 18,
                filter: selectedSubcategoryIDs.size > 0 ? "invert(1)" : "none",
              }}
            />
          </button>
          {selectedSubcategoryIDs.size > 0 && (
            <span
              style={{
                position: "absolute",
                top: -2,
                right: -2,
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "red",
                border: "2px solid #fff",
              }}
            />
          )}
        </div>
      </div>
    </div>
  );

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <FormPopUp
        header="SELECT MATERIAL(S)"
        setIsOpen={(open) => {
          if (!open) onClose();
        }}
        handleSubmit={handleConfirm}
        addButtonLabel={"CONFIRM"}
        stickyFooter={tab === "library" ? searchAndFilterFooter : undefined}
      >
        {/* Hidden validity gate — disables CONFIRM when nothing selected on library tab */}
        <input
          type="text"
          required
          readOnly
          value={tab === "library" && selectedItems.length > 0 ? "x" : ""}
          tabIndex={-1}
          style={{
            position: "absolute",
            opacity: 0,
            width: 0,
            height: 0,
            pointerEvents: "none",
          }}
        />

        {/* Tab bar */}
        <div
          style={{
            display: "flex",
            borderBottom: `1px solid ${BORDER_COLOR}`,
            marginBottom: 4,
          }}
        >
          {(["library", "quickadd"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              style={{
                flex: 1,
                background: "none",
                border: "none",
                borderBottom:
                  tab === t ? "2px solid #000" : "2px solid transparent",
                marginBottom: -1,
                padding: "10px 0",
                fontSize: 12,
                fontWeight: tab === t ? 600 : 500,
                color: "#000",
                cursor: "pointer",
              }}
            >
              {t === "library" ? (
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  <img
                    src="/icons/mr-library-mobile.svg"
                    alt=""
                    style={{ marginBottom: "2px" }}
                  />
                  LIBRARY
                </span>
              ) : (
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  <img
                    src="/icons/mr-rocket-mobile.svg"
                    alt=""
                    style={{ marginBottom: "2px" }}
                  />
                  QUICK ADD
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === "library" ? (
          <LibraryTab
            allItems={libraryItems}
            recentItems={recentItems}
            selectedItems={selectedItems}
            onToggle={toggleItem}
            search={search}
            hasActiveFilter={selectedSubcategoryIDs.size > 0}
          />
        ) : (
          <QuickAddTab
            categories={categories}
            quickAddSubcategories={quickAddSubcategories}
            newMatDescription={newMatDescription}
            setNewMatDescription={setNewMatDescription}
            newMatCategoryID={newMatCategoryID}
            setNewMatCategoryID={setNewMatCategoryID}
            newMatSubCategoryID={newMatSubCategoryID}
            setNewMatSubCategoryID={setNewMatSubCategoryID}
            newMatUnit={newMatUnit}
            setNewMatUnit={setNewMatUnit}
            newMatBrand={newMatBrand}
            setNewMatBrand={setNewMatBrand}
            inventorySuggestion={inventorySuggestion}
            isSubmitting={isSubmittingNew}
            onSubmit={handleQuickAddSubmit}
            GREY_TEXT={GREY_TEXT}
            BORDER_COLOR={BORDER_COLOR}
          />
        )}
      </FormPopUp>

      {/* Filter sheet — rendered outside FormPopUp so it layers on top */}
      {showFilter && (
        <FilterSheet
          categories={categories}
          allSubcategories={allSubcategories}
          allItems={allItems}
          activeCategoryFilter={activeCategoryFilter}
          setActiveCategoryFilter={setActiveCategoryFilter}
          selectedSubcategoryIDs={selectedSubcategoryIDs}
          setSelectedSubcategoryIDs={setSelectedSubcategoryIDs}
          filteredCount={filteredCount}
          onClose={() => setShowFilter(false)}
          BORDER_COLOR={BORDER_COLOR}
          GREY_TEXT={GREY_TEXT}
          LIGHT_BG={LIGHT_BG}
        />
      )}
    </>
  );
}

// ─── Library Tab ──────────────────────────────────────────────────────────────

type LibraryTabProps = {
  allItems: PredefinedItem[];
  recentItems: PredefinedItem[];
  selectedItems: PredefinedItem[];
  onToggle: (item: PredefinedItem) => void;
  search: string;
  hasActiveFilter: boolean;
};

function LibraryTab({
  allItems,
  recentItems,
  selectedItems,
  onToggle,
  search,
  hasActiveFilter,
}: LibraryTabProps) {
  const selectedIDs = new Set(selectedItems.map((i) => i.id));

  if (allItems.length === 0 && !search && !hasActiveFilter) {
    return (
      <div
        style={{
          padding: 32,
          textAlign: "center",
          color: "rgba(150,150,150,1)",
          fontSize: 13,
        }}
      >
        Loading materials…
      </div>
    );
  }

  if (allItems.length === 0) {
    return (
      <div
        style={{
          padding: 32,
          textAlign: "center",
          color: "rgba(150,150,150,1)",
          fontSize: 13,
        }}
      >
        No materials match your search.
      </div>
    );
  }

  return (
    <div>
      {/* Recently Requested section */}
      {recentItems.length > 0 && (
        <>
          <div
            style={{
              padding: "14px 0px 8px",
              fontSize: 14,
              fontWeight: 600,
              color: "rgba(89, 89, 89, 1)",
              borderBottom: "1px solid rgba(217,217,217,1)",
            }}
          >
            Recently Requested
          </div>
          {recentItems.map((item, idx) => (
            <ItemRow
              key={`recent-${item.id}`}
              item={item}
              isSelected={selectedIDs.has(item.id)}
              onToggle={onToggle}
              showDivider={true}
            />
          ))}
          <br />
        </>
      )}

      {/* Library section */}
      <div
        style={{
          padding: "14px 0px 8px",
          fontSize: 14,
          fontWeight: 600,
          color: "rgba(89, 89, 89, 1)",
          borderBottom: "1px solid rgba(217,217,217,1)",
        }}
      >
        Library
      </div>
      {allItems.map((item, idx) => (
        <ItemRow
          key={`lib-${item.id}`}
          item={item}
          isSelected={selectedIDs.has(item.id)}
          onToggle={onToggle}
          showDivider={true}
        />
      ))}
    </div>
  );
}

// ─── Item Row ─────────────────────────────────────────────────────────────────

type ItemRowProps = {
  item: PredefinedItem;
  isSelected: boolean;
  onToggle: (item: PredefinedItem) => void;
  showDivider: boolean;
};

function ItemRow({ item, isSelected, onToggle, showDivider }: ItemRowProps) {
  const GREY_TEXT = "rgba(150,150,150,1)";
  const BORDER_COLOR = "rgba(217,217,217,1)";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "16px 0px",
        borderBottom: showDivider ? `1px solid ${BORDER_COLOR}` : "none",
        gap: 12,
      }}
    >
      {/* Text block */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 10,
            color: GREY_TEXT,
            marginBottom: 2,
          }}
        >
          Description
        </div>
        <div
          style={
            {
              fontSize: 14,
              fontWeight: 600,
              color: "#000",
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              lineHeight: 1.3,
            } as React.CSSProperties
          }
        >
          {item.material_description}
        </div>
        <div
          style={{
            fontSize: 11,
            color: GREY_TEXT,
            marginTop: 3,
            display: "flex",
            alignItems: "center",
            gap: 3,
            flexWrap: "wrap",
          }}
        >
          <span>{item.category_name}</span>
          <span>/</span>
          <span>{item.subcategory_name}</span>
          <>
            <span>·</span>
            <span>{item.unit || "N/A"}</span>
            <img
              src="/icons/mr-unit-mobile.svg"
              alt=""
              style={{ width: 12, height: 12, flexShrink: 0 }}
            />
          </>
        </div>
      </div>

      {/* Toggle button */}
      <button
        type="button"
        onClick={() => onToggle(item)}
        style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          border: "none",
          background: isSelected ? "#000" : "rgba(237,237,237,1)",
          color: isSelected ? "#fff" : "#000",
          fontSize: 22,
          fontWeight: 400,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          lineHeight: 1,
          padding: 0,
        }}
        aria-label={isSelected ? "Remove item" : "Add item"}
      >
        {isSelected ? "×" : "+"}
      </button>
    </div>
  );
}

// ─── Quick Add Tab ────────────────────────────────────────────────────────────

type QuickAddTabProps = {
  categories: Category[];
  quickAddSubcategories: Subcategory[];
  newMatDescription: string;
  setNewMatDescription: (v: string) => void;
  newMatCategoryID: string | number;
  setNewMatCategoryID: (v: string | number) => void;
  newMatSubCategoryID: string | number;
  setNewMatSubCategoryID: (v: string | number) => void;
  newMatUnit: string;
  setNewMatUnit: (v: string) => void;
  newMatBrand: string;
  setNewMatBrand: (v: string) => void;
  inventorySuggestion: { id: number; description: string } | null;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  GREY_TEXT: string;
  BORDER_COLOR: string;
};

function QuickAddTab({
  categories,
  quickAddSubcategories,
  newMatDescription,
  setNewMatDescription,
  newMatCategoryID,
  setNewMatCategoryID,
  newMatSubCategoryID,
  setNewMatSubCategoryID,
  newMatUnit,
  setNewMatUnit,
  newMatBrand,
  setNewMatBrand,
  inventorySuggestion,
  isSubmitting,
  onSubmit,
  GREY_TEXT,
  BORDER_COLOR,
}: QuickAddTabProps) {
  return (
    <form
      onSubmit={onSubmit}
      style={{
        padding: "16px 16px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      {/* CATEGORY */}
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 6,
          }}
        >
          <label
            style={{
              fontSize: 11,
              fontWeight: 600,

              color: "#000",
            }}
          >
            CATEGORY <span style={{ color: "red" }}>*</span>
          </label>
          <CreateCategoryButton />
        </div>
        <SingleSelectDropdown
          label=""
          dbData={categories}
          selectedValue={newMatCategoryID}
          onChange={setNewMatCategoryID}
          placeholder="SELECT CATEGORY"
          required
        />
      </div>

      {/* SUBCATEGORY */}
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 6,
          }}
        >
          <label
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#000",
            }}
          >
            SUBCATEGORY <span style={{ color: "red" }}>*</span>
          </label>
          {newMatCategoryID ? (
            <CreateSubCategoryButton
              materialCategoryID={Number(newMatCategoryID)}
            />
          ) : null}
        </div>
        <SingleSelectDropdown
          label=""
          dbData={quickAddSubcategories}
          selectedValue={newMatSubCategoryID}
          onChange={setNewMatSubCategoryID}
          placeholder={
            newMatCategoryID ? "SELECT SUBCATEGORY" : "Select a category first"
          }
          required
        />
      </div>

      {/* NAME */}
      <div>
        <InputItem
          label="NAME"
          value={newMatDescription}
          type="text"
          onChange={(e) => setNewMatDescription(e.target.value)}
          required
          placeholder="Enter material name"
        />
        {inventorySuggestion && (
          <div
            style={{
              marginTop: 6,
              padding: "6px 10px",
              background: "rgba(239,239,239,1)",
              borderRadius: 8,
              fontSize: 11,
              color: GREY_TEXT,
            }}
          >
            Inventory match:{" "}
            <strong style={{ color: "#000" }}>
              {inventorySuggestion.description}
            </strong>
          </div>
        )}
      </div>

      {/* UNIT */}
      <InputItem
        label="UNIT"
        value={newMatUnit}
        type="select"
        onChange={(e) => setNewMatUnit(e.target.value)}
        placeholder="SELECT UNIT"
        selectOptions={[...UNIT_OPTIONS]}
      />

      {/* BRAND */}
      <InputItem
        label="BRAND"
        value={newMatBrand}
        type="text"
        onChange={(e) => setNewMatBrand(e.target.value)}
        placeholder="Enter brand (optional)"
      />

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        style={{
          width: "100%",
          padding: "14px",
          background: isSubmitting ? "rgba(150,150,150,1)" : "#000",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 600,
          cursor: isSubmitting ? "default" : "pointer",

          marginTop: 8,
        }}
      >
        {isSubmitting ? "CREATING…" : "CREATE & ADD MATERIAL"}
      </button>
    </form>
  );
}

// ─── Filter Sheet ─────────────────────────────────────────────────────────────

type FilterSheetProps = {
  categories: Category[];
  allSubcategories: Subcategory[];
  allItems: PredefinedItem[];
  activeCategoryFilter: number | null;
  setActiveCategoryFilter: (id: number) => void;
  selectedSubcategoryIDs: Set<number>;
  setSelectedSubcategoryIDs: (s: Set<number> | ((prev: Set<number>) => Set<number>)) => void;
  filteredCount: number;
  onClose: () => void;
  BORDER_COLOR: string;
  GREY_TEXT: string;
  LIGHT_BG: string;
};

function FilterSheet({
  categories,
  allSubcategories,
  allItems,
  activeCategoryFilter,
  setActiveCategoryFilter,
  selectedSubcategoryIDs,
  setSelectedSubcategoryIDs,
  filteredCount,
  onClose,
  BORDER_COLOR,
  GREY_TEXT,
  LIGHT_BG,
}: FilterSheetProps) {
  const toggleSubcategory = (id: number) => {
    setSelectedSubcategoryIDs((prev: Set<number>) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const resetAll = () => setSelectedSubcategoryIDs(new Set());

  const activeSubcats = allSubcategories.filter(
    (s) => s.category_id === activeCategoryFilter,
  );

  const countByCategory = (catID: number) =>
    allItems.filter((i) => i.category_id === catID).length;

  const countBySubcategory = (subcatID: number) =>
    allItems.filter((i) => i.subcategory_id === subcatID).length;

  const filterHeader = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
      }}
    >
      <span>FILTER MATERIALS</span>
      <button
        type="button"
        onClick={resetAll}
        style={{
          background: "none",
          border: "none",
          fontSize: 12,
          fontWeight: 600,
          color: selectedSubcategoryIDs.size > 0 ? "#000" : GREY_TEXT,
          cursor: selectedSubcategoryIDs.size > 0 ? "pointer" : "default",
          padding: 0,
        }}
      >
        Reset all
      </button>
    </div>
  );

  return (
    <FormPopUp
      header={filterHeader}
      setIsOpen={(open) => {
        if (!open) onClose();
      }}
      handleSubmit={() => onClose()}
      addButtonLabel={
        selectedSubcategoryIDs.size > 0
          ? `SHOW ${filteredCount} ITEMS`
          : "SHOW ALL RESULTS"
      }
    >
      {/* Active filter chips */}
      {selectedSubcategoryIDs.size > 0 && (
        <div
          style={
            {
              overflowX: "auto",
              whiteSpace: "nowrap",
              scrollbarWidth: "none",
              marginBottom: 12,
              paddingBottom: 12,
              borderBottom: `1px solid ${BORDER_COLOR}`,
            } as React.CSSProperties
          }
        >
          {allSubcategories
            .filter((s) => selectedSubcategoryIDs.has(s.id))
            .map((s) => (
              <span
                key={s.id}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  background: "#000",
                  color: "#fff",
                  borderRadius: 50,
                  padding: "4px 10px",
                  fontSize: 11,
                  fontWeight: 600,
                  marginRight: 6,
                }}
              >
                {s.value}
                <button
                  type="button"
                  onClick={() => toggleSubcategory(s.id)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#fff",
                    cursor: "pointer",
                    padding: 0,
                    fontSize: 13,
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </span>
            ))}
        </div>
      )}

      {/* Two-column layout — columns scroll independently */}
      <div
        style={{
          display: "flex",
          height: "50dvh",
          overflow: "hidden",
          border: `1px solid ${BORDER_COLOR}`,
          borderRadius: 8,
        }}
      >
        {/* Left: categories */}
        <div
          style={{
            width: 120,
            flexShrink: 0,
            overflowY: "auto",
            WebkitOverflowScrolling: "touch" as any,
            borderRight: `1px solid ${BORDER_COLOR}`,
          }}
        >
          {categories.map((cat) => {
            const isActive = activeCategoryFilter === cat.id;
            return (
              <div
                key={cat.id}
                onClick={() => setActiveCategoryFilter(cat.id)}
                style={{
                  padding: "12px 10px",
                  background: isActive ? "#000" : "transparent",
                  color: isActive ? "#fff" : "#000",
                  borderBottom: `1px solid ${BORDER_COLOR}`,
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 2,
                    wordBreak: "break-word",
                  }}
                >
                  {cat.value}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: isActive ? "rgba(200,200,200,1)" : GREY_TEXT,
                  }}
                >
                  {countByCategory(cat.id)} items
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: subcategories */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            WebkitOverflowScrolling: "touch" as any,
          }}
        >
          {activeSubcats.length === 0 ? (
            <div
              style={{
                padding: 20,
                fontSize: 12,
                color: GREY_TEXT,
                textAlign: "center",
              }}
            >
              No subcategories
            </div>
          ) : (
            activeSubcats.map((sub) => {
              const isChecked = selectedSubcategoryIDs.has(sub.id);
              const count = countBySubcategory(sub.id);
              return (
                <div
                  key={sub.id}
                  onClick={() => toggleSubcategory(sub.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "12px 14px",
                    borderBottom: `1px solid ${BORDER_COLOR}`,
                    cursor: "pointer",
                  }}
                >
                  {/* Custom checkbox */}
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      border: `2px solid ${isChecked ? "#000" : "rgba(150,150,150,1)"}`,
                      background: isChecked ? "#000" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {isChecked && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path
                          d="M1 4L3.5 6.5L9 1"
                          stroke="white"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>

                  <span style={{ flex: 1, fontSize: 13, color: "#000" }}>
                    {sub.value}
                  </span>

                  <span
                    style={{
                      fontSize: 11,
                      color: GREY_TEXT,
                      background: LIGHT_BG,
                      borderRadius: 50,
                      padding: "2px 8px",
                      flexShrink: 0,
                    }}
                  >
                    {count}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </FormPopUp>
  );
}
