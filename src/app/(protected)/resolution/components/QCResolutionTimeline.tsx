"use client";

import { useEffect, useState } from "react";

type ProgressLogEntry = {
  id: number;
  resolution_id: number;
  resolution_type: string;
  progress_id: number;
  from_progress_id: number | null;
  changed_by: string | null;
  changed_at: string;
};

type QCResolutionTimelineProps = {
  resolutionId: number;
  resolutionType: string;
  currentProgressId: number;
  stages: { id: number; label: string }[];
};

export default function QCResolutionTimeline({
  resolutionId,
  resolutionType,
  currentProgressId,
  stages,
}: QCResolutionTimelineProps) {
  const [progressLog, setProgressLog] = useState<ProgressLogEntry[]>([]);

  useEffect(() => {
    async function fetchLog() {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/qc/resolution?logFor=${resolutionId}&type=${resolutionType}`,
        );
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setProgressLog(data.data);
          }
        }
      } catch (err) {
        console.error("Error fetching progress log:", err);
      }
    }

    fetchLog();
  }, [resolutionId, resolutionType, currentProgressId]);

  // Build a map: progress_id → log entry (use the first arrival at that stage)
  const logByStage: { [key: number]: ProgressLogEntry } = {};
  for (const entry of progressLog) {
    if (!logByStage[entry.progress_id]) {
      logByStage[entry.progress_id] = entry;
    }
  }

  // Check if resolution is completed (progress_id === 3)
  const isCompleted = currentProgressId === 3;

  return (
    <div className="mr-with-id">
      <div className="subcategory-header">
        <h2>RESOLUTION TIMELINE</h2>
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
        {stages.map((stage, index) => {
          // Stage status logic
          const isStageCompleted = isCompleted || stage.id < currentProgressId;
          const isCurrent = !isCompleted && stage.id === currentProgressId;
          const isFuture = stage.id > currentProgressId;

          const logEntry = logByStage[stage.id];

          // For completed stages, show the NEXT stage's log entry (departure time)
          // For the current stage, show arrival time
          let detailEntry: ProgressLogEntry | null = null;
          if (isStageCompleted) {
            // Find the log entry for the next stage (departure from this stage)
            const nextStage = stages[index + 1];
            if (nextStage) {
              detailEntry = logByStage[nextStage.id] || null;
            }
          }

          let dateStr = "";
          let timeStr = "";
          const entryForDate = detailEntry || (isCurrent ? null : null);
          if (entryForDate?.changed_at) {
            const d = new Date(entryForDate.changed_at);
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

          // Circle color logic - GREEN if completed (isCompleted or past current)
          let circleColor = "white";
          let showCheckmark = false;

          if (isStageCompleted) {
            circleColor = "rgba(26, 216, 135, 1)"; // Green
            showCheckmark = true;
          } else if (isCurrent) {
            circleColor = "rgba(216, 213, 26, 1)"; // Yellow (only if not completed)
          }

          let labelColor = "black";
          if (isFuture) {
            labelColor = "rgba(217, 217, 217, 1)";
          }

          return (
            <div
              key={stage.id}
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
                {showCheckmark && (
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

              {/* Date/time for completed stages */}
              {entryForDate?.changed_at && (
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

              {/* Submitted by for completed stages */}
              {entryForDate?.changed_by && (
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
                    {entryForDate.changed_by}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
