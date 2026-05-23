"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import FormPopUp from "@/app/components/FormPopup";
import Button from "./Button";
import CreateNewMaterialButton from "./_CreateNewMaterialButton";
import { InventoryMatch } from "../(protected)/mr/[id]/components/department/_InventoryStatusCell";
import ExportMaterialListPDFButton from "../(protected)/mr/[id]/components/_ExportMaterialListPDFButton";
import { UNIT_OPTIONS } from "@/constants/units";

export type PredefinedItem = {
  id: number;
  item_code: string;
  category_id: number;
  subcategory_id: number;
  material_description: string;
  brand: string | null;
  unit: string | null;
  category_name: string;
  subcategory_name: string;
  added_by?: string | null;
  last_purchase?: string | null;
};

type GroupedItems = {
  [category: string]: {
    [subCategory: string]: PredefinedItem[];
  };
};

type props = {
  onSelectItems: (items: PredefinedItem[]) => void;
  currentItemIDs?: number[];
  disabled?: boolean;
  style?: React.CSSProperties;
  /** Optional controlled open state — when provided the internal button is hidden */
  isOpen?: boolean;
  setIsOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  /** When true, items use radio buttons (single-select only) */
  singleSelect?: boolean;
  /** Optional button(s) rendered to the right of the NEW MATERIAL button */
  downloadButton?: React.ReactNode;
};

const ITEMS_PER_PAGE = 50;

// ── Skeleton shimmer helper ────────────────────────────────────────────────
const SHIMMER: React.CSSProperties = {
  background:
    "linear-gradient(90deg, rgba(0,0,0,0.06) 25%, rgba(0,0,0,0.10) 37%, rgba(0,0,0,0.06) 63%)",
  backgroundSize: "600px 100%",
  animation: "shimmer 1.4s ease infinite",
  borderRadius: "6px",
};

function SkeletonBlock({
  w = "100%",
  h = 12,
  style,
}: {
  w?: string | number;
  h?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        width: w,
        height: h,
        ...SHIMMER,
        ...style,
      }}
    />
  );
}

function SkeletonLayout() {
  // category rows: alternating category + indented sub rows
  const sidebarRows = [
    { w: "72%", indent: false },
    { w: "58%", indent: false },
    { w: "48%", indent: true },
    { w: "54%", indent: true },
    { w: "68%", indent: false },
    { w: "62%", indent: false },
    { w: "75%", indent: false },
    { w: "44%", indent: true },
    { w: "60%", indent: false },
    { w: "66%", indent: false },
  ];

  // widths for 2-line material cell (name row, subtitle row)
  const tableRowWidths = [
    ["68%", "38%"],
    ["52%", "30%"],
    ["78%", "45%"],
    ["60%", "35%"],
    ["72%", "42%"],
    ["55%", "28%"],
    ["80%", "48%"],
    ["63%", "36%"],
    ["70%", "40%"],
    ["58%", "33%"],
    ["74%", "44%"],
    ["50%", "29%"],
    ["66%", "37%"],
    ["83%", "50%"],
    ["61%", "34%"],
    ["77%", "46%"],
    ["54%", "31%"],
    ["69%", "41%"],
    ["57%", "32%"],
    ["75%", "43%"],
    ["64%", "39%"],
    ["81%", "47%"],
    ["53%", "27%"],
    ["71%", "42%"],
  ];

  return (
    <div
      style={{
        display: "flex",
        height: "calc(100dvh - 250px)",
        overflow: "hidden",
        gap: "16px",
      }}
    >
      {/* ── LEFT: sidebar skeleton ── */}
      <div
        style={{
          width: 300,
          flexShrink: 0,
          overflow: "hidden",
          backgroundColor: "rgba(248,248,248,1)",
          display: "flex",
          flexDirection: "column",
          padding: "15px",
          borderRadius: "10px",
        }}
      >
        {/* "BROWSE CATEGORIES" label */}
        <SkeletonBlock w="58%" h={9} style={{ marginBottom: "12px" }} />

        {/* search input shell */}
        <div
          style={{
            height: "33px",
            borderRadius: "8px",
            border: "1px solid rgba(220,220,220,1)",
            backgroundColor: "white",
            marginBottom: "8px",
            flexShrink: 0,
          }}
        />

        {/* "All Materials" active row — black pill */}
        <div
          style={{
            height: "36px",
            borderRadius: "5px",
            backgroundColor: "rgba(0,0,0,0.10)",
            marginBottom: "4px",
            flexShrink: 0,
          }}
        />

        {/* scrollable category list */}
        <div
          style={{
            flex: 1,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            gap: "5px",
            padding: "4px 8px 0",
          }}
        >
          {sidebarRows.map((row, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                paddingLeft: row.indent ? "24px" : "0",
                paddingTop: "5px",
                paddingBottom: "5px",
              }}
            >
              {/* checkbox placeholder */}
              <div
                style={{
                  width: "13px",
                  height: "13px",
                  flexShrink: 0,
                  borderRadius: "3px",
                  border: "1.5px solid rgba(200,200,200,1)",
                  backgroundColor: "white",
                }}
              />
              <SkeletonBlock w={row.w} h={row.indent ? 10 : 11} />
              {/* count badge placeholder */}
              <div
                style={{
                  marginLeft: "auto",
                  width: "28px",
                  height: "16px",
                  borderRadius: "50px",
                  backgroundColor: "white",
                  border: "1px solid rgba(220,220,220,1)",
                  flexShrink: 0,
                }}
              />
            </div>
          ))}
        </div>

        {/* RECENTLY USED pinned at bottom — single-line items only */}
        <div
          style={{
            flexShrink: 0,
            borderTop: "1px solid rgba(217,217,217,1)",
            paddingTop: "12px",
            marginTop: "10px",
          }}
        >
          <SkeletonBlock w="42%" h={9} style={{ marginBottom: "10px" }} />
          {["85%", "72%", "90%", "68%"].map((w, i) => (
            <div key={i} style={{ padding: "5px 0" }}>
              <SkeletonBlock w={w} h={11} />
            </div>
          ))}
        </div>
      </div>

      {/* ── CENTER: toolbar + table skeleton ── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          overflow: "hidden",
          backgroundColor: "white",
          color: "black",
        }}
      >
        {/* sticky top bar */}
        <div
          style={{
            padding: "12px 20px 8px",
            backgroundColor: "white",
            flexShrink: 0,
          }}
        >
          {/* Row 1: search + NEW MATERIAL + EXPORT */}
          <div
            style={{
              display: "flex",
              gap: "10px",
              alignItems: "center",
              marginBottom: "10px",
            }}
          >
            <div
              style={{
                flex: 1,
                height: "37px",
                borderRadius: "8px",
                border: "1px solid rgba(223,223,223,1)",
                backgroundColor: "rgba(252,252,252,1)",
              }}
            />
            {/* NEW MATERIAL + */}
            <SkeletonBlock
              w="130px"
              h={37}
              style={{ borderRadius: "8px", flexShrink: 0 }}
            />
            {/* EXPORT MATERIAL LIST */}
            <SkeletonBlock
              w="160px"
              h={37}
              style={{ borderRadius: "8px", flexShrink: 0 }}
            />
          </div>

          {/* Row 2: FILTER pill | count */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <SkeletonBlock w="68px" h={28} style={{ borderRadius: "50px" }} />
            <SkeletonBlock w="120px" h={10} />
          </div>
        </div>

        {/* scrollable table area */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          <table
            style={{
              tableLayout: "fixed",
              width: "100%",
              borderCollapse: "collapse",
            }}
          >
            <colgroup>
              <col style={{ width: "75px" }} />
              <col />
              <col style={{ width: "100px" }} />
            </colgroup>
            <thead>
              <tr>
                <th
                  style={{
                    padding: "8px 0",
                    borderBottom: "1px solid rgba(220,220,220,1)",
                  }}
                />
                <th
                  style={{
                    padding: "8px 12px 8px 0",
                    borderBottom: "1px solid rgba(220,220,220,1)",
                  }}
                >
                  <SkeletonBlock w="55px" h={10} />
                </th>
                <th
                  style={{
                    padding: "8px 12px",
                    borderBottom: "1px solid rgba(220,220,220,1)",
                  }}
                >
                  <SkeletonBlock w="35px" h={10} />
                </th>
              </tr>
            </thead>
            <tbody>
              {/* "Recently Requested" section header row */}
              <tr>
                <td />
                <td colSpan={2} style={{ padding: "14px 0 8px" }}>
                  <SkeletonBlock w="140px" h={12} />
                </td>
              </tr>

              {/* first 4 rows = "recently ordered" */}
              {tableRowWidths.slice(0, 4).map(([nameW, subW], i) => (
                <tr
                  key={`r-${i}`}
                  style={{ borderBottom: "1px solid rgba(239,239,239,1)" }}
                >
                  <td style={{ padding: "12px" }}>
                    <div
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        ...SHIMMER,
                      }}
                    />
                  </td>
                  <td style={{ padding: "10px 12px 10px 0" }}>
                    <SkeletonBlock
                      w={nameW}
                      h={12}
                      style={{ marginBottom: "6px" }}
                    />
                    <SkeletonBlock w={subW} h={9} />
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <SkeletonBlock w="38px" h={10} />
                  </td>
                </tr>
              ))}

              {/* "Library" section header row */}
              <tr>
                <td />
                <td colSpan={2} style={{ padding: "28px 0 8px" }}>
                  <SkeletonBlock w="55px" h={12} />
                </td>
              </tr>

              {/* remaining rows = "library" */}
              {tableRowWidths.slice(4).map(([nameW, subW], i) => (
                <tr
                  key={`l-${i}`}
                  style={{ borderBottom: "1px solid rgba(239,239,239,1)" }}
                >
                  <td style={{ padding: "12px" }}>
                    <div
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        ...SHIMMER,
                      }}
                    />
                  </td>
                  <td style={{ padding: "10px 12px 10px 0" }}>
                    <SkeletonBlock
                      w={nameW}
                      h={12}
                      style={{ marginBottom: "6px" }}
                    />
                    <SkeletonBlock w={subW} h={9} />
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <SkeletonBlock w="38px" h={10} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── RIGHT: detail panel skeleton ── */}
      <div
        style={{
          width: 290,
          flexShrink: 0,
          overflowY: "auto",
          padding: "15px",
          borderRadius: "10px",
          backgroundColor: "rgba(250,250,250,1)",
        }}
      >
        {/* white inner card (mirrors the real detailItem card) */}
        <div
          style={{
            backgroundColor: "white",
            padding: "15px",
            borderRadius: "10px",
          }}
        >
          {/* title */}
          <SkeletonBlock w="90%" h={14} style={{ marginBottom: "6px" }} />
          <SkeletonBlock w="65%" h={14} style={{ marginBottom: "20px" }} />

          {/* HR */}
          <div
            style={{
              height: "1px",
              backgroundColor: "rgba(223,223,223,1)",
              marginBottom: "20px",
            }}
          />

          {/* 2×2 info grid: CATEGORY | SUBCATEGORY / UNIT | ADDED BY */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "20px",
            }}
          >
            {[
              ["42%", "55%"],
              ["52%", "70%"],
              ["30%", "35%"],
              ["45%", "50%"],
            ].map(([labelW, valW], i) => (
              <div key={i}>
                <SkeletonBlock
                  w={labelW}
                  h={8}
                  style={{ marginBottom: "6px" }}
                />
                <SkeletonBlock w={valW} h={13} />
              </div>
            ))}
          </div>
        </div>

        {/* Inventory Mapping section */}
        <div style={{ marginTop: "16px", padding: "0 4px" }}>
          <SkeletonBlock w="55%" h={12} style={{ marginBottom: "4px" }} />
          <SkeletonBlock w="38%" h={9} style={{ marginBottom: "14px" }} />

          {/* inventory match rows */}
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                padding: "12px 0",
                borderBottom: i < 2 ? "1px solid rgba(239,239,239,1)" : "none",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "8px",
              }}
            >
              <div style={{ flex: 1 }}>
                <SkeletonBlock w="75%" h={11} style={{ marginBottom: "6px" }} />
                <SkeletonBlock
                  w="50px"
                  h={18}
                  style={{ borderRadius: "50px" }}
                />
              </div>
              <SkeletonBlock w="42px" h={11} style={{ flexShrink: 0 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Colour constants matching InventoryStatusCell ──────────────────────────
const GREEN_BG = "rgba(214, 243, 214, 1)";
const GREEN_TEXT = "rgba(0, 125, 71, 1)";
const RED_BG = "rgba(255, 221, 221, 1)";
const RED_TEXT = "rgba(248, 77, 77, 1)";
const SIM_BG = "rgba(220, 220, 220, 1)";
const SIM_TEXT = "rgba(60, 60, 60, 1)";

export default function MultipleSelectMaterialItemButton({
  onSelectItems,
  currentItemIDs = [],
  disabled,
  style,
  isOpen: isOpenProp,
  setIsOpen: setIsOpenProp,
  singleSelect = false,
  downloadButton,
}: props) {
  const searchIcon = "/icons/search.svg";
  const externalLinkIcon = "/icons/external-link.svg";
  const pencilIcon = "/icons/pencil.svg";
  const crossSmallIcon = "/icons/cross.svg";

  // ── Open state ──────────────────────────────────────────────────────────
  const [isOpenInternal, setIsOpenInternal] = useState(false);
  const isOpen = isOpenProp !== undefined ? isOpenProp : isOpenInternal;
  const setIsOpen =
    setIsOpenProp !== undefined ? setIsOpenProp : setIsOpenInternal;

  // ── Core data ────────────────────────────────────────────────────────────
  const [allItems, setAllItems] = useState<PredefinedItem[]>([]);
  const [groupedItems, setGroupedItems] = useState<GroupedItems>({});
  const [isFetchingItems, setIsFetchingItems] = useState(false);

  // ── Selection ────────────────────────────────────────────────────────────
  const [tempSelectedIDs, setTempSelectedIDs] = useState<number[]>(
    currentItemIDs || [],
  );
  const [selectedInfo, setSelectedInfo] = useState("");

  // ── Filters ──────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategoryTab, setActiveCategoryTab] = useState("");
  const [expandedCategoryTab, setExpandedCategoryTab] = useState("");
  const [activeSubCategoryTab, setActiveSubCategoryTab] = useState("");
  const [showOnlySelected, setShowOnlySelected] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [showFilterPopup, setShowFilterPopup] = useState(false);
  const [filterUnits, setFilterUnits] = useState<string[]>([]);
  const [tempFilterUnits, setTempFilterUnits] = useState<string[]>([]);

  // ── Pagination ───────────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);

  // ── Right panel: item detail + inventory mapping ─────────────────────────
  const [detailItem, setDetailItem] = useState<PredefinedItem | null>(null);
  const [inventoryMatches, setInventoryMatches] = useState<
    InventoryMatch[] | null
  >(null);
  const [inventoryLoading, setInventoryLoading] = useState(false);

  // ── Derived: flat items for the center table (tab + search filters only) ───
  const flatItems = (() => {
    const q = searchQuery.trim().toLowerCase();
    let items: PredefinedItem[] = [];
    Object.entries(groupedItems).forEach(([cat, subCats]) => {
      if (activeCategoryTab && cat !== activeCategoryTab) return;
      Object.entries(subCats).forEach(([sub, subItems]) => {
        if (activeSubCategoryTab && sub !== activeSubCategoryTab) return;
        items.push(...subItems);
      });
    });
    if (q) {
      items = items.filter(
        (item) =>
          item.material_description?.toLowerCase().includes(q) ||
          item.item_code?.toLowerCase().includes(q) ||
          item.brand?.toLowerCase().includes(q),
      );
    }
    if (filterUnits.length > 0) {
      items = items.filter((item) => filterUnits.includes(item.unit || ""));
    }
    if (showOnlySelected) {
      items = items.filter((item) => tempSelectedIDs.includes(item.id));
    }
    return items;
  })();

  // Show "Recently Ordered / Library" sections only when browsing all materials
  const isAllView = !activeCategoryTab && !activeSubCategoryTab;
  const recentCount = isAllView
    ? flatItems.filter((i) => !!i.last_purchase).length
    : 0;
  const sortedFlatItems = isAllView
    ? [
        ...flatItems.filter((i) => !!i.last_purchase),
        ...flatItems.filter((i) => !i.last_purchase),
      ]
    : flatItems;

  const totalPages = Math.ceil(sortedFlatItems.length / ITEMS_PER_PAGE);
  const paginatedItems = sortedFlatItems.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  // ── Reset page when switching tab/filter ─────────────────────────────────
  useEffect(() => {
    setCurrentPage(1);
  }, [activeSubCategoryTab, activeCategoryTab, showOnlySelected]);

  // ── Exit "selected only" when nothing selected ───────────────────────────
  useEffect(() => {
    if (showOnlySelected && tempSelectedIDs.length === 0) {
      setShowOnlySelected(false);
      setActiveCategoryTab("");
      setActiveSubCategoryTab("");
    }
  }, [tempSelectedIDs, showOnlySelected]);

  // ── Fetch predefined items when modal opens ───────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    setIsFetchingItems(true);
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getPredefinedItems`)
      .then((res) => res.json())
      .then((data) => {
        if (!data || !Array.isArray(data)) {
          setAllItems([]);
          return;
        }
        setAllItems(data);
        const grouped: GroupedItems = {};
        data.forEach((item: PredefinedItem) => {
          const category = item.category_name || "Uncategorized";
          const subCategory = item.subcategory_name || "General";
          if (!grouped[category]) grouped[category] = {};
          if (!grouped[category][subCategory])
            grouped[category][subCategory] = [];
          grouped[category][subCategory].push(item);
        });
        setGroupedItems(grouped);
      })
      .catch((err) => {
        console.error("Error fetching predefined items:", err);
        setAllItems([]);
        setGroupedItems({});
      })
      .finally(() => setIsFetchingItems(false));
  }, [isOpen]);

  // ── Sync selectedInfo when currentItemIDs / allItems change ──────────────
  useEffect(() => {
    if (currentItemIDs.length > 0 && allItems.length > 0) {
      const selected = allItems.filter((i) => currentItemIDs.includes(i.id));
      if (selected.length > 0) {
        setSelectedInfo(
          selected.length === 1
            ? selected[0].material_description
            : `${selected.length} ITEMS SELECTED`,
        );
        setTempSelectedIDs(currentItemIDs);
      }
    } else if (currentItemIDs.length === 0) {
      setSelectedInfo("");
    }
  }, [currentItemIDs, allItems]);

  // ── Reset on open ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setTempSelectedIDs(currentItemIDs || []);
      setSearchQuery("");
      setCurrentPage(1);
      setShowOnlySelected(false);
      setActiveCategoryTab("");
      setExpandedCategoryTab("");
      setActiveSubCategoryTab("");
      setDetailItem(null);
      setInventoryMatches(null);
      setSidebarSearch("");
      setFilterUnits([]);
      setTempFilterUnits([]);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch inventory status for the detail panel ───────────────────────────
  useEffect(() => {
    if (!detailItem) {
      setInventoryMatches(null);
      return;
    }
    setInventoryLoading(true);
    setInventoryMatches(null);
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getInventoryStatus?materials=${encodeURIComponent(detailItem.material_description)}&predefined_ids=${encodeURIComponent(String(detailItem.id))}`,
    )
      .then((r) => r.json())
      .then((data) => {
        setInventoryMatches(data[detailItem.material_description] ?? []);
      })
      .catch(() => setInventoryMatches([]))
      .finally(() => setInventoryLoading(false));
  }, [detailItem?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Selection handlers ────────────────────────────────────────────────────
  const handleCheckboxToggle = (itemId: number) => {
    if (singleSelect) {
      setTempSelectedIDs([itemId]);
    } else {
      setTempSelectedIDs((prev) =>
        prev.includes(itemId)
          ? prev.filter((id) => id !== itemId)
          : [...prev, itemId],
      );
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const selectedItems = allItems.filter((item) =>
      tempSelectedIDs.includes(item.id),
    );
    onSelectItems(selectedItems);
    setSelectedInfo(
      selectedItems.length === 1
        ? selectedItems[0].material_description
        : `${selectedItems.length} ITEMS SELECTED`,
    );
    setIsOpen(false);
  };

  const handleReset = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setTempSelectedIDs([]);
    setSelectedInfo("");
    onSelectItems([]);
  };

  // ── New material created ──────────────────────────────────────────────────
  const handleNewMaterialCreated = (newItem: PredefinedItem) => {
    const cat = newItem.category_name || "Uncategorized";
    const sub = newItem.subcategory_name || "General";
    setAllItems((prev) => [...prev, newItem]);
    setGroupedItems((prev) => ({
      ...prev,
      [cat]: {
        ...(prev[cat] || {}),
        [sub]: [...(prev[cat]?.[sub] || []), newItem],
      },
    }));
    setTempSelectedIDs((prev) => [...prev, newItem.id]);
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "-";
    }
  };

  // ── Sidebar category/subcategory bulk-select helpers ─────────────────────
  const getCatItems = (cat: string) =>
    Object.values(groupedItems[cat] || {}).flat();
  const getSubItems = (cat: string, sub: string): PredefinedItem[] =>
    groupedItems[cat]?.[sub] || [];
  const isCatChecked = (cat: string) => {
    const items = getCatItems(cat);
    return (
      items.length > 0 && items.every((i) => tempSelectedIDs.includes(i.id))
    );
  };
  const isSubChecked = (cat: string, sub: string) => {
    const items = getSubItems(cat, sub);
    return (
      items.length > 0 && items.every((i) => tempSelectedIDs.includes(i.id))
    );
  };
  const toggleCatSelection = (cat: string) => {
    const items = getCatItems(cat);
    if (isCatChecked(cat)) {
      setTempSelectedIDs((prev) =>
        prev.filter((id) => !items.some((i) => i.id === id)),
      );
    } else {
      setTempSelectedIDs((prev) => [
        ...new Set([...prev, ...items.map((i) => i.id)]),
      ]);
    }
  };
  const toggleSubSelection = (cat: string, sub: string) => {
    const items = getSubItems(cat, sub);
    if (isSubChecked(cat, sub)) {
      setTempSelectedIDs((prev) =>
        prev.filter((id) => !items.some((i) => i.id === id)),
      );
    } else {
      setTempSelectedIDs((prev) => [
        ...new Set([...prev, ...items.map((i) => i.id)]),
      ]);
    }
  };

  // ── Sidebar category data ─────────────────────────────────────────────────
  const sidebarCategories = Object.keys(groupedItems).sort();
  const sidebarQ = sidebarSearch.trim().toLowerCase();
  const visibleSidebarCategories = sidebarCategories.filter((cat) => {
    if (!sidebarQ) return true;
    if (cat.toLowerCase().includes(sidebarQ)) return true;
    return Object.keys(groupedItems[cat] || {}).some((sub) =>
      sub.toLowerCase().includes(sidebarQ),
    );
  });
  const totalFilteredCount = sidebarCategories.reduce(
    (sum, cat) => sum + Object.values(groupedItems[cat] || {}).flat().length,
    0,
  );

  // ── Pagination controls ───────────────────────────────────────────────────
  const PaginationControls = () => {
    const getPageNumbers = () => {
      const pages: (number | string)[] = [];
      const maxVisible = 7;
      if (totalPages <= maxVisible) {
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
    if (totalPages <= 1) return null;
    const btnBase: React.CSSProperties = {
      padding: "6px 10px",
      borderRadius: "5px",
      border: "1px solid rgba(223,223,223,1)",
      backgroundColor: "white",
      fontWeight: 600,
      minWidth: "36px",
      color: "black",
    };
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "6px",
          padding: "14px 0",
        }}
      >
        <button
          type="button"
          onClick={() => setCurrentPage(currentPage - 1)}
          disabled={currentPage === 1}
          style={{
            ...btnBase,
            opacity: currentPage === 1 ? 0.4 : 1,
            cursor: currentPage === 1 ? "not-allowed" : "pointer",
          }}
        >
          ‹
        </button>
        {getPageNumbers().map((page, i) => (
          <button
            type="button"
            key={i}
            onClick={() => typeof page === "number" && setCurrentPage(page)}
            disabled={page === "..."}
            style={{
              ...btnBase,
              backgroundColor:
                page === currentPage
                  ? "black"
                  : page === "..."
                    ? "transparent"
                    : "white",
              color: page === currentPage ? "white" : "black",
              cursor: page === "..." ? "default" : "pointer",
              border: page === "..." ? "none" : btnBase.border,
            }}
          >
            {page}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCurrentPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          style={{
            ...btnBase,
            opacity: currentPage === totalPages ? 0.4 : 1,
            cursor: currentPage === totalPages ? "not-allowed" : "pointer",
          }}
        >
          ›
        </button>
      </div>
    );
  };

  // ── Modal ─────────────────────────────────────────────────────────────────
  const modalContent = isOpen && (
    <FormPopUp
      header={"SELECT MATERIALS"}
      setIsOpen={setIsOpen}
      handleSubmit={handleSubmit}
      addButtonLabel={"CONFIRM"}
      haveLoadingState={true}
      style={{
        width: "100dvw",
        height: "100dvh",
        maxHeight: "100dvh",
        margin: 0,
        borderRadius: 0,
      }}
      stickyFooter={
        totalPages > 1 || tempSelectedIDs.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
            {totalPages > 1 && <PaginationControls />}
            {tempSelectedIDs.length > 0 && <div>
            <span
              style={{
                fontSize: "13px",
                fontWeight: 600,
                marginBottom: "10px",
                display: "block",
              }}
            >
              ITEM SELECTED ({tempSelectedIDs.length})
            </span>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {tempSelectedIDs.map((id) => {
                const item = allItems.find((i) => i.id === id);
                if (!item) return null;
                return (
                  <Button
                    key={id}
                    componentType="button"
                    bgColor="rgba(239,239,239,1)"
                    borderColor="transparent"
                    textColor="black"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setTempSelectedIDs((prev) =>
                        prev.filter((i) => i !== id),
                      );
                    }}
                    style={{
                      borderRadius: "50px",
                      fontWeight: 600,
                      textWrap: "nowrap",
                      fontSize: "10px",
                      padding: "4px 10px",
                    }}
                  >
                    {item.material_description}{" "}
                    <img
                      src={crossSmallIcon}
                      style={{ width: "10px", marginBottom: "2px" }}
                    />
                  </Button>
                );
              })}
            </div>
            </div>}
          </div>
        ) : undefined
      }
    >
      {/* ── 3-panel layout ── */}
      {isFetchingItems ? <SkeletonLayout /> : null}
      <div
        style={{
          display: "flex",
          height: "100%",
          overflow: "hidden",
          gap: "16px",
          ...(isFetchingItems && { display: "none" }),
        }}
      >
        {/* ── LEFT: category / subcategory sidebar ── */}
        <div
          style={{
            width: 300,
            flexShrink: 0,
            overflow: "hidden",
            backgroundColor: "rgba(248,248,248,1)",
            color: "black",
            display: "flex",
            flexDirection: "column",
            padding: "15px",
            borderRadius: "10px",
          }}
        >
          {/* Browse label */}
          <p
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: "rgba(120,120,120,1)",
              marginBottom: "8px",
              flexShrink: 0,
            }}
          >
            BROWSE CATEGORIES
          </p>

          {/* Sidebar search */}
          <div style={{ paddingBottom: "8px", flexShrink: 0 }}>
            <div style={{ position: "relative" }}>
              <img
                src={searchIcon}
                alt="search"
                style={{
                  position: "absolute",
                  left: "11px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: "14px",
                  opacity: 0.4,
                  pointerEvents: "none",
                }}
              />
              <input
                type="text"
                placeholder="SEARCH CATEGORIES"
                value={sidebarSearch}
                onChange={(e) => setSidebarSearch(e.target.value)}
                style={{
                  width: "100%",
                  padding: "7px 12px 7px 34px",
                  borderRadius: "8px",
                  border: "1px solid rgba(220,220,220,1)",
                  fontSize: "12px",
                  backgroundColor: "white",
                  color: "black",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          {/* Scrollable list */}
          <div style={{ flex: 1, overflowY: "auto", padding: "6px 8px 12px" }}>
            {/* All */}
            <button
              type="button"
              onClick={() => {
                setActiveCategoryTab("");
                setActiveSubCategoryTab("");
                setDetailItem(null);
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "9px 12px",
                marginBottom: "4px",
                borderRadius: "5px",
                background: !activeCategoryTab ? "black" : "transparent",
                border: "none",
                cursor: "pointer",
                fontWeight: !activeCategoryTab ? 600 : 400,
                fontSize: "13px",
                textAlign: "left",
                gap: "8px",
                color: !activeCategoryTab ? "white" : "black",
                whiteSpace: "normal",
                wordBreak: "break-word",
              }}
            >
              <span style={{ flex: 1 }}>All Materials</span>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  backgroundColor: "white",
                  color: "black",
                  borderRadius: "50px",
                  padding: "1px 7px",
                  flexShrink: 0,
                }}
              >
                {totalFilteredCount.toLocaleString()}
              </span>
            </button>

            {/* Categories */}
            {visibleSidebarCategories.map((cat) => {
              const isCatActive = activeCategoryTab === cat;
              const isCatExpanded = expandedCategoryTab === cat;
              const catChecked = isCatChecked(cat);
              const catCount = Object.values(groupedItems[cat] || {}).flat()
                .length;
              const visibleSubs = Object.keys(groupedItems[cat] || {})
                .sort()
                .filter(
                  (sub) =>
                    !sidebarQ ||
                    cat.toLowerCase().includes(sidebarQ) ||
                    sub.toLowerCase().includes(sidebarQ),
                );

              return (
                <div key={cat} style={{ marginBottom: "4px" }}>
                  {/* Category row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      borderRadius: "5px",
                      backgroundColor: isCatActive ? "black" : "transparent",
                      color: isCatActive ? "white" : "black",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (isCatExpanded) {
                          setExpandedCategoryTab("");
                        } else {
                          setActiveCategoryTab(cat);
                          setExpandedCategoryTab(cat);
                          setActiveSubCategoryTab("");
                        }
                        setDetailItem(null);
                      }}
                      style={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "9px 10px 9px 10px",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        fontWeight: isCatActive ? 700 : 500,
                        fontSize: "13px",
                        textAlign: "left",
                        gap: "8px",
                        color: "inherit",
                        whiteSpace: "normal",
                        wordBreak: "break-word",
                      }}
                    >
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          flex: 1,
                        }}
                      >
                        <span>{cat}</span>
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 12 12"
                          fill="none"
                          style={{
                            flexShrink: 0,
                            transition: "transform 0.15s",
                            transform: isCatExpanded
                              ? "rotate(0deg)"
                              : "rotate(180deg)",
                          }}
                        >
                          <path
                            d="M2 8L6 4L10 8"
                            stroke={isCatActive ? "white" : "black"}
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 600,
                          backgroundColor: "white",
                          color: "black",
                          borderRadius: "50px",
                          padding: "1px 7px",
                          flexShrink: 0,
                        }}
                      >
                        {catCount.toLocaleString()}
                      </span>
                    </button>
                  </div>

                  {/* Subcategories */}
                  {isCatExpanded && (
                    <div
                      style={{
                        marginTop: "2px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "2px",
                      }}
                    >
                      {visibleSubs.map((sub) => {
                        const isSubActive = activeSubCategoryTab === sub;
                        const subChecked = isSubChecked(cat, sub);
                        const subCount = (groupedItems[cat]?.[sub] || [])
                          .length;
                        return (
                          <div
                            key={sub}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              marginLeft: "16px",
                              borderRadius: "5px",
                              backgroundColor: isSubActive
                                ? "black"
                                : "transparent",
                              color: isSubActive ? "white" : "black",
                            }}
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveSubCategoryTab(sub);
                                setDetailItem(null);
                              }}
                              style={{
                                flex: 1,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "7px 10px 7px 10px",
                                background: "transparent",
                                border: "none",
                                cursor: "pointer",
                                fontWeight: isSubActive ? 700 : 400,
                                fontSize: "12px",
                                textAlign: "left",
                                gap: "8px",
                                color: "inherit",
                                whiteSpace: "normal",
                                wordBreak: "break-word",
                              }}
                            >
                              <span style={{ flex: 1 }}>{sub}</span>
                              <span
                                style={{
                                  fontSize: "10px",
                                  fontWeight: 600,
                                  backgroundColor: "white",
                                  color: "black",
                                  borderRadius: "50px",
                                  padding: "1px 6px",
                                  flexShrink: 0,
                                }}
                              >
                                {subCount.toLocaleString()}
                              </span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Recently Used — pinned at bottom ── */}
          {allItems.some((i) => !!i.last_purchase) && (
            <div
              style={{
                flexShrink: 0,
                borderTop: "1px solid rgba(217,217,217,1)",
                paddingTop: "12px",
                marginTop: "10px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "rgba(120,120,120,1)",
                  }}
                >
                  RECENTLY USED
                </span>
              </div>
              {allItems
                .filter((i) => !!i.last_purchase)
                .slice(0, 4)
                .map((item) => (
                  <button
                    key={`recent-sidebar-${item.id}`}
                    type="button"
                    onClick={() => {
                      setActiveCategoryTab("");
                      setActiveSubCategoryTab("");
                      setDetailItem(item);
                    }}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      background: "none",
                      border: "none",
                      padding: "5px 0",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "#000",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {item.material_description}
                    </div>
                  </button>
                ))}
            </div>
          )}
        </div>

        {/* ── CENTER: search + table ── */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            overflow: "hidden",
            backgroundColor: "white",
            color: "black",
          }}
        >
          {/* Sticky top bar */}
          <div
            style={{
              padding: "12px 20px 8px",
              backgroundColor: "white",
              flexShrink: 0,
            }}
          >
            {/* Search + NEW MATERIAL */}
            <div
              style={{
                display: "flex",
                gap: "10px",
                alignItems: "center",
                marginBottom: "10px",
              }}
            >
              <div style={{ position: "relative", flex: 1 }}>
                <input
                  type="text"
                  placeholder="SEARCH MATERIALS"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 40px 8px 14px",
                    borderRadius: "8px",
                    border: "1px solid rgba(223,223,223,1)",
                    fontSize: "13px",
                  }}
                />
                <img
                  src={searchIcon}
                  alt="search"
                  style={{
                    position: "absolute",
                    right: "14px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: "15px",
                    opacity: 0.4,
                  }}
                />
              </div>
              <CreateNewMaterialButton
                onSuccess={handleNewMaterialCreated}
                allItems={allItems}
                style={{ padding: "7px 16px", whiteSpace: "nowrap" }}
              />
              <ExportMaterialListPDFButton allItems={allItems} />
            </div>

            {/* Filter chips row */}
            <div
              style={{
                display: "flex",
                gap: "8px",
                alignItems: "center",
                flexWrap: "wrap",
                justifyContent: "space-between",
              }}
            >
              {/* Left: filter button + active bubbles */}
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <Button
                  componentType="button"
                  bgColor="white"
                  borderColor="rgba(241,244,246,1)"
                  textColor="black"
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setTempFilterUnits(filterUnits);
                    setShowFilterPopup(true);
                  }}
                  style={{ borderRadius: "50px", position: "relative" }}
                >
                  FILTER <img src="/icons/filter.svg" alt="filter" />
                </Button>

                {tempSelectedIDs.length > 0 && (
                  <Button
                    componentType="button"
                    type="button"
                    bgColor={showOnlySelected ? "black" : "rgba(239,239,239,1)"}
                    borderColor="transparent"
                    textColor={showOnlySelected ? "white" : "black"}
                    onClick={() => setShowOnlySelected((v) => !v)}
                    style={{
                      borderRadius: "50px",
                      fontWeight: 600,
                      textWrap: "nowrap",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    SELECTED ITEMS ({tempSelectedIDs.length})
                    <img
                      src={crossSmallIcon}
                      alt="remove"
                      style={{
                        width: "10px",
                        marginBottom: "2px",
                        filter: showOnlySelected ? "invert(1)" : "none",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setTempSelectedIDs([]);
                        setShowOnlySelected(false);
                      }}
                    />
                  </Button>
                )}

                {filterUnits.length > 0 && (
                  <Button
                    componentType="button"
                    type="button"
                    bgColor="rgba(239,239,239,1)"
                    borderColor="transparent"
                    textColor="black"
                    onClick={() => {
                      setFilterUnits([]);
                      setTempFilterUnits([]);
                    }}
                    style={{
                      borderRadius: "50px",
                      fontWeight: 600,
                      textWrap: "nowrap",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    UNIT:{" "}
                    <span style={{ color: "rgba(16,185,129,1)" }}>
                      {filterUnits[0]}
                      {filterUnits.length > 1
                        ? `, +${filterUnits.length - 1} MORE`
                        : ""}
                    </span>
                    <img
                      src={crossSmallIcon}
                      alt="remove"
                      style={{ width: "10px", marginBottom: "2px" }}
                    />
                  </Button>
                )}
              </div>

              {/* Right: count */}
              <span style={{ fontSize: "12px", color: "rgba(120,120,120,1)" }}>
                {flatItems.length.toLocaleString()} materials found
              </span>
            </div>

            {/* Filter popup */}
            {showFilterPopup &&
              createPortal(
                <FormPopUp
                  header="FILTER MATERIALS"
                  setIsOpen={setShowFilterPopup}
                  handleSubmit={(e) => {
                    e.preventDefault();
                    setFilterUnits(tempFilterUnits);
                    setShowFilterPopup(false);
                  }}
                  addButtonLabel="CONFIRM"
                  style={{ minWidth: "400px" }}
                  secondButton={
                    <Button
                      componentType="button"
                      bgColor="white"
                      borderColor="black"
                      textColor="black"
                      onClick={() => {
                        setTempFilterUnits([]);
                        setFilterUnits([]);
                        setShowFilterPopup(false);
                      }}
                    >
                      RESET
                    </Button>
                  }
                >
                  <div style={{ marginBottom: "30px" }}>
                    <h3
                      style={{
                        marginBottom: "15px",
                        fontSize: "14px",
                        fontWeight: 600,
                      }}
                    >
                      UNIT
                    </h3>
                    <div
                      style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        padding: "10px",
                      }}
                    >
                      {/* Select All */}
                      <div style={{ marginBottom: "10px" }}>
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
                            checked={
                              tempFilterUnits.length === UNIT_OPTIONS.length
                            }
                            onChange={(e) =>
                              setTempFilterUnits(
                                e.target.checked ? [...UNIT_OPTIONS] : [],
                              )
                            }
                            className="filter-checkbox"
                          />
                          <h4>Select All</h4>
                        </label>
                      </div>
                      {/* Scrollable list */}
                      <div style={{ maxHeight: "250px", overflowY: "auto" }}>
                        {UNIT_OPTIONS.map((unit) => (
                          <div key={unit} style={{ marginBottom: "10px" }}>
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
                                className="filter-checkbox"
                                checked={tempFilterUnits.includes(unit)}
                                onChange={(e) =>
                                  setTempFilterUnits((prev) =>
                                    e.target.checked
                                      ? [...prev, unit]
                                      : prev.filter((u) => u !== unit),
                                  )
                                }
                              />
                              <h4>{unit}</h4>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </FormPopUp>,
                document.body,
              )}
          </div>

          {/* Scrollable table area */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
            {flatItems.length === 0 ? (
              <div
                className="no-items-container"
                style={{ backgroundColor: "transparent" }}
              >
                <img src="/images/no-items.svg" alt="no items" />
                <br />
                <h2
                  style={{
                    fontSize: "14px",
                    fontWeight: 600,
                    marginTop: "8px",
                  }}
                >
                  {showOnlySelected ? "NO ITEMS SELECTED" : "NO MATERIAL FOUND"}
                </h2>
                <br />
                <span
                  style={{
                    fontSize: "12px",
                    color: "rgba(150,150,150,1)",
                    textAlign: "center",
                    maxWidth: "200px",
                    display: "block",
                  }}
                >
                  {showOnlySelected
                    ? "You haven't selected any items yet."
                    : searchQuery.trim()
                      ? `"${searchQuery}" was not found. You can add it as a new item.`
                      : "No items found."}
                </span>
                {!showOnlySelected && searchQuery.trim() && (
                  <>
                    <br />
                    <CreateNewMaterialButton
                      onSuccess={handleNewMaterialCreated}
                      style={{ padding: "10px 24px" }}
                    />
                  </>
                )}
              </div>
            ) : (
              <>
                <table
                  className="items-table"
                  style={{ tableLayout: "fixed", width: "100%" }}
                >
                  <colgroup>
                    <col style={{ width: "75px" }} />
                    <col />
                    <col style={{ width: "100px" }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th
                        style={{ position: "sticky", top: 0, zIndex: 1 }}
                      ></th>
                      <th style={{ position: "sticky", top: 0, zIndex: 1 }}>
                        MATERIAL
                      </th>
                      <th style={{ position: "sticky", top: 0, zIndex: 1 }}>
                        UNIT
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedItems.map((item, localIdx) => {
                      const globalIdx =
                        (currentPage - 1) * ITEMS_PER_PAGE + localIdx;
                      const isSelected = tempSelectedIDs.includes(item.id);
                      const isDetailing = detailItem?.id === item.id;
                      const showRecentHeader =
                        isAllView && globalIdx === 0 && recentCount > 0;
                      const showLibraryHeader =
                        isAllView && globalIdx === recentCount;
                      return (
                        <React.Fragment key={item.id}>
                          {showRecentHeader && (
                            <tr>
                              <td
                                colSpan={3}
                                style={{
                                  fontSize: "13px",
                                  fontWeight: 600,
                                  color: "rgba(89,89,89,1)",
                                  borderBottom: "1px solid rgba(217,217,217,1)",
                                  userSelect: "none",
                                }}
                              >
                                Recently Requested
                              </td>
                            </tr>
                          )}
                          {showLibraryHeader && (
                            <tr>
                              <td
                                colSpan={3}
                                style={{
                                  fontSize: "13px",
                                  fontWeight: 600,
                                  color: "rgba(89,89,89,1)",
                                  borderBottom: "1px solid rgba(217,217,217,1)",
                                  userSelect: "none",
                                }}
                              >
                                Library
                              </td>
                            </tr>
                          )}
                          <tr
                            onClick={() => {
                              setDetailItem(item);
                              handleCheckboxToggle(item.id);
                            }}
                            className={isDetailing ? "row-detailing" : ""}
                            style={{ cursor: "pointer" }}
                          >
                            <td style={{ textAlign: "center" }}>
                              <div
                                style={{
                                  width: "32px",
                                  height: "32px",
                                  borderRadius: "50%",
                                  backgroundColor: isSelected
                                    ? "black"
                                    : "rgba(237,237,237,1)",
                                  color: isSelected ? "white" : "black",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: isSelected ? "20px" : "22px",
                                  fontWeight: 600,
                                  flexShrink: 0,
                                  pointerEvents: "none",
                                }}
                              >
                                {isSelected ? "×" : "+"}
                              </div>
                            </td>
                            <td>
                              <div
                                style={{
                                  fontWeight: 600,
                                  fontSize: "12px",
                                }}
                              >
                                {item.material_description}
                              </div>
                              <div
                                style={{
                                  marginTop: "3px",
                                  fontSize: "10px",
                                  color: "rgba(150,150,150,1)",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  flexWrap: "wrap",
                                }}
                              >
                                <span>{item.category_name || "—"}</span>
                                <span>/</span>
                                <span>{item.subcategory_name || "—"}</span>
                              </div>
                            </td>
                            <td>{item.unit || "-"}</td>
                          </tr>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </div>

        {/* ── RIGHT: item detail + inventory mapping ── */}
        <div
          style={{
            width: 290,
            flexShrink: 0,
            overflowY: "auto",
            padding: "15px",
            borderRadius: "10px",
            backgroundColor: "rgba(250,250,250,1)",
          }}
        >
          {detailItem ? (
            <>
              <div
                style={{
                  backgroundColor: "white",
                  padding: "15px",
                  borderRadius: "10px",
                }}
              >
                {/* Item header card */}
                <div style={{ marginBottom: "20px" }}>
                  <h3
                    style={{
                      fontSize: "16px",
                      fontWeight: 700,
                      color: "#111",
                      marginBottom: "4px",
                    }}
                  >
                    {detailItem.material_description}
                  </h3>
                </div>

                <hr
                  style={{
                    border: "none",
                    borderTop: "1px solid rgba(223,223,223,1)",
                    margin: "0 0 20px",
                  }}
                />

                {/* Info grid */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "20px",
                  }}
                >
                  <div>
                    <small
                      style={{
                        fontSize: "9px",
                        color: "rgba(150,150,150,1)",
                        textTransform: "uppercase",
                        display: "block",
                        marginBottom: "4px",
                        fontWeight: 600,
                      }}
                    >
                      CATEGORY
                    </small>
                    <p
                      style={{
                        fontWeight: 600,
                        fontSize: "14px",
                        color: "#111",
                      }}
                    >
                      {detailItem.category_name || "-"}
                    </p>
                  </div>
                  <div>
                    <small
                      style={{
                        fontSize: "9px",
                        color: "rgba(150,150,150,1)",
                        textTransform: "uppercase",
                        display: "block",
                        marginBottom: "4px",
                        fontWeight: 600,
                      }}
                    >
                      SUBCATEGORY
                    </small>
                    <p
                      style={{
                        fontWeight: 600,
                        fontSize: "14px",
                        color: "#111",
                      }}
                    >
                      {detailItem.subcategory_name || "-"}
                    </p>
                  </div>
                  <div>
                    <small
                      style={{
                        fontSize: "9px",
                        color: "rgba(150,150,150,1)",
                        textTransform: "uppercase",
                        display: "block",
                        marginBottom: "4px",
                        fontWeight: 600,
                      }}
                    >
                      UNIT
                    </small>
                    <p
                      style={{
                        fontWeight: 600,
                        fontSize: "14px",
                        color: "#111",
                      }}
                    >
                      {detailItem.unit || "-"}
                    </p>
                  </div>
                  <div>
                    <small
                      style={{
                        fontSize: "9px",
                        color: "rgba(150,150,150,1)",
                        textTransform: "uppercase",
                        display: "block",
                        marginBottom: "4px",
                        fontWeight: 600,
                      }}
                    >
                      ADDED BY
                    </small>
                    <p
                      style={{
                        fontWeight: 600,
                        fontSize: "14px",
                        color: "#111",
                      }}
                    >
                      {detailItem.added_by || "SYSTEM"}
                    </p>
                  </div>
                </div>
              </div>

              <br />

              {/* Inventory mapping */}
              <h4
                style={{
                  fontWeight: 600,
                  fontSize: "13px",
                  marginBottom: "4px",
                }}
              >
                Inventory Mapping
              </h4>
              <p
                style={{
                  fontSize: "11px",
                  color: "rgba(120,120,120,1)",
                  marginBottom: "12px",
                }}
              >
                Available Items
              </p>

              {inventoryLoading ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    color: "rgba(130,130,130,1)",
                    fontSize: "12px",
                  }}
                >
                  <div
                    style={{
                      width: "14px",
                      height: "14px",
                      border: "2px solid rgba(0,0,0,0.1)",
                      borderTop: "2px solid black",
                      borderRadius: "50%",
                      animation: "spin 0.6s linear infinite",
                      flexShrink: 0,
                    }}
                  />
                  Checking inventory…
                </div>
              ) : inventoryMatches === null ? null : inventoryMatches.length ===
                0 ? (
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      padding: "4px 12px",
                      borderRadius: "50px",
                      fontSize: "11px",
                      fontWeight: 600,
                      backgroundColor: "rgba(220,220,220,1)",
                      color: "rgba(80,80,80,1)",
                    }}
                  >
                    No Match
                  </span>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {inventoryMatches.map((m, i) => (
                    <div
                      key={`${m.inventory_item_id}-${i}`}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: "12px",
                        padding: "12px 0",
                        borderBottom:
                          i < inventoryMatches.length - 1
                            ? "1px solid rgba(239,239,239,1)"
                            : "none",
                      }}
                    >
                      {/* Left: name + badge */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            marginBottom: "6px",
                          }}
                        >
                          <span
                            style={{
                              fontWeight: 600,
                              fontSize: "12px",
                              color: "black",
                            }}
                          >
                            {m.inventory_description}
                          </span>
                          <a
                            href={`/inventory/${m.inventory_item_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              flexShrink: 0,
                            }}
                          >
                            <img
                              src={externalLinkIcon}
                              alt="open"
                              style={{ marginBottom: "4px" }}
                            />
                          </a>
                        </div>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 10px",
                            borderRadius: "50px",
                            fontSize: "10px",
                            fontWeight: 600,
                            backgroundColor:
                              m.match_type === "exact"
                                ? "rgba(6,95,70,1)"
                                : "rgba(209,250,229,1)",
                            color:
                              m.match_type === "exact"
                                ? "rgba(209,250,229,1)"
                                : "rgba(6,95,70,1)",
                            border: "none",
                          }}
                        >
                          {m.match_type === "exact"
                            ? "Exact Match"
                            : "Similar Match"}
                        </span>
                      </div>

                      {/* Right: qty */}
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <span
                          style={{
                            fontWeight: 600,
                            fontSize: "13px",
                            color: "black",
                          }}
                        >
                          {m.total_qty} {m.unit}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                color: "rgba(160,160,160,1)",
                fontSize: "12px",
                textAlign: "center",
                padding: "20px",
              }}
            >
              Click any row to see item details and inventory mapping
            </div>
          )}
        </div>
      </div>
    </FormPopUp>
  );

  return (
    <>
      {isOpenProp === undefined && (
        <Button
          componentType={"button"}
          bgColor={"black"}
          borderColor={"black"}
          textColor={"white"}
          onClick={(e) => {
            e.preventDefault();
            setIsOpen(true);
          }}
          full={currentItemIDs.length === 0}
          disabled={disabled}
          style={style}
        >
          {currentItemIDs.length > 0 ? (
            <>
              EDIT{" "}
              <img
                src={pencilIcon}
                alt="edit"
                style={{ filter: "invert(1)", marginBottom: "2px" }}
              />
            </>
          ) : (
            <>
              SELECT MATERIAL ITEMS{" "}
              <img
                src={externalLinkIcon}
                alt="external link"
                style={{ filter: "invert(1)", marginBottom: "2px" }}
              />
            </>
          )}
        </Button>
      )}

      {typeof window !== "undefined" &&
        modalContent &&
        createPortal(modalContent, document.body)}
    </>
  );
}
