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
  progress_name: string;
  from_progress_name: string | null;
};

type RequisitionTimelineProps = {
  mrHeaderId: number;
  currentProgressId: number;
  lpoId?: number;
  type?: "material" | "job";
};

// Rejection progress IDs
const REJECTION_IDS = new Set([5, 11, 13, 16, 23]);

// Rollback detection: changed_by contains "(ROLLBACK)"
const isRollback = (entry: ProgressLogEntry) =>
  entry.changed_by?.includes("(ROLLBACK)");

// Labels for rejection stages
const REJECTION_LABELS: { [key: number]: string } = {
  5: "REQUEST REJECTED",
  11: "PRICE REJECTED",
  13: "PAYMENT REJECTED",
  16: "GRN FAILED",
  23: "FAILED QC",
};

// All known stage labels
const STAGE_LABELS: { [key: number]: string } = {
  1: "REQUEST CREATED",
  2: "QS REVIEW",
  3: "MANAGER APPROVAL",
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
  26: "SEGREGATED",
};

// Base MR stages (no QS)
const BASE_MR_STAGES = [1, 3, 7, 10, 12, 14, 17, 25];
// Full MR stages (with QS)
const FULL_MR_STAGES = [1, 2, 3, 7, 9, 10, 12, 14, 17, 25];
// JO stages
const JO_STAGES_IDS = [1, 2, 3, 7, 10, 12, 25];
// Base LPO stages (no QS)
const BASE_LPO_STAGES = [1, 3, 7, 10, 12, 14, 17, 24, 25];
// Full LPO stages (with QS)
const FULL_LPO_STAGES = [1, 2, 3, 7, 9, 10, 12, 14, 17, 24, 25];

type TimelineStage = {
  id: number;
  label: string;
  isRejection: boolean;
  isRollback: boolean;
  // The log entry that says "moved TO this stage"
  arrivedEntry: ProgressLogEntry | null;
  // The log entry that says "moved FROM this stage" (i.e. who completed this stage)
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

  // Determine base stage IDs
  let baseStageIds: number[];
  if (lpoId) {
    baseStageIds = hasBoqReference ? FULL_LPO_STAGES : BASE_LPO_STAGES;
  } else if (type === "job") {
    baseStageIds = JO_STAGES_IDS;
  } else {
    baseStageIds = hasBoqReference ? FULL_MR_STAGES : BASE_MR_STAGES;
  }

  // === BUILD CHRONOLOGICAL TIMELINE ===
  //
  // Strategy: Walk the sorted log entries to reconstruct the flow path.
  // Each log entry represents a transition: from_progress_id → progress_id.
  // We build a sequence of stages visited, including re-visits after
  // rejections/rollbacks, so stages can appear multiple times.

  // Sort log entries chronologically by id
  const sortedLog = [...progressLog].sort((a, b) => a.id - b.id);

  // Build the visited-stages sequence from the log.
  // Each entry tells us: "someone moved from `from_progress_id` to `progress_id`"
  // The sequence of progress_ids in the log IS the flow path.
  // We also need from_progress_id to know who completed each stage.

  // visitedSequence: chronological list of {stageId, arrivedEntry, departedEntry}
  type VisitRecord = {
    stageId: number;
    arrivedEntry: ProgressLogEntry | null;
    // departedEntry: the log entry that moved AWAY from this stage (set later)
    departedEntry: ProgressLogEntry | null;
    isRejection: boolean;
    isRollback: boolean;
  };

  const visitedSequence: VisitRecord[] = [];

  // The first stage (Draft) might not have a log entry — it's synthetic.
  // Add it from the first log entry's existence or the synthetic entry from API.
  // The API already adds a synthetic "Draft" entry as the first log entry.

  for (const entry of sortedLog) {
    const isRb = isRollback(entry);
    const isRej = REJECTION_IDS.has(entry.progress_id) && !isRb;

    visitedSequence.push({
      stageId: entry.progress_id,
      arrivedEntry: entry,
      departedEntry: null,
      isRejection: isRej,
      isRollback: isRb,
    });
  }

  // Now set departedEntry for each visit: the NEXT entry in the sequence
  // is the one that moved away from the current stage.
  // departedEntry for visit[i] = visit[i+1].arrivedEntry (the entry that left stage[i])
  for (let i = 0; i < visitedSequence.length - 1; i++) {
    visitedSequence[i].departedEntry = visitedSequence[i + 1].arrivedEntry;
  }

  // Now convert visitedSequence into TimelineStage format,
  // but also add "future" base stages that haven't been visited yet.

  const timelineStages: TimelineStage[] = [];

  // Track which base stages have been visited
  const visitedStageIds = new Set(visitedSequence.map((v) => v.stageId));

  // Find the highest base stage index that was visited (to know where future stages start)
  let highestVisitedBaseIndex = -1;
  for (const v of visitedSequence) {
    const idx = baseStageIds.indexOf(v.stageId);
    if (idx > highestVisitedBaseIndex) {
      highestVisitedBaseIndex = idx;
    }
  }

  // Add visited stages from the sequence
  for (const visit of visitedSequence) {
    const cleanChangedBy = visit.isRollback
      ? visit.arrivedEntry?.changed_by?.replace(" (ROLLBACK)", "") || ""
      : visit.arrivedEntry?.changed_by || "";

    timelineStages.push({
      id: visit.stageId,
      label: visit.isRollback
        ? "ROLLED BACK"
        : visit.isRejection
          ? REJECTION_LABELS[visit.stageId] ||
            STAGE_LABELS[visit.stageId] ||
            "REJECTED"
          : STAGE_LABELS[visit.stageId] || `Stage ${visit.stageId}`,
      isRejection: visit.isRejection,
      isRollback: visit.isRollback,
      arrivedEntry: visit.isRollback
        ? { ...visit.arrivedEntry!, changed_by: cleanChangedBy }
        : visit.arrivedEntry,
      departedEntry: visit.isRollback
        ? visit.departedEntry
          ? { ...visit.departedEntry, changed_by: cleanChangedBy }
          : null
        : visit.departedEntry,
    });
  }

  // Add future base stages (not yet visited) after the last visited stage
  for (let i = highestVisitedBaseIndex + 1; i < baseStageIds.length; i++) {
    const stageId = baseStageIds[i];
    if (!visitedStageIds.has(stageId)) {
      timelineStages.push({
        id: stageId,
        label: STAGE_LABELS[stageId] || `Stage ${stageId}`,
        isRejection: false,
        isRollback: false,
        arrivedEntry: null,
        departedEntry: null,
      });
    }
  }

  // === RENDER ===
  return (
    <div className="mr-with-id">
      <div className="subcategory-header">
        <h2>REQUISITION TIMELINE</h2>
      </div>

      <br />

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          position: "relative",
          padding: "0 20px",
          overflowX: "auto",
        }}
      >
        {timelineStages.map((stage, index) => {
          const isCompletedStage = stage.id === 25;
          const hasArrived = !!stage.arrivedEntry;
          const hasDeparted = !!stage.departedEntry;

          // "Current" = the LAST occurrence of currentProgressId in the timeline
          // that isn't a rejection/rollback, AND doesn't have a departure yet.
          const isLastOccurrence =
            stage.id === currentProgressId &&
            !stage.isRejection &&
            !stage.isRollback &&
            !hasDeparted;
          const isCurrent = isLastOccurrence;

          // Determine visual state
          // A stage is "completed" if it has arrived AND departed (someone moved past it)
          // OR if it's a rejection/rollback (always shows as completed with special icon)
          const isCompleted =
            stage.isRejection || stage.isRollback
              ? true
              : isCompletedStage
                ? hasArrived
                : hasArrived && hasDeparted;

          const isYellow = isCurrent && !isCompleted;
          const isFuture = !isCompleted && !isCurrent;

          // Use departedEntry for details (who completed this stage and when)
          // Fall back to arrivedEntry for current stage (who moved it here)
          const detailEntry =
            stage.departedEntry || (isCurrent ? stage.arrivedEntry : null);

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

          // Determine circle color
          let circleColor = "white";
          if (stage.isRejection) {
            circleColor = "rgba(248, 77, 77, 1)"; // Red
          } else if (stage.isRollback) {
            circleColor = "rgba(255, 153, 36, 1)"; // Orange
          } else if (isCompleted) {
            circleColor = "rgba(26, 216, 135, 1)"; // Green
          } else if (isYellow) {
            circleColor = "rgba(216, 213, 26, 1)"; // Yellow
          }

          // Determine label color
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
                    marginLeft: "12.5px",
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
                {/* Cross icon for rejection / rollback */}
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

                {/* Checkmark for completed (non-rejection, non-rollback) */}
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

              {/* Stage label */}
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

              {/* Date & time */}
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

              {/* Submitted by */}
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
                    SUBMITTED BY
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
              <br />
            </div>
          );
        })}
      </div>
    </div>
  );
}
