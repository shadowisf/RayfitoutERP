"use client";

import { useState, useEffect, useMemo, useCallback, useRef, memo } from "react";
import { createPortal } from "react-dom";
import FormPopUp from "@/app/components/FormPopup";
import { BoqLine } from "../(protected)/project/[id]/boq/[boqId]/types/boqLine";
import Button from "./Button";
import { toast } from "@/app/components/Toast";

// ─── Types ────────────────────────────────────────────────────────────────────

type MobileBoqSelectWithAllocationProps = {
  projectID: number;
  onSelectBoq: (
    boqLineIDs: number[],
    boqInfo: string,
    selectedLines?: BoqLine[],
    allocatedQtys?: Record<number, number>,
  ) => void;
  currentBoqLineIDs?: number[];
  onClose: () => void;
  singleSelect?: boolean;
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

type FlatRow =
  | { type: "category"; cat: string }
  | { type: "subcategory"; sub: string; num: string }
  | { type: "item"; line: BoqLine };

// ─── Skeleton shimmer ─────────────────────────────────────────────────────────

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

function MobileBoqSkeletonLayout() {
  const BORDER_COLOR = "rgba(217,217,217,1)";
  const GREY_TEXT = "rgba(150,150,150,1)";
  const LIGHT_BG = "rgba(239,239,239,1)";

  // name widths + whether it's a 2-liner
  const rows: { nameW: string; twoLine: boolean }[] = [
    { nameW: "72%", twoLine: true },
    { nameW: "55%", twoLine: false },
    { nameW: "80%", twoLine: true },
    { nameW: "62%", twoLine: false },
    { nameW: "68%", twoLine: true },
    { nameW: "58%", twoLine: false },
  ];

  return (
    <div>
      {/* Allocation summary strip skeleton */}
      <div
        style={{
          display: "flex",
          gap: 16,
          padding: "10px 12px",
          background: LIGHT_BG,
          borderRadius: 8,
          marginBottom: 8,
        }}
      >
        {[["50px", "60px"], ["48px", "55px"], ["46px", "52px"]].map(([lW, vW], i) => (
          <div key={i}>
            <SkeletonBlock w={lW} h={8} style={{ marginBottom: 5 }} />
            <SkeletonBlock w={vW} h={11} />
          </div>
        ))}
      </div>

      {/* Filter summary bar skeleton */}
      <div
        style={{
          background: LIGHT_BG,
          borderRadius: 8,
          padding: "10px 12px",
          marginBottom: 8,
        }}
      >
        <SkeletonBlock w="65%" h={11} style={{ marginBottom: 6 }} />
        <SkeletonBlock w="35%" h={9} />
      </div>

      {/* Category header */}
      <SkeletonBlock w="40%" h={12} style={{ marginBottom: 12, marginTop: 16 }} />

      {/* Subcategory header */}
      <SkeletonBlock w="55%" h={9} style={{ marginBottom: 10 }} />

      {/* Item rows */}
      {rows.map(({ nameW, twoLine }, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "flex-start",
            padding: "12px 0",
            borderBottom: `1px solid ${BORDER_COLOR}`,
            gap: 10,
          }}
        >
          {/* Checkbox */}
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: 5,
              border: `2px solid ${BORDER_COLOR}`,
              flexShrink: 0,
              marginTop: 2,
            }}
          />

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <SkeletonBlock w="28px" h={8} style={{ marginBottom: 5 }} />
            <SkeletonBlock w={nameW} h={12} style={{ marginBottom: twoLine ? 4 : 0 }} />
            {twoLine && <SkeletonBlock w="50%" h={12} style={{ marginBottom: 4 }} />}
            <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
              <SkeletonBlock w="42px" h={9} />
              <SkeletonBlock w="50px" h={9} />
            </div>
          </div>

          {/* Thumbnail placeholder (every other row) */}
          {i % 2 === 0 && (
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 6,
                flexShrink: 0,
                ...SHIMMER,
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const GREEN = "rgba(0, 163, 93, 1)";
const CHUNK_SIZE = 40;

const formatQty = (val: unknown): string => {
  const num = Number(val);
  if (isNaN(num)) return String(val ?? "");
  return num % 1 === 0 ? num.toFixed(0) : parseFloat(num.toFixed(2)).toString();
};

const formatCurrency = (val: unknown): string => {
  const num = Number(val);
  if (isNaN(num) || num === 0) return "-";
  return num.toLocaleString("en-US", { maximumFractionDigits: 2 });
};

const getFirstAttachment = (
  attachments: string[] | string | undefined,
): string | null => {
  if (!attachments) return null;
  if (Array.isArray(attachments)) return attachments[0] ?? null;
  try {
    const parsed = JSON.parse(attachments);
    if (Array.isArray(parsed)) return parsed[0] ?? null;
  } catch {}
  return typeof attachments === "string" && attachments.startsWith("http")
    ? attachments
    : null;
};

// ─── Item Row (memoised) ──────────────────────────────────────────────────────

type BoqItemRowProps = {
  line: BoqLine;
  isSelected: boolean;
  onToggle: (id: number) => void;
  allocatedRaw: string;
  onAllocatedChange: (id: number, raw: string) => void;
  hasOverAlloc: boolean;
  mrLineUnit?: string;
  BORDER_COLOR: string;
  GREY_TEXT: string;
  LIGHT_BG: string;
};

const BoqItemRow = memo(function BoqItemRow({
  line,
  isSelected,
  onToggle,
  allocatedRaw,
  onAllocatedChange,
  hasOverAlloc,
  mrLineUnit,
  BORDER_COLOR,
  GREY_TEXT,
  LIGHT_BG,
}: BoqItemRowProps) {
  const thumb = getFirstAttachment(line.attachments);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        padding: "12px 0",
        borderBottom: `1px solid ${BORDER_COLOR}`,
        gap: 10,
      }}
    >
      {/* Checkbox */}
      <div
        onClick={() => onToggle(line.id)}
        style={{
          width: 20,
          height: 20,
          borderRadius: 5,
          border: `2px solid ${isSelected ? GREEN : "rgba(180,180,180,1)"}`,
          background: isSelected ? GREEN : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          marginTop: 2,
          cursor: "pointer",
        }}
      >
        {isSelected && (
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

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, color: GREY_TEXT, marginBottom: 2 }} onClick={() => onToggle(line.id)}>
          Item
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#000" }} onClick={() => onToggle(line.id)}>
          {line.item_number} {line.item_name}
        </div>

        {line.location && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }} onClick={() => onToggle(line.id)}>
            <img src="/icons/location-boq.svg" alt="" style={{ marginTop: "-4px" }} />
            <span style={{ fontSize: 11, fontWeight: 500, color: "rgba(105,105,105,1)" }}>
              {line.location}
            </span>
          </div>
        )}

        {line.scope_of_work && (
          <span
            onClick={() => onToggle(line.id)}
            style={{
              display: "inline-block",
              marginTop: 5,
              fontSize: 10,
              fontWeight: 600,
              color: "#000",
              background: LIGHT_BG,
              borderRadius: 50,
              padding: "2px 7px",
            }}
          >
            {line.scope_of_work}
          </span>
        )}

        <div style={{ display: "flex", gap: 24, marginTop: 8 }} onClick={() => onToggle(line.id)}>
          <div>
            <div style={{ fontSize: 9, color: GREY_TEXT, textTransform: "uppercase", marginBottom: 1 }}>
              QTY
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#000" }}>
              {formatQty(line.quantity)} {line.unit}
            </div>
          </div>
          {line.rate_per_quantity != null && Number(line.rate_per_quantity) > 0 && (
            <div>
              <div style={{ fontSize: 9, color: GREY_TEXT, textTransform: "uppercase", marginBottom: 1 }}>
                Rate
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#000" }}>
                {formatCurrency(line.rate_per_quantity)}
              </div>
            </div>
          )}
          {line.total_cost != null && Number(line.total_cost) > 0 && (
            <div>
              <div style={{ fontSize: 9, color: GREY_TEXT, textTransform: "uppercase", marginBottom: 1 }}>
                Total Cost
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#000" }}>
                AED {formatCurrency(line.total_cost)}
              </div>
            </div>
          )}
        </div>

        {/* Allocated qty input — shown only when selected */}
        {isSelected && (
          <div
            style={{ marginTop: 10 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 9, color: GREY_TEXT, textTransform: "uppercase", marginBottom: 4 }}>
              Allocated Qty
            </div>
            <div style={{ position: "relative", maxWidth: 160 }}>
              <input
                type="text"
                inputMode="decimal"
                value={allocatedRaw}
                placeholder="0"
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === "" || /^\d*\.?\d*$/.test(raw)) {
                    onAllocatedChange(line.id, raw);
                  }
                }}
                style={{
                  width: "100%",
                  padding: "7px 40px 7px 8px",
                  fontSize: 12,
                  border: `1px solid ${hasOverAlloc ? "rgba(248,77,77,1)" : BORDER_COLOR}`,
                  borderRadius: 6,
                  boxSizing: "border-box",
                  outline: "none",
                }}
              />
              <span
                style={{
                  position: "absolute",
                  right: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: 10,
                  color: GREY_TEXT,
                  pointerEvents: "none",
                }}
              >
                {mrLineUnit || line.unit || ""}
              </span>
            </div>
            {hasOverAlloc && (
              <div style={{ display: "flex", gap: 4, alignItems: "center", marginTop: 3 }}>
                <img src="/icons/warning.svg" alt="warning" style={{ width: 11, flexShrink: 0 }} />
                <span style={{ color: "rgba(248,77,77,1)", fontSize: 10 }}>Overallocated</span>
              </div>
            )}
          </div>
        )}
      </div>

      {thumb && (
        <img
          src={thumb}
          alt=""
          onClick={() => onToggle(line.id)}
          style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 6, flexShrink: 0, cursor: "pointer" }}
        />
      )}
    </div>
  );
});

// ─── Component ────────────────────────────────────────────────────────────────

export default function MobileBoqSelectWithAllocation({
  projectID,
  onSelectBoq,
  currentBoqLineIDs = [],
  onClose,
  singleSelect = false,
  mrLineQuantity,
  mrLineUnit,
  mrLineId,
}: MobileBoqSelectWithAllocationProps) {
  const BORDER_COLOR = "rgba(217,217,217,1)";
  const GREY_TEXT = "rgba(150,150,150,1)";
  const LIGHT_BG = "rgba(239,239,239,1)";

  const [allLines, setAllLines] = useState<BoqLine[]>([]);
  const [groupedLines, setGroupedLines] = useState<GroupedBoqLines>({});
  const [isFetching, setIsFetching] = useState(false);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showFilter, setShowFilter] = useState(false);

  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string | null>(null);
  const [selectedSubcategoryKeys, setSelectedSubcategoryKeys] = useState<Set<string>>(new Set());

  const [tempSelectedIDs, setTempSelectedIDs] = useState<number[]>(currentBoqLineIDs);

  // Allocation state
  const [allocatedQtys, setAllocatedQtys] = useState<Record<number, number>>({});
  const [allocatedRaw, setAllocatedRaw] = useState<Record<number, string>>({});

  // Chunked rendering
  const [visibleCount, setVisibleCount] = useState(CHUNK_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const mrQty = Number(mrLineQuantity ?? 0);

  // ── Fetch BOQ lines ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!projectID || projectID <= 0) return;
    setIsFetching(true);
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/boq/getAllBoqLinesWithNumberRef`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectID }),
      },
    )
      .then((r) => r.json())
      .then((data: BoqLine[]) => {
        if (!Array.isArray(data)) return;
        setAllLines(data);
        const grouped: GroupedBoqLines = {};
        data.forEach((line) => {
          const cat = line.category || "Uncategorized";
          const sub = line.sub_category || "General";
          if (!grouped[cat]) grouped[cat] = {};
          if (!grouped[cat][sub]) grouped[cat][sub] = [];
          grouped[cat][sub].push(line);
        });
        setGroupedLines(grouped);
        setActiveCategoryFilter(Object.keys(grouped)[0] ?? null);
      })
      .catch(console.error)
      .finally(() => setIsFetching(false));
  }, [projectID]);

  // ── Pre-populate allocations in edit mode ────────────────────────────────────
  useEffect(() => {
    if (mrLineId && currentBoqLineIDs.length > 0) {
      fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "getMrLineBoqAllocations", mr_line_id: mrLineId }),
      })
        .then((r) => r.json())
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
        .catch(() => {});
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Debounce search (150ms) ──────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 150);
    return () => clearTimeout(t);
  }, [search]);

  // ── Derived: grouped filtered lines ─────────────────────────────────────────
  const groupedFiltered = useMemo<GroupedBoqLines>(() => {
    const result: GroupedBoqLines = {};
    allLines.forEach((line) => {
      const cat = line.category || "Uncategorized";
      const sub = line.sub_category || "General";
      const subKey = `${cat}::${sub}`;

      if (selectedSubcategoryKeys.size > 0 && !selectedSubcategoryKeys.has(subKey)) return;

      if (debouncedSearch.trim()) {
        const q = debouncedSearch.toLowerCase();
        const matches =
          line.item_name?.toLowerCase().includes(q) ||
          line.item_number?.toLowerCase().includes(q) ||
          cat.toLowerCase().includes(q) ||
          sub.toLowerCase().includes(q);
        if (!matches) return;
      }

      if (!result[cat]) result[cat] = {};
      if (!result[cat][sub]) result[cat][sub] = [];
      result[cat][sub].push(line);
    });
    return result;
  }, [allLines, selectedSubcategoryKeys, debouncedSearch]);

  // ── Flat rows for chunked rendering ─────────────────────────────────────────
  const flatRows = useMemo<FlatRow[]>(() => {
    const rows: FlatRow[] = [];
    Object.entries(groupedFiltered).forEach(([cat, subcats]) => {
      rows.push({ type: "category", cat });
      Object.entries(subcats).forEach(([sub, lines]) => {
        const firstNum = lines[0]?.item_number ?? "";
        const parts = firstNum.split(".");
        const num = parts.length >= 2 ? `${parts[0]}.${parts[1]}` : "";
        rows.push({ type: "subcategory", sub, num });
        lines.forEach((line) => rows.push({ type: "item", line }));
      });
    });
    return rows;
  }, [groupedFiltered]);

  // Reset visible count when list changes
  useEffect(() => {
    setVisibleCount(CHUNK_SIZE);
  }, [flatRows]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setVisibleCount((prev) => prev + CHUNK_SIZE);
      },
      { threshold: 0.1 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [flatRows]);

  const visibleRows = flatRows.slice(0, visibleCount);

  // ── Stats ────────────────────────────────────────────────────────────────────
  const { filteredCount, categoryCount, subcategoryCount } = useMemo(() => {
    const cats = Object.keys(groupedFiltered);
    let items = 0;
    let subs = 0;
    cats.forEach((cat) => {
      const subcats = Object.keys(groupedFiltered[cat] ?? {});
      subs += subcats.length;
      subcats.forEach((sub) => { items += (groupedFiltered[cat][sub] ?? []).length; });
    });
    return { filteredCount: items, categoryCount: cats.length, subcategoryCount: subs };
  }, [groupedFiltered]);

  // ── Applied filter label ─────────────────────────────────────────────────────
  const appliedFilterLabel = useMemo(() => {
    if (selectedSubcategoryKeys.size === 0) return null;
    const cats = [...new Set(Array.from(selectedSubcategoryKeys).map((k) => k.split("::")[0]))];
    const subs = Array.from(selectedSubcategoryKeys).map((k) => k.split("::")[1]);
    return { cats, subs };
  }, [selectedSubcategoryKeys]);

  // ── Allocation derived values ────────────────────────────────────────────────
  const totalAllocated = tempSelectedIDs.reduce((sum, id) => sum + (allocatedQtys[id] || 0), 0);
  const remaining = mrQty - totalAllocated;
  const isOverAllocated = mrQty > 0 && totalAllocated > mrQty;
  const isFullyAllocated = mrQty > 0 && !isOverAllocated && totalAllocated >= mrQty;
  const allocatedColor = isOverAllocated
    ? "rgba(248,77,77,1)"
    : isFullyAllocated
      ? "rgba(0,125,71,1)"
      : "rgba(248,143,77,1)";

  // Per-BOQ overallocation detection
  const overAllocatedBoqIds = useMemo((): Set<number> => {
    if (!isOverAllocated) return new Set<number>();
    const sorted = tempSelectedIDs
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
  }, [isOverAllocated, tempSelectedIDs, allocatedQtys, mrQty]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const toggleItem = useCallback(
    (id: number) => {
      if (singleSelect) {
        setTempSelectedIDs([id]);
        return;
      }
      setTempSelectedIDs((prev) => {
        if (prev.includes(id)) {
          // Deselect — clear allocation
          setAllocatedQtys((q) => { const n = { ...q }; delete n[id]; return n; });
          setAllocatedRaw((r) => { const n = { ...r }; delete n[id]; return n; });
          return prev.filter((i) => i !== id);
        }
        return [...prev, id];
      });
    },
    [singleSelect],
  );

  const handleAllocatedChange = useCallback((id: number, raw: string) => {
    setAllocatedRaw((prev) => ({ ...prev, [id]: raw }));
    if (raw === "") {
      setAllocatedQtys((prev) => { const n = { ...prev }; delete n[id]; return n; });
    } else {
      const num = parseFloat(raw);
      if (!isNaN(num)) setAllocatedQtys((prev) => ({ ...prev, [id]: num }));
    }
  }, []);

  const handleConfirm = () => {
    if (mrQty > 0 && isOverAllocated) {
      toast("Total allocated quantity exceeds the requested quantity. Please adjust before confirming.", "error");
      return;
    }
    if (mrQty > 0 && !isFullyAllocated) {
      toast("Please allocate the full requested quantity across selected BOQ items before confirming.", "error");
      return;
    }

    const selectedLines = allLines.filter((l) => tempSelectedIDs.includes(l.id));
    const infoText =
      selectedLines.length === 1
        ? `${selectedLines[0].item_number} ${selectedLines[0].item_name}`
        : `${selectedLines.length} BOQ ITEMS SELECTED`;
    onSelectBoq(tempSelectedIDs, infoText, selectedLines, allocatedQtys);
    onClose();
  };

  // ── Memoised selected IDs set ────────────────────────────────────────────────
  const selectedIDsSet = useMemo(() => new Set(tempSelectedIDs), [tempSelectedIDs]);

  // ── Allocation summary strip ─────────────────────────────────────────────────
  const allocationSummary = mrQty > 0 && (
    <div
      style={{
        display: "flex",
        gap: 16,
        padding: "10px 12px",
        background: LIGHT_BG,
        borderRadius: 8,
        marginBottom: 8,
        flexWrap: "wrap",
      }}
    >
      <div>
        <div style={{ fontSize: 9, color: GREY_TEXT, textTransform: "uppercase", marginBottom: 1 }}>
          Requested
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#000" }}>
          {formatQty(mrQty)} {mrLineUnit || ""}
        </div>
      </div>
      <div>
        <div style={{ fontSize: 9, color: GREY_TEXT, textTransform: "uppercase", marginBottom: 1 }}>
          Allocated
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: allocatedColor }}>
          {formatQty(totalAllocated)} {mrLineUnit || ""}
        </div>
      </div>
      <div>
        <div style={{ fontSize: 9, color: GREY_TEXT, textTransform: "uppercase", marginBottom: 1 }}>
          Remaining
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#000" }}>
          {formatQty(remaining)} {mrLineUnit || ""}
        </div>
      </div>
    </div>
  );

  // ── Footer ───────────────────────────────────────────────────────────────────
  const footer = (
    <div>
      {tempSelectedIDs.length > 0 && (
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "#000",
            textAlign: "center",
            marginBottom: 8,
          }}
        >
          {tempSelectedIDs.length} ITEM{tempSelectedIDs.length !== 1 ? "S" : ""} SELECTED
        </div>
      )}
      {/* Search + filter */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "center" }}>
          <img
            src="/icons/search.svg"
            alt=""
            style={{ position: "absolute", left: 10, width: 14, height: 14, opacity: 0.4, pointerEvents: "none" }}
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
              background: selectedSubcategoryKeys.size > 0 ? "#000" : "#fff",
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
              style={{ width: 18, height: 18, filter: selectedSubcategoryKeys.size > 0 ? "invert(1)" : "none" }}
            />
          </button>
          {selectedSubcategoryKeys.size > 0 && (
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

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <FormPopUp
        header="SELECT BOQ ITEM(S)"
        setIsOpen={(open) => { if (!open) onClose(); }}
        handleSubmit={handleConfirm}
        addButtonLabel="CONFIRM"
        stickyFooter={footer}
        haveLoadingState
      >
        {/* Hidden validity gate */}
        <input
          type="text"
          required
          readOnly
          value={tempSelectedIDs.length > 0 ? "x" : ""}
          tabIndex={-1}
          style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }}
        />

        {/* Allocation summary */}
        {!isFetching && allocationSummary}

        {/* Filter summary bar */}
        {!isFetching && allLines.length > 0 && (
          <div
            style={{
              background: LIGHT_BG,
              borderRadius: 8,
              padding: "10px 12px",
              marginBottom: 4,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, color: "#000" }}>
              Showing {categoryCount} {categoryCount === 1 ? "Category" : "Categories"} &amp;{" "}
              {subcategoryCount} {subcategoryCount === 1 ? "Subcategory" : "Subcategories"}
            </div>
            <div style={{ fontSize: 11, color: GREY_TEXT, marginTop: 2 }}>
              {filteredCount} {filteredCount === 1 ? "item" : "items"}
            </div>
          </div>
        )}

        {/* Applied filter label */}
        {appliedFilterLabel && (
          <div style={{ fontSize: 11, color: GREY_TEXT, marginBottom: 8 }}>
            <span style={{ fontWeight: 600, color: "#000" }}>Filters applied: </span>
            {appliedFilterLabel.cats.join(", ")}
            {appliedFilterLabel.subs.length > 0 && <> &mdash; {appliedFilterLabel.subs.join(", ")}</>}
          </div>
        )}

        {/* Content */}
        {isFetching ? (
          <MobileBoqSkeletonLayout />
        ) : flatRows.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: GREY_TEXT, fontSize: 13 }}>
            {debouncedSearch.trim() ? `No results for "${debouncedSearch}"` : "No BOQ items found."}
          </div>
        ) : (
          <div>
            {visibleRows.map((row, i) => {
              if (row.type === "category") {
                return (
                  <div
                    key={`cat-${row.cat}`}
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#000",
                      textTransform: "uppercase",
                      padding: "44px 0 4px",
                    }}
                  >
                    {row.cat}
                  </div>
                );
              }
              if (row.type === "subcategory") {
                return (
                  <div
                    key={`sub-${row.sub}-${i}`}
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: GREY_TEXT,
                      padding: "18px 0 4px",
                      textTransform: "uppercase",
                    }}
                  >
                    {row.num ? `${row.num} ${row.sub}` : row.sub}
                  </div>
                );
              }
              return (
                <BoqItemRow
                  key={`item-${row.line.id}`}
                  line={row.line}
                  isSelected={selectedIDsSet.has(row.line.id)}
                  onToggle={toggleItem}
                  allocatedRaw={allocatedRaw[row.line.id] ?? ""}
                  onAllocatedChange={handleAllocatedChange}
                  hasOverAlloc={overAllocatedBoqIds.has(row.line.id)}
                  mrLineUnit={mrLineUnit}
                  BORDER_COLOR={BORDER_COLOR}
                  GREY_TEXT={GREY_TEXT}
                  LIGHT_BG={LIGHT_BG}
                />
              );
            })}

            {/* Sentinel for infinite scroll */}
            {visibleCount < flatRows.length && (
              <div ref={sentinelRef} style={{ height: 1 }} />
            )}
          </div>
        )}
      </FormPopUp>

      {/* Filter sheet */}
      {showFilter &&
        typeof window !== "undefined" &&
        createPortal(
          <BoqFilterSheet
            groupedLines={groupedLines}
            selectedSubcategoryKeys={selectedSubcategoryKeys}
            setSelectedSubcategoryKeys={setSelectedSubcategoryKeys}
            activeCategoryFilter={activeCategoryFilter}
            setActiveCategoryFilter={setActiveCategoryFilter}
            onClose={() => setShowFilter(false)}
            BORDER_COLOR={BORDER_COLOR}
            GREY_TEXT={GREY_TEXT}
            LIGHT_BG={LIGHT_BG}
          />,
          document.body,
        )}
    </>
  );
}

// ─── Filter Sheet ─────────────────────────────────────────────────────────────

type BoqFilterSheetProps = {
  groupedLines: GroupedBoqLines;
  selectedSubcategoryKeys: Set<string>;
  setSelectedSubcategoryKeys: (s: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  activeCategoryFilter: string | null;
  setActiveCategoryFilter: (cat: string) => void;
  onClose: () => void;
  BORDER_COLOR: string;
  GREY_TEXT: string;
  LIGHT_BG: string;
};

function BoqFilterSheet({
  groupedLines,
  selectedSubcategoryKeys,
  setSelectedSubcategoryKeys,
  activeCategoryFilter,
  setActiveCategoryFilter,
  onClose,
  BORDER_COLOR,
  GREY_TEXT,
  LIGHT_BG,
}: BoqFilterSheetProps) {
  const [tempKeys, setTempKeys] = useState<Set<string>>(() => new Set(selectedSubcategoryKeys));

  const allCategories = Object.keys(groupedLines);
  const activeSubcats = activeCategoryFilter
    ? Object.keys(groupedLines[activeCategoryFilter] ?? {})
    : [];

  const countForCategory = (cat: string) =>
    Object.values(groupedLines[cat] ?? {}).reduce((sum, lines) => sum + lines.length, 0);

  const countForSubcategory = (cat: string, sub: string) =>
    (groupedLines[cat]?.[sub] ?? []).length;

  const toggleSubcategory = (cat: string, sub: string) => {
    const key = `${cat}::${sub}`;
    setTempKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const resetAll = () => setTempKeys(new Set());

  const handleConfirm = () => {
    setSelectedSubcategoryKeys(tempKeys);
    onClose();
  };

  const resetButton = (
    <Button
      componentType={"button"}
      bgColor={"white"}
      borderColor={"black"}
      textColor={"black"}
      onClick={resetAll}
    >
      RESET
    </Button>
  );

  return (
    <FormPopUp
      header="FILTER BOQ ITEM(S)"
      setIsOpen={(open) => { if (!open) onClose(); }}
      handleSubmit={handleConfirm}
      addButtonLabel="CONFIRM"
      secondButton={resetButton}
    >
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
            borderRight: `1px solid ${BORDER_COLOR}`,
          }}
        >
          {allCategories.map((cat) => {
            const isActive = activeCategoryFilter === cat;
            return (
              <div
                key={cat}
                onClick={() => setActiveCategoryFilter(cat)}
                style={{
                  padding: "10px 8px",
                  background: isActive ? "#000" : "transparent",
                  color: isActive ? "#fff" : "#000",
                  borderBottom: `1px solid ${BORDER_COLOR}`,
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 2, wordBreak: "break-word" }}>
                  {cat}
                </div>
                <div style={{ fontSize: 10, color: isActive ? "rgba(200,200,200,1)" : GREY_TEXT }}>
                  {countForCategory(cat)} items
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: subcategories */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {activeSubcats.length === 0 ? (
            <div style={{ padding: 20, fontSize: 12, color: GREY_TEXT, textAlign: "center" }}>
              No subcategories
            </div>
          ) : (
            activeSubcats.map((sub) => {
              const key = `${activeCategoryFilter}::${sub}`;
              const isChecked = tempKeys.has(key);
              const count = countForSubcategory(activeCategoryFilter!, sub);
              return (
                <div
                  key={sub}
                  onClick={() => toggleSubcategory(activeCategoryFilter!, sub)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "9px 10px",
                    borderBottom: `1px solid ${BORDER_COLOR}`,
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 4,
                      border: `2px solid ${isChecked ? GREEN : "rgba(150,150,150,1)"}`,
                      background: isChecked ? GREEN : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {isChecked && (
                      <svg width="9" height="7" viewBox="0 0 10 8" fill="none">
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
                  <span style={{ flex: 1, fontSize: 11, color: "#000" }}>{sub}</span>
                  <span
                    style={{
                      fontSize: 10,
                      color: GREY_TEXT,
                      background: LIGHT_BG,
                      borderRadius: 50,
                      padding: "2px 6px",
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
