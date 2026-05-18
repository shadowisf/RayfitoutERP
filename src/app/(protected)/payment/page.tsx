"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import PaymentFilterButton, {
  defaultPaymentFilters,
  PaymentFilters,
} from "./components/_PaymentFilterButton";
import type { DateRange } from "@/app/components/_DateRangeButton";
import BulkRecordPaymentButton from "./components/_BulkRecordPaymentButton";
import BulkRejectPaymentButton from "./components/_BulkRejectPaymentButton";
import PaymentActionsButton from "./components/_PaymentActionsButton";
import NewPaymentButton from "./components/_NewPaymentButton";
import { useAuth } from "@/app/context/AuthContext";

type LpoRow = {
  id: number;
  mr_header_id: number;
  supplier_id: number;
  progress_id: number;
  total: number;
  payment_status: string | null;
  payment_terms: string | null;
  invoice_file: string | null;
  signed_file: string | null;
  supplier_payment_terms: string | null;
  supplier_due_date: string | null;
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
  if (!type) return <span>-</span>;
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
  // Prefer supplier-level due_date when set
  if (lpo.supplier_due_date) {
    const d = new Date(lpo.supplier_due_date);
    if (!isNaN(d.getTime()))
      return d
        .toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
        .toUpperCase();
  }
  // Fallback: compute from credit terms
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
  if (lpo.supplier_due_date) {
    const due = new Date(lpo.supplier_due_date);
    if (!isNaN(due.getTime())) {
      due.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return due < today;
    }
  }
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
// No due date → Infinity (sort to end).
function getDueDateTimestamp(lpo: LpoRow): number {
  if (lpo.supplier_due_date) {
    const d = new Date(lpo.supplier_due_date);
    if (!isNaN(d.getTime())) return d.getTime();
  }
  const t = (lpo.supplier_type ?? "").toLowerCase();
  if (t !== "credit") return Infinity;
  const days =
    parseDays(lpo.payment_terms) ?? parseDays(lpo.supplier_payment_terms);
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

// ── Parse invoice_file (JSON array or plain URL) ─────────────────────────────
function parseInvoiceUrl(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed[0] ?? null) : raw;
  } catch {
    return raw;
  }
}

// ── Normalise supplier_type for filter matching ──────────────────────────────
function normaliseType(type: string | null): string {
  const t = (type ?? "").toLowerCase();
  if (t === "cash") return "Cash";
  if (t === "credit") return "Credit";
  if (t.startsWith("marketplace")) return "Marketplace/Online";
  return type ?? "";
}

// ── PR status pill ───────────────────────────────────────────────────────────
function PrStatusPill({ isPaid }: { isPaid: boolean }) {
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

// ── Payment request row type ─────────────────────────────────────────────────
type PrRequestRow = {
  id: number;
  progress_id: number;
  progress_name: string | null;
  requested_by: string;
  department_name: string;
  project_name: string | null;
  date_requested: string;
  created_at: string;
  payment_jo_reference_id: number | null;
  total_paid: number;
  outstanding: number;
  is_paid: 0 | 1;
  subcontractor_id: number | null;
  subcontractor_name: string | null;
};

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
  const downloadIcon = "/icons/download.svg";
  const transactionIcon = "/icons/payments-black.svg";

  const { userInfo } = useAuth();

  // ── Tab state ────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<
    "material-requests" | "payment-requests"
  >("material-requests");

  // ── Payment requests state ────────────────────────────────────────────────
  const [prRows, setPrRows] = useState<PrRequestRow[]>([]);
  const [prLoading, setPrLoading] = useState(false);
  const [prSearchQuery, setPrSearchQuery] = useState("");
  const [prCurrentPage, setPrCurrentPage] = useState(1);
  const [prSortCol, setPrSortCol] = useState<string | null>(null);
  const [prSortDir, setPrSortDir] = useState<"asc" | "desc">("desc");

  const [lpoRows, setLpoRows] = useState<LpoRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [mrFilters, setMrFilters] = useState<PaymentFilters>(defaultPaymentFilters);
  const [prFilters, setPrFilters] = useState<PaymentFilters>(defaultPaymentFilters);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [groupByVendor, setGroupByVendor] = useState(true);
  const [collapsedVendors, setCollapsedVendors] = useState<
    Record<string, boolean>
  >({});
  const [groupBySubcontractor, setGroupBySubcontractor] = useState(true);
  const [collapsedSubcontractors, setCollapsedSubcontractors] = useState<
    Record<number, boolean>
  >({});
  const [prGroupSortState, setPrGroupSortState] = useState<
    Record<number, { col: string; dir: "asc" | "desc" }>
  >({});

  // ── Date range filters (creation date, per tab) ─────────────────────────
  const [mrDateRange, setMrDateRange] = useState<DateRange>({ start: null, end: null, preset: null });
  const [prDateRange, setPrDateRange] = useState<DateRange>({ start: null, end: null, preset: null });

  // ── Active filter helpers (derived from current tab) ─────────────────────
  const activeFilters = activeTab === "material-requests" ? mrFilters : prFilters;
  const setActiveFilters = activeTab === "material-requests" ? setMrFilters : setPrFilters;
  const activeDateRange = activeTab === "material-requests" ? mrDateRange : prDateRange;
  const setActiveDateRange = activeTab === "material-requests" ? setMrDateRange : setPrDateRange;

  // ── Row selection (group-by-vendor mode) ─────────────────────────────────
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());

  // ── Bulk payment modal (triggered from Actions dropdown) ─────────────────
  const [bulkPayOpen, setBulkPayOpen] = useState(false);

  // ── Bulk reject modal ────────────────────────────────────────────────────
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);

  // ── Supplier due date edit modal ─────────────────────────────────────────
  const [dueDateEdit, setDueDateEdit] = useState<{
    supplierId: number;
    supplierName: string;
    currentDate: string | null;
  } | null>(null);
  const [dueDateInput, setDueDateInput] = useState("");
  const [dueDateSaving, setDueDateSaving] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    setPrLoading(true);
    Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/payment/getPaymentList`)
        .then((r) => r.json())
        .then((data: LpoRow[]) => {
          if (Array.isArray(data)) setLpoRows(data);
        }),
      fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/payment/getPaymentRequestList`,
      )
        .then((r) => r.json())
        .then((data: PrRequestRow[]) => {
          if (Array.isArray(data)) setPrRows(data);
        }),
    ])
      .catch(console.error)
      .finally(() => {
        setIsLoading(false);
        setPrLoading(false);
      });
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

  // ── Unique subcontractor list derived from PR data ───────────────────────
  const subcontractorList = useMemo(
    () =>
      Array.from(
        new Set(
          prRows
            .map((r) => r.subcontractor_name)
            .filter((n): n is string => !!n),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [prRows],
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
        mrFilters.selectedVendors.length > 0 &&
        !mrFilters.selectedVendors.includes(row.supplier_name)
      )
        return false;

      if (mrFilters.selectedPaymentTypes.length > 0) {
        if (
          !mrFilters.selectedPaymentTypes.includes(
            normaliseType(row.supplier_type),
          )
        )
          return false;
      }

      if (mrFilters.selectedStatuses.length > 0) {
        const statusLabel = row.is_paid === 1 ? "Paid" : "Unpaid";
        if (!mrFilters.selectedStatuses.includes(statusLabel)) return false;
      }

      if (
        mrFilters.selectedProjects.length > 0 &&
        !mrFilters.selectedProjects.includes(row.project_name)
      )
        return false;

      // ── Creation date range filter ────────────────────────────────────
      if (mrDateRange.start || mrDateRange.end) {
        if (!row.created_at) return false;
        const created = new Date(row.created_at);
        if (isNaN(created.getTime())) return false;
        created.setHours(0, 0, 0, 0);
        if (mrDateRange.start && created < mrDateRange.start) return false;
        if (mrDateRange.end) {
          const endDay = new Date(mrDateRange.end);
          endDay.setHours(23, 59, 59, 999);
          if (created > endDay) return false;
        }
      }

      return true;
    });
  }, [searched, mrFilters, mrDateRange]);

  // ── Widget stats — computed from filtered rows ───────────────────────────
  const outstandingStats = useMemo(() => {
    const unpaid = filtered.filter((r) => r.is_paid !== 1);
    const cash = unpaid.filter(
      (r) => (r.supplier_type ?? "").toLowerCase() === "cash",
    );
    const credit = unpaid.filter(
      (r) => (r.supplier_type ?? "").toLowerCase() === "credit",
    );
    return {
      total: {
        amount: unpaid.reduce((s, r) => s + Number(r.outstanding), 0),
        count: unpaid.length,
      },
      cash: {
        amount: cash.reduce((s, r) => s + Number(r.outstanding), 0),
        count: cash.length,
      },
      credit: {
        amount: credit.reduce((s, r) => s + Number(r.outstanding), 0),
        count: credit.length,
      },
    };
  }, [filtered]);

  // Always keep unpaid first, paid last; then apply column sort within each group
  const sorted = useMemo(() => {
    const base = [...filtered].sort((a, b) => a.is_paid - b.is_paid);
    if (!sortCol) return base;
    return base.sort((a, b) => {
      // Keep paid/unpaid grouping intact — only sort within same is_paid group
      if (a.is_paid !== b.is_paid) return a.is_paid - b.is_paid;
      // For outstanding, paid rows are always 0 regardless of raw field value
      const getRaw = (row: LpoRow) => {
        if (sortCol === "outstanding")
          return row.is_paid === 1 ? 0 : Number(row.outstanding ?? 0);
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

  // ── Flat table select-all helpers (all rows, paid + unpaid) ────────────────
  const flatAllSelected =
    paginated.length > 0 && paginated.every((r) => selectedRowIds.has(r.id));
  const flatSomeSelected =
    !flatAllSelected && paginated.some((r) => selectedRowIds.has(r.id));

  // ── PR search ────────────────────────────────────────────────────────────
  const prSearched = useMemo(() => {
    const q = prSearchQuery.toLowerCase();
    if (!q) return prRows;
    return prRows.filter(
      (row) =>
        `pr-${String(row.id).padStart(5, "0")}`.includes(q) ||
        (row.requested_by ?? "").toLowerCase().includes(q) ||
        (row.project_name ?? "").toLowerCase().includes(q) ||
        (row.department_name ?? "").toLowerCase().includes(q) ||
        (row.progress_name ?? "").toLowerCase().includes(q),
    );
  }, [prRows, prSearchQuery]);

  // ── PR filter ────────────────────────────────────────────────────────────
  const prFiltered = useMemo(() => {
    return prSearched.filter((row) => {
      if (
        prFilters.selectedProjects.length > 0 &&
        !prFilters.selectedProjects.includes(row.project_name ?? "")
      )
        return false;

      if (prFilters.selectedStatuses.length > 0) {
        const statusLabel = row.is_paid === 1 ? "Paid" : "Unpaid";
        if (!prFilters.selectedStatuses.includes(statusLabel)) return false;
      }

      if (
        prFilters.selectedSubcontractors.length > 0 &&
        !prFilters.selectedSubcontractors.includes(row.subcontractor_name ?? "")
      )
        return false;

      // ── Creation date range filter (using created_at for JOs) ────────────
      if (prDateRange.start || prDateRange.end) {
        if (!row.created_at) return false;
        const created = new Date(row.created_at);
        if (isNaN(created.getTime())) return false;
        created.setHours(0, 0, 0, 0);
        if (prDateRange.start && created < prDateRange.start) return false;
        if (prDateRange.end) {
          const endDay = new Date(prDateRange.end);
          endDay.setHours(23, 59, 59, 999);
          if (created > endDay) return false;
        }
      }

      return true;
    });
  }, [prSearched, prFilters, prDateRange]);

  // ── PR sort ──────────────────────────────────────────────────────────────
  const handlePrSort = (col: string) => {
    if (prSortCol !== col) {
      setPrSortCol(col);
      setPrSortDir("desc");
    } else if (prSortDir === "desc") {
      setPrSortDir("asc");
    } else {
      setPrSortCol(null);
      setPrSortDir("desc");
    }
  };

  const prSortIcon = (col: string) => (
    <span
      style={{
        marginLeft: 4,
        fontSize: 10,
        opacity: prSortCol === col ? 1 : 0.35,
      }}
    >
      {prSortCol === col ? (prSortDir === "asc" ? "↑" : "↓") : "↕"}
    </span>
  );

  const prSorted = useMemo(() => {
    const base = [...prFiltered].sort((a, b) => a.is_paid - b.is_paid);
    if (!prSortCol) return base;
    return base.sort((a, b) => {
      if (a.is_paid !== b.is_paid) return a.is_paid - b.is_paid;
      const aVal = Number((a as Record<string, unknown>)[prSortCol] ?? 0);
      const bVal = Number((b as Record<string, unknown>)[prSortCol] ?? 0);
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return prSortDir === "asc" ? cmp : -cmp;
    });
  }, [prFiltered, prSortCol, prSortDir]);

  // ── Group by subcontractor ───────────────────────────────────────────────
  const subcontractorGroups = useMemo(() => {
    const map = new Map<
      number,
      {
        subcontractorId: number;
        subcontractorName: string;
        rows: PrRequestRow[];
      }
    >();
    for (const row of prSorted) {
      const key = row.subcontractor_id ?? 0;
      if (!map.has(key)) {
        map.set(key, {
          subcontractorId: key,
          subcontractorName: row.subcontractor_name ?? "UNASSIGNED",
          rows: [],
        });
      }
      map.get(key)!.rows.push(row);
    }
    return Array.from(map.values());
  }, [prSorted]);

  const toggleSubcontractorCollapse = (id: number) => {
    setCollapsedSubcontractors((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handlePrGroupSort = (subcontractorId: number, col: string) => {
    setPrGroupSortState((prev) => {
      const cur = prev[subcontractorId];
      if (!cur || cur.col !== col) {
        return { ...prev, [subcontractorId]: { col, dir: "desc" } };
      } else if (cur.dir === "desc") {
        return { ...prev, [subcontractorId]: { col, dir: "asc" } };
      } else {
        const next = { ...prev };
        delete next[subcontractorId];
        return next;
      }
    });
  };

  const prGroupSortIcon = (subcontractorId: number, col: string) => {
    const cur = prGroupSortState[subcontractorId];
    const active = cur?.col === col;
    return (
      <span style={{ marginLeft: 4, fontSize: 10, opacity: active ? 1 : 0.35 }}>
        {active ? (cur.dir === "asc" ? "↑" : "↓") : "↕"}
      </span>
    );
  };

  // ── PR pagination ────────────────────────────────────────────────────────
  const prTotalPages = Math.ceil(prSorted.length / ITEMS_PER_PAGE);
  const prStartIndex = (prCurrentPage - 1) * ITEMS_PER_PAGE;
  const prPaginated = prSorted.slice(
    prStartIndex,
    prStartIndex + ITEMS_PER_PAGE,
  );

  // Reset to page 1 on search / filter / sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, mrFilters, mrDateRange, sortCol, sortDir]);

  // Reset PR page on search/filter/sort change
  useEffect(() => {
    setPrCurrentPage(1);
  }, [prSearchQuery, prFilters, prDateRange, prSortCol, prSortDir]);

  // ── Active filter helpers ───────────────────────────────────────────────
  const hasActiveDateRange = !!(activeDateRange.start || activeDateRange.end);
  const hasActiveFilters =
    activeTab === "payment-requests"
      ? prFilters.selectedStatuses.length > 0 ||
        prFilters.selectedProjects.length > 0 ||
        prFilters.selectedSubcontractors.length > 0 ||
        hasActiveDateRange
      : mrFilters.selectedVendors.length > 0 ||
        mrFilters.selectedPaymentTypes.length > 0 ||
        mrFilters.selectedStatuses.length > 0 ||
        mrFilters.selectedProjects.length > 0 ||
        hasActiveDateRange;

  const resetAllFilters = () => {
    setActiveFilters({
      selectedVendors: [],
      selectedPaymentTypes: [],
      selectedStatuses: [],
      selectedProjects: [],
      selectedSubcontractors: [],
    });
    setActiveDateRange({ start: null, end: null, preset: null });
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

  // Unpaid only — for Record Payment / Reject actions
  const selectedRows = useMemo(
    () => sorted.filter((r) => selectedRowIds.has(r.id) && r.is_paid !== 1),
    [sorted, selectedRowIds],
  );

  // All selected (paid + unpaid) — for PDF/file downloads
  const selectedAllRows = useMemo(
    () => sorted.filter((r) => selectedRowIds.has(r.id)),
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

  const handleSaveDueDate = async () => {
    if (!dueDateEdit || !dueDateInput) return;
    setDueDateSaving(true);
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/payment/updateSupplierDueDate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            supplier_id: dueDateEdit.supplierId,
            due_date: dueDateInput,
          }),
        },
      );
      setDueDateEdit(null);
      refetchLpos(false);
    } finally {
      setDueDateSaving(false);
    }
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

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <Button
              componentType={"link"}
              bgColor={"white"}
              borderColor={"rgba(238, 238, 238, 1)"}
              textColor={"black"}
              href="/finance/transactions"
            >
              TRANSACTION LOG{" "}
              <img src={transactionIcon} alt="transaction log" />
            </Button>
            <NewPaymentButton onSuccess={() => refetchLpos(false)} />
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="SEARCH"
                value={
                  activeTab === "payment-requests" ? prSearchQuery : searchQuery
                }
                onChange={(e) =>
                  activeTab === "payment-requests"
                    ? setPrSearchQuery(e.target.value)
                    : setSearchQuery(e.target.value)
                }
                style={{
                  width: "350px",
                  padding: "7px 40px 7px 15px",
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
            {/* GROUP BY VENDOR toggle — only in material-requests tab */}
            {activeTab === "material-requests" && (
              <>
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
              </>
            )}

            {/* GROUP BY SUBCONTRACTOR toggle — only in payment-requests tab */}
            {activeTab === "payment-requests" && (
              <>
                <Button
                  componentType="button"
                  bgColor="white"
                  borderColor="rgba(241, 244, 246, 1)"
                  textColor="black"
                  onClick={() => setGroupBySubcontractor((v) => !v)}
                  style={{ padding: "7px 20px", borderRadius: "50px" }}
                >
                  GROUP BY SUBCONTRACTOR{" "}
                  <div
                    style={{
                      position: "relative",
                      width: "30px",
                      height: "17px",
                      backgroundColor: groupBySubcontractor
                        ? "rgb(34, 197, 94)"
                        : "rgba(200, 200, 200, 1)",
                      borderRadius: "34px",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        top: "0px",
                        left: groupBySubcontractor ? "15px" : "0px",
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
              </>
            )}

            <PaymentFilterButton
              vendors={vendorList}
              projects={projectList}
              subcontractors={subcontractorList}
              onApplyFilters={setActiveFilters}
              currentFilters={activeFilters}
              dateRange={activeDateRange}
              onDateRangeChange={setActiveDateRange}
              tab={activeTab}
            />

            {hasActiveFilters && (
              <>
                {/* Creation date pill */}
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
                    CREATION DATE:{" "}
                    <span style={{ color: "rgba(16, 185, 129, 1)" }}>
                      {activeDateRange.preset
                        ? activeDateRange.preset.toUpperCase()
                        : [
                            activeDateRange.start?.toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                            }),
                            activeDateRange.end?.toLocaleDateString("en-GB", {
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

                {/* Vendor pill — material-requests only */}
                {activeTab === "material-requests" &&
                  activeFilters.selectedVendors.length > 0 && (
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
                        {activeFilters.selectedVendors[0].toUpperCase()}
                        {activeFilters.selectedVendors.length > 1 &&
                          `, +${activeFilters.selectedVendors.length - 1} MORE`}
                      </span>
                    </Button>
                  )}

                {/* Payment type pill — material-requests only */}
                {activeTab === "material-requests" &&
                  activeFilters.selectedPaymentTypes.length > 0 && (
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
                        {activeFilters.selectedPaymentTypes[0].toUpperCase()}
                        {activeFilters.selectedPaymentTypes.length > 1 &&
                          `, +${activeFilters.selectedPaymentTypes.length - 1} MORE`}
                      </span>
                    </Button>
                  )}

                {/* Status pill — both tabs */}
                {activeFilters.selectedStatuses.length > 0 && (
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
                      {activeFilters.selectedStatuses[0].toUpperCase()}
                      {activeFilters.selectedStatuses.length > 1 &&
                        `, +${activeFilters.selectedStatuses.length - 1} MORE`}
                    </span>
                  </Button>
                )}

                {/* Project pill — both tabs */}
                {activeFilters.selectedProjects.length > 0 && (
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
                      {activeFilters.selectedProjects[0].toUpperCase()}
                      {activeFilters.selectedProjects.length > 1 &&
                        `, +${activeFilters.selectedProjects.length - 1} MORE`}
                    </span>
                  </Button>
                )}

                {/* Subcontractor pill — payment-requests only */}
                {activeTab === "payment-requests" &&
                  activeFilters.selectedSubcontractors.length > 0 && (
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
                      SUBCONTRACTOR:{" "}
                      <span style={{ color: "rgba(16, 185, 129, 1)" }}>
                        {activeFilters.selectedSubcontractors[0].toUpperCase()}
                        {activeFilters.selectedSubcontractors.length > 1 &&
                          `, +${activeFilters.selectedSubcontractors.length - 1} MORE`}
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

          {/* RIGHT — actions */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              flexShrink: 0,
            }}
          >
            <PaymentActionsButton
              selectedCount={selectedRows.length}
              selectedRows={selectedRows.map((r) => ({
                id: r.id,
                mr_header_id: r.mr_header_id,
                invoice_file: r.invoice_file,
                signed_lpo_file: r.signed_file,
              }))}
              downloadRows={selectedAllRows.map((r) => ({
                id: r.id,
                mr_header_id: r.mr_header_id,
                invoice_file: r.invoice_file,
                signed_lpo_file: r.signed_file,
              }))}
              onReset={() => setSelectedRowIds(new Set())}
              onRecordPayment={() => setBulkPayOpen(true)}
              onReject={() => setBulkRejectOpen(true)}
            />
          </div>
          {/* end RIGHT */}
        </div>

        {/* ── Tabs ─────────────────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            alignItems: "center",
            marginTop: "20px",
          }}
        >
          <Button
            componentType="button"
            bgColor={
              activeTab === "material-requests" ? "black" : "transparent"
            }
            textColor={activeTab === "material-requests" ? "white" : "black"}
            borderColor="black"
            onClick={() => setActiveTab("material-requests")}
            style={{ borderRadius: "25px", padding: "7px 20px" }}
          >
            MATERIAL REQUESTS
          </Button>
          <Button
            componentType="button"
            bgColor={activeTab === "payment-requests" ? "black" : "transparent"}
            textColor={activeTab === "payment-requests" ? "white" : "black"}
            borderColor="black"
            onClick={() => setActiveTab("payment-requests")}
            style={{ borderRadius: "25px", padding: "7px 20px" }}
          >
            JOB ORDERS
          </Button>
        </div>
      </div>
      {/* ── End sticky toolbar ───────────────────────────────────────────────── */}

      {activeTab === "material-requests" && (
        <>
          <div style={{ display: "flex", gap: "10px" }}>
            {[
              {
                label: "Total Outstanding Amount",
                stats: outstandingStats.total,
              },
              {
                label: "Cash Outstanding Amount",
                stats: outstandingStats.cash,
              },
              {
                label: "Credit Outstanding Amount",
                stats: outstandingStats.credit,
              },
            ].map(({ label, stats }) => (
              <div
                key={label}
                className="widget-container"
                style={{
                  width: "300px",
                  height: "175px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  borderRadius: "15px",
                }}
              >
                <h3 style={{ color: "rgba(74, 85, 101, 1)" }}>{label}</h3>
                <div>
                  <h2 style={{ fontSize: "28px" }}>
                    {isLoading ? "..." : `AED ${formatAED(stats.amount)}`}
                  </h2>
                  <p style={{ color: "rgba(74, 85, 101, 1)" }}>
                    {isLoading
                      ? "—"
                      : `${stats.count} Pending LPO${stats.count !== 1 ? "s" : ""}`}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <br />
          <br />
          <br />
        </>
      )}

      {/* ── Payment Requests Table ────────────────────────────────────────── */}
      {activeTab === "payment-requests" &&
        (prLoading ? (
          <div style={{ textAlign: "center", padding: "60px", color: "#888" }}>
            Loading...
          </div>
        ) : prSorted.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px", color: "#888" }}>
            {prSearchQuery || hasActiveFilters
              ? "No results found"
              : "No payment requests found"}
          </div>
        ) : groupBySubcontractor ? (
          /* ── Grouped by subcontractor ── */
          <div style={{ display: "flex", flexDirection: "column" }}>
            {subcontractorGroups.map((group) => {
              const isCollapsed =
                collapsedSubcontractors[group.subcontractorId] ?? false;
              const groupOutstanding = group.rows
                .filter((r) => r.is_paid !== 1)
                .reduce((s, r) => s + Number(r.outstanding), 0);
              return (
                <div key={group.subcontractorId}>
                  {/* Group header */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      marginBottom: isCollapsed ? "0px" : "20px",
                      cursor: "pointer",
                      userSelect: "none",
                      backgroundColor: "rgba(239, 239, 239, 1)",
                      width: "fit-content",
                      padding: "5px 12px",
                      borderRadius: "50px",
                    }}
                    onClick={() =>
                      toggleSubcontractorCollapse(group.subcontractorId)
                    }
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

                    <h2>{group.subcontractorName}</h2>

                    {group.subcontractorId !== 0 && (
                      <Button
                        componentType="link"
                        bgColor="transparent"
                        borderColor="transparent"
                        textColor="black"
                        href={`/payment/credit/subcontractor/${group.subcontractorId}`}
                        style={{ padding: "0px", marginBottom: "2px" }}
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                      >
                        <img src={externalLinkIcon} alt="open" />
                      </Button>
                    )}

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
                      {group.rows.length} PR{group.rows.length !== 1 ? "s" : ""}
                    </div>

                    {groupOutstanding > 0 && (
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
                        {formatAED(groupOutstanding)} AED Outstanding
                      </div>
                    )}
                  </div>

                  {/* Group table */}
                  {!isCollapsed &&
                    (() => {
                      const gs = prGroupSortState[group.subcontractorId];
                      const rows = gs
                        ? [...group.rows].sort((a, b) => {
                            if (a.is_paid !== b.is_paid)
                              return a.is_paid - b.is_paid;
                            const aVal = Number(
                              (a as Record<string, unknown>)[gs.col] ?? 0,
                            );
                            const bVal = Number(
                              (b as Record<string, unknown>)[gs.col] ?? 0,
                            );
                            const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
                            return gs.dir === "asc" ? cmp : -cmp;
                          })
                        : group.rows;
                      return (
                        <table
                          className="items-table"
                          style={{ tableLayout: "fixed", width: "100%" }}
                        >
                          <colgroup>
                            <col style={{ width: "125px" }} />
                            <col style={{ width: "125px" }} />
                            <col style={{ width: "280px" }} />
                            <col style={{ width: "150px" }} />
                            <col style={{ width: "200px" }} />
                            <col style={{ width: "60px" }} />
                          </colgroup>
                          <thead>
                            <tr>
                              <th>PR NUMBER</th>
                              <th>JO NUMBER</th>
                              <th>PROJECT</th>
                              <th>STATUS</th>
                              <th
                                style={{
                                  cursor: "pointer",
                                  userSelect: "none",
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePrGroupSort(
                                    group.subcontractorId,
                                    "outstanding",
                                  );
                                }}
                              >
                                OUTSTANDING AMOUNT
                                {prGroupSortIcon(
                                  group.subcontractorId,
                                  "outstanding",
                                )}
                              </th>
                              <th></th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((row) => (
                              <tr key={row.id}>
                                <td>
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "8px",
                                    }}
                                  >
                                    <span>
                                      PR-{String(row.id).padStart(5, "0")}
                                    </span>
                                    <Button
                                      componentType="link"
                                      bgColor="rgba(239,239,239,1)"
                                      borderColor="rgba(223,223,223,1)"
                                      textColor="black"
                                      href={`/mr/${row.id}`}
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
                                  {row.payment_jo_reference_id ? (
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                      }}
                                    >
                                      <span>
                                        JO-
                                        {String(
                                          row.payment_jo_reference_id,
                                        ).padStart(5, "0")}
                                      </span>
                                      <Button
                                        componentType="link"
                                        bgColor="rgba(239,239,239,1)"
                                        borderColor="rgba(223,223,223,1)"
                                        textColor="black"
                                        href={`/mr/${row.payment_jo_reference_id}`}
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
                                    <span>-</span>
                                  )}
                                </td>
                                <td>
                                  <span
                                    style={{
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                      display: "block",
                                    }}
                                  >
                                    {row.project_name ?? "-"}
                                  </span>
                                </td>
                                <td>
                                  <PrStatusPill isPaid={row.is_paid === 1} />
                                </td>
                                <td>
                                  AED{" "}
                                  {formatAED(
                                    row.is_paid === 1
                                      ? 0
                                      : Number(row.outstanding),
                                  )}
                                </td>
                                <td>
                                  {row.subcontractor_id ? (
                                    <Button
                                      componentType="link"
                                      bgColor="rgba(239,239,239,1)"
                                      borderColor="rgba(223,223,223,1)"
                                      textColor="black"
                                      href={`/payment/credit/subcontractor/${row.subcontractor_id}`}
                                      style={{
                                        padding: "7px 7px",
                                        flexShrink: 0,
                                      }}
                                    >
                                      <img src={externalLinkIcon} alt="open" />
                                    </Button>
                                  ) : (
                                    <span>-</span>
                                  )}
                                </td>
                              </tr>
                            ))}
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
                <col style={{ width: "125px" }} />
                <col style={{ width: "200px" }} />
                <col style={{ width: "220px" }} />
                <col style={{ width: "150px" }} />
                <col style={{ width: "180px" }} />
                <col style={{ width: "60px" }} />
              </colgroup>
              <thead>
                <tr>
                  <th>PR NUMBER</th>
                  <th>JO NUMBER</th>
                  <th>SUBCONTRACTOR</th>
                  <th>PROJECT</th>
                  <th>STATUS</th>
                  <th
                    style={{ cursor: "pointer", userSelect: "none" }}
                    onClick={() => handlePrSort("outstanding")}
                  >
                    OUTSTANDING AMOUNT{prSortIcon("outstanding")}
                  </th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {prPaginated.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <span>PR-{String(row.id).padStart(5, "0")}</span>
                        <Button
                          componentType="link"
                          bgColor="rgba(239,239,239,1)"
                          borderColor="rgba(223,223,223,1)"
                          textColor="black"
                          href={`/mr/${row.id}`}
                          style={{ padding: "7px 7px", flexShrink: 0 }}
                        >
                          <img src={externalLinkIcon} alt="open" />
                        </Button>
                      </div>
                    </td>
                    <td>
                      {row.payment_jo_reference_id ? (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <span>
                            JO-
                            {String(row.payment_jo_reference_id).padStart(
                              5,
                              "0",
                            )}
                          </span>
                          <Button
                            componentType="link"
                            bgColor="rgba(239,239,239,1)"
                            borderColor="rgba(223,223,223,1)"
                            textColor="black"
                            href={`/mr/${row.payment_jo_reference_id}`}
                            style={{ padding: "7px 7px", flexShrink: 0 }}
                          >
                            <img src={externalLinkIcon} alt="open" />
                          </Button>
                        </div>
                      ) : (
                        <span>-</span>
                      )}
                    </td>
                    <td>
                      {row.subcontractor_id && row.subcontractor_name ? (
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
                            {row.subcontractor_name}
                          </span>
                          <Button
                            componentType="link"
                            bgColor="rgba(239,239,239,1)"
                            borderColor="rgba(223,223,223,1)"
                            textColor="black"
                            href={`/payment/credit/subcontractor/${row.subcontractor_id}`}
                            style={{ padding: "7px 7px", flexShrink: 0 }}
                          >
                            <img src={externalLinkIcon} alt="open" />
                          </Button>
                        </div>
                      ) : (
                        <span>-</span>
                      )}
                    </td>
                    <td>
                      <span
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          display: "block",
                        }}
                      >
                        {row.project_name ?? "-"}
                      </span>
                    </td>
                    <td>
                      <PrStatusPill isPaid={row.is_paid === 1} />
                    </td>
                    <td>
                      AED{" "}
                      {formatAED(
                        row.is_paid === 1 ? 0 : Number(row.outstanding),
                      )}
                    </td>
                    <td>
                      {row.subcontractor_id ? (
                        <Button
                          componentType="link"
                          bgColor="rgba(239,239,239,1)"
                          borderColor="rgba(223,223,223,1)"
                          textColor="black"
                          href={`/payment/credit/subcontractor/${row.subcontractor_id}`}
                          style={{ padding: "7px 7px", flexShrink: 0 }}
                        >
                          <img src={externalLinkIcon} alt="open" />
                        </Button>
                      ) : (
                        <span>-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <PaginationControls
              currentPage={prCurrentPage}
              totalPages={prTotalPages}
              onPageChange={setPrCurrentPage}
            />
          </>
        ))}

      {/* ── Material Requests (LPO) Table ─────────────────────────────────── */}
      {activeTab === "material-requests" &&
        (isLoading ? (
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
          <div style={{ display: "flex", flexDirection: "column" }}>
            {vendorGroups.map((group) => {
              const isCollapsed = collapsedVendors[group.supplierId] ?? false;
              const groupOutstanding = group.rows
                .filter((r) => r.is_paid !== 1)
                .reduce((s, r) => s + Number(r.outstanding), 0);
              return (
                <div key={group.supplierId}>
                  {/* Group header */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      marginBottom: isCollapsed ? "0px" : "20px",
                      cursor: "pointer",
                      userSelect: "none",
                      backgroundColor: "rgba(239, 239, 239, 1)",
                      width: "fit-content",
                      padding: "5px 12px",
                      borderRadius: "50px",
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
                      bgColor="transparent"
                      borderColor="transparent"
                      textColor="black"
                      href={`/vendor/${group.supplierId}`}
                      style={{ padding: "0px", marginBottom: "2px" }}
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
                      {group.rows.length} LPO
                      {group.rows.length !== 1 ? "s" : ""}
                    </div>
                    {groupOutstanding > 0 && (
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
                        {formatAED(groupOutstanding)} AED Outstanding
                      </div>
                    )}
                  </div>

                  {/* Group table */}
                  {!isCollapsed &&
                    (() => {
                      const groupAllSelected =
                        group.rows.length > 0 &&
                        group.rows.every((r) => selectedRowIds.has(r.id));
                      const groupSomeSelected =
                        !groupAllSelected &&
                        group.rows.some((r) => selectedRowIds.has(r.id));

                      return (
                        <table
                          className="items-table"
                          style={{ tableLayout: "fixed", width: "100%" }}
                        >
                          <colgroup>
                            <col style={{ width: "36px" }} />
                            <col style={{ width: "125px" }} />
                            <col style={{ width: "200px" }} />
                            <col style={{ width: "200px" }} />
                            <col style={{ width: "200px" }} />
                            <col style={{ width: "140px" }} />
                            <col style={{ width: "110px" }} />
                            <col style={{ width: "90px" }} />
                            <col style={{ width: "60px" }} />
                          </colgroup>
                          <thead>
                            <tr>
                              <th style={{ padding: "0 0 0 12px" }}>
                                <input
                                  type="checkbox"
                                  checked={groupAllSelected}
                                  ref={(el) => {
                                    if (el)
                                      el.indeterminate = groupSomeSelected;
                                  }}
                                  onChange={() => {
                                    setSelectedRowIds((prev) => {
                                      const next = new Set(prev);
                                      if (groupAllSelected) {
                                        group.rows.forEach((r) =>
                                          next.delete(r.id),
                                        );
                                      } else {
                                        group.rows.forEach((r) =>
                                          next.add(r.id),
                                        );
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
                                style={{
                                  cursor: "pointer",
                                  userSelect: "none",
                                }}
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
                                style={{
                                  cursor: "pointer",
                                  userSelect: "none",
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleGroupSort(group.supplierId, "due_date");
                                }}
                              >
                                DUE DATE
                                {groupSortIcon(group.supplierId, "due_date")}
                              </th>
                              <th>STATUS</th>
                              <th>INVOICE</th>
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
                                  if (gs.col === "outstanding")
                                    return row.is_paid === 1
                                      ? 0
                                      : Number(row.outstanding ?? 0);
                                  if (gs.col === "due_date")
                                    return getDueDateTimestamp(row);
                                  const v = (row as Record<string, unknown>)[
                                    gs.col
                                  ];
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
                                      ? {
                                          backgroundColor:
                                            "rgba(240,253,247,1)",
                                        }
                                      : undefined
                                  }
                                >
                                  <td style={{ padding: "0 0 0 12px" }}>
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => toggleRow(row.id)}
                                      className="manager-checkbox"
                                    />
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
                                        <img
                                          src={externalLinkIcon}
                                          alt="open"
                                        />
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
                                      <span>-</span>
                                    )}
                                  </td>
                                  <td>
                                    <SupplierTypePill
                                      type={row.supplier_type}
                                    />
                                  </td>
                                  <td style={{ whiteSpace: "nowrap" }}>
                                    {`AED ${formatAED(isPaid ? 0 : Number(row.outstanding))}`}
                                  </td>
                                  <td style={{ whiteSpace: "nowrap" }}>
                                    {dueDate}
                                  </td>
                                  <td>
                                    <StatusPill isPaid={isPaid} />
                                  </td>
                                  <td>
                                    {(() => {
                                      const invoiceUrl = parseInvoiceUrl(
                                        row.invoice_file,
                                      );
                                      return invoiceUrl ? (
                                        <Button
                                          componentType="link"
                                          bgColor="rgba(239,239,239,1)"
                                          borderColor="rgba(223,223,223,1)"
                                          textColor="black"
                                          href={invoiceUrl}
                                          target="_blank"
                                          style={{ padding: "7px 7px" }}
                                          onClick={(e: React.MouseEvent) =>
                                            e.stopPropagation()
                                          }
                                        >
                                          <img
                                            src={downloadIcon}
                                            alt="download"
                                          />
                                        </Button>
                                      ) : (
                                        <span>N/A</span>
                                      );
                                    })()}
                                  </td>
                                  <td>
                                    {[8, 10].includes(
                                      userInfo?.departmentID ?? 0,
                                    ) && (
                                      <Button
                                        componentType="link"
                                        bgColor="rgba(239, 239, 239, 1)"
                                        borderColor="rgba(223, 223, 223, 1)"
                                        textColor="black"
                                        href={
                                          (
                                            row.supplier_type ?? ""
                                          ).toLowerCase() === "credit"
                                            ? `/payment/credit/supplier/${row.supplier_id}`
                                            : `/payment/cash/mr/${row.mr_header_id}`
                                        }
                                        style={{ padding: "7px 7px" }}
                                      >
                                        <img
                                          src={externalLinkIcon}
                                          alt="open"
                                        />
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
                <col style={{ width: "36px" }} />
                <col style={{ width: "125px" }} />
                <col style={{ width: "250px" }} />
                <col style={{ width: "200px" }} />
                <col style={{ width: "175px" }} />
                <col style={{ width: "180px" }} />
                <col style={{ width: "130px" }} />
                <col style={{ width: "100px" }} />
                <col style={{ width: "90px" }} />
                <col style={{ width: "60px" }} />
              </colgroup>
              <thead>
                <tr>
                  <th style={{ padding: "0 0 0 12px" }}>
                    <input
                      type="checkbox"
                      checked={flatAllSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = flatSomeSelected;
                      }}
                      onChange={() => {
                        setSelectedRowIds((prev) => {
                          const next = new Set(prev);
                          if (flatAllSelected) {
                            paginated.forEach((r) => next.delete(r.id));
                          } else {
                            paginated.forEach((r) => next.add(r.id));
                          }
                          return next;
                        });
                      }}
                      className="manager-checkbox"
                    />
                  </th>
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
                  <th>INVOICE</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((row) => {
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
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleRow(row.id)}
                          className="manager-checkbox"
                        />
                      </td>
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
                          <span>-</span>
                        )}
                      </td>

                      {/* TYPE */}
                      <td>
                        <SupplierTypePill type={row.supplier_type} />
                      </td>

                      {/* OUTSTANDING AMOUNT */}
                      <td style={{ whiteSpace: "nowrap" }}>
                        {`AED ${formatAED(isPaid ? 0 : Number(row.outstanding))}`}
                      </td>

                      {/* DUE DATE */}
                      <td style={{ whiteSpace: "nowrap" }}>{dueDate}</td>

                      {/* STATUS */}
                      <td>
                        <StatusPill isPaid={isPaid} />
                      </td>

                      {/* INVOICE */}
                      <td>
                        {(() => {
                          const invoiceUrl = parseInvoiceUrl(row.invoice_file);
                          return invoiceUrl ? (
                            <Button
                              componentType="link"
                              bgColor="rgba(239,239,239,1)"
                              borderColor="rgba(223,223,223,1)"
                              textColor="black"
                              href={invoiceUrl}
                              target="_blank"
                              style={{ padding: "7px 7px" }}
                            >
                              <img src={downloadIcon} alt="download" />
                            </Button>
                          ) : (
                            <span>N/A</span>
                          );
                        })()}
                      </td>

                      {/* MR payment detail link — manager & finance only */}
                      <td>
                        {[8, 10].includes(userInfo?.departmentID ?? 0) && (
                          <Button
                            componentType="link"
                            bgColor="rgba(239, 239, 239, 1)"
                            borderColor="rgba(223, 223, 223, 1)"
                            textColor="black"
                            href={
                              (row.supplier_type ?? "").toLowerCase() ===
                              "credit"
                                ? `/payment/credit/supplier/${row.supplier_id}`
                                : `/payment/cash/mr/${row.mr_header_id}`
                            }
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
        ))}

      {/* ── Bulk record payment modal ────────────────────────────────────────── */}
      {selectedRows.length > 0 && (
        <BulkRecordPaymentButton
          selectedRows={selectedRows.map((r) => ({
            id: r.id,
            mr_header_id: r.mr_header_id,
            supplier_name: r.supplier_name,
            outstanding: Number(r.outstanding),
            supplier_type: r.supplier_type ?? "",
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

      {/* ── Supplier due date edit modal ──────────────────────────────────────── */}
      {dueDateEdit &&
        typeof document !== "undefined" &&
        createPortal(
          <FormPopUp
            header={`EDIT DUE DATE — ${dueDateEdit.supplierName.toUpperCase()}`}
            setIsOpen={() => setDueDateEdit(null)}
            addButtonLabel={dueDateSaving ? "SAVING..." : "CONFIRM"}
            handleSubmit={handleSaveDueDate}
            style={{ minWidth: "380px" }}
          >
            <div style={{ marginBottom: "20px" }}>
              <small style={{ display: "block", marginBottom: "8px" }}>
                DUE DATE *
              </small>
              <input
                type="date"
                required
                value={dueDateInput}
                onChange={(e) => setDueDateInput(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 15px",
                  borderRadius: "8px",
                  border: "1px solid rgba(223, 223, 223, 1)",
                  fontSize: "14px",
                  backgroundColor: "rgba(245, 245, 245, 1)",
                }}
              />
            </div>
          </FormPopUp>,
          document.body,
        )}
    </div>
  );
}
