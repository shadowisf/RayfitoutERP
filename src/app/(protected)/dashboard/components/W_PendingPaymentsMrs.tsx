"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

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

export default function PendingPaymentMrsWidget({ filterDays }: props) {
  const router = useRouter();
  const paymentsIcon = "/icons/payments.svg";
  const upArrow = "/icons/arrow-up-chart-red-big.svg";
  const downArrow = "/icons/arrow-down-chart-green-big.svg";

  const [thisWeek, setThisWeek] = useState<number>(0);
  const [lastWeek, setLastWeek] = useState<number>(0);
  const [percentageChange, setPercentageChange] = useState<number>(0);
  const [isIncrease, setIsIncrease] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [items, setItems] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
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
  const hideTimer = useRef<NodeJS.Timeout | null>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleCloseHover = () => setShowPopup(false);
    window.addEventListener("scroll", handleCloseHover, true);
    window.addEventListener("blur", handleCloseHover);
    return () => {
      window.removeEventListener("scroll", handleCloseHover, true);
      window.removeEventListener("blur", handleCloseHover);
    };
  }, []);

  useEffect(() => {
    const handleCloseAll = (e: Event) => {
      const customE = e as CustomEvent;
      if (customE.detail?.source !== "pending-payments") setShowPopup(false);
    };
    window.addEventListener("close-all-hover-popups", handleCloseAll);
    return () =>
      window.removeEventListener("close-all-hover-popups", handleCloseAll);
  }, []);

  // Close when clicking outside widget and popup
  useEffect(() => {
    const handleDocumentMouseDown = (e: MouseEvent) => {
      if (
        widgetRef.current?.contains(e.target as Node) ||
        popupRef.current?.contains(e.target as Node)
      )
        return;
      setShowPopup(false);
    };
    document.addEventListener("mousedown", handleDocumentMouseDown);
    return () =>
      document.removeEventListener("mousedown", handleDocumentMouseDown);
  }, []);

  useEffect(() => {
    setIsLoading(true);

    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/dashboard/manager/getTotalPendingPaymentMrs`,
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
        setBottleneckStages(data.bottleneck_stages || []);
        setProjectsAtRisk(data.projects_at_risk || []);
        setDateRange(data.date_range || { earliest: null, latest: null });

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

  // Short grace-period so cursor can travel from widget edge to popup
  const startHideTimer = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      setShowPopup(false);
    }, 120);
  };

  const cancelHideTimer = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };

  // Show immediately on hover
  const handleMouseEnter = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button, a, [role='button']")) return;
    window.dispatchEvent(
      new CustomEvent("close-all-hover-popups", {
        detail: { source: "pending-payments" },
      }),
    );
    cancelHideTimer();
    setShowPopup(true);
  };

  const handleMouseLeave = () => {
    startHideTimer();
  };

  // Popup hover handlers — stay visible while cursor is inside popup
  const handlePopupMouseEnter = () => {
    cancelHideTimer();
  };

  const handlePopupMouseLeave = () => {
    setShowPopup(false);
  };

  const hasNoPendingPayments = thisWeek === 0;

  const isSubstantial = percentageChange >= 10;
  const changeMagnitude = isSubstantial ? "Substantial" : "Slight";

  const pillBackgroundColor = hasNoPendingPayments
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
  const changeText = hasNoPendingPayments
    ? "No pending payments"
    : isAllTime
      ? "Total pending payments across all time"
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

  // Format the date range footer using en-GB locale ("from DD MMM YYYY to
  // DD MMM YYYY"). Returns null when either bound is missing.
  const formatDateRange = (): string | null => {
    if (!dateRange.earliest || !dateRange.latest) return null;

    const earliest = new Date(dateRange.earliest).toLocaleDateString("en-GB");
    const latest = new Date(dateRange.latest).toLocaleDateString("en-GB");
    return `from ${earliest} to ${latest}`;
  };
  const dateRangeText = formatDateRange();

  // Filter bottleneck stages to only show payment-related stages
  const paymentStages = bottleneckStages.filter((stage) => {
    const name = (stage.progress_name || "").toLowerCase();
    return (
      name.includes("payment") ||
      name.includes("lpo") ||
      name.includes("deliver") ||
      name.includes("outbound")
    );
  });

  return (
    <div
      ref={widgetRef}
      className="item"
      style={{ cursor: "pointer" }}
      onClick={() => router.push("/dashboard/details/pending-payments")}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="top">
        <span>Pending Payments</span>
        <img src={paymentsIcon} alt="payments icon" />
      </div>
      <div>
        <div className="bottom">
          <p className="number">{isLoading ? "..." : thisWeek}</p>
        </div>
        <br />
        <span>{isLoading ? "Loading..." : changeText}</span>
      </div>

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
          <h3 style={{ fontWeight: 600, margin: 0 }}>Pending Payments</h3>

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
            Requests that are still in progress and not yet completed. Delays
            across approval or delivery stages may slow down overall payment
            processing.
          </p>

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
              {paymentStages.length === 0 ? (
                <span style={{ color: "#aaa" }}>No data</span>
              ) : (
                <>
                  {paymentStages.slice(0, 5).map((stage) => (
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
                  {paymentStages.length > 5 && (
                    <span style={{ color: "#555" }}>
                      ... and {paymentStages.length - 5} more stages
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
                  {projectsAtRisk.slice(0, 5).map((project) => (
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
                  {projectsAtRisk.length > 5 && (
                    <span style={{ color: "#555" }}>
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
            Based on {thisWeek} issued LPO
            {thisWeek === 1 ? "" : "s"} {dateRangeText && dateRangeText}
          </p>
        </div>
      )}
    </div>
  );
}
