"use client";

import React, { useEffect, useState, useMemo } from "react";
import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import VendorsFilterButton, {
  VendorFilters,
} from "./components/_VendorsFilterButton";
import DateRangeButton, {
  DateRange,
} from "../transactions/components/_DateRangeButton";

// ── Types ─────────────────────────────────────────────────────────────────────
type Vendor = {
  supplier_id: number;
  supplier_name: string;
  payment_type: string;
  total_lpos: number;
  amount: number;
  projects: string[];
  last_purchase_date: string | null;
  qty_ordered: number | null;
  avg_price: number | null;
  median_price: number | null;
  lowest_price: number | null;
  highest_price: number | null;
  order_completion_rate: number | null;
  avg_delivery_days: number | null;
  order_frequency_week: number | null;
  on_time_delivery_pct: number | null;
};

const ITEMS_PER_PAGE = 30;

const DEFAULT_FILTERS: VendorFilters = {
  selectedVendorTypes: [],
  spentMin: "",
  spentMax: "",
  selectedProjects: [],
  selectedMetrics: [],
};

// ── Optional column definitions ───────────────────────────────────────────────
const OPTIONAL_COLS = [
  {
    key: "qty_ordered",
    header: "QTY ORDERED",
    render: (v: Vendor) =>
      v.qty_ordered != null ? v.qty_ordered.toLocaleString() : "—",
  },
  {
    key: "avg_price",
    header: "AVG PRICE",
    render: (v: Vendor) =>
      v.avg_price != null ? `AED ${formatAED(v.avg_price)}` : "—",
  },
  {
    key: "median_price",
    header: "MEDIAN PRICE",
    render: (v: Vendor) =>
      v.median_price != null ? `AED ${formatAED(v.median_price)}` : "—",
  },
  {
    key: "lowest_price",
    header: "LOWEST PRICE",
    render: (v: Vendor) =>
      v.lowest_price != null ? `AED ${formatAED(v.lowest_price)}` : "—",
  },
  {
    key: "highest_price",
    header: "HIGHEST PRICE",
    render: (v: Vendor) =>
      v.highest_price != null ? `AED ${formatAED(v.highest_price)}` : "—",
  },
  {
    key: "last_purchase_date",
    header: "LAST PURCHASE DATE",
    render: (v: Vendor) =>
      v.last_purchase_date ? formatDate(v.last_purchase_date) : "—",
  },
];

// ── Performance metric column definitions ─────────────────────────────────────
const METRIC_COLS: Record<
  string,
  {
    header: string;
    render: (v: Vendor) => React.ReactNode;
    bubbleLabel: string;
    sortKey: string;
  }
> = {
  on_time_delivery: {
    header: "ON-TIME DELIVERY %",
    bubbleLabel: "On-time Delivery %",
    sortKey: "on_time_delivery_pct",
    render: (v) =>
      v.on_time_delivery_pct != null ? `${v.on_time_delivery_pct}%` : "—",
  },
  order_completion: {
    header: "ORDER COMPLETION RATE",
    bubbleLabel: "Order Completion Rate",
    sortKey: "order_completion_rate",
    render: (v) =>
      v.order_completion_rate != null ? `${v.order_completion_rate}%` : "—",
  },
  avg_delivery_time: {
    header: "AVG DELIVERY TIME",
    bubbleLabel: "Avg. Delivery Time",
    sortKey: "avg_delivery_days",
    render: (v) =>
      v.avg_delivery_days != null ? `${v.avg_delivery_days} days` : "—",
  },
  order_frequency: {
    header: "ORDER FREQ/WEEK",
    bubbleLabel: "Order Frequency/Week",
    sortKey: "order_frequency_week",
    render: (v) =>
      v.order_frequency_week != null ? `${v.order_frequency_week}` : "—",
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatAED(val: number): string {
  return val.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(raw: string): string {
  const d = new Date(raw);
  return d
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .toUpperCase();
}

function getVendorTypeStyle(type: string): {
  backgroundColor: string;
  color: string;
} {
  const t = type.toLowerCase();
  if (t === "cash")
    return {
      backgroundColor: "rgba(87,244,176,1)",
      color: "rgba(31,101,71,1)",
    };
  if (t === "credit")
    return {
      backgroundColor: "rgba(255,250,189,1)",
      color: "rgba(134,83,47,1)",
    };
  if (t.startsWith("marketplace"))
    return {
      backgroundColor: "rgba(189,232,255,1)",
      color: "rgba(15,86,125,1)",
    };
  return { backgroundColor: "rgba(231,231,231,1)", color: "black" };
}

function VendorTypePill({ type }: { type: string }) {
  if (!type || type === "—") return <span>—</span>;
  return (
    <div
      className="approval-pill normal-text centered"
      style={{ ...getVendorTypeStyle(type), textTransform: "uppercase" }}
    >
      {type}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function VendorsReportPage() {
  const searchIcon = "/icons/search.svg";
  const settingsIcon = "/icons/gear.svg";

  const [data, setData] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<VendorFilters>(DEFAULT_FILTERS);
  const [dateRange, setDateRange] = useState<DateRange>({
    start: null,
    end: null,
    preset: null,
  });
  const [visibleOptCols, setVisibleOptCols] = useState<string[]>([]);
  const [draftOptCols, setDraftOptCols] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Build query string — date filter by LPO created_at
  const queryStr = useMemo(() => {
    const p = new URLSearchParams();
    if (dateRange.start)
      p.set("startDate", dateRange.start.toISOString().split("T")[0]);
    if (dateRange.end)
      p.set("endDate", dateRange.end.toISOString().split("T")[0]);
    return p.toString();
  }, [dateRange]);

  useEffect(() => {
    setIsLoading(true);
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/dashboard/finance/getAllVendors?${queryStr}`,
    )
      .then((res) => res.json())
      .then((d) => setData(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [queryStr]);

  // ── Derived filter options ────────────────────────────────────────────────
  const allProjects = useMemo(() => {
    const set = new Set<string>();
    data.forEach((v) => v.projects.forEach((p) => set.add(p)));
    return Array.from(set).sort();
  }, [data]);

  const spentBounds = useMemo(() => {
    if (!data.length) return { min: 0, max: 1_000_000 };
    const max = Math.max(...data.map((v) => v.amount));
    return { min: 0, max: Math.ceil(max / 10000) * 10000 };
  }, [data]);

  // ── Filtered rows ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const minAmt = filters.spentMin !== "" ? Number(filters.spentMin) : null;
    const maxAmt = filters.spentMax !== "" ? Number(filters.spentMax) : null;

    return data.filter((row) => {
      if (
        q &&
        !row.supplier_name.toLowerCase().includes(q) &&
        !row.payment_type.toLowerCase().includes(q)
      )
        return false;
      if (filters.selectedVendorTypes.length > 0) {
        if (
          !filters.selectedVendorTypes.some(
            (t) => t.toLowerCase() === row.payment_type.toLowerCase(),
          )
        )
          return false;
      }
      if (minAmt !== null && row.amount < minAmt) return false;
      if (maxAmt !== null && row.amount > maxAmt) return false;
      if (filters.selectedProjects.length > 0) {
        if (!row.projects.some((p) => filters.selectedProjects.includes(p)))
          return false;
      }
      if (
        filters.selectedMetrics.includes("on_time_delivery") &&
        !(row.on_time_delivery_pct != null && row.on_time_delivery_pct > 0)
      )
        return false;
      if (
        filters.selectedMetrics.includes("order_completion") &&
        !(row.order_completion_rate != null && row.order_completion_rate > 0)
      )
        return false;
      if (
        filters.selectedMetrics.includes("avg_delivery_time") &&
        !(row.avg_delivery_days != null && row.avg_delivery_days > 0)
      )
        return false;
      if (
        filters.selectedMetrics.includes("order_frequency") &&
        !(row.order_frequency_week != null && row.order_frequency_week > 0)
      )
        return false;
      return true;
    });
  }, [data, searchQuery, filters]);

  const sorted = useMemo(() => {
    if (!sortCol) return filtered;
    return [...filtered].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortCol];
      const bVal = (b as Record<string, unknown>)[sortCol];
      // Nulls always sort to the end regardless of direction
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      let cmp: number;
      if (sortCol === "last_purchase_date" || sortCol === "paid_at") {
        cmp =
          new Date(aVal as string).getTime() -
          new Date(bVal as string).getTime();
      } else {
        cmp = (aVal as number) - (bVal as number);
      }
      return sortDir === "asc" ? cmp : -cmp;
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

  // ── Active filter helpers ─────────────────────────────────────────────────
  const hasActiveFilters =
    filters.selectedVendorTypes.length > 0 ||
    filters.spentMin !== "" ||
    filters.spentMax !== "" ||
    filters.selectedProjects.length > 0 ||
    filters.selectedMetrics.length > 0;

  // ── Settings popup helpers ────────────────────────────────────────────────
  const openSettings = () => {
    setDraftOptCols(visibleOptCols);
    setSettingsOpen(true);
  };

  const applySettings = () => {
    setVisibleOptCols(draftOptCols);
    setSettingsOpen(false);
  };

  const toggleDraftCol = (key: string, checked: boolean) =>
    setDraftOptCols((prev) =>
      checked ? [...prev, key] : prev.filter((k) => k !== key),
    );

  const sortIcon = (col: string) => (
    <span style={{ marginLeft: 4, fontSize: 10, opacity: sortCol === col ? 1 : 0.35 }}>
      {sortCol === col ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
    </span>
  );

  const handleSort = (col: string) => {
    if (sortCol === col) {
      if (sortDir === "asc") setSortDir("desc");
      else {
        setSortCol(null);
        setSortDir("asc");
      }
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  // ── Dynamic columns ───────────────────────────────────────────────────────
  const optionalColsToShow = OPTIONAL_COLS.filter((c) =>
    visibleOptCols.includes(c.key),
  );
  const metricColsToShow = filters.selectedMetrics
    .map((m) => ({ key: m, ...METRIC_COLS[m] }))
    .filter((c) => c.header && c.sortKey);

  // ── Pagination ────────────────────────────────────────────────────────────
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

  return (
    <div>
      {/* ── Row 1: Title + search ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <h1>VENDORS</h1>
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
            src={searchIcon}
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
        {/* Left: filter button + bubbles inline */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <VendorsFilterButton
            projects={allProjects}
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
                  SPENT:{" "}
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

              {filters.selectedMetrics.map((key) => (
                <Button
                  key={key}
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
                  <span style={{ color: "rgba(16,185,129,1)" }}>
                    {METRIC_COLS[key]?.bubbleLabel.toUpperCase()}
                  </span>
                </Button>
              ))}

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

        {/* Right: date filter */}
        <DateRangeButton value={dateRange} onChange={setDateRange} />
      </div>

      {/* ── Settings popup ── */}
      {settingsOpen && (
        <FormPopUp
          header="COLUMN SETTINGS"
          setIsOpen={setSettingsOpen}
          addButtonLabel="CONFIRM"
          handleSubmit={applySettings}
          style={{ minWidth: "380px" }}
          secondButton={
            <Button
              componentType="button"
              bgColor="white"
              borderColor="black"
              textColor="black"
              type="button"
              onClick={() => setDraftOptCols([])}
            >
              RESET
            </Button>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {OPTIONAL_COLS.map(({ key, header }) => (
              <label
                key={key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={draftOptCols.includes(key)}
                  onChange={(e) => toggleDraftCol(key, e.target.checked)}
                  style={{
                    width: 18,
                    height: 18,
                    cursor: "pointer",
                    accentColor: "#10b981",
                  }}
                />
                <h4>{header}</h4>
              </label>
            ))}
          </div>
        </FormPopUp>
      )}

      {/* ── Table ── */}
      {isLoading ? (
        <p style={{ color: "rgba(150,150,150,1)", fontSize: 13 }}>Loading...</p>
      ) : !filtered.length ? (
        <p style={{ textAlign: "center", color: "#888", padding: "40px 0" }}>
          {searchQuery || hasActiveFilters || dateRange.start
            ? "No vendors match your filters."
            : "No vendors found."}
        </p>
      ) : (
        <>
          <div style={{ overflowX: "auto" }}>
            <table
              className="items-table two-toned"
              style={{ width: "100%", tableLayout: "fixed" }}
            >
              <colgroup>
                <col style={{ width: "50px" }} />
                <col />
                <col style={{ width: "250px" }} />
                <col style={{ width: "150px" }} />
                <col style={{ width: "200px" }} />
                {optionalColsToShow.map((c) => (
                  <col key={c.key} style={{ width: "150px" }} />
                ))}
                {metricColsToShow.map((c) => (
                  <col key={c.key} style={{ width: "180px" }} />
                ))}
                <col style={{ width: "100px" }} />
              </colgroup>
              <thead>
                <tr>
                  <th>#</th>
                  <th>VENDOR</th>
                  <th>VENDOR TYPE</th>
                  <th
                    style={{ cursor: "pointer", userSelect: "none" }}
                    onClick={() => handleSort("total_lpos")}
                  >
                    TOTAL LPOS{sortIcon("total_lpos")}
                  </th>
                  <th
                    style={{ cursor: "pointer", userSelect: "none" }}
                    onClick={() => handleSort("amount")}
                  >
                    TOTAL SPENT{sortIcon("amount")}
                  </th>
                  {optionalColsToShow.map((c) => (
                    <th
                      key={c.key}
                      style={{
                        whiteSpace: "nowrap",
                        cursor: "pointer",
                        userSelect: "none",
                      }}
                      onClick={() => handleSort(c.key)}
                    >
                      {c.header}{sortIcon(c.key)}
                    </th>
                  ))}
                  {metricColsToShow.map((c) => (
                    <th
                      key={c.key}
                      style={{
                        whiteSpace: "nowrap",
                        cursor: "pointer",
                        userSelect: "none",
                      }}
                      onClick={() => handleSort(c.sortKey)}
                    >
                      {c.header}{sortIcon(c.sortKey)}
                    </th>
                  ))}
                  {/* Settings column */}
                  <th style={{ textAlign: "center" }}>
                    <Button
                      onClick={openSettings}
                      componentType={"button"}
                      bgColor={"white"}
                      borderColor={"rgba(211, 211, 211, 1)"}
                      textColor={"black"}
                      style={{ padding: "7px 7px" }}
                    >
                      <img src={settingsIcon} alt="settings" />
                    </Button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((row, i) => (
                  <tr key={row.supplier_id}>
                    <td style={{ color: "rgba(120,120,120,1)" }}>
                      {(currentPage - 1) * ITEMS_PER_PAGE + i + 1}
                    </td>
                    <td style={{ fontWeight: 600 }}>{row.supplier_name}</td>
                    <td>
                      <VendorTypePill type={row.payment_type} />
                    </td>
                    <td>{row.total_lpos}</td>
                    <td>AED {formatAED(row.amount)}</td>
                    {optionalColsToShow.map((c) => (
                      <td key={c.key} style={{ whiteSpace: "nowrap" }}>
                        {c.render(row)}
                      </td>
                    ))}
                    {metricColsToShow.map((c) => (
                      <td key={c.key} style={{ whiteSpace: "nowrap" }}>
                        {c.render(row)}
                      </td>
                    ))}
                    <td />
                  </tr>
                ))}
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
                gap: "10px",
                marginTop: "20px",
              }}
            >
              {getPageNumbers().map((page, index) => (
                <button
                  key={index}
                  onClick={() =>
                    typeof page === "number" && setCurrentPage(page)
                  }
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
                    fontWeight: "600",
                    minWidth: "40px",
                  }}
                >
                  {page}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
