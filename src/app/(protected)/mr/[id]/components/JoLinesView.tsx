"use client";

import { JoLine } from "../types/joLine";
import { MrHeader } from "../types/mrHeader";
import { useAuth } from "@/app/context/AuthContext";
import React, { useState, useEffect, useCallback } from "react";
import Button from "@/app/components/Button";
import AddJoItemButton from "./department/_AddJoItemButton";
import JoApprovalButtons from "./manager/_JoApprovalButtons";
import InfoPopUpButton from "@/app/components/_InfoPopUpButton";
import BoqReferencePopUp from "../../components/BoqReferencePopUp";
import SubmitForInitialApprovalButton from "./quantitySurveyor/_SubmitForInitialApprovalButton";
import SubmitForQuotationsButton from "./manager/_SubmitForQuotationsButton";
import SubmitForResubmissionButton from "./manager/_SubmitForInitialResubmissionButton";
import { DeleteJoItemButton } from "./department/_DeleteJoItemButton";
import EditJoItemButton from "./department/_EditJoItemButton";
import SubcontractorAndQuotationButton from "./procurement/_SubcontractorAndQuotationButton";
import JoPriceApprovalButton from "./manager/_JoPriceApprovalButton";
import SubmitForJoPriceApprovalButton from "./procurement/_SubmitForJoPriceApprovalButton";
import SubmitForPricingResubmissionButton from "./manager/_SubmitForPriceResubmissionButton";
import SubmitForJoCompletionButton from "./procurement/_SubmitForJoCompletionButton";
import IssueJoLpoButton from "./procurement/_IssueJoLpoButton";
import SubmitJoFromLpoButton from "./procurement/_SubmitJoFromLpoButton";
import UploadJoInvoiceButton from "./procurement/_UploadJoInvoiceButton";
import CommentsSection from "@/app/components/CommentsSection";
import { formatPriceAED } from "@/lib/formatPrice";
import JoRfqButton from "./procurement/_JoRfqButton";
import BulkSubcontractorButton, {
  BulkQuotationData,
} from "./procurement/_BulkSubcontractorButton";
import InputItem from "@/app/components/InputItem";
import CreatePaymentRequestButton from "./procurement/_CreatePaymentRequestButton";

// BOQ item detail (fetched lazily per JO line card)
type BoqLineDetail = {
  boq_line_id: number;
  item_name: string;
  item_description?: string;
  category: string;
  sub_category: string;
  boq_qty: number;
  unit: string;
  rate_per_quantity: number;
  total_cost: number;
  subcontracted_qty: number;
  approved_subcontractor_id?: number | null;
  approved_subcontractor_name?: string | null;
  approved_total_price?: number | null;
};

type JoLinesViewProps = {
  joLines: JoLine[];
  mrHeader: MrHeader;
};

// Map attachment type keys to display labels
const ATTACHMENT_TYPE_LABELS: Record<string, string> = {
  design_drawings: "Design & drawings",
  hse_compliance: "HSE & compliance",
  scope_pricing: "Scope & pricing",
  contract_commercial: "Contract & commercial",
  technical_specifications: "Technical specifications",
  surveys_existing_conditions: "Surveys & existing conditions",
  programme_logistics: "Programme & logistics",
  prequalification_admin: "Pre-qualification & admin",
};

// Add thousand-separator commas while preserving decimals
const formatInputPrice = (val: string): string => {
  if (!val) return "";
  const parts = val.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
};

// Strip trailing zeros — show "63" not "63.00", but keep "63.5"
const formatQty = (value: unknown): string => {
  const num = Number(value);
  if (isNaN(num)) return "-";
  if (Number.isInteger(num)) return num.toString();
  return parseFloat(num.toFixed(6)).toString();
};

export default function JoLinesView({ joLines, mrHeader }: JoLinesViewProps) {
  const { userInfo } = useAuth();

  const externalLinkIcon = "/icons/external-link.svg";

  // ── RFQ State ──────────────────────────────────────
  const [rfqSelectedIds, setRfqSelectedIds] = useState<number[]>([]);
  const [rfqExists, setRfqExists] = useState(false);

  const isProcurementQuotation =
    [7, 11].includes(mrHeader.progress_id) && userInfo?.departmentID === 9;

  // Bulk subcontractor + quotation state (procurement quotation stage only)
  const [bulkQuotationData, setBulkQuotationData] =
    useState<BulkQuotationData | null>(null);
  const [bulkTotalPrices, setBulkTotalPrices] = useState<{
    [boq_line_id: number]: string;
  }>({});

  const toggleRfqSelection = (id: number) => {
    setRfqSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toggleAllRfq = () => {
    if (rfqSelectedIds.length === joLines.length) {
      setRfqSelectedIds([]);
    } else {
      setRfqSelectedIds(joLines.map((l) => l.id));
    }
  };

  const canSeePrice =
    userInfo?.departmentID === 8 ||
    userInfo?.departmentID === 9 ||
    userInfo?.departmentID === 10 ||
    userInfo?.departmentID === 16;

  // Check if all items have been reviewed (approved or rejected)
  const allItemsReviewed = joLines.every(
    (item) =>
      item.approval_status === "Approved" ||
      item.approval_status === "Rejected",
  );

  const allItemsApproved = joLines.every(
    (item) => item.approval_status === "Approved",
  );

  const hasRejectedItems = joLines.some(
    (item) => item.approval_status === "Rejected",
  );

  // Check if all lines have approved subcontractor (for completion)
  const allLinesHaveApprovedSubcontractor = joLines.every(
    (item) =>
      item.approved_subcontractor_quotation_id &&
      item.approved_subcontractor_quotation_id > 0,
  );

  // Calculate total budget
  const totalBudget = joLines.reduce(
    (sum, item) => sum + (Number(item.budget_estimate) || 0),
    0,
  );

  // Calculate total approved price (after subcontractor & quotation approval)
  const totalApprovedPrice = joLines.reduce(
    (sum, item) => sum + (Number(item.approved_total_price) || 0),
    0,
  );

  const hasAnyApprovedPrice = joLines.some(
    (item) =>
      item.approved_total_price != null &&
      Number(item.approved_total_price) > 0,
  );

  // Track live prices when manager selects/changes quotation (before page refresh)
  const [livePrices, setLivePrices] = useState<Record<number, number>>({});
  const [lpoId, setLpoId] = useState<number | null>(null);
  const [joLpoVatRate, setJoLpoVatRate] = useState<number>(5);
  const [joLpoTotal, setJoLpoTotal] = useState<number | null>(null);
  const [hasLpo, setHasLpo] = useState<boolean>(false);
  const [lpoUpdateCounter, setLpoUpdateCounter] = useState(0);

  // Invoice files for JO (stored on mr_headers.jo_invoice_file)
  const [joInvoiceFiles, setJoInvoiceFiles] = useState<string[]>(() => {
    if (!mrHeader.jo_invoice_file) return [];
    try {
      const parsed =
        typeof mrHeader.jo_invoice_file === "string"
          ? JSON.parse(mrHeader.jo_invoice_file)
          : mrHeader.jo_invoice_file;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const handleTotalPriceChange = (joLineId: number, totalPrice: number) => {
    setLivePrices((prev) => ({ ...prev, [joLineId]: totalPrice }));
  };

  // ── Hierarchical view state (stages 7, 10, 11, 12, 25) ──────────────────
  const isHierarchicalView = [7, 10, 11, 12, 25].includes(mrHeader.progress_id);

  const [expandedJoLines, setExpandedJoLines] = useState<Set<number>>(
    new Set(),
  );
  const [boqItemsByJoLine, setBoqItemsByJoLine] = useState<
    Record<number, BoqLineDetail[]>
  >({});

  // Bulk quotation flow: all JO lines must be expanded and every BOQ item must have a valid price
  const allBulkPricesEntered =
    bulkQuotationData !== null &&
    joLines.length > 0 &&
    joLines.every((line) => boqItemsByJoLine[line.id] !== undefined) &&
    Object.values(boqItemsByJoLine)
      .flat()
      .every((item) => {
        const val = bulkTotalPrices[item.boq_line_id];
        return val && parseFloat(val) > 0;
      });

  const [loadingBoqItems, setLoadingBoqItems] = useState<
    Record<number, boolean>
  >({});
  // Tracks the locked subcontractor per JO line (set by the first BOQ item that gets a quotation)
  const [lockedSubcontractorByJoLine, setLockedSubcontractorByJoLine] =
    useState<Record<number, number | string>>({});

  async function fetchBoqItemsForJoLine(joLineId: number) {
    if (boqItemsByJoLine[joLineId] !== undefined) return; // already loaded
    setLoadingBoqItems((prev) => ({ ...prev, [joLineId]: true }));
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/jo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "getBoqLinesWithDetailsByJoLineID",
          jo_line_id: joLineId,
        }),
      });
      const data: BoqLineDetail[] = await res.json();
      setBoqItemsByJoLine((prev) => ({ ...prev, [joLineId]: data || [] }));
    } catch {
      setBoqItemsByJoLine((prev) => ({ ...prev, [joLineId]: [] }));
    } finally {
      setLoadingBoqItems((prev) => ({ ...prev, [joLineId]: false }));
    }
  }

  const toggleJoLineExpanded = (joLineId: number) => {
    setExpandedJoLines((prev) => {
      const next = new Set(prev);
      if (next.has(joLineId)) {
        next.delete(joLineId);
      } else {
        next.add(joLineId);
        fetchBoqItemsForJoLine(joLineId);
      }
      return next;
    });
  };

  // Auto-expand all cards + pre-fetch BOQ items when entering hierarchical view
  const joLineIds = joLines.map((l) => l.id).join(",");
  useEffect(() => {
    if (!isHierarchicalView || joLines.length === 0) return;
    setExpandedJoLines(new Set(joLines.map((l) => l.id)));
    joLines.forEach((l) => fetchBoqItemsForJoLine(l.id));
  }, [isHierarchicalView, joLineIds]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch LPO VAT rate when in LPO & Invoice stage or beyond
  useEffect(() => {
    if (mrHeader.progress_id < 12) return;
    async function fetchLpoVatRate() {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo/getLPOByMrHeaderID`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mr_header_id: mrHeader.id }),
          },
        );
        const data = await res.json();
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          setJoLpoVatRate(Number(data.data[0].vat_rate ?? 5));
          setJoLpoTotal(Number(data.data[0].total) || null);
          setHasLpo(true);
        } else {
          setJoLpoTotal(null);
          setHasLpo(false);
        }
      } catch (err) {
        console.error("Error fetching JO LPO VAT rate:", err);
      }
    }
    fetchLpoVatRate();
  }, [mrHeader.id, mrHeader.progress_id, lpoUpdateCounter]);

  // Show total price column from manager price approval stage onwards
  const showTotalPriceColumn = mrHeader.progress_id >= 10 && canSeePrice;

  // Show subcontractor column from LPO & Invoice stage onwards (12 = LPO & Invoice, 25 = Completed)
  const showSubcontractorColumn = mrHeader.progress_id >= 12;

  // Hide subcontracted works value column for procurement at quotation (7) or LPO & Invoice (12)
  const showSubcontractedWorksValueColumn = userInfo?.departmentID !== 9;

  // Hide attachment column if no line has any attachments
  const showAttachmentsColumn = joLines.some(
    (item) => (item.jo_attachments || []).length > 0,
  );

  // ── Check if ANY line has a REJECTED quotation ──────────────────────────
  const [hasAnyRejectedQuotation, setHasAnyRejectedQuotation] = useState(false);

  const checkHasAnyRejectedQuotation = useCallback(async () => {
    if (![7, 11].includes(mrHeader.progress_id) || joLines.length === 0) {
      setHasAnyRejectedQuotation(false);
      return;
    }

    try {
      const results = await Promise.all(
        joLines.map(async (line) => {
          const res = await fetch(
            "/api/subcontractor/getAllSubcontractorAndQuotationByJoLineID",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: line.id }),
            },
          );
          if (!res.ok) return false;
          const data = await res.json();
          return (
            Array.isArray(data) &&
            data.some((q: any) => q.approval_status === "Rejected")
          );
        }),
      );

      const anyRejected = results.some((hasRejection) => hasRejection);
      setHasAnyRejectedQuotation(anyRejected);
    } catch (err) {
      console.error("Error checking rejected quotations:", err);
      setHasAnyRejectedQuotation(false);
    }
  }, [mrHeader.progress_id, joLines]);

  useEffect(() => {
    checkHasAnyRejectedQuotation();

    const handleQuotationsUpdated = () => {
      checkHasAnyRejectedQuotation();
    };

    window.addEventListener("joQuotationsUpdated", handleQuotationsUpdated);
    return () => {
      window.removeEventListener(
        "joQuotationsUpdated",
        handleQuotationsUpdated,
      );
    };
  }, [checkHasAnyRejectedQuotation]);

  // ── Check all BOQ line items (per JO line) have quotations ──────────────
  const [allLinesHaveQuotations, setAllLinesHaveQuotations] = useState(false);

  const checkAllLinesHaveQuotations = useCallback(async () => {
    if (![7, 11].includes(mrHeader.progress_id) || joLines.length === 0) {
      setAllLinesHaveQuotations(false);
      return;
    }

    try {
      const results = await Promise.all(
        joLines.map(async (line) => {
          const boqItems = boqItemsByJoLine[line.id];

          // BOQ items not yet loaded — not ready
          if (boqItems === undefined) return false;

          // JO line has no BOQ items — nothing to quote
          if (boqItems.length === 0) return true;

          // Every BOQ item must have at least one quotation
          const boqResults = await Promise.all(
            boqItems.map(async (boqItem) => {
              const res = await fetch(
                "/api/subcontractor/getAllSubcontractorAndQuotationByJoLineID",
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    id: line.id,
                    boq_line_id: boqItem.boq_line_id,
                  }),
                },
              );
              if (!res.ok) return false;
              const data = await res.json();
              return Array.isArray(data) && data.length > 0;
            }),
          );

          return boqResults.every((r) => r);
        }),
      );

      setAllLinesHaveQuotations(results.every((r) => r));
    } catch {
      setAllLinesHaveQuotations(false);
    }
  }, [mrHeader.progress_id, joLines, boqItemsByJoLine]);

  useEffect(() => {
    checkAllLinesHaveQuotations();

    const handleQuotationsUpdated = () => {
      checkAllLinesHaveQuotations();
    };

    window.addEventListener("joQuotationsUpdated", handleQuotationsUpdated);
    return () => {
      window.removeEventListener(
        "joQuotationsUpdated",
        handleQuotationsUpdated,
      );
    };
  }, [checkAllLinesHaveQuotations]);

  // Show quotation column at stages 7, 11
  const showQuotationColumn =
    [7, 11].includes(mrHeader.progress_id) && userInfo?.departmentID === 9;

  // Show price approval column at stages 10, 11
  const showPriceApprovalColumn =
    [10, 11].includes(mrHeader.progress_id) && userInfo?.departmentID === 8;

  // Show TOTAL PRICE column inside card — manager price approval stage only
  const showCardTotalPrice =
    mrHeader.progress_id === 10 && userInfo?.departmentID === 8;

  // Show approved subcontractor column inside BOQ items card — LPO & Invoice + Completed
  const showApprovedSubcontractorColumn = [12, 25].includes(
    mrHeader.progress_id,
  );

  // Track approved prices per BOQ item (keyed by boq_line_id)
  const [boqLineTotalPrices, setBoqLineTotalPrices] = useState<
    Record<number, number>
  >({});
  const handleBoqTotalPriceChange = (boqLineId: number, price: number) => {
    setBoqLineTotalPrices((prev) => ({ ...prev, [boqLineId]: price }));
  };

  return (
    <>
      <div className="mr-with-id">
        <div className="subcategory-section">
          <div
            className="subcategory-header"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h2 style={{ textTransform: "uppercase" }}>JOB ITEMS</h2>

            <div
              className="right"
              style={{ display: "flex", gap: "10px", alignItems: "center" }}
            >
              {(mrHeader.progress_id === 1 || mrHeader.progress_id === 5) &&
                userInfo?.departmentID === mrHeader.department_id && (
                  <AddJoItemButton
                    mrHeaderID={mrHeader.id}
                    projectID={mrHeader.project_id}
                  />
                )}

              {mrHeader.progress_id === 10 && userInfo?.departmentID === 8 && (
                <div id="jo-smart-select-portal"></div>
              )}

              {/* RFQ Button — procurement quotation stages only */}
              {isProcurementQuotation && (
                <JoRfqButton
                  mrHeader={mrHeader}
                  selectedIds={rfqSelectedIds}
                  onRfqLoaded={(rfq) => {
                    setRfqExists(!!rfq);
                    if (rfq) {
                      setRfqSelectedIds(rfq.jo_line_ids);
                    }
                  }}
                />
              )}

              {/* Bulk subcontractor & quotation — quotation stage only */}
              {mrHeader.progress_id === 7 &&
                userInfo?.departmentID === 9 &&
                joLines.length > 0 && (
                  <BulkSubcontractorButton
                    joLine={joLines[0]}
                    currentData={bulkQuotationData}
                    onConfirm={(data) => {
                      setBulkQuotationData(data);
                      setBulkTotalPrices({});
                    }}
                    onDelete={() => {
                      setBulkQuotationData(null);
                      setBulkTotalPrices({});
                    }}
                  />
                )}

              {/* LPO & Invoice (12) or Completed (25) */}
              {(mrHeader.progress_id === 12 && userInfo?.departmentID === 9) ||
              mrHeader.progress_id === 25 ? (
                <IssueJoLpoButton
                  mrHeader={mrHeader}
                  joLines={joLines}
                  boqItemsByJoLine={boqItemsByJoLine}
                  onLpoCreated={(id) => {
                    setLpoId(id || null);
                    setHasLpo(!!id);
                    if (!id) setJoLpoTotal(null);
                    setLpoUpdateCounter((c) => c + 1);
                  }}
                />
              ) : null}

              {/* Invoice upload/download */}
              {((mrHeader.progress_id === 12 && userInfo?.departmentID === 9) ||
                mrHeader.progress_id === 25) && (
                <UploadJoInvoiceButton
                  mrHeader={mrHeader}
                  invoiceFiles={joInvoiceFiles}
                  onFilesUpdate={setJoInvoiceFiles}
                  canUpload={
                    mrHeader.progress_id === 12 && userInfo?.departmentID === 9
                  }
                  canDelete={
                    mrHeader.progress_id === 12 && userInfo?.departmentID === 9
                  }
                />
              )}

              {/* RFQ download-only pill */}
              {((mrHeader.progress_id === 12 && userInfo?.departmentID === 9) ||
                mrHeader.progress_id === 25) && (
                <JoRfqButton
                  mrHeader={mrHeader}
                  selectedIds={rfqSelectedIds}
                  onRfqLoaded={() => {}}
                  downloadOnly={true}
                />
              )}

              {/* Create Payment Request — completed stage only */}
              {mrHeader.progress_id === 25 && (
                <CreatePaymentRequestButton mrHeader={mrHeader} />
              )}
            </div>
          </div>

          <br />

          {/* ── HIERARCHICAL VIEW (stages 7, 10, 11): JO line cards → BOQ item rows ── */}
          {isHierarchicalView ? (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              {joLines.map((joLine) => {
                const isExpanded = expandedJoLines.has(joLine.id);
                const boqItems = boqItemsByJoLine[joLine.id] || [];
                const isLoadingItems = loadingBoqItems[joLine.id];

                return (
                  <React.Fragment key={joLine.id}>
                    <div
                      style={{
                        borderRadius: "12px",
                        backgroundColor: "white",
                      }}
                    >
                      {/* ── Card Header ── */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          cursor: "pointer",
                          gap: "20px",
                        }}
                        onClick={() => toggleJoLineExpanded(joLine.id)}
                      >
                        <div
                          style={{
                            display: "flex",
                            gap: "15px",
                            alignItems: "center",
                            minWidth: 0,
                            flex: 1,
                          }}
                        >
                          {/* RFQ checkbox (procurement stages 7/11) */}
                          {isProcurementQuotation && (
                            <div onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={rfqSelectedIds.includes(joLine.id)}
                                onChange={() => toggleRfqSelection(joLine.id)}
                                style={{
                                  width: "16px",
                                  height: "16px",
                                  cursor: "pointer",
                                  accentColor: "rgba(0,163,93,1)",
                                }}
                              />
                            </div>
                          )}

                          {/* Chevron */}
                          <div
                            style={{
                              flexShrink: 0,
                              width: "28px",
                              height: "28px",
                              borderRadius: "8px",
                              backgroundColor: "rgba(239,239,239,1)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 14 14"
                              fill="none"
                              style={{
                                transform: isExpanded
                                  ? "rotate(180deg)"
                                  : "rotate(0deg)",
                                transition: "transform 0.2s ease",
                              }}
                            >
                              <path
                                d="M2.5 5L7 9.5L11.5 5"
                                stroke="black"
                                strokeWidth="1.6"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </div>

                          {/* Info columns */}
                          <div
                            style={{
                              display: "flex",
                              gap: "40px",
                              alignItems: "flex-start",
                              flexWrap: "wrap",
                            }}
                          >
                            <div>
                              <small>SCOPE</small>
                              <h2>
                                {joLine.job_scope_name ||
                                  joLine.job_scope ||
                                  "-"}
                              </h2>
                            </div>
                            <div>
                              <small>CONTRACT TYPE</small>
                              <h2>{joLine.contract_type || "-"}</h2>
                            </div>
                            <div>
                              <small>DESCRIPTION</small>
                              <div onClick={(e) => e.stopPropagation()}>
                                {joLine.job_description ? (
                                  <InfoPopUpButton
                                    text={joLine.job_description}
                                    header="JOB DESCRIPTION"
                                  />
                                ) : (
                                  <span>-</span>
                                )}
                              </div>
                            </div>
                            <div>
                              <small>BOQ REF.</small>
                              <div onClick={(e) => e.stopPropagation()}>
                                {joLine.boq_line_ids ? (
                                  <BoqReferencePopUp
                                    item={joLine}
                                    mrHeader={mrHeader}
                                    joLine={joLine}
                                  />
                                ) : (
                                  <span>-</span>
                                )}
                              </div>
                            </div>
                            {canSeePrice && (
                              <div>
                                <small>BUDGET</small>
                                <h2>
                                  {Number(joLine.budget_estimate) > 0
                                    ? formatPriceAED(joLine.budget_estimate)
                                    : "-"}
                                </h2>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <br />

                      {/* ── Card Body (expanded) ── */}
                      {isExpanded && (
                        <div
                          style={{
                            borderTop: "1px solid rgba(239,239,239,1)",
                            backgroundColor: "rgba(248,249,251,0.6)",
                          }}
                        >
                          {isLoadingItems ? (
                            <div style={{ padding: "20px", fontSize: "13px" }}>
                              Loading BOQ items...
                            </div>
                          ) : boqItems.length === 0 ? (
                            <div style={{ padding: "20px", fontSize: "13px" }}>
                              No BOQ items found for this job order line.
                            </div>
                          ) : (
                            <table
                              className="items-table fixed-layout"
                              style={{
                                borderRadius: 0,
                                border: "none",
                                borderTop: "1px solid rgba(239,239,239,1)",
                                width: "100%",
                                tableLayout: "fixed",
                              }}
                            >
                              <colgroup>
                                <col style={{ width: "40px" }} />
                                <col />
                                <col style={{ width: "160px" }} />
                                <col style={{ width: "200px" }} />
                                {showSubcontractedWorksValueColumn && (
                                  <col style={{ width: "225px" }} />
                                )}
                                {showApprovedSubcontractorColumn && (
                                  <col style={{ width: "200px" }} />
                                )}
                                {showApprovedSubcontractorColumn && (
                                  <col style={{ width: "240px" }} />
                                )}
                                {showQuotationColumn && (
                                  <col
                                    style={{
                                      width:
                                        mrHeader.progress_id === 7 &&
                                        userInfo?.departmentID === 9
                                          ? "250px"
                                          : "140px",
                                    }}
                                  />
                                )}
                                {showPriceApprovalColumn && (
                                  <col style={{ width: "300px" }} />
                                )}
                                {showCardTotalPrice && (
                                  <col style={{ width: "160px" }} />
                                )}
                              </colgroup>
                              <thead>
                                <tr>
                                  <th>#</th>
                                  <th>BOQ ITEM</th>
                                  <th>BOQ RATE</th>
                                  <th>SUBCONTRACTED QTY</th>
                                  {showSubcontractedWorksValueColumn && (
                                    <th>SUBCONTRACTED WORKS VALUE</th>
                                  )}
                                  {showApprovedSubcontractorColumn && (
                                    <th>SUBCONTRACTOR PRICE</th>
                                  )}
                                  {showApprovedSubcontractorColumn && (
                                    <th>SUBCONTRACTOR</th>
                                  )}
                                  {showQuotationColumn && (
                                    <th>
                                      {mrHeader.progress_id === 7 &&
                                      userInfo?.departmentID === 9
                                        ? "TOTAL PRICE"
                                        : "QUOTATIONS"}
                                    </th>
                                  )}
                                  {showPriceApprovalColumn && (
                                    <th>PRICE APPROVAL</th>
                                  )}
                                  {showCardTotalPrice && <th>TOTAL PRICE</th>}
                                </tr>
                              </thead>
                              <tbody>
                                {boqItems.map((item, idx) => (
                                  <tr key={item.boq_line_id}>
                                    <td>{idx + 1}</td>
                                    <td>
                                      <strong>{item.item_name || "-"}</strong>
                                      {item.item_description && (
                                        <>
                                          <br />
                                          <br />
                                          <span>{item.item_description}</span>
                                        </>
                                      )}
                                    </td>
                                    <td>
                                      {formatPriceAED(item.rate_per_quantity)}
                                    </td>
                                    <td>
                                      {formatQty(item.subcontracted_qty)}{" "}
                                      {item.unit}
                                    </td>
                                    {showSubcontractedWorksValueColumn && (
                                      <td>
                                        {formatPriceAED(
                                          (Number(item.subcontracted_qty) ||
                                            0) *
                                            (Number(item.rate_per_quantity) ||
                                              0),
                                        )}
                                      </td>
                                    )}
                                    {showApprovedSubcontractorColumn && (
                                      <td>
                                        {item.approved_total_price != null &&
                                        Number(item.approved_total_price) > 0
                                          ? formatPriceAED(
                                              item.approved_total_price,
                                            )
                                          : "-"}
                                      </td>
                                    )}
                                    {showApprovedSubcontractorColumn && (
                                      <td>
                                        {item.approved_subcontractor_name ? (
                                          <div
                                            style={{
                                              display: "flex",
                                              alignItems: "center",
                                              gap: "10px",
                                            }}
                                          >
                                            <span>
                                              {item.approved_subcontractor_name}
                                            </span>
                                            {item.approved_subcontractor_id && (
                                              <Button
                                                componentType={"link"}
                                                bgColor={
                                                  "rgba(239, 239, 239, 1)"
                                                }
                                                borderColor={
                                                  "rgba(223, 223, 223, 1)"
                                                }
                                                textColor={"black"}
                                                href={`/vendor/${item.approved_subcontractor_id}?type=subcontractor`}
                                                target="_blank"
                                                style={{ padding: "7px 7px" }}
                                              >
                                                <img
                                                  src={externalLinkIcon}
                                                  alt="view subcontractor"
                                                />
                                              </Button>
                                            )}
                                          </div>
                                        ) : (
                                          "-"
                                        )}
                                      </td>
                                    )}
                                    {showQuotationColumn && (
                                      <td>
                                        {mrHeader.progress_id === 7 &&
                                        userInfo?.departmentID === 9 ? (
                                          <InputItem
                                            type="text postfix"
                                            label=""
                                            noOptionalLabel
                                            postfixText="AED"
                                            placeholder="ENTER TOTAL PRICE"
                                            disabled={!bulkQuotationData}
                                            value={formatInputPrice(
                                              bulkTotalPrices[
                                                item.boq_line_id
                                              ] || "",
                                            )}
                                            style={{ marginBottom: 0 }}
                                            onChange={(e) => {
                                              if (!bulkQuotationData) return;
                                              let val = (
                                                e.target as HTMLInputElement
                                              ).value.replace(/,/g, "");
                                              if (
                                                val !== "" &&
                                                !/^\d*\.?\d*$/.test(val)
                                              )
                                                return;
                                              setBulkTotalPrices((prev) => ({
                                                ...prev,
                                                [item.boq_line_id]: val,
                                              }));
                                            }}
                                          />
                                        ) : (
                                          <SubcontractorAndQuotationButton
                                            mrHeader={mrHeader}
                                            joLine={joLine}
                                            boqLineId={item.boq_line_id}
                                            boqItemName={item.item_name}
                                            subcontractedWorksValue={
                                              (Number(item.subcontracted_qty) ||
                                                0) *
                                              (Number(item.rate_per_quantity) ||
                                                0)
                                            }
                                            lockedSubcontractorId={
                                              lockedSubcontractorByJoLine[
                                                joLine.id
                                              ]
                                            }
                                            onSubcontractorLocked={(id) =>
                                              setLockedSubcontractorByJoLine(
                                                (prev) => ({
                                                  ...prev,
                                                  [joLine.id]: id,
                                                }),
                                              )
                                            }
                                          />
                                        )}
                                      </td>
                                    )}
                                    {showPriceApprovalColumn && (
                                      <td>
                                        <JoPriceApprovalButton
                                          progressID={mrHeader.progress_id}
                                          joLine={joLine}
                                          boqLineId={item.boq_line_id}
                                          onTotalPriceChange={(_, price) =>
                                            handleBoqTotalPriceChange(
                                              item.boq_line_id,
                                              price,
                                            )
                                          }
                                        />
                                      </td>
                                    )}
                                    {showCardTotalPrice && (
                                      <td>
                                        {boqLineTotalPrices[item.boq_line_id] >
                                        0
                                          ? formatPriceAED(
                                              boqLineTotalPrices[
                                                item.boq_line_id
                                              ],
                                            )
                                          : "N/A"}
                                      </td>
                                    )}
                                  </tr>
                                ))}
                              </tbody>
                              {mrHeader.progress_id >= 10 && (
                                <tfoot>
                                  {(() => {
                                    if (showCardTotalPrice) {
                                      // Stage 10: SUBTOTAL label in PRICE APPROVAL col,
                                      // value in TOTAL PRICE col
                                      const approvedPrices = boqItems.map(
                                        (i) =>
                                          boqLineTotalPrices[i.boq_line_id],
                                      );
                                      const hasAny = approvedPrices.some(
                                        (p) => p !== undefined && p > 0,
                                      );
                                      const subtotal = approvedPrices.reduce(
                                        (s, p) => s + (p || 0),
                                        0,
                                      );
                                      return (
                                        <tr style={{ fontWeight: 600 }}>
                                          <td colSpan={5} />
                                          <td>SUBTOTAL</td>
                                          <td>
                                            {hasAny
                                              ? formatPriceAED(subtotal)
                                              : "N/A"}
                                          </td>
                                        </tr>
                                      );
                                    }
                                    // Other stages >= 10
                                    const subtotal = boqItems.reduce(
                                      (s, i) =>
                                        s +
                                        (Number(i.subcontracted_qty) || 0) *
                                          (Number(i.rate_per_quantity) || 0),
                                      0,
                                    );
                                    const approvedPriceSubtotal =
                                      boqItems.reduce(
                                        (s, i) =>
                                          s +
                                          (Number(i.approved_total_price) || 0),
                                        0,
                                      );
                                    // Stages 12/25: SUBTOTAL aligned with SUBCONTRACTED QTY,
                                    // works value sum, approved price sum, empty SUBCONTRACTOR
                                    if (showApprovedSubcontractorColumn) {
                                      const showVatRow =
                                        (mrHeader.progress_id === 12 &&
                                          userInfo?.departmentID === 9) ||
                                        mrHeader.progress_id === 25;
                                      return (
                                        <>
                                          <tr style={{ fontWeight: 600 }}>
                                            <td colSpan={3} />
                                            <td>SUBTOTAL</td>
                                            {showSubcontractedWorksValueColumn && (
                                              <td>
                                                {formatPriceAED(subtotal)}
                                              </td>
                                            )}
                                            <td>
                                              {approvedPriceSubtotal > 0
                                                ? formatPriceAED(
                                                    approvedPriceSubtotal,
                                                  )
                                                : "N/A"}
                                            </td>
                                            <td />
                                          </tr>
                                          {showVatRow && (
                                            <tr style={{ fontWeight: 600 }}>
                                              <td colSpan={3} />
                                              <td>SUBTOTAL W/ VAT</td>
                                              {showSubcontractedWorksValueColumn && (
                                                <td />
                                              )}
                                              <td>
                                                {!lpoId || joLpoTotal === null
                                                  ? "N/A"
                                                  : formatPriceAED(joLpoTotal)}
                                              </td>
                                              <td />
                                            </tr>
                                          )}
                                        </>
                                      );
                                    }
                                    // Stages 11 etc: just works value subtotal
                                    return (
                                      <tr style={{ fontWeight: 600 }}>
                                        <td
                                          colSpan={
                                            showSubcontractedWorksValueColumn
                                              ? 4
                                              : 5
                                          }
                                        />
                                        {showSubcontractedWorksValueColumn && (
                                          <td>{formatPriceAED(subtotal)}</td>
                                        )}
                                        {showQuotationColumn && <td />}
                                        {showPriceApprovalColumn && <td />}
                                      </tr>
                                    );
                                  })()}
                                </tfoot>
                              )}
                            </table>
                          )}
                        </div>
                      )}
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          ) : (
            /* ── FLAT TABLE VIEW (all other stages) ── */
            <table
              className="items-table"
              style={{ tableLayout: "fixed", width: "100%" }}
            >
              <colgroup>
                {isProcurementQuotation && <col style={{ width: "40px" }} />}
                <col style={{ width: "50px" }} />
                <col style={{ width: "150px" }} />
                <col style={{ width: "130px" }} />
                <col style={{ width: "90px" }} />
                <col style={{ width: "90px" }} />
                {showSubcontractorColumn && <col style={{ width: "180px" }} />}
                {canSeePrice && <col style={{ width: "120px" }} />}
                {showTotalPriceColumn && <col style={{ width: "120px" }} />}
                {showAttachmentsColumn && <col style={{ width: "220px" }} />}
                {mrHeader.progress_id === 2 && (
                  <col style={{ width: "160px" }} />
                )}
                {mrHeader.progress_id === 5 &&
                  (userInfo?.departmentID === 16 ||
                    userInfo?.departmentID === mrHeader.department_id) && (
                    <col style={{ width: "160px" }} />
                  )}
                {(mrHeader.progress_id === 1 || mrHeader.progress_id === 5) &&
                  userInfo?.departmentID === mrHeader.department_id && (
                    <col style={{ width: "100px" }} />
                  )}
                {showQuotationColumn && <col style={{ width: "130px" }} />}
                {showPriceApprovalColumn && <col style={{ width: "160px" }} />}
              </colgroup>
              <thead>
                <tr>
                  {isProcurementQuotation && (
                    <th style={{ textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={
                          rfqSelectedIds.length === joLines.length &&
                          joLines.length > 0
                        }
                        onChange={toggleAllRfq}
                        style={{
                          width: "16px",
                          height: "16px",
                          cursor: "pointer",
                          accentColor: "rgba(0, 163, 93, 1)",
                        }}
                      />
                    </th>
                  )}
                  <th>#</th>
                  <th>SCOPE</th>
                  <th>CONTRACT TYPE</th>
                  <th>DESCRIPTION</th>
                  <th>BOQ REF.</th>
                  {showSubcontractorColumn && <th>SUBCONTRACTOR</th>}
                  {canSeePrice && <th>BUDGET</th>}
                  {showTotalPriceColumn && <th>TOTAL PRICE</th>}
                  {showAttachmentsColumn && <th>ATTACHMENT(S)</th>}

                  {mrHeader.progress_id === 2 && <th>APPROVAL STATUS</th>}

                  {mrHeader.progress_id === 5 &&
                    (userInfo?.departmentID === 16 ||
                      userInfo?.departmentID === mrHeader.department_id) && (
                      <th>APPROVAL STATUS</th>
                    )}
                  {(mrHeader.progress_id === 1 || mrHeader.progress_id === 5) &&
                    userInfo?.departmentID === mrHeader.department_id && (
                      <th>ACTIONS</th>
                    )}

                  {showQuotationColumn && <th>QUOTATIONS</th>}
                  {showPriceApprovalColumn && <th>PRICE APPROVAL</th>}
                </tr>
              </thead>
              <tbody>
                {joLines.map((item: JoLine, index: number) => {
                  const typedAttachments = item.jo_attachments || [];

                  return (
                    <tr key={item.id}>
                      {isProcurementQuotation && (
                        <td style={{ textAlign: "center" }}>
                          <input
                            type="checkbox"
                            checked={rfqSelectedIds.includes(item.id)}
                            onChange={() => toggleRfqSelection(item.id)}
                            style={{
                              width: "16px",
                              height: "16px",
                              cursor: "pointer",
                              accentColor: "rgba(0, 163, 93, 1)",
                            }}
                          />
                        </td>
                      )}
                      <td>{index + 1}</td>
                      <td>{item.job_scope_name || item.job_scope || "-"}</td>
                      <td>{item.contract_type || "-"}</td>
                      <td>
                        {item.job_description ? (
                          <InfoPopUpButton
                            text={item.job_description}
                            header="JOB DESCRIPTION"
                          />
                        ) : (
                          "-"
                        )}
                      </td>
                      <td>
                        {item.boq_line_ids ? (
                          <BoqReferencePopUp
                            item={item}
                            mrHeader={mrHeader}
                            joLine={item}
                          />
                        ) : (
                          "-"
                        )}
                      </td>

                      {showSubcontractorColumn && (
                        <td>
                          {item.approved_subcontractor_name ? (
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                              }}
                            >
                              <span>{item.approved_subcontractor_name}</span>
                              {item.approved_subcontractor_id && (
                                <Button
                                  componentType={"link"}
                                  bgColor={"rgba(239, 239, 239, 1)"}
                                  borderColor={"rgba(223, 223, 223, 1)"}
                                  textColor={"black"}
                                  href={`/vendor/${item.approved_subcontractor_id}?type=subcontractor`}
                                  target="_blank"
                                  style={{ padding: "7px 7px" }}
                                >
                                  <img
                                    src={externalLinkIcon}
                                    alt="view subcontractor"
                                  />
                                </Button>
                              )}
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                      )}

                      {canSeePrice && (
                        <td>
                          {item.budget_estimate != null &&
                          Number(item.budget_estimate) > 0 ? (
                            <>{formatPriceAED(item.budget_estimate)}</>
                          ) : (
                            "-"
                          )}
                        </td>
                      )}

                      {showTotalPriceColumn && (
                        <td>
                          {(() => {
                            const price =
                              livePrices[item.id] !== undefined
                                ? livePrices[item.id]
                                : Number(item.approved_total_price) || 0;
                            return price > 0 ? formatPriceAED(price) : "-";
                          })()}
                        </td>
                      )}

                      {showAttachmentsColumn && (
                        <td>
                          {typedAttachments.length > 0
                            ? typedAttachments.map((att, idx) => {
                                const typeLabel =
                                  ATTACHMENT_TYPE_LABELS[att.attachment_type] ||
                                  att.attachment_type;
                                return (
                                  <React.Fragment
                                    key={`${item.id}-attachment-${idx}`}
                                  >
                                    <div
                                      style={{
                                        display: "flex",
                                        gap: "10px",
                                        alignItems: "center",
                                      }}
                                    >
                                      <span>{typeLabel}:</span>
                                      <Button
                                        componentType={"link"}
                                        bgColor={"rgba(239, 239, 239, 1)"}
                                        borderColor={"rgba(223, 223, 223, 1)"}
                                        textColor={"black"}
                                        href={att.file_url}
                                        target="_blank"
                                        style={{ padding: "7px 7px" }}
                                      >
                                        <img
                                          src={externalLinkIcon}
                                          alt="external link"
                                        />
                                      </Button>
                                    </div>
                                    {idx < typedAttachments.length - 1 && (
                                      <br />
                                    )}
                                  </React.Fragment>
                                );
                              })
                            : "-"}
                        </td>
                      )}

                      {mrHeader.progress_id === 2 && (
                        <td>
                          <JoApprovalButtons item={item} mrHeader={mrHeader} />
                        </td>
                      )}

                      {mrHeader.progress_id === 5 &&
                        (userInfo?.departmentID === 16 ||
                          userInfo?.departmentID ===
                            mrHeader.department_id) && (
                          <td>
                            <JoApprovalButtons
                              item={item}
                              mrHeader={mrHeader}
                            />
                          </td>
                        )}

                      {(mrHeader.progress_id === 1 ||
                        mrHeader.progress_id === 5) &&
                        userInfo?.departmentID === mrHeader.department_id && (
                          <td>
                            <div
                              style={{
                                display: "flex",
                                gap: "10px",
                                alignItems: "center",
                              }}
                            >
                              <EditJoItemButton
                                item={item}
                                projectID={mrHeader.project_id}
                              />
                              <DeleteJoItemButton itemId={item.id} />
                            </div>
                          </td>
                        )}

                      {showQuotationColumn && (
                        <td>
                          <SubcontractorAndQuotationButton
                            mrHeader={mrHeader}
                            joLine={item}
                          />
                        </td>
                      )}

                      {showPriceApprovalColumn && (
                        <td>
                          <JoPriceApprovalButton
                            progressID={mrHeader.progress_id}
                            joLine={item}
                            onTotalPriceChange={handleTotalPriceChange}
                          />
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>

              {showTotalPriceColumn && (
                <tfoot
                  style={{ borderTop: "1px solid rgba(239, 239, 239, 1)" }}
                >
                  {(() => {
                    const liveTotalPrice = joLines.reduce((sum, item) => {
                      const price =
                        livePrices[item.id] !== undefined
                          ? livePrices[item.id]
                          : Number(item.approved_total_price) || 0;
                      return sum + price;
                    }, 0);
                    const hasAnyPrice =
                      liveTotalPrice > 0 || hasAnyApprovedPrice;

                    const labelColSpan =
                      5 +
                      (isProcurementQuotation ? 1 : 0) +
                      (showSubcontractorColumn ? 1 : 0) +
                      (canSeePrice ? 1 : 0);
                    let trailingCols = showAttachmentsColumn ? 1 : 0;
                    if (mrHeader.progress_id === 2) trailingCols += 1;
                    if (
                      mrHeader.progress_id === 5 &&
                      (userInfo?.departmentID === 16 ||
                        userInfo?.departmentID === mrHeader.department_id)
                    )
                      trailingCols += 1;
                    if (
                      (mrHeader.progress_id === 1 ||
                        mrHeader.progress_id === 5) &&
                      userInfo?.departmentID === mrHeader.department_id
                    )
                      trailingCols += 1;
                    if (showQuotationColumn) trailingCols += 1;
                    if (showPriceApprovalColumn) trailingCols += 1;

                    const showVatRows = mrHeader.progress_id >= 12;
                    const noLpoYet = showVatRows && !hasLpo;
                    const displaySubtotal = noLpoYet ? 0 : liveTotalPrice;
                    const vatAmount = displaySubtotal * (joLpoVatRate / 100);
                    const totalWithVat = displaySubtotal + vatAmount;

                    return showVatRows || hasAnyPrice ? (
                      <>
                        <tr>
                          <td colSpan={labelColSpan - 1} />
                          <td style={{ fontWeight: "600" }}>SUBTOTAL</td>
                          <td style={{ fontWeight: "600" }}>
                            {noLpoYet ? "N/A" : formatPriceAED(displaySubtotal)}
                          </td>
                          {trailingCols > 0 && <td colSpan={trailingCols} />}
                        </tr>
                        {showVatRows && (
                          <tr>
                            <td colSpan={labelColSpan - 1} />
                            <td style={{ fontWeight: "600" }}>
                              SUBTOTAL W/ VAT
                            </td>
                            <td style={{ fontWeight: "600" }}>
                              {noLpoYet ? "N/A" : formatPriceAED(totalWithVat)}
                            </td>
                            {trailingCols > 0 && <td colSpan={trailingCols} />}
                          </tr>
                        )}
                      </>
                    ) : null;
                  })()}
                </tfoot>
              )}
            </table>
          )}
        </div>

        {/* Smart Select Portal (manager, stage 10) */}
        {mrHeader.progress_id === 10 &&
          userInfo?.departmentID === 8 &&
          joLines.length > 0 && (
            <JoPriceApprovalButton
              progressID={mrHeader.progress_id}
              joLine={joLines[0]}
              isSmartSelectPortal={true}
              allJoLines={joLines}
            />
          )}

        <br />
        <br />
        <br />

        {/* ── JO TOTAL (LPO & Invoice + Completed) ── */}
        {showApprovedSubcontractorColumn &&
          canSeePrice &&
          (() => {
            const joTotal = Object.values(boqItemsByJoLine)
              .flat()
              .reduce((s, i) => s + (Number(i.approved_total_price) || 0), 0);
            const showVatRow =
              mrHeader.progress_id === 12 && userInfo?.departmentID === 9;
            return (
              <table
                className="items-table fixed-layout"
                style={{
                  borderRadius: 0,
                  border: "none",
                  width: "100%",
                  tableLayout: "fixed",
                  marginTop: "8px",
                }}
              >
                <colgroup>
                  <col style={{ width: "40px" }} />
                  <col />
                  <col style={{ width: "160px" }} />
                  <col style={{ width: "200px" }} />
                  {showSubcontractedWorksValueColumn && (
                    <col style={{ width: "225px" }} />
                  )}
                  {showApprovedSubcontractorColumn && (
                    <col style={{ width: "200px" }} />
                  )}
                  {showApprovedSubcontractorColumn && (
                    <col style={{ width: "240px" }} />
                  )}
                  {showQuotationColumn && (
                    <col
                      style={{
                        width:
                          mrHeader.progress_id === 7 &&
                          userInfo?.departmentID === 9
                            ? "250px"
                            : "140px",
                      }}
                    />
                  )}
                  {showPriceApprovalColumn && (
                    <col style={{ width: "300px" }} />
                  )}
                  {showCardTotalPrice && <col style={{ width: "160px" }} />}
                </colgroup>
                <tfoot
                  style={{ borderTop: "1px solid rgba(200, 200, 200, 1)" }}
                >
                  <tr style={{ fontWeight: 600 }}>
                    <td colSpan={3} />
                    <td>JO VALUE</td>
                    {showSubcontractedWorksValueColumn && <td />}
                    <td>{joTotal > 0 ? formatPriceAED(joTotal) : "N/A"}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            );
          })()}
        {/* Budget vs total price warning — stage 10, manager */}
        {mrHeader.progress_id === 10 &&
          userInfo?.departmentID === 8 &&
          (() => {
            const sumSelected = joLines.reduce((acc, line) => {
              const price =
                livePrices[line.id] !== undefined
                  ? livePrices[line.id]
                  : Number(line.approved_total_price) || 0;
              return acc + price;
            }, 0);
            if (sumSelected === 0 || sumSelected <= totalBudget) return null;
            return (
              <>
                <br />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <div></div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <img src="/icons/warning.svg" alt="warning" />
                    <p
                      style={{
                        color: "rgba(175, 61, 61, 1)",
                        fontSize: "13px",
                      }}
                    >
                      Total price selected: {formatPriceAED(sumSelected)} /
                      Budget: {formatPriceAED(totalBudget)} — exceeds budget
                    </p>
                  </div>
                </div>
              </>
            );
          })()}

        {/* Budget vs total price warning — stage 7, procurement */}

        {mrHeader.progress_id === 7 &&
          userInfo?.departmentID === 9 &&
          Object.keys(bulkTotalPrices).length > 0 &&
          (() => {
            const sumEntered = Object.values(bulkTotalPrices).reduce(
              (acc, v) => acc + (parseFloat(v) || 0),
              0,
            );
            const overBudget = sumEntered > totalBudget;
            if (!overBudget) return null;
            return (
              <>
                <br />

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <div></div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <img src="/icons/warning.svg" alt="warning" />
                    <p
                      style={{
                        color: "rgba(175, 61, 61, 1)",
                        fontSize: "13px",
                      }}
                    >
                      Total price entered: {formatPriceAED(sumEntered)} /
                      Budget: {formatPriceAED(totalBudget)} — exceeds budget
                    </p>
                  </div>
                </div>
              </>
            );
          })()}
      </div>
      {/* end mr-with-id */}

      <CommentsSection
        mrHeaderId={mrHeader.id}
        stageName={mrHeader.progress_name || ""}
      />

      {/* ── Bottom action nav — stage transitions ── */}

      {/* Draft (1) / Resubmission (5) */}
      {(mrHeader.progress_id === 1 || mrHeader.progress_id === 5) &&
        userInfo?.departmentID === mrHeader.department_id &&
        joLines.length > 0 && (
          <div className="bottom-nav">
            <div></div>
            <SubmitForInitialApprovalButton
              mrHeader={mrHeader}
              progressId={mrHeader.progress_id}
              disabled={hasRejectedItems}
              style={{
                opacity: hasRejectedItems ? "0.5" : "1",
                cursor: hasRejectedItems ? "not-allowed" : "pointer",
                pointerEvents: hasRejectedItems ? "none" : "auto",
              }}
            />
          </div>
        )}

      {/* QS Review (2) */}
      {mrHeader.progress_id === 2 && userInfo?.departmentID === 16 && (
        <div className="bottom-nav">
          <div></div>
          {hasRejectedItems ? (
            <SubmitForResubmissionButton mrHeader={mrHeader} />
          ) : (
            <SubmitForQuotationsButton
              mrHeader={mrHeader}
              progressId={mrHeader.progress_id}
              disabled={!allItemsReviewed}
            />
          )}
        </div>
      )}

      {/* Procurement Quotation (7) */}
      {mrHeader.progress_id === 7 &&
        userInfo?.departmentID === 9 &&
        joLines.length > 0 && (
          <div className="bottom-nav">
            <div></div>
            <SubmitForJoPriceApprovalButton
              mrHeaderID={mrHeader.id}
              progressId={mrHeader.progress_id}
              bulkQuotationData={bulkQuotationData}
              bulkTotalPrices={bulkTotalPrices}
              boqItemsByJoLine={boqItemsByJoLine}
              disabled={
                hasAnyRejectedQuotation ||
                (!allLinesHaveQuotations && !allBulkPricesEntered)
              }
              style={{
                opacity:
                  hasAnyRejectedQuotation ||
                  (!allLinesHaveQuotations && !allBulkPricesEntered)
                    ? "0.5"
                    : "1",
                cursor:
                  hasAnyRejectedQuotation ||
                  (!allLinesHaveQuotations && !allBulkPricesEntered)
                    ? "not-allowed"
                    : "pointer",
                pointerEvents:
                  hasAnyRejectedQuotation ||
                  (!allLinesHaveQuotations && !allBulkPricesEntered)
                    ? "none"
                    : "auto",
              }}
            />
          </div>
        )}

      {/* Manager Price Approval (10) */}
      {mrHeader.progress_id === 10 &&
        userInfo?.departmentID === 8 &&
        joLines.length > 0 && (
          <div className="bottom-nav">
            <div></div>
            {hasAnyRejectedQuotation ? (
              <>
                <SubmitForPricingResubmissionButton
                  mrHeaderID={mrHeader.id}
                  type={mrHeader.type}
                />
                <small
                  style={{ color: "rgba(248, 77, 77, 1)", marginLeft: "12px" }}
                >
                  One or more quotations rejected — return for revision
                </small>
              </>
            ) : (
              <SubmitForJoCompletionButton
                mrHeader={mrHeader}
                disabled={!allLinesHaveApprovedSubcontractor}
                style={{
                  opacity: allLinesHaveApprovedSubcontractor ? "1" : "0.5",
                  cursor: allLinesHaveApprovedSubcontractor
                    ? "pointer"
                    : "not-allowed",
                  pointerEvents: allLinesHaveApprovedSubcontractor
                    ? "auto"
                    : "none",
                }}
              />
            )}
          </div>
        )}

      {/* Pricing Resubmission (11) */}
      {mrHeader.progress_id === 11 &&
        userInfo?.departmentID === 9 &&
        joLines.length > 0 && (
          <div className="bottom-nav">
            <div></div>
            <SubmitForJoPriceApprovalButton
              mrHeaderID={mrHeader.id}
              progressId={mrHeader.progress_id}
              disabled={hasAnyRejectedQuotation || !allLinesHaveQuotations}
              style={{
                opacity:
                  hasAnyRejectedQuotation || !allLinesHaveQuotations
                    ? "0.5"
                    : "1",
                cursor:
                  hasAnyRejectedQuotation || !allLinesHaveQuotations
                    ? "not-allowed"
                    : "pointer",
                pointerEvents:
                  hasAnyRejectedQuotation || !allLinesHaveQuotations
                    ? "none"
                    : "auto",
              }}
            />
          </div>
        )}

      {/* LPO & Invoice (12) */}
      {mrHeader.progress_id === 12 && userInfo?.departmentID === 9 && (
        <div className="bottom-nav">
          <div></div>
          <SubmitJoFromLpoButton
            mrHeader={mrHeader}
            disabled={!lpoId}
            style={{
              opacity: lpoId ? "1" : "0.5",
              cursor: lpoId ? "pointer" : "not-allowed",
              pointerEvents: lpoId ? "auto" : "none",
            }}
          />
        </div>
      )}
    </>
  );
}
