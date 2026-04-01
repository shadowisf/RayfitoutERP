"use client";

import { JoLine } from "../types/joLine";
import { MrHeader } from "../types/mrHeader";
import { useAuth } from "@/app/context/AuthContext";
import { useState, useEffect, useCallback } from "react";
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
import CommentsSection from "@/app/components/CommentsSection";
import { formatPriceAED } from "@/lib/formatPrice";
import JoRfqButton from "./procurement/_JoRfqButton";

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

export default function JoLinesView({ joLines, mrHeader }: JoLinesViewProps) {
  const { userInfo } = useAuth();

  const externalLinkIcon = "/icons/external-link.svg";

  // ── RFQ State ──────────────────────────────────────
  const [rfqSelectedIds, setRfqSelectedIds] = useState<number[]>([]);
  const [rfqExists, setRfqExists] = useState(false);

  const isProcurementQuotation =
    [7, 11].includes(mrHeader.progress_id) && userInfo?.departmentID === 9;

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

  const handleTotalPriceChange = (joLineId: number, totalPrice: number) => {
    setLivePrices((prev) => ({ ...prev, [joLineId]: totalPrice }));
  };

  // Show total price column from manager price approval stage onwards
  const showTotalPriceColumn = mrHeader.progress_id >= 10 && canSeePrice;

  // ────────────────────────────────────────────────
  // NEW: Check if ANY line has a REJECTED quotation
  // (used to disable Submit for Manager Price Approval)
  // ────────────────────────────────────────────────
  const [hasAnyRejectedQuotation, setHasAnyRejectedQuotation] = useState(false);

  const checkHasAnyRejectedQuotation = useCallback(async () => {
    // Only relevant in stages 7 & 11 (Procurement submitting for price approval)
    if (![7, 11].includes(mrHeader.progress_id) || joLines.length === 0) {
      setHasAnyRejectedQuotation(false);
      return;
    }

    // A line has a rejection if any of its quotations is "Rejected"
    // We need to fetch the quotations for each line
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
          // Check if any quotation for this line is Rejected
          return (
            Array.isArray(data) &&
            data.some((q: any) => q.approval_status === "Rejected")
          );
        }),
      );

      // If ANY line has at least one rejected quotation → disable button
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

  // ────────────────────────────────────────────────
  // Existing check for having quotations (keep it for other purposes)
  // ────────────────────────────────────────────────
  const [allLinesHaveQuotations, setAllLinesHaveQuotations] = useState(false);

  const checkAllLinesHaveQuotations = useCallback(async () => {
    if (![7, 11].includes(mrHeader.progress_id) || joLines.length === 0) {
      setAllLinesHaveQuotations(false);
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
          return Array.isArray(data) && data.length > 0;
        }),
      );

      setAllLinesHaveQuotations(results.every((hasQuotation) => hasQuotation));
    } catch {
      setAllLinesHaveQuotations(false);
    }
  }, [mrHeader.progress_id, joLines]);

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

  // Show quotation column at stages 7, 10, 11
  const showQuotationColumn =
    [7, 11].includes(mrHeader.progress_id) && userInfo?.departmentID === 9;

  // Show price approval column at stages 10, 11
  const showPriceApprovalColumn =
    [10, 11].includes(mrHeader.progress_id) && userInfo?.departmentID === 8;

  return (
    <>
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

            {/* RFQ Button (Create / Edit / Download / Delete) */}
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
          </div>
        </div>

        <br />

        <table className="items-table">
          <thead>
            <tr>
              <th>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  {isProcurementQuotation && (
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
                  )}
                  #
                </div>
              </th>
              <th>SCOPE</th>
              <th>CONTRACT TYPE</th>
              <th>DESCRIPTION</th>
              <th>BOQ REF.</th>
              {canSeePrice && <th>WORKS VALUE</th>}
              {canSeePrice && <th>BUDGET</th>}
              {showTotalPriceColumn && <th>TOTAL PRICE</th>}
              <th>ATTACHMENT(S)</th>

              {mrHeader.progress_id === 3 && <th>APPROVAL STATUS</th>}

              {mrHeader.progress_id === 5 &&
                (userInfo?.departmentID === 8 ||
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
              // Use typed attachments from API
              const typedAttachments = item.jo_attachments || [];

              return (
                <tr key={item.id}>
                  <td>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      {isProcurementQuotation && (
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
                      )}
                      {index + 1}
                    </div>
                  </td>
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
                      <BoqReferencePopUp item={item} mrHeader={mrHeader} />
                    ) : (
                      "-"
                    )}
                  </td>

                  {canSeePrice && (
                    <td>
                      {item.subcontracted_works_value != null &&
                      Number(item.subcontracted_works_value) > 0 ? (
                        <>{formatPriceAED(item.subcontracted_works_value)}</>
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

                  <td>
                    {typedAttachments.length > 0
                      ? typedAttachments.map((att, idx) => {
                          const typeLabel =
                            ATTACHMENT_TYPE_LABELS[att.attachment_type] ||
                            att.attachment_type;
                          return (
                            <div
                              key={`${item.id}-attachment-${idx}`}
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
                          );
                        })
                      : "-"}
                  </td>

                  {mrHeader.progress_id === 3 && (
                    <td>
                      <JoApprovalButtons item={item} mrHeader={mrHeader} />
                    </td>
                  )}

                  {mrHeader.progress_id === 5 &&
                    (userInfo?.departmentID === 8 ||
                      userInfo?.departmentID === mrHeader.department_id) && (
                      <td>
                        <JoApprovalButtons item={item} mrHeader={mrHeader} />
                      </td>
                    )}

                  {(mrHeader.progress_id === 1 || mrHeader.progress_id === 5) &&
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
            <tfoot style={{ borderTop: "1px solid rgba(239, 239, 239, 1)" }}>
              {(() => {
                const liveTotalPrice = joLines.reduce((sum, item) => {
                  const price =
                    livePrices[item.id] !== undefined
                      ? livePrices[item.id]
                      : Number(item.approved_total_price) || 0;
                  return sum + price;
                }, 0);
                const hasAnyPrice = liveTotalPrice > 0 || hasAnyApprovedPrice;

                // Columns before SUBCONTRACTOR BUDGET: #, SCOPE, CONTRACT TYPE, DESCRIPTION, BOQ REF, (+ SUB-CONTRACTED WORKS VALUE if canSeePrice)
                const labelColSpan = 5 + (canSeePrice ? 2 : 0);
                // Columns after TOTAL PRICE value
                let trailingCols = 1; // ATTACHMENT
                if (mrHeader.progress_id === 3) trailingCols += 1;
                if (
                  mrHeader.progress_id === 5 &&
                  (userInfo?.departmentID === 8 ||
                    userInfo?.departmentID === mrHeader.department_id)
                )
                  trailingCols += 1;
                if (
                  (mrHeader.progress_id === 1 || mrHeader.progress_id === 5) &&
                  userInfo?.departmentID === mrHeader.department_id
                )
                  trailingCols += 1;
                if (showQuotationColumn) trailingCols += 1;
                if (showPriceApprovalColumn) trailingCols += 1;

                return hasAnyPrice ? (
                  <tr>
                    <td colSpan={labelColSpan - 1} />
                    <td
                      style={{
                        fontWeight: "600",
                      }}
                    >
                      SUBTOTAL
                    </td>
                    <td style={{ fontWeight: "600" }}>
                      {formatPriceAED(liveTotalPrice)}
                    </td>
                    {trailingCols > 0 && <td colSpan={trailingCols} />}
                  </tr>
                ) : null;
              })()}
            </tfoot>
          )}
        </table>
      </div>

      {/* Smart Select Portal */}
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

      <CommentsSection
        mrHeaderId={mrHeader.id}
        stageName={mrHeader.progress_name || ""}
      />

      {/* Bottom action nav — stage transitions */}

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

      {/* Manager Approval (3) */}
      {mrHeader.progress_id === 3 &&
        userInfo?.departmentID === 8 &&
        allItemsReviewed && (
          <div className="bottom-nav">
            <div></div>
            {hasRejectedItems ? (
              <SubmitForResubmissionButton mrHeader={mrHeader} />
            ) : (
              <SubmitForQuotationsButton
                mrHeader={mrHeader}
                progressId={mrHeader.progress_id}
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

      {/* Manager Price Approval (10) - Goes directly to Final Completion, no Invoice stage */}
      {mrHeader.progress_id === 10 &&
        userInfo?.departmentID === 8 &&
        joLines.length > 0 && (
          <div className="bottom-nav">
            <div></div>
            {hasAnyRejectedQuotation ? (
              <>
                <SubmitForPricingResubmissionButton mrHeaderID={mrHeader.id} />
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

      {/* REMOVED: Stage 12 (LPO & Invoice / Upload Invoice) - JO flow now goes directly from 10 to 25 (Completed) */}
    </>
  );
}
