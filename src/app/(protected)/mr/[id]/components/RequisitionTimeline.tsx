"use client";

import { useState, useEffect } from "react";

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
  2: "QS REVIEW", // Same (if needed)
  3: "MANAGER APPROVAL", // Same
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
// ORDER CREATED (1) → MANAGER APPROVAL (3) → QUOTATIONS (7) → MANAGER PRICE APPROVAL (10) → COMPLETED (25)
const JO_STAGES_IDS = [1, 3, 7, 10, 25];

// Payment Request Stages
// REQUEST CREATED (1) → QS REVIEW (2) → MANAGER APPROVAL (3) → PAYMENT (14) → COMPLETED (25)
const PR_STAGES_IDS = [1, 2, 3, 14, 25];

const PR_STAGE_LABELS: { [key: number]: string } = {
  1: "REQUEST CREATED",
  2: "QS REVIEW",
  3: "MANAGER APPROVAL",
  5: "REQUEST REJECTED",
  14: "PAYMENT",
  25: "COMPLETED",
};

const PR_REJECTION_IDS = new Set([5]);

// Base LPO stages (no QS) - MRs skip Manager Approval (3); TEMPORARILY DISABLED QC: removed 21 (QC Check)
const BASE_LPO_STAGES = [1, 7, 10, 12, 14, 17, 24, 25];
// Full LPO stages (with QS) - MRs skip Manager Approval (3); TEMPORARILY DISABLED QC: removed 21 (QC Check)
const FULL_LPO_STAGES = [1, 2, 4, 7, 9, 10, 12, 14, 17, 24, 25];

type TimelineStage = {
  id: number;
  label: string;
  isRejection: boolean;
  isRollback: boolean;
  arrivedEntry: ProgressLogEntry | null;
  departedEntry: ProgressLogEntry | null;
};

export default function RequisitionTimeline({
  mrHeaderId,
  currentProgressId,
  lpoId,
  type = "material",
}: RequisitionTimelineProps) {
  const [progressLog, setProgressLog] = useState<ProgressLogEntry[]>([]);
  const [hasBoqReference, setHasBoqReference] = useState<boolean>(false);
  const [hasItemAvailable, setHasItemAvailable] = useState<boolean>(false);
  const [hasNeedOrder, setHasNeedOrder] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
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
  }, [mrHeaderId, lpoId]);

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
    baseStageIds = hasBoqReference ? fullStages : BASE_LPO_STAGES;
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
      baseStageIds = hasBoqReference
        ? FULL_MR_STAGES_ALL_AVAILABLE
        : BASE_MR_STAGES_ALL_AVAILABLE;
    } else {
      // Normal or mixed flow - only include stage 4 (Stock Transfer) if there are item_available lines
      const fullStages = hasItemAvailable
        ? FULL_MR_STAGES
        : FULL_MR_STAGES.filter((id) => id !== 4);
      baseStageIds = hasBoqReference ? fullStages : BASE_MR_STAGES;
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
  };

  const visitedSequence: VisitRecord[] = [];

  for (const entry of sortedLog) {
    const isRb = isRollbackEntry(entry);
    // Use appropriate rejection set based on type
    const isRej = rejectionIds.has(entry.progress_id) && !isRb;

    visitedSequence.push({
      stageId: entry.progress_id,
      arrivedEntry: entry,
      departedEntry: null,
      isRejection: isRej,
      isRollback: isRb,
    });
  }

  for (let i = 0; i < visitedSequence.length - 1; i++) {
    visitedSequence[i].departedEntry = visitedSequence[i + 1].arrivedEntry;
  }

  const timelineStages: TimelineStage[] = [];
  const visitedStageIds = new Set(visitedSequence.map((v) => v.stageId));
  let highestVisitedBaseIndex = -1;

  for (const v of visitedSequence) {
    const idx = baseStageIds.indexOf(v.stageId);
    if (idx > highestVisitedBaseIndex) {
      highestVisitedBaseIndex = idx;
    }
  }

  for (const visit of visitedSequence) {
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
        arrivedEntry: null,
        departedEntry: null,
      });
    }
  }

  return (
    <div className="mr-with-id">
      <div className="subcategory-header">
        <h2>REQUISITION TIMELINE</h2>
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
          // Current stage should NOT show details
          let detailEntry: ProgressLogEntry | null = null;

          if (stage.isRejection || stage.isRollback) {
            // For rejections/rollbacks, show arrival details
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
          if (stage.isRejection) {
            circleColor = "rgba(248, 77, 77, 1)";
          } else if (stage.isRollback) {
            circleColor = "rgba(255, 153, 36, 1)";
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
          } else if (isFuture) {
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
                  border: isFuture
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

                {isCompleted && !stage.isRejection && !stage.isRollback && (
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
                    {stage.isRollback ? "ROLLED BACK BY" : stage.isRejection ? "REJECTED BY" : "SUBMITTED BY"}
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
              <br />
            </div>
          );
        })}
      </div>
    </div>
  );
}
