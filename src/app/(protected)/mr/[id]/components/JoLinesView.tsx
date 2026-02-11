"use client";

import { JoLine } from "../types/joLine";
import { MrHeader } from "../types/mrHeader";
import { useAuth } from "@/app/context/AuthContext";
import { useState, useEffect, useCallback } from "react";
import Button from "@/app/components/Button";
import AddJoItemButton from "./department/_AddJoItemButton";
import JoApprovalButtons from "./manager/_JoApprovalButtons";
import InfoPopUpButton from "@/app/components/_InfoPopUpButton";
import BoqReferencePopUp from "./BoqReferencePopUp";
import SubmitForInitialApprovalButton from "./quantitySurveyor/_SubmitForInitialApprovalButton";
import SubmitForQuotationsButton from "./manager/_SubmitForQuotationsButton";
import SubmitForResubmissionButton from "./manager/_SubmitForInitialResubmissionButton";
import { DeleteJoItemButton } from "./department/_DeleteJoItemButton";
import EditJoItemButton from "./department/_EditJoItemButton";
import SubcontractorAndQuotationButton from "./procurement/_SubcontractorAndQuotationButton";
import JoPriceApprovalButton from "./manager/_JoPriceApprovalButton";
import SubmitForJoPriceApprovalButton from "./procurement/_SubmitForJoPriceApprovalButton";
import SubmitForJoCompletionButton from "./manager/_SubmitForJoCompletionButton";
import SubmitForPricingResubmissionButton from "./manager/_SubmitForPriceResubmissionButton";

type JoLinesViewProps = {
  joLines: JoLine[];
  mrHeader: MrHeader;
};

export default function JoLinesView({ joLines, mrHeader }: JoLinesViewProps) {
  const { userInfo } = useAuth();

  const externalLinkIcon = "/icons/external-link.svg";

  const canSeePrice =
    userInfo?.departmentID === 8 ||
    userInfo?.departmentID === 9 ||
    userInfo?.departmentID === 10 ||
    userInfo?.departmentID === 16;

  const formatNumber = (value: unknown): string => {
    const num = Number(value);
    if (isNaN(num)) return "";
    if (Number.isInteger(num)) return num.toString();
    return parseFloat(num.toFixed(3)).toString();
  };

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
        <div className="subcategory-header">
          <h2 style={{ textTransform: "uppercase" }}>JOB ITEMS</h2>

          <div className="right">
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
          </div>
        </div>

        <br />

        <table className="items-table">
          <thead>
            <tr>
              <th>#</th>
              <th>SCOPE</th>
              <th>DESCRIPTION</th>
              <th>BOQ REF.</th>
              <th>QTY</th>
              {canSeePrice && <th>BUDGET EST.</th>}
              <th>ATTACHMENT</th>

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
            {joLines.map((item: JoLine, index: number) => (
              <tr key={item.id}>
                <td>{index + 1}</td>
                <td>{item.job_scope_name || "-"}</td>
                <td style={{ maxWidth: "250px" }}>
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
                <td>
                  {formatNumber(item.quantity)} {item.unit}
                </td>

                {canSeePrice && (
                  <td>
                    {item.budget_estimate ? (
                      <>AED {Number(item.budget_estimate).toFixed(2)}</>
                    ) : (
                      "-"
                    )}
                  </td>
                )}
                <td>
                  {item.attachment ? (
                    <Button
                      componentType={"link"}
                      bgColor={"rgba(239, 239, 239, 1)"}
                      borderColor={"rgba(223, 223, 223, 1)"}
                      textColor={"black"}
                      style={{ padding: "7px 7px" }}
                      href={item.attachment}
                      target="_blank"
                    >
                      <img src={externalLinkIcon} alt="external link" />
                    </Button>
                  ) : (
                    "-"
                  )}
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
                    />
                  </td>
                )}
              </tr>
            ))}
          </tbody>

          {canSeePrice && (
            <tfoot style={{ borderTop: "1px solid rgba(239, 239, 239, 1)" }}>
              {hasAnyApprovedPrice && (
                <tr>
                  <td
                    colSpan={5}
                    style={{ fontWeight: "600", padding: "15px 20px" }}
                  >
                    TOTAL PRICE
                  </td>
                  <td style={{ fontWeight: "600", padding: "15px 20px" }}>
                    AED {totalApprovedPrice.toFixed(2)}
                  </td>
                  <td colSpan={10}></td>
                </tr>
              )}
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

      {/* Bottom action nav — stage transitions */}

      {/* Draft (1) / Resubmission (5) */}
      {(mrHeader.progress_id === 1 || mrHeader.progress_id === 5) &&
        userInfo?.departmentID === mrHeader.department_id &&
        joLines.length > 0 && (
          <div className="bottom-nav">
            <div></div>
            <SubmitForInitialApprovalButton
              mrHeader={mrHeader}
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
              <SubmitForQuotationsButton mrHeader={mrHeader} />
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
              disabled={hasAnyRejectedQuotation}
              style={{
                opacity: hasAnyRejectedQuotation ? "0.5" : "1",
                cursor: hasAnyRejectedQuotation ? "not-allowed" : "pointer",
                pointerEvents: hasAnyRejectedQuotation ? "none" : "auto",
              }}
            />
          </div>
        )}

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
              disabled={hasAnyRejectedQuotation}
              style={{
                opacity: hasAnyRejectedQuotation ? "0.5" : "1",
                cursor: hasAnyRejectedQuotation ? "not-allowed" : "pointer",
                pointerEvents: hasAnyRejectedQuotation ? "none" : "auto",
              }}
            />
          </div>
        )}
    </>
  );
}
