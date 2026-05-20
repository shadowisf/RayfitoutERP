"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type props = {
  dateFrom?: string;
  dateTo?: string;
};

type PaymentType = {
  supplier_type: string;
  lpo_count: number;
};

type ProjectAtRisk = {
  project_name: string;
  mr_count: number;
};

export default function PendingPaymentMrsWidget({ dateFrom, dateTo }: props) {
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
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
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
    window.addEventListener("blur", handleCloseHover);
    return () => {
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
        body: JSON.stringify({ date_from: dateFrom, date_to: dateTo }),
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
        setPaymentTypes(data.payment_types || []);
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
  }, [dateFrom, dateTo]);

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

  const isAllTime = !dateFrom && !dateTo;
  const periodLabel = isAllTime
    ? "all time"
    : dateFrom && dateTo
      ? `${dateFrom} – ${dateTo}`
      : dateFrom
        ? `from ${dateFrom}`
        : `to ${dateTo}`;
  const filteredLabel = dateFrom && dateTo
    ? `from ${dateFrom} to ${dateTo}`
    : dateFrom
      ? `from ${dateFrom}`
      : `to ${dateTo}`;
  const changeText = hasNoPendingPayments
    ? "No pending payments"
    : isAllTime
      ? "Total pending payments across all time"
      : `Total pending payments ${filteredLabel}`;

  // Hover popup positioning – stationary, anchored to widget
  const popupWidth = 500;

  const getPopupPosition = () => {
    if (!widgetRef.current) return { left: 0, top: 80 };
    const rect = widgetRef.current.getBoundingClientRect();
    const spaceRight = window.innerWidth - rect.right;
    const left =
      spaceRight >= popupWidth + 10
        ? rect.right + 10
        : rect.left - popupWidth - 10;
    return { left: Math.max(10, left), top: 80 };
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

  return (
    <div
      ref={widgetRef}
      className="item"
      style={{ cursor: "pointer" }}
      onClick={() => router.push("/payment")}
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
            maxHeight: "calc(100vh - 160px)",
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

          {/* Payment Types */}
          <div style={{ marginBottom: "10px" }}>
            <h4 style={{ margin: "0 0 10px 0" }}>PAYMENT TYPES</h4>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "4px" }}
            >
              {paymentTypes.length === 0 ? (
                <span style={{ color: "#aaa" }}>No data</span>
              ) : (
                <>
                  {paymentTypes.map((pt) => (
                    <div
                      key={pt.supplier_type}
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
                        {pt.lpo_count}
                      </span>
                      <span style={{ color: "#333" }}>
                        from <strong>{pt.supplier_type}</strong> vendors
                      </span>
                    </div>
                  ))}
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
