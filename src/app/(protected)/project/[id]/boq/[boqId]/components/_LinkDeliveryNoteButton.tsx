"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import FormPopUp from "@/app/components/FormPopup";
import Button from "@/app/components/Button";
import { toast } from "@/app/components/Toast";
import DateRangeButton, {
  DateRange,
  formatRangeLabel,
} from "@/app/components/_DateRangeButton";
import TransactionDetailsPopUpButton from "@/app/(protected)/inventory/[id]/components/_IssueDetailsPopUpButton";

type BoqLink = {
  boq_header_id: number;
  project_name: string;
  item_name: string;
  category_order: number;
  subcategory_order: number;
  item_order: number;
};

type IssueTransaction = {
  transaction_id: number;
  type: string;
  from_location: string;
  purpose: string;
  receiver_name: string | null;
  received: number;
  created_on: string;
  project_name: string | null;
  descriptions: string[] | null;
  boq_links: BoqLink[] | null;
};

type Filters = {
  projects: Set<string>;
  purposes: Set<string>;
  recipients: Set<string>;
  dateRange: DateRange;
};

const defaultDateRange: DateRange = {
  start: null,
  end: null,
  preset: "All time",
};
const defaultFilters = (): Filters => ({
  projects: new Set(),
  purposes: new Set(),
  recipients: new Set(),
  dateRange: defaultDateRange,
});

type Props = {
  boqLineId: number;
  onLinked: () => void;
  onOpen?: () => void;
  onClose?: () => void;
};

export default function LinkDeliveryNoteButton({
  boqLineId,
  onLinked,
  onOpen,
  onClose,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [transactions, setTransactions] = useState<IssueTransaction[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTransactionId, setSelectedTransactionId] = useState<
    number | null
  >(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // Applied filters
  const [filters, setFilters] = useState<Filters>(defaultFilters());
  // Temp filters (inside filter popup before confirm)
  const [tempFilters, setTempFilters] = useState<Filters>(defaultFilters());

  // Per-section search inside filter popup
  const [projectSearch, setProjectSearch] = useState("");
  const [purposeSearch, setPurposeSearch] = useState("");
  const [recipientSearch, setRecipientSearch] = useState("");

  const searchIcon = "/icons/search.svg";

  const getTransferTypeLabel = (type: string) => {
    const t = type?.toLowerCase() ?? "";
    if (t.includes("transfer")) return "MATERIAL TRANSFER";
    if (t.includes("issue")) return "ISSUE FOR USE";
    if (t.includes("send")) return "SEND FOR PROCESSING";
    return type || "-";
  };

  const getTransferStatus = (type: string, received: number) => {
    if (received === 1) {
      if (type?.toLowerCase().includes("issue"))
        return {
          label: "STOCK ISSUED",
          bgColor: "rgba(255,186,187,1)",
          textColor: "rgba(197,12,15,1)",
        };
      if (type?.toLowerCase().includes("transfer"))
        return {
          label: "STOCK TRANSFERRED",
          bgColor: "rgba(255,186,187,1)",
          textColor: "rgba(197,12,15,1)",
        };
      if (type?.toLowerCase().includes("send"))
        return {
          label: "STOCK SENT FOR PROCESSING",
          bgColor: "rgba(255,186,187,1)",
          textColor: "rgba(197,12,15,1)",
        };
    } else {
      if (
        type?.toLowerCase().includes("issue") ||
        type?.toLowerCase().includes("transfer") ||
        type?.toLowerCase().includes("send")
      ) {
        return {
          label: "PENDING",
          bgColor: "rgba(255,242,196,1)",
          textColor: "rgba(180,98,10,1)",
        };
      }
    }
    return {
      label: "COMPLETED",
      bgColor: "rgba(149,222,189,1)",
      textColor: "rgba(0,108,60,1)",
    };
  };
  const filterIcon = "/icons/filter.svg";
  const crossIcon = "/icons/cross-small.svg";

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setSelected([]);
    setSearchQuery("");
    setFilters(defaultFilters());
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/boq/getIssueTransactions`)
      .then((r) => r.json())
      .then((data) => setTransactions(Array.isArray(data) ? data : []))
      .catch(() => setTransactions([]))
      .finally(() => setLoading(false));
  }, [isOpen]);

  // Derive unique option lists from all transactions
  const allProjects = useMemo(
    () =>
      [
        ...new Set(
          transactions.map((t) => t.project_name).filter(Boolean) as string[],
        ),
      ].sort(),
    [transactions],
  );
  const allPurposes = useMemo(
    () =>
      [...new Set(transactions.map((t) => t.purpose).filter(Boolean))].sort(),
    [transactions],
  );
  const allRecipients = useMemo(
    () =>
      [
        ...new Set(
          transactions.map((t) => t.receiver_name).filter(Boolean) as string[],
        ),
      ].sort(),
    [transactions],
  );

  // Filtered list
  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return transactions.filter((t) => {
      // Text search
      if (q) {
        const match =
          String(t.transaction_id).includes(q) ||
          t.descriptions?.some((d) => d?.toLowerCase().includes(q)) ||
          t.from_location?.toLowerCase().includes(q) ||
          t.purpose?.toLowerCase().includes(q) ||
          t.receiver_name?.toLowerCase().includes(q) ||
          t.project_name?.toLowerCase().includes(q);
        if (!match) return false;
      }
      // Project filter
      if (
        filters.projects.size > 0 &&
        !filters.projects.has(t.project_name ?? "")
      )
        return false;
      // Purpose filter
      if (filters.purposes.size > 0 && !filters.purposes.has(t.purpose))
        return false;
      // Recipient filter
      if (
        filters.recipients.size > 0 &&
        !filters.recipients.has(t.receiver_name ?? "")
      )
        return false;
      // Date range filter
      const { start, end, preset } = filters.dateRange;
      if (preset !== "All time" && (start || end)) {
        const created = new Date(t.created_on);
        if (start && created < start) return false;
        if (end && created > end) return false;
      }
      return true;
    });
  }, [transactions, searchQuery, filters]);

  // Reset to page 1 whenever filtered results change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filters]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedItems = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const activeFilterCount =
    filters.projects.size +
    filters.purposes.size +
    filters.recipients.size +
    (filters.dateRange.preset !== "All time" || filters.dateRange.start
      ? 1
      : 0);

  const toggle = (id: number) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const toggleTempSet = (
    key: "projects" | "purposes" | "recipients",
    value: string,
  ) => {
    setTempFilters((prev) => {
      const next = new Set(prev[key]);
      next.has(value) ? next.delete(value) : next.add(value);
      return { ...prev, [key]: next };
    });
  };

  const openFilter = () => {
    setTempFilters({
      projects: new Set(filters.projects),
      purposes: new Set(filters.purposes),
      recipients: new Set(filters.recipients),
      dateRange: { ...filters.dateRange },
    });
    setProjectSearch("");
    setPurposeSearch("");
    setRecipientSearch("");
    setFilterOpen(true);
  };

  const applyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters({ ...tempFilters });
    setFilterOpen(false);
  };

  const resetFilter = () => {
    setTempFilters(defaultFilters());
    setProjectSearch("");
    setPurposeSearch("");
    setRecipientSearch("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selected.length === 0) {
      toast("Please select at least one transaction", "error");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/boq/linkDeliveryNote`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            boq_line_id: boqLineId,
            transaction_ids: selected,
          }),
        },
      );
      if (!res.ok) throw new Error();
      toast("Delivery note(s) linked successfully", "success");
      setIsOpen(false);
      onClose?.();
      onLinked();
    } catch {
      toast("Failed to link delivery notes", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button
        componentType="button"
        bgColor="black"
        borderColor="black"
        textColor="white"
        onClick={(e) => {
          e.preventDefault();
          setIsOpen(true);
          onOpen?.();
        }}
      >
        LINK DELIVERY NOTE +
      </Button>

      {isOpen &&
        typeof window !== "undefined" &&
        createPortal(
          <FormPopUp
            header="LINK DELIVERY NOTE"
            setIsOpen={(val) => {
              setIsOpen(val);
              if (!val) onClose?.();
            }}
            handleSubmit={handleSubmit}
            addButtonLabel="CONFIRM"
            haveLoadingState
            style={{ width: "75dvw", height: "95dvh" }}
            stickyFooter={
              totalPages > 1 ? (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => p - 1)}
                    disabled={currentPage === 1}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "5px",
                      border: "1px solid rgba(223,223,223,1)",
                      backgroundColor: "white",
                      color: "black",
                      cursor: currentPage === 1 ? "not-allowed" : "pointer",
                      fontWeight: "600",
                      minWidth: "40px",
                      opacity: currentPage === 1 ? 0.4 : 1,
                    }}
                  >
                    ‹
                  </button>
                  {(() => {
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
                      for (let i = totalPages - 4; i <= totalPages; i++)
                        pages.push(i);
                    } else {
                      pages.push(1);
                      pages.push("...");
                      for (let i = currentPage - 1; i <= currentPage + 1; i++)
                        pages.push(i);
                      pages.push("...");
                      pages.push(totalPages);
                    }
                    return pages.map((page, idx) => (
                      <button
                        key={idx}
                        type="button"
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
                    ));
                  })()}
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => p + 1)}
                    disabled={currentPage === totalPages}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "5px",
                      border: "1px solid rgba(223,223,223,1)",
                      backgroundColor: "white",
                      color: "black",
                      cursor:
                        currentPage === totalPages ? "not-allowed" : "pointer",
                      fontWeight: "600",
                      minWidth: "40px",
                      opacity: currentPage === totalPages ? 0.4 : 1,
                    }}
                  >
                    ›
                  </button>
                </div>
              ) : undefined
            }
          >
            {/* Row 1: Search */}
            <div
              style={{
                position: "relative",
                maxWidth: "280px",
                marginBottom: "12px",
              }}
            >
              <input
                type="text"
                placeholder="SEARCH"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "7px 36px 7px 14px",
                  borderRadius: "8px",
                  border: "1px solid rgba(223,223,223,1)",
                  fontSize: "13px",
                  boxSizing: "border-box",
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
                  opacity: 0.45,
                  pointerEvents: "none",
                }}
              />
            </div>

            {/* Row 2: Filter button + active chips */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "20px",
                flexWrap: "wrap",
              }}
            >
              <Button
                componentType="button"
                bgColor="white"
                borderColor="rgba(241,244,246,1)"
                textColor="black"
                onClick={(e) => {
                  e.preventDefault();
                  openFilter();
                }}
                style={{ borderRadius: "50px" }}
              >
                FILTER <img src={filterIcon} alt="filter" />
              </Button>

              {filters.projects.size > 0 && (
                <Button
                  componentType="button"
                  bgColor="rgba(239,239,239,1)"
                  borderColor="transparent"
                  textColor="black"
                  onClick={() =>
                    setFilters((f) => ({ ...f, projects: new Set() }))
                  }
                  style={{
                    borderRadius: "50px",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  PROJECT:{" "}
                  <span
                    style={{ color: "rgba(16,185,129,1)", textWrap: "nowrap" }}
                  >
                    {[...filters.projects][0].toUpperCase()}
                    {filters.projects.size > 1
                      ? `, +${filters.projects.size - 1} MORE`
                      : ""}
                  </span>
                  <img
                    src={crossIcon}
                    alt="remove"
                    style={{ width: "10px", opacity: 0.6, marginBottom: "2px" }}
                  />
                </Button>
              )}
              {filters.purposes.size > 0 && (
                <Button
                  componentType="button"
                  bgColor="rgba(239,239,239,1)"
                  borderColor="transparent"
                  textColor="black"
                  onClick={() =>
                    setFilters((f) => ({ ...f, purposes: new Set() }))
                  }
                  style={{
                    borderRadius: "50px",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  PURPOSE:{" "}
                  <span
                    style={{ color: "rgba(16,185,129,1)", textWrap: "nowrap" }}
                  >
                    {[...filters.purposes][0].toUpperCase()}
                    {filters.purposes.size > 1
                      ? `, +${filters.purposes.size - 1} MORE`
                      : ""}
                  </span>
                  <img
                    src={crossIcon}
                    alt="remove"
                    style={{ width: "10px", opacity: 0.6, marginBottom: "2px" }}
                  />
                </Button>
              )}
              {filters.recipients.size > 0 && (
                <Button
                  componentType="button"
                  bgColor="rgba(239,239,239,1)"
                  borderColor="transparent"
                  textColor="black"
                  onClick={() =>
                    setFilters((f) => ({ ...f, recipients: new Set() }))
                  }
                  style={{
                    borderRadius: "50px",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  RECIPIENT:{" "}
                  <span
                    style={{ color: "rgba(16,185,129,1)", textWrap: "nowrap" }}
                  >
                    {[...filters.recipients][0].toUpperCase()}
                    {filters.recipients.size > 1
                      ? `, +${filters.recipients.size - 1} MORE`
                      : ""}
                  </span>
                  <img
                    src={crossIcon}
                    alt="remove"
                    style={{ width: "10px", opacity: 0.6, marginBottom: "2px" }}
                  />
                </Button>
              )}
              {(filters.dateRange.preset !== "All time" ||
                filters.dateRange.start) && (
                <Button
                  componentType="button"
                  bgColor="rgba(239,239,239,1)"
                  borderColor="transparent"
                  textColor="black"
                  onClick={() =>
                    setFilters((f) => ({ ...f, dateRange: defaultDateRange }))
                  }
                  style={{
                    borderRadius: "50px",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  DATE:{" "}
                  <span
                    style={{ color: "rgba(16,185,129,1)", textWrap: "nowrap" }}
                  >
                    {formatRangeLabel(
                      filters.dateRange.start,
                      filters.dateRange.end,
                      filters.dateRange.preset,
                    )}
                  </span>
                  <img
                    src={crossIcon}
                    alt="remove"
                    style={{ width: "10px", opacity: 0.6, marginBottom: "2px" }}
                  />
                </Button>
              )}
            </div>

            {/* Table */}
            {loading ? (
              <SkeletonTable />
            ) : filtered.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px",
                  color: "rgba(140,140,140,1)",
                  fontSize: "13px",
                  border: "1px dashed rgba(220,220,220,1)",
                  borderRadius: "8px",
                }}
              >
                {searchQuery || activeFilterCount > 0
                  ? "No results match your search / filters"
                  : "No issue transactions found"}
              </div>
            ) : (
              <table
                className="items-table two-toned"
                style={{ tableLayout: "fixed", width: "100%" }}
              >
                <colgroup>
                  <col style={{ width: "46px" }} />
                  <col style={{ width: "175px" }} />
                  <col />
                  <col style={{ width: "175px" }} />
                  <col style={{ width: "200px" }} />
                </colgroup>
                <thead>
                  <tr>
                    <th></th>
                    <th>TRANSACTION NUMBER</th>
                    <th>DESCRIPTION</th>
                    <th>TYPE</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map((t) => {
                    const isSelected = selected.includes(t.transaction_id);
                    const status = getTransferStatus(t.type, t.received);
                    const typeLabel = getTransferTypeLabel(t.type);
                    return (
                      <tr
                        key={t.transaction_id}
                        onClick={() => toggle(t.transaction_id)}
                        style={{ cursor: "pointer" }}
                      >
                        <td onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggle(t.transaction_id)}
                            style={{
                              width: "16px",
                              height: "16px",
                              cursor: "pointer",
                              accentColor: "rgba(0,163,93,1)",
                            }}
                          />
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedTransactionId(t.transaction_id)
                            }
                            style={{
                              background: "none",
                              border: "none",
                              padding: 0,
                              cursor: "pointer",
                              color: "rgba(37,150,190,1)",
                              fontWeight: 600,
                              fontSize: "inherit",
                              whiteSpace: "nowrap",
                            }}
                          >
                            TA-{String(t.transaction_id).padStart(5, "0")}
                          </button>
                        </td>
                        <td style={{ wordBreak: "break-word" }}>
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "6px",
                            }}
                          >
                            {t.descriptions &&
                            t.descriptions.filter(Boolean).length > 0 ? (
                              t.descriptions
                                .filter(Boolean)
                                .map((d, i) => <span key={i}>{d}</span>)
                            ) : (
                              <span>-</span>
                            )}
                            {t.boq_links && t.boq_links.length > 0 && (
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "4px",
                                  marginTop: "4px",
                                }}
                              >
                                {t.boq_links.map((link, i) => (
                                  <span
                                    key={i}
                                    style={{
                                      display: "inline-block",
                                      padding: "3px 10px",
                                      borderRadius: "50px",
                                      fontSize: "11px",
                                      fontWeight: 600,
                                      backgroundColor: "rgba(239,239,239,1)",
                                      color: "rgba(60,60,60,1)",
                                      width: "fit-content",
                                    }}
                                  >
                                    Linked with BOQ-
                                    {String(link.boq_header_id).padStart(
                                      3,
                                      "0",
                                    )}{" "}
                                    {link.project_name} in {link.category_order}
                                    .{link.subcategory_order}.{link.item_order}:{" "}
                                    {link.item_name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                        <td
                          style={{
                            textTransform: "uppercase",
                            fontSize: "12px",
                          }}
                        >
                          {typeLabel}
                        </td>
                        <td>
                          <div
                            className="approval-pill normal-text"
                            style={{
                              backgroundColor: status.bgColor,
                              color: status.textColor,
                              textTransform: "uppercase",
                              fontWeight: "normal",
                            }}
                          >
                            {status.label}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </FormPopUp>,
          document.body,
        )}

      {/* Transaction detail popup */}
      {selectedTransactionId !== null &&
        typeof window !== "undefined" &&
        createPortal(
          <TransactionDetailsPopUpButton
            transferID={selectedTransactionId}
            autoOpen
            onClose={() => setSelectedTransactionId(null)}
          />,
          document.body,
        )}

      {/* Filter popup */}
      {filterOpen &&
        typeof window !== "undefined" &&
        createPortal(
          <FormPopUp
            header="FILTER TRANSACTIONS"
            setIsOpen={setFilterOpen}
            handleSubmit={applyFilter}
            addButtonLabel="CONFIRM"
            secondButton={
              <Button
                componentType="button"
                bgColor="white"
                borderColor="black"
                textColor="black"
                type="button"
                onClick={resetFilter}
              >
                RESET
              </Button>
            }
            style={{ minWidth: "600px" }}
          >
            {/* DATE */}
            <div style={{ marginBottom: "30px" }}>
              <h3
                style={{
                  marginBottom: "15px",
                  fontSize: "14px",
                  fontWeight: "600",
                }}
              >
                DATE
              </h3>
              <DateRangeButton
                value={tempFilters.dateRange}
                onChange={(range) =>
                  setTempFilters((f) => ({ ...f, dateRange: range }))
                }
                popupAlign="left"
              />
            </div>

            {/* PROJECT */}
            <div style={{ marginBottom: "30px" }}>
              <h3
                style={{
                  marginBottom: "15px",
                  fontSize: "14px",
                  fontWeight: "600",
                }}
              >
                PROJECT
              </h3>
              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  padding: "10px",
                }}
              >
                <div style={{ position: "relative", marginBottom: "15px" }}>
                  <input
                    type="text"
                    placeholder="SEARCH"
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 40px 10px 15px",
                      borderRadius: "8px",
                      border: "1px solid rgba(223,223,223,1)",
                      fontSize: "14px",
                      backgroundColor: "rgba(245,245,245,1)",
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
                <div style={{ marginBottom: "10px" }}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      className="filter-checkbox"
                      checked={
                        allProjects.length > 0 &&
                        allProjects.every((p) => tempFilters.projects.has(p))
                      }
                      onChange={(e) =>
                        setTempFilters((f) => ({
                          ...f,
                          projects: e.target.checked
                            ? new Set(allProjects)
                            : new Set(),
                        }))
                      }
                    />
                    <h4>Select All</h4>
                  </label>
                </div>
                <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                  {allProjects.filter((p) =>
                    p.toLowerCase().includes(projectSearch.toLowerCase()),
                  ).length > 0 ? (
                    allProjects
                      .filter((p) =>
                        p.toLowerCase().includes(projectSearch.toLowerCase()),
                      )
                      .map((p) => (
                        <div key={p} style={{ marginBottom: "10px" }}>
                          <label
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                              cursor: "pointer",
                            }}
                          >
                            <input
                              type="checkbox"
                              className="filter-checkbox"
                              checked={tempFilters.projects.has(p)}
                              onChange={() => toggleTempSet("projects", p)}
                            />
                            <h4>{p}</h4>
                          </label>
                        </div>
                      ))
                  ) : (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "20px",
                        color: "#888",
                      }}
                    >
                      No projects found
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* PURPOSE */}
            <div style={{ marginBottom: "30px" }}>
              <h3
                style={{
                  marginBottom: "15px",
                  fontSize: "14px",
                  fontWeight: "600",
                }}
              >
                PURPOSE
              </h3>
              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  padding: "10px",
                }}
              >
                <div style={{ position: "relative", marginBottom: "15px" }}>
                  <input
                    type="text"
                    placeholder="SEARCH"
                    value={purposeSearch}
                    onChange={(e) => setPurposeSearch(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 40px 10px 15px",
                      borderRadius: "8px",
                      border: "1px solid rgba(223,223,223,1)",
                      fontSize: "14px",
                      backgroundColor: "rgba(245,245,245,1)",
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
                <div style={{ marginBottom: "10px" }}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      className="filter-checkbox"
                      checked={
                        allPurposes.length > 0 &&
                        allPurposes.every((p) => tempFilters.purposes.has(p))
                      }
                      onChange={(e) =>
                        setTempFilters((f) => ({
                          ...f,
                          purposes: e.target.checked
                            ? new Set(allPurposes)
                            : new Set(),
                        }))
                      }
                    />
                    <h4>Select All</h4>
                  </label>
                </div>
                <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                  {allPurposes.filter((p) =>
                    p.toLowerCase().includes(purposeSearch.toLowerCase()),
                  ).length > 0 ? (
                    allPurposes
                      .filter((p) =>
                        p.toLowerCase().includes(purposeSearch.toLowerCase()),
                      )
                      .map((p) => (
                        <div key={p} style={{ marginBottom: "10px" }}>
                          <label
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                              cursor: "pointer",
                            }}
                          >
                            <input
                              type="checkbox"
                              className="filter-checkbox"
                              checked={tempFilters.purposes.has(p)}
                              onChange={() => toggleTempSet("purposes", p)}
                            />
                            <h4>{p}</h4>
                          </label>
                        </div>
                      ))
                  ) : (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "20px",
                        color: "#888",
                      }}
                    >
                      No purposes found
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RECIPIENT */}
            <div style={{ marginBottom: "30px" }}>
              <h3
                style={{
                  marginBottom: "15px",
                  fontSize: "14px",
                  fontWeight: "600",
                }}
              >
                RECIPIENT
              </h3>
              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  padding: "10px",
                }}
              >
                <div style={{ position: "relative", marginBottom: "15px" }}>
                  <input
                    type="text"
                    placeholder="SEARCH"
                    value={recipientSearch}
                    onChange={(e) => setRecipientSearch(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 40px 10px 15px",
                      borderRadius: "8px",
                      border: "1px solid rgba(223,223,223,1)",
                      fontSize: "14px",
                      backgroundColor: "rgba(245,245,245,1)",
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
                <div style={{ marginBottom: "10px" }}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      className="filter-checkbox"
                      checked={
                        allRecipients.length > 0 &&
                        allRecipients.every((r) =>
                          tempFilters.recipients.has(r),
                        )
                      }
                      onChange={(e) =>
                        setTempFilters((f) => ({
                          ...f,
                          recipients: e.target.checked
                            ? new Set(allRecipients)
                            : new Set(),
                        }))
                      }
                    />
                    <h4>Select All</h4>
                  </label>
                </div>
                <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                  {allRecipients.filter((r) =>
                    r.toLowerCase().includes(recipientSearch.toLowerCase()),
                  ).length > 0 ? (
                    allRecipients
                      .filter((r) =>
                        r.toLowerCase().includes(recipientSearch.toLowerCase()),
                      )
                      .map((r) => (
                        <div key={r} style={{ marginBottom: "10px" }}>
                          <label
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                              cursor: "pointer",
                            }}
                          >
                            <input
                              type="checkbox"
                              className="filter-checkbox"
                              checked={tempFilters.recipients.has(r)}
                              onChange={() => toggleTempSet("recipients", r)}
                            />
                            <h4>{r}</h4>
                          </label>
                        </div>
                      ))
                  ) : (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "20px",
                        color: "#888",
                      }}
                    >
                      No recipients found
                    </div>
                  )}
                </div>
              </div>
            </div>
          </FormPopUp>,
          document.body,
        )}
    </>
  );
}

function SkeletonTable() {
  return (
    <table className="items-table" style={{ width: "100%" }}>
      <thead>
        <tr>
          {[46, 150, 0, 140, 130, 130].map((w, i) => (
            <th key={i} style={w ? { width: w } : {}}>
              <div
                className="skeleton-pulse"
                style={{ height: "10px", borderRadius: "4px", width: "60%" }}
              />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: 6 }).map((_, r) => (
          <tr key={r}>
            {Array.from({ length: 6 }).map((_, c) => (
              <td key={c}>
                <div
                  className="skeleton-pulse"
                  style={{ height: "13px", borderRadius: "4px" }}
                />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
