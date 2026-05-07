"use client";

import React, {
  useEffect,
  useState,
  useMemo,
  useRef,
  useCallback,
} from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import Button from "@/app/components/Button";
import MaterialsFilterButton, {
  MaterialFilters,
  CategoryGroup,
} from "./components/_MaterialsFilterButton";
import DateRangeButton, {
  DateRange,
  formatRangeLabel,
} from "../transactions/components/_DateRangeButton";
import DownloadMaterialsButton from "./components/_DownloadMaterialsButton";

// ── Types ─────────────────────────────────────────────────────────────────────
type MaterialRow = {
  material_description: string;
  top_supplier: string;
  qty_order: number;
  avg_price: number;
  lowest_price: number;
  total_spent: number;
  projects: string[];
  lpo_details: { mr_header_id: number; lpo_id: number; qty: number; unit_price: number; total_price: number }[];
};

type CategoryRow = {
  category_name: string;
  item_count: number;
  total_spent: number;
};

type HistoryPoint = {
  period: string;
  label: string;
  full_label: string;
  total_spent: number;
  avg_price: number;
};

// ── Constants ─────────────────────────────────────────────────────────────────
const ITEMS_PER_PAGE = 30;

const DEFAULT_FILTERS: MaterialFilters = {
  selectedVendorTypes: [],
  selectedProjects: [],
  spentMin: "",
  spentMax: "",
  selectedCategories: [],
};

const CHART_COLORS = [
  "#00804C",
  "#1a237e",
  "#87CEEB",
  "#C62828",
  "#7B68EE",
  "#80CBC4",
  "#D3D3D3",
];

const LINE_COLOR_SPENT = "rgba(137,168,27,1)";
const LINE_COLOR_AVG = "rgba(198,169,0,1)";

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatAED(val: number): string {
  return val.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatAEDShort(val: number): string {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(0)}K`;
  return val.toLocaleString();
}

// ── Pie tooltip ───────────────────────────────────────────────────────────────
const PieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        backgroundColor: "white",
        padding: "8px 12px",
        borderRadius: 25,
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        border: "1px solid #e0e0e0",
        fontSize: 12,
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          backgroundColor: payload[0].payload.color,
          display: "inline-block",
        }}
      />
      <strong>AED {formatAED(payload[0].value)}</strong>
    </div>
  );
};

// ── Line chart tooltip ────────────────────────────────────────────────────────
const LineTooltip = ({ active, payload, label, showSpent, showAvg }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        backgroundColor: "rgba(20,20,20,1)",
        padding: "12px 16px",
        borderRadius: 10,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "rgba(180,180,180,1)",
          marginBottom: 6,
          fontWeight: 400,
        }}
      >
        {label}
      </div>
      {showSpent && payload.find((p: any) => p.dataKey === "total_spent") && (
        <div
          style={{
            fontSize: 13,
            color: "white",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: LINE_COLOR_SPENT,
              display: "inline-block",
            }}
          />
          Total Spent: AED{" "}
          {formatAED(
            Number(
              payload.find((p: any) => p.dataKey === "total_spent")?.value ?? 0,
            ),
          )}
        </div>
      )}
      {showAvg && payload.find((p: any) => p.dataKey === "avg_price") && (
        <div
          style={{
            fontSize: 13,
            color: "white",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginTop: 4,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: LINE_COLOR_AVG,
              display: "inline-block",
            }}
          />
          Avg Price: AED{" "}
          {formatAED(
            Number(
              payload.find((p: any) => p.dataKey === "avg_price")?.value ?? 0,
            ),
          )}
        </div>
      )}
    </div>
  );
};

// ── Expandable row chart ──────────────────────────────────────────────────────
function MaterialChart({
  material,
  startDate,
  endDate,
}: {
  material: string;
  startDate: string | null;
  endDate: string | null;
}) {
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSpent, setShowSpent] = useState(true);
  const [showAvg, setShowAvg] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    const p = new URLSearchParams();
    p.set("material", material);
    if (startDate) p.set("startDate", startDate);
    if (endDate) p.set("endDate", endDate);
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/dashboard/finance/getMaterialHistory?${p.toString()}`,
    )
      .then((r) => r.json())
      .then((d) => setHistory(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [material, startDate, endDate]);

  // Derive human-readable date range from actual data
  const dataRangeLabel =
    history.length > 0
      ? history.length === 1
        ? history[0].full_label
        : `${history[0].full_label} – ${history[history.length - 1].full_label}`
      : null;

  if (isLoading) {
    return (
      <div style={{ padding: "28px 24px", backgroundColor: "white" }}>
        <p style={{ color: "#999", fontSize: 13, textAlign: "center" }}>
          Loading chart…
        </p>
      </div>
    );
  }
  if (!history.length) {
    return (
      <div style={{ padding: "28px 24px", backgroundColor: "white" }}>
        <p style={{ color: "#999", fontSize: 13, textAlign: "center" }}>
          No spend history available
        </p>
      </div>
    );
  }

  const yMax = Math.max(
    showSpent ? Math.max(...history.map((h) => h.total_spent)) : 0,
    showAvg ? Math.max(...history.map((h) => h.avg_price)) : 0,
    1,
  );

  // Show every Nth label so x-axis doesn't crowd when many daily points
  const tickInterval = Math.max(1, Math.floor(history.length / 12)) - 1;

  const gradId = (s: string) => s.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10);

  return (
    <div
      style={{
        backgroundColor: "white",
        padding: "18px 24px 20px",
        borderTop: "1px solid rgba(243,244,246,1)",
      }}
    >
      {/* Header row: checkboxes left, date range right */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", gap: 20 }}>
          {/* Total Spent checkbox */}
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            <input
              type="checkbox"
              checked={showSpent}
              onChange={(e) => setShowSpent(e.target.checked)}
              style={{
                width: 16,
                height: 16,
                accentColor: LINE_COLOR_SPENT,
                cursor: "pointer",
              }}
            />
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span
                style={{
                  width: 10,
                  height: 3,
                  borderRadius: 2,
                  backgroundColor: LINE_COLOR_SPENT,
                  display: "inline-block",
                }}
              />
              Total Spent
            </span>
          </label>
          {/* Avg Price checkbox */}
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            <input
              type="checkbox"
              checked={showAvg}
              onChange={(e) => setShowAvg(e.target.checked)}
              style={{
                width: 16,
                height: 16,
                accentColor: LINE_COLOR_AVG,
                cursor: "pointer",
              }}
            />
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span
                style={{
                  width: 10,
                  height: 3,
                  borderRadius: 2,
                  backgroundColor: LINE_COLOR_AVG,
                  display: "inline-block",
                }}
              />
              AVG price
            </span>
          </label>
        </div>

        {/* Date range label */}
        {dataRangeLabel && (
          <span
            style={{
              fontSize: 12,
              color: "rgba(120,120,120,1)",
              fontWeight: 500,
            }}
          >
            {dataRangeLabel}
          </span>
        )}
      </div>

      {!showSpent && !showAvg ? (
        <div
          style={{
            padding: "24px 0",
            color: "#999",
            fontSize: 13,
            textAlign: "center",
          }}
        >
          Select at least one metric above
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart
            data={history}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient
                id={`fs_${gradId(material)}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor={LINE_COLOR_SPENT}
                  stopOpacity={0.18}
                />
                <stop
                  offset="100%"
                  stopColor={LINE_COLOR_SPENT}
                  stopOpacity={0.02}
                />
              </linearGradient>
              <linearGradient
                id={`fa_${gradId(material)}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor={LINE_COLOR_AVG}
                  stopOpacity={0.15}
                />
                <stop
                  offset="100%"
                  stopColor={LINE_COLOR_AVG}
                  stopOpacity={0.02}
                />
              </linearGradient>
            </defs>

            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#999" }}
              axisLine={false}
              tickLine={false}
              interval={tickInterval}
            />
            <YAxis
              tickFormatter={formatAEDShort}
              tick={{ fontSize: 11, fill: "#999" }}
              axisLine={false}
              tickLine={false}
              width={52}
              domain={[0, Math.ceil(yMax * 1.15)]}
            />
            <Tooltip
              content={<LineTooltip showSpent={showSpent} showAvg={showAvg} />}
            />

            {showSpent && (
              <Area
                type="linear"
                dataKey="total_spent"
                stroke={LINE_COLOR_SPENT}
                strokeWidth={2}
                fill={`url(#fs_${gradId(material)})`}
                dot={{ r: 5, fill: LINE_COLOR_SPENT, strokeWidth: 0 }}
                activeDot={{
                  r: 7,
                  fill: LINE_COLOR_SPENT,
                  strokeWidth: 2,
                  stroke: "#fff",
                }}
              />
            )}
            {showAvg && (
              <Area
                type="linear"
                dataKey="avg_price"
                stroke={LINE_COLOR_AVG}
                strokeWidth={2}
                fill={`url(#fa_${gradId(material)})`}
                dot={{ r: 5, fill: LINE_COLOR_AVG, strokeWidth: 0 }}
                activeDot={{
                  r: 7,
                  fill: LINE_COLOR_AVG,
                  strokeWidth: 2,
                  stroke: "#fff",
                }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function MaterialsReportPage() {
  const [tableData, setTableData] = useState<MaterialRow[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryHierarchy, setCategoryHierarchy] = useState<
    { level_2: string; value: string }[]
  >([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<MaterialFilters>(DEFAULT_FILTERS);
  const [dateRange, setDateRange] = useState<DateRange>({
    start: null,
    end: null,
    preset: null,
  });
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const headerCheckboxRef = useRef<HTMLInputElement>(null);

  // Column hover popup (QTY ORDERED / LOWEST PRICE / TOTAL SPENT)
  const [hoveredMatKey, setHoveredMatKey] = useState<string | null>(null);
  const [hoveredMatCol, setHoveredMatCol] = useState<"qty" | "lowest_price" | "total_spent" | null>(null);
  const [matPopupRect, setMatPopupRect] = useState<DOMRect | null>(null);
  const matHideTimer = useRef<NodeJS.Timeout | null>(null);

  const startMatHideTimer = useCallback(() => {
    if (matHideTimer.current) clearTimeout(matHideTimer.current);
    matHideTimer.current = setTimeout(() => {
      setHoveredMatKey(null);
      setHoveredMatCol(null);
      setMatPopupRect(null);
    }, 120);
  }, []);

  const cancelMatHideTimer = useCallback(() => {
    if (matHideTimer.current) {
      clearTimeout(matHideTimer.current);
      matHideTimer.current = null;
    }
  }, []);

  // ── Fetch category hierarchy once on mount ─────────────────────────────────
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMaterialCategoryValues`)
      .then((r) => r.json())
      .then((d) => setCategoryHierarchy(Array.isArray(d) ? d : []))
      .catch(console.error);
  }, []);

  // ── Query string → re-fetch on date/vendorType/category change ────────────
  const queryStr = useMemo(() => {
    const p = new URLSearchParams();
    if (dateRange.start)
      p.set("startDate", dateRange.start.toISOString().split("T")[0]);
    if (dateRange.end)
      p.set("endDate", dateRange.end.toISOString().split("T")[0]);
    if (filters.selectedVendorTypes.length > 0)
      p.set("vendorType", filters.selectedVendorTypes.join(","));
    if (filters.selectedCategories.length > 0)
      p.set("category", filters.selectedCategories.join(","));
    return p.toString();
  }, [dateRange, filters.selectedVendorTypes, filters.selectedCategories]);

  useEffect(() => {
    setIsLoading(true);
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/dashboard/finance/getAllMaterials?${queryStr}`,
    )
      .then((r) => r.json())
      .then((d) => {
        setTableData(d?.table_data ?? []);
        setCategoryData(d?.category_data ?? []);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [queryStr]);

  // ── Derived filter options ─────────────────────────────────────────────────
  const allProjects = useMemo(() => {
    const set = new Set<string>();
    tableData.forEach((row) => row.projects.forEach((p) => set.add(p)));
    return Array.from(set).sort();
  }, [tableData]);

  const spentBounds = useMemo(() => {
    if (!tableData.length) return { min: 0, max: 1_000_000 };
    const max = Math.max(...tableData.map((v) => v.total_spent));
    return { min: 0, max: Math.ceil(max / 10000) * 10000 };
  }, [tableData]);

  // Build grouped category list from hierarchy, filtered to categories present in current data
  const categoryGroups = useMemo<CategoryGroup[]>(() => {
    const presentCategories = new Set(categoryData.map((r) => r.category_name));
    const groupMap = new Map<string, string[]>();
    categoryHierarchy.forEach(({ level_2, value }) => {
      if (presentCategories.has(value)) {
        if (!groupMap.has(level_2)) groupMap.set(level_2, []);
        groupMap.get(level_2)!.push(value);
      }
    });
    return Array.from(groupMap.entries())
      .map(([name, items]) => ({ name, items: items.sort() }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [categoryData, categoryHierarchy]);

  // ── Filtered + paginated rows ──────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const minAmt = filters.spentMin !== "" ? Number(filters.spentMin) : null;
    const maxAmt = filters.spentMax !== "" ? Number(filters.spentMax) : null;

    return tableData.filter((row) => {
      if (
        q &&
        !row.material_description.toLowerCase().includes(q) &&
        !row.top_supplier.toLowerCase().includes(q)
      )
        return false;
      if (filters.selectedProjects.length > 0) {
        if (!row.projects.some((p) => filters.selectedProjects.includes(p)))
          return false;
      }
      if (minAmt !== null && row.total_spent < minAmt) return false;
      if (maxAmt !== null && row.total_spent > maxAmt) return false;
      return true;
    });
  }, [
    tableData,
    searchQuery,
    filters.selectedProjects,
    filters.spentMin,
    filters.spentMax,
  ]);

  const sorted = useMemo(() => {
    if (!sortCol) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sortCol as keyof MaterialRow] ?? 0;
      const bv = b[sortCol as keyof MaterialRow] ?? 0;
      if (av === null || av === undefined) return sortDir === "asc" ? 1 : -1;
      if (bv === null || bv === undefined) return sortDir === "asc" ? -1 : 1;
      return sortDir === "asc"
        ? (av as number) - (bv as number)
        : (bv as number) - (av as number);
    });
  }, [filtered, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / ITEMS_PER_PAGE));
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sorted.slice(start, start + ITEMS_PER_PAGE);
  }, [sorted, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filters, dateRange]);

  // ── Active filter helpers ──────────────────────────────────────────────────
  const hasActiveFilters =
    filters.selectedVendorTypes.length > 0 ||
    filters.selectedProjects.length > 0 ||
    filters.spentMin !== "" ||
    filters.spentMax !== "" ||
    filters.selectedCategories.length > 0;

  // ── Row expand toggle ──────────────────────────────────────────────────────
  const toggleExpand = (key: string) =>
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  // ── Checkbox helpers ──────────────────────────────────────────────────────
  const allSelected =
    sorted.length > 0 &&
    sorted.every((r) => selectedKeys.has(r.material_description));
  const someSelected =
    !allSelected &&
    sorted.some((r) => selectedKeys.has(r.material_description));

  useEffect(() => {
    if (headerCheckboxRef.current)
      headerCheckboxRef.current.indeterminate = someSelected;
  }, [someSelected]);

  const toggleAll = () => {
    if (allSelected) {
      setSelectedKeys((prev) => {
        const next = new Set(prev);
        sorted.forEach((r) => next.delete(r.material_description));
        return next;
      });
    } else {
      setSelectedKeys((prev) => {
        const next = new Set(prev);
        sorted.forEach((r) => next.add(r.material_description));
        return next;
      });
    }
  };

  const toggleKey = useCallback((key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  // ── Chart data for donut ───────────────────────────────────────────────────
  const chartData = categoryData.map((row, i) => ({
    name: row.category_name,
    value: row.total_spent,
    item_count: row.item_count,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const totalCategorySpend = chartData.reduce((s, d) => s + d.value, 0);

  // ── Pagination numbers ─────────────────────────────────────────────────────
  const getPageNumbers = () => {
    const pages: (number | "...")[] = [];
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

  const sortIcon = (col: string) => (
    <span
      style={{
        marginLeft: 4,
        fontSize: 10,
        opacity: sortCol === col ? 1 : 0.35,
      }}
    >
      {sortCol === col ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
    </span>
  );

  const handleSort = (col: string) => {
    if (sortCol !== col) {
      setSortCol(col);
      setSortDir("desc");
    } else if (sortDir === "desc") {
      setSortDir("asc");
    } else {
      setSortCol(null);
      setSortDir("desc");
    }
  };

  // Date strings for per-row chart
  const chartStartDate = dateRange.start
    ? dateRange.start.toISOString().split("T")[0]
    : null;
  const chartEndDate = dateRange.end
    ? dateRange.end.toISOString().split("T")[0]
    : null;

  return (
    <div>
      {/* ── Row 1: Title + search ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <h1>MATERIALS</h1>
        <div style={{ position: "relative" }}>
          <input
            type="text"
            placeholder="SEARCH"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: 240,
              padding: "7px 40px 7px 16px",
              borderRadius: 8,
              border: "1px solid rgba(223,223,223,1)",
              fontSize: 13,
              outline: "none",
              backgroundColor: "white",
            }}
          />
          <img
            src="/icons/search.svg"
            alt="search"
            style={{
              position: "absolute",
              right: 12,
              top: "50%",
              transform: "translateY(-50%)",
              width: 15,
              height: 15,
              opacity: 0.45,
            }}
          />
        </div>
      </div>

      {/* ── Spending By Categories ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
        <div
          style={{
            backgroundColor: "white",
            borderRadius: 15,
            padding: "20px 28px",
            marginBottom: 24,
            minHeight: 280,
          }}
        >
          <p
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "rgba(74,85,101,1)",
              marginBottom: 16,
            }}
          >
            Spending By Categories
          </p>

          {isLoading ? (
            <p style={{ fontSize: 13, color: "#999" }}>Loading…</p>
          ) : !chartData.length ? (
            <p style={{ fontSize: 13, color: "#999" }}>
              No category data available
            </p>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
              {/* Donut */}
              <div
                style={{
                  position: "relative",
                  width: 200,
                  height: 200,
                  flexShrink: 0,
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={62}
                      outerRadius={92}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={<PieTooltip />}
                      wrapperStyle={{ zIndex: 100 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend */}
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                {chartData.map((item, i) => {
                  const isActive = filters.selectedCategories.includes(item.name);
                  return (
                    <div
                      key={i}
                      onClick={() =>
                        setFilters((prev) => ({
                          ...prev,
                          selectedCategories: isActive
                            ? prev.selectedCategories.filter(
                                (c) => c !== item.name,
                              )
                            : [...prev.selectedCategories, item.name],
                        }))
                      }
                      style={{
                        display: "grid",
                        gridTemplateColumns: "16px 1fr auto auto",
                        alignItems: "center",
                        gap: "6px 12px",
                        cursor: "pointer",
                        padding: "5px 8px",
                        borderRadius: 8,
                        backgroundColor: isActive
                          ? "rgba(0,128,76,0.07)"
                          : "transparent",
                        transition: "background-color 0.12s",
                      }}
                    >
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          backgroundColor: item.color,
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          textTransform: "uppercase",
                          color: "rgba(30,30,30,1)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.name}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          color: "rgba(120,120,120,1)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.item_count.toLocaleString()} Items
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          color: "rgba(30,30,30,1)",
                          whiteSpace: "nowrap",
                          fontWeight: 600,
                        }}
                      >
                        AED {formatAED(item.value)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <div></div>
      </div>

      {/* ── Row 2: Filter + bubbles (left) | Date (right) ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        {/* Left: filter + bubbles */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <MaterialsFilterButton
            projects={allProjects}
            categoryGroups={categoryGroups}
            currentFilters={filters}
            onApplyFilters={setFilters}
            spentBounds={spentBounds}
          />

          {hasActiveFilters && (
            <>
              {filters.selectedVendorTypes.length > 0 && (
                <Button
                  componentType="none"
                  bgColor="rgba(239,239,239,1)"
                  borderColor="transparent"
                  textColor="black"
                  style={{
                    borderRadius: 50,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  VENDOR TYPE:{" "}
                  <span style={{ color: "rgba(16,185,129,1)" }}>
                    {filters.selectedVendorTypes[0].toUpperCase()}
                    {filters.selectedVendorTypes.length > 1 &&
                      `, +${filters.selectedVendorTypes.length - 1} MORE`}
                  </span>
                </Button>
              )}

              {(filters.spentMin !== "" || filters.spentMax !== "") && (
                <Button
                  componentType="none"
                  bgColor="rgba(239,239,239,1)"
                  borderColor="transparent"
                  textColor="black"
                  style={{
                    borderRadius: 50,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  SPEND:{" "}
                  <span style={{ color: "rgba(16,185,129,1)" }}>
                    {filters.spentMin !== ""
                      ? `AED ${Number(filters.spentMin).toLocaleString()}`
                      : "0"}
                    {" — "}
                    {filters.spentMax !== ""
                      ? `AED ${Number(filters.spentMax).toLocaleString()}`
                      : "∞"}
                  </span>
                </Button>
              )}
              {filters.selectedProjects.length > 0 && (
                <Button
                  componentType="none"
                  bgColor="rgba(239,239,239,1)"
                  borderColor="transparent"
                  textColor="black"
                  style={{
                    borderRadius: 50,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  PROJECT:{" "}
                  <span style={{ color: "rgba(16,185,129,1)" }}>
                    {filters.selectedProjects[0].toUpperCase()}
                    {filters.selectedProjects.length > 1 &&
                      `, +${filters.selectedProjects.length - 1} MORE`}
                  </span>
                </Button>
              )}
              {filters.selectedCategories.length > 0 && (
                <Button
                  componentType="none"
                  bgColor="rgba(239,239,239,1)"
                  borderColor="transparent"
                  textColor="black"
                  style={{
                    borderRadius: 50,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  CATEGORY:{" "}
                  <span style={{ color: "rgba(16,185,129,1)" }}>
                    {filters.selectedCategories[0].toUpperCase()}
                    {filters.selectedCategories.length > 1 &&
                      `, +${filters.selectedCategories.length - 1} MORE`}
                  </span>
                </Button>
              )}
              <Button
                componentType="button"
                bgColor="transparent"
                borderColor="transparent"
                textColor="black"
                onClick={() => setFilters(DEFAULT_FILTERS)}
                style={{ padding: "0px" }}
              >
                RESET FILTER
              </Button>
            </>
          )}
        </div>

        {/* Right: date filter + download */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexShrink: 0,
          }}
        >
          <DateRangeButton value={dateRange} onChange={setDateRange} />
          <DownloadMaterialsButton
            allRows={sorted}
            selectedKeys={selectedKeys}
            categoryData={categoryData}
            dateRange={dateRange}
          />
        </div>
      </div>

      {/* ── Table ── */}
      {isLoading ? (
        <p style={{ color: "rgba(150,150,150,1)", fontSize: 13 }}>Loading...</p>
      ) : !filtered.length ? (
        <p style={{ textAlign: "center", color: "#888", padding: "40px 0" }}>
          {searchQuery || hasActiveFilters || dateRange.start
            ? "No materials match your filters."
            : "No materials found."}
        </p>
      ) : (
        <>
          <div style={{ overflowX: "auto" }}>
            <table
              className="items-table two-toned"
              style={{ width: "100%", tableLayout: "fixed" }}
            >
              <colgroup>
                <col style={{ width: "44px" }} />
                <col style={{ width: "44px" }} />
                <col style={{ width: "50px" }} />
                <col />
                <col style={{ width: "400px" }} />
                <col style={{ width: "120px" }} />
                <col style={{ width: "150px" }} />
                <col style={{ width: "150px" }} />
                <col style={{ width: "160px" }} />
              </colgroup>
              <thead>
                <tr>
                  <th />
                  <th style={{ textAlign: "center", padding: "12px 8px" }}>
                    <input
                      ref={headerCheckboxRef}
                      type="checkbox"
                      className="manager-checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      style={{ cursor: "pointer", accentColor: "#10b981" }}
                    />
                  </th>
                  <th>#</th>
                  <th>MATERIAL</th>
                  <th>TOP VENDOR</th>
                  <th
                    style={{ cursor: "pointer", userSelect: "none" }}
                    onClick={() => handleSort("qty_order")}
                  >
                    QTY ORDERED{sortIcon("qty_order")}
                  </th>
                  <th
                    style={{ cursor: "pointer", userSelect: "none" }}
                    onClick={() => handleSort("avg_price")}
                  >
                    AVG. PRICE{sortIcon("avg_price")}
                  </th>
                  <th
                    style={{ cursor: "pointer", userSelect: "none" }}
                    onClick={() => handleSort("lowest_price")}
                  >
                    LOWEST PRICE{sortIcon("lowest_price")}
                  </th>
                  <th
                    style={{ cursor: "pointer", userSelect: "none" }}
                    onClick={() => handleSort("total_spent")}
                  >
                    TOTAL SPENT{sortIcon("total_spent")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((row, i) => {
                  const rowKey = row.material_description;
                  const isExpanded = expandedRows.has(rowKey);
                  const rowNum = (currentPage - 1) * ITEMS_PER_PAGE + i + 1;

                  return (
                    <React.Fragment key={rowKey}>
                      <tr
                        style={{
                          cursor: "pointer",
                          backgroundColor: selectedKeys.has(rowKey)
                            ? "rgba(240,250,244,1)"
                            : undefined,
                        }}
                        onClick={() => toggleExpand(rowKey)}
                      >
                        {/* Expand toggle */}
                        <td style={{ textAlign: "center" }}>
                          <span
                            style={{
                              fontSize: 11,
                              display: "inline-block",
                              transition: "transform 0.15s",
                              transform: isExpanded ? "rotate(90deg)" : "none",
                            }}
                          >
                            ›
                          </span>
                        </td>
                        {/* Checkbox — stops propagation so it doesn't expand/collapse */}
                        <td
                          style={{ textAlign: "center", padding: "12px 8px" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            className="manager-checkbox"
                            checked={selectedKeys.has(rowKey)}
                            onChange={() => toggleKey(rowKey)}
                            style={{ cursor: "pointer", accentColor: "#10b981" }}
                          />
                        </td>
                        <td>{rowNum}</td>
                        <td
                          style={{
                            maxWidth: 0,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {row.material_description}
                        </td>
                        <td
                          style={{
                            maxWidth: 0,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {row.top_supplier}
                        </td>
                        {/* QTY ORDERED */}
                        <td
                          style={{ cursor: "default" }}
                          onMouseEnter={(e) => {
                            if (!row.lpo_details.length) return;
                            cancelMatHideTimer();
                            if (hoveredMatKey === rowKey) return;
                            setHoveredMatKey(rowKey);
                            setHoveredMatCol("qty");
                            setMatPopupRect(
                              (e.currentTarget as HTMLElement).getBoundingClientRect(),
                            );
                          }}
                          onMouseLeave={startMatHideTimer}
                        >
                          {row.qty_order.toLocaleString()}
                        </td>
                        {/* AVG. PRICE — no hover */}
                        <td
                          style={{
                            color: "rgba(198,169,0,1)",
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                          }}
                        >
                          AED {formatAED(row.avg_price)}
                        </td>
                        {/* LOWEST PRICE */}
                        <td
                          style={{
                            color: "rgba(2,122,70,1)",
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                            cursor: "default",
                          }}
                          onMouseEnter={(e) => {
                            if (!row.lpo_details.length) return;
                            cancelMatHideTimer();
                            if (hoveredMatKey === rowKey) return;
                            setHoveredMatKey(rowKey);
                            setHoveredMatCol("lowest_price");
                            setMatPopupRect(
                              (e.currentTarget as HTMLElement).getBoundingClientRect(),
                            );
                          }}
                          onMouseLeave={startMatHideTimer}
                        >
                          AED {formatAED(row.lowest_price)}
                        </td>
                        {/* TOTAL SPENT */}
                        <td
                          style={{ whiteSpace: "nowrap", cursor: "default" }}
                          onMouseEnter={(e) => {
                            if (!row.lpo_details.length) return;
                            cancelMatHideTimer();
                            if (hoveredMatKey === rowKey) return;
                            setHoveredMatKey(rowKey);
                            setHoveredMatCol("total_spent");
                            setMatPopupRect(
                              (e.currentTarget as HTMLElement).getBoundingClientRect(),
                            );
                          }}
                          onMouseLeave={startMatHideTimer}
                        >
                          AED {formatAED(row.total_spent)}
                        </td>
                      </tr>

                      {/* Expanded: per-item chart — aligned with MATERIAL NAME column */}
                      {isExpanded && (
                        <tr>
                          {/* Skip arrow + checkbox + # columns so chart starts at MATERIAL NAME */}
                          <td
                            style={{ padding: 0, backgroundColor: "white" }}
                          />
                          <td
                            style={{ padding: 0, backgroundColor: "white" }}
                          />
                          <td
                            style={{ padding: 0, backgroundColor: "white" }}
                          />
                          <td colSpan={6} style={{ padding: 0 }}>
                            <MaterialChart
                              material={row.material_description}
                              startDate={chartStartDate}
                              endDate={chartEndDate}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: 10,
                marginTop: 20,
              }}
            >
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                style={{
                  padding: "8px 12px",
                  borderRadius: 5,
                  border: "1px solid rgba(223,223,223,1)",
                  backgroundColor: "white",
                  color: "black",
                  cursor: currentPage === 1 ? "not-allowed" : "pointer",
                  fontWeight: 600,
                  minWidth: 40,
                  opacity: currentPage === 1 ? 0.4 : 1,
                }}
              >
                ‹
              </button>

              {getPageNumbers().map((page, index) => (
                <button
                  key={index}
                  onClick={() =>
                    typeof page === "number" && setCurrentPage(page)
                  }
                  disabled={page === "..."}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 5,
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
                    minWidth: 40,
                  }}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                style={{
                  padding: "8px 12px",
                  borderRadius: 5,
                  border: "1px solid rgba(223,223,223,1)",
                  backgroundColor: "white",
                  color: "black",
                  cursor:
                    currentPage === totalPages ? "not-allowed" : "pointer",
                  fontWeight: 600,
                  minWidth: 40,
                  opacity: currentPage === totalPages ? 0.4 : 1,
                }}
              >
                ›
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Column hover popup (QTY / LOWEST PRICE / TOTAL SPENT) ── */}
      {hoveredMatKey !== null &&
        hoveredMatCol !== null &&
        matPopupRect &&
        (() => {
          const material = sorted.find(
            (r) => r.material_description === hoveredMatKey,
          );
          if (!material) return null;
          const popupWidth = hoveredMatCol === "qty" ? 360 : 420;
          const spaceRight = window.innerWidth - matPopupRect.right;
          const left =
            spaceRight >= popupWidth + 10
              ? matPopupRect.right + 8
              : matPopupRect.left - popupWidth - 8;
          const top = Math.min(matPopupRect.top, window.innerHeight - 400);
          return (
            <div
              onMouseEnter={cancelMatHideTimer}
              onMouseLeave={() => {
                setHoveredMatKey(null);
                setHoveredMatCol(null);
                setMatPopupRect(null);
              }}
              style={{
                position: "fixed",
                left: Math.max(8, left),
                top: Math.max(8, top),
                backgroundColor: "white",
                border: "1px solid rgba(223,223,223,1)",
                borderRadius: "10px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                zIndex: 10000,
                minWidth: `${popupWidth}px`,
                maxWidth: `${popupWidth}px`,
                maxHeight: "400px",
                overflowY: "auto",
              }}
            >
              <div style={{ padding: "12px" }}>
                <table
                  className="items-table popup-hover"
                  style={{ width: "100%" }}
                >
                  <thead>
                    <tr>
                      <th>MR NUMBER</th>
                      <th>LPO NUMBER</th>
                      {hoveredMatCol === "qty" && <th>QTY</th>}
                      {hoveredMatCol === "lowest_price" && <th>PRICE</th>}
                      {hoveredMatCol === "total_spent" && <th>PRICE</th>}
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {material.lpo_details.map(
                      ({ mr_header_id, lpo_id, qty, unit_price, total_price }, idx) => (
                        <tr key={idx}>
                          <td style={{ whiteSpace: "nowrap" }}>
                            MR-{String(mr_header_id).padStart(5, "0")}
                          </td>
                          <td style={{ whiteSpace: "nowrap" }}>
                            LPO-{String(lpo_id).padStart(5, "0")}
                          </td>
                          {hoveredMatCol === "qty" && (
                            <td style={{ whiteSpace: "nowrap" }}>
                              {Number.isInteger(qty)
                                ? qty
                                : parseFloat(qty.toFixed(3))}
                            </td>
                          )}
                          {hoveredMatCol === "lowest_price" && (
                            <td style={{ whiteSpace: "nowrap" }}>
                              AED {formatAED(unit_price)}
                            </td>
                          )}
                          {hoveredMatCol === "total_spent" && (
                            <td style={{ whiteSpace: "nowrap" }}>
                              AED {formatAED(total_price)}
                            </td>
                          )}
                          <td>
                            <Button
                              componentType={"link"}
                              bgColor={"rgba(239, 239, 239, 1)"}
                              borderColor={"rgba(223, 223, 223, 1)"}
                              textColor={"black"}
                              style={{ padding: "7px 7px" }}
                              onClick={(e) => e.stopPropagation()}
                              href={`/mr/${mr_header_id}/lpo/${lpo_id}`}
                            >
                              <img src="/icons/external-link.svg" alt="open" />
                            </Button>
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}
    </div>
  );
}
