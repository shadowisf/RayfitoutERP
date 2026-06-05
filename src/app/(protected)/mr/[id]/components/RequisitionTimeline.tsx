"use client";

import { useState, useEffect } from "react";
import FormPopUp from "@/app/components/FormPopup";
import Button from "@/app/components/Button";
import RequisitionLogButton from "./RequisitionLogButton";

type ProgressLogEntry = {
  id: number;
  mr_header_id: number;
  lpo_id: number | null;
  progress_id: number;
  from_progress_id: number | null;
  changed_by: string;
  changed_at: string;
  rollback_reason: string | null;
  is_rollback: number;
  reject_reason: string | null;
  progress_name: string;
  from_progress_name: string | null;
};

type RequisitionTimelineProps = {
  mrHeaderId: number;
  currentProgressId: number;
  lpoId?: number;
  type?: "material" | "job" | "payment";
  mrNumber?: string;
  projectName?: string;
  requiredDate?: string;
  /** True when the MR was created by manager/QS dept or has skip_approvals=1.
   *  QS Review (stage 2) and QS Price Check (stage 9) are excluded from the
   *  planned stage list when this is true. */
  skipQsReview?: boolean;
  /** Pre-fetched server-side data — skips the client-side fetch when provided. */
  initialProgressLog?: ProgressLogEntry[];
  initialHasBoqReference?: boolean;
  initialHasItemAvailable?: boolean;
  initialHasNeedOrder?: boolean;
};

// Rejection progress IDs for MR/LPO
const REJECTION_IDS = new Set([5, 11, 13, 16, 23]);

// Rejection progress IDs for JO (using same IDs but different context)
const JO_REJECTION_IDS = new Set([5, 11]); // REQUEST REJECTED, PRICE REJECTED

// Rollback detection: uses the is_rollback column from the database
const isRollbackEntry = (entry: ProgressLogEntry) => entry.is_rollback === 1;

// Labels for rejection stages (shared)
const REJECTION_LABELS: { [key: number]: string } = {
  5: "REQUEST REJECTED",
  11: "PRICE REJECTED",
  13: "PAYMENT REJECTED",
  16: "GRN FAILED",
  23: "FAILED QC",
};

// MR/LPO Stage Labels
const STAGE_LABELS: { [key: number]: string } = {
  1: "REQUEST CREATED",
  2: "QS REVIEW",
  3: "MANAGER APPROVAL",
  4: "STOCK TRANSFER",
  5: "REQUEST REJECTED",
  7: "QUOTATIONS",
  9: "QS PRICE CHECK",
  10: "MANAGER PRICE APPROVAL",
  11: "PRICE REJECTED",
  12: "LPO & INVOICE",
  13: "PAYMENT REJECTED",
  14: "PAYMENT",
  16: "GRN FAILED",
  17: "AWAITING DELIVERY",
  21: "QC CHECK",
  23: "FAILED QC",
  24: "STOCK ENTRY",
  25: "COMPLETED",
  26: "SEGREGATION",
};

// JO Stage Labels (renamed stages for job orders)
const JO_STAGE_LABELS: { [key: number]: string } = {
  1: "ORDER CREATED", // Renamed from REQUEST CREATED
  2: "QS REVIEW",
  5: "REQUEST REJECTED", // Same
  7: "QUOTATIONS", // Same
  9: "QS PRICE CHECK", // Same (if needed)
  10: "MANAGER PRICE APPROVAL", // Same
  11: "PRICE REJECTED", // Same
  12: "LPO & INVOICE", // Same context
  25: "COMPLETED", // Same
};

// Base MR stages (no QS) — MRs skip Manager Approval (3)
const BASE_MR_STAGES = [1, 7, 10, 12, 26];
// Full MR stages (with QS) — MRs skip Manager Approval (3)
const FULL_MR_STAGES = [1, 2, 4, 7, 9, 10, 12, 26];

// Shortened MR stages: all items available, no need_order → stock transfer then completed
// No manager approval needed — QS review handles it, then stock transfer, then done
const BASE_MR_STAGES_ALL_AVAILABLE = [1, 4, 25];
const FULL_MR_STAGES_ALL_AVAILABLE = [1, 2, 4, 25];

// JO Stages - simplified flow for job orders
// ORDER CREATED (1) → QS REVIEW (2) → QUOTATIONS (7) → MANAGER PRICE APPROVAL (10) → LPO & INVOICE (12) → COMPLETED (25)
const JO_STAGES_IDS = [1, 2, 7, 10, 12, 25];

// Payment Request Stages
// REQUEST CREATED (1) → QS REVIEW (2) → MANAGER PRICE APPROVAL (10) → COMPLETED (25)
const PR_STAGES_IDS = [1, 2, 10, 25];

const PR_STAGE_LABELS: { [key: number]: string } = {
  1: "REQUEST CREATED",
  2: "QS REVIEW",
  10: "MANAGER PRICE APPROVAL",
  5: "REQUEST REJECTED",
  14: "PAYMENT",
  25: "COMPLETED",
};

const PR_REJECTION_IDS = new Set([5]);

// Base LPO stages (no QS) - MRs skip Manager Approval (3); TEMPORARILY DISABLED QC: removed 21 (QC Check); PAYMENT (14) removed — LPO & Invoice goes directly to Awaiting Delivery; Stock Entry (24) merged into Awaiting Delivery (17)
const BASE_LPO_STAGES = [1, 7, 10, 12, 17, 25];
// Full LPO stages (with QS) - MRs skip Manager Approval (3); TEMPORARILY DISABLED QC: removed 21 (QC Check); PAYMENT (14) removed — LPO & Invoice goes directly to Awaiting Delivery; Stock Entry (24) merged into Awaiting Delivery (17)
const FULL_LPO_STAGES = [1, 2, 4, 7, 9, 10, 12, 17, 25];

type ReplacementItem = {
  original: string;
  original_category?: string;
  original_subcategory?: string;
  replacement: string;
  replacement_item_code?: string;
  replacement_category?: string;
  replacement_subcategory?: string;
  reason: string;
};

type TimelineStage = {
  id: number;
  label: string;
  isRejection: boolean;
  isRollback: boolean;
  isReplacementNote: boolean;
  isSkipped: boolean;
  replacementItems?: ReplacementItem[];
  replacedItems?: ReplacementItem[]; // aggregated from all replacement notes on QS REVIEW
  arrivedEntry: ProgressLogEntry | null;
  departedEntry: ProgressLogEntry | null;
};

export default function RequisitionTimeline({
  mrHeaderId,
  currentProgressId,
  lpoId,
  type = "material",
  mrNumber,
  projectName,
  requiredDate,
  skipQsReview = false,
  initialProgressLog,
  initialHasBoqReference,
  initialHasItemAvailable,
  initialHasNeedOrder,
}: RequisitionTimelineProps) {
  const [progressLog, setProgressLog] = useState<ProgressLogEntry[]>(initialProgressLog ?? []);
  const [hasBoqReference, setHasBoqReference] = useState<boolean>(initialHasBoqReference ?? false);
  const [hasItemAvailable, setHasItemAvailable] = useState<boolean>(initialHasItemAvailable ?? false);
  const [hasNeedOrder, setHasNeedOrder] = useState<boolean>(initialHasNeedOrder ?? true);
  const [isLoading, setIsLoading] = useState(initialProgressLog === undefined);
  const [replacementsPopup, setReplacementsPopup] = useState<
    ReplacementItem[] | null
  >(null);

  const noImage = "/icons/no-image.jpg";
  const externalLinkIcon = "/icons/external-link.svg";

  useEffect(() => {
    // Skip client fetch if data was pre-loaded server-side
    if (initialProgressLog !== undefined) return;

    async function fetchData() {
      try {
        const [logRes, boqRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getProgressLog`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              mr_header_id: mrHeaderId,
              lpo_id: lpoId || null,
            }),
          }),
          fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/checkBoqReference`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ mr_header_id: mrHeaderId }),
            },
          ),
        ]);

        if (logRes.ok) {
          setProgressLog(await logRes.json());
        }
        if (boqRes.ok) {
          const boqData = await boqRes.json();
          setHasBoqReference(boqData.hasBoqReference || false);
          setHasItemAvailable(boqData.hasItemAvailable || false);
          setHasNeedOrder(boqData.hasNeedOrder ?? true);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [mrHeaderId, lpoId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) {
    return <div>Loading timeline...</div>;
  }

  // Determine which stage set and labels to use
  let baseStageIds: number[];
  let stageLabels: { [key: number]: string };
  let rejectionIds: Set<number>;

  if (lpoId) {
    // LPO flow
    const fullStages = hasItemAvailable
      ? FULL_LPO_STAGES
      : FULL_LPO_STAGES.filter((id) => id !== 4);
    // Show QS stages (2, 9) unless the MR was created by manager/QS or has skip_approvals
    baseStageIds = !skipQsReview ? fullStages : BASE_LPO_STAGES;
    stageLabels = STAGE_LABELS;
    rejectionIds = REJECTION_IDS;
  } else if (type === "payment") {
    // Payment request flow
    baseStageIds = PR_STAGES_IDS;
    stageLabels = PR_STAGE_LABELS;
    rejectionIds = PR_REJECTION_IDS;
  } else if (type === "job") {
    // JO flow - use JO-specific stages and labels
    baseStageIds = JO_STAGES_IDS;
    stageLabels = JO_STAGE_LABELS;
    rejectionIds = JO_REJECTION_IDS;
  } else {
    // MR flow
    if (hasItemAvailable && !hasNeedOrder) {
      // All lines are item_available → shortened flow: stock transfer then completed
      // Show QS stages unless the MR was created by manager/QS or has skip_approvals
      baseStageIds = !skipQsReview
        ? FULL_MR_STAGES_ALL_AVAILABLE
        : BASE_MR_STAGES_ALL_AVAILABLE;
    } else {
      // Normal or mixed flow - only include stage 4 (Stock Transfer) if there are item_available lines
      const fullStages = hasItemAvailable
        ? FULL_MR_STAGES
        : FULL_MR_STAGES.filter((id) => id !== 4);
      // Show QS stages unless the MR was created by manager/QS or has skip_approvals
      baseStageIds = !skipQsReview ? fullStages : BASE_MR_STAGES;
    }
    stageLabels = STAGE_LABELS;
    rejectionIds = REJECTION_IDS;
  }

  const sortedLog = [...progressLog].sort((a, b) => a.id - b.id);

  type VisitRecord = {
    stageId: number;
    arrivedEntry: ProgressLogEntry | null;
    departedEntry: ProgressLogEntry | null;
    isRejection: boolean;
    isRollback: boolean;
    isReplacementNote: boolean;
    replacementItems?: ReplacementItem[];
  };

  const visitedSequence: VisitRecord[] = [];

  for (const entry of sortedLog) {
    const isRb = isRollbackEntry(entry);
    // Use appropriate rejection set based on type
    const isRej = rejectionIds.has(entry.progress_id) && !isRb;

    // Detect QS replacement notes stored in reject_reason
    let isReplacementNote = false;
    let replacementItems: ReplacementItem[] | undefined;
    if (!isRb && !isRej && entry.reject_reason) {
      try {
        const parsed = JSON.parse(entry.reject_reason);
        if (
          parsed?.type === "qs_replacement_note" &&
          Array.isArray(parsed.items)
        ) {
          isReplacementNote = true;
          replacementItems = parsed.items as ReplacementItem[];
        }
      } catch {
        // not JSON or not a replacement note
      }
    }

    visitedSequence.push({
      stageId: entry.progress_id,
      arrivedEntry: entry,
      departedEntry: null,
      isRejection: isRej,
      isRollback: isRb,
      isReplacementNote,
      replacementItems,
    });
  }

  for (let i = 0; i < visitedSequence.length - 1; i++) {
    visitedSequence[i].departedEntry = visitedSequence[i + 1].arrivedEntry;
  }

  // Collect replacement notes separately and attach them to the QS REVIEW stage
  const allReplacedItems: ReplacementItem[] = [];
  const filteredVisited = visitedSequence.filter((v) => {
    if (v.isReplacementNote) {
      if (v.replacementItems) allReplacedItems.push(...v.replacementItems);
      return false;
    }
    return true;
  });

  // For payment requests, remap any stale progress_id=3 (Manager Approval) entries to
  // progress_id=10 (Manager Price Approval) — payment requests use 10, not 3.
  const displayVisited =
    type === "payment"
      ? filteredVisited.map((v) =>
          v.stageId === 3 ? { ...v, stageId: 10 } : v,
        )
      : filteredVisited;

  const timelineStages: TimelineStage[] = [];
  const visitedStageIds = new Set(displayVisited.map((v) => v.stageId));
  let highestVisitedBaseIndex = -1;

  for (const v of displayVisited) {
    const idx = baseStageIds.indexOf(v.stageId);
    if (idx > highestVisitedBaseIndex) {
      highestVisitedBaseIndex = idx;
    }
  }

  for (const visit of displayVisited) {
    timelineStages.push({
      id: visit.stageId,
      label: visit.isRollback
        ? "ROLLED BACK"
        : visit.isRejection
          ? REJECTION_LABELS[visit.stageId] ||
            stageLabels[visit.stageId] ||
            "REJECTED"
          : stageLabels[visit.stageId] ||
            STAGE_LABELS[visit.stageId] ||
            `Stage ${visit.stageId}`,
      isRejection: visit.isRejection,
      isRollback: visit.isRollback,
      isReplacementNote: false,
      isSkipped: false,
      replacementItems: visit.replacementItems,
      replacedItems:
        visit.stageId === 2 && allReplacedItems.length > 0
          ? allReplacedItems
          : undefined,
      arrivedEntry: visit.arrivedEntry,
      departedEntry: visit.departedEntry,
    });
  }

  for (let i = highestVisitedBaseIndex + 1; i < baseStageIds.length; i++) {
    const stageId = baseStageIds[i];
    if (!visitedStageIds.has(stageId)) {
      timelineStages.push({
        id: stageId,
        label:
          stageLabels[stageId] || STAGE_LABELS[stageId] || `Stage ${stageId}`,
        isRejection: false,
        isRollback: false,
        isReplacementNote: false,
        isSkipped: false,
        arrivedEntry: null,
        departedEntry: null,
      });
    }
  }

  // Detect silently-skipped stages: in baseStageIds, never visited, but already passed over.
  // Covers skip_approvals=1 and QS/manager-created requests across all types.
  const stage2BaseIndex = baseStageIds.indexOf(2);
  if (
    stage2BaseIndex !== -1 &&
    !visitedStageIds.has(2) &&
    highestVisitedBaseIndex > stage2BaseIndex
  ) {
    const stage1TimelineIndex = timelineStages.findIndex((s) => s.id === 1);
    const insertAt = stage1TimelineIndex >= 0 ? stage1TimelineIndex + 1 : 0;
    timelineStages.splice(insertAt, 0, {
      id: 2,
      label: stageLabels[2] || "QS REVIEW",
      isRejection: false,
      isRollback: false,
      isReplacementNote: false,
      isSkipped: true,
      arrivedEntry: null,
      departedEntry: null,
    });
  }

  return (
    <div className="mr-with-id">
      <div
        className="subcategory-header"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <h2>REQUISITION TIMELINE</h2>
          {(mrNumber || projectName || requiredDate) && (
            <p className="timeline-subtitle">
              {[mrNumber, projectName, requiredDate].filter(Boolean).join(" • ")}
            </p>
          )}
        </div>
        <RequisitionLogButton mrHeaderId={mrHeaderId} lpoId={lpoId} />
      </div>

      <br />
      <br />

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          position: "relative",
          overflowX: "auto",
          isolation: "isolate",
          gap: "25px",
        }}
      >
        {timelineStages.map((stage, index) => {
          const isCompletedStage = stage.id === 25;
          const hasArrived = !!stage.arrivedEntry;
          const hasDeparted = !!stage.departedEntry;

          // FIXED: Current stage is the one that has arrived but not departed
          // and matches the current progress ID
          const isCurrent =
            stage.id === currentProgressId &&
            hasArrived &&
            !hasDeparted &&
            !stage.isRejection &&
            !stage.isRollback;

          // A stage is completed if:
          // - It's a rejection/rollback (these are terminal states)
          // - It's the final completed stage (25) and has arrived
          // - It has both arrived AND departed (we've moved on from it)
          const isCompleted =
            stage.isRejection || stage.isRollback
              ? true
              : isCompletedStage
                ? hasArrived
                : hasArrived && hasDeparted;

          const isYellow = isCurrent && !isCompleted;
          const isFuture = !isCompleted && !isCurrent;

          // FIXED: Only show details for completed stages (stages we've departed from)
          // OR for rejection/rollback stages (show arrival details)
          // OR for replacement-note stages (show arrival details)
          // Current stage should NOT show details
          let detailEntry: ProgressLogEntry | null = null;

          if (
            stage.isRejection ||
            stage.isRollback ||
            stage.isReplacementNote
          ) {
            // For rejections/rollbacks/replacement notes, show arrival details
            detailEntry = stage.arrivedEntry;
          } else if (isCompleted && !isCurrent) {
            // For completed normal stages, show departure details (when we left)
            detailEntry = stage.departedEntry;
          }
          // For current stage, detailEntry remains null - no details shown

          let dateStr = "";
          let timeStr = "";
          if (detailEntry?.changed_at) {
            const d = new Date(detailEntry.changed_at);
            dateStr = d.toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            });
            timeStr = d.toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            });
          }

          let circleColor = "white";
          if (stage.isSkipped) {
            circleColor = "rgb(251, 186, 111)";
          } else if (stage.isRejection) {
            circleColor = "rgba(248, 77, 77, 1)";
          } else if (stage.isRollback) {
            circleColor = "rgba(255, 153, 36, 1)";
          } else if (stage.isReplacementNote) {
            circleColor = "rgba(209, 157, 90, 1)";
          } else if (isCompleted) {
            circleColor = "rgba(26, 216, 135, 1)";
          } else if (isYellow) {
            circleColor = "rgba(216, 213, 26, 1)";
          }

          let labelColor = "black";
          if (stage.isRejection) {
            labelColor = "rgba(248, 77, 77, 1)";
          } else if (stage.isRollback) {
            labelColor = "rgba(255, 153, 36, 1)";
          } else if (stage.isReplacementNote) {
            labelColor = "rgba(209, 157, 90, 1)";
          } else if (isFuture && !stage.isSkipped) {
            labelColor = "rgba(217, 217, 217, 1)";
          }

          return (
            <div
              key={`${stage.id}-${index}`}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                flex: 1,
                minWidth: "130px",
                position: "relative",
              }}
            >
              {/* Connector line */}
              {index > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "12px",
                    left: "-100%",
                    width: "100%",
                    height: "2px",
                    backgroundColor: "rgba(217, 217, 217, 1)",
                    zIndex: 0,
                  }}
                />
              )}

              {/* Circle */}
              <div
                style={{
                  width: "25px",
                  height: "25px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: circleColor,
                  border:
                    isFuture && !stage.isSkipped
                      ? "2px solid rgba(220, 220, 220, 1)"
                      : "none",
                  flexShrink: 0,
                  zIndex: 1,
                }}
              >
                {(stage.isRejection || stage.isRollback) && (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M3 3L9 9M9 3L3 9"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                )}

                {stage.isReplacementNote && (
                  /* swap/replace arrow icon */
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M7 16H17M17 16L14 13M17 16L14 19M17 8H7M7 8L10 5M7 8L10 11"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}

                {isCompleted &&
                  !stage.isRejection &&
                  !stage.isRollback &&
                  !stage.isReplacementNote && (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M2.5 7L5.5 10L11.5 4"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
              </div>

              <p
                style={{
                  fontSize: "10px",
                  fontWeight: "600",
                  color: labelColor,
                  marginTop: "15px",
                  marginBottom: "2px",
                  textAlign: "left",
                  textTransform: "uppercase",
                  maxWidth: "120px",
                  width: "100%",
                }}
              >
                {stage.label}
              </p>

              {stage.isSkipped && (
                <p
                  style={{
                    fontSize: "10px",
                    fontWeight: "700",
                    color: "rgb(251, 186, 111)",
                    marginTop: "2px",
                    marginBottom: "2px",
                    textAlign: "left",
                    textTransform: "uppercase",
                  }}
                >
                  SKIPPED
                </p>
              )}

              {/* FIXED: Only show details if detailEntry exists (not for current stage) */}
              {detailEntry?.changed_at && (
                <p
                  style={{
                    fontSize: "10px",
                    color: "rgba(85, 80, 80, 1)",
                    marginBottom: "4px",
                    textAlign: "left",
                    display: "flex",
                    gap: "4px",
                    flexWrap: "wrap",
                    width: "100%",
                  }}
                >
                  <span
                    style={{
                      padding: "2px 10px",
                      borderRadius: "50px",
                      backgroundColor: "rgba(228, 228, 228, 1)",
                    }}
                  >
                    {dateStr}
                  </span>
                  <span
                    style={{
                      padding: "2px 10px",
                      borderRadius: "50px",
                      backgroundColor: "rgba(228, 228, 228, 1)",
                    }}
                  >
                    {timeStr}
                  </span>
                </p>
              )}

              {/* Only show submitted by if detailEntry exists */}
              {detailEntry?.changed_by && (
                <div
                  style={{ marginTop: "4px", textAlign: "left", width: "100%" }}
                >
                  <p
                    style={{
                      fontSize: "9px",
                      color: "rgba(85, 80, 80, 1)",
                      textTransform: "uppercase",
                      fontWeight: "600",
                      letterSpacing: "0.5px",
                      textAlign: "left",
                    }}
                  >
                    {stage.isRollback
                      ? "ROLLED BACK BY"
                      : stage.isRejection
                        ? "REJECTED BY"
                        : stage.isReplacementNote
                          ? "REPLACED BY"
                          : "SUBMITTED BY"}
                  </p>
                  <p
                    style={{
                      fontSize: "10px",
                      color: "black",
                      fontWeight: "500",
                      maxWidth: "120px",
                      wordBreak: "break-word",
                      textAlign: "left",
                    }}
                  >
                    {detailEntry.changed_by}
                  </p>
                </div>
              )}

              {/* Show rollback target stage */}
              {stage.isRollback && detailEntry && (
                <div
                  style={{ marginTop: "4px", textAlign: "left", width: "100%" }}
                >
                  <p
                    style={{
                      fontSize: "9px",
                      color: "rgba(255, 153, 36, 1)",
                      textTransform: "uppercase",
                      fontWeight: "600",
                      letterSpacing: "0.5px",
                      textAlign: "left",
                    }}
                  >
                    STAGE
                  </p>
                  <p
                    style={{
                      fontSize: "10px",
                      color: "black",
                      fontWeight: "500",
                      maxWidth: "120px",
                      wordBreak: "break-word",
                      textAlign: "left",
                    }}
                  >
                    {detailEntry.progress_id === 1
                      ? "Draft"
                      : stageLabels[detailEntry.progress_id] ||
                        STAGE_LABELS[detailEntry.progress_id] ||
                        detailEntry.progress_name ||
                        `Stage ${detailEntry.progress_id}`}
                  </p>
                </div>
              )}

              {/* Show rollback reason if available */}
              {stage.isRollback && detailEntry?.rollback_reason && (
                <div
                  style={{ marginTop: "4px", textAlign: "left", width: "100%" }}
                >
                  <p
                    style={{
                      fontSize: "9px",
                      color: "rgba(255, 153, 36, 1)",
                      textTransform: "uppercase",
                      fontWeight: "600",
                      letterSpacing: "0.5px",
                      textAlign: "left",
                    }}
                  >
                    REASON
                  </p>
                  <p
                    style={{
                      fontSize: "10px",
                      color: "rgba(85, 80, 80, 1)",
                      fontWeight: "400",
                      maxWidth: "120px",
                      wordBreak: "break-word",
                      textAlign: "left",
                    }}
                  >
                    {detailEntry.rollback_reason}
                  </p>
                </div>
              )}

              {/* Show rejection reasons (item name + reason) if available */}
              {stage.isRejection &&
                detailEntry?.reject_reason &&
                (() => {
                  try {
                    const reasons: { item: string; reason: string }[] =
                      JSON.parse(detailEntry.reject_reason);
                    return (
                      <div
                        style={{
                          marginTop: "4px",
                          textAlign: "left",
                          width: "100%",
                        }}
                      >
                        <p
                          style={{
                            fontSize: "9px",
                            color: "rgba(248, 77, 77, 1)",
                            textTransform: "uppercase",
                            fontWeight: "600",
                            letterSpacing: "0.5px",
                            textAlign: "left",
                          }}
                        >
                          REJECTED ITEMS
                        </p>
                        {reasons.map((r, i) => (
                          <div
                            key={i}
                            style={{ marginTop: i > 0 ? "4px" : "2px" }}
                          >
                            <p
                              style={{
                                fontSize: "10px",
                                color: "black",
                                fontWeight: "500",
                                maxWidth: "120px",
                                wordBreak: "break-word",
                                textAlign: "left",
                              }}
                            >
                              {r.item}
                            </p>
                            {r.reason && (
                              <p
                                style={{
                                  fontSize: "9px",
                                  color: "rgba(85, 80, 80, 1)",
                                  fontWeight: "400",
                                  maxWidth: "120px",
                                  wordBreak: "break-word",
                                  textAlign: "left",
                                  fontStyle: "italic",
                                }}
                              >
                                {r.reason}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  } catch {
                    // Fallback for plain text reject_reason
                    return (
                      <div
                        style={{
                          marginTop: "4px",
                          textAlign: "left",
                          width: "100%",
                        }}
                      >
                        <p
                          style={{
                            fontSize: "9px",
                            color: "rgba(248, 77, 77, 1)",
                            textTransform: "uppercase",
                            fontWeight: "600",
                            letterSpacing: "0.5px",
                            textAlign: "left",
                          }}
                        >
                          REASON
                        </p>
                        <p
                          style={{
                            fontSize: "10px",
                            color: "rgba(85, 80, 80, 1)",
                            fontWeight: "400",
                            maxWidth: "120px",
                            wordBreak: "break-word",
                            textAlign: "left",
                          }}
                        >
                          {detailEntry.reject_reason}
                        </p>
                      </div>
                    );
                  }
                })()}

              {/* Show "{N} items replaced" amber pill for QS REVIEW stage */}
              {stage.replacedItems && stage.replacedItems.length > 0 && (
                <div
                  style={{ marginTop: "8px", textAlign: "left", width: "100%" }}
                >
                  <span
                    className="approval-pill"
                    onClick={() => setReplacementsPopup(stage.replacedItems!)}
                    style={{
                      backgroundColor: "rgba(209, 157, 90, 1)",
                      color: "white",
                      fontSize: "11px",
                      fontStyle: "italic",
                      cursor: "pointer",
                      display: "flex",
                      gap: "10px",
                    }}
                  >
                    <span>
                      {stage.replacedItems.length} item
                      {stage.replacedItems.length !== 1 ? "s" : ""} replaced
                    </span>
                    <img
                      src={externalLinkIcon}
                      style={{ filter: "invert(1)" }}
                    />
                  </span>
                </div>
              )}
              <br />
            </div>
          );
        })}
      </div>

      {/* Replaced items popup — uses FormPopUp for uniform styling */}
      {replacementsPopup && (
        <FormPopUp
          header={"REPLACEMENT DETAILS"}
          setIsOpen={() => setReplacementsPopup(null)}
          style={{ width: "65dvw" }}
        >
          {replacementsPopup.map((r, i) => (
            <div
              key={i}
              style={{
                marginTop: i > 0 ? "32px" : 0,
                paddingTop: i > 0 ? "32px" : 0,
                borderTop: i > 0 ? "1px solid rgba(228,228,228,1)" : "none",
              }}
            >
              {/* Two-panel row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "stretch",
                  position: "relative",
                  gap: "15px",
                }}
              >
                {/* Left panel — original */}
                <div
                  style={{
                    flex: 1,
                    backgroundColor: "rgba(246, 246, 246, 1)",
                    borderRadius: "5px",
                    padding: "20px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "25px",
                    }}
                  >
                    <img
                      src={noImage}
                      style={{ borderRadius: "15px", maxHeight: "75px" }}
                    />

                    <div>
                      <span
                        style={{
                          backgroundColor: "rgba(255, 250, 189, 1)",
                          fontSize: "10px",
                          color: "rgba(134, 83, 47, 1)",
                        }}
                        className="approval-pill normal-text"
                      >
                        MATERIAL REQUEST
                      </span>
                      <br />
                      <p
                        style={{
                          fontSize: "18px",
                          fontWeight: "600",
                          color: "black",

                          textTransform: "uppercase",
                        }}
                      >
                        {r.original || "-"}
                      </p>
                    </div>
                  </div>

                  <br />
                  <br />

                  <div
                    style={{
                      display: "flex",
                      gap: "24px",
                      flexWrap: "wrap",
                    }}
                  >
                    {[
                      { label: "ITEM CODE", value: "-" },
                      { label: "CATEGORY", value: r.original_category || "-" },
                      {
                        label: "SUBCATEGORY",
                        value: r.original_subcategory || "-",
                      },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <small>{label}</small>
                        <h3>{value}</h3>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Center swap icon */}
                <div
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    transform: "translate(-50%, -50%)",
                    width: "44px",
                    height: "44px",
                    borderRadius: "50%",
                    backgroundColor: "rgba(209, 157, 90, 1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 2,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                    flexShrink: 0,
                  }}
                >
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M7 16H17M17 16L14 13M17 16L14 19M17 8H7M7 8L10 5M7 8L10 11"
                      stroke="white"
                      strokeWidth="1"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                {/* Right panel — replacement */}
                <div
                  style={{
                    flex: 1,
                    backgroundColor: "rgba(246, 246, 246, 1)",
                    borderRadius: "5px",
                    padding: "20px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "25px",
                    }}
                  >
                    <img
                      src={noImage}
                      style={{ borderRadius: "15px", maxHeight: "75px" }}
                    />

                    <div>
                      <span
                        style={{
                          backgroundColor: "rgba(209, 157, 90, 1)",
                          fontSize: "10px",
                          color: "white",
                        }}
                        className="approval-pill normal-text"
                      >
                        REPLACED WITH
                      </span>
                      <br />
                      <p
                        style={{
                          fontSize: "18px",
                          fontWeight: "600",
                          color: "black",
                          wordBreak: "break-word",
                          marginBottom: "20px",
                          textTransform: "uppercase",
                        }}
                      >
                        {r.replacement || "—"}
                      </p>
                    </div>
                  </div>

                  <br />

                  <div
                    style={{
                      display: "flex",
                      gap: "25px",
                      flexWrap: "wrap",
                    }}
                  >
                    {[
                      {
                        label: "ITEM CODE",
                        value: r.replacement_item_code || "-",
                      },
                      {
                        label: "CATEGORY",
                        value: r.replacement_category || "-",
                      },
                      {
                        label: "SUBCATEGORY",
                        value: r.replacement_subcategory || "-",
                      },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <small>{label}</small>
                        <h2>{value}</h2>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <br />
              <br />

              {/* Replace Reason */}
              {r.reason && (
                <div>
                  <small>REPLACE REASON</small>
                  <h2>{r.reason}</h2>
                </div>
              )}
            </div>
          ))}
        </FormPopUp>
      )}
    </div>
  );
}
