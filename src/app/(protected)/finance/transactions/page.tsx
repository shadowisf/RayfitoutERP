"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Button from "@/app/components/Button";
import TransactionsFilterButton, {
  TransactionFilters,
  CategoryGroup,
} from "./components/_TransactionsFilterButton";
import DateRangeButton, { DateRange } from "./components/_DateRangeButton";

// ── Types ─────────────────────────────────────────────────────────────────────
type Transaction = {
  id: number;
  mr_header_id: number;
  display_id: string;
  vendor_name: string;
  vendor_type: string;
  requester: string;
  project_name: string;
  total: number;
  paid_at: string | null;
  created_at: string;
  material_categories: string[];
};

const ITEMS_PER_PAGE = 30;

const DEFAULT_FILTERS: TransactionFilters = {
  selectedPaymentTypes: [],
  amountMin: "",
  amountMax: "",
  selectedRequesters: [],
  selectedProjects: [],
  selectedCategories: [],
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatAED(val: number): string {
  return val.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(raw: string | null): string {
  if (!raw) return "Pending";
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
  if (!type) return <span>-</span>;
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
export default function AllTransactionsPage() {
  const searchIcon = "/icons/search.svg";
  const externalLinkIcon = "/icons/external-link.svg";

  const [data, setData] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<TransactionFilters>(DEFAULT_FILTERS);
  const [dateRange, setDateRange] = useState<DateRange>({
    start: null,
    end: null,
    preset: null,
  });
  const [categoryHierarchy, setCategoryHierarchy] = useState<
    { level_2: string; value: string }[]
  >([]);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/dashboard/finance/getAllTransactions`,
    )
      .then((res) => res.json())
      .then((d) => setData(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setIsLoading(false));

    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMaterialCategoryValues`,
    )
      .then((res) => res.json())
      .then((d) => setCategoryHierarchy(Array.isArray(d) ? d : []))
      .catch(console.error);
  }, []);

  // ── Derived filter options from fetched data ──────────────────────────────
  const filterOptions = useMemo(() => {
    const requesters = Array.from(
      new Set(data.map((r) => r.requester).filter((r) => r && r !== "—")),
    ).sort();
    const projects = Array.from(
      new Set(data.map((r) => r.project_name).filter((p) => p && p !== "—")),
    ).sort();

    // Build grouped categories: only include values that appear in the data
    const presentCategories = new Set(
      data.flatMap((r) => r.material_categories),
    );
    const groupMap = new Map<string, string[]>();
    categoryHierarchy.forEach(({ level_2, value }) => {
      if (presentCategories.has(value)) {
        if (!groupMap.has(level_2)) groupMap.set(level_2, []);
        groupMap.get(level_2)!.push(value);
      }
    });
    const categoryGroups: CategoryGroup[] = Array.from(groupMap.entries())
      .map(([name, items]) => ({ name, items: items.sort() }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return { requesters, projects, categoryGroups };
  }, [data, categoryHierarchy]);

  // ── Amount bounds (for slider) ────────────────────────────────────────────
  const amountBounds = useMemo(() => {
    if (!data.length) return { min: 0, max: 1_000_000 };
    const max = Math.max(...data.map((r) => r.total));
    return { min: 0, max: Math.ceil(max / 10000) * 10000 };
  }, [data]);

  // ── Filtered rows ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const minAmt = filters.amountMin !== "" ? Number(filters.amountMin) : null;
    const maxAmt = filters.amountMax !== "" ? Number(filters.amountMax) : null;

    return data.filter((row) => {
      // Date range (based on payment date)
      if (dateRange.start || dateRange.end) {
        if (!row.paid_at) return false;
        const rowDate = new Date(row.paid_at);
        const rangeStart = dateRange.start;
        // If no end is set, treat as single-day: cap at 23:59:59 of the start day
        const rangeEnd = dateRange.end
          ? dateRange.end
          : rangeStart
            ? new Date(new Date(rangeStart).setHours(23, 59, 59, 999))
            : null;
        if (rangeStart && rowDate < rangeStart) return false;
        if (rangeEnd && rowDate > rangeEnd) return false;
      }
      // Text search
      if (
        q &&
        !row.display_id.toLowerCase().includes(q) &&
        !row.vendor_name.toLowerCase().includes(q) &&
        !row.requester.toLowerCase().includes(q) &&
        !row.project_name.toLowerCase().includes(q) &&
        !row.vendor_type.toLowerCase().includes(q)
      )
        return false;

      // Payment type
      if (filters.selectedPaymentTypes.length > 0) {
        const rowType = row.vendor_type.toLowerCase();
        const match = filters.selectedPaymentTypes.some(
          (t) => t.toLowerCase() === rowType,
        );
        if (!match) return false;
      }

      // Amount range
      if (minAmt !== null && row.total < minAmt) return false;
      if (maxAmt !== null && row.total > maxAmt) return false;

      // Requesters
      if (
        filters.selectedRequesters.length > 0 &&
        !filters.selectedRequesters.includes(row.requester)
      )
        return false;

      // Projects
      if (
        filters.selectedProjects.length > 0 &&
        !filters.selectedProjects.includes(row.project_name)
      )
        return false;

      // Material categories
      if (filters.selectedCategories.length > 0) {
        const hasMatch = row.material_categories.some((c) =>
          filters.selectedCategories.includes(c),
        );
        if (!hasMatch) return false;
      }

      return true;
    });
  }, [data, searchQuery, filters, dateRange]);

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
      if (sortCol === "paid_at") {
        cmp =
          new Date(aVal as string).getTime() -
          new Date(bVal as string).getTime();
      } else {
        cmp = (aVal as number) - (bVal as number);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortCol, sortDir]);

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

  const totalPages = Math.max(1, Math.ceil(sorted.length / ITEMS_PER_PAGE));

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sorted.slice(start, start + ITEMS_PER_PAGE);
  }, [sorted, currentPage]);

  // Reset page on search/filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filters, dateRange]);

  // ── Active filter helpers ─────────────────────────────────────────────────
  const hasActiveFilters =
    filters.selectedPaymentTypes.length > 0 ||
    filters.amountMin !== "" ||
    filters.amountMax !== "" ||
    filters.selectedRequesters.length > 0 ||
    filters.selectedProjects.length > 0 ||
    filters.selectedCategories.length > 0;

  // ── Pagination ────────────────────────────────────────────────────────────
  const getPageNumbers = () => {
    const pages: (number | "...")[] = [];
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

  return (
    <div>
      {/* ── Row 1: Title + search (space-between) ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <h1>ALL TRANSACTIONS</h1>

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

      {/* ── Row 2: Filter button + bubbles (left) + Date range button (right) ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
          gap: 12,
        }}
      >
        {/* Left: filter button + active filter bubbles inline */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            flex: 1,
          }}
        >
          <TransactionsFilterButton
            requesters={filterOptions.requesters}
            projects={filterOptions.projects}
            categoryGroups={filterOptions.categoryGroups}
            currentFilters={filters}
            onApplyFilters={setFilters}
            amountBounds={amountBounds}
          />

          {filters.selectedPaymentTypes.length > 0 && (
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
              PAYMENT TYPE:{" "}
              <span style={{ color: "rgba(16,185,129,1)" }}>
                {filters.selectedPaymentTypes[0].toUpperCase()}
                {filters.selectedPaymentTypes.length > 1 &&
                  `, +${filters.selectedPaymentTypes.length - 1} MORE`}
              </span>
            </Button>
          )}

          {(filters.amountMin !== "" || filters.amountMax !== "") && (
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
              AMOUNT:{" "}
              <span style={{ color: "rgba(16,185,129,1)" }}>
                {filters.amountMin !== ""
                  ? `AED ${Number(filters.amountMin).toLocaleString()}`
                  : "0"}
                {" — "}
                {filters.amountMax !== ""
                  ? `AED ${Number(filters.amountMax).toLocaleString()}`
                  : "∞"}
              </span>
            </Button>
          )}

          {filters.selectedRequesters.length > 0 && (
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
              REQUESTER:{" "}
              <span style={{ color: "rgba(16,185,129,1)" }}>
                {filters.selectedRequesters[0].toUpperCase()}
                {filters.selectedRequesters.length > 1 &&
                  `, +${filters.selectedRequesters.length - 1} MORE`}
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

          {hasActiveFilters && (
            <Button
              componentType="button"
              bgColor="transparent"
              borderColor="transparent"
              textColor="black"
              onClick={() => {
                setFilters(DEFAULT_FILTERS);
                setDateRange({ start: null, end: null, preset: null });
              }}
              style={{ padding: "0px" }}
            >
              RESET FILTER
            </Button>
          )}
        </div>

        <DateRangeButton value={dateRange} onChange={setDateRange} />
      </div>

      {/* ── Table ── */}
      {isLoading ? (
        <p style={{ color: "rgba(150,150,150,1)", fontSize: 13 }}>Loading...</p>
      ) : !filtered.length ? (
        <p style={{ textAlign: "center", color: "#888", padding: "40px 0" }}>
          {searchQuery || hasActiveFilters
            ? "No transactions match your filters."
            : "No transactions found."}
        </p>
      ) : (
        <>
          <table
            className="items-table two-toned"
            style={{ width: "100%", tableLayout: "fixed" }}
          >
            <colgroup>
              <col style={{ width: "160px" }} />
              <col />
              <col style={{ width: "200px" }} />
              <col style={{ width: "300px" }} />
              <col style={{ width: "200px" }} />
              <col style={{ width: "200px" }} />
              <col style={{ width: "200px" }} />
            </colgroup>
            <thead>
              <tr>
                <th>LPO NUMBER</th>
                <th>VENDOR</th>
                <th>REQUESTER</th>
                <th>PROJECT</th>
                <th>VENDOR TYPE</th>
                <th
                  style={{ cursor: "pointer", userSelect: "none" }}
                  onClick={() => handleSort("total")}
                >
                  TOTAL AMOUNT{sortIcon("total")}
                </th>
                <th
                  style={{ cursor: "pointer", userSelect: "none" }}
                  onClick={() => handleSort("paid_at")}
                >
                  PAYMENT DATE{sortIcon("paid_at")}
                </th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((row) => (
                <tr key={row.id}>
                  <td>
                    <div
                      style={{
                        display: "flex",
                        gap: "10px",
                        alignItems: "center",
                      }}
                    >
                      {row.display_id}
                      <Button
                        componentType={"link"}
                        bgColor={"rgba(239, 239, 239, 1)"}
                        borderColor={"rgba(223, 223, 223, 1)"}
                        textColor={"black"}
                        style={{ padding: "7px 7px" }}
                        href={`/mr/${row.mr_header_id}/lpo/${row.id}`}
                        target="_blank"
                      >
                        <img src={externalLinkIcon} alt="external link" />
                      </Button>
                    </div>
                  </td>
                  <td>{row.vendor_name}</td>
                  <td>{row.requester}</td>
                  <td>{row.project_name}</td>
                  <td>
                    <VendorTypePill type={row.vendor_type} />
                  </td>
                  <td>AED {formatAED(row.total)}</td>
                  <td>{formatDate(row.paid_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ── Pagination (identical to inventory/page.tsx) ── */}
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
