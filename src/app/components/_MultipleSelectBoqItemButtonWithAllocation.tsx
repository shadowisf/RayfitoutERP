"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import FormPopUp from "@/app/components/FormPopup";
import { toast } from "@/app/components/Toast";
import { useAuth } from "@/app/context/AuthContext";
import Button from "./Button";
import { BoqLine } from "../(protected)/project/[id]/boq/[boqId]/types/boqLine";
import { formatPrice, formatPriceAED } from "@/lib/formatPrice";
import MobileBoqSelectWithAllocation from "./_MobileBoqSelectWithAllocation";
import InputItem from "./InputItem";

type props = {
  projectID: number;
  onSelectBoq: (
    boqLineIDs: number[],
    boqInfo: string,
    selectedLines?: BoqLine[],
    allocatedQtys?: Record<number, number>,
  ) => void;
  currentBoqLineIDs?: number[];
  disabled?: boolean;
  style?: React.CSSProperties;
  singleSelect?: boolean;
  compact?: boolean;
  itemName?: string;
  mrLineQuantity?: number;
  mrLineUnit?: string;
  mrLineId?: number;
};

type GroupedBoqLines = {
  [category: string]: {
    [subCategory: string]: BoqLine[];
  };
};

const ITEMS_PER_PAGE = 50;

// ── Skeleton shimmer ──────────────────────────────────────────────────────────
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
  return <div style={{ width: w, height: h, ...SHIMMER, ...style }} />;
}

function BoqSkeletonLayout() {
  // Varying widths for item name rows (2 lines each)
  const tableRows: [string, string][] = [
    ["72%", "44%"],
    ["55%", "30%"],
    ["80%", "50%"],
    ["63%", "38%"],
    ["76%", "46%"],
    ["58%", "33%"],
    ["82%", "52%"],
    ["67%", "40%"],
    ["70%", "43%"],
    ["60%", "36%"],
  ];

  return (
    <div style={{ display: "flex", gap: "20px", alignItems: "flex-start", height: "calc(100dvh - 220px)", overflow: "hidden" }}>
      {/* ── Left / centre panel ── */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Search bar row */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "20px" }}>
          <div
            style={{
              width: 250,
              height: 37,
              borderRadius: "8px",
              border: "1px solid rgba(223,223,223,1)",
              backgroundColor: "rgba(252,252,252,1)",
              flexShrink: 0,
            }}
          />
        </div>

        {/* Category tabs row */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "12px", overflow: "hidden" }}>
          {["60px", "110px", "140px", "130px", "120px", "115px", "105px"].map((w, i) => (
            <SkeletonBlock key={i} w={w} h={30} style={{ borderRadius: "50px", flexShrink: 0 }} />
          ))}
        </div>

        {/* Filter row + subcategory tabs row */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px", alignItems: "center", overflow: "hidden" }}>
          <SkeletonBlock w="60px" h={26} style={{ borderRadius: "4px", flexShrink: 0 }} />
          {["90px", "120px", "100px", "110px", "95px", "115px"].map((w, i) => (
            <SkeletonBlock key={i} w={w} h={26} style={{ borderRadius: "50px", flexShrink: 0 }} />
          ))}
        </div>

        {/* Table */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          <table style={{ tableLayout: "fixed", width: "100%", borderCollapse: "collapse" }}>
            <colgroup>
              <col style={{ width: "40px" }} />
              <col style={{ width: "70px" }} />
              <col />
              <col style={{ width: "100px" }} />
              <col style={{ width: "100px" }} />
              <col style={{ width: "130px" }} />
              <col style={{ width: "140px" }} />
              <col style={{ width: "110px" }} />
            </colgroup>
            <thead>
              <tr>
                {["", "#", "ITEM", "QUANTITY", "RATE", "TOTAL PRICE", "ALLOCATED QTY", "ATTACHMENTS"].map((col, i) => (
                  <th
                    key={i}
                    style={{ padding: "8px 10px", borderBottom: "1px solid rgba(220,220,220,1)", textAlign: "left" }}
                  >
                    {col && <SkeletonBlock w={col === "#" ? "16px" : col === "" ? "16px" : "60%"} h={10} />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map(([nameW, subW], i) => (
                <tr key={i} style={{ borderBottom: "1px solid rgba(239,239,239,1)" }}>
                  {/* checkbox */}
                  <td style={{ padding: "14px 10px" }}>
                    <div style={{ width: 16, height: 16, borderRadius: 3, border: "1.5px solid rgba(200,200,200,1)", backgroundColor: "white" }} />
                  </td>
                  {/* # */}
                  <td style={{ padding: "14px 10px" }}>
                    <SkeletonBlock w="40px" h={10} />
                  </td>
                  {/* ITEM — 2 lines */}
                  <td style={{ padding: "14px 10px" }}>
                    <SkeletonBlock w={nameW} h={12} style={{ marginBottom: "6px" }} />
                    <SkeletonBlock w={subW} h={9} />
                  </td>
                  {/* QUANTITY */}
                  <td style={{ padding: "14px 10px" }}>
                    <SkeletonBlock w="55px" h={10} />
                  </td>
                  {/* RATE */}
                  <td style={{ padding: "14px 10px" }}>
                    <SkeletonBlock w="60px" h={10} />
                  </td>
                  {/* TOTAL PRICE */}
                  <td style={{ padding: "14px 10px" }}>
                    <SkeletonBlock w="80px" h={10} />
                  </td>
                  {/* ALLOCATED QTY — input shell */}
                  <td style={{ padding: "14px 10px" }}>
                    <div style={{ height: 32, borderRadius: "6px", border: "1px solid rgba(220,220,220,1)", backgroundColor: "rgba(252,252,252,1)" }} />
                  </td>
                  {/* ATTACHMENTS */}
                  <td style={{ padding: "14px 10px" }}>
                    <SkeletonBlock w="40px" h={10} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div
        style={{
          width: 320,
          flexShrink: 0,
          backgroundColor: "rgba(248,248,248,1)",
          borderRadius: "10px",
          padding: "16px",
          height: "100%",
          overflowY: "auto",
          boxSizing: "border-box",
        }}
      >
        {/* Header label */}
        <SkeletonBlock w="55%" h={11} style={{ marginBottom: "16px" }} />

        {/* Item name block */}
        <SkeletonBlock w="90%" h={14} style={{ marginBottom: "6px" }} />
        <SkeletonBlock w="65%" h={14} style={{ marginBottom: "6px" }} />
        <SkeletonBlock w="38%" h={10} style={{ marginBottom: "20px" }} />

        {/* Remaining / Allocated rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
          {[["40%", "60%"], ["38%", "55%"]].map(([lW, vW], i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <SkeletonBlock w={lW} h={10} />
              <SkeletonBlock w={vW} h={10} />
            </div>
          ))}
        </div>

        {/* Top Allocations section */}
        <SkeletonBlock w="50%" h={11} style={{ marginBottom: "10px" }} />
        <SkeletonBlock w="80%" h={9} style={{ marginBottom: "4px" }} />
        <SkeletonBlock w="70%" h={9} />
      </div>
    </div>
  );
}

function FilterCheckbox({
  checked,
  indeterminate,
  onChange,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      className="filter-checkbox"
      checked={checked}
      onChange={onChange}
    />
  );
}

export default function MultipleSelectBoqItemButtonWithAllocation({
  projectID,
  onSelectBoq,
  currentBoqLineIDs = [],
  disabled,
  style,
  singleSelect = false,
  compact = false,
  itemName,
  mrLineQuantity,
  mrLineUnit,
  mrLineId,
}: props) {
  const locationIcon = "/icons/location-boq.svg";
  const arrowRight = "/icons/arrow-right.svg";
  const searchIcon = "/icons/search.svg";
  const crossIcon = "/icons/cross-small.svg";
  const externalLinkIcon = "/icons/external-link.svg";
  const filterIcon = "/icons/filter.svg";

  const { userInfo } = useAuth();

  const scrollContainerRef = useRef<HTMLDivElement>(null); // subcategory tabs
  const catScrollContainerRef = useRef<HTMLDivElement>(null); // category tabs

  const [isOpen, setIsOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const [boqLineValues, setBoqLineValues] = useState<BoqLine[]>([]);
  const [groupedBoqLines, setGroupedBoqLines] = useState<GroupedBoqLines>({});
  const [filteredGroupedBoqLines, setFilteredGroupedBoqLines] =
    useState<GroupedBoqLines>({});
  const [tempSelectedBoqIDs, setTempSelectedBoqIDs] = useState<number[]>(
    currentBoqLineIDs || [],
  );
  const [allocatedQtys, setAllocatedQtys] = useState<Record<number, number>>(
    {},
  );
  const [allocatedRaw, setAllocatedRaw] = useState<Record<number, string>>({});
  const [selectedBoqInfo, setSelectedBoqInfo] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Track selected categories and subcategories
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set(),
  );
  const [selectedSubCategories, setSelectedSubCategories] = useState<
    Set<string>
  >(new Set());

  const formatQty = (val: any) => {
    const num = Number(val);
    if (isNaN(num)) return val;
    return num % 1 === 0
      ? num.toFixed(0)
      : parseFloat(num.toFixed(2)).toString();
  };

  const canSeePrice =
    userInfo?.departmentID === 8 ||
    userInfo?.departmentID === 12 ||
    userInfo?.departmentID === 10;

  // Category & subcategory filter state
  const [filterCategories, setFilterCategories] = useState<Set<string>>(
    new Set(),
  );
  const [filterSubCategories, setFilterSubCategories] = useState<Set<string>>(
    new Set(),
  );
  const [showFilterPopup, setShowFilterPopup] = useState(false);
  const allCategories = Object.keys(groupedBoqLines);

  // Temp filter state (only applied on CONFIRM)
  const [tempFilterCategories, setTempFilterCategories] = useState<Set<string>>(
    new Set(),
  );
  const [tempFilterSubCategories, setTempFilterSubCategories] = useState<
    Set<string>
  >(new Set());

  // New state
  const [activeCategoryTab, setActiveCategoryTab] = useState("");
  const [activeSubCategoryTab, setActiveSubCategoryTab] = useState("");
  const [showOnlySelected, setShowOnlySelected] = useState(false);

  const [showLeftCatArrow, setShowLeftCatArrow] = useState(false);
  const [showRightCatArrow, setShowRightCatArrow] = useState(false);
  const [showLeftTabArrow, setShowLeftTabArrow] = useState(false);
  const [showRightTabArrow, setShowRightTabArrow] = useState(false);

  const [expandedFilterGroups, setExpandedFilterGroups] = useState<Set<string>>(
    new Set(),
  );
  const [filterGroupSearch, setFilterGroupSearch] = useState("");
  const [isFetchingItems, setIsFetchingItems] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // Scroll functions for category tabs
  const checkCatScroll = () => {
    if (catScrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } =
        catScrollContainerRef.current;
      setShowLeftCatArrow(scrollLeft > 0);
      setShowRightCatArrow(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };
  const scrollCats = (direction: "left" | "right") => {
    catScrollContainerRef.current?.scrollBy({
      left: direction === "left" ? -300 : 300,
      behavior: "smooth",
    });
  };

  // Scroll functions for subcategory tabs
  const checkTabScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } =
        scrollContainerRef.current;
      setShowLeftTabArrow(scrollLeft > 0);
      setShowRightTabArrow(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };
  const scrollTabs = (direction: "left" | "right") => {
    scrollContainerRef.current?.scrollBy({
      left: direction === "left" ? -300 : 300,
      behavior: "smooth",
    });
  };

  // Get all subcategories, optionally filtered by selected categories (uses temp state for popup)
  const getAvailableSubCategories = (
    catSet: Set<string> = tempFilterCategories,
  ): string[] => {
    const subCats = new Set<string>();
    Object.entries(groupedBoqLines).forEach(([category, subCategories]) => {
      if (catSet.size > 0 && !catSet.has(category)) return;
      Object.keys(subCategories).forEach((subCat) => subCats.add(subCat));
    });
    return Array.from(subCats).sort();
  };

  // Get the parent category of a subcategory
  const getCategoryForSubCategory = (subCat: string): string | null => {
    for (const [category, subCategories] of Object.entries(groupedBoqLines)) {
      if (subCat in subCategories) return category;
    }
    return null;
  };

  const toggleFilterCategory = (category: string) => {
    setTempFilterCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
        // Remove subcategories belonging to this category
        const subCatsToRemove = Object.keys(groupedBoqLines[category] || {});
        setTempFilterSubCategories((prevSub) => {
          const nextSub = new Set(prevSub);
          subCatsToRemove.forEach((sc) => nextSub.delete(sc));
          return nextSub;
        });
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const toggleFilterSubCategory = (subCategory: string) => {
    setTempFilterSubCategories((prev) => {
      const next = new Set(prev);
      if (next.has(subCategory)) {
        next.delete(subCategory);
      } else {
        next.add(subCategory);
        // Auto-select the parent category
        const parentCat = getCategoryForSubCategory(subCategory);
        if (parentCat) {
          setTempFilterCategories(
            (prevCat) => new Set([...prevCat, parentCat]),
          );
        }
      }
      return next;
    });
  };

  const toggleGroupedCategory = (category: string) => {
    const subcats = Object.keys(groupedBoqLines[category] || {});
    const allSelected = subcats.every((sc) => tempFilterSubCategories.has(sc));
    const willCheck = !allSelected;
    setTempFilterSubCategories((prev) => {
      const next = new Set(prev);
      subcats.forEach((sc) => (willCheck ? next.add(sc) : next.delete(sc)));
      return next;
    });
    setTempFilterCategories((prev) => {
      const next = new Set(prev);
      willCheck ? next.add(category) : next.delete(category);
      return next;
    });
  };

  const toggleGroupedSubCategory = (subCategory: string) => {
    const parentCat = getCategoryForSubCategory(subCategory);
    const wasSelected = tempFilterSubCategories.has(subCategory);
    const newSubCats = new Set(tempFilterSubCategories);
    wasSelected ? newSubCats.delete(subCategory) : newSubCats.add(subCategory);
    setTempFilterSubCategories(newSubCats);
    if (parentCat) {
      const subcats = Object.keys(groupedBoqLines[parentCat] || {});
      const anyLeft = subcats.some((sc) => newSubCats.has(sc));
      setTempFilterCategories((prev) => {
        const next = new Set(prev);
        anyLeft ? next.add(parentCat) : next.delete(parentCat);
        return next;
      });
    }
  };

  const handleFilterOpen = () => {
    setTempFilterCategories(new Set(filterCategories));
    setTempFilterSubCategories(new Set(filterSubCategories));
    setFilterGroupSearch("");
    setExpandedFilterGroups(new Set());
    setShowFilterPopup(true);
  };

  const handleFilterApply = () => {
    setFilterCategories(new Set(tempFilterCategories));
    setFilterSubCategories(new Set(tempFilterSubCategories));
    setShowFilterPopup(false);
  };

  const handleFilterReset = () => {
    setTempFilterCategories(new Set());
    setTempFilterSubCategories(new Set());
  };

  // Filter BOQ lines based on search query and category/subcategory filter
  useEffect(() => {
    const hasSearch = searchQuery.trim().length > 0;
    const hasCatFilter = filterCategories.size > 0;
    const hasSubCatFilter = filterSubCategories.size > 0;

    if (!hasSearch && !hasCatFilter && !hasSubCatFilter) {
      setFilteredGroupedBoqLines(groupedBoqLines);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered: GroupedBoqLines = {};

    Object.entries(groupedBoqLines).forEach(([category, subCategories]) => {
      // Skip categories not in filter (if category filter is active)
      if (hasCatFilter && !filterCategories.has(category)) return;

      Object.entries(subCategories).forEach(([subCategory, items]) => {
        // Skip subcategories not in filter (if subcategory filter is active)
        if (hasSubCatFilter && !filterSubCategories.has(subCategory)) return;

        const filteredItems = hasSearch
          ? items.filter((boq) => {
              return (
                boq.item_number?.toLowerCase().includes(query) ||
                boq.item_name?.toLowerCase().includes(query) ||
                category.toLowerCase().includes(query) ||
                subCategory.toLowerCase().includes(query)
              );
            })
          : items;

        if (filteredItems.length > 0) {
          if (!filtered[category]) {
            filtered[category] = {};
          }
          filtered[category][subCategory] = filteredItems;
        }
      });
    });

    setFilteredGroupedBoqLines(filtered);
  }, [searchQuery, groupedBoqLines, filterCategories, filterSubCategories]);

  // Fetch BOQ lines when the modal opens
  useEffect(() => {
    if (!isOpen || !projectID || projectID <= 0) return;
    setIsFetchingItems(true);
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/boq/getAllBoqLinesWithNumberRef`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectID,
        }),
      },
    )
      .then((res) => res.json())
      .then(function (data) {
        if (!data || !Array.isArray(data)) {
          console.error("Invalid BOQ data:", data);
          setBoqLineValues([]);
          return;
        }

        setBoqLineValues(data);

        // Group BOQ lines by category and subcategory
        const grouped: GroupedBoqLines = {};
        data.forEach((boqLine: BoqLine) => {
          const category = boqLine.category || "Uncategorized";
          const subCategory = boqLine.sub_category || "General";

          if (!grouped[category]) {
            grouped[category] = {};
          }
          if (!grouped[category][subCategory]) {
            grouped[category][subCategory] = [];
          }
          grouped[category][subCategory].push(boqLine);
        });

        setGroupedBoqLines(grouped);
        setFilteredGroupedBoqLines(grouped);
      })
      .catch((err) => {
        console.error("Error fetching BOQ lines:", err);
        setBoqLineValues([]);
        setGroupedBoqLines({});
        setFilteredGroupedBoqLines({});
      })
      .finally(() => setIsFetchingItems(false));
  }, [projectID, isOpen]);

  // Set selectedBoqInfo when currentBoqLineIDs exist (for editing)
  useEffect(() => {
    if (currentBoqLineIDs.length > 0 && boqLineValues.length > 0) {
      const selectedBoqs = boqLineValues.filter((boq) =>
        currentBoqLineIDs.includes(boq.id),
      );

      if (selectedBoqs.length > 0) {
        const infoText =
          selectedBoqs.length === 1
            ? `${selectedBoqs[0].item_number} ${selectedBoqs[0].item_name}`
            : `${selectedBoqs.length} BOQ ITEMS SELECTED`;

        setSelectedBoqInfo(infoText);
        setTempSelectedBoqIDs(currentBoqLineIDs);
      }
    }
  }, [currentBoqLineIDs, boqLineValues]);

  // Reset temp selection and search when form opens; pre-populate allocations in edit mode
  useEffect(() => {
    if (!isOpen) return;
    setIsFetchingItems(true);
    setTempSelectedBoqIDs(currentBoqLineIDs || []);
    setSearchQuery("");
    setActiveCategoryTab("");
    setActiveSubCategoryTab("");
    setShowOnlySelected(false);

    if (mrLineId && currentBoqLineIDs.length > 0) {
      // Edit mode: fetch saved allocated_qty values from DB
      fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "getMrLineBoqAllocations",
          mr_line_id: mrLineId,
        }),
      })
        .then((res) => res.json())
        .then((data: { boq_line_id: number; allocated_qty: number | null }[]) => {
          const qtys: Record<number, number> = {};
          const raw: Record<number, string> = {};
          for (const row of data) {
            if (row.allocated_qty !== null && row.allocated_qty !== undefined) {
              const num = Number(row.allocated_qty);
              if (!isNaN(num)) {
                qtys[row.boq_line_id] = num;
                raw[row.boq_line_id] = formatQty(num);
              }
            }
          }
          setAllocatedQtys(qtys);
          setAllocatedRaw(raw);
        })
        .catch(() => {
          setAllocatedQtys({});
          setAllocatedRaw({});
        });
    } else {
      setAllocatedQtys({});
      setAllocatedRaw({});
    }
  }, [isOpen, currentBoqLineIDs, mrLineId]); // eslint-disable-line react-hooks/exhaustive-deps

  const parseAttachments = (attachments: any): string[] => {
    if (!attachments) return [];
    if (Array.isArray(attachments)) return attachments;
    if (typeof attachments === "string") {
      try {
        if (attachments.trim() === "") return [];
        const parsed = JSON.parse(attachments);
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        console.error("Failed to parse attachments:", error);
        return [];
      }
    }
    return [];
  };

  // Toggle individual item
  const handleCheckboxToggle = (boqId: number) => {
    if (singleSelect) {
      setTempSelectedBoqIDs([boqId]);
      return;
    }
    setTempSelectedBoqIDs((prev) => {
      const isSelected = prev.includes(boqId);
      if (isSelected) {
        setAllocatedQtys((prev2) => {
          const next = { ...prev2 };
          delete next[boqId];
          return next;
        });
        setAllocatedRaw((prev2) => {
          const next = { ...prev2 };
          delete next[boqId];
          return next;
        });
        return prev.filter((id) => id !== boqId);
      } else {
        return [...prev, boqId];
      }
    });
  };

  // Toggle entire category
  const toggleCategory = (category: string, isChecked: boolean) => {
    const categoryData = filteredGroupedBoqLines[category];
    if (!categoryData) return;

    const allIdsInCategory: number[] = [];
    Object.values(categoryData).forEach((items) => {
      items.forEach((item) => allIdsInCategory.push(item.id));
    });

    if (isChecked) {
      setSelectedCategories((prev) => new Set([...prev, category]));
      setTempSelectedBoqIDs((prev) => [
        ...new Set([...prev, ...allIdsInCategory]),
      ]);
      const subCats = Object.keys(categoryData).map(
        (subCat) => `${category}::${subCat}`,
      );
      setSelectedSubCategories((prev) => new Set([...prev, ...subCats]));
    } else {
      setSelectedCategories((prev) => {
        const newSet = new Set(prev);
        newSet.delete(category);
        return newSet;
      });
      setTempSelectedBoqIDs((prev) =>
        prev.filter((id) => !allIdsInCategory.includes(id)),
      );
      setSelectedSubCategories((prev) => {
        const newSet = new Set(prev);
        const subCatsToRemove = Object.keys(categoryData).map(
          (subCat) => `${category}::${subCat}`,
        );
        subCatsToRemove.forEach((subCat) => newSet.delete(subCat));
        return newSet;
      });
    }
  };

  // Toggle entire subcategory
  const toggleSubCategory = (
    category: string,
    subCategory: string,
    isChecked: boolean,
  ) => {
    const items = filteredGroupedBoqLines[category]?.[subCategory] || [];
    const idsInSubCategory = items.map((item) => item.id);
    const subCatKey = `${category}::${subCategory}`;

    if (isChecked) {
      setSelectedSubCategories((prev) => new Set([...prev, subCatKey]));
      setTempSelectedBoqIDs((prev) => [
        ...new Set([...prev, ...idsInSubCategory]),
      ]);
      const allSubCats = Object.keys(filteredGroupedBoqLines[category] || {});
      const selectedSubCatsInCategory = Array.from(
        selectedSubCategories,
      ).filter((key) => key.startsWith(`${category}::`));
      if (selectedSubCatsInCategory.length + 1 >= allSubCats.length) {
        setSelectedCategories((prev) => new Set([...prev, category]));
      }
    } else {
      setSelectedSubCategories((prev) => {
        const newSet = new Set(prev);
        newSet.delete(subCatKey);
        return newSet;
      });
      setTempSelectedBoqIDs((prev) =>
        prev.filter((id) => !idsInSubCategory.includes(id)),
      );
      setSelectedCategories((prev) => {
        const newSet = new Set(prev);
        newSet.delete(category);
        return newSet;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (tempSelectedBoqIDs.length === 0) {
      toast("Please select at least one bill of quantity item", "error");
      return;
    }

    if (mrQty > 0 && isOverAllocated) {
      toast(
        "Total allocated quantity exceeds the requested quantity. Please adjust before confirming.",
        "error",
      );
      return;
    }

    if (mrQty > 0 && !isFullyAllocated) {
      toast(
        "Please allocate the full requested quantity across selected BOQ items before confirming.",
        "error",
      );
      return;
    }

    const selectedBoqs = boqLineValues.filter((boq) =>
      tempSelectedBoqIDs.includes(boq.id),
    );

    const infoText =
      selectedBoqs.length === 1
        ? `${selectedBoqs[0].item_number} ${selectedBoqs[0].item_name}`
        : `${selectedBoqs.length} BOQ ITEMS SELECTED`;

    onSelectBoq(tempSelectedBoqIDs, infoText, selectedBoqs, allocatedQtys);
    setSelectedBoqInfo(infoText);
    setIsOpen(false);
  };

  // Check if subcategory is selected
  const isSubCategorySelected = (category: string, subCategory: string) => {
    return selectedSubCategories.has(`${category}::${subCategory}`);
  };

  // Derived tab data
  const availableCategoryTabs = (() => {
    if (showOnlySelected) {
      const cats = new Set<string>();
      Object.entries(filteredGroupedBoqLines).forEach(([cat, subCats]) => {
        if (
          Object.values(subCats).some((items) =>
            items.some((item) => tempSelectedBoqIDs.includes(item.id)),
          )
        )
          cats.add(cat);
      });
      return Array.from(cats).sort();
    }
    return Object.keys(filteredGroupedBoqLines).sort();
  })();

  const availableSubCategoryTabs = (() => {
    const subs = new Set<string>();
    Object.entries(filteredGroupedBoqLines).forEach(([cat, subCats]) => {
      if (activeCategoryTab && cat !== activeCategoryTab) return;
      Object.entries(subCats).forEach(([sub, items]) => {
        if (
          showOnlySelected &&
          !items.some((item) => tempSelectedBoqIDs.includes(item.id))
        )
          return;
        subs.add(sub);
      });
    });
    return Array.from(subs).sort();
  })();

  // Data to actually render in the table
  const viewData: GroupedBoqLines = (() => {
    const result: GroupedBoqLines = {};
    Object.entries(filteredGroupedBoqLines).forEach(([cat, subCats]) => {
      if (activeCategoryTab && cat !== activeCategoryTab) return;
      Object.entries(subCats).forEach(([sub, items]) => {
        if (activeSubCategoryTab && sub !== activeSubCategoryTab) return;
        const filteredItems = showOnlySelected
          ? items.filter((item) => tempSelectedBoqIDs.includes(item.id))
          : items;
        if (filteredItems.length === 0) return;
        if (!result[cat]) result[cat] = {};
        result[cat][sub] = filteredItems;
      });
    });
    return result;
  })();

  // Flat items for current view (from viewData)
  const flatItems: BoqLine[] = (() => {
    const items: BoqLine[] = [];
    Object.values(viewData).forEach((subCats) => {
      Object.values(subCats).forEach((subItems) => items.push(...subItems));
    });
    return items;
  })();

  const totalPages = Math.ceil(flatItems.length / ITEMS_PER_PAGE);
  const paginatedItems = flatItems.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  // Scroll arrow effects (must be after derived values are declared)
  useEffect(() => {
    setTimeout(checkTabScroll, 50);
  }, [availableSubCategoryTabs.length]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setTimeout(checkCatScroll, 50);
  }, [availableCategoryTabs.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-check arrows after FormPopup's 500ms spinner clears
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      checkCatScroll();
      checkTabScroll();
    }, 600);
    return () => clearTimeout(timer);
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset page on tab/filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    activeSubCategoryTab,
    activeCategoryTab,
    showOnlySelected,
    searchQuery,
    filterCategories,
    filterSubCategories,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  // Exit "selected only" mode when nothing is selected
  useEffect(() => {
    if (showOnlySelected && tempSelectedBoqIDs.length === 0) {
      setShowOnlySelected(false);
      setActiveCategoryTab("");
      setActiveSubCategoryTab("");
    }
  }, [tempSelectedBoqIDs, showOnlySelected]);

  // Pagination controls
  const PaginationControls = () => {
    const getPageNumbers = () => {
      const pages: (number | string)[] = [];
      const maxVisible = 7;
      if (totalPages <= maxVisible) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
      } else {
        if (currentPage <= 4) {
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
          for (let i = currentPage - 1; i <= currentPage + 1; i++)
            pages.push(i);
          pages.push("...");
          pages.push(totalPages);
        }
      }
      return pages;
    };
    if (totalPages <= 1) return null;
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <button
          type="button"
          onClick={() => setCurrentPage(currentPage - 1)}
          disabled={currentPage === 1}
          style={{
            padding: "8px 12px",
            borderRadius: "5px",
            border: "1px solid rgba(223,223,223,1)",
            backgroundColor: "white",
            cursor: currentPage === 1 ? "not-allowed" : "pointer",
            fontWeight: 600,
            minWidth: "40px",
            opacity: currentPage === 1 ? 0.4 : 1,
            color: "black",
          }}
        >
          ‹
        </button>
        {getPageNumbers().map((page, index) => (
          <button
            type="button"
            key={index}
            onClick={() => typeof page === "number" && setCurrentPage(page)}
            disabled={page === "..."}
            style={{
              padding: "8px 12px",
              borderRadius: "5px",
              border: "1px solid rgba(223,223,223,1)",
              backgroundColor:
                page === currentPage
                  ? "black"
                  : page === "..."
                    ? "transparent"
                    : "white",
              color: page === currentPage ? "white" : "black",
              cursor: page === "..." ? "default" : "pointer",
              fontWeight: 600,
              minWidth: "40px",
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
            padding: "8px 12px",
            borderRadius: "5px",
            border: "1px solid rgba(223,223,223,1)",
            backgroundColor: "white",
            cursor: currentPage === totalPages ? "not-allowed" : "pointer",
            fontWeight: 600,
            minWidth: "40px",
            opacity: currentPage === totalPages ? 0.4 : 1,
            color: "black",
          }}
        >
          ›
        </button>
      </div>
    );
  };

  // Derive unique BOQ header IDs from fetched lines
  const uniqueBoqIds = [...new Set(boqLineValues.map((b) => b.boq_id))]
    .filter(Boolean)
    .sort((a, b) => a - b);
  const boqHeaderLabel =
    uniqueBoqIds.length > 0
      ? `SELECT BOQ ITEMS (${uniqueBoqIds.map((id) => `BOQ-${String(id).padStart(5, "0")}`).join(", ")})`
      : "SELECT BOQ ITEMS";

  // Allocation summary derived values
  const totalAllocated = tempSelectedBoqIDs.reduce(
    (sum, id) => sum + (allocatedQtys[id] || 0),
    0,
  );
  const mrQty = Number(mrLineQuantity ?? 0);
  const remaining = mrQty - totalAllocated;
  const allocatedPct =
    mrQty > 0 ? Math.round((totalAllocated / mrQty) * 100) : 0;
  const remainingPct = mrQty > 0 ? Math.round((remaining / mrQty) * 100) : 0;
  const isOverAllocated = mrQty > 0 && totalAllocated > mrQty;
  const isFullyAllocated =
    mrQty > 0 && !isOverAllocated && totalAllocated >= mrQty;
  const isUnderAllocated = totalAllocated > 0 && totalAllocated < mrQty;
  const allocatedColor = isOverAllocated
    ? "rgba(248,77,77,1)"
    : isFullyAllocated
      ? "rgba(0,125,71,1)"
      : "rgba(248,143,77,1)";

  // Detect which individual BOQ lines are causing the overallocation.
  // Sort smallest-first, accumulate, and flag lines that push the total over mrQty.
  const overAllocatedBoqIds = (() => {
    if (!isOverAllocated) return new Set<number>();
    const sorted = tempSelectedBoqIDs
      .filter((id) => (allocatedQtys[id] || 0) > 0)
      .map((id) => ({ id, qty: allocatedQtys[id] || 0 }))
      .sort((a, b) => a.qty - b.qty);
    let cumulative = 0;
    let overflowStarted = false;
    const flagged = new Set<number>();
    for (const { id, qty } of sorted) {
      cumulative += qty;
      if (overflowStarted || cumulative > mrQty) {
        overflowStarted = true;
        flagged.add(id);
      }
    }
    return flagged;
  })();

  const topAllocations = tempSelectedBoqIDs
    .filter((id) => (allocatedQtys[id] || 0) > 0)
    .map((id) => {
      const boq = boqLineValues.find((b) => b.id === id);
      const qty = allocatedQtys[id] || 0;
      const pct = mrQty > 0 ? Math.round((qty / mrQty) * 100) : 0;
      const isBoqOverAllocated = overAllocatedBoqIds.has(id);
      return { boq, qty, pct, isBoqOverAllocated };
    })
    .filter((x) => x.boq)
    .sort((a, b) => b.qty - a.qty);

  // Create the modal content
  const modalContent = isOpen && (
    <FormPopUp
      header={boqHeaderLabel}
      setIsOpen={setIsOpen}
      handleSubmit={handleSubmit}
      addButtonLabel={"CONFIRM"}
      style={{
        width: "100dvw",
        height: "100dvh",
        margin: 0,
        borderRadius: 0,
        maxHeight: "100dvh",
      }}
      stickyFooter={
        totalPages > 1 || tempSelectedBoqIDs.length > 0 ? (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "15px" }}
          >
            {totalPages > 1 && <PaginationControls />}
            {tempSelectedBoqIDs.length > 0 && (
              <div>
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    marginBottom: "10px",
                    display: "block",
                  }}
                >
                  ITEMS SELECTED ({tempSelectedBoqIDs.length})
                </span>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {tempSelectedBoqIDs.map((id) => {
                    const boq = boqLineValues.find((b) => b.id === id);
                    if (!boq) return null;
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
                          setAllocatedQtys((prev) => {
                            const next = { ...prev };
                            delete next[id];
                            return next;
                          });
                          setAllocatedRaw((prev) => {
                            const next = { ...prev };
                            delete next[id];
                            return next;
                          });
                          setTempSelectedBoqIDs((prev) =>
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
                        {boq.item_number} - {boq.item_name}
                        <img src={crossIcon} style={{ width: "10px" }} />
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : undefined
      }
      haveLoadingState
    >
      {isFetchingItems ? (
        <BoqSkeletonLayout />
      ) : (
      <div style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>
        {/* ── Left panel ───────────────────────────────────────────────────── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Search bar */}
          <div
            style={{
              display: "flex",
              gap: "10px",
              alignItems: "center",
            }}
          >
            <div
              style={{
                position: "relative",
                maxWidth: "250px",
                flex: "0 0 250px",
              }}
            >
              <input
                type="text"
                placeholder="SEARCH"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "7px 40px 7px 15px",
                  borderRadius: "8px",
                  border: "1px solid rgba(223,223,223,1)",
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
          </div>

          <br />
          <br />

          {/* Category tabs */}
          {availableCategoryTabs.length > 0 && (
            <div
              style={{
                position: "relative",
                maxWidth: "calc(85dvw - 150px)",
                overflow: "hidden",
              }}
            >
              {showLeftCatArrow && (
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: "120px",
                    background:
                      "linear-gradient(to right, white 0%, rgba(255,255,255,0) 100%)",
                    pointerEvents: "none",
                    zIndex: 5,
                  }}
                />
              )}
              {showLeftCatArrow && (
                <button
                  type="button"
                  onClick={() => scrollCats("left")}
                  style={{
                    position: "absolute",
                    left: 0,
                    top: "50%",
                    transform: "translateY(-50%)",
                    zIndex: 10,
                    backgroundColor: "black",
                    border: "none",
                    borderRadius: "10px",
                    width: "32px",
                    height: "32px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <img
                    src={arrowRight}
                    style={{ transform: "rotate(180deg)" }}
                    alt="scroll left"
                  />
                </button>
              )}
              <div
                ref={catScrollContainerRef}
                onScroll={checkCatScroll}
                style={{
                  display: "flex",
                  gap: "8px",
                  overflowX: "auto",
                  scrollbarWidth: "none",
                  msOverflowStyle: "none" as any,
                  paddingLeft: showLeftCatArrow ? "44px" : "0",
                  paddingRight: showRightCatArrow ? "44px" : "0",
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setActiveCategoryTab("");
                    setActiveSubCategoryTab("");
                  }}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "6px",
                    border: "none",
                    backgroundColor: !activeCategoryTab
                      ? "rgba(239,239,239,1)"
                      : "rgba(221,221,221,1)",
                    color: "black",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    fontSize: "13px",
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  ALL
                </button>
                {availableCategoryTabs.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setActiveCategoryTab(
                        activeCategoryTab === cat ? "" : cat,
                      );
                      setActiveSubCategoryTab("");
                    }}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "6px",
                      border: "none",
                      backgroundColor:
                        activeCategoryTab === cat
                          ? "rgba(239,239,239,1)"
                          : "rgba(221,221,221,1)",
                      color: "black",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      fontSize: "13px",
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    {cat.toUpperCase()}
                  </button>
                ))}
              </div>
              {showRightCatArrow && (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: "120px",
                    background:
                      "linear-gradient(to left, white 0%, rgba(255,255,255,0) 100%)",
                    pointerEvents: "none",
                    zIndex: 5,
                  }}
                />
              )}
              {showRightCatArrow && (
                <button
                  type="button"
                  onClick={() => scrollCats("right")}
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "50%",
                    transform: "translateY(-50%)",
                    zIndex: 10,
                    backgroundColor: "black",
                    border: "none",
                    borderRadius: "10px",
                    width: "32px",
                    height: "32px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <img src={arrowRight} alt="scroll right" />
                </button>
              )}
            </div>
          )}

          <br />
          <br />

          {/* Filter row */}
          <div
            style={{
              display: "flex",
              gap: "10px",
              alignItems: "center",
              flexWrap: "wrap",
              marginBottom: "15px",
            }}
          >
            <Button
              componentType="button"
              bgColor="white"
              borderColor="rgba(241,244,246,1)"
              textColor="black"
              onClick={(e) => {
                e.preventDefault();
                handleFilterOpen();
              }}
              style={{ borderRadius: "50px" }}
            >
              FILTER <img src={filterIcon} alt="filter" />
            </Button>
            {tempSelectedBoqIDs.length > 0 && (
              <Button
                componentType="button"
                bgColor={showOnlySelected ? "black" : "rgba(239,239,239,1)"}
                borderColor="transparent"
                textColor={showOnlySelected ? "white" : "black"}
                onClick={(e) => {
                  e.preventDefault();
                  setShowOnlySelected((v) => !v);
                  setActiveCategoryTab("");
                  setActiveSubCategoryTab("");
                }}
                style={{
                  borderRadius: "50px",
                  fontWeight: 600,
                  textWrap: "nowrap",
                }}
              >
                SELECTED ITEMS ({tempSelectedBoqIDs.length})
              </Button>
            )}
            {filterCategories.size > 0 && (
              <Button
                componentType="button"
                bgColor="rgba(239,239,239,1)"
                borderColor="transparent"
                textColor="black"
                onClick={() => {
                  setFilterCategories(new Set());
                  setFilterSubCategories(new Set());
                  setActiveSubCategoryTab("");
                }}
                style={{
                  borderRadius: "50px",
                  fontWeight: 600,
                  textWrap: "nowrap",
                }}
              >
                CATEGORY:{" "}
                <span style={{ color: "rgba(16,185,129,1)" }}>
                  {Array.from(filterCategories)[0].toUpperCase()}
                  {filterCategories.size > 1
                    ? `, +${filterCategories.size - 1} MORE`
                    : ""}
                </span>{" "}
                <img src={crossIcon} style={{ width: "12px" }} />
              </Button>
            )}
            {filterSubCategories.size > 0 && (
              <Button
                componentType="button"
                bgColor="rgba(239,239,239,1)"
                borderColor="transparent"
                textColor="black"
                onClick={() => {
                  setFilterSubCategories(new Set());
                  setActiveSubCategoryTab("");
                }}
                style={{
                  borderRadius: "50px",
                  fontWeight: 600,
                  textWrap: "nowrap",
                }}
              >
                SUBCATEGORY:{" "}
                <span style={{ color: "rgba(16,185,129,1)" }}>
                  {Array.from(filterSubCategories)[0].toUpperCase()}
                  {filterSubCategories.size > 1
                    ? `, +${filterSubCategories.size - 1} MORE`
                    : ""}
                </span>{" "}
                <img src={crossIcon} style={{ width: "12px" }} />
              </Button>
            )}
          </div>

          {/* Subcategory tabs */}
          {availableSubCategoryTabs.length > 0 && (
            <div
              style={{
                position: "relative",
                maxWidth: "calc(85dvw - 150px)",
                overflow: "hidden",
              }}
            >
              {showLeftTabArrow && (
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: "120px",
                    background:
                      "linear-gradient(to right, white 0%, rgba(255,255,255,0) 100%)",
                    pointerEvents: "none",
                    zIndex: 5,
                  }}
                />
              )}
              {showLeftTabArrow && (
                <button
                  type="button"
                  onClick={() => scrollTabs("left")}
                  style={{
                    position: "absolute",
                    left: 0,
                    top: "50%",
                    transform: "translateY(-50%)",
                    zIndex: 10,
                    backgroundColor: "black",
                    border: "none",
                    borderRadius: "10px",
                    width: "32px",
                    height: "32px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <img
                    src={arrowRight}
                    style={{ transform: "rotate(180deg)" }}
                    alt="scroll left"
                  />
                </button>
              )}
              <div
                ref={scrollContainerRef}
                onScroll={checkTabScroll}
                style={{
                  display: "flex",
                  gap: "8px",
                  overflowX: "auto",
                  scrollbarWidth: "none",
                  msOverflowStyle: "none" as any,
                  paddingLeft: showLeftTabArrow ? "44px" : "0",
                  paddingRight: showRightTabArrow ? "44px" : "0",
                }}
              >
                {availableSubCategoryTabs.map((sub) => {
                  const isActive = activeSubCategoryTab === sub;
                  // check if all items in this sub (within active cat) are selected
                  const subItems: BoqLine[] = [];
                  Object.entries(filteredGroupedBoqLines).forEach(
                    ([cat, subCats]) => {
                      if (activeCategoryTab && cat !== activeCategoryTab)
                        return;
                      if (subCats[sub]) subItems.push(...subCats[sub]);
                    },
                  );
                  const isChecked =
                    subItems.length > 0 &&
                    subItems.every((item) =>
                      tempSelectedBoqIDs.includes(item.id),
                    );
                  return (
                    <button
                      key={sub}
                      type="button"
                      onClick={() =>
                        setActiveSubCategoryTab(isActive ? "" : sub)
                      }
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "6px 14px",
                        borderRadius: "6px 6px 0 0",
                        border: "none",
                        backgroundColor: isActive
                          ? "rgba(239,239,239,1)"
                          : "rgba(221,221,221,1)",
                        color: "black",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        fontSize: "13px",
                        fontWeight: 600,
                        flexShrink: 0,
                      }}
                    >
                      {sub.toUpperCase()}
                    </button>
                  );
                })}
              </div>
              {showRightTabArrow && (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: "120px",
                    background:
                      "linear-gradient(to left, white 0%, rgba(255,255,255,0) 100%)",
                    pointerEvents: "none",
                    zIndex: 5,
                  }}
                />
              )}
              {showRightTabArrow && (
                <button
                  type="button"
                  onClick={() => scrollTabs("right")}
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "50%",
                    transform: "translateY(-50%)",
                    zIndex: 10,
                    backgroundColor: "black",
                    border: "none",
                    borderRadius: "10px",
                    width: "32px",
                    height: "32px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <img src={arrowRight} alt="scroll right" />
                </button>
              )}
            </div>
          )}

          {/* No results */}
          {!isFetchingItems && flatItems.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "40px",
                color: "rgba(128,128,128,1)",
              }}
            >
              {showOnlySelected
                ? "No selected items match current filters."
                : searchQuery.trim()
                  ? `No results for "${searchQuery}"`
                  : "No items found."}
            </div>
          )}

          {/* Flat BOQ table */}
          {flatItems.length > 0 && (
            <table
              className="items-table two-toned"
              style={{
                tableLayout: "fixed",
                width: "100%",
                borderTopLeftRadius: "0",
                borderTopRightRadius: "0",
              }}
            >
              <colgroup>
                <col style={{ width: "50px" }} />
                <col style={{ width: "120px" }} />
                <col />
                <col style={{ width: "130px" }} />
                {canSeePrice && (
                  <>
                    <col style={{ width: "150px" }} />
                    <col style={{ width: "180px" }} />
                  </>
                )}
                <col style={{ width: "275px" }} />
                <col style={{ width: "200px" }} />
              </colgroup>
              <thead>
                <tr>
                  <th></th>
                  <th>#</th>
                  <th>ITEM</th>
                  <th>QUANTITY</th>
                  {canSeePrice && (
                    <>
                      <th>RATE</th>
                      <th>TOTAL PRICE</th>
                    </>
                  )}
                  <th>ALLOCATED QTY</th>
                  <th>ATTACHMENTS</th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((boq) => {
                  const attachmentUrls = parseAttachments(boq.attachments);
                  return (
                    <tr
                      key={boq.id}
                      onClick={() => handleCheckboxToggle(boq.id)}
                      style={{ cursor: "pointer" }}
                    >
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type={singleSelect ? "radio" : "checkbox"}
                          name={singleSelect ? "boq-select" : undefined}
                          checked={tempSelectedBoqIDs.includes(boq.id)}
                          onChange={() => handleCheckboxToggle(boq.id)}
                          style={{
                            width: "18px",
                            height: "18px",
                            cursor: "pointer",
                            accentColor: "rgba(0,163,93,1)",
                          }}
                        />
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {boq.item_number}
                      </td>
                      <td>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "10px",
                          }}
                        >
                          <strong>{boq.item_name}</strong>
                          {boq.item_description && (
                            <p style={{ whiteSpace: "pre-wrap" }}>
                              {boq.item_description}
                            </p>
                          )}
                          {boq.location && (
                            <div
                              style={{
                                display: "flex",
                                gap: "10px",
                                alignItems: "center",
                              }}
                            >
                              <img
                                src={locationIcon}
                                style={{ width: "16px" }}
                                alt="location"
                              />
                              <span
                                style={{
                                  fontWeight: 600,
                                  marginTop: "4px",
                                  color: "rgba(105,105,105,1)",
                                }}
                              >
                                {boq.location}
                              </span>
                            </div>
                          )}
                          {boq.scope_of_work && (
                            <div
                              style={{
                                backgroundColor: "rgba(225,225,225,1)",
                                borderRadius: "50px",
                                padding: "4px 10px",
                                width: "fit-content",
                              }}
                            >
                              <strong>{boq.scope_of_work}</strong>
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        {formatQty(boq.quantity)} {boq.unit}
                      </td>
                      {canSeePrice && (
                        <>
                          <td>{formatPrice(boq.rate_per_quantity)}</td>
                          <td style={{ textWrap: "nowrap" }}>
                            {formatPriceAED(boq.total_cost)}
                          </td>
                        </>
                      )}
                      <td onClick={(e) => e.stopPropagation()}>
                        {tempSelectedBoqIDs.includes(boq.id) ? (
                          <div style={{ position: "relative" }}>
                            <InputItem
                              label=""
                              type="text postfix"
                              value={allocatedRaw[boq.id] ?? ""}
                              postfixText={mrLineUnit}
                              placeholder="ENTER ALLOCATED QTY"
                              noOptionalLabel
                              onChange={(e) => {
                                const raw = (
                                  e as React.ChangeEvent<HTMLInputElement>
                                ).target.value;
                                // Allow empty and in-progress decimals (e.g. "1.")
                                if (raw === "" || /^\d*\.?\d*$/.test(raw)) {
                                  setAllocatedRaw((prev) => ({
                                    ...prev,
                                    [boq.id]: raw,
                                  }));
                                  const num = parseFloat(raw);
                                  if (raw === "" || isNaN(num)) {
                                    setAllocatedQtys((prev) => {
                                      const next = { ...prev };
                                      delete next[boq.id];
                                      return next;
                                    });
                                  } else {
                                    setAllocatedQtys((prev) => ({
                                      ...prev,
                                      [boq.id]: num,
                                    }));
                                  }
                                }
                              }}
                              style={{ marginBottom: 0 }}
                              required
                            />
                            {overAllocatedBoqIds.has(boq.id) && (
                              <div
                                style={{
                                  position: "absolute",
                                  top: "100%",
                                  left: 0,
                                  display: "flex",
                                  gap: "6px",
                                  alignItems: "center",
                                  marginTop: "3px",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                <img
                                  src="/icons/warning.svg"
                                  alt="warning"
                                  style={{ width: "12px", flexShrink: 0 }}
                                />
                                <p
                                  style={{
                                    color: "red",
                                    fontSize: "11px",
                                    margin: 0,
                                  }}
                                >
                                  Overallocated Quantity
                                </p>
                              </div>
                            )}
                          </div>
                        ) : null}
                      </td>
                      <td className="attachments">
                        <div className="attachments-grid">
                          {attachmentUrls.map((url, i) => (
                            <img key={i} src={url} alt="attachment" />
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Right panel — Allocation Summary ─────────────────────────────── */}
        <div
          style={{
            width: "320px",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            position: "sticky",
            top: 0,
            alignSelf: "flex-start",
          }}
        >
          {/* Sub-container 1: Allocation Summary */}
          <div
            style={{
              backgroundColor: "rgba(245,245,245,1)",
              borderRadius: "12px",
              padding: "16px",
            }}
          >
            <p
              style={{
                fontSize: "12px",
                color: "black",
                fontWeight: 600,
                marginBottom: "10px",
              }}
            >
              Allocation Summary
            </p>

            {/* Item name + qty block */}
            <div style={{ marginBottom: "16px" }}>
              {itemName && (
                <p
                  style={{
                    fontSize: "16px",
                    fontWeight: 700,
                    marginBottom: "4px",
                  }}
                >
                  {itemName}
                </p>
              )}
              {mrLineQuantity !== undefined && (
                <p style={{ fontSize: "11px", color: "rgba(120,120,120,1)" }}>
                  {parseFloat(Number(mrLineQuantity).toFixed(10))}{" "}
                  {mrLineUnit || ""}
                </p>
              )}
            </div>

            {/* Remaining */}
            <div style={{ marginBottom: "10px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontSize: "13px",

                    color: "black",
                  }}
                >
                  Remaining
                </span>
                <span
                  style={{
                    fontSize: "13px",
                    color: "black",
                  }}
                >
                  {formatQty(remaining)} {mrLineUnit || ""}
                  {mrQty > 0 ? ` (${remainingPct}%)` : ""}
                </span>
              </div>
            </div>

            {/* Allocated */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: "13px",
                  color: allocatedColor,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                Allocated
                {isFullyAllocated && (
                  <span
                    style={{
                      width: "16px",
                      height: "16px",
                      borderRadius: "50%",
                      backgroundColor: "rgba(0,125,71,1)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                      <path
                        d="M1 3.5L3.5 6L8 1"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                )}
                {isOverAllocated && (
                  <span
                    style={{
                      width: "16px",
                      height: "16px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <img
                      src="/icons/warning.svg"
                      alt="warning"
                      style={{ width: "16px", height: "16px" }}
                    />
                  </span>
                )}
              </span>
              <span
                style={{
                  fontSize: "13px",
                  color: allocatedColor,
                }}
              >
                {formatQty(totalAllocated)} {mrLineUnit || ""}
                {mrQty > 0 ? ` (${allocatedPct}%)` : ""}
              </span>
            </div>
          </div>

          {/* Sub-container 2: Top Allocations */}
          <div
            style={{
              backgroundColor: "rgba(245,245,245,1)",
              borderRadius: "12px",
              padding: "16px",
            }}
          >
            <p
              style={{
                fontSize: "12px",
                fontWeight: 600,
                marginBottom: "10px",
                color: "black",
              }}
            >
              Top Allocations
            </p>
            {topAllocations.length > 0 ? (
              <div
                style={{ display: "flex", flexDirection: "column", gap: "8px" }}
              >
                {topAllocations.map(({ boq, qty, pct, isBoqOverAllocated }) => (
                  <div
                    key={boq!.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "12px",
                        color: isBoqOverAllocated
                          ? "rgba(248,77,77,1)"
                          : "black",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                      }}
                    >
                      {boq!.item_number} {boq!.item_name}
                      {isBoqOverAllocated && (
                        <img
                          src="/icons/warning.svg"
                          alt="warning"
                          style={{
                            width: "14px",
                            height: "14px",
                            flexShrink: 0,
                          }}
                        />
                      )}
                    </span>
                    <span
                      style={{
                        fontSize: "12px",
                        whiteSpace: "nowrap",
                        color: isBoqOverAllocated
                          ? "rgba(248,77,77,1)"
                          : "black",
                      }}
                    >
                      {formatQty(qty)} {mrLineUnit || ""}
                      {mrQty > 0 ? ` (${pct}%)` : ""}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p
                style={{
                  fontSize: "12px",
                  color: "rgba(180,180,180,1)",
                  textAlign: "center",
                }}
              >
                Start by selecting a BOQ reference and enter the quantity you
                would like to allocate
              </p>
            )}
          </div>
        </div>
      </div>
      )}
    </FormPopUp>
  );

  const handleReset = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setTempSelectedBoqIDs([]);
    setSelectedBoqInfo("");
    setSelectedCategories(new Set());
    setSelectedSubCategories(new Set());
    onSelectBoq([], "");
  };

  return (
    <>
      {compact ? (
        <Button
          componentType={"button"}
          bgColor={"rgb(239, 239, 239)"}
          borderColor={"rgb(223, 223, 223)"}
          textColor={"black"}
          onClick={(e) => {
            (e as React.MouseEvent).preventDefault();
            if (isMobile) setIsMobileOpen(true);
            else setIsOpen(true);
          }}
          disabled={disabled}
          style={{ padding: "7px 7px", ...style }}
        >
          {currentBoqLineIDs.length > 0 ? (
            <img src="/icons/pencil.svg" alt="edit boq" />
          ) : (
            <img src="/icons/plus.svg" alt="select boq" />
          )}
        </Button>
      ) : (
        <Button
          componentType={"button"}
          bgColor={"black"}
          borderColor={"black"}
          textColor={"white"}
          onClick={(e) => {
            e.preventDefault();
            if (isMobile) setIsMobileOpen(true);
            else setIsOpen(true);
          }}
          full
          disabled={disabled}
          style={style}
        >
          {currentBoqLineIDs.length > 0 && selectedBoqInfo ? (
            <>
              <span>EDIT</span>
              <img
                src="/icons/pencil.svg"
                alt="edit"
                style={{ filter: "invert(1)", marginBottom: "2px" }}
              />
            </>
          ) : (
            <>
              <span>SELECT BOQ ITEMS</span>
              <img
                src={externalLinkIcon}
                alt="external link"
                style={{ filter: "invert(1)", marginBottom: "2px" }}
                onClick={handleReset}
              />
            </>
          )}
        </Button>
      )}

      {isMobileOpen && (
        <MobileBoqSelectWithAllocation
          projectID={projectID}
          onSelectBoq={(ids, info, lines, allocatedQtys) => {
            onSelectBoq(ids, info, lines, allocatedQtys);
            setIsMobileOpen(false);
          }}
          currentBoqLineIDs={currentBoqLineIDs}
          onClose={() => setIsMobileOpen(false)}
          singleSelect={singleSelect}
          mrLineQuantity={mrLineQuantity}
          mrLineUnit={mrLineUnit}
          mrLineId={mrLineId}
        />
      )}

      {typeof window !== "undefined" &&
        modalContent &&
        createPortal(modalContent, document.body)}

      {typeof window !== "undefined" &&
        showFilterPopup &&
        createPortal(
          <FormPopUp
            header={"FILTER BOQ ITEMS"}
            setIsOpen={setShowFilterPopup}
            handleSubmit={handleFilterApply}
            addButtonLabel="CONFIRM"
            secondButton={
              <Button
                componentType={"button"}
                bgColor={"white"}
                borderColor={"black"}
                textColor={"black"}
                onClick={handleFilterReset}
              >
                RESET
              </Button>
            }
          >
            {/* Grouped Category / Subcategory filter */}
            <div style={{ marginBottom: "30px" }}>
              <h3
                style={{
                  marginBottom: "15px",
                  fontSize: "14px",
                  fontWeight: "600",
                }}
              >
                CATEGORY &amp; SUBCATEGORY
              </h3>
              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  padding: "10px",
                }}
              >
                {/* Search */}
                <div style={{ position: "relative", marginBottom: "15px" }}>
                  <input
                    type="text"
                    placeholder="SEARCH"
                    value={filterGroupSearch}
                    onChange={(e) => setFilterGroupSearch(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 40px 10px 15px",
                      borderRadius: "8px",
                      border: "1px solid rgba(223,223,223,1)",
                      fontSize: "14px",
                      backgroundColor: "rgba(245,245,245,1)",
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

                {/* Select All */}
                {(() => {
                  const allSubcats = allCategories.flatMap((c) =>
                    Object.keys(groupedBoqLines[c] || {}),
                  );
                  const allChecked =
                    allSubcats.length > 0 &&
                    allSubcats.every((sc) => tempFilterSubCategories.has(sc));
                  const anyChecked = allSubcats.some((sc) =>
                    tempFilterSubCategories.has(sc),
                  );
                  return (
                    <div style={{ marginBottom: "10px" }}>
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          cursor: "pointer",
                        }}
                      >
                        <FilterCheckbox
                          checked={allChecked}
                          indeterminate={!allChecked && anyChecked}
                          onChange={() => {
                            if (allChecked) {
                              setTempFilterSubCategories(new Set());
                              setTempFilterCategories(new Set());
                            } else {
                              setTempFilterSubCategories(new Set(allSubcats));
                              setTempFilterCategories(new Set(allCategories));
                            }
                          }}
                        />
                        <h4>Select All</h4>
                      </label>
                    </div>
                  );
                })()}

                {/* Groups */}
                <div style={{ maxHeight: "320px", overflowY: "auto" }}>
                  {(() => {
                    const q = filterGroupSearch.trim().toLowerCase();
                    const visibleGroups = allCategories
                      .map((cat) => ({
                        cat,
                        subcats: q
                          ? Object.keys(groupedBoqLines[cat] || {}).filter(
                              (sc) =>
                                sc.toLowerCase().includes(q) ||
                                cat.toLowerCase().includes(q),
                            )
                          : Object.keys(groupedBoqLines[cat] || {}),
                      }))
                      .filter((g) => g.subcats.length > 0);

                    if (visibleGroups.length === 0) {
                      return (
                        <div
                          style={{
                            textAlign: "center",
                            padding: "20px",
                            color: "#888",
                          }}
                        >
                          No results found
                        </div>
                      );
                    }

                    return visibleGroups.map(({ cat, subcats }) => {
                      const allSubcatsChecked =
                        subcats.length > 0 &&
                        subcats.every((sc) => tempFilterSubCategories.has(sc));
                      const someSubcatsChecked = subcats.some((sc) =>
                        tempFilterSubCategories.has(sc),
                      );
                      const isExpanded =
                        q !== "" ||
                        expandedFilterGroups.has(cat) ||
                        subcats.length === 1;

                      return (
                        <div key={cat} style={{ marginBottom: "10px" }}>
                          {/* Category header row */}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                            }}
                          >
                            <FilterCheckbox
                              checked={allSubcatsChecked}
                              indeterminate={
                                !allSubcatsChecked && someSubcatsChecked
                              }
                              onChange={() => toggleGroupedCategory(cat)}
                            />
                            <h4
                              style={{
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                flex: 1,
                              }}
                              onClick={() =>
                                setExpandedFilterGroups((prev) => {
                                  const next = new Set(prev);
                                  next.has(cat)
                                    ? next.delete(cat)
                                    : next.add(cat);
                                  return next;
                                })
                              }
                            >
                              {cat}
                              <span style={{ fontSize: "10px", color: "#888" }}>
                                {isExpanded ? "∧" : "∨"}
                              </span>
                            </h4>
                          </div>

                          {/* Subcategory items (indented) */}
                          {isExpanded && (
                            <div
                              style={{ marginLeft: "28px", marginTop: "8px" }}
                            >
                              {subcats.map((sc) => (
                                <div key={sc} style={{ marginBottom: "8px" }}>
                                  <label
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "10px",
                                      cursor: "pointer",
                                    }}
                                  >
                                    <FilterCheckbox
                                      checked={tempFilterSubCategories.has(sc)}
                                      onChange={() =>
                                        toggleGroupedSubCategory(sc)
                                      }
                                    />
                                    <h4>{sc}</h4>
                                  </label>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          </FormPopUp>,
          document.body,
        )}
    </>
  );
}
