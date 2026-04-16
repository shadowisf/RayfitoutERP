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
  const [dateRange, setDateRange] = useState<{
    earliest: string | null;
    latest: string | null;
  }>({ earliest: null, latest: null });

  // Hover popup state
  const [showPopup, setShowPopup] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const hoverTimer = useRef<NodeJS.Timeout | null>(null);
  const hideTimer = useRef<NodeJS.Timeout | null>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // Expand states
  const [expandedBottleneck, setExpandedBottleneck] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowPopup(false);
    };
    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, []);

  useEffect(() => {
    const handleCloseAll = (e: Event) => {
      const customE = e as CustomEvent;
      if (customE.detail?.source !== "pending-approvals") {
        setShowPopup(false);
        setIsWaiting(false);
        if (hoverTimer.current) {
          clearTimeout(hoverTimer.current);
          hoverTimer.current = null;
        }
      }
    };
    window.addEventListener("close-all-hover-popups", handleCloseAll);
    return () =>
      window.removeEventListener("close-all-hover-popups", handleCloseAll);
  }, []);

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
        setDateRange(
          data.date_range || { earliest: null, latest: null },
        );

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

  // Start a delayed hide – cancelled if user re-enters widget or popup
  const startHideTimer = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      setShowPopup(false);
      setExpandedBottleneck(false);
      setExpandedProjects(false);
    }, 2500);
  };

  const cancelHideTimer = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };

  // Hover handlers
  const handleMouseEnter = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button, a, [role='button']")) return;
    window.dispatchEvent(new CustomEvent("close-all-hover-popups", { detail: { source: "pending-approvals" } }));
    cancelHideTimer();
    setMousePosition({ x: e.clientX, y: e.clientY });
    if (!showPopup) {
      setIsWaiting(true);
      hoverTimer.current = setTimeout(() => {
        setIsWaiting(false);
        setShowPopup(true);
        window.dispatchEvent(
          new CustomEvent("close-all-hover-popups", {
            detail: { source: "pending-approvals" },
          }),
        );
      }, 2000);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button, a, [role='button']")) {
      if (hoverTimer.current) {
        clearTimeout(hoverTimer.current);
        hoverTimer.current = null;
      }
      setIsWaiting(false);
      return;
    }
    if (!showPopup) {
      setMousePosition({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (popupRef.current?.contains(e.target as Node)) return;
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
    setIsWaiting(false);
    if (showPopup) {
      startHideTimer();
    }
  };

  // Popup hover handlers
  const handlePopupMouseEnter = () => {
    cancelHideTimer();
  };

  const handlePopupMouseLeave = () => {
    startHideTimer();
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

  // Hover popup positioning – stationary, anchored to widget
  const popupWidth = 500;

  const getPopupPosition = () => {
    if (!widgetRef.current) return { left: 0, top: 10 };
    const rect = widgetRef.current.getBoundingClientRect();
    const spaceRight = window.innerWidth - rect.right;
    const left =
      spaceRight >= popupWidth + 10
        ? rect.right + 10
        : rect.left - popupWidth - 10;
    return { left: Math.max(10, left), top: 10 };
  };

  // Format helpers (mirrored from W_ActiveMrs)
  const formatMedianTime = (minutes: number): string => {
    if (minutes == null || isNaN(minutes)) return "N/A";
    const totalMins = Math.max(0, Math.round(minutes));
    if (totalMins === 0) return "0 mins";

    const days = Math.floor(totalMins / (60 * 24));
    const hours = Math.floor((totalMins % (60 * 24)) / 60);
    const mins = totalMins % 60;

    const parts: string[] = [];
    if (days > 0) parts.push(`${days} ${days === 1 ? "day" : "days"}`);
    if (hours > 0) parts.push(`${hours} ${hours === 1 ? "hour" : "hours"}`);
    if (mins > 0) parts.push(`${mins} ${mins === 1 ? "min" : "mins"}`);

    return parts.join(" ");
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

  // Format the date range footer ("from DD MMM YYYY to DD MMM YYYY")
  // using en-GB locale. Returns null when either bound is missing.
  const formatDateRange = (): string | null => {
    if (!dateRange.earliest || !dateRange.latest) return null;
    const opts: Intl.DateTimeFormatOptions = {
      day: "2-digit",
      month: "short",
      year: "numeric",
    };
    const earliest = new Date(dateRange.earliest).toLocaleDateString(
      "en-GB",
      opts,
    );
    const latest = new Date(dateRange.latest).toLocaleDateString(
      "en-GB",
      opts,
    );
    return `from ${earliest} to ${latest}`;
  };
  const dateRangeText = formatDateRange();

  // Filter bottleneck stages to only show approval-related stages
  const approvalStages = bottleneckStages.filter((stage) => {
    const name = (stage.progress_name || "").toLowerCase();
    return (
      name.includes("approval") ||
      name.includes("approve") ||
      name.includes("initial") ||
      name.includes("price")
    );
  });

  return (
    <div
      ref={widgetRef}
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
          ref={popupRef}
          onMouseEnter={handlePopupMouseEnter}
          onMouseLeave={handlePopupMouseLeave}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            left: getPopupPosition().left,
            top: getPopupPosition().top,
            backgroundColor: "white",
            color: "black",
            border: "1px solid rgba(223,223,223,1)",
            borderRadius: "10px",
            padding: "20px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 10000,
            width: `${popupWidth}px`,
            maxHeight: "calc(100vh - 20px)",
            overflowY: "auto",
            pointerEvents: "auto",
            cursor: "default",
            userSelect: "text",
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
              {approvalStages.length === 0 ? (
                <span style={{ color: "#aaa" }}>No data</span>
              ) : (
                <>
                  {(expandedBottleneck
                    ? approvalStages
                    : approvalStages.slice(0, 5)
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
                        <strong>
                          {formatMedianTime(stage.median_minutes)}
                        </strong>
                      </span>
                    </div>
                  ))}
                  {approvalStages.length > 5 && !expandedBottleneck && (
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
                      ... and {approvalStages.length - 5} more stages
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
            Based on {thisWeek} MR
            {thisWeek === 1 ? "" : "s"}
            {dateRangeText && (
              <>
                <br />
                {dateRangeText}
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
