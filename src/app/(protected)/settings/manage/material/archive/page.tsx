"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Button from "@/app/components/Button";
import ExportMaterialListPDFButton from "@/app/components/_ExportMaterialListPDFButton";
import { InventoryMatch } from "@/app/(protected)/mr/[id]/components/department/_InventoryStatusCell";
import { PredefinedItem } from "@/app/components/_MultipleSelectMaterialItemButton";
import ThreeDotsMenuButton from "@/app/components/_ThreeButtonsMenuButton";
import RestoreArchivedMaterialButton from "./components/_RestoreArchivedMaterialButton";
import ArchiveBulkActionsButton from "./components/_BulkActionsButton";
import RestoreArchivedCategoryButton from "./components/_RestoreArchivedCategoryButton";
import RestoreArchivedSubCategoryButton from "./components/_RestoreArchivedSubCategoryButton";
import RestoreArchivedDatabaseButton from "./components/_RestoreArchivedDatabaseButton";
import DeleteArchivedMaterialButton from "./components/_DeleteArchivedMaterialButton";
import DeleteArchivedCategoryButton from "./components/_DeleteArchivedCategoryButton";
import DeleteArchivedSubCategoryButton from "./components/_DeleteArchivedSubCategoryButton";
import DeleteArchivedDatabaseButton from "./components/_DeleteArchivedDatabaseButton";
import EditCategoryButton from "../components/_EditCategoryButton";
import EditSubCategoryButton from "../components/_EditSubCategoryButton";
import FilterButton from "../components/_FilterButton";
import { toast } from "@/app/components/Toast";

type MaterialItem = PredefinedItem & {
  database?: string | null;
  database_id?: number | null;
  is_archived?: number | null;
};

type GroupedItems = {
  [category: string]: {
    [subCategory: string]: MaterialItem[];
  };
};

const ITEMS_PER_PAGE = 50;

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

function SkeletonLayout() {
  const sidebarRows = [
    "72%", "58%", "68%", "62%", "75%", "60%", "66%", "53%", "70%", "64%", "57%", "78%",
  ];
  const dbTabs = ["110px", "130px", "95px", "120px", "105px"];
  const tableRows = [
    ["62%", "35%"], ["48%", "28%"], ["74%", "42%"], ["56%", "32%"],
    ["68%", "39%"], ["51%", "29%"], ["77%", "45%"], ["60%", "34%"],
    ["65%", "37%"], ["53%", "30%"], ["71%", "40%"], ["58%", "33%"],
    ["79%", "46%"], ["44%", "26%"], ["67%", "38%"],
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
      {/* LEFT sidebar */}
      <div style={{ width: 350, flexShrink: 0, overflow: "hidden", backgroundColor: "white", display: "flex", flexDirection: "column", padding: "15px", borderRadius: "10px" }}>
        <SkeletonBlock w="58%" h={9} style={{ marginBottom: "12px" }} />
        <div style={{ height: "33px", borderRadius: "8px", border: "1px solid rgba(220,220,220,1)", backgroundColor: "white", marginBottom: "12px", flexShrink: 0 }} />
        <div style={{ height: "36px", borderRadius: "5px", backgroundColor: "rgba(0,0,0,0.10)", marginBottom: "6px", flexShrink: 0 }} />
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", gap: "2px" }}>
          {sidebarRows.map((w, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "7px 8px" }}>
              <SkeletonBlock w={w} h={11} />
              <div style={{ marginLeft: "auto", width: "30px", height: "17px", borderRadius: "50px", backgroundColor: "white", border: "1px solid rgba(220,220,220,1)", flexShrink: 0 }} />
            </div>
          ))}
        </div>
      </div>

      {/* CENTER */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden", backgroundColor: "white" }}>
        <div style={{ padding: "12px 20px 15px", flexShrink: 0 }}>
          <SkeletonBlock w="45%" h={22} style={{ marginBottom: "10px" }} />
          <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "15px" }}>
            <div style={{ flex: 1, height: "37px", borderRadius: "8px", border: "1px solid rgba(223,223,223,1)", backgroundColor: "rgba(252,252,252,1)" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <SkeletonBlock w="68px" h={30} style={{ borderRadius: "50px" }} />
              <SkeletonBlock w="90px" h={30} style={{ borderRadius: "8px" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <SkeletonBlock w="140px" h={10} />
            </div>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 20px 16px" }}>
          <div style={{ display: "flex", gap: "6px", marginBottom: "0" }}>
            {dbTabs.map((w, i) => (
              <div key={i} style={{ width: w, height: "36px", borderRadius: "6px 6px 0 0", backgroundColor: "rgba(221,221,221,1)", flexShrink: 0 }} />
            ))}
          </div>
          <table style={{ tableLayout: "fixed", width: "100%", borderCollapse: "collapse" }}>
            <colgroup>
              <col style={{ width: "40px" }} />
              <col style={{ width: "200px" }} />
              <col />
              <col style={{ width: "150px" }} />
              <col style={{ width: "48px" }} />
            </colgroup>
            <thead>
              <tr>
                <th style={{ padding: "10px 0", borderBottom: "1px solid rgba(220,220,220,1)" }} />
                <th style={{ padding: "10px 12px 10px 0", borderBottom: "1px solid rgba(220,220,220,1)" }}><SkeletonBlock w="40px" h={10} /></th>
                <th style={{ padding: "10px 12px 10px 0", borderBottom: "1px solid rgba(220,220,220,1)" }}><SkeletonBlock w="60px" h={10} /></th>
                <th style={{ padding: "10px 12px", borderBottom: "1px solid rgba(220,220,220,1)" }}><SkeletonBlock w="35px" h={10} /></th>
                <th style={{ borderBottom: "1px solid rgba(220,220,220,1)" }} />
              </tr>
            </thead>
            <tbody>
              {tableRows.map(([nameW, subW], i) => (
                <tr key={i} style={{ borderBottom: "1px solid rgba(239,239,239,1)" }}>
                  <td style={{ padding: "10px 0" }}>
                    <div style={{ width: "16px", height: "16px", borderRadius: "3px", border: "1px solid rgba(210,210,210,1)", margin: "0 auto" }} />
                  </td>
                  <td style={{ padding: "10px 12px 10px 0" }}><SkeletonBlock w="75%" h={11} /></td>
                  <td style={{ padding: "10px 12px 10px 0" }}>
                    <SkeletonBlock w={nameW} h={12} style={{ marginBottom: "5px" }} />
                    <SkeletonBlock w={subW} h={9} />
                  </td>
                  <td style={{ padding: "10px 12px" }}><SkeletonBlock w="40px" h={10} /></td>
                  <td />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* RIGHT panel */}
      <div style={{ width: 350, flexShrink: 0, overflowY: "auto", padding: "15px", borderRadius: "10px", backgroundColor: "white" }}>
        <div style={{ backgroundColor: "white", padding: "15px", borderRadius: "10px" }}>
          <SkeletonBlock w="88%" h={14} style={{ marginBottom: "6px" }} />
          <SkeletonBlock w="60%" h={12} style={{ marginBottom: "20px" }} />
          <div style={{ height: "1px", backgroundColor: "rgba(223,223,223,1)", marginBottom: "20px" }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            {[["42%","55%"],["52%","70%"],["30%","35%"],["45%","50%"]].map(([lW, vW], i) => (
              <div key={i}>
                <SkeletonBlock w={lW} h={8} style={{ marginBottom: "6px" }} />
                <SkeletonBlock w={vW} h={13} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MaterialArchivePage() {
  const searchIcon = "/icons/search.svg";
  const externalLinkIcon = "/icons/external-link.svg";

  const [allItems, setAllItems] = useState<MaterialItem[]>([]);
  const [groupedItems, setGroupedItems] = useState<GroupedItems>({});
  const [isFetching, setIsFetching] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategoryTab, setActiveCategoryTab] = useState("");
  const [expandedCategoryTab, setExpandedCategoryTab] = useState("");
  const [activeSubCategoryTab, setActiveSubCategoryTab] = useState("");
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [filterUnits, setFilterUnits] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  const [detailItem, setDetailItem] = useState<MaterialItem | null>(null);
  const [inventoryMatches, setInventoryMatches] = useState<
    InventoryMatch[] | null
  >(null);
  const [inventoryLoading, setInventoryLoading] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());


  const [activeDatabaseTab, setActiveDatabaseTab] = useState("");
  const [showLeftDbArrow, setShowLeftDbArrow] = useState(false);
  const [showRightDbArrow, setShowRightDbArrow] = useState(false);
  const dbScrollContainerRef = useRef<HTMLDivElement>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  async function fetchItems(silent = false) {
    if (!silent) setIsFetching(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getPredefinedItems?archived=1`,
      );
      const data = await res.json();
      if (!Array.isArray(data)) return;
      setAllItems(data);
      const grouped: GroupedItems = {};
      data.forEach((item: MaterialItem) => {
        const cat = item.category_name || "Uncategorized";
        const sub = item.subcategory_name || "General";
        if (!grouped[cat]) grouped[cat] = {};
        if (!grouped[cat][sub]) grouped[cat][sub] = [];
        grouped[cat][sub].push(item);
      });
      setGroupedItems(grouped);
      setDetailItem((prev) =>
        prev
          ? (data.find((i: MaterialItem) => i.id === prev.id) ?? prev)
          : prev,
      );
      setActiveDatabaseTab((prev) => {
        if (prev) return prev;
        const firstDb = [
          ...new Set(data.map((i: MaterialItem) => i.database).filter(Boolean)),
        ].sort()[0];
        return firstDb ?? "";
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsFetching(false);
    }
  }

  useEffect(() => {
    fetchItems();
  }, []);

  // Remove bottom padding so the 3-panel layout doesn't overflow
  useEffect(() => {
    const main = document.querySelector(
      "main.protected-main",
    ) as HTMLElement | null;
    if (!main) return;
    const prev = main.style.paddingBottom;
    main.style.paddingBottom = "0px";
    return () => {
      main.style.paddingBottom = prev;
    };
  }, []);

  // ── Derived flat items ─────────────────────────────────────────────────────
  const flatItems = (() => {
    const q = searchQuery.trim().toLowerCase();
    let items: MaterialItem[] = [];
    Object.entries(groupedItems).forEach(([cat, subCats]) => {
      if (activeCategoryTab && cat !== activeCategoryTab) return;
      Object.entries(subCats).forEach(([sub, subItems]) => {
        if (activeSubCategoryTab && sub !== activeSubCategoryTab) return;
        items.push(...subItems);
      });
    });
    if (activeDatabaseTab)
      items = items.filter((i) => (i.database ?? "") === activeDatabaseTab);
    if (q)
      items = items.filter(
        (i) =>
          i.material_description?.toLowerCase().includes(q) ||
          i.item_code?.toLowerCase().includes(q) ||
          i.brand?.toLowerCase().includes(q),
      );
    if (filterUnits.length > 0)
      items = items.filter((i) => filterUnits.includes(i.unit || ""));
    return items;
  })();

  const totalPages = Math.ceil(flatItems.length / ITEMS_PER_PAGE);
  const paginatedItems = flatItems.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [
    activeSubCategoryTab,
    activeCategoryTab,
    activeDatabaseTab,
    searchQuery,
    filterUnits,
  ]);
  useEffect(() => {
    setSelectedIds(new Set());
  }, [activeDatabaseTab, activeCategoryTab, activeSubCategoryTab]);
  useEffect(() => {
    setActiveCategoryTab("");
    setActiveSubCategoryTab("");
    setExpandedCategoryTab("");
    setDetailItem(null);
  }, [activeDatabaseTab]); // eslint-disable-line

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
      .then((data) =>
        setInventoryMatches(data[detailItem.material_description] ?? []),
      )
      .catch(() => setInventoryMatches([]))
      .finally(() => setInventoryLoading(false));
  }, [detailItem?.id]); // eslint-disable-line

  // ── DB tabs ────────────────────────────────────────────────────────────────
  const availableDatabaseTabs = [
    ...new Set(
      allItems.map((i) => i.database).filter((db): db is string => Boolean(db)),
    ),
  ].sort();

  const checkDbScroll = () => {
    if (dbScrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } =
        dbScrollContainerRef.current;
      setShowLeftDbArrow(scrollLeft > 0);
      setShowRightDbArrow(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };
  const scrollDbTabs = (dir: "left" | "right") => {
    dbScrollContainerRef.current?.scrollBy({
      left: dir === "left" ? -300 : 300,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    if (isFetching) return;
    const id = requestAnimationFrame(checkDbScroll);
    return () => cancelAnimationFrame(id);
  }, [availableDatabaseTabs, isFetching]); // eslint-disable-line

  // ── Sidebar ────────────────────────────────────────────────────────────────
  const sidebarGrouped = useMemo(() => {
    const source = activeDatabaseTab
      ? allItems.filter((i) => (i.database ?? "") === activeDatabaseTab)
      : allItems;
    const grouped: GroupedItems = {};
    source.forEach((item) => {
      const cat = item.category_name || "Uncategorized";
      const sub = item.subcategory_name || "General";
      if (!grouped[cat]) grouped[cat] = {};
      if (!grouped[cat][sub]) grouped[cat][sub] = [];
      grouped[cat][sub].push(item);
    });
    return grouped;
  }, [allItems, activeDatabaseTab]);

  const sidebarCategories = Object.keys(sidebarGrouped).sort();
  const sidebarQ = sidebarSearch.trim().toLowerCase();
  const visibleSidebarCategories = sidebarCategories.filter((cat) => {
    if (!sidebarQ) return true;
    if (cat.toLowerCase().includes(sidebarQ)) return true;
    return Object.keys(sidebarGrouped[cat] || {}).some((sub) =>
      sub.toLowerCase().includes(sidebarQ),
    );
  });
  const totalFilteredCount = sidebarCategories.reduce(
    (sum, cat) => sum + Object.values(sidebarGrouped[cat] || {}).flat().length,
    0,
  );

  // ── Title case ─────────────────────────────────────────────────────────────
  function titleCase(str: string) {
    return str
      .toLowerCase()
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  // ── Restore helpers ────────────────────────────────────────────────────────
  async function restoreItems(ids: number[]) {
    await Promise.all(
      ids.map((id) =>
        fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getPredefinedItems`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, is_archived: 0 }),
        }).then((r) => {
          if (!r.ok) throw new Error();
        }),
      ),
    );
    setAllItems((prev) => prev.filter((i) => !ids.includes(i.id)));
    setGroupedItems((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((cat) =>
        Object.keys(next[cat]).forEach((sub) => {
          next[cat][sub] = next[cat][sub].filter((i) => !ids.includes(i.id));
        }),
      );
      return next;
    });
    if (detailItem && ids.includes(detailItem.id)) setDetailItem(null);
  }


  // ── Delete helper ──────────────────────────────────────────────────────────
  async function deleteItems(ids: number[]) {
    await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getPredefinedItems`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      },
    ).then((r) => {
      if (!r.ok) throw new Error();
    });
    setAllItems((prev) => prev.filter((i) => !ids.includes(i.id)));
    setGroupedItems((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((cat) =>
        Object.keys(next[cat]).forEach((sub) => {
          next[cat][sub] = next[cat][sub].filter((i) => !ids.includes(i.id));
        }),
      );
      return next;
    });
    if (detailItem && ids.includes(detailItem.id)) setDetailItem(null);
  }

  // ── Pagination ─────────────────────────────────────────────────────────────
  function PaginationControls() {
    const getPageNumbers = () => {
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
    if (totalPages <= 1) return null;
    const btnBase: React.CSSProperties = {
      padding: "6px 10px",
      borderRadius: "5px",
      border: "1px solid rgba(223,223,223,1)",
      backgroundColor: "white",
      fontWeight: 600,
      minWidth: "36px",
      color: "black",
      cursor: "pointer",
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
  }

  function InfoLabel({ label }: { label: string }) {
    return (
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
        {label}
      </small>
    );
  }
  function InfoValue({ value }: { value: string | null | undefined }) {
    return (
      <p style={{ fontWeight: 600, fontSize: "14px", color: "#111" }}>
        {value || "N/A"}
      </p>
    );
  }

  return (
    <div className="dashboard">
      <style>{`
        .items-table tbody tr.material-db-row-active td,
        .items-table tbody tr.material-db-row-active:hover td { background-color: rgba(219,255,240,1) !important; }
        .items-table tbody tr.material-db-row-active { outline: 1px solid rgba(0,163,93,1); outline-offset: -1px; }
        .material-db-table { border-top-left-radius: 0 !important; border-top-right-radius: 0 !important; }
        .material-db-table thead tr:first-child th:first-child { border-top-left-radius: 0 !important; }
        .material-db-table thead tr:first-child th:last-child { border-top-right-radius: 0 !important; }
      `}</style>

      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
        }}
      >
        <h1>MATERIAL ARCHIVE</h1>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Button
            componentType="link"
            bgColor="white"
            borderColor="rgba(220,220,220,1)"
            textColor="black"
            href="/settings/manage/material"
          >
            <img src="/icons/database.svg" alt="" />
            DATABASE
          </Button>
          <ExportMaterialListPDFButton allItems={allItems} />
        </div>
      </div>

      {isFetching ? (
        <SkeletonLayout />
      ) : (
        <div
          style={{
            display: "flex",
            height: "calc(100dvh - 250px)",
            overflow: "hidden",
            gap: "16px",
          }}
        >
          {/* ── LEFT: category sidebar ────────────────────────────────────────── */}
          <div
            style={{
              width: 350,
              flexShrink: 0,
              overflow: "hidden",
              backgroundColor: "white",
              color: "black",
              display: "flex",
              flexDirection: "column",
              padding: "15px",
              borderRadius: "10px",
            }}
          >
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
            <br />
            <div style={{ paddingBottom: "8px", flexShrink: 0 }}>
              <div style={{ position: "relative" }}>
                <img
                  src={searchIcon}
                  alt="search"
                  style={{
                    position: "absolute",
                    right: "11px",
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
                    padding: "7px 34px 7px 12px",
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
            <br />
            <div style={{ flex: 1, overflowY: "auto" }}>
              {/* All Materials */}
              <button
                type="button"
                onClick={() => {
                  setActiveCategoryTab("");
                  setActiveSubCategoryTab("");
                  setExpandedCategoryTab("");
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
                const catCount = Object.values(sidebarGrouped[cat] || {}).flat()
                  .length;
                const visibleSubs = Object.keys(sidebarGrouped[cat] || {})
                  .sort()
                  .filter(
                    (sub) =>
                      !sidebarQ ||
                      cat.toLowerCase().includes(sidebarQ) ||
                      sub.toLowerCase().includes(sidebarQ),
                  );

                return (
                  <div key={cat} style={{ marginBottom: "4px" }}>
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
                          if (isCatExpanded && !isCatActive) {
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
                          padding: "9px 10px",
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
                          <span>{titleCase(cat)}</span>
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
                      </button>
                      {isCatActive && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            flexShrink: 0,
                          }}
                        >
                          <RestoreArchivedCategoryButton
                            categoryName={titleCase(cat)}
                            count={Object.values(sidebarGrouped[cat] || {}).flat().length}
                            inverted
                            onConfirm={async () => {
                              const ids = Object.values(sidebarGrouped[cat] || {}).flat().map((i) => i.id);
                              await restoreItems(ids);
                              toast(`${ids.length} material${ids.length !== 1 ? "s" : ""} in "${titleCase(cat)}" restored.`, "success");
                              setActiveCategoryTab("");
                              setExpandedCategoryTab("");
                            }}
                          />
                          <DeleteArchivedCategoryButton
                            categoryName={titleCase(cat)}
                            count={Object.values(sidebarGrouped[cat] || {}).flat().length}
                            inverted
                            onConfirm={async () => {
                              const ids = Object.values(
                                sidebarGrouped[cat] || {},
                              )
                                .flat()
                                .map((i) => i.id);
                              await deleteItems(ids);
                              toast(
                                `${ids.length} material${ids.length !== 1 ? "s" : ""} permanently deleted.`,
                                "success",
                              );
                              setActiveCategoryTab("");
                              setExpandedCategoryTab("");
                            }}
                          />
                        </div>
                      )}
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 600,
                          backgroundColor: "white",
                          color: "black",
                          borderRadius: "50px",
                          padding: "1px 7px",
                          flexShrink: 0,
                          marginRight: "8px",
                        }}
                      >
                        {catCount.toLocaleString()}
                      </span>
                    </div>

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
                          const subCount = (sidebarGrouped[cat]?.[sub] || [])
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
                                  padding: "7px 10px",
                                  background: "transparent",
                                  border: "none",
                                  cursor: "pointer",
                                  fontWeight: 400,
                                  fontSize: "12px",
                                  textAlign: "left",
                                  gap: "8px",
                                  color: "black",
                                  whiteSpace: "normal",
                                  wordBreak: "break-word",
                                }}
                              >
                                <span
                                  style={{
                                    flex: 1,
                                    textDecoration: isSubActive
                                      ? "underline"
                                      : "none",
                                  }}
                                >
                                  {titleCase(sub)}
                                </span>
                              </button>
                              <div
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  flexShrink: 0,
                                }}
                              >
                                <RestoreArchivedSubCategoryButton
                                  subCategoryName={titleCase(sub)}
                                  count={(sidebarGrouped[cat]?.[sub] || []).length}
                                  onConfirm={async () => {
                                    const ids = (sidebarGrouped[cat]?.[sub] || []).map((i) => i.id);
                                    await restoreItems(ids);
                                    toast(`${ids.length} material${ids.length !== 1 ? "s" : ""} in "${titleCase(sub)}" restored.`, "success");
                                    setActiveSubCategoryTab("");
                                  }}
                                />
                                <DeleteArchivedSubCategoryButton
                                  subCategoryName={titleCase(sub)}
                                  count={
                                    (sidebarGrouped[cat]?.[sub] || []).length
                                  }
                                  onConfirm={async () => {
                                    const ids = (
                                      sidebarGrouped[cat]?.[sub] || []
                                    ).map((i) => i.id);
                                    await deleteItems(ids);
                                    toast(
                                      `${ids.length} material${ids.length !== 1 ? "s" : ""} permanently deleted.`,
                                      "success",
                                    );
                                    setActiveSubCategoryTab("");
                                  }}
                                />
                              </div>
                              <span
                                style={{
                                  fontSize: "10px",
                                  fontWeight: 600,
                                  backgroundColor: "white",
                                  color: "black",
                                  borderRadius: "50px",
                                  padding: "1px 6px",
                                  flexShrink: 0,
                                  marginRight: "6px",
                                }}
                              >
                                {subCount.toLocaleString()}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── CENTER ───────────────────────────────────────────────────────── */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minWidth: 0,
              overflow: "hidden",
              color: "black",
            }}
          >
            <div style={{ padding: "12px 20px 15px", flexShrink: 0 }}>
              {/* Breadcrumb */}
              <h2 style={{ marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                {!activeCategoryTab ? (
                  "All Materials"
                ) : activeSubCategoryTab ? (
                  <>
                    {titleCase(activeCategoryTab)}{" "}
                    <span style={{ fontWeight: 400, color: "rgba(120,120,120,1)" }}>/</span>{" "}
                    <span style={{ textDecoration: "underline" }}>{titleCase(activeSubCategoryTab)}</span>
                    <EditSubCategoryButton
                      subCategoryId={
                        (sidebarGrouped[activeCategoryTab]?.[activeSubCategoryTab] || [])[0]?.subcategory_id
                      }
                      subCategoryName={activeSubCategoryTab}
                      onSuccess={(newName) => {
                        fetchItems(true);
                        setActiveSubCategoryTab(newName);
                      }}
                    />
                  </>
                ) : (
                  <>
                    <span style={{ textDecoration: "underline" }}>{titleCase(activeCategoryTab)}</span>
                    <EditCategoryButton
                      categoryId={
                        Object.values(sidebarGrouped[activeCategoryTab] || {}).flat()[0]?.category_id
                      }
                      categoryName={activeCategoryTab}
                      onSuccess={(newName) => {
                        fetchItems(true);
                        setActiveCategoryTab(newName);
                        setExpandedCategoryTab(newName);
                      }}
                    />
                  </>
                )}
              </h2>

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  alignItems: "center",
                  marginBottom: "15px",
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
              </div>
              <div
                style={{ display: "flex", flexDirection: "column", gap: "15px" }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <FilterButton
                    filterUnits={filterUnits}
                    onChange={setFilterUnits}
                  />
                  <ArchiveBulkActionsButton
                    selectedItems={paginatedItems.filter((i) => selectedIds.has(i.id))}
                    onRestoreSuccess={(ids) => {
                      setAllItems((prev) => prev.filter((i) => !ids.includes(i.id)));
                      setGroupedItems((prev) => {
                        const next = { ...prev };
                        Object.keys(next).forEach((cat) =>
                          Object.keys(next[cat]).forEach((sub) => {
                            next[cat][sub] = next[cat][sub].filter((i) => !ids.includes(i.id));
                          }),
                        );
                        return next;
                      });
                      if (detailItem && ids.includes(detailItem.id)) setDetailItem(null);
                      setSelectedIds(new Set());
                    }}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{ fontSize: "12px", color: "rgba(120,120,120,1)" }}
                  >
                    {flatItems.length.toLocaleString()} materials found
                  </span>
                  <span
                    style={{
                      fontSize: "12px",
                      color: "rgba(120,120,120,1)",
                      minHeight: "16px",
                    }}
                  >
                    {selectedIds.size > 0
                      ? `${selectedIds.size} material${selectedIds.size !== 1 ? "s" : ""} selected`
                      : ""}
                  </span>
                </div>
              </div>
            </div>

            <div
              style={{ flex: 1, overflowY: "auto", padding: "8px 20px 16px" }}
            >
              {/* Database tabs */}
              {availableDatabaseTabs.length > 0 && (
                <div style={{ display: "flex", alignItems: "flex-end", gap: "6px" }}>
                <div
                  style={{
                    flex: 1,
                    position: "relative",
                    overflow: "hidden",
                    marginBottom: 0,
                  }}
                >
                  {showLeftDbArrow && (
                    <>
                      <div
                        style={{
                          position: "absolute",
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: "80px",
                          background:
                            "linear-gradient(to right, white 0%, rgba(255,255,255,0) 100%)",
                          pointerEvents: "none",
                          zIndex: 5,
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => scrollDbTabs("left")}
                        style={{
                          position: "absolute",
                          left: 0,
                          top: "50%",
                          transform: "translateY(-50%)",
                          zIndex: 10,
                          backgroundColor: "black",
                          border: "none",
                          borderRadius: "10px",
                          width: "28px",
                          height: "28px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                        }}
                      >
                        <img
                          src="/icons/arrow-right.svg"
                          style={{ transform: "rotate(180deg)" }}
                          alt="left"
                        />
                      </button>
                    </>
                  )}
                  <div
                    ref={dbScrollContainerRef}
                    onScroll={checkDbScroll}
                    style={{
                      display: "flex",
                      gap: "6px",
                      overflowX: "auto",
                      scrollbarWidth: "none",
                      msOverflowStyle: "none" as any,
                      paddingLeft: showLeftDbArrow ? "36px" : "0",
                      paddingRight: showRightDbArrow ? "36px" : "0",
                    }}
                  >
                    {availableDatabaseTabs.map((db) => {
                      const isActive = activeDatabaseTab === db;
                      return (
                        <div
                          key={db}
                          onClick={() => {
                            if (!isActive) setActiveDatabaseTab(db);
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "15px",
                            padding: "7px 10px",
                            borderRadius: "6px 6px 0 0",
                            backgroundColor: isActive
                              ? "rgba(239,239,239,1)"
                              : "rgb(221,221,221)",
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                            fontSize: "12px",
                            fontWeight: 600,
                            flexShrink: 0,
                            minWidth: "125px",
                            userSelect: "none",
                          }}
                        >
                          <span style={{ flex: 1, color: "black" }}>
                            {db
                              .split(" ")
                              .map(
                                (w) =>
                                  w.charAt(0).toUpperCase() +
                                  w.slice(1).toLowerCase(),
                              )
                              .join(" ")}
                          </span>
                          <div
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              flexShrink: 0,
                            }}
                          >
                            <RestoreArchivedDatabaseButton
                              databaseName={db}
                              count={allItems.filter((i) => (i.database ?? "") === db).length}
                              onConfirm={async () => {
                                const ids = allItems.filter((i) => (i.database ?? "") === db).map((i) => i.id);
                                await restoreItems(ids);
                                toast(`${ids.length} material${ids.length !== 1 ? "s" : ""} in "${db}" restored.`, "success");
                              }}
                            />
                            <DeleteArchivedDatabaseButton
                              databaseName={db}
                              count={
                                allItems.filter(
                                  (i) => (i.database ?? "") === db,
                                ).length
                              }
                              onConfirm={async () => {
                                const ids = allItems
                                  .filter((i) => (i.database ?? "") === db)
                                  .map((i) => i.id);
                                await deleteItems(ids);
                                toast(
                                  `${ids.length} material${ids.length !== 1 ? "s" : ""} permanently deleted.`,
                                  "success",
                                );
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {showRightDbArrow && (
                    <>
                      <div
                        style={{
                          position: "absolute",
                          right: 0,
                          top: 0,
                          bottom: 0,
                          width: "80px",
                          background:
                            "linear-gradient(to left, white 0%, rgba(255,255,255,0) 100%)",
                          pointerEvents: "none",
                          zIndex: 5,
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => scrollDbTabs("right")}
                        style={{
                          position: "absolute",
                          right: 0,
                          top: "50%",
                          transform: "translateY(-50%)",
                          zIndex: 10,
                          backgroundColor: "black",
                          border: "none",
                          borderRadius: "10px",
                          width: "28px",
                          height: "28px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                        }}
                      >
                        <img src="/icons/arrow-right.svg" alt="right" />
                      </button>
                    </>
                  )}
                </div>
                </div>
              )}

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
                    NO ARCHIVED MATERIALS
                  </h2>
                </div>
              ) : (
                <table
                  className="items-table material-db-table"
                  style={{ tableLayout: "fixed", width: "100%" }}
                >
                  <colgroup>
                    <col style={{ width: "40px" }} />
                    <col style={{ width: "200px" }} />
                    <col />
                    <col style={{ width: "150px" }} />
                    <col style={{ width: "48px" }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th style={{ position: "sticky", top: 0, zIndex: 1 }}>
                        <input
                          type="checkbox"
                          className="manager-checkbox"
                          checked={
                            paginatedItems.length > 0 &&
                            paginatedItems.every((i) => selectedIds.has(i.id))
                          }
                          onChange={(e) => {
                            setSelectedIds((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked)
                                paginatedItems.forEach((i) => next.add(i.id));
                              else
                                paginatedItems.forEach((i) =>
                                  next.delete(i.id),
                                );
                              return next;
                            });
                          }}
                        />
                      </th>
                      <th style={{ position: "sticky", top: 0, zIndex: 1 }}>
                        CODE
                      </th>
                      <th style={{ position: "sticky", top: 0, zIndex: 1 }}>
                        MATERIAL
                      </th>
                      <th style={{ position: "sticky", top: 0, zIndex: 1 }}>
                        UNIT
                      </th>
                      <th style={{ position: "sticky", top: 0, zIndex: 1 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedItems.map((item) => {
                      const isDetailing = detailItem?.id === item.id;
                      return (
                        <tr
                          key={item.id}
                          onClick={() => setDetailItem(item)}
                          className={
                            isDetailing ? "material-db-row-active" : ""
                          }
                          style={{ cursor: "pointer" }}
                        >
                          <td
                            onClick={(e) => e.stopPropagation()}
                            style={{ textAlign: "center" }}
                          >
                            <input
                              type="checkbox"
                              className="manager-checkbox"
                              checked={selectedIds.has(item.id)}
                              onChange={(e) => {
                                setSelectedIds((prev) => {
                                  const next = new Set(prev);
                                  if (e.target.checked) next.add(item.id);
                                  else next.delete(item.id);
                                  return next;
                                });
                              }}
                            />
                          </td>
                          <td style={{ fontWeight: 600 }}>{item.item_code}</td>
                          <td>
                            <div
                              style={{
                                fontWeight: 600,
                                color: "rgba(0,123,255,1)",
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
                              <span>{item.category_name || "N/A"}</span>
                              <span>/</span>
                              <span>{item.subcategory_name || "N/A"}</span>
                            </div>
                          </td>
                          <td>{item.unit || "N/A"}</td>
                          <td
                            onClick={(e) => e.stopPropagation()}
                            style={{ padding: "4px 0" }}
                          >
                            <ThreeDotsMenuButton>
                              <RestoreArchivedMaterialButton
                                item={item}
                                onSuccess={() => {
                                  setAllItems((prev) =>
                                    prev.filter((i) => i.id !== item.id),
                                  );
                                  setGroupedItems((prev) => {
                                    const next = { ...prev };
                                    Object.keys(next).forEach((cat) =>
                                      Object.keys(next[cat]).forEach((sub) => {
                                        next[cat][sub] = next[cat][sub].filter(
                                          (i) => i.id !== item.id,
                                        );
                                      }),
                                    );
                                    return next;
                                  });
                                  if (detailItem?.id === item.id)
                                    setDetailItem(null);
                                }}
                              />
                              <DeleteArchivedMaterialButton
                                item={item}
                                onSuccess={() => {
                                  setAllItems((prev) =>
                                    prev.filter((i) => i.id !== item.id),
                                  );
                                  setGroupedItems((prev) => {
                                    const next = { ...prev };
                                    Object.keys(next).forEach((cat) =>
                                      Object.keys(next[cat]).forEach((sub) => {
                                        next[cat][sub] = next[cat][sub].filter(
                                          (i) => i.id !== item.id,
                                        );
                                      }),
                                    );
                                    return next;
                                  });
                                  if (detailItem?.id === item.id)
                                    setDetailItem(null);
                                }}
                              />
                            </ThreeDotsMenuButton>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ flexShrink: 0 }}>
              <PaginationControls />
            </div>
          </div>

          {/* ── RIGHT: detail panel ───────────────────────────────────────────── */}
          <div
            style={{
              width: 350,
              flexShrink: 0,
              overflowY: "auto",
              padding: "15px",
              borderRadius: "10px",
              backgroundColor: "white",
            }}
          >
            {detailItem ? (
              <>
                <div
                  style={{
                    padding: "15px",
                    backgroundColor: "rgba(248,248,248,1)",
                    borderRadius: "10px",
                  }}
                >
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
                    <span
                      style={{ fontSize: "11px", color: "rgba(130,130,130,1)" }}
                    >
                      {detailItem.item_code}
                    </span>
                    {detailItem.brand && (
                      <span
                        style={{
                          fontSize: "11px",
                          color: "rgba(130,130,130,1)",
                        }}
                      >
                        {" "}
                        • {detailItem.brand}
                      </span>
                    )}
                  </div>
                  <hr
                    style={{
                      border: "none",
                      borderTop: "1px solid rgba(223,223,223,1)",
                      margin: "0 0 20px",
                    }}
                  />
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "20px",
                    }}
                  >
                    <div>
                      <InfoLabel label="CATEGORY" />
                      <InfoValue value={detailItem.category_name} />
                    </div>
                    <div>
                      <InfoLabel label="SUBCATEGORY" />
                      <InfoValue value={detailItem.subcategory_name} />
                    </div>
                    <div>
                      <InfoLabel label="UNIT" />
                      <InfoValue value={detailItem.unit} />
                    </div>
                    <div>
                      <InfoLabel label="ADDED BY" />
                      <InfoValue value={detailItem.added_by ?? "SYSTEM"} />
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: "20px" }}>
                  <h4
                    style={{
                      fontWeight: 600,
                      fontSize: "13px",
                      marginBottom: "3px",
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
                  ) : inventoryMatches ===
                    null ? null : inventoryMatches.length === 0 ? (
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
                  ) : (
                    <div
                      style={{
                        border: "1px solid rgba(230,230,230,1)",
                        borderRadius: "10px",
                        overflow: "hidden",
                      }}
                    >
                      {inventoryMatches.map((m, i) => (
                        <div
                          key={`${m.inventory_item_id}-${i}`}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            justifyContent: "space-between",
                            gap: "12px",
                            padding: "12px",
                            borderBottom:
                              i < inventoryMatches.length - 1
                                ? "1px solid rgba(230,230,230,1)"
                                : "none",
                          }}
                        >
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
                              }}
                            >
                              {m.match_type === "exact"
                                ? "Exact Match"
                                : "Similar Match"}
                            </span>
                          </div>
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
                </div>
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
                Click any row to see item details
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
