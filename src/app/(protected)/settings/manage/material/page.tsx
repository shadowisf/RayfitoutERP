"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import Button from "@/app/components/Button";
import ExportMaterialListPDFButton from "@/app/components/_ExportMaterialListPDFButton";
import { toast } from "@/app/components/Toast";
import { InventoryMatch } from "@/app/(protected)/mr/[id]/components/department/_InventoryStatusCell";
import { PredefinedItem } from "@/app/components/_MultipleSelectMaterialItemButton";
import ThreeDotsMenuButton from "@/app/components/_ThreeButtonsMenuButton";
import CreateNewMaterialButton from "@/app/components/_CreateNewMaterialButton";
import EditMaterialButton from "./components/_EditMaterialButton";
import DuplicateMaterialButton from "./components/_DuplicateMaterialButton";
import CopyMaterialButton from "./components/_CopyMaterialButton";
import MoveMaterialButton from "./components/_MoveMaterialButton";
import ArchiveMaterialButton from "./components/_ArchiveMaterialButton";
import RenameDatabaseButton from "./components/_RenameDatabaseButton";
import ArchiveDatabaseButton from "./components/_ArchiveDatabaseButton";
import BulkActionsButton from "./components/_BulkActionsButton";
import EditCategoryButton from "./components/_EditCategoryButton";
import ArchiveCategoryButton from "./components/_ArchiveCategoryButton";
import EditSubCategoryButton from "./components/_EditSubCategoryButton";
import ArchiveSubCategoryButton from "./components/_ArchiveSubCategoryButton";
import AddMaterialToSubCategoryButton from "./components/_AddMaterialToSubCategoryButton";
import CreateCategoryButton from "@/app/(protected)/mr/[id]/components/department/_CreateCategoryButton";
import CreateSubCategoryButton from "@/app/(protected)/mr/[id]/components/department/_CreateSubcategoryButton";
import CreateDatabaseButton from "./components/_CreateDatabaseButton";
import MergeDatabasesButton from "./components/_MergeDatabasesButton";
import ImportMaterialButton from "./components/_ImportMaterialButton";
import FilterButton from "./components/_FilterButton";

// Extended type with new columns
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

// ── Shimmer constants (same as MultipleSelectMaterialItemButton) ─────────────
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
    { w: "72%" }, { w: "58%" }, { w: "68%" }, { w: "62%" },
    { w: "75%" }, { w: "60%" }, { w: "66%" }, { w: "53%" },
    { w: "70%" }, { w: "64%" }, { w: "57%" }, { w: "78%" },
    { w: "61%" }, { w: "73%" }, { w: "55%" }, { w: "69%" },
    { w: "76%" }, { w: "59%" }, { w: "67%" }, { w: "71%" },
    { w: "54%" }, { w: "80%" }, { w: "63%" }, { w: "56%" },
  ];
  const dbTabs = ["110px", "130px", "95px", "120px", "105px"];
  const tableRows = [
    ["62%", "35%"],
    ["48%", "28%"],
    ["74%", "42%"],
    ["56%", "32%"],
    ["68%", "39%"],
    ["51%", "29%"],
    ["77%", "45%"],
    ["60%", "34%"],
    ["65%", "37%"],
    ["53%", "30%"],
    ["71%", "40%"],
    ["58%", "33%"],
    ["79%", "46%"],
    ["44%", "26%"],
    ["67%", "38%"],
  ];

  return (
    <>
      {/* Page header skeleton */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
        }}
      >
        <SkeletonBlock w="220px" h={28} />
        <div style={{ display: "flex", gap: "10px" }}>
          <SkeletonBlock w="100px" h={36} style={{ borderRadius: "8px" }} />
          <SkeletonBlock w="165px" h={36} style={{ borderRadius: "8px" }} />
          <SkeletonBlock w="90px" h={36} style={{ borderRadius: "8px" }} />
        </div>
      </div>
      <div
        style={{
          display: "flex",
          height: "calc(100dvh - 250px)",
          overflow: "hidden",
          gap: "16px",
        }}
      >
        {/* LEFT sidebar */}
        <div
          style={{
            width: 350,
            flexShrink: 0,
            overflow: "hidden",
            backgroundColor: "white",
            display: "flex",
            flexDirection: "column",
            padding: "15px",
            borderRadius: "10px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "12px",
              flexShrink: 0,
            }}
          >
            <SkeletonBlock w="58%" h={9} />
            <SkeletonBlock w="80px" h={9} />
          </div>
          <div
            style={{
              height: "33px",
              borderRadius: "8px",
              border: "1px solid rgba(220,220,220,1)",
              backgroundColor: "white",
              marginBottom: "12px",
              flexShrink: 0,
            }}
          />
          <div
            style={{
              height: "36px",
              borderRadius: "5px",
              backgroundColor: "rgba(0,0,0,0.10)",
              marginBottom: "6px",
              flexShrink: 0,
            }}
          />
          <div
            style={{
              flex: 1,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              gap: "2px",
            }}
          >
            {sidebarRows.map((row, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "7px 8px",
                }}
              >
                <SkeletonBlock w={row.w} h={11} />
                <div
                  style={{
                    marginLeft: "auto",
                    width: "30px",
                    height: "17px",
                    borderRadius: "50px",
                    backgroundColor: "white",
                    border: "1px solid rgba(220,220,220,1)",
                    flexShrink: 0,
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* CENTER */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            overflow: "hidden",
            backgroundColor: "#f8f9fb",
            borderRadius: "10px",
          }}
        >
          <div style={{ padding: "12px 20px 15px", flexShrink: 0 }}>
            <SkeletonBlock w="45%" h={22} style={{ marginBottom: "10px" }} />
            <div
              style={{
                display: "flex",
                gap: "10px",
                alignItems: "center",
                marginBottom: "15px",
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
              <SkeletonBlock
                w="130px"
                h={37}
                style={{ borderRadius: "8px", flexShrink: 0 }}
              />
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
                <SkeletonBlock
                  w="68px"
                  h={30}
                  style={{ borderRadius: "50px" }}
                />
                <SkeletonBlock
                  w="90px"
                  h={30}
                  style={{ borderRadius: "8px" }}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <SkeletonBlock w="140px" h={10} />
              </div>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 20px 16px" }}>
            {/* DB tabs */}
            <div style={{ display: "flex", gap: "6px", marginBottom: "0" }}>
              {dbTabs.map((w, i) => (
                <div
                  key={i}
                  style={{
                    width: w,
                    height: "36px",
                    borderRadius: "6px 6px 0 0",
                    backgroundColor: "rgba(221,221,221,1)",
                    flexShrink: 0,
                  }}
                />
              ))}
            </div>
            <table
              style={{
                tableLayout: "fixed",
                width: "100%",
                borderCollapse: "collapse",
                backgroundColor: "white",
              }}
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
                  <th
                    style={{
                      padding: "10px 0",
                      borderBottom: "1px solid rgba(220,220,220,1)",
                    }}
                  />
                  <th
                    style={{
                      padding: "10px 12px 10px 0",
                      borderBottom: "1px solid rgba(220,220,220,1)",
                    }}
                  >
                    <SkeletonBlock w="40px" h={10} />
                  </th>
                  <th
                    style={{
                      padding: "10px 12px 10px 0",
                      borderBottom: "1px solid rgba(220,220,220,1)",
                    }}
                  >
                    <SkeletonBlock w="60px" h={10} />
                  </th>
                  <th
                    style={{
                      padding: "10px 12px",
                      borderBottom: "1px solid rgba(220,220,220,1)",
                    }}
                  >
                    <SkeletonBlock w="35px" h={10} />
                  </th>
                  <th
                    style={{ borderBottom: "1px solid rgba(220,220,220,1)" }}
                  />
                </tr>
              </thead>
              <tbody>
                {tableRows.map(([nameW, subW], i) => (
                  <tr
                    key={i}
                    style={{ borderBottom: "1px solid rgba(239,239,239,1)" }}
                  >
                    <td style={{ padding: "10px 0" }}>
                      <div
                        style={{
                          width: "16px",
                          height: "16px",
                          borderRadius: "3px",
                          border: "1px solid rgba(210,210,210,1)",
                          margin: "0 auto",
                        }}
                      />
                    </td>
                    <td style={{ padding: "10px 12px 10px 0" }}>
                      <SkeletonBlock w="75%" h={11} />
                    </td>
                    <td style={{ padding: "10px 12px 10px 0" }}>
                      <SkeletonBlock
                        w={nameW}
                        h={12}
                        style={{ marginBottom: "5px" }}
                      />
                      <SkeletonBlock w={subW} h={9} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT panel */}
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
          <div
            style={{
              backgroundColor: "white",
              padding: "15px",
              borderRadius: "10px",
            }}
          >
            <SkeletonBlock w="88%" h={14} style={{ marginBottom: "6px" }} />
            <SkeletonBlock w="60%" h={12} style={{ marginBottom: "20px" }} />
            <div
              style={{
                height: "1px",
                backgroundColor: "rgba(223,223,223,1)",
                marginBottom: "20px",
              }}
            />
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
              ].map(([lW, vW], i) => (
                <div key={i}>
                  <SkeletonBlock w={lW} h={8} style={{ marginBottom: "6px" }} />
                  <SkeletonBlock w={vW} h={13} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function MaterialDatabasePage() {
  const searchIcon = "/icons/search.svg";
  const externalLinkIcon = "/icons/external-link.svg";

  // ── Data ─────────────────────────────────────────────────────────────────
  const [allItems, setAllItems] = useState<MaterialItem[]>([]);
  const [groupedItems, setGroupedItems] = useState<GroupedItems>({});
  const [isFetching, setIsFetching] = useState(false);

  // ── Filters ───────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategoryTab, setActiveCategoryTab] = useState("");
  const [expandedCategoryTab, setExpandedCategoryTab] = useState("");
  const [activeSubCategoryTab, setActiveSubCategoryTab] = useState("");
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [filterUnits, setFilterUnits] = useState<string[]>([]);

  // ── Pagination ────────────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);

  // ── Right panel ───────────────────────────────────────────────────────────
  const [detailItem, setDetailItem] = useState<MaterialItem | null>(null);
  const [inventoryMatches, setInventoryMatches] = useState<
    InventoryMatch[] | null
  >(null);
  const [inventoryLoading, setInventoryLoading] = useState(false);

  // ── Changelog ─────────────────────────────────────────────────────────────
  type ChangelogEntry = {
    id: number;
    predefined_item_id: number;
    action: string;
    old_value: string | null;
    new_value: string | null;
    changed_by: string | null;
    changed_at: string;
  };
  const [changelog, setChangelog] = useState<ChangelogEntry[]>([]);
  const [changelogLoading, setChangelogLoading] = useState(false);
  const [changelogTick, setChangelogTick] = useState(0);

  // ── Bulk selection ────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // ── Known categories & subcategories (for empty-category sidebar support) ──
  const [knownCategories, setKnownCategories] = useState<
    { id: number; value: string }[]
  >([]);
  const [knownSubCategories, setKnownSubCategories] = useState<
    { id: number; category_id: number; value: string }[]
  >([]);

  async function fetchCategories() {
    const [cats, subs] = await Promise.all([
      fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMaterialCategoryValues`,
      ).then((r) => r.json()),
      fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMaterialSubCategoryValues`,
      ).then((r) => r.json()),
    ]);
    if (Array.isArray(cats)) setKnownCategories(cats);
    if (Array.isArray(subs)) setKnownSubCategories(subs);
  }

  // ── Database tabs ─────────────────────────────────────────────────────────
  const [activeDatabaseTab, setActiveDatabaseTab] = useState("");
  const [registryDatabases, setRegistryDatabases] = useState<
    { id: number; name: string }[]
  >([]);
  const [selectedDatabaseIds, setSelectedDatabaseIds] = useState<Set<number>>(
    new Set(),
  );
  const [showLeftDbArrow, setShowLeftDbArrow] = useState(false);
  const [showRightDbArrow, setShowRightDbArrow] = useState(false);
  const dbScrollContainerRef = useRef<HTMLDivElement>(null);

  // ── Fetch items ───────────────────────────────────────────────────────────
  function refreshChangelog() {
    setChangelogTick((t) => t + 1);
  }

  async function fetchItems(silent = false, bumpChangelog = false) {
    if (bumpChangelog) refreshChangelog();
    if (!silent) setIsFetching(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getPredefinedItems`,
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
      // Refresh detailItem with up-to-date data if it's open
      setDetailItem((prev) =>
        prev
          ? (data.find((i: MaterialItem) => i.id === prev.id) ?? prev)
          : prev,
      );
      // Auto-select first database tab on initial load
      setActiveDatabaseTab((prev) => {
        if (prev) return prev; // keep existing selection
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
    fetchCategories();
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getDatabases`)
      .then((r) => r.json())
      .then((data: { id: number; name: string }[]) => {
        if (Array.isArray(data)) setRegistryDatabases(data);
      })
      .catch(console.error);
  }, []);

  // Remove bottom padding on the layout's <main> so the fixed-height 3-panel
  // layout doesn't overflow and create an outer scrollbar. Restored on unmount.
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

  // ── Derived flat items ────────────────────────────────────────────────────
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
    if (activeDatabaseTab) {
      items = items.filter(
        (item) => (item.database ?? "") === activeDatabaseTab,
      );
    }
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
    return items;
  })();

  const totalPages = Math.ceil(flatItems.length / ITEMS_PER_PAGE);
  const paginatedItems = flatItems.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  // ── Duplicate detection (exact description match) ────────────────────────
  const duplicateMap = useMemo(() => {
    const normalize = (s: string) =>
      s.toLowerCase().replace(/\s+/g, " ").trim();

    const groups = new Map<string, number[]>();
    allItems.forEach((item) => {
      const db = item.database ?? "";
      const key = `${db}::${normalize(item.material_description || "")}`;
      if (!normalize(item.material_description || "")) return;
      const group = groups.get(key) ?? [];
      group.push(item.id);
      groups.set(key, group);
    });

    const map = new Map<number, number>();
    groups.forEach((ids) => {
      if (ids.length < 2) return;
      ids.forEach((id) => map.set(id, ids.length - 1));
    });
    return map;
  }, [allItems]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    activeSubCategoryTab,
    activeCategoryTab,
    activeDatabaseTab,
    searchQuery,
    filterUnits,
  ]);

  // Clear selection when the view changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [activeDatabaseTab, activeCategoryTab, activeSubCategoryTab]);

  // Reset category/subcategory when switching databases
  useEffect(() => {
    setActiveCategoryTab("");
    setActiveSubCategoryTab("");
    setExpandedCategoryTab("");
    setDetailItem(null);
  }, [activeDatabaseTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch inventory mapping for detail panel ──────────────────────────────
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

  // ── Fetch changelog for detail panel ─────────────────────────────────────
  useEffect(() => {
    if (!detailItem) {
      setChangelog([]);
      return;
    }
    setChangelogLoading(true);
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getPredefinedItemChangelog?predefined_item_id=${detailItem.id}`,
    )
      .then((r) => r.json())
      .then((data) => setChangelog(Array.isArray(data) ? data : []))
      .catch(() => setChangelog([]))
      .finally(() => setChangelogLoading(false));
  }, [detailItem?.id, changelogTick]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Optimistic update helpers ─────────────────────────────────────────────
  function optimisticRenameCategory(oldName: string, newName: string) {
    setAllItems((prev) =>
      prev.map((i) =>
        i.category_name === oldName ? { ...i, category_name: newName } : i,
      ),
    );
    setGroupedItems((prev) => {
      const next = { ...prev };
      if (next[oldName]) {
        next[newName] = next[oldName];
        delete next[oldName];
      }
      return next;
    });
  }

  function optimisticArchiveCategory(catName: string) {
    setAllItems((prev) => prev.filter((i) => i.category_name !== catName));
    setGroupedItems((prev) => {
      const next = { ...prev };
      delete next[catName];
      return next;
    });
  }

  function optimisticRenameSubCategory(catName: string, oldSub: string, newSub: string) {
    setAllItems((prev) =>
      prev.map((i) =>
        i.category_name === catName && i.subcategory_name === oldSub
          ? { ...i, subcategory_name: newSub }
          : i,
      ),
    );
    setGroupedItems((prev) => {
      const cat = prev[catName];
      if (!cat) return prev;
      const next = { ...cat };
      if (next[oldSub]) {
        next[newSub] = next[oldSub].map((i) => ({ ...i, subcategory_name: newSub }));
        delete next[oldSub];
      }
      return { ...prev, [catName]: next };
    });
  }

  function optimisticArchiveSubCategory(catName: string, subName: string) {
    setAllItems((prev) =>
      prev.filter((i) => !(i.category_name === catName && i.subcategory_name === subName)),
    );
    setGroupedItems((prev) => {
      const cat = prev[catName];
      if (!cat) return prev;
      const next = { ...cat };
      delete next[subName];
      return { ...prev, [catName]: next };
    });
  }

  function optimisticUpdateMaterial(updatedItem: MaterialItem) {
    const newCat = updatedItem.category_name || "Uncategorized";
    const newSub = updatedItem.subcategory_name || "General";
    setAllItems((prev) =>
      prev.map((i) => (i.id === updatedItem.id ? updatedItem : i)),
    );
    setGroupedItems((prev) => {
      // Remove from old location, add to new
      const next: GroupedItems = {};
      Object.entries(prev).forEach(([cat, subs]) => {
        next[cat] = {};
        Object.entries(subs).forEach(([sub, items]) => {
          next[cat][sub] = items.filter((i) => i.id !== updatedItem.id);
        });
      });
      if (!next[newCat]) next[newCat] = {};
      if (!next[newCat][newSub]) next[newCat][newSub] = [];
      next[newCat][newSub] = [...next[newCat][newSub], updatedItem];
      return next;
    });
  }

  // ── New material created callback ─────────────────────────────────────────
  function handleNewMaterialCreated(newItem: PredefinedItem) {
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
  }

  // ── Database tabs data ────────────────────────────────────────────────────
  const availableDatabaseTabs = registryDatabases.map((db) => db.name);

  const checkDbScroll = () => {
    if (dbScrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } =
        dbScrollContainerRef.current;
      setShowLeftDbArrow(scrollLeft > 0);
      setShowRightDbArrow(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  // Re-check scroll arrows once fetching is done and tabs are in the DOM
  useEffect(() => {
    if (isFetching) return;
    const id = requestAnimationFrame(checkDbScroll);
    return () => cancelAnimationFrame(id);
  }, [registryDatabases, isFetching]); // eslint-disable-line react-hooks/exhaustive-deps
  const scrollDbTabs = (direction: "left" | "right") => {
    dbScrollContainerRef.current?.scrollBy({
      left: direction === "left" ? -300 : 300,
      behavior: "smooth",
    });
  };

  // ── Sidebar data ──────────────────────────────────────────────────────────
  // Build a grouped view scoped to the active database so the sidebar only
  // shows categories/subcategories that have items in the selected database.
  const sidebarGrouped = useMemo(() => {
    const source = activeDatabaseTab
      ? allItems.filter((item) => (item.database ?? "") === activeDatabaseTab)
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

  const sidebarCategories = useMemo(() => {
    const fromItems = new Set(Object.keys(sidebarGrouped));
    knownCategories.forEach((c) => fromItems.add(c.value));
    return [...fromItems].sort();
  }, [sidebarGrouped, knownCategories]);

  // ── Duplicate category/subcategory name detection ────────────────────────
  const duplicateCategoryNames = useMemo(() => {
    const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
    const seen = new Map<string, number>();
    sidebarCategories.forEach((cat) => {
      const key = normalize(cat);
      seen.set(key, (seen.get(key) ?? 0) + 1);
    });
    return new Set(
      sidebarCategories
        .map((cat) => normalize(cat))
        .filter((key) => (seen.get(key) ?? 0) > 1),
    );
  }, [sidebarCategories]);

  const duplicateSubCategoryNames = useMemo(() => {
    const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
    const dupeSet = new Set<string>();
    sidebarCategories.forEach((cat) => {
      const subs = Object.keys(sidebarGrouped[cat] ?? {});
      const seen = new Map<string, number>();
      subs.forEach((sub) => {
        const key = normalize(sub);
        seen.set(key, (seen.get(key) ?? 0) + 1);
      });
      seen.forEach((count, key) => {
        if (count > 1)
          subs
            .filter((s) => normalize(s) === key)
            .forEach((s) => dupeSet.add(`${cat}::${s}`));
      });
    });
    return dupeSet;
  }, [sidebarCategories, sidebarGrouped]);

  const sidebarQ = sidebarSearch.trim().toLowerCase();

  // A sub is visible if it has no items (newly created, empty) OR has at least one non-archived item
  const isSubVisible = (cat: string, sub: string) => {
    const subItems = sidebarGrouped[cat]?.[sub] ?? [];
    if (subItems.length === 0) return true;
    return subItems.some((item) => !item.is_archived);
  };

  const visibleSidebarCategories = sidebarCategories.filter((cat) => {
    const catId =
      Object.values(sidebarGrouped[cat] ?? {}).flat()[0]?.category_id ??
      knownCategories.find((c) => c.value === cat)?.id;
    const knownSubs = catId
      ? knownSubCategories.filter((s) => s.category_id === catId).map((s) => s.value)
      : [];
    const allSubs = [...new Set([...Object.keys(sidebarGrouped[cat] ?? {}), ...knownSubs])];
    // Hide only if category has items AND every visible sub would be hidden
    const hasVisibleSub = allSubs.length === 0 || allSubs.some((sub) => isSubVisible(cat, sub));
    if (!hasVisibleSub) return false;
    if (!sidebarQ) return true;
    if (cat.toLowerCase().includes(sidebarQ)) return true;
    return allSubs.some((sub) => sub.toLowerCase().includes(sidebarQ));
  });
  const totalFilteredCount = sidebarCategories.reduce(
    (sum, cat) => sum + Object.values(sidebarGrouped[cat] || {}).flat().length,
    0,
  );

  // ── Pagination controls ───────────────────────────────────────────────────
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

  // ── Label helper ──────────────────────────────────────────────────────────
  function titleCase(str: string) {
    return str
      .toLowerCase()
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
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

  const CHANGELOG_ACTION_LABELS: Record<string, string> = {
    renamed: "Changed Name",
    changed_unit: "Changed Unit",
    changed_category: "Changed Category",
    changed_subcategory: "Changed Subcategory",
    moved_to: "Moved To",
    changed_database: "Changed Database",
    archived: "Archived",
    unarchived: "Unarchived",
    copied_to: "Copied To",
    duplicated: "Duplicated",
  };

  function ChangelogActionColor(action: string): string {
    if (action === "archived") return "rgba(220,60,60,1)";
    if (action === "unarchived") return "rgba(0,163,93,1)";
    if (action === "copied_to" || action === "duplicated")
      return "rgba(36,160,237,1)";
    return "rgba(180,145,0,1)";
  }

  function formatChangelogDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  function UserAvatar({ name }: { name: string | null }) {
    const letter = name ? name.charAt(0).toUpperCase() : "?";
    return (
      <div
        style={{
          width: "20px",
          height: "20px",
          borderRadius: "50%",
          backgroundColor: "black",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "9px",
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {letter}
      </div>
    );
  }

  return (
    <div className="dashboard">
      <style>{`
        .items-table tbody tr.material-db-row-active td,
        .items-table tbody tr.material-db-row-active:hover td {
          background-color: rgba(219,255,240,1) !important;
        }
        .items-table tbody tr.material-db-row-active {
          outline: 1px solid rgba(0,163,93,1);
          outline-offset: -1px;
        }
        .material-db-table {
          border-top-left-radius: 0 !important;
          border-top-right-radius: 0 !important;
        }
        .material-db-table thead tr:first-child th:first-child {
          border-top-left-radius: 0 !important;
        }
        .material-db-table thead tr:first-child th:last-child {
          border-top-right-radius: 0 !important;
        }
        /* Prevent the global td:has(.tooltip-bar) { position: relative } from
           creating a stacking context that clips the row outline/border */
        .material-db-table td:has(.tooltip-bar) {
          position: static !important;
        }
      `}</style>

      {isFetching ? (
        <SkeletonLayout />
      ) : (
        <>
          {/* ── Page header ──────────────────────────────────────────────── */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "24px",
            }}
          >
            <h1>MATERIAL DATABASE</h1>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Button
                componentType="link"
                bgColor="white"
                borderColor="rgba(211,211,211,1)"
                textColor="black"
                href="/settings/manage/material/archive"
              >
                ARCHIVE
                <img src="/icons/trash.svg" alt="archive" />
              </Button>
              <ExportMaterialListPDFButton allItems={allItems} />
              <ImportMaterialButton
                onSuccess={(newDbId, newDbName) => {
                  setRegistryDatabases((prev) => [
                    ...prev,
                    { id: newDbId, name: newDbName },
                  ]);
                  fetchItems(true);
                }}
              />
            </div>
          </div>

          {/* ── 3-panel layout ─────────────────────────────────────────────── */}
          <div
            style={{
              display: "flex",
              height: "calc(100dvh - 250px)",
              overflow: "hidden",
              gap: "16px",
            }}
          >
            {/* ── LEFT: category sidebar ──────────────────────────────────── */}
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
              {/* Browse label + new category */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                  flexShrink: 0,
                }}
              >
                <p
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "rgba(120,120,120,1)",
                  }}
                >
                  BROWSE CATEGORIES
                </p>
                <CreateCategoryButton
                  onSuccess={() => {
                    fetchCategories();
                  }}
                  renderTrigger={(open) => (
                    <button
                      type="button"
                      onClick={open}
                      style={{
                        background: "none",
                        border: "none",
                        padding: 0,
                        cursor: "pointer",
                        color: "rgba(0,123,255,1)",
                        fontSize: "12px",
                        fontWeight: 600,
                        textDecoration: "underline",
                      }}
                    >
                      New Category +
                    </button>
                  )}
                />
              </div>

              <br />

              {/* Sidebar search */}
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

              {/* Scrollable list */}
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
                  const catCount = Object.values(
                    sidebarGrouped[cat] || {},
                  ).flat().length;
                  // Resolve catId from items first, fall back to known categories list
                  const catId =
                    Object.values(sidebarGrouped[cat] || {}).flat()[0]
                      ?.category_id ??
                    knownCategories.find((c) => c.value === cat)?.id;
                  const itemSubs = Object.keys(sidebarGrouped[cat] || {});
                  const knownSubs = catId
                    ? knownSubCategories
                        .filter((s) => s.category_id === catId)
                        .map((s) => s.value)
                    : [];
                  const visibleSubs = [...new Set([...itemSubs, ...knownSubs])]
                    .sort()
                    .filter(
                      (sub) =>
                        isSubVisible(cat, sub) &&
                        (!sidebarQ ||
                          cat.toLowerCase().includes(sidebarQ) ||
                          sub.toLowerCase().includes(sidebarQ)),
                    );

                  return (
                    <div key={cat} style={{ marginBottom: "4px" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          borderRadius: "5px",
                          backgroundColor: isCatActive
                            ? "black"
                            : "transparent",
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
                            {duplicateCategoryNames.has(cat.toLowerCase().replace(/\s+/g, " ").trim()) && (
                              <span className="tooltip-bar" style={{ display: "inline-flex", alignItems: "center", flexShrink: 0, zIndex: "auto" }}>
                                <img src="/icons/database-duplicate-warning.svg" alt="duplicate" style={{ width: "14px" }} />
                                <span className="tooltip-label" style={{ color: "rgba(248,77,77,1)" }}>Duplicate Name</span>
                              </span>
                            )}
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
                        {isCatActive && catId && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              flexShrink: 0,
                            }}
                          >
                            <EditCategoryButton
                              categoryId={catId}
                              categoryName={cat}
                              onDark
                              onSuccess={(newName) => {
                                optimisticRenameCategory(cat, newName);
                                setActiveCategoryTab(newName);
                                setExpandedCategoryTab(newName);
                              }}
                            />
                            <ArchiveCategoryButton
                              categoryId={catId}
                              categoryName={cat}
                              itemCount={catCount}
                              onDark
                              onSuccess={() => {
                                optimisticArchiveCategory(cat);
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
                            const subCount = (sidebarGrouped[cat]?.[sub] || [])
                              .length;
                            const subId =
                              (sidebarGrouped[cat]?.[sub] || [])[0]
                                ?.subcategory_id ??
                              knownSubCategories.find(
                                (s) =>
                                  s.category_id === catId && s.value === sub,
                              )?.id;
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
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "6px",
                                    }}
                                  >
                                    {titleCase(sub)}
                                    {duplicateSubCategoryNames.has(`${cat}::${sub}`) && (
                                      <span className="tooltip-bar" style={{ display: "inline-flex", alignItems: "center", flexShrink: 0, zIndex: "auto" }}>
                                        <img src="/icons/database-duplicate-warning.svg" alt="duplicate" style={{ width: "13px" }} />
                                        <span className="tooltip-label" style={{ color: "rgba(248,77,77,1)" }}>Duplicate Name</span>
                                      </span>
                                    )}
                                  </span>
                                </button>
                                {isSubActive && subId && catId && (
                                  <div
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "4px",
                                      flexShrink: 0,
                                    }}
                                  >
                                    <AddMaterialToSubCategoryButton
                                      categoryId={catId}
                                      subCategoryId={subId}
                                      defaultDatabase={
                                        activeDatabaseTab || undefined
                                      }
                                      onSuccess={(newItem) => {
                                        handleNewMaterialCreated(newItem);
                                      }}
                                    />
                                    <EditSubCategoryButton
                                      subCategoryId={subId}
                                      subCategoryName={sub}
                                      onSuccess={(newName) => {
                                        optimisticRenameSubCategory(cat, sub, newName);
                                        if (activeSubCategoryTab === sub) setActiveSubCategoryTab(newName);
                                      }}
                                    />
                                    <ArchiveSubCategoryButton
                                      subCategoryId={subId}
                                      subCategoryName={sub}
                                      itemCount={subCount}
                                      onSuccess={() => {
                                        optimisticArchiveSubCategory(cat, sub);
                                        setActiveSubCategoryTab("");
                                      }}
                                    />
                                  </div>
                                )}
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
                          {catId && (
                            <div style={{ marginLeft: "16px" }}>
                              <CreateSubCategoryButton
                                materialCategoryID={catId}
                                onSuccess={() => {
                                  fetchCategories();
                                }}
                                renderTrigger={(open) => (
                                  <button
                                    type="button"
                                    onClick={open}
                                    style={{
                                      background: "none",
                                      border: "none",
                                      padding: "7px 10px",
                                      cursor: "pointer",
                                      color: "rgba(0,123,255,1)",
                                      fontSize: "12px",
                                      fontWeight: 600,
                                      textDecoration: "underline",
                                      textAlign: "left",
                                    }}
                                  >
                                    New Subcategory +
                                  </button>
                                )}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── CENTER: search + table ───────────────────────────────────── */}
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
              {/* Sticky top bar */}
              <div
                style={{
                  padding: "12px 20px 15px",
                  flexShrink: 0,
                }}
              >
                {/* Breadcrumb */}
                <h2
                  style={{
                    marginBottom: "10px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  {!activeCategoryTab ? (
                    "All Materials"
                  ) : activeSubCategoryTab ? (
                    <>
                      {titleCase(activeCategoryTab)}{" "}
                      <span
                        style={{
                          fontWeight: 400,
                          color: "rgba(120,120,120,1)",
                        }}
                      >
                        /
                      </span>{" "}
                      <span style={{ textDecoration: "underline" }}>
                        {titleCase(activeSubCategoryTab)}
                      </span>
                      <EditSubCategoryButton
                        subCategoryId={
                          (sidebarGrouped[activeCategoryTab]?.[
                            activeSubCategoryTab
                          ] || [])[0]?.subcategory_id ??
                          knownSubCategories.find(
                            (s) => s.value === activeSubCategoryTab,
                          )?.id
                        }
                        subCategoryName={activeSubCategoryTab}
                        onSuccess={(newName) => {
                          optimisticRenameSubCategory(activeCategoryTab, activeSubCategoryTab, newName);
                          setActiveSubCategoryTab(newName);
                        }}
                      />
                    </>
                  ) : (
                    <>
                      <span style={{ textDecoration: "underline" }}>
                        {titleCase(activeCategoryTab)}
                      </span>
                      <EditCategoryButton
                        categoryId={
                          Object.values(
                            sidebarGrouped[activeCategoryTab] || {},
                          ).flat()[0]?.category_id ??
                          knownCategories.find(
                            (c) => c.value === activeCategoryTab,
                          )?.id
                        }
                        categoryName={activeCategoryTab}
                        onSuccess={(newName) => {
                          optimisticRenameCategory(activeCategoryTab, newName);
                          setActiveCategoryTab(newName);
                          setExpandedCategoryTab(newName);
                        }}
                      />
                    </>
                  )}
                </h2>

                {/* Search + NEW MATERIAL + EXPORT */}
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
                  <CreateNewMaterialButton
                    onSuccess={handleNewMaterialCreated}
                    allItems={allItems}
                    style={{ padding: "7px 16px", whiteSpace: "nowrap" }}
                    defaultDatabase={activeDatabaseTab || undefined}
                  />
                </div>

                {/* Filter / Actions row */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "15px",
                  }}
                >
                  {/* Row 1: FILTER (left) + ACTIONS (right) */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    {/* Left: filter button + chips */}
                    <FilterButton
                      filterUnits={filterUnits}
                      onChange={setFilterUnits}
                    />

                    {/* Right: bulk actions */}
                    <BulkActionsButton
                      selectedItems={allItems.filter((i) =>
                        selectedIds.has(i.id),
                      )}
                      databases={registryDatabases}
                      onDatabaseCreated={(id, name) =>
                        setRegistryDatabases((prev) => [...prev, { id, name }])
                      }
                      onCopySuccess={(newItems) => {
                        newItems.forEach((newItem) => {
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
                        });
                      }}
                      onMoveSuccess={() => fetchItems(true)}
                      onArchiveSuccess={(ids) => {
                        setAllItems((prev) =>
                          prev.filter((i) => !ids.includes(i.id)),
                        );
                        setGroupedItems((prev) => {
                          const next = { ...prev };
                          Object.keys(next).forEach((cat) => {
                            Object.keys(next[cat]).forEach((sub) => {
                              next[cat][sub] = next[cat][sub].filter(
                                (i) => !ids.includes(i.id),
                              );
                            });
                          });
                          return next;
                        });
                        if (detailItem && ids.includes(detailItem.id)) {
                          setDetailItem(null);
                        }
                        setSelectedIds(new Set());
                      }}
                    />
                  </div>

                  {/* Row 2: info */}
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

              {/* Scrollable table area */}
              <div
                style={{ flex: 1, overflowY: "auto", padding: "8px 20px 16px" }}
              >
                {/* Database tabs — lives in same container as table so no gap */}
                {(availableDatabaseTabs.length > 0 || true) && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-end",
                      gap: "6px",
                    }}
                  >
                    <div
                      style={{
                        flex: 1,
                        position: "relative",
                        overflow: "hidden",
                        marginBottom: 0,
                      }}
                    >
                      {showLeftDbArrow && (
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
                      )}
                      {showLeftDbArrow && (
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
                            style={{
                              transform: "rotate(180deg)",
                              marginRight: "3px",
                            }}
                            alt="left"
                          />
                        </button>
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
                          const dbEntry = registryDatabases.find(
                            (d) => d.name === db,
                          );
                          const dbId = dbEntry?.id ?? 0;
                          const dbItemCount = allItems.filter(
                            (i) => (i.database ?? "") === db,
                          ).length;
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
                              {/* Checkbox + Name group */}
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                  flex: 1,
                                  minWidth: 0,
                                }}
                              >
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  style={{
                                    flexShrink: 0,
                                    display: "flex",
                                    alignItems: "center",
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    className="manager-checkbox"
                                    checked={selectedDatabaseIds.has(dbId)}
                                    onChange={(e) => {
                                      setSelectedDatabaseIds((prev) => {
                                        const next = new Set(prev);
                                        if (e.target.checked) next.add(dbId);
                                        else next.delete(dbId);
                                        return next;
                                      });
                                    }}
                                  />
                                </div>
                                <span style={{ color: "black" }}>
                                  {db
                                    .split(" ")
                                    .map(
                                      (w) =>
                                        w.charAt(0).toUpperCase() +
                                        w.slice(1).toLowerCase(),
                                    )
                                    .join(" ")}
                                </span>
                              </div>

                              {/* Action buttons */}
                              <div
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "5px",
                                  flexShrink: 0,
                                }}
                              >
                                <RenameDatabaseButton
                                  dbId={dbId}
                                  dbName={db}
                                  onSuccess={(newName) => {
                                    // Patch registry
                                    setRegistryDatabases((prev) =>
                                      prev.map((d) =>
                                        d.id === dbId
                                          ? { ...d, name: newName }
                                          : d,
                                      ),
                                    );
                                    // Patch active tab
                                    setActiveDatabaseTab((prev) =>
                                      prev === db ? newName : prev,
                                    );
                                    // Patch database name on all affected items in local state
                                    const patch = (item: MaterialItem) =>
                                      item.database_id === dbId
                                        ? { ...item, database: newName }
                                        : item;
                                    setAllItems((prev) => prev.map(patch));
                                    setGroupedItems((prev) => {
                                      const next = { ...prev };
                                      Object.keys(next).forEach((cat) => {
                                        Object.keys(next[cat]).forEach(
                                          (sub) => {
                                            next[cat][sub] =
                                              next[cat][sub].map(patch);
                                          },
                                        );
                                      });
                                      return next;
                                    });
                                    setDetailItem((prev) =>
                                      prev ? patch(prev) : prev,
                                    );
                                  }}
                                />
                                <ArchiveDatabaseButton
                                  dbId={dbId}
                                  dbName={db}
                                  itemCount={
                                    allItems.filter(
                                      (i) => (i.database ?? "") === db,
                                    ).length
                                  }
                                  onSuccess={() => {
                                    // Remove from registry → tab disappears instantly
                                    setRegistryDatabases((prev) =>
                                      prev.filter((d) => d.id !== dbId),
                                    );
                                    // Switch away if this tab was active
                                    setActiveDatabaseTab((prev) => {
                                      if (prev !== db) return prev;
                                      const remaining =
                                        availableDatabaseTabs.filter(
                                          (d) => d !== db,
                                        );
                                      return remaining[0] ?? "";
                                    });
                                    // If non-empty, remove archived items from local state
                                    if (dbItemCount > 0) {
                                      setAllItems((prev) =>
                                        prev.filter(
                                          (i) => i.database_id !== dbId,
                                        ),
                                      );
                                      setGroupedItems((prev) => {
                                        const next = { ...prev };
                                        Object.keys(next).forEach((cat) => {
                                          Object.keys(next[cat]).forEach(
                                            (sub) => {
                                              next[cat][sub] = next[cat][
                                                sub
                                              ].filter(
                                                (i) => i.database_id !== dbId,
                                              );
                                            },
                                          );
                                        });
                                        return next;
                                      });
                                      if (detailItem?.database_id === dbId) {
                                        setDetailItem(null);
                                      }
                                    }
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {showRightDbArrow && (
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
                      )}
                      {showRightDbArrow && (
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
                          <img
                            src="/icons/arrow-right.svg"
                            alt="right"
                            style={{ marginLeft: "3px" }}
                          />
                        </button>
                      )}
                    </div>
                    {selectedDatabaseIds.size >= 2 && (
                      <MergeDatabasesButton
                        selectedDatabases={registryDatabases
                          .filter((d) => selectedDatabaseIds.has(d.id))
                          .map((d) => ({
                            ...d,
                            itemCount: allItems.filter(
                              (i) => i.database_id === d.id,
                            ).length,
                          }))}
                        onSuccess={(targetId, removedIds, mergedName) => {
                          setRegistryDatabases((prev) =>
                            prev
                              .filter((d) => !removedIds.includes(d.id))
                              .map((d) =>
                                d.id === targetId
                                  ? { ...d, name: mergedName }
                                  : d,
                              ),
                          );
                          setActiveDatabaseTab((prev) => {
                            const removedNames = registryDatabases
                              .filter((d) => removedIds.includes(d.id))
                              .map((d) => d.name);
                            if (removedNames.includes(prev)) return mergedName;
                            if (
                              prev ===
                              registryDatabases.find((d) => d.id === targetId)
                                ?.name
                            )
                              return mergedName;
                            return prev;
                          });
                          setSelectedDatabaseIds(new Set());
                          fetchItems(true);
                        }}
                      />
                    )}
                    <CreateDatabaseButton
                      selectedItems={allItems.filter((i) =>
                        selectedIds.has(i.id),
                      )}
                      onSuccess={(id, name) => {
                        setRegistryDatabases((prev) => [...prev, { id, name }]);
                        setActiveDatabaseTab(name);
                      }}
                      onMoveSuccess={(id, name) => {
                        setRegistryDatabases((prev) => [...prev, { id, name }]);
                        setSelectedIds(new Set());
                        fetchItems(true);
                      }}
                    />
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
                      NO MATERIAL FOUND
                    </h2>
                    <div style={{ marginTop: "16px" }}>
                      <CreateNewMaterialButton
                        onSuccess={handleNewMaterialCreated}
                        allItems={allItems}
                        defaultDatabase={activeDatabaseTab || undefined}
                      />
                    </div>
                  </div>
                ) : (
                  <>
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
                                paginatedItems.every((i) =>
                                  selectedIds.has(i.id),
                                )
                              }
                              onChange={(e) => {
                                setSelectedIds((prev) => {
                                  const next = new Set(prev);
                                  if (e.target.checked)
                                    paginatedItems.forEach((i) =>
                                      next.add(i.id),
                                    );
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
                          <th
                            style={{ position: "sticky", top: 0, zIndex: 1 }}
                          />
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedItems.map((item) => {
                          const isDetailing = detailItem?.id === item.id;
                          return (
                            <tr
                              key={item.id}
                              onClick={() => {
                                setDetailItem(item);
                              }}
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
                              <td style={{ fontWeight: 600 }}>
                                {item.item_code}
                              </td>
                              <td>
                                <div
                                  style={{
                                    fontWeight: 600,
                                    color: "rgba(0,123,255,1)",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "5px",
                                  }}
                                >
                                  <span>{item.material_description}</span>
                                  {duplicateMap.has(item.id) && (
                                    <span
                                      className="tooltip-bar"
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        flexShrink: 0,
                                        zIndex: "auto",
                                      }}
                                    >
                                      <img
                                        src="/icons/database-duplicate-warning.svg"
                                        alt="duplicate warning"
                                        style={{ width: "16px" }}
                                      />
                                      <span
                                        className="tooltip-label"
                                        style={{
                                          color: "rgba(248, 77, 77, 1)",
                                        }}
                                      >
                                        {duplicateMap.get(item.id)} Duplicate
                                        {duplicateMap.get(item.id) !== 1
                                          ? "s"
                                          : ""}{" "}
                                        Found
                                      </span>
                                    </span>
                                  )}
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
                                  <EditMaterialButton
                                    item={item}
                                    onOpen={() => setDetailItem(item)}
                                    onSuccess={(updated) => {
                                      const catName = knownCategories.find((c) => c.id === updated.categoryId)?.value ?? item.category_name ?? "Uncategorized";
                                      const subName = knownSubCategories.find((s) => s.id === updated.subcategoryId)?.value ?? item.subcategory_name ?? "General";
                                      const updatedItem: MaterialItem = {
                                        ...item,
                                        material_description: updated.description,
                                        category_id: updated.categoryId,
                                        category_name: catName,
                                        subcategory_id: updated.subcategoryId,
                                        subcategory_name: subName,
                                        unit: updated.unit ?? item.unit,
                                        brand: updated.brand ?? item.brand,
                                        database_id: updated.databaseId ?? item.database_id,
                                        database: updated.databaseName ?? item.database,
                                      };
                                      optimisticUpdateMaterial(updatedItem);
                                      setDetailItem(updatedItem);
                                      refreshChangelog();
                                    }}
                                    onDatabaseCreated={(id, name) =>
                                      setRegistryDatabases((prev) => [
                                        ...prev,
                                        { id, name },
                                      ])
                                    }
                                  />
                                  <DuplicateMaterialButton
                                    item={item}
                                    onSuccess={(newItem) => {
                                      const cat =
                                        newItem.category_name ||
                                        "Uncategorized";
                                      const sub =
                                        newItem.subcategory_name || "General";
                                      setAllItems((prev) => [...prev, newItem]);
                                      setGroupedItems((prev) => ({
                                        ...prev,
                                        [cat]: {
                                          ...(prev[cat] || {}),
                                          [sub]: [
                                            ...(prev[cat]?.[sub] || []),
                                            newItem,
                                          ],
                                        },
                                      }));
                                    }}
                                  />
                                  <CopyMaterialButton
                                    item={item}
                                    databases={registryDatabases}
                                    onDatabaseCreated={(id, name) =>
                                      setRegistryDatabases((prev) => [
                                        ...prev,
                                        { id, name },
                                      ])
                                    }
                                    onSuccess={(newItem) => {
                                      const cat =
                                        newItem.category_name ||
                                        "Uncategorized";
                                      const sub =
                                        newItem.subcategory_name || "General";
                                      setAllItems((prev) => [...prev, newItem]);
                                      setGroupedItems((prev) => ({
                                        ...prev,
                                        [cat]: {
                                          ...(prev[cat] || {}),
                                          [sub]: [
                                            ...(prev[cat]?.[sub] || []),
                                            newItem,
                                          ],
                                        },
                                      }));
                                    }}
                                  />
                                  <MoveMaterialButton
                                    item={item}
                                    databases={registryDatabases}
                                    onDatabaseCreated={(id, name) =>
                                      setRegistryDatabases((prev) => [
                                        ...prev,
                                        { id, name },
                                      ])
                                    }
                                    onSuccess={(targetDbId, targetDbName) => {
                                      const updated = {
                                        ...item,
                                        database_id: targetDbId,
                                        database: targetDbName,
                                      };
                                      setAllItems((prev) =>
                                        prev.map((i) =>
                                          i.id === item.id ? updated : i,
                                        ),
                                      );
                                      setGroupedItems((prev) => {
                                        const next = { ...prev };
                                        const cat =
                                          item.category_name || "Uncategorized";
                                        const sub =
                                          item.subcategory_name || "General";
                                        if (next[cat]?.[sub]) {
                                          next[cat][sub] = next[cat][sub].map(
                                            (i) =>
                                              i.id === item.id ? updated : i,
                                          );
                                        }
                                        return next;
                                      });
                                      if (detailItem?.id === item.id) {
                                        setDetailItem(updated);
                                      }
                                      refreshChangelog();
                                    }}
                                  />
                                  <ArchiveMaterialButton
                                    item={item}
                                    onSuccess={() => {
                                      setAllItems((prev) =>
                                        prev.filter((i) => i.id !== item.id),
                                      );
                                      setGroupedItems((prev) => {
                                        const next = { ...prev };
                                        Object.keys(next).forEach((cat) => {
                                          Object.keys(next[cat]).forEach(
                                            (sub) => {
                                              next[cat][sub] = next[cat][
                                                sub
                                              ].filter((i) => i.id !== item.id);
                                            },
                                          );
                                        });
                                        return next;
                                      });
                                      if (detailItem?.id === item.id) {
                                        setDetailItem(null);
                                      }
                                    }}
                                  />
                                </ThreeDotsMenuButton>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </>
                )}
              </div>

              {/* Pagination — outside scroll so always visible */}
              <div style={{ flexShrink: 0 }}>
                <PaginationControls />
              </div>
            </div>

            {/* ── RIGHT: detail panel ─────────────────────────────────────── */}
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
                /* ── Detail view ── */
                <>
                  <div
                    style={{
                      padding: "15px",
                      backgroundColor: "rgba(248, 248, 248, 1)",
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
                        style={{
                          fontSize: "11px",
                          color: "rgba(130,130,130,1)",
                        }}
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

                  {/* ── Changelog ──────────────────────────────── */}
                  <div style={{ marginTop: "20px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        marginBottom: "3px",
                      }}
                    >
                      <img
                        src="/icons/database-clock.svg"
                        alt=""
                        style={{ width: "15px", flexShrink: 0 }}
                      />
                      <h4 style={{ fontWeight: 600, fontSize: "13px" }}>
                        Changelog
                      </h4>
                    </div>
                    <p
                      style={{
                        fontSize: "11px",
                        color: "rgba(120,120,120,1)",
                        marginBottom: "12px",
                      }}
                    >
                      A history of changes made to this material
                    </p>

                    {changelogLoading ? (
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
                        Loading changelog…
                      </div>
                    ) : changelog.length === 0 ? (
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
                        No changes recorded
                      </span>
                    ) : (
                      <div
                        style={{
                          border: "1px solid rgba(230,230,230,1)",
                          borderRadius: "10px",
                          overflow: "hidden",
                        }}
                      >
                        {changelog.map((entry, idx) => (
                          <div
                            key={entry.id}
                            style={{
                              padding: "12px",
                              borderBottom:
                                idx < changelog.length - 1
                                  ? "1px solid rgba(230,230,230,1)"
                                  : "none",
                            }}
                          >
                            <p
                              style={{
                                fontSize: "11px",
                                fontWeight: 700,
                                color: "rgba(214,184,16,1)",
                                marginBottom: "6px",
                                textTransform: "uppercase",
                              }}
                            >
                              {CHANGELOG_ACTION_LABELS[entry.action] ??
                                entry.action}
                            </p>

                            {(entry.old_value || entry.new_value) && (
                              <p
                                style={{
                                  fontSize: "13px",
                                  fontWeight: 600,
                                  color: "#111",
                                  marginBottom: "4px",
                                }}
                              >
                                {entry.old_value && (
                                  <span>{entry.old_value}</span>
                                )}
                                {entry.old_value && entry.new_value && (
                                  <span style={{ margin: "0 6px" }}>→</span>
                                )}
                                {entry.new_value && (
                                  <span>{entry.new_value}</span>
                                )}
                              </p>
                            )}

                            <p
                              style={{
                                fontSize: "10px",
                                color: "rgba(150,150,150,1)",
                                marginBottom: "10px",
                              }}
                            >
                              {detailItem?.item_code}
                              {detailItem?.brand
                                ? ` • ${detailItem.brand}`
                                : ""}
                            </p>

                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gap: "8px",
                              }}
                            >
                              <div>
                                <p
                                  style={{
                                    fontSize: "9px",
                                    color: "rgba(150,150,150,1)",
                                    textTransform: "uppercase",
                                    fontWeight: 600,
                                    marginBottom: "3px",
                                  }}
                                >
                                  Date
                                </p>
                                <p
                                  style={{
                                    fontSize: "12px",
                                    fontWeight: 600,
                                    color: "#111",
                                  }}
                                >
                                  {formatChangelogDate(entry.changed_at)}
                                </p>
                              </div>
                              <div>
                                <p
                                  style={{
                                    fontSize: "9px",
                                    color: "rgba(150,150,150,1)",
                                    textTransform: "uppercase",
                                    fontWeight: 600,
                                    marginBottom: "3px",
                                  }}
                                >
                                  Changed By
                                </p>
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                  }}
                                >
                                  <UserAvatar name={entry.changed_by} />
                                  <span
                                    style={{
                                      fontSize: "11px",
                                      fontWeight: 600,
                                      color: "#111",
                                    }}
                                  >
                                    {entry.changed_by ?? "Unknown"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ── Duplicates ──────────────────────────────── */}
                  {duplicateMap.has(detailItem.id) &&
                    (() => {
                      const normalize = (s: string) =>
                        s.toLowerCase().replace(/\s+/g, " ").trim();
                      const duplicates = allItems.filter(
                        (i) =>
                          i.id !== detailItem.id &&
                          (i.database ?? "") === (detailItem.database ?? "") &&
                          normalize(i.material_description || "") ===
                            normalize(detailItem.material_description || ""),
                      );
                      if (duplicates.length === 0) return null;
                      return (
                        <div style={{ marginTop: "20px" }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              marginBottom: "3px",
                            }}
                          >
                            <img
                              src="/icons/database-duplicate-warning.svg"
                              alt=""
                              style={{ width: "15px", flexShrink: 0 }}
                            />
                            <h4 style={{ fontWeight: 600, fontSize: "13px" }}>
                              Duplicates
                            </h4>
                          </div>
                          <p
                            style={{
                              fontSize: "11px",
                              color: "rgba(120,120,120,1)",
                              marginBottom: "12px",
                            }}
                          >
                            {duplicates.length} duplicate
                            {duplicates.length !== 1 ? "s" : ""} found for this
                            material
                          </p>
                          <div
                            style={{
                              border: "1px solid rgba(230,230,230,1)",
                              borderRadius: "10px",
                              overflow: "hidden",
                            }}
                          >
                            {duplicates.map((dup, idx) => (
                              <div
                                key={dup.id}
                                style={{
                                  padding: "12px",
                                  borderBottom:
                                    idx < duplicates.length - 1
                                      ? "1px solid rgba(230,230,230,1)"
                                      : "none",
                                }}
                              >
                                <p
                                  style={{
                                    fontWeight: 600,
                                    fontSize: "13px",
                                    color: "#111",
                                    marginBottom: "2px",
                                  }}
                                >
                                  {dup.material_description}
                                </p>
                                <p
                                  style={{
                                    fontSize: "10px",
                                    color: "rgba(150,150,150,1)",
                                    marginBottom: "8px",
                                  }}
                                >
                                  {dup.item_code}
                                  {dup.brand ? ` • ${dup.brand}` : ""}
                                </p>
                                <div
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns: "1fr 1fr",
                                    gap: "8px",
                                  }}
                                >
                                  <div>
                                    <p
                                      style={{
                                        fontSize: "9px",
                                        color: "rgba(150,150,150,1)",
                                        textTransform: "uppercase",
                                        fontWeight: 600,
                                        marginBottom: "2px",
                                      }}
                                    >
                                      Category
                                    </p>
                                    <p
                                      style={{
                                        fontSize: "12px",
                                        fontWeight: 600,
                                        color: "#111",
                                      }}
                                    >
                                      {dup.category_name || "N/A"}
                                    </p>
                                  </div>
                                  <div>
                                    <p
                                      style={{
                                        fontSize: "9px",
                                        color: "rgba(150,150,150,1)",
                                        textTransform: "uppercase",
                                        fontWeight: 600,
                                        marginBottom: "2px",
                                      }}
                                    >
                                      Subcategory
                                    </p>
                                    <p
                                      style={{
                                        fontSize: "12px",
                                        fontWeight: 600,
                                        color: "#111",
                                      }}
                                    >
                                      {dup.subcategory_name || "N/A"}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                  {/* ── Inventory Mapping ───────────────────────── */}
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
        </>
      )}
    </div>
  );
}
