"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import HoverLoadingCursor from "./HoverLoadingCursor";

type props = {
  filterDays?: number;
};

type BottleneckStage = {
  progress_id: number;
  progress_name: string;
  mr_count: number;
  median_minutes: number;
};

type ProjectAtRisk = {
  project_name: string;
  mr_count: number;
};

export default function PendingApprovalMrsWidget({ filterDays }: props) {
  const router = useRouter();
  const approvalsIcon = "/icons/approvals.svg";
  const upArrow = "/icons/arrow-up-chart-red-big.svg";
  const downArrow = "/icons/arrow-down-chart-green-big.svg";

  const [thisWeek, setThisWeek] = useState<number>(0);
  const [lastWeek, setLastWeek] = useState<number>(0);
  const [percentageChange, setPercentageChange] = useState<number>(0);
  const [isIncrease, setIsIncrease] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [items, setItems] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [mrCount, setMrCount] = useState<number>(0);
  const [joCount, setJoCount] = useState<number>(0);
  const [paymentCount, setPaymentCount] = useState<number>(0);
  const [bottleneckStages, setBottleneckStages] = useState<BottleneckStage[]>(
    [],
  );
  const [projectsAtRisk, setProjectsAtRisk] = useState<ProjectAtRisk[]>([]);

  // Hover popup state
  const [showPopup, setShowPopup] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const hoverTimer = useRef<NodeJS.Timeout | null>(null);

  // Expand states
  const [expandedBottleneck, setExpandedBottleneck] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState(false);

  useEffect(() => {
    setIsLoading(true);

    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/dashboard/manager/getTotalPendingApprovalMrs`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ filter: filterDays }),
      },
    )
      .then((res) => res.json())
      .then((data) => {
        const thisWeekCount = data.this_week || 0;
        const lastWeekCount = data.last_week || 0;

        setThisWeek(thisWeekCount);
        setLastWeek(lastWeekCount);
        setItems(data.items || []);
        setTotalCount(data.total_count || 0);
        setMrCount(data.mr_count || 0);
        setJoCount(data.jo_count || 0);
        setPaymentCount(data.payment_count || 0);
        setBottleneckStages(data.bottleneck_stages || []);
        setProjectsAtRisk(data.projects_at_risk || []);

        if (lastWeekCount === 0) {
          if (thisWeekCount > 0) {
            setPercentageChange(100);
            setIsIncrease(true);
          } else {
            setPercentageChange(0);
            setIsIncrease(true);
          }
        } else {
          const change =
            ((thisWeekCount - lastWeekCount) / lastWeekCount) * 100;
          setPercentageChange(Math.min(Math.abs(change), 100));
          setIsIncrease(change >= 0);
        }
      })
      .catch((err) => {
        console.error("Error fetching MR data:", err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [filterDays]);

  // Hover handlers
  const handleMouseEnter = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button, a, [role='button']")) return;
    setMousePosition({ x: e.clientX, y: e.clientY });
    setIsWaiting(true);
    hoverTimer.current = setTimeout(() => {
      setIsWaiting(false);
      setShowPopup(true);
    }, 2000);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button, a, [role='button']")) {
      if (hoverTimer.current) {
        clearTimeout(hoverTimer.current);
        hoverTimer.current = null;
      }
      setIsWaiting(false);
      setShowPopup(false);
      return;
    }
    setMousePosition({ x: e.clientX, y: e.clientY });
  };

  const handleMouseDown = () => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
    setIsWaiting(false);
    setShowPopup(false);
  };

  const handleMouseLeave = () => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
    setShowPopup(false);
    setIsWaiting(false);
    setExpandedBottleneck(false);
    setExpandedProjects(false);
  };

  const hasNoPendingApprovals = thisWeek === 0;

  const isSubstantial = percentageChange >= 10;
  const changeMagnitude = isSubstantial ? "Substantial" : "Slight";

  const pillBackgroundColor = hasNoPendingApprovals
    ? "rgba(156, 156, 156, 1)"
    : isIncrease
      ? "rgba(246, 205, 205, 1)"
      : "rgba(111, 243, 187, 1)";

  const textColor = isIncrease ? "rgba(248, 77, 77, 1)" : "rgba(2, 122, 70, 1)";

  const arrow = isIncrease ? upArrow : downArrow;

  const isAllTime = filterDays === 0;
  const periodLabel = isAllTime
    ? "all time"
    : filterDays === 7
      ? "week"
      : `${filterDays} days`;
  const changeText = hasNoPendingApprovals
    ? "No pending approvals"
    : isAllTime
      ? "Total pending approvals across all time"
      : isIncrease
        ? `${changeMagnitude} increase from last ${periodLabel}`
        : `${changeMagnitude} decrease from last ${periodLabel}`;

  // Hover popup positioning
  const popupWidth = 500;
  const popupMaxHeight = 500;
  const offsetX = 20;
  const offsetY = 20;

  const popupLeft =
    typeof window !== "undefined" &&
    mousePosition.x + offsetX + popupWidth > window.innerWidth
      ? mousePosition.x - popupWidth - 10
      : mousePosition.x + offsetX;

  const popupTop =
    typeof window !== "undefined" &&
    mousePosition.y + offsetY + popupMaxHeight > window.innerHeight
      ? Math.max(10, mousePosition.y - popupMaxHeight)
      : mousePosition.y + offsetY;

  // Format helpers (mirrored from W_ActiveMrs)
  const formatMedianTime = (minutes: number): string => {
    if (minutes == null || isNaN(minutes)) return "N/A";
    const mins = Math.round(minutes);
    if (mins < 60) return `${mins} minutes`;
    const hours = mins / 60;
    if (hours < 24) return `${Math.round(hours * 10) / 10} hours`;
    const days = hours / 24;
    return `${Math.round(days * 10) / 10} days`;
  };

  const getMedianColor = (minutes: number): string => {
    if (minutes == null || isNaN(minutes)) return "#888";
    const hours = minutes / 60;
    if (hours < 24) return "rgba(16, 185, 129, 1)"; // green - under a day
    const days = hours / 24;
    if (days <= 3) return "rgba(234, 179, 8, 1)"; // yellow - 1-3 days
    return "rgba(248, 77, 77, 1)"; // red - over 3 days
  };

  // Build breakdown entries, hiding zero counts
  const breakdownEntries: { count: number; label: string }[] = [
    { count: Number(mrCount) || 0, label: "Material Requests" },
    { count: Number(joCount) || 0, label: "Job Orders" },
    { count: Number(paymentCount) || 0, label: "Payment Requests" },
  ].filter((entry) => entry.count > 0);

  return (
    <div
      className="item"
      style={{ cursor: "pointer" }}
      onClick={() => router.push("/dashboard/details/pending-approvals")}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
    >
      <div className="top">
        <span>Pending Approvals</span>
        <img src={approvalsIcon} alt="approvals icon" />
      </div>
      <div>
        <div className="bottom">
          <p className="number">{isLoading ? "..." : thisWeek}</p>
        </div>
        <br />
        <span>{isLoading ? "Loading..." : changeText}</span>
      </div>

      {isWaiting && !showPopup && (
        <HoverLoadingCursor mouseX={mousePosition.x} mouseY={mousePosition.y} />
      )}

      {showPopup && (
        <div
          style={{
            position: "fixed",
            left: popupLeft,
            top: popupTop,
            backgroundColor: "white",
            color: "black",
            border: "1px solid rgba(223,223,223,1)",
            borderRadius: "10px",
            padding: "20px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 10000,
            width: `${popupWidth}px`,
            pointerEvents: "none",
          }}
        >
          {/* Title */}
          <h3 style={{ fontWeight: 600, margin: 0 }}>Pending Approvals</h3>

          {/* Count */}
          <p
            style={{
              fontWeight: 700,
              color: "rgba(248, 77, 77, 1)",
              margin: "10px 0",
            }}
          >
            {thisWeek}
          </p>

          <hr
            style={{
              border: "none",
              borderTop: "1px solid #eee",
              margin: "15px 0",
            }}
          />

          {/* Description */}
          <p
            style={{
              color: "#555",
              lineHeight: "1.4",
              margin: "0 0 10px 0",
            }}
          >
            All pending requests awaiting approval, including material, job, and
            payment requests. Delays in approvals may slow down overall
            processing.
          </p>

          {/* Breakdown (no header, hide zeros) */}
          {breakdownEntries.length > 0 && (
            <>
              <hr
                style={{
                  border: "none",
                  borderTop: "1px solid #eee",
                  margin: "15px 0",
                }}
              />
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  marginBottom: "10px",
                }}
              >
                {breakdownEntries.map((entry) => (
                  <div
                    key={entry.label}
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: "10px",
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 700,
                        color: "rgba(248, 77, 77, 1)",
                      }}
                    >
                      {entry.count}
                    </span>
                    <span style={{ color: "#333" }}>
                      <strong>{entry.label}</strong> pending
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          <hr
            style={{
              border: "none",
              borderTop: "1px solid #eee",
              margin: "15px 0",
            }}
          />

          {/* Bottleneck Stages */}
          <div style={{ marginBottom: "10px" }}>
            <h4 style={{ margin: "0 0 10px 0" }}>BOTTLENECK STAGES</h4>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "4px" }}
            >
              {bottleneckStages.length === 0 ? (
                <span style={{ color: "#aaa" }}>No data</span>
              ) : (
                <>
                  {(expandedBottleneck
                    ? bottleneckStages
                    : bottleneckStages.slice(0, 5)
                  ).map((stage) => (
                    <div
                      key={stage.progress_id}
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: "10px",
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 700,
                          color: "rgba(248, 77, 77, 1)",
                        }}
                      >
                        {stage.mr_count}
                      </span>
                      <span style={{ color: "#333" }}>
                        from{" "}
                        <strong>
                          {stage.progress_name || `Stage ${stage.progress_id}`}
                        </strong>{" "}
                        with current median time of{" "}
                        <span
                          style={{
                            color: getMedianColor(stage.median_minutes),
                            fontStyle: "italic",
                          }}
                        >
                          {formatMedianTime(stage.median_minutes)}
                        </span>
                      </span>
                    </div>
                  ))}
                  {bottleneckStages.length > 5 && !expandedBottleneck && (
                    <span
                      style={{
                        color: "#555",
                        textDecoration: "underline",
                        cursor: "pointer",
                        pointerEvents: "auto",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedBottleneck(true);
                      }}
                    >
                      ... and {bottleneckStages.length - 5} more stages
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          <hr
            style={{
              border: "none",
              borderTop: "1px solid #eee",
              margin: "15px 0",
            }}
          />

          {/* Projects at Risk */}
          <div style={{ marginBottom: "10px" }}>
            <h4 style={{ margin: "0 0 10px 0" }}>PROJECTS AT RISK</h4>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "4px" }}
            >
              {projectsAtRisk.length === 0 ? (
                <span style={{ color: "#aaa" }}>No data</span>
              ) : (
                <>
                  {(expandedProjects
                    ? projectsAtRisk
                    : projectsAtRisk.slice(0, 5)
                  ).map((project) => (
                    <div
                      key={project.project_name}
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: "10px",
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 700,
                          color: "rgba(248, 77, 77, 1)",
                        }}
                      >
                        {project.mr_count}
                      </span>
                      <span style={{ color: "#333" }}>
                        from <strong>{project.project_name}</strong>
                      </span>
                    </div>
                  ))}
                  {projectsAtRisk.length > 5 && !expandedProjects && (
                    <span
                      style={{
                        color: "#555",
                        textDecoration: "underline",
                        cursor: "pointer",
                        pointerEvents: "auto",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedProjects(true);
                      }}
                    >
                      ... and {projectsAtRisk.length - 5} more projects
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          <hr
            style={{
              border: "none",
              borderTop: "1px solid #eee",
              margin: "15px 0",
            }}
          />

          {/* Footer */}
          <p
            style={{
              color: "#999",
              fontStyle: "italic",
              margin: 0,
            }}
          >
            Based on {thisWeek} pending approval
            {thisWeek === 1 ? "" : "s"}
          </p>
        </div>
      )}
    </div>
  );
}
