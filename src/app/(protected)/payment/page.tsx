"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Button from "@/app/components/Button";
import PaymentFilterButton, {
  defaultPaymentFilters,
  PaymentFilters,
} from "./components/_PaymentFilterButton";
import DateRangeButton, {
  type DateRange,
} from "@/app/(protected)/finance/transactions/components/_DateRangeButton";
import BulkRecordPaymentButton from "./components/_BulkRecordPaymentButton";
import BulkRejectPaymentButton from "./components/_BulkRejectPaymentButton";
import { useAuth } from "@/app/context/AuthContext";

type LpoRow = {
  id: number;
  mr_header_id: number;
  supplier_id: number;
  progress_id: number;
  total: number;
  payment_status: string | null;
  payment_terms: string | null;
  supplier_payment_terms: string | null;
  created_at: string;
  supplier_name: string;
  supplier_type: string | null;
  requested_by: string;
  department_id: number;
  department_name: string;
  mr_project_id: number | null;
  project_name: string;
  required_date: string;
  progress_name: string | null;
  total_paid: number;
  outstanding: number;
  is_paid: 0 | 1;
};

// ── Supplier type pill ──────────────────────────────────────────────────────
function getSupplierTypeStyle(type: string | null) {
  const t = (type ?? "").toLowerCase();
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

function SupplierTypePill({ type }: { type: string | null }) {
  if (!type) return <span style={{ color: "#aaa" }}>-</span>;
  return (
    <div
      className="approval-pill normal-text centered"
      style={{ ...getSupplierTypeStyle(type), textTransform: "uppercase" }}
    >
      {type}
    </div>
  );
}

// ── Status pill ────────────────────────────────────────────────────────────
function StatusPill({ isPaid }: { isPaid: boolean }) {
  return (
    <div
      className="approval-pill normal-text centered"
      style={
        isPaid
          ? {
              backgroundColor: "rgba(187,247,208,1)",
              color: "rgba(3,130,46,1)",
            }
          : {
              backgroundColor: "rgba(255,181,181,1)",
              color: "rgba(248,77,77,1)",
            }
      }
    >
      {isPaid ? "PAID" : "UNPAID"}
    </div>
  );
}

// ── Due date helpers ─────────────────────────────────────────────────────────
function parseDays(terms: string | null): number | null {
  if (!terms) return null;
  const m = terms.match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
}

function getDueDate(lpo: LpoRow): string {
  const t = (lpo.supplier_type ?? "").toLowerCase();
  if (t !== "credit") return "N/A";

  const days =
    parseDays(lpo.payment_terms) ?? parseDays(lpo.supplier_payment_terms);
  if (!days || !lpo.created_at) return "N/A";

  const due = new Date(lpo.created_at);
  due.setDate(due.getDate() + days);
  return due.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isDueOverdue(lpo: LpoRow): boolean {
  const t = (lpo.supplier_type ?? "").toLowerCase();
  if (t !== "credit") return false;
  const days =
    parseDays(lpo.payment_terms) ?? parseDays(lpo.supplier_payment_terms);
  if (!days || !lpo.created_at) return false;
  const due = new Date(lpo.created_at);
  due.setDate(due.getDate() + days);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

// Returns epoch ms for the due date (used for sort comparison).
// Non-credit LPOs or missing terms → Infinity (sort to end).
function getDueDateTimestamp(lpo: LpoRow): number {
  const t = (lpo.supplier_type ?? "").toLowerCase();
  if (t !== "credit") return Infinity;
  const days = parseDays(lpo.payment_terms) ?? parseDays(lpo.supplier_payment_terms);
  if (!days || !lpo.created_at) return Infinity;
  const due = new Date(lpo.created_at);
  due.setDate(due.getDate() + days);
  return due.getTime();
}

// ── Format currency ─────────────────────────────────────────────────────────
function formatAED(val: number) {
  return val.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ── Normalise supplier_type for filter matching ──────────────────────────────
function normaliseType(type: string | null): string {
  const t = (type ?? "").toLowerCase();
  if (t === "cash") return "Cash";
  if (t === "credit") return "Credit";
  if (t.startsWith("marketplace")) return "Marketplace/Online";
  return type ?? "";
}

// ── Pagination ───────────────────────────────────────────────────────────────
const ITEMS_PER_PAGE = 50;

function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const getPageNumbers = (): (number | string)[] => {
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
    padding: "8px 12px",
    borderRadius: "5px",
    border: "1px solid rgba(223, 223, 223, 1)",
    backgroundColor: "white",
    color: "black",
    fontWeight: 600,
    minWidth: "40px",
    cursor: "pointer",
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: "10px",
        marginTop: "20px",
      }}
    >
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        style={{
          ...btnBase,
          cursor: currentPage === 1 ? "not-allowed" : "pointer",
          opacity: currentPage === 1 ? 0.4 : 1,
        }}
      >
        ‹
      </button>

      {getPageNumbers().map((page, index) => (
        <button
          key={index}
          onClick={() => typeof page === "number" && onPageChange(page)}
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
            border:
              page === "..." ? "none" : "1px solid rgba(223, 223, 223, 1)",
          }}
        >
          {page}
        </button>
      ))}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        style={{
          ...btnBase,
          cursor: currentPage === totalPages ? "not-allowed" : "pointer",
          opacity: currentPage === totalPages ? 0.4 : 1,
        }}
      >
        ›
      </button>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────
export default function Payments() {
  const searchIcon = "/icons/search.svg";
  const externalLinkIcon = "/icons/external-link.svg";

  const { userInfo } = useAuth();

  const [lpoRows, setLpoRows] = useState<LpoRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<PaymentFilters>(defaultPaymentFilters);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [groupByVendor, setGroupByVendor] = useState(true);
  const [collapsedVendors, setCollapsedVendors] = useState<
    Record<string, boolean>
  >({});

  // ── Date range filter (due date) ─────────────────────────────────────────
  const [dateRange, setDateRange] = useState<DateRange>({
    start: null,
    end: null,
    preset: null,
  });

  // ── Row selection (group-by-vendor mode) ─────────────────────────────────
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());

  // ── Actions dropdown ─────────────────────────────────────────────────────
  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);

  // ── Bulk payment modal (triggered from Actions dropdown) ─────────────────
  const [bulkPayOpen, setBulkPayOpen] = useState(false);

  // ── Bulk reject modal ────────────────────────────────────────────────────
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);

  // Close actions dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        actionsRef.current &&
        !actionsRef.current.contains(e.target as Node)
      ) {
        setActionsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    setIsLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/payment/getPaymentList`)
      .then((r) => r.json())
      .then((data: LpoRow[]) => {
        if (Array.isArray(data)) setLpoRows(data);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  // ── Unique vendor list derived from data ────────────────────────────────
  const vendorList = useMemo(
    () =>
      Array.from(
        new Set(lpoRows.map((r) => r.supplier_name).filter(Boolean)),
      ).sort((a, b) => a.localeCompare(b)),
    [lpoRows],
  );

  // ── Unique project list derived from data ───────────────────────────────
  const projectList = useMemo(
    () =>
      Array.from(
        new Set(lpoRows.map((r) => r.project_name).filter(Boolean)),
      ).sort((a, b) => a.localeCompare(b)),
    [lpoRows],
  );

  // ── Search ──────────────────────────────────────────────────────────────
  const searched = useMemo(() => {
    const q = searchQuery.toLowerCase();
    if (!q) return lpoRows;
    return lpoRows.filter(
      (row) =>
        `lpo-${String(row.id).padStart(5, "0")}`.includes(q) ||
        (row.supplier_name ?? "").toLowerCase().includes(q) ||
        (row.project_name ?? "").toLowerCase().includes(q) ||
        (row.supplier_type ?? "").toLowerCase().includes(q) ||
        (row.department_name ?? "").toLowerCase().includes(q) ||
        (row.requested_by ?? "").toLowerCase().includes(q),
    );
  }, [lpoRows, searchQuery]);

  // ── Filter ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return searched.filter((row) => {
      if (
        filters.selectedVendors.length > 0 &&
        !filters.selectedVendors.includes(row.supplier_name)
      )
        return false;

      if (filters.selectedPaymentTypes.length > 0) {
        if (
          !filters.selectedPaymentTypes.includes(
            normaliseType(row.supplier_type),
          )
        )
          return false;
      }

      if (filters.selectedStatuses.length > 0) {
        const statusLabel = row.is_paid === 1 ? "Paid" : "Unpaid";
        if (!filters.selectedStatuses.includes(statusLabel)) return false;
      }

      if (
        filters.selectedProjects.length > 0 &&
        !filters.selectedProjects.includes(row.project_name)
      )
        return false;

      // ── Due date range filter ──────────────────────────────────────────
      if (dateRange.start || dateRange.end) {
        const t = (row.supplier_type ?? "").toLowerCase();
        if (t !== "credit") return false; // non-credit rows have no due date
        const days =
          parseDays(row.payment_terms) ?? parseDays(row.supplier_payment_terms);
        if (!days || !row.created_at) return false;
        const due = new Date(row.created_at);
        due.setDate(due.getDate() + days);
        due.setHours(0, 0, 0, 0);
        if (dateRange.start && due < dateRange.start) return false;
        if (dateRange.end) {
          const endDay = new Date(dateRange.end);
          endDay.setHours(23, 59, 59, 999);
          if (due > endDay) return false;
        }
      }

      return true;
    });
  }, [searched, filters, dateRange]);

  // Always keep unpaid first, paid last; then apply column sort within each group
  const sorted = useMemo(() => {
    const base = [...filtered].sort((a, b) => a.is_paid - b.is_paid);
    if (!sortCol) return base;
    return base.sort((a, b) => {
      // Keep paid/unpaid grouping intact — only sort within same is_paid group
      if (a.is_paid !== b.is_paid) return a.is_paid - b.is_paid;
      // For outstanding, paid rows are always 0 regardless of raw field value
      const getRaw = (row: LpoRow) => {
        if (sortCol === "outstanding") return row.is_paid === 1 ? 0 : Number(row.outstanding ?? 0);
        if (sortCol === "due_date") return getDueDateTimestamp(row);
        const v = (row as Record<string, unknown>)[sortCol];
        return v == null ? null : Number(v);
      };
      const aVal = getRaw(a);
      const bVal = getRaw(b);
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortCol, sortDir]);

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

  // ── Per-group sort state (grouped-by-vendor view) ────────────────────────
  const [groupSortState, setGroupSortState] = useState<
    Record<number, { col: string; dir: "asc" | "desc" }>
  >({});

  const handleGroupSort = (supplierId: number, col: string) => {
    setGroupSortState((prev) => {
      const cur = prev[supplierId];
      if (!cur || cur.col !== col) {
        return { ...prev, [supplierId]: { col, dir: "desc" } };
      } else if (cur.dir === "desc") {
        return { ...prev, [supplierId]: { col, dir: "asc" } };
      } else {
        const next = { ...prev };
        delete next[supplierId];
        return next;
      }
    });
  };

  const groupSortIcon = (supplierId: number, col: string) => {
    const cur = groupSortState[supplierId];
    const active = cur?.col === col;
    return (
      <span style={{ marginLeft: 4, fontSize: 10, opacity: active ? 1 : 0.35 }}>
        {active ? (cur.dir === "asc" ? "↑" : "↓") : "↕"}
      </span>
    );
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

  // ── Group by vendor ──────────────────────────────────────────────────────
  const vendorGroups = useMemo(() => {
    const map = new Map<
      number,
      { supplierId: number; supplierName: string; rows: LpoRow[] }
    >();
    for (const row of sorted) {
      if (!map.has(row.supplier_id)) {
        map.set(row.supplier_id, {
          supplierId: row.supplier_id,
          supplierName: row.supplier_name,
          rows: [],
        });
      }
      map.get(row.supplier_id)!.rows.push(row);
    }
    return Array.from(map.values());
  }, [sorted]);

  const toggleVendorCollapse = (supplierId: number) => {
    setCollapsedVendors((prev) => ({
      ...prev,
      [supplierId]: !prev[supplierId],
    }));
  };

  // ── Pagination ──────────────────────────────────────────────────────────
  const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginated = sorted.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Reset to page 1 on search / filter / sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filters, sortCol, sortDir]);

  // ── Active filter helpers ───────────────────────────────────────────────
  const hasActiveDateRange = !!(dateRange.start || dateRange.end);
  const hasActiveFilters =
    filters.selectedVendors.length > 0 ||
    filters.selectedPaymentTypes.length > 0 ||
    filters.selectedStatuses.length > 0 ||
    filters.selectedProjects.length > 0 ||
    hasActiveDateRange;

  const resetAllFilters = () => {
    setFilters({ selectedVendors: [], selectedPaymentTypes: [], selectedStatuses: [], selectedProjects: [] });
    setDateRange({ start: null, end: null, preset: null });
  };

  // ── Selection helpers ───────────────────────────────────────────────────
  const toggleRow = (id: number) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedRows = useMemo(
    () => sorted.filter((r) => selectedRowIds.has(r.id) && r.is_paid !== 1),
    [sorted, selectedRowIds],
  );

  const recordedBy = userInfo?.name || userInfo?.email || "Finance";

  const refetchLpos = (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/payment/getPaymentList`)
      .then((r) => r.json())
      .then((data: LpoRow[]) => {
        if (Array.isArray(data)) setLpoRows(data);
      })
      .catch(console.error)
      .finally(() => {
        if (showLoader) setIsLoading(false);
      });
  };

  const handlePaymentSuccess = () => {
    setSelectedRowIds(new Set());
    refetchLpos(false); // silent — no loading spinner, no scroll jump
  };

  /*
   * ─────────────────────────────────────────────────────────────────────────
   * KANBAN VIEW — commented out, replaced with table below
   * ─────────────────────────────────────────────────────────────────────────
   *
   * const mrGroupsMap = new Map<number, MrGroup>();
   * ...
   * return (
   *   <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:"20px" }}>
   *     ...kanban cards...
   *   </div>
   * );
   * ─────────────────────────────────────────────────────────────────────────
   */

  return (
    <div className="dashboard">
      {/* ── Sticky toolbar ───────────────────────────────────────────────────── */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 1,
          backgroundColor: "rgba(248, 249, 251, 1)",
          marginTop: "-100px",
          paddingTop: "100px",
          paddingBottom: "40px",
          marginLeft: "-40px",
          marginRight: "-40px",
          paddingLeft: "40px",
          paddingRight: "40px",
        }}
      >
        {/* ── Page heading + search ─────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "20px",
            marginBottom: "20px",
          }}
        >
          <h1>PAYMENTS</h1>

          <div style={{ position: "relative" }}>
            <input
              type="text"
              placeholder="SEARCH"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "350px",
                padding: "10px 40px 10px 15px",
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

        {/* ── Filter bar ───────────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
          }}
        >
          {/* LEFT — toggle + filter + active pills */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            {/* GROUP BY VENDOR toggle */}
            <Button
              componentType="button"
              bgColor="white"
              borderColor="rgba(241, 244, 246, 1)"
              textColor="black"
              onClick={() => setGroupByVendor((v) => !v)}
              style={{ padding: "7px 20px", borderRadius: "50px" }}
            >
              GROUP BY VENDOR{" "}
              <div
                style={{
                  position: "relative",
                  width: "30px",
                  height: "17px",
                  backgroundColor: groupByVendor
                    ? "rgb(34, 197, 94)"
                    : "rgba(200, 200, 200, 1)",
                  borderRadius: "34px",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: "0px",
                    left: groupByVendor ? "15px" : "0px",
                    width: "17px",
                    border: "1px solid rgba(217, 217, 217, 1)",
                    height: "17px",
                    backgroundColor: "white",
                    borderRadius: "50%",
                    transition: "left 0.15s ease",
                  }}
                />
              </div>
            </Button>

            {/* Divider */}
            <div
              style={{
                borderRight: "1px solid rgba(207, 207, 207, 1)",
                height: "30px",
                alignSelf: "center",
              }}
            />

            <PaymentFilterButton
              vendors={vendorList}
              projects={projectList}
              onApplyFilters={setFilters}
              currentFilters={filters}
            />

            {hasActiveFilters && (
              <>
                {hasActiveDateRange && (
                  <Button
                    style={{
                      borderRadius: "50px",
                      fontWeight: 600,
                      textWrap: "nowrap",
                    }}
                    componentType="none"
                    bgColor="rgba(239, 239, 239, 1)"
                    borderColor="transparent"
                    textColor="black"
                  >
                    DUE DATE:{" "}
                    <span style={{ color: "rgba(16, 185, 129, 1)" }}>
                      {dateRange.preset
                        ? dateRange.preset.toUpperCase()
                        : [
                            dateRange.start?.toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                            }),
                            dateRange.end?.toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                            }),
                          ]
                            .filter(Boolean)
                            .join(" – ")
                            .toUpperCase()}
                    </span>
                  </Button>
                )}
                {filters.selectedVendors.length > 0 && (
                  <Button
                    style={{
                      borderRadius: "50px",
                      fontWeight: 600,
                      textWrap: "nowrap",
                    }}
                    componentType="none"
                    bgColor="rgba(239, 239, 239, 1)"
                    borderColor="transparent"
                    textColor="black"
                  >
                    VENDOR:{" "}
                    <span style={{ color: "rgba(16, 185, 129, 1)" }}>
                      {filters.selectedVendors[0].toUpperCase()}
                      {filters.selectedVendors.length > 1 &&
                        `, +${filters.selectedVendors.length - 1} MORE`}
                    </span>
                  </Button>
                )}

                {filters.selectedPaymentTypes.length > 0 && (
                  <Button
                    style={{
                      borderRadius: "50px",
                      fontWeight: 600,
                      textWrap: "nowrap",
                    }}
                    componentType="none"
                    bgColor="rgba(239, 239, 239, 1)"
                    borderColor="transparent"
                    textColor="black"
                  >
                    TYPE:{" "}
                    <span style={{ color: "rgba(16, 185, 129, 1)" }}>
                      {filters.selectedPaymentTypes[0].toUpperCase()}
                      {filters.selectedPaymentTypes.length > 1 &&
                        `, +${filters.selectedPaymentTypes.length - 1} MORE`}
                    </span>
                  </Button>
                )}

                {filters.selectedStatuses.length > 0 && (
                  <Button
                    style={{
                      borderRadius: "50px",
                      fontWeight: 600,
                      textWrap: "nowrap",
                    }}
                    componentType="none"
                    bgColor="rgba(239, 239, 239, 1)"
                    borderColor="transparent"
                    textColor="black"
                  >
                    STATUS:{" "}
                    <span style={{ color: "rgba(16, 185, 129, 1)" }}>
                      {filters.selectedStatuses[0].toUpperCase()}
                      {filters.selectedStatuses.length > 1 &&
                        `, +${filters.selectedStatuses.length - 1} MORE`}
                    </span>
                  </Button>
                )}

                {filters.selectedProjects.length > 0 && (
                  <Button
                    style={{
                      borderRadius: "50px",
                      fontWeight: 600,
                      textWrap: "nowrap",
                    }}
                    componentType="none"
                    bgColor="rgba(239, 239, 239, 1)"
                    borderColor="transparent"
                    textColor="black"
                  >
                    PROJECT:{" "}
                    <span style={{ color: "rgba(16, 185, 129, 1)" }}>
                      {filters.selectedProjects[0].toUpperCase()}
                      {filters.selectedProjects.length > 1 &&
                        `, +${filters.selectedProjects.length - 1} MORE`}
                    </span>
                  </Button>
                )}

                <Button
                  onClick={resetAllFilters}
                  componentType="button"
                  bgColor="transparent"
                  borderColor="transparent"
                  textColor="black"
                  style={{ padding: "0px" }}
                >
                  RESET FILTER
                </Button>
              </>
            )}
          </div>
          {/* end LEFT */}

          {/* RIGHT — date range + actions */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              flexShrink: 0,
            }}
          >
            <DateRangeButton value={dateRange} onChange={setDateRange} />

            {/* Reset selection button */}
            {groupByVendor && (
              <Button
                componentType="button"
                bgColor={selectedRows.length === 0 ? "white" : "black"}
                borderColor={
                  selectedRows.length === 0 ? "rgba(211,211,211,1)" : "black"
                }
                textColor={selectedRows.length === 0 ? "black" : "white"}
                disabled={selectedRows.length === 0}
                onClick={() => setSelectedRowIds(new Set())}
              >
                RESET
              </Button>
            )}

            {/* Actions dropdown */}
            {groupByVendor && (
              <div ref={actionsRef} style={{ position: "relative" }}>
                <Button
                  componentType="button"
                  bgColor={selectedRows.length === 0 ? "white" : "black"}
                  borderColor={
                    selectedRows.length === 0 ? "rgba(211,211,211,1)" : "black"
                  }
                  textColor={selectedRows.length === 0 ? "black" : "white"}
                  onClick={() =>
                    selectedRows.length > 0 && setActionsOpen((v) => !v)
                  }
                  disabled={selectedRows.length === 0}
                >
                  ACTIONS
                </Button>

                {actionsOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 4px)",
                      right: 0,
                      backgroundColor: "white",
                      border: "1px solid rgba(207,207,207,1)",
                      borderRadius: "8px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                      zIndex: 200,
                      minWidth: "220px",
                      overflow: "hidden",
                    }}
                  >
                    <button
                      type="button"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        width: "100%",
                        padding: "10px 16px",
                        textAlign: "left",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "black",
                        fontWeight: "600",
                        fontSize: "13px",
                        borderBottom: "1px solid rgba(239,239,239,1)",
                      }}
                      onMouseEnter={(e) =>
                        ((
                          e.currentTarget as HTMLElement
                        ).style.backgroundColor = "rgba(245,245,245,1)")
                      }
                      onMouseLeave={(e) =>
                        ((
                          e.currentTarget as HTMLElement
                        ).style.backgroundColor = "transparent")
                      }
                      onClick={() => {
                        setActionsOpen(false);
                        setBulkPayOpen(true);
                      }}
                    >
                      Record Payment ({selectedRows.length})
                    </button>

                    <button
                      type="button"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        width: "100%",
                        padding: "10px 16px",
                        textAlign: "left",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "black",
                        fontWeight: "600",
                        fontSize: "13px",
                      }}
                      onMouseEnter={(e) =>
                        ((
                          e.currentTarget as HTMLElement
                        ).style.backgroundColor = "rgba(245,245,245,1)")
                      }
                      onMouseLeave={(e) =>
                        ((
                          e.currentTarget as HTMLElement
                        ).style.backgroundColor = "transparent")
                      }
                      onClick={() => {
                        setActionsOpen(false);
                        setBulkRejectOpen(true);
                      }}
                    >
                      Reject ({selectedRows.length})
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          {/* end RIGHT */}
        </div>
      </div>
      {/* ── End sticky toolbar ───────────────────────────────────────────────── */}

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div style={{ textAlign: "center", padding: "60px", color: "#888" }}>
          Loading...
        </div>
      ) : sorted.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px", color: "#888" }}>
          {searchQuery || hasActiveFilters
            ? "No results found"
            : "No payment records found"}
        </div>
      ) : groupByVendor ? (
        /* ── Grouped by vendor ── */
        <div style={{ display: "flex", flexDirection: "column", gap: "30px" }}>
          {vendorGroups.map((group) => {
            const isCollapsed = collapsedVendors[group.supplierId] ?? false;
            return (
              <div key={group.supplierId}>
                {/* Group header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "15px",
                    marginBottom: isCollapsed ? "0px" : "20px",
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                  onClick={() => toggleVendorCollapse(group.supplierId)}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{
                      transition: "transform 0.2s ease",
                      transform: isCollapsed
                        ? "rotate(-90deg)"
                        : "rotate(0deg)",
                      flexShrink: 0,
                    }}
                  >
                    <path
                      d="M3.5 5.25L7 8.75L10.5 5.25"
                      stroke="black"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>

                  <h2>{group.supplierName}</h2>
                  <Button
                    componentType="link"
                    bgColor="rgba(239, 239, 239, 1)"
                    borderColor="rgba(223, 223, 223, 1)"
                    textColor="black"
                    href={`/vendor/${group.supplierId}`}
                    style={{ padding: "7px 7px" }}
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                  >
                    <img src={externalLinkIcon} alt="open" />
                  </Button>
                  <div
                    style={{
                      backgroundColor: "black",
                      color: "white",
                      borderRadius: "50px",
                      padding: "3px 12px",
                      fontWeight: "600",
                      fontSize: "14px",
                    }}
                  >
                    {group.rows.length} LPO{group.rows.length !== 1 ? "s" : ""}
                  </div>
                </div>

                {/* Group table */}
                {!isCollapsed &&
                  (() => {
                    const unpaidRows = group.rows.filter(
                      (r) => r.is_paid !== 1,
                    );
                    const groupAllSelected =
                      unpaidRows.length > 0 &&
                      unpaidRows.every((r) => selectedRowIds.has(r.id));
                    const groupSomeSelected =
                      !groupAllSelected &&
                      unpaidRows.some((r) => selectedRowIds.has(r.id));

                    return (
                      <table
                        className="items-table"
                        style={{ tableLayout: "fixed", width: "100%" }}
                      >
                        <colgroup>
                          <col style={{ width: "36px" }} />
                          <col style={{ width: "100px" }} />
                          <col style={{ width: "200px" }} />
                          <col style={{ width: "200px" }} />
                          <col style={{ width: "200px" }} />
                          <col style={{ width: "140px" }} />
                          <col style={{ width: "110px" }} />
                          <col style={{ width: "60px" }} />
                        </colgroup>
                        <thead>
                          <tr>
                            <th style={{ padding: "0 0 0 12px" }}>
                              <input
                                type="checkbox"
                                checked={groupAllSelected}
                                ref={(el) => {
                                  if (el) el.indeterminate = groupSomeSelected;
                                }}
                                onChange={() => {
                                  setSelectedRowIds((prev) => {
                                    const next = new Set(prev);
                                    if (groupAllSelected) {
                                      unpaidRows.forEach((r) =>
                                        next.delete(r.id),
                                      );
                                    } else {
                                      unpaidRows.forEach((r) => next.add(r.id));
                                    }
                                    return next;
                                  });
                                }}
                                className="manager-checkbox"
                              />
                            </th>
                            <th>LPO NUMBER</th>
                            <th>PROJECT</th>
                            <th>TYPE</th>
                            <th
                              style={{ cursor: "pointer", userSelect: "none" }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleGroupSort(
                                  group.supplierId,
                                  "outstanding",
                                );
                              }}
                            >
                              OUTSTANDING AMOUNT
                              {groupSortIcon(group.supplierId, "outstanding")}
                            </th>
                            <th
                              style={{ cursor: "pointer", userSelect: "none" }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleGroupSort(group.supplierId, "due_date");
                              }}
                            >
                              DUE DATE
                              {groupSortIcon(group.supplierId, "due_date")}
                            </th>
                            <th>STATUS</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const gs = groupSortState[group.supplierId];
                            if (!gs) return group.rows;
                            return [...group.rows].sort((a, b) => {
                              if (a.is_paid !== b.is_paid)
                                return a.is_paid - b.is_paid;
                              const getGRaw = (row: LpoRow) => {
                                if (gs.col === "outstanding") return row.is_paid === 1 ? 0 : Number(row.outstanding ?? 0);
                                if (gs.col === "due_date") return getDueDateTimestamp(row);
                                const v = (row as Record<string, unknown>)[gs.col];
                                return v == null ? null : Number(v);
                              };
                              const aVal = getGRaw(a);
                              const bVal = getGRaw(b);
                              if (aVal == null) return 1;
                              if (bVal == null) return -1;
                              const cmp =
                                aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
                              return gs.dir === "asc" ? cmp : -cmp;
                            });
                          })().map((row) => {
                            const isPaid = row.is_paid === 1;
                            const dueDate = getDueDate(row);
                            const isChecked = selectedRowIds.has(row.id);
                            return (
                              <tr
                                key={row.id}
                                style={
                                  isChecked
                                    ? { backgroundColor: "rgba(240,253,247,1)" }
                                    : undefined
                                }
                              >
                                <td style={{ padding: "0 0 0 12px" }}>
                                  {!isPaid && (
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => toggleRow(row.id)}
                                      className="manager-checkbox"
                                    />
                                  )}
                                </td>
                                <td>
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "8px",
                                    }}
                                  >
                                    <span>
                                      LPO-{String(row.id).padStart(5, "0")}
                                    </span>
                                    <Button
                                      componentType="link"
                                      bgColor="rgba(239, 239, 239, 1)"
                                      borderColor="rgba(223, 223, 223, 1)"
                                      textColor="black"
                                      href={`/mr/${row.mr_header_id}/lpo/${row.id}`}
                                      style={{
                                        padding: "7px 7px",
                                        flexShrink: 0,
                                      }}
                                    >
                                      <img src={externalLinkIcon} alt="open" />
                                    </Button>
                                  </div>
                                </td>
                                <td>
                                  {row.mr_project_id && row.project_name ? (
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                      }}
                                    >
                                      <span
                                        style={{
                                          overflow: "hidden",
                                          textOverflow: "ellipsis",
                                          whiteSpace: "nowrap",
                                        }}
                                      >
                                        {row.project_name}
                                      </span>
                                      <Button
                                        componentType="link"
                                        bgColor="rgba(239, 239, 239, 1)"
                                        borderColor="rgba(223, 223, 223, 1)"
                                        textColor="black"
                                        href={`/project/${row.mr_project_id}`}
                                        style={{
                                          padding: "7px 7px",
                                          flexShrink: 0,
                                        }}
                                      >
                                        <img
                                          src={externalLinkIcon}
                                          alt="open"
                                        />
                                      </Button>
                                    </div>
                                  ) : (
                                    <span style={{ color: "#aaa" }}>-</span>
                                  )}
                                </td>
                                <td>
                                  <SupplierTypePill type={row.supplier_type} />
                                </td>
                                <td style={{ whiteSpace: "nowrap" }}>
                                  AED{" "}
                                  {formatAED(
                                    isPaid ? 0 : Number(row.outstanding),
                                  )}
                                </td>
                                <td style={{ whiteSpace: "nowrap" }}>
                                  {dueDate}
                                </td>
                                <td>
                                  <StatusPill isPaid={isPaid} />
                                </td>
                                <td>
                                  {[8, 10].includes(userInfo?.departmentID ?? 0) && (
                                    <Button
                                      componentType="link"
                                      bgColor="rgba(239, 239, 239, 1)"
                                      borderColor="rgba(223, 223, 223, 1)"
                                      textColor="black"
                                      href={`/payment/mr/${row.mr_header_id}`}
                                      style={{ padding: "7px 7px" }}
                                    >
                                      <img src={externalLinkIcon} alt="open" />
                                    </Button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    );
                  })()}

                <br />
                <br />
              </div>
            );
          })}
        </div>
      ) : (
        /* ── Flat table ── */
        <>
          <table
            className="items-table"
            style={{ tableLayout: "fixed", width: "100%" }}
          >
            <colgroup>
              <col style={{ width: "125px" }} />
              <col style={{ width: "250px" }} />
              <col style={{ width: "200px" }} />
              <col style={{ width: "175px" }} />
              <col style={{ width: "180px" }} />
              <col style={{ width: "130px" }} />
              <col style={{ width: "100px" }} />
              <col style={{ width: "60px" }} />
            </colgroup>
            <thead>
              <tr>
                <th>LPO NUMBER</th>
                <th>VENDOR</th>
                <th>PROJECT</th>
                <th>TYPE</th>
                <th
                  style={{ cursor: "pointer", userSelect: "none" }}
                  onClick={() => handleSort("outstanding")}
                >
                  OUTSTANDING AMOUNT{sortIcon("outstanding")}
                </th>
                <th
                  style={{ cursor: "pointer", userSelect: "none" }}
                  onClick={() => handleSort("due_date")}
                >
                  DUE DATE{sortIcon("due_date")}
                </th>
                <th>STATUS</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((row) => {
                const isPaid = row.is_paid === 1;
                const dueDate = getDueDate(row);

                return (
                  <tr key={row.id}>
                    {/* LPO NUMBER */}
                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <span>LPO-{String(row.id).padStart(5, "0")}</span>
                        <Button
                          componentType="link"
                          bgColor="rgba(239, 239, 239, 1)"
                          borderColor="rgba(223, 223, 223, 1)"
                          textColor="black"
                          href={`/mr/${row.mr_header_id}/lpo/${row.id}`}
                          style={{ padding: "7px 7px", flexShrink: 0 }}
                        >
                          <img src={externalLinkIcon} alt="open" />
                        </Button>
                      </div>
                    </td>

                    {/* SUPPLIER */}
                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <span
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {row.supplier_name}
                        </span>
                        <Button
                          componentType="link"
                          bgColor="rgba(239, 239, 239, 1)"
                          borderColor="rgba(223, 223, 223, 1)"
                          textColor="black"
                          href={`/vendor/${row.supplier_id}`}
                          style={{ padding: "7px 7px", flexShrink: 0 }}
                        >
                          <img src={externalLinkIcon} alt="open" />
                        </Button>
                      </div>
                    </td>

                    {/* PROJECT */}
                    <td>
                      {row.mr_project_id && row.project_name ? (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <span
                            style={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {row.project_name}
                          </span>
                          <Button
                            componentType="link"
                            bgColor="rgba(239, 239, 239, 1)"
                            borderColor="rgba(223, 223, 223, 1)"
                            textColor="black"
                            href={`/project/${row.mr_project_id}`}
                            style={{ padding: "7px 7px", flexShrink: 0 }}
                          >
                            <img src={externalLinkIcon} alt="open" />
                          </Button>
                        </div>
                      ) : (
                        <span style={{ color: "#aaa" }}>-</span>
                      )}
                    </td>

                    {/* TYPE */}
                    <td>
                      <SupplierTypePill type={row.supplier_type} />
                    </td>

                    {/* OUTSTANDING AMOUNT */}
                    <td style={{ whiteSpace: "nowrap" }}>
                      AED {formatAED(isPaid ? 0 : Number(row.outstanding))}
                    </td>

                    {/* DUE DATE */}
                    <td style={{ whiteSpace: "nowrap" }}>{dueDate}</td>

                    {/* STATUS */}
                    <td>
                      <StatusPill isPaid={isPaid} />
                    </td>

                    {/* MR payment detail link — manager & finance only */}
                    <td>
                      {[8, 10].includes(userInfo?.departmentID ?? 0) && (
                        <Button
                          componentType="link"
                          bgColor="rgba(239, 239, 239, 1)"
                          borderColor="rgba(223, 223, 223, 1)"
                          textColor="black"
                          href={`/payment/mr/${row.mr_header_id}`}
                          style={{ padding: "7px 7px" }}
                        >
                          <img src={externalLinkIcon} alt="open" />
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </>
      )}

      {/* ── Bulk record payment modal ────────────────────────────────────────── */}
      {selectedRows.length > 0 && (
        <BulkRecordPaymentButton
          selectedRows={selectedRows.map((r) => ({
            id: r.id,
            mr_header_id: r.mr_header_id,
            supplier_name: r.supplier_name,
            outstanding: Number(r.outstanding),
          }))}
          onSuccess={handlePaymentSuccess}
          recordedBy={recordedBy}
          isOpenControlled={bulkPayOpen}
          setIsOpenControlled={setBulkPayOpen}
        />
      )}

      {/* ── Bulk reject modal ────────────────────────────────────────────────── */}
      {selectedRows.length > 0 && (
        <BulkRejectPaymentButton
          selectedRows={selectedRows.map((r) => ({
            id: r.id,
            mr_header_id: r.mr_header_id,
          }))}
          onSuccess={handlePaymentSuccess}
          recordedBy={recordedBy}
          isOpenControlled={bulkRejectOpen}
          setIsOpenControlled={setBulkRejectOpen}
        />
      )}
    </div>
  );
}
