"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "@/app/components/Button";
import { useAuth } from "@/app/context/AuthContext";
import PaymentFilterButton, {
  defaultPaymentFilters,
  PaymentFilters,
} from "./components/_PaymentFilterButton";

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
  const { userInfo } = useAuth();

  const searchIcon = "/icons/search.svg";
  const externalLinkIcon = "/icons/external-link.svg";

  const [lpoRows, setLpoRows] = useState<LpoRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<PaymentFilters>(defaultPaymentFilters);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Only managers (dept 8) and finance (dept 10) may navigate into the MR
  const canView = userInfo?.departmentID === 8 || userInfo?.departmentID === 10;

  useEffect(() => {
    setIsLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/payment/getPaymentKanban`)
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

  // ── Search ──────────────────────────────────────────────────────────────
  const searched = useMemo(() => {
    const q = searchQuery.toLowerCase();
    if (!q) return lpoRows;
    return lpoRows.filter(
      (row) =>
        `mr-${String(row.mr_header_id).padStart(5, "0")}`.includes(q) ||
        `lpo-${String(row.id).padStart(5, "0")}`.includes(q) ||
        (row.project_name ?? "").toLowerCase().includes(q) ||
        (row.supplier_name ?? "").toLowerCase().includes(q) ||
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

      return true;
    });
  }, [searched, filters]);

  // Always keep unpaid first, paid last; then apply column sort within each group
  const sorted = useMemo(() => {
    const base = [...filtered].sort((a, b) => a.is_paid - b.is_paid);
    if (!sortCol) return base;
    return base.sort((a, b) => {
      // Keep paid/unpaid grouping intact — only sort within same is_paid group
      if (a.is_paid !== b.is_paid) return a.is_paid - b.is_paid;
      const aVal = (a as Record<string, unknown>)[sortCol] as number;
      const bVal = (b as Record<string, unknown>)[sortCol] as number;
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

  // ── Pagination ──────────────────────────────────────────────────────────
  const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginated = sorted.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Reset to page 1 on search / filter / sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filters, sortCol, sortDir]);

  // ── Active filter helpers ───────────────────────────────────────────────
  const hasActiveFilters =
    filters.selectedVendors.length > 0 ||
    filters.selectedPaymentTypes.length > 0 ||
    filters.selectedStatuses.length > 0;

  const resetAllFilters = () => setFilters(defaultPaymentFilters);

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
          gap: "10px",
          marginBottom: "20px",
          flexWrap: "wrap",
        }}
      >
        <PaymentFilterButton
          vendors={vendorList}
          onApplyFilters={setFilters}
          currentFilters={filters}
        />

        {hasActiveFilters && (
          <>
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
      ) : (
        <>
          <table
            className="items-table"
            style={{ tableLayout: "fixed", width: "100%" }}
          >
            <colgroup>
              <col style={{ width: "140px" }} />
              <col style={{ width: "140px" }} />
              <col style={{ width: "160px" }} />
              <col style={{ width: "200px" }} />
              <col style={{ width: "150px" }} />
              <col style={{ width: "120px" }} />
              <col style={{ width: "75px" }} />
            </colgroup>
            <thead>
              <tr>
                <th>MR NUMBER</th>
                <th>LPO NUMBER</th>
                <th>TYPE</th>
                <th
                  style={{ cursor: "pointer", userSelect: "none" }}
                  onClick={() => handleSort("outstanding")}
                >
                  OUTSTANDING AMOUNT{sortIcon("outstanding")}
                </th>
                <th>DUE DATE</th>
                <th>STATUS</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((row) => {
                const isPaid = row.is_paid === 1;
                const dueDate = getDueDate(row);
                const overdue = !isPaid && isDueOverdue(row);

                return (
                  <tr key={row.id}>
                    {/* MR NUMBER */}
                    <td>MR-{String(row.mr_header_id).padStart(5, "0")}</td>

                    {/* LPO NUMBER */}
                    <td>LPO-{String(row.id).padStart(5, "0")}</td>

                    {/* TYPE */}
                    <td>
                      <SupplierTypePill type={row.supplier_type} />
                    </td>

                    {/* OUTSTANDING AMOUNT */}
                    <td style={{ whiteSpace: "nowrap" }}>
                      <span>
                        AED {formatAED(isPaid ? 0 : Number(row.outstanding))}
                      </span>
                    </td>

                    {/* DUE DATE */}
                    <td style={{ whiteSpace: "nowrap" }}>
                      {dueDate === "N/A" ? (
                        <span>N/A</span>
                      ) : (
                        <span>{dueDate}</span>
                      )}
                    </td>

                    {/* STATUS */}
                    <td>
                      <StatusPill isPaid={isPaid} />
                    </td>

                    {/* External link */}
                    <td>
                      {canView && (
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
    </div>
  );
}
