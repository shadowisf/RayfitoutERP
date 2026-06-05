"use client";

import { createPortal } from "react-dom";
import FormPopUp from "@/app/components/FormPopup";
import { useEffect, useState, useMemo, useRef, Fragment, useCallback } from "react";
import { MrLine } from "../[id]/types/mrLine";
import { JoLine } from "../[id]/types/joLine";
import Button from "@/app/components/Button";
import { MrHeader } from "../[id]/types/mrHeader";
import { useAuth } from "@/app/context/AuthContext";
import DownloadBoqButton from "@/app/(protected)/project/[id]/boq/[boqId]/components/manager/_DownloadBoqButton";
import { formatPrice, formatPriceAED } from "@/lib/formatPrice";
import TableHeaderTooltipHover from "@/app/components/TableHeaderTooltipHover";

type BoqReferencePopUpProps = {
  mrHeader: MrHeader;
  item: MrLine | JoLine;
  joLine?: JoLine;
};

type BoqItemDetail = {
  id: number;
  item_number: string;
  item_name: string;
  item_description?: string;
  location?: string;
  scope_of_work?: string;
  quantity: number;
  unit: string;
  rate_per_quantity: number;
  total_cost: number;
  attachments?: string;
  boq_header_id: number;
  category: string;
  sub_category: string;
  category_number: number;
  subcategory_number: number;
  subcontracted_qty?: number;
  allocated_qty?: number | null;
};

// Grouped by category only for tabs and summary
type GroupedByCategory = {
  [category: string]: {
    category_number: number;
    boq_header_id: number;
    items: BoqItemDetail[];
    totalPrice: number;
    subCategories: string[];
  };
};

// Grouped by category.subcategory for ALL view
type GroupedBySubCategory = {
  [key: string]: {
    category: string;
    sub_category: string;
    category_number: number;
    subcategory_number: number;
    boq_header_id: number;
    items: BoqItemDetail[];
    totalPrice: number;
  };
};

type InventoryMatch = {
  inventory_item_id: number;
  inventory_description: string;
  unit: string;
  total_qty: number;
  locations: string[];
  match_type: "exact" | "similar";
};

type PurchaseHistoryEntry = {
  lpo_id: number;
  mr_header_id: number;
  material_description: string;
  lpo_date: string;
  quantity: number;
  unit: string;
  total_price: number;
  lpo_status: string;
};

// Helper function to format quantity without trailing zeroes
const formatQuantity = (quantity: number): string => {
  if (quantity === null || quantity === undefined) return "-";
  if (Number.isInteger(quantity)) return quantity.toString();
  return parseFloat(quantity.toString()).toString();
};

// Transform BoqItemDetail[] to GroupedBoqLines format for DownloadBoqButton
const transformToGroupedBoqLines = (items: BoqItemDetail[]): any => {
  const grouped: any = {};

  items.forEach((item) => {
    if (!grouped[item.category]) {
      grouped[item.category] = {};
    }
    if (!grouped[item.category][item.sub_category]) {
      grouped[item.category][item.sub_category] = [];
    }

    // Transform BoqItemDetail to match BoqLine structure expected by DownloadBoqButton
    const boqLine: any = {
      id: item.id,
      item_number: item.item_number,
      item_name: item.item_name,
      item_description: item.item_description,
      location: item.location,
      scope_of_work: item.scope_of_work,
      quantity: item.quantity,
      unit: item.unit,
      rate_per_quantity: item.rate_per_quantity,
      total_cost: item.total_cost,
      attachments: item.attachments,
      boq_id: item.boq_header_id,
      category: item.category,
      sub_category: item.sub_category,
      category_number: item.category_number,
      subcategory_number: item.subcategory_number,
    };

    grouped[item.category][item.sub_category].push(boqLine);
  });

  return grouped;
};

// Create a minimal boqHeader from mrHeader and items
const createBoqHeaderFromData = (
  mrHeader: MrHeader,
  items: BoqItemDetail[],
): any => {
  if (items.length === 0) return {};

  // Use the first item's boq_header_id to create a minimal header
  return {
    id: items[0]?.boq_header_id || 0,
    project_id: mrHeader.project_id,
    name: items[0]?.item_name || "BOQ Reference",
    boq_date: new Date().toISOString(),
    currency: "AED",
    project_name: mrHeader.project_name,
  };
};

export default function BoqReferencePopUp({
  item,
  mrHeader,
  joLine,
}: BoqReferencePopUpProps) {
  const { userInfo } = useAuth();

  const externalLinkIcon = "/icons/external-link.svg";
  const locationIcon = "/icons/location-boq.svg";
  const arrowRight = "/icons/arrow-right.svg";
  const searchIcon = "/icons/search.svg";

  const [isOpen, setIsOpen] = useState(false);
  const [boqItems, setBoqItems] = useState<BoqItemDetail[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Header panel: price stats + inventory matches
  const [priceStats, setPriceStats] = useState<{
    lowest_price: number | null;
    avg_price: number | null;
    prev_price: number | null;
  } | null>(null);
  const [inventoryMatches, setInventoryMatches] = useState<
    InventoryMatch[] | null
  >(null);

  // Purchase history per BOQ line
  const [expandedBoqRows, setExpandedBoqRows] = useState<Set<number>>(
    new Set(),
  );
  const [purchaseHistory, setPurchaseHistory] = useState<
    Record<number, PurchaseHistoryEntry[]>
  >({});
  const [loadingHistory, setLoadingHistory] = useState<Set<number>>(new Set());

  // Item description at component level (needed by price hover popups)
  const itemDescription = (item as any).material_description || (item as any).description || "";

  // Price hover popup state
  type PriceHoverRow = {
    lpo_id: number;
    mr_header_id: number;
    project_name: string;
    vendor_name: string;
    unit_price: number;
  };
  const [hoveredLowestRect, setHoveredLowestRect] = useState<DOMRect | null>(null);
  const [hoveredPrevRect, setHoveredPrevRect] = useState<DOMRect | null>(null);
  const [priceHoverCache, setPriceHoverCache] = useState<
    Record<string, { lowest?: PriceHoverRow | "loading" | null; prev?: PriceHoverRow | "loading" | null }>
  >({});
  const lowestHideTimer = useRef<NodeJS.Timeout | null>(null);
  const prevHideTimer = useRef<NodeJS.Timeout | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Fetch BOQ items
  useEffect(() => {
    if (!isOpen || !item.boq_line_ids || !mrHeader.project_id) return;

    setIsLoading(true);

    const boqIdsArray = item.boq_line_ids
      .split(",")
      .map((id: string) => parseInt(id.trim()))
      .filter((id: number) => !isNaN(id));

    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/boq/getAllBoqLinesWithNumberRef`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: mrHeader.project_id,
          ...(joLine ? { jo_line_id: joLine.id } : { mr_line_id: item.id }),
        }),
      },
    )
      .then((res) => res.json())
      .then((allBoqLines) => {
        const filteredItems = allBoqLines
          .filter((boqLine: any) => boqIdsArray.includes(boqLine.id))
          .map((boqLine: any) => ({
            id: boqLine.id,
            item_number: boqLine.item_number,
            item_name: boqLine.item_name,
            item_description: boqLine.item_description,
            location: boqLine.location,
            scope_of_work: boqLine.scope_of_work,
            quantity: boqLine.quantity,
            unit: boqLine.unit,
            rate_per_quantity: boqLine.rate_per_quantity,
            total_cost: boqLine.total_cost,
            attachments: boqLine.attachments,
            boq_header_id: boqLine.boq_id,
            category: boqLine.category,
            sub_category: boqLine.sub_category,
            category_number: boqLine.category_number,
            subcategory_number: boqLine.subcategory_number,
            subcontracted_qty: boqLine.subcontracted_qty,
            allocated_qty: boqLine.allocated_qty ?? null,
          }));

        setBoqItems(filteredItems);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching BOQ items:", error);
        setIsLoading(false);
      });
  }, [isOpen, item.boq_line_ids, mrHeader.project_id]);

  // Auto-fetch purchase history for all BOQ items (MR context only)
  useEffect(() => {
    if (!showBudgetUtilizationBar || boqItems.length === 0) return;
    boqItems.forEach((boqItem) => {
      if (purchaseHistory[boqItem.id] !== undefined) return; // already fetched
      setLoadingHistory((prev) => new Set(prev).add(boqItem.id));
      fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/boq/getPurchaseHistoryByBoqLineID`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ boq_line_id: boqItem.id }),
        },
      )
        .then((res) => (res.ok ? res.json() : []))
        .then((data: PurchaseHistoryEntry[]) => {
          setPurchaseHistory((prev) => ({ ...prev, [boqItem.id]: data }));
        })
        .catch(() => {
          setPurchaseHistory((prev) => ({ ...prev, [boqItem.id]: [] }));
        })
        .finally(() => {
          setLoadingHistory((prev) => {
            const next = new Set(prev);
            next.delete(boqItem.id);
            return next;
          });
        });
    });
  }, [boqItems]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch price stats + inventory matches when popup opens
  useEffect(() => {
    if (!isOpen) return;

    const itemDescription: string =
      (item as any).material_description || (item as any).description || "";
    const predefinedId: number = (item as any).predefined_item_id ?? 0;

    if (!itemDescription) return;

    async function fetchPriceStats() {
      try {
        const encoded = encodeURIComponent(itemDescription);
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMaterialPriceStats?materials=${encoded}`,
        );
        if (res.ok) {
          const data = await res.json();
          setPriceStats(data[itemDescription] ?? null);
        }
      } catch {
        setPriceStats(null);
      }
    }

    async function fetchInventoryMatches() {
      setInventoryMatches(null);
      try {
        const encoded = encodeURIComponent(itemDescription);
        const encodedId = encodeURIComponent(String(predefinedId));
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getInventoryStatus?materials=${encoded}&predefined_ids=${encodedId}`,
        );
        if (res.ok) {
          const data = await res.json();
          setInventoryMatches(data[itemDescription] ?? []);
        } else {
          setInventoryMatches([]);
        }
      } catch {
        setInventoryMatches([]);
      }
    }

    fetchPriceStats();
    fetchInventoryMatches();
  }, [isOpen, item]);

  // Group by category only (for tabs and summary)
  const groupedByCategory = useMemo(() => {
    const grouped: GroupedByCategory = {};

    boqItems.forEach((boqItem) => {
      const catKey = boqItem.category;

      if (!grouped[catKey]) {
        grouped[catKey] = {
          category_number: boqItem.category_number,
          boq_header_id: boqItem.boq_header_id,
          items: [],
          totalPrice: 0,
          subCategories: [],
        };
      }

      grouped[catKey].items.push(boqItem);
      const itemCost =
        Number(boqItem.total_cost) ||
        Number(boqItem.rate_per_quantity) * Number(boqItem.quantity) ||
        0;
      grouped[catKey].totalPrice += itemCost;

      if (!grouped[catKey].subCategories.includes(boqItem.sub_category)) {
        grouped[catKey].subCategories.push(boqItem.sub_category);
      }
    });

    return Object.entries(grouped)
      .sort(([, a], [, b]) => a.category_number - b.category_number)
      .reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {} as GroupedByCategory);
  }, [boqItems]);

  // Group by category.subcategory (for ALL view display)
  const groupedBySubCategory = useMemo(() => {
    const grouped: GroupedBySubCategory = {};

    boqItems.forEach((boqItem) => {
      const key = `${boqItem.category_number}.${boqItem.subcategory_number}`;

      if (!grouped[key]) {
        grouped[key] = {
          category: boqItem.category,
          sub_category: boqItem.sub_category,
          category_number: boqItem.category_number,
          subcategory_number: boqItem.subcategory_number,
          boq_header_id: boqItem.boq_header_id,
          items: [],
          totalPrice: 0,
        };
      }

      grouped[key].items.push(boqItem);
      grouped[key].totalPrice +=
        Number(boqItem.total_cost) ||
        Number(boqItem.rate_per_quantity) * Number(boqItem.quantity) ||
        0;
    });

    return Object.entries(grouped)
      .sort(([, a], [, b]) => {
        if (a.category_number !== b.category_number) {
          return a.category_number - b.category_number;
        }
        return a.subcategory_number - b.subcategory_number;
      })
      .reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {} as GroupedBySubCategory);
  }, [boqItems]);

  // Filter based on search
  const filteredByCategory = useMemo(() => {
    if (!searchQuery.trim()) return groupedByCategory;

    const query = searchQuery.toLowerCase();
    const filtered: GroupedByCategory = {};

    Object.entries(groupedByCategory).forEach(([category, group]) => {
      const matchingItems = group.items.filter((item) => {
        return (
          item.item_number?.toLowerCase().includes(query) ||
          item.item_name?.toLowerCase().includes(query) ||
          item.item_description?.toLowerCase().includes(query) ||
          item.location?.toLowerCase().includes(query)
        );
      });

      if (matchingItems.length > 0) {
        filtered[category] = {
          ...group,
          items: matchingItems,
          totalPrice: matchingItems.reduce(
            (sum, item) =>
              sum +
              (Number(item.total_cost) ||
                Number(item.rate_per_quantity) * Number(item.quantity) ||
                0),
            0,
          ),
          subCategories: [
            ...new Set(matchingItems.map((item) => item.sub_category)),
          ],
        };
      }
    });

    return filtered;
  }, [groupedByCategory, searchQuery]);

  const filteredBySubCategory = useMemo(() => {
    if (!searchQuery.trim()) return groupedBySubCategory;

    const query = searchQuery.toLowerCase();
    const filtered: GroupedBySubCategory = {};

    Object.entries(groupedBySubCategory).forEach(([key, group]) => {
      const matchingItems = group.items.filter((item) => {
        return (
          item.item_number?.toLowerCase().includes(query) ||
          item.item_name?.toLowerCase().includes(query) ||
          item.item_description?.toLowerCase().includes(query) ||
          item.location?.toLowerCase().includes(query)
        );
      });

      if (matchingItems.length > 0) {
        filtered[key] = {
          ...group,
          items: matchingItems,
          totalPrice: matchingItems.reduce(
            (sum, item) =>
              sum +
              (Number(item.total_cost) ||
                Number(item.rate_per_quantity) * Number(item.quantity) ||
                0),
            0,
          ),
        };
      }
    });

    return filtered;
  }, [groupedBySubCategory, searchQuery]);

  const categoryKeys = Object.keys(filteredByCategory);
  const subCategoryKeys = Object.keys(filteredBySubCategory);

  const activeCategoryData =
    activeCategory !== "ALL" && activeCategory !== "SUMMARY"
      ? filteredByCategory[activeCategory]
      : null;

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } =
        scrollContainerRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -300 : 300,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [categoryKeys]);

  // Calculate grand total
  const grandTotal = useMemo(() => {
    return Object.values(filteredByCategory).reduce(
      (sum, group) => sum + group.totalPrice,
      0,
    );
  }, [filteredByCategory]);

  const canSeePrice =
    userInfo?.departmentID === 8 ||
    userInfo?.departmentID === 12 ||
    userInfo?.departmentID === 10 ||
    userInfo?.departmentID === 16;

  // Works value is visible to Management (8), Procurement (9), and QS (16)
  const canSeeWorksValue =
    userInfo?.departmentID === 8 ||
    userInfo?.departmentID === 9 ||
    userInfo?.departmentID === 16;

  // Whether to show JO-specific subcontracted columns
  const showJoColumns = !!joLine;

  // Whether to show MR-specific allocated qty + total cost columns
  // Both joLine (JO context) and absence of material_description (PR/payment context) exclude these columns
  const showAllocatedQty = !joLine && !!(item as any).material_description;
  // Budget utilization bar: same condition — alias kept for readability
  const showBudgetUtilizationBar = showAllocatedQty;

  // Grand total of subcontracted works value (subcontracted_qty × rate_per_quantity) across all filtered items
  const grandSubcontractedWorksValue = useMemo(() => {
    if (!showJoColumns) return 0;
    return Object.values(filteredByCategory)
      .flatMap((g) => g.items)
      .reduce(
        (sum, i) =>
          sum +
          (Number(i.subcontracted_qty) || 0) *
            (Number(i.rate_per_quantity) || 0),
        0,
      );
  }, [filteredByCategory, showJoColumns]);

  // Helper for alternating row background
  const getRowBgColor = (index: number): string => {
    return index % 2 === 0 ? "white" : "rgba(246, 246, 246, 1)";
  };

  // Transform boqItems for DownloadBoqButton - use filtered items based on current view
  const downloadBoqLines = useMemo(() => {
    let itemsToDownload: BoqItemDetail[] = [];

    if (activeCategory === "ALL") {
      // Use all filtered items
      itemsToDownload = Object.values(filteredBySubCategory).flatMap(
        (group) => group.items,
      );
    } else if (activeCategory === "SUMMARY") {
      // Use all filtered items from all categories
      itemsToDownload = Object.values(filteredByCategory).flatMap(
        (group) => group.items,
      );
    } else if (activeCategoryData) {
      // Use items from selected category
      itemsToDownload = activeCategoryData.items;
    }

    return transformToGroupedBoqLines(itemsToDownload);
  }, [
    activeCategory,
    activeCategoryData,
    filteredByCategory,
    filteredBySubCategory,
  ]);

  // Create boqHeader for download
  const downloadBoqHeader = useMemo(() => {
    return createBoqHeaderFromData(mrHeader, boqItems);
  }, [mrHeader, boqItems]);

  // Get item name for download
  const itemName = useMemo(() => {
    return (
      (item as any).material_description ||
      (item as any).description ||
      "Unknown"
    );
  }, [item]);

  const startLowestHideTimer = useCallback(() => {
    if (lowestHideTimer.current) clearTimeout(lowestHideTimer.current);
    lowestHideTimer.current = setTimeout(() => setHoveredLowestRect(null), 120);
  }, []);

  const cancelLowestHideTimer = useCallback(() => {
    if (lowestHideTimer.current) { clearTimeout(lowestHideTimer.current); lowestHideTimer.current = null; }
  }, []);

  const startPrevHideTimer = useCallback(() => {
    if (prevHideTimer.current) clearTimeout(prevHideTimer.current);
    prevHideTimer.current = setTimeout(() => setHoveredPrevRect(null), 120);
  }, []);

  const cancelPrevHideTimer = useCallback(() => {
    if (prevHideTimer.current) { clearTimeout(prevHideTimer.current); prevHideTimer.current = null; }
  }, []);

  const fetchPriceHoverDetail = useCallback(
    async (desc: string, type: "lowest" | "prev") => {
      if (priceHoverCache[desc]?.[type] !== undefined) return;
      setPriceHoverCache((prev) => ({ ...prev, [desc]: { ...prev[desc], [type]: "loading" } }));
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMaterialPriceHoverDetail?material=${encodeURIComponent(desc)}&type=${type}`,
        );
        const data = res.ok ? await res.json() : null;
        setPriceHoverCache((prev) => ({ ...prev, [desc]: { ...prev[desc], [type]: data } }));
      } catch {
        setPriceHoverCache((prev) => ({ ...prev, [desc]: { ...prev[desc], [type]: null } }));
      }
    },
    [priceHoverCache],
  );

  async function togglePurchaseHistory(boqLineId: number) {
    if (expandedBoqRows.has(boqLineId)) {
      setExpandedBoqRows((prev) => {
        const next = new Set(prev);
        next.delete(boqLineId);
        return next;
      });
      return;
    }
    setExpandedBoqRows((prev) => new Set(prev).add(boqLineId));
    if (purchaseHistory[boqLineId] !== undefined) return; // already fetched
    setLoadingHistory((prev) => new Set(prev).add(boqLineId));
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/boq/getPurchaseHistoryByBoqLineID`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ boq_line_id: boqLineId }),
        },
      );
      if (res.ok) {
        const data: PurchaseHistoryEntry[] = await res.json();
        setPurchaseHistory((prev) => ({ ...prev, [boqLineId]: data }));
      } else {
        setPurchaseHistory((prev) => ({ ...prev, [boqLineId]: [] }));
      }
    } catch {
      setPurchaseHistory((prev) => ({ ...prev, [boqLineId]: [] }));
    } finally {
      setLoadingHistory((prev) => {
        const next = new Set(prev);
        next.delete(boqLineId);
        return next;
      });
    }
  }

  function renderPurchaseHistoryTable(boqItem: BoqItemDetail) {
    const budget = Number(boqItem.rate_per_quantity) * Number(boqItem.quantity);
    const history = purchaseHistory[boqItem.id] ?? [];
    const isLoading = loadingHistory.has(boqItem.id);

    let runningTotal = 0;

    // Aggregate quantities by unit for the TOTAL row
    const totalQtyByUnit: Record<string, number> = {};
    history.forEach((e) => {
      totalQtyByUnit[e.unit] =
        (totalQtyByUnit[e.unit] || 0) + Number(e.quantity);
    });
    const totalQtyStr = Object.entries(totalQtyByUnit)
      .map(([unit, qty]) => `${formatQuantity(qty)} ${unit}`)
      .join(" + ");
    const totalSpend = history.reduce((s, e) => s + Number(e.total_price), 0);
    const totalPct = budget > 0 ? (totalSpend / budget) * 100 : 0;
    const totalPnl = budget - totalSpend;

    return (
      <div
        style={{
          paddingTop: "24px",
          paddingBottom: "24px",
          paddingLeft: "30px",
          paddingRight: "30px",
        }}
      >
        <table
          className="items-table"
          style={{ tableLayout: "fixed", width: "100%" }}
        >
          <colgroup>
            <col style={{ width: "150px" }} />
            <col />
            <col style={{ width: "140px" }} />
            <col style={{ width: "140px" }} />
            <col style={{ width: "150px" }} />
            <col style={{ width: "260px" }} />
            <col style={{ width: "140px" }} />
          </colgroup>
          <thead>
            <tr>
              {[
                "LPO NUMBER",
                "MATERIAL",
                "DATE",
                "QTY",
                "TOTAL COST",
                "BUDGET UTILIZATION",
                "RUNNING PNL",
              ].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7}>Loading…</td>
              </tr>
            ) : history.length === 0 ? (
              <tr>
                <td colSpan={7}>No purchase history</td>
              </tr>
            ) : (
              <>
                {history.map((entry, idx) => {
                  runningTotal += Number(entry.total_price);
                  const pct = budget > 0 ? (runningTotal / budget) * 100 : 0;
                  const pnl = budget - runningTotal;
                  const over = pnl < 0;
                  const barColor = over
                    ? "rgba(220,38,38,1)"
                    : "rgba(34,197,94,1)";
                  const pnlColor = over
                    ? "rgba(220,38,38,1)"
                    : "rgba(34,150,100,1)";
                  const dateStr = new Date(entry.lpo_date)
                    .toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                    .toUpperCase();

                  return (
                    <tr key={`${entry.lpo_id}-${idx}`}>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <a
                          href={`/mr/${entry.mr_header_id}/lpo/${entry.lpo_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: "rgba(37,150,190,1)",
                            fontWeight: 600,
                            textDecoration: "none",
                          }}
                        >
                          LPO-{String(entry.lpo_id).padStart(5, "0")}
                        </a>
                      </td>
                      <td>{entry.material_description}</td>
                      <td style={{ whiteSpace: "nowrap" }}>{dateStr}</td>
                      <td
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatQuantity(Number(entry.quantity))} {entry.unit}
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {formatPriceAED(Number(entry.total_price))}
                      </td>
                      <td>
                        <div
                          className="tooltip-bar"
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "4px",
                          }}
                        >
                          <span className="tooltip-label">
                            <span
                              style={{
                                color: over
                                  ? "rgba(220,38,38,1)"
                                  : "rgba(34,150,100,1)",
                              }}
                            >
                              {formatPriceAED(runningTotal)}
                            </span>
                            {" / "}
                            {formatPriceAED(budget)}
                          </span>
                          <span
                            style={{
                              fontSize: "11px",
                              color: barColor,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {parseFloat(pct.toFixed(2))}%
                          </span>
                          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            {over && (
                              <img src="/icons/warning.svg" alt="over budget" style={{ width: "12px", height: "12px", flexShrink: 0 }} />
                            )}
                            <div
                              style={{
                                flex: 1,
                                height: "6px",
                                borderRadius: "3px",
                                backgroundColor: "rgba(220,220,220,1)",
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  width: `${Math.min(pct, 100)}%`,
                                  height: "100%",
                                  backgroundColor: barColor,
                                  borderRadius: "3px",
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </td>
                      <td
                        style={{
                          whiteSpace: "nowrap",
                          fontWeight: 600,
                          color: pnlColor,
                        }}
                      >
                        {over
                          ? `- ${formatPriceAED(Math.abs(pnl))}`
                          : `+ ${formatPriceAED(pnl)}`}
                      </td>
                    </tr>
                  );
                })}

                {/* TOTAL row */}
                <tr style={{ fontWeight: 700 }}>
                  <td></td>
                  <td style={{ fontSize: "11px", letterSpacing: "0.05em" }}>
                    TOTAL
                  </td>
                  <td></td>
                  <td
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {totalQtyStr}
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {formatPriceAED(totalSpend)}
                  </td>
                  <td>
                    <div
                      className="tooltip-bar"
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                      }}
                    >
                      <span className="tooltip-label">
                        <span
                          style={{
                            color:
                              totalPnl < 0
                                ? "rgba(220,38,38,1)"
                                : "rgba(34,150,100,1)",
                          }}
                        >
                          {formatPriceAED(totalSpend)}
                        </span>
                        {" / "}
                        {formatPriceAED(budget)}
                      </span>
                      <span
                        style={{
                          fontSize: "11px",
                          color:
                            totalPnl < 0
                              ? "rgba(220,38,38,1)"
                              : "rgba(34,197,94,1)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {parseFloat(totalPct.toFixed(2))}%
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        {totalPnl < 0 && (
                          <img src="/icons/warning.svg" alt="over budget" style={{ width: "12px", height: "12px", flexShrink: 0 }} />
                        )}
                        <div
                          style={{
                            flex: 1,
                            height: "6px",
                            borderRadius: "3px",
                            backgroundColor: "rgba(220,220,220,1)",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${Math.min(totalPct, 100)}%`,
                              height: "100%",
                              backgroundColor:
                                totalPnl < 0
                                  ? "rgba(220,38,38,1)"
                                  : "rgba(34,197,94,1)",
                              borderRadius: "3px",
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </td>
                  <td
                    style={{
                      whiteSpace: "nowrap",
                      color:
                        totalPnl < 0
                          ? "rgba(220,38,38,1)"
                          : "rgba(34,150,100,1)",
                    }}
                  >
                    {totalPnl < 0
                      ? `- ${formatPriceAED(Math.abs(totalPnl))}`
                      : `+ ${formatPriceAED(totalPnl)}`}
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <>
      <Button
        componentType={"button"}
        bgColor={"rgba(239, 239, 239, 1)"}
        borderColor={"rgba(223, 223, 223, 1)"}
        textColor={"black"}
        onClick={(e) => {
          e.preventDefault();
          setIsOpen(true);
          setActiveCategory("ALL");
          setSearchQuery("");
        }}
        style={{ padding: "7px 7px" }}
      >
        <img src={externalLinkIcon} alt="external link icon" />
      </Button>

      {isOpen && (
        <FormPopUp
          header={(() => {
            const uniqueBoqIds = [
              ...new Set(boqItems.map((b) => b.boq_header_id)),
            ];
            if (uniqueBoqIds.length > 0 && uniqueBoqIds[0]) {
              return (
                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    alignItems: "center",
                  }}
                >
                  BOQ-{uniqueBoqIds[0].toString().padStart(5, "0")}
                  {(userInfo?.departmentID === 8 ||
                    userInfo?.departmentID === 16) && (
                    <Button
                      componentType={"link"}
                      bgColor={"rgba(239, 239, 239, 1)"}
                      borderColor={"rgba(223, 223, 223, 1)"}
                      textColor={"black"}
                      href={`/project/${mrHeader.project_id}/boq/${uniqueBoqIds[0]}`}
                      style={{ padding: "7px 7px" }}
                    >
                      <img src={externalLinkIcon} alt="Open BOQ" />
                    </Button>
                  )}
                </div>
              );
            }
          })()}
          setIsOpen={setIsOpen}
          haveLoadingState={true}
          style={{
            whiteSpace: "pre-wrap",
            width: "95dvw",
            height: "95dvh",
          }}
        >
          <div className="boq-ref-popup">
          {isLoading ? (
            /* ── Skeleton loading ── */
            <div>
              {/* Top two-column skeleton */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "24px", marginBottom: "24px" }}>
                {/* Left box */}
                <div style={{ backgroundColor: "rgba(248,248,248,1)", borderRadius: "10px", padding: "18px 24px" }}>
                  <div className="skeleton-pulse" style={{ height: "18px", borderRadius: "6px", width: "70%", marginBottom: "8px" }} />
                  <div className="skeleton-pulse" style={{ height: "12px", borderRadius: "6px", width: "40%", marginBottom: "36px" }} />
                  <div style={{ display: "flex", gap: "32px" }}>
                    {[1,2,3].map((i) => (
                      <div key={i}>
                        <div className="skeleton-pulse" style={{ height: "10px", borderRadius: "4px", width: "60px", marginBottom: "6px" }} />
                        <div className="skeleton-pulse" style={{ height: "16px", borderRadius: "4px", width: "80px" }} />
                      </div>
                    ))}
                  </div>
                </div>
                {/* Right: inventory status table */}
                <table className="items-table fixed-layout">
                  <thead>
                    <tr>
                      {[70, 50, 60, 55].map((w, idx) => (
                        <th key={idx}><div className="skeleton-pulse" style={{ height: "10px", borderRadius: "4px", width: `${w}%` }} /></th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[1,2,3].map((i) => (
                      <tr key={i}>
                        <td><div className="skeleton-pulse" style={{ height: "14px", borderRadius: "4px" }} /></td>
                        <td><div className="skeleton-pulse" style={{ height: "14px", borderRadius: "4px", width: "60px" }} /></td>
                        <td><div className="skeleton-pulse" style={{ height: "14px", borderRadius: "4px" }} /></td>
                        <td><div className="skeleton-pulse" style={{ height: "22px", borderRadius: "25px", width: "100px" }} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Tab bar skeleton */}
              <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
                {[1,2,3].map((i) => (
                  <div key={i} className="skeleton-pulse" style={{ height: "34px", width: "120px", borderRadius: "6px" }} />
                ))}
                <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
                  <div className="skeleton-pulse" style={{ height: "34px", width: "34px", borderRadius: "6px" }} />
                  <div className="skeleton-pulse" style={{ height: "34px", width: "200px", borderRadius: "6px" }} />
                </div>
              </div>
              {/* Section header skeleton */}
              <div className="skeleton-pulse" style={{ height: "14px", width: "300px", borderRadius: "4px", marginBottom: "12px" }} />
              {/* BOQ items table */}
              <table className="items-table">
                <thead>
                  <tr>
                    {[20, 65, 40, 30, 55, 50, 55, 60].map((w, idx) => (
                      <th key={idx}><div className="skeleton-pulse" style={{ height: "10px", borderRadius: "4px", width: `${w}%` }} /></th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[1,2,3,4].map((i) => (
                    <tr key={i}>
                      <td><div className="skeleton-pulse" style={{ height: "12px", borderRadius: "4px", width: "30px" }} /></td>
                      <td>
                        <div className="skeleton-pulse" style={{ height: "13px", borderRadius: "4px", marginBottom: "6px", width: "80%" }} />
                        <div className="skeleton-pulse" style={{ height: "11px", borderRadius: "4px", width: "60%" }} />
                      </td>
                      <td><div className="skeleton-pulse" style={{ height: "12px", borderRadius: "4px", width: "60px" }} /></td>
                      <td><div className="skeleton-pulse" style={{ height: "12px", borderRadius: "4px", width: "40px" }} /></td>
                      <td><div className="skeleton-pulse" style={{ height: "12px", borderRadius: "4px", width: "60px" }} /></td>
                      <td><div className="skeleton-pulse" style={{ height: "12px", borderRadius: "4px", width: "70px" }} /></td>
                      <td><div className="skeleton-pulse" style={{ height: "12px", borderRadius: "4px", width: "70px" }} /></td>
                      <td><div className="skeleton-pulse" style={{ height: "12px", borderRadius: "4px", width: "40px" }} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
          <>
            {/* Header: item info (left) + inventory status (right) */}
            {(() => {
              const itemDescription: string =
                (item as any).material_description ||
                (item as any).description ||
                "";
              const itemCategory: string =
                (item as any).material_category || "";
              const itemSubCategory: string =
                (item as any).material_subcategory || "";
              const itemQty = (item as any).quantity;
              const itemUnit: string = (item as any).unit || "";
              const categoryLabel = [itemCategory, itemSubCategory]
                .filter(Boolean)
                .join(" / ");

              return (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1.5fr",
                    gap: "24px",
                    marginBottom: "24px",
                    alignItems: "flex-start",
                  }}
                >
                  {/* Left: item info + price stats */}
                  <div
                    style={{
                      backgroundColor: "rgba(248,248,248,1)",
                      borderRadius: "10px",
                      padding: "18px 24px",
                    }}
                  >
                    <h2
                      style={{
                        margin: "4px 0 0",
                        fontSize: "16px",
                        fontWeight: 700,
                      }}
                    >
                      {itemDescription}
                      {itemQty
                        ? ` • ${formatQuantity(Number(itemQty))} ${itemUnit}`
                        : ""}
                    </h2>
                    <div style={{ marginBottom: "14px" }}>
                      {categoryLabel && (
                        <small style={{ color: "rgba(120,120,120,1)" }}>
                          {categoryLabel}
                        </small>
                      )}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: "32px",
                        marginTop: "50px",
                      }}
                    >
                      {(
                        [
                          {
                            label: "LOWEST PRICE",
                            value: priceStats?.lowest_price,
                          },
                          { label: "AVG. PRICE", value: priceStats?.avg_price },
                          {
                            label: "PREV. PRICE",
                            value: priceStats?.prev_price,
                          },
                        ] as const
                      ).map(({ label, value }) => {
                        const isLowest = label === "LOWEST PRICE";
                        const isPrev = label === "PREV. PRICE";
                        const hasHover =
                          (isLowest && priceStats?.lowest_price != null) ||
                          (isPrev && priceStats?.prev_price != null);
                        return (
                          <div
                            key={label}
                            onMouseEnter={
                              isLowest && priceStats?.lowest_price != null
                                ? (e) => {
                                    cancelLowestHideTimer();
                                    setHoveredLowestRect(
                                      (e.currentTarget as HTMLElement).getBoundingClientRect(),
                                    );
                                    fetchPriceHoverDetail(itemDescription, "lowest");
                                  }
                                : isPrev && priceStats?.prev_price != null
                                ? (e) => {
                                    cancelPrevHideTimer();
                                    setHoveredPrevRect(
                                      (e.currentTarget as HTMLElement).getBoundingClientRect(),
                                    );
                                    fetchPriceHoverDetail(itemDescription, "prev");
                                  }
                                : undefined
                            }
                            onMouseLeave={
                              isLowest && priceStats?.lowest_price != null
                                ? startLowestHideTimer
                                : isPrev && priceStats?.prev_price != null
                                ? startPrevHideTimer
                                : undefined
                            }
                            style={hasHover ? { cursor: "default" } : undefined}
                          >
                            <small>{label}</small>
                            <h3>
                              {value != null ? formatPriceAED(value) : "N/A"}
                            </h3>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right: inventory status table */}
                  <table className="items-table fixed-layout">
                    <colgroup>
                      <col />
                      <col style={{ width: "150px" }} />
                      <col style={{ width: "225px" }} />
                      <col style={{ width: "175px" }} />
                    </colgroup>
                    <thead>
                      <tr style={{ backgroundColor: "rgba(247,247,247,1)" }}>
                          <th>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                              INVENTORY STATUS
                              <TableHeaderTooltipHover width={320}>
                                <strong>Exact Match:</strong><br />
                                The system uses unique material ID references to search the inventory database for the exact requested material, even if it exists under a different inventory name or description.<br /><br />
                                <strong>Similar Match:</strong><br />
                                The system searches for the closest matching inventory items based on material names, keywords, and character similarity to help identify possible alternatives or related stock.<br /><br />
                                <strong>No Match:</strong><br />
                                The system could not find any matching or similar inventory items for the requested material.
                              </TableHeaderTooltipHover>
                            </span>
                          </th>
                          <th>QTY AVAILABLE</th>
                          <th>LOCATION</th>
                          <th>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventoryMatches === null ? (
                        <tr>
                          <td
                            colSpan={4}
                            style={{
                              padding: "14px",
                              color: "rgba(150,150,150,1)",
                              fontSize: "12px",
                            }}
                          >
                            Loading…
                          </td>
                        </tr>
                      ) : inventoryMatches.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            style={{
                              padding: "14px",
                              color: "rgba(150,150,150,1)",
                              fontSize: "12px",
                            }}
                          >
                            No inventory matches found
                          </td>
                        </tr>
                      ) : (
                        <>
                          {inventoryMatches.slice(0, 3).map((m) => (
                            <tr
                              key={m.inventory_item_id}
                              style={{
                                borderBottom: "1px solid rgba(239,239,239,1)",
                              }}
                            >
                              <td>
                                <a
                                  href={`/inventory/${m.inventory_item_id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    color: "rgba(37,150,190,1)",
                                    fontWeight: 600,
                                    textDecoration: "none",
                                  }}
                                >
                                  {m.inventory_description}
                                </a>
                              </td>
                              <td>
                                {m.total_qty} {m.unit}
                              </td>
                              <td>
                                {m.locations && m.locations.length > 0
                                  ? m.locations.join(" + ")
                                  : "—"}
                              </td>
                              <td>
                                <span
                                  style={{
                                    display: "inline-block",
                                    padding: "3px 10px",
                                    borderRadius: "50px",
                                    fontSize: "11px",
                                    fontWeight: 600,
                                    backgroundColor:
                                      m.match_type === "exact"
                                        ? "rgba(6,95,70,1)"
                                        : "rgba(209,250,229,1)",
                                    color:
                                      m.match_type === "exact"
                                        ? "rgba(209,250,229,1)"
                                        : "rgba(6,95,70,1)",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {m.match_type === "exact"
                                    ? "Exact Match"
                                    : "Similar Match"}
                                </span>
                              </td>
                            </tr>
                          ))}
                          {inventoryMatches.length > 3 && (
                            <tr>
                              <td
                                colSpan={4}
                                style={{
                                  padding: "8px 14px",
                                  color: "rgba(37,150,190,1)",
                                  fontSize: "11px",
                                }}
                              >
                                …and {inventoryMatches.length - 3} more match
                                {inventoryMatches.length - 3 !== 1 ? "es" : ""}
                              </td>
                            </tr>
                          )}
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              );
            })()}

            {/* Search + Category tabs + Download — all inline */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "16px",
                marginBottom: "20px",
              }}
            >
              {/* Category Grid - takes remaining space */}
              <div
                className="category-grid"
                style={{ flex: 1, marginBottom: 0 }}
              >
                <div style={{ position: "relative", flex: 1 }}>
                  {/* Left Fade Gradient */}
                  {showLeftArrow && (
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: "300px",
                        background:
                          "linear-gradient(to right, white 0%, rgba(255, 255, 255, 0) 100%)",
                        pointerEvents: "none",
                        zIndex: 5,
                      }}
                    />
                  )}

                  {/* Left Arrow Button */}
                  {showLeftArrow && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        scroll("left");
                      }}
                      style={{
                        position: "absolute",
                        left: "10px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        zIndex: 10,
                        backgroundColor: "black",
                        color: "white",
                        border: "none",
                        borderRadius: "10px",
                        width: "40px",
                        height: "40px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                      }}
                    >
                      <img
                        src={arrowRight}
                        style={{ transform: "rotate(-180deg)", width: "12px" }}
                        alt="scroll left"
                      />
                    </button>
                  )}

                  <div
                    ref={scrollContainerRef}
                    onScroll={checkScroll}
                    style={{
                      overflowX: "auto",
                      scrollbarWidth: "none",
                      msOverflowStyle: "none",
                    }}
                  >
                    <style jsx>{`
                      div::-webkit-scrollbar {
                        display: none;
                      }
                    `}</style>
                    <div style={{ display: "flex", gap: "1px" }}>
                      {/* SUMMARY tab - only if canSeePrice */}
                      {canSeePrice && (
                        <div
                          className={`item ${activeCategory === "SUMMARY" ? "active" : ""}`}
                          onClick={() => setActiveCategory("SUMMARY")}
                          style={{
                            flexShrink: 0,
                            textTransform: "uppercase",
                            cursor: "pointer",
                          }}
                        >
                          SUMMARY
                        </div>
                      )}

                      {/* ALL tab */}
                      <div
                        className={`item ${activeCategory === "ALL" ? "active" : ""}`}
                        onClick={() => setActiveCategory("ALL")}
                        style={{
                          flexShrink: 0,
                          textTransform: "uppercase",
                          cursor: "pointer",
                        }}
                      >
                        ALL
                      </div>

                      {/* Category tabs - grouped by category only */}
                      {categoryKeys.map((category) => {
                        const group = filteredByCategory[category];
                        return (
                          <div
                            key={category}
                            className={`item ${activeCategory === category ? "active" : ""}`}
                            onClick={() => setActiveCategory(category)}
                            style={{
                              flexShrink: 0,
                              cursor: "pointer",
                              textTransform: "uppercase",
                            }}
                          >
                            {category}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Fade Gradient */}
                  {showRightArrow && (
                    <div
                      style={{
                        position: "absolute",
                        right: 0,
                        top: 0,
                        bottom: 0,
                        width: "300px",
                        background:
                          "linear-gradient(to left, white 0%, rgba(255, 255, 255, 0) 100%)",
                        pointerEvents: "none",
                        zIndex: 5,
                      }}
                    />
                  )}

                  {/* Right Arrow Button */}
                  {showRightArrow && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        scroll("right");
                      }}
                      style={{
                        position: "absolute",
                        right: "10px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        zIndex: 10,
                        backgroundColor: "black",
                        borderRadius: "10px",
                        color: "white",
                        border: "none",
                        width: "40px",
                        height: "40px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                      }}
                    >
                      <img
                        src={arrowRight}
                        style={{ width: "12px" }}
                        alt="scroll right"
                      />
                    </button>
                  )}
                </div>
              </div>
              {/* end category-grid */}

              <div
                style={{ display: "flex", gap: "10px", alignItems: "center" }}
              >
                {/* Download Button — icon only */}
                {boqItems.length > 0 && (
                  <DownloadBoqButton
                    boqHeader={downloadBoqHeader}
                    boqLines={downloadBoqLines}
                    isReference={true}
                    mrHeader={mrHeader}
                    itemName={itemName}
                    itemId={item.id}
                    iconOnly
                  />
                )}

                {/* Search Bar */}
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <input
                    type="text"
                    placeholder="SEARCH"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: "300px",
                      padding: "7px 36px 7px 15px",
                      borderRadius: "8px",
                      border: "1px solid rgba(223, 223, 223, 1)",
                      fontSize: "14px",
                    }}
                  />
                  <img
                    src={searchIcon}
                    alt="search"
                    style={{
                      position: "absolute",
                      right: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: "14px",
                      height: "14px",
                      opacity: 0.5,
                    }}
                  />
                </div>
              </div>
            </div>
            {/* end search+tabs+download row */}

            <br />

            {/* No Results Message */}
            {searchQuery.trim() && categoryKeys.length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px",
                  color: "rgba(128, 128, 128, 1)",
                }}
              >
                <p>No results found for "{searchQuery}"</p>
              </div>
            )}

            {/* Content Area */}
            <div>
              {isLoading ? (
                <div style={{ textAlign: "center", padding: "40px" }}>
                  Loading BOQ details...
                </div>
              ) : categoryKeys.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px" }}>
                  No BOQ items found
                </div>
              ) : activeCategory === "SUMMARY" ? (
                // SUMMARY View - Categories only (aggregated)
                <table
                  className="items-table"
                  style={{ tableLayout: "fixed", width: "100%" }}
                >
                  <colgroup>
                    <col style={{ width: "80px" }} />
                    <col />
                    {canSeePrice && <col style={{ width: "200px" }} />}
                    {showJoColumns && canSeeWorksValue && (
                      <col style={{ width: "250px" }} />
                    )}
                  </colgroup>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>CATEGORY</th>
                      {canSeePrice && <th>SUBTOTAL</th>}
                      {showJoColumns && canSeeWorksValue && (
                        <th>SUBCONTRACTED WORKS VALUE</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {categoryKeys.map((category, index) => {
                      const group = filteredByCategory[category];
                      const bgColor = getRowBgColor(index);
                      const categorySubcontractedValue = group.items.reduce(
                        (sum, i) =>
                          sum +
                          (Number(i.subcontracted_qty) || 0) *
                            (Number(i.rate_per_quantity) || 0),
                        0,
                      );
                      return (
                        <tr
                          key={category}
                          style={{ cursor: "pointer" }}
                          onClick={() => setActiveCategory(category)}
                        >
                          <td>{index + 1}</td>
                          <td
                            style={{
                              textTransform: "uppercase",
                              fontWeight: 600,
                            }}
                          >
                            {category}
                          </td>
                          {canSeePrice && (
                            <td>{formatPriceAED(group.totalPrice)}</td>
                          )}
                          {showJoColumns && canSeeWorksValue && (
                            <td>
                              {formatPriceAED(categorySubcontractedValue)}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                  {(canSeePrice || (showJoColumns && canSeeWorksValue)) && (
                    <tfoot
                      style={{
                        borderTop: "1px solid rgba(232, 223, 223, 1)",
                        pointerEvents: "none",
                      }}
                    >
                      <tr>
                        <td></td>
                        <td>
                          <h3>SUBTOTAL</h3>
                        </td>
                        {canSeePrice && (
                          <td>
                            <h3 style={{ textWrap: "nowrap" }}>
                              {formatPriceAED(grandTotal)}
                            </h3>
                          </td>
                        )}
                        {showJoColumns && canSeeWorksValue && (
                          <td>
                            <h3 style={{ textWrap: "nowrap" }}>
                              {formatPriceAED(grandSubcontractedWorksValue)}
                            </h3>
                          </td>
                        )}
                      </tr>
                    </tfoot>
                  )}
                </table>
              ) : activeCategory === "ALL" ? (
                // ALL View - Show all subcategories grouped
                subCategoryKeys.map((key, groupIndex) => {
                  const group = filteredBySubCategory[key];
                  const groupSubcontractedWorksValue = group.items.reduce(
                    (sum, i) =>
                      sum +
                      (Number(i.subcontracted_qty) || 0) *
                        (Number(i.rate_per_quantity) || 0),
                    0,
                  );
                  return (
                    <div key={key} style={{ marginBottom: "30px" }}>
                      {/* Subcategory Header - Simple text only */}
                      <h2
                        style={{
                          textTransform: "uppercase",
                        }}
                      >
                        {group.category_number}.{group.subcategory_number}{" "}
                        {group.category} / {group.sub_category}
                      </h2>

                      <br />

                      {/* Items Table */}
                      <table
                        className="items-table"
                        style={{ tableLayout: "fixed", width: "100%" }}
                      >
                        <colgroup>
                          <col style={{ width: "120px" }} />
                          <col />
                          <col style={{ width: "160px" }} />
                          <col style={{ width: "150px" }} />
                          {showAllocatedQty && (
                            <col style={{ width: "160px" }} />
                          )}
                          {showAllocatedQty && (
                            <col style={{ width: "220px" }} />
                          )}
                          {canSeePrice && <col style={{ width: "200px" }} />}
                          {showJoColumns && <col style={{ width: "180px" }} />}
                          {showJoColumns && canSeeWorksValue && (
                            <col style={{ width: "220px" }} />
                          )}
                          <col style={{ width: "160px" }} />
                        </colgroup>
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>ITEM</th>
                            <th>RATE</th>
                            <th>QTY</th>
                            {showAllocatedQty && (
                              <th>
                                <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                                  ALLOCATED QTY
                                  <TableHeaderTooltipHover width={300}>
                                    When creating a Material Request (MR), requestors allocate a specific quantity from the total requested quantity to each BOQ reference. This allows the system to accurately track procurement costs, budget utilization, and material allocation across individual BOQ items.
                                  </TableHeaderTooltipHover>
                                </span>
                              </th>
                            )}
                            {showAllocatedQty && <th>TOTAL COST</th>}
                            {canSeePrice && <th>TOTAL PRICE</th>}
                            {showJoColumns && <th>SUBCONTRACTED QTY</th>}
                            {showJoColumns && canSeeWorksValue && (
                              <th>SUBCONTRACTED WORKS VALUE</th>
                            )}
                            <th>ATTACHMENT(S)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const totalCols =
                              5 +
                              (showAllocatedQty ? 2 : 0) +
                              (canSeePrice ? 1 : 0) +
                              (showJoColumns ? 1 : 0) +
                              (showJoColumns && canSeeWorksValue ? 1 : 0);
                            return group.items.map((boqItem, itemIndex) => {
                              const attachmentUrls = parseAttachments(
                                boqItem.attachments,
                              );
                              const bgColor = getRowBgColor(itemIndex);
                              const itemSubcontractedWorksValue =
                                (Number(boqItem.subcontracted_qty) || 0) *
                                (Number(boqItem.rate_per_quantity) || 0);
                              const isExpanded = expandedBoqRows.has(
                                boqItem.id,
                              );

                              return (
                                <Fragment key={boqItem.id}>
                                  <tr
                                    className={
                                      isExpanded ? "history-expanded" : ""
                                    }
                                  >
                                    <td
                                      style={{
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      {boqItem.item_number}
                                    </td>
                                    <td>
                                      <div
                                        style={{
                                          display: "flex",
                                          flexDirection: "column",
                                          gap: "10px",
                                        }}
                                      >
                                        <strong>{boqItem.item_name}</strong>

                                        {boqItem.item_description && (
                                          <p style={{ whiteSpace: "pre-wrap" }}>
                                            {boqItem.item_description}
                                          </p>
                                        )}

                                        {boqItem.location && (
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
                                                color: "rgba(105, 105, 105, 1)",
                                              }}
                                            >
                                              {boqItem.location}
                                            </span>
                                          </div>
                                        )}

                                        {boqItem.scope_of_work && (
                                          <div
                                            style={{
                                              backgroundColor:
                                                "rgba(225, 225, 225, 1)",
                                              borderRadius: "50px",
                                              padding: "4px 10px",
                                              width: "fit-content",
                                            }}
                                          >
                                            <strong>
                                              {boqItem.scope_of_work}
                                            </strong>
                                          </div>
                                        )}

                                        {/* Purchase History toggle */}
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            togglePurchaseHistory(boqItem.id);
                                          }}
                                          style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "5px",
                                            backgroundColor:
                                              "rgba(239,239,239,1)",
                                            border: "none",
                                            borderRadius: "50px",
                                            cursor: "pointer",
                                            padding: "6px 12px",
                                            color: "black",
                                            fontSize: "11px",
                                            width: "fit-content",
                                          }}
                                        >
                                          <svg
                                            width="14"
                                            height="14"
                                            viewBox="0 0 12 12"
                                            fill="none"
                                            style={{
                                              transition: "transform 0.2s",
                                              transform: isExpanded
                                                ? "rotate(180deg)"
                                                : "rotate(0deg)",
                                              flexShrink: 0,
                                            }}
                                          >
                                            <path
                                              d="M2 4L6 8L10 4"
                                              stroke="currentColor"
                                              strokeWidth="1"
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                            />
                                          </svg>
                                          Purchase History
                                        </button>
                                      </div>
                                    </td>
                                    <td
                                      style={{
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      {Number(boqItem.rate_per_quantity) > 0
                                        ? formatPrice(boqItem.rate_per_quantity)
                                        : "-"}
                                    </td>
                                    <td>
                                      {formatQuantity(boqItem.quantity)}{" "}
                                      {boqItem.unit}
                                    </td>
                                    {showAllocatedQty && (
                                      <td>
                                        {boqItem.allocated_qty != null
                                          ? `${formatQuantity(boqItem.allocated_qty)} ${boqItem.unit}`
                                          : "-"}
                                      </td>
                                    )}
                                    {showAllocatedQty &&
                                      (() => {
                                        const history =
                                          purchaseHistory[boqItem.id];
                                        const purchasedTotal =
                                          history != null
                                            ? history.reduce(
                                                (s, e) =>
                                                  s + Number(e.total_price),
                                                0,
                                              )
                                            : null;
                                        const itemBudget =
                                          Number(boqItem.rate_per_quantity) *
                                          Number(boqItem.quantity);
                                        const utilizationPct =
                                          purchasedTotal != null &&
                                          itemBudget > 0
                                            ? Math.min(
                                                (purchasedTotal / itemBudget) *
                                                  100,
                                                100,
                                              )
                                            : 0;
                                        const utilizationColor =
                                          purchasedTotal != null &&
                                          purchasedTotal > itemBudget
                                            ? "rgba(220,38,38,1)"
                                            : "rgba(34,197,94,1)";
                                        return (
                                          <td>
                                            <div
                                              style={{
                                                display: "flex",
                                                flexDirection: "column",
                                                gap: "8px",
                                              }}
                                            >
                                              <span
                                                style={{ whiteSpace: "nowrap" }}
                                              >
                                                {purchasedTotal != null
                                                  ? formatPriceAED(
                                                      purchasedTotal,
                                                    )
                                                  : "—"}
                                              </span>
                                              {purchasedTotal != null && (
                                                <div
                                                  className="tooltip-bar"
                                                  style={{
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    gap: "4px",
                                                  }}
                                                >
                                                  <span className="tooltip-label">
                                                    <span
                                                      style={{
                                                        color:
                                                          purchasedTotal >
                                                          itemBudget
                                                            ? "rgba(220,38,38,1)"
                                                            : "rgba(34,150,100,1)",
                                                      }}
                                                    >
                                                      {formatPriceAED(
                                                        purchasedTotal,
                                                      )}
                                                    </span>
                                                    {" / "}
                                                    {formatPriceAED(itemBudget)}
                                                  </span>
                                                  <span
                                                    style={{
                                                      fontSize: "10px",
                                                      color: utilizationColor,
                                                      whiteSpace: "nowrap",
                                                    }}
                                                  >
                                                    {parseFloat(utilizationPct.toFixed(2))}%
                                                  </span>
                                                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                                    {purchasedTotal > itemBudget && (
                                                      <img src="/icons/warning.svg" alt="over budget" style={{ width: "11px", height: "11px", flexShrink: 0 }} />
                                                    )}
                                                    <div
                                                      style={{
                                                        flex: 1,
                                                        height: "5px",
                                                        borderRadius: "3px",
                                                        backgroundColor:
                                                          "rgba(220,220,220,1)",
                                                        overflow: "hidden",
                                                      }}
                                                    >
                                                      <div
                                                        style={{
                                                          width: `${utilizationPct}%`,
                                                          height: "100%",
                                                          backgroundColor:
                                                            utilizationColor,
                                                          borderRadius: "3px",
                                                        }}
                                                      />
                                                    </div>
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          </td>
                                        );
                                      })()}
                                    {canSeePrice && (
                                      <td>
                                        {formatPriceAED(
                                          Number(boqItem.rate_per_quantity) *
                                            Number(boqItem.quantity),
                                        )}
                                      </td>
                                    )}
                                    {showJoColumns && (
                                      <td>
                                        {Number(boqItem.subcontracted_qty) > 0
                                          ? `${formatQuantity(Number(boqItem.subcontracted_qty))} ${boqItem.unit}`
                                          : "-"}
                                      </td>
                                    )}
                                    {showJoColumns && canSeeWorksValue && (
                                      <td>
                                        {itemSubcontractedWorksValue > 0
                                          ? formatPriceAED(
                                              itemSubcontractedWorksValue,
                                            )
                                          : "-"}
                                      </td>
                                    )}
                                    <td className="attachments">
                                      <div
                                        className="attachments-grid"
                                        style={{
                                          display: "grid",
                                          gridTemplateColumns:
                                            "repeat(2, 60px)",
                                          gap: "5px",
                                        }}
                                      >
                                        {attachmentUrls.map((url, i) => (
                                          <img
                                            key={i}
                                            src={url}
                                            alt="attachment"
                                            style={{
                                              width: "60px",
                                              height: "100%",
                                              objectFit: "contain",
                                            }}
                                          />
                                        ))}
                                      </div>
                                    </td>
                                  </tr>
                                  {isExpanded && (
                                    <tr>
                                      <td
                                        style={{ padding: 0, width: "120px" }}
                                      ></td>
                                      <td
                                        colSpan={totalCols - 1}
                                        style={{ padding: 0 }}
                                      >
                                        {renderPurchaseHistoryTable(boqItem)}
                                      </td>
                                    </tr>
                                  )}
                                </Fragment>
                              );
                            });
                          })()}
                        </tbody>
                        {(showAllocatedQty ||
                          (showJoColumns && canSeeWorksValue)) && (
                          <tfoot
                            style={{
                              borderTop: "1px solid rgba(232, 223, 223, 1)",
                              pointerEvents: "none",
                            }}
                          >
                            <tr>
                              {/* # col spacer */}
                              <td></td>
                              {/* ITEM col: label */}
                              <td>
                                <h3>SUBTOTAL</h3>
                              </td>
                              {/* RATE col spacer */}
                              <td></td>
                              {/* QUANTITY col spacer */}
                              <td></td>
                              {/* ALLOCATED QTY col spacer */}
                              {showAllocatedQty && <td></td>}
                              {/* TOTAL COST col: sum of purchase history */}
                              {showAllocatedQty && (
                                <td>
                                  <h3 style={{ textWrap: "nowrap" }}>
                                    {formatPriceAED(
                                      group.items.reduce(
                                        (sum, i) =>
                                          sum +
                                          (purchaseHistory[i.id] ?? []).reduce(
                                            (s, e) => s + Number(e.total_price),
                                            0,
                                          ),
                                        0,
                                      ),
                                    )}
                                  </h3>
                                </td>
                              )}
                              {/* TOTAL PRICE col: sum of rate×qty */}
                              {canSeePrice && (
                                <td>
                                  <h3 style={{ textWrap: "nowrap" }}>
                                    {formatPriceAED(
                                      group.items.reduce(
                                        (sum, i) =>
                                          sum +
                                          Number(i.rate_per_quantity) *
                                            Number(i.quantity),
                                        0,
                                      ),
                                    )}
                                  </h3>
                                </td>
                              )}
                              {/* SUBCONTRACTED QTY col spacer */}
                              {showJoColumns && <td></td>}
                              {/* SUBCONTRACTED WORKS VALUE col: value */}
                              {showJoColumns && canSeeWorksValue && (
                                <td>
                                  <h3 style={{ textWrap: "nowrap" }}>
                                    {formatPriceAED(
                                      groupSubcontractedWorksValue,
                                    )}
                                  </h3>
                                </td>
                              )}
                              {/* ATTACHMENT col spacer */}
                              <td></td>
                            </tr>
                          </tfoot>
                        )}
                      </table>

                      <br />
                      <br />
                    </div>
                  );
                })
              ) : activeCategoryData ? (
                // Individual Category View - Show all items in this category (all subcategories)
                <div>
                  {/* Items from all subcategories in this category */}
                  {activeCategoryData.subCategories.map((subCat, subIndex) => {
                    // Get items for this subcategory
                    const subCatItems = activeCategoryData.items.filter(
                      (item) => item.sub_category === subCat,
                    );

                    if (subCatItems.length === 0) return null;

                    const firstItem = subCatItems[0];
                    const subCatTotal = subCatItems.reduce(
                      (sum, item) =>
                        sum +
                        (purchaseHistory[item.id] ?? []).reduce(
                          (s, e) => s + Number(e.total_price),
                          0,
                        ),
                      0,
                    );
                    const subCatSubcontractedWorksValue = subCatItems.reduce(
                      (sum, i) =>
                        sum +
                        (Number(i.subcontracted_qty) || 0) *
                          (Number(i.rate_per_quantity) || 0),
                      0,
                    );

                    return (
                      <div key={subCat} style={{ marginBottom: "30px" }}>
                        {/* Subcategory Header */}
                        <h2
                          style={{
                            textTransform: "uppercase",
                          }}
                        >
                          {activeCategoryData.category_number}.
                          {firstItem.subcategory_number} {subCat}
                        </h2>

                        <br />

                        <table
                          className="items-table"
                          style={{ tableLayout: "fixed", width: "100%" }}
                        >
                          <colgroup>
                            <col style={{ width: "120px" }} />
                            <col />
                            <col style={{ width: "160px" }} />
                            <col style={{ width: "150px" }} />
                            {showAllocatedQty && (
                              <col style={{ width: "160px" }} />
                            )}
                            {showAllocatedQty && (
                              <col style={{ width: "220px" }} />
                            )}
                            {canSeePrice && <col style={{ width: "200px" }} />}
                            {showJoColumns && (
                              <col style={{ width: "180px" }} />
                            )}
                            {showJoColumns && canSeeWorksValue && (
                              <col style={{ width: "220px" }} />
                            )}
                            <col style={{ width: "160px" }} />
                          </colgroup>
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>ITEM</th>
                              <th>RATE</th>
                              <th>QUANTITY</th>
                              {showAllocatedQty && (
                              <th>
                                <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                                  ALLOCATED QTY
                                  <TableHeaderTooltipHover width={300}>
                                    When creating a Material Request (MR), requestors allocate a specific quantity from the total requested quantity to each BOQ reference. This allows the system to accurately track procurement costs, budget utilization, and material allocation across individual BOQ items.
                                  </TableHeaderTooltipHover>
                                </span>
                              </th>
                            )}
                              {showAllocatedQty && <th>TOTAL COST</th>}
                              {canSeePrice && <th>TOTAL PRICE</th>}
                              {showJoColumns && <th>SUBCONTRACTED QTY</th>}
                              {showJoColumns && canSeeWorksValue && (
                                <th>SUBCONTRACTED WORKS VALUE</th>
                              )}
                              <th>ATTACHMENT(S)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              const totalCols =
                                5 +
                                (showAllocatedQty ? 2 : 0) +
                                (canSeePrice ? 1 : 0) +
                                (showJoColumns ? 1 : 0) +
                                (showJoColumns && canSeeWorksValue ? 1 : 0);
                              return subCatItems.map((boqItem, itemIndex) => {
                                const attachmentUrls = parseAttachments(
                                  boqItem.attachments,
                                );
                                const bgColor = getRowBgColor(itemIndex);
                                const itemSubcontractedWorksValue =
                                  (Number(boqItem.subcontracted_qty) || 0) *
                                  (Number(boqItem.rate_per_quantity) || 0);
                                const isExpanded = expandedBoqRows.has(
                                  boqItem.id,
                                );

                                return (
                                  <Fragment key={boqItem.id}>
                                    <tr
                                      className={
                                        isExpanded ? "history-expanded" : ""
                                      }
                                    >
                                      <td
                                        style={{
                                          whiteSpace: "nowrap",
                                        }}
                                      >
                                        {boqItem.item_number}
                                      </td>
                                      <td>
                                        <div
                                          style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: "10px",
                                          }}
                                        >
                                          <strong>{boqItem.item_name}</strong>

                                          {boqItem.item_description && (
                                            <p
                                              style={{ whiteSpace: "pre-wrap" }}
                                            >
                                              {boqItem.item_description}
                                            </p>
                                          )}

                                          {boqItem.location && (
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
                                                  color:
                                                    "rgba(105, 105, 105, 1)",
                                                }}
                                              >
                                                {boqItem.location}
                                              </span>
                                            </div>
                                          )}

                                          {boqItem.scope_of_work && (
                                            <div
                                              style={{
                                                backgroundColor:
                                                  "rgba(225, 225, 225, 1)",
                                                borderRadius: "50px",
                                                padding: "4px 10px",
                                                width: "fit-content",
                                              }}
                                            >
                                              <strong>
                                                {boqItem.scope_of_work}
                                              </strong>
                                            </div>
                                          )}

                                          {/* Purchase History toggle */}
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              togglePurchaseHistory(boqItem.id);
                                            }}
                                            style={{
                                              display: "inline-flex",
                                              alignItems: "center",
                                              gap: "5px",
                                              backgroundColor:
                                                "rgba(239,239,239,1)",
                                              border: "none",
                                              borderRadius: "50px",
                                              cursor: "pointer",
                                              padding: "6px 12px",
                                              color: "black",
                                              fontSize: "11px",
                                              width: "fit-content",
                                            }}
                                          >
                                            <svg
                                              width="14"
                                              height="14"
                                              viewBox="0 0 12 12"
                                              fill="none"
                                              style={{
                                                transition: "transform 0.2s",
                                                transform: isExpanded
                                                  ? "rotate(180deg)"
                                                  : "rotate(0deg)",
                                                flexShrink: 0,
                                              }}
                                            >
                                              <path
                                                d="M2 4L6 8L10 4"
                                                stroke="currentColor"
                                                strokeWidth="1"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                              />
                                            </svg>
                                            Purchase History
                                          </button>
                                        </div>
                                      </td>
                                      <td
                                        style={{
                                          whiteSpace: "nowrap",
                                        }}
                                      >
                                        {Number(boqItem.rate_per_quantity) > 0
                                          ? formatPrice(
                                              boqItem.rate_per_quantity,
                                            )
                                          : "-"}
                                      </td>
                                      <td>
                                        {formatQuantity(boqItem.quantity)}{" "}
                                        {boqItem.unit}
                                      </td>
                                      {showAllocatedQty && (
                                        <td>
                                          {boqItem.allocated_qty != null
                                            ? `${formatQuantity(boqItem.allocated_qty)} ${boqItem.unit}`
                                            : "-"}
                                        </td>
                                      )}
                                      {showAllocatedQty &&
                                        (() => {
                                          const history =
                                            purchaseHistory[boqItem.id];
                                          const purchasedTotal =
                                            history != null
                                              ? history.reduce(
                                                  (s, e) =>
                                                    s + Number(e.total_price),
                                                  0,
                                                )
                                              : null;
                                          const itemBudget =
                                            Number(boqItem.rate_per_quantity) *
                                            Number(boqItem.quantity);
                                          const utilizationPct =
                                            purchasedTotal != null &&
                                            itemBudget > 0
                                              ? Math.min(
                                                  (purchasedTotal /
                                                    itemBudget) *
                                                    100,
                                                  100,
                                                )
                                              : 0;
                                          const utilizationColor =
                                            purchasedTotal != null &&
                                            purchasedTotal > itemBudget
                                              ? "rgba(220,38,38,1)"
                                              : "rgba(34,197,94,1)";
                                          return (
                                            <td>
                                              <div
                                                style={{
                                                  display: "flex",
                                                  flexDirection: "column",
                                                  gap: "8px",
                                                }}
                                              >
                                                <span
                                                  style={{
                                                    whiteSpace: "nowrap",
                                                  }}
                                                >
                                                  {purchasedTotal != null
                                                    ? formatPriceAED(
                                                        purchasedTotal,
                                                      )
                                                    : "—"}
                                                </span>
                                                {purchasedTotal != null && (
                                                  <div
                                                    className="tooltip-bar"
                                                    style={{
                                                      display: "flex",
                                                      flexDirection: "column",
                                                      gap: "4px",
                                                    }}
                                                  >
                                                    <span className="tooltip-label">
                                                      <span
                                                        style={{
                                                          color:
                                                            purchasedTotal >
                                                            itemBudget
                                                              ? "rgba(220,38,38,1)"
                                                              : "rgba(34,150,100,1)",
                                                        }}
                                                      >
                                                        {formatPriceAED(
                                                          purchasedTotal,
                                                        )}
                                                      </span>
                                                      {" / "}
                                                      {formatPriceAED(
                                                        itemBudget,
                                                      )}
                                                    </span>
                                                    <span
                                                      style={{
                                                        fontSize: "10px",
                                                        color: utilizationColor,
                                                        whiteSpace: "nowrap",
                                                      }}
                                                    >
                                                      {parseFloat(utilizationPct.toFixed(2))}%
                                                    </span>
                                                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                                      {purchasedTotal > itemBudget && (
                                                        <img src="/icons/warning.svg" alt="over budget" style={{ width: "11px", height: "11px", flexShrink: 0 }} />
                                                      )}
                                                      <div
                                                        style={{
                                                          flex: 1,
                                                          height: "5px",
                                                          borderRadius: "3px",
                                                          backgroundColor:
                                                            "rgba(220,220,220,1)",
                                                          overflow: "hidden",
                                                        }}
                                                      >
                                                        <div
                                                          style={{
                                                            width: `${utilizationPct}%`,
                                                            height: "100%",
                                                            backgroundColor:
                                                              utilizationColor,
                                                            borderRadius: "3px",
                                                          }}
                                                        />
                                                      </div>
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            </td>
                                          );
                                        })()}
                                      {canSeePrice && (
                                        <td>
                                          {formatPriceAED(
                                            Number(boqItem.rate_per_quantity) *
                                              Number(boqItem.quantity),
                                          )}
                                        </td>
                                      )}
                                      {showJoColumns && (
                                        <td>
                                          {Number(boqItem.subcontracted_qty) > 0
                                            ? `${formatQuantity(Number(boqItem.subcontracted_qty))} ${boqItem.unit}`
                                            : "-"}
                                        </td>
                                      )}
                                      {showJoColumns && canSeeWorksValue && (
                                        <td>
                                          {itemSubcontractedWorksValue > 0
                                            ? formatPriceAED(
                                                itemSubcontractedWorksValue,
                                              )
                                            : "-"}
                                        </td>
                                      )}
                                      <td className="attachments">
                                        <div
                                          className="attachments-grid"
                                          style={{
                                            display: "grid",
                                            gridTemplateColumns:
                                              "repeat(2, 60px)",
                                            gap: "5px",
                                          }}
                                        >
                                          {attachmentUrls.map((url, i) => (
                                            <img
                                              key={i}
                                              src={url}
                                              alt="attachment"
                                              style={{
                                                width: "60px",
                                                height: "100%",
                                                objectFit: "contain",
                                              }}
                                            />
                                          ))}
                                        </div>
                                      </td>
                                    </tr>
                                    {isExpanded && (
                                      <tr>
                                        <td
                                          style={{ padding: 0, width: "120px" }}
                                        ></td>
                                        <td
                                          colSpan={totalCols - 1}
                                          style={{ padding: 0 }}
                                        >
                                          {renderPurchaseHistoryTable(boqItem)}
                                        </td>
                                      </tr>
                                    )}
                                  </Fragment>
                                );
                              });
                            })()}
                          </tbody>
                          {(showAllocatedQty ||
                            (showJoColumns && canSeeWorksValue)) && (
                            <tfoot
                              style={{
                                borderTop: "1px solid rgba(232, 223, 223, 1)",
                                pointerEvents: "none",
                              }}
                            >
                              <tr>
                                {/* # col spacer */}
                                <td></td>
                                {/* ITEM col: label */}
                                <td>
                                  <h3 style={{ fontSize: "14px" }}>SUBTOTAL</h3>
                                </td>
                                {/* RATE col spacer */}
                                <td></td>
                                {/* QUANTITY col spacer */}
                                <td></td>
                                {/* ALLOCATED QTY col spacer */}
                                {showAllocatedQty && <td></td>}
                                {/* TOTAL COST col: value */}
                                {showAllocatedQty && (
                                  <td>
                                    <h3
                                      style={{
                                        textWrap: "nowrap",
                                        fontSize: "14px",
                                      }}
                                    >
                                      {formatPriceAED(subCatTotal)}
                                    </h3>
                                  </td>
                                )}
                                {/* TOTAL PRICE col: sum of rate×qty */}
                                {canSeePrice && (
                                  <td>
                                    <h3
                                      style={{
                                        textWrap: "nowrap",
                                        fontSize: "14px",
                                      }}
                                    >
                                      {formatPriceAED(
                                        subCatItems.reduce(
                                          (sum, i) =>
                                            sum +
                                            Number(i.rate_per_quantity) *
                                              Number(i.quantity),
                                          0,
                                        ),
                                      )}
                                    </h3>
                                  </td>
                                )}
                                {/* SUBCONTRACTED QTY col spacer */}
                                {showJoColumns && <td></td>}
                                {/* SUBCONTRACTED WORKS VALUE col: value */}
                                {showJoColumns && canSeeWorksValue && (
                                  <td>
                                    <h3
                                      style={{
                                        textWrap: "nowrap",
                                        fontSize: "14px",
                                      }}
                                    >
                                      {formatPriceAED(
                                        subCatSubcontractedWorksValue,
                                      )}
                                    </h3>
                                  </td>
                                )}
                                {/* ATTACHMENT col spacer */}
                                <td></td>
                              </tr>
                            </tfoot>
                          )}
                        </table>

                        <br />
                        <br />
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </>
          )}
          </div>
          {/* boq-ref-popup */}
        </FormPopUp>
      )}
      {/* Price hover popups (lowest & prev) */}
      {[
        {
          rect: hoveredLowestRect,
          type: "lowest" as const,
          onCancel: cancelLowestHideTimer,
          onHide: () => setHoveredLowestRect(null),
        },
        {
          rect: hoveredPrevRect,
          type: "prev" as const,
          onCancel: cancelPrevHideTimer,
          onHide: () => setHoveredPrevRect(null),
        },
      ].map(({ rect, type, onCancel, onHide }) =>
        rect
          ? (() => {
              const row = priceHoverCache[itemDescription]?.[type];
              if (row === null) return null;
              const spaceBelow = window.innerHeight - rect.bottom;
              const popupHeight = 90;
              const top =
                spaceBelow >= popupHeight + 8
                  ? rect.bottom + 4
                  : rect.top - popupHeight - 4;
              const horizStyle = { left: Math.max(8, rect.left) };
              return createPortal(
                <div
                  key={type}
                  onMouseEnter={onCancel}
                  onMouseLeave={onHide}
                  style={{
                    position: "fixed",
                    ...horizStyle,
                    top: Math.max(8, top),
                    backgroundColor: "white",
                    border: "1px solid rgba(223,223,223,1)",
                    borderRadius: "10px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    zIndex: 10000,
                    width: "auto",
                    whiteSpace: "nowrap",
                  }}
                >
                  <div style={{ padding: "12px" }}>
                    <h4 style={{ marginBottom: "12px" }}>
                      {type === "lowest" ? "LOWEST PRICE" : "PREVIOUS PRICE"}
                    </h4>
                    {row === "loading" || row === undefined ? (
                      <div
                        style={{
                          padding: "16px",
                          textAlign: "center",
                          color: "rgba(128,128,128,1)",
                          fontSize: "13px",
                        }}
                      >
                        Loading...
                      </div>
                    ) : (
                      <table
                        className="items-table popup-hover"
                        style={{ width: "auto" }}
                      >
                        <thead>
                          <tr>
                            <th>LPO NUMBER</th>
                            <th>PROJECT</th>
                            <th>VENDOR</th>
                            <th>REQUESTER</th>
                            <th>UNIT PRICE</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td style={{ whiteSpace: "nowrap" }}>
                              <a
                                href={`/mr/${row.mr_header_id}/lpo/${row.lpo_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: "rgba(37,150,190,1)", fontWeight: 600, textDecoration: "none" }}
                              >
                                LPO-{String(row.lpo_id).padStart(5, "0")}
                              </a>
                            </td>
                            <td style={{ whiteSpace: "nowrap" }}>
                              {row.project_name}
                            </td>
                            <td style={{ whiteSpace: "nowrap" }}>
                              {row.vendor_name}
                            </td>
                            <td style={{ whiteSpace: "nowrap" }}>
                              {(row as any).requested_by ?? "—"}
                            </td>
                            <td style={{ whiteSpace: "nowrap" }}>
                              {formatPriceAED(row.unit_price)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>,
                document.body,
              );
            })()
          : null,
      )}
    </>
  );
}

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
