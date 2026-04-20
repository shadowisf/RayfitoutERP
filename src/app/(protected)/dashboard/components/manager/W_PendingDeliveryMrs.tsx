"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import HoverLoadingCursor from "../HoverLoadingCursor";

type props = {
  filterDays?: number;
};

type DelayedVendor = {
  supplier_name: string;
  lpo_count: number;
};

type ProjectImpact = {
  project_name: string;
  mr_count: number;
};

export default function PendingDeliveryMrsWidget({ filterDays }: props) {
  const router = useRouter();
  const deliveriesIcon = "/icons/deliveries.svg";
  const upArrow = "/icons/arrow-up-chart-red-big.svg";
  const downArrow = "/icons/arrow-down-chart-green-big.svg";

  const [thisWeek, setThisWeek] = useState<number>(0);
  const [lastWeek, setLastWeek] = useState<number>(0);
  const [percentageChange, setPercentageChange] = useState<number>(0);
  const [isIncrease, setIsIncrease] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [items, setItems] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Hover stats
  const [itemsDelayed, setItemsDelayed] = useState<number>(0);
  const [valueImpact, setValueImpact] = useState<number>(0);
  const [delayedVendors, setDelayedVendors] = useState<DelayedVendor[]>([]);
  const [projectImpactValue, setProjectImpactValue] = useState<ProjectImpact[]>(
    [],
  );
  const [totalIssuedLpos, setTotalIssuedLpos] = useState<number>(0);
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


  useEffect(() => {
    const handleCloseHover = () => {
      setShowPopup(false);
      setIsWaiting(false);
      if (hoverTimer.current) {
        clearTimeout(hoverTimer.current);
        hoverTimer.current = null;
      }
    };
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
      if (customE.detail?.source !== "pending-delivery") {
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
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/dashboard/manager/getTotalPendingDeliveryMrs`,
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
        setItemsDelayed(Number(data.items_delayed) || 0);
        setValueImpact(Number(data.value_impact) || 0);
        setDelayedVendors(data.delayed_vendors || []);
        setProjectImpactValue(data.project_impact_value || []);
        setTotalIssuedLpos(Number(data.total_issued_lpos) || 0);
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

  // Start a delayed hide – cancelled if user re-enters widget or popup
  const startHideTimer = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      setShowPopup(false);
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
    window.dispatchEvent(
      new CustomEvent("close-all-hover-popups", {
        detail: { source: "pending-delivery" },
      }),
    );
    cancelHideTimer();
    setMousePosition({ x: e.clientX, y: e.clientY });
    if (!showPopup) {
      setIsWaiting(true);
      hoverTimer.current = setTimeout(() => {
        setIsWaiting(false);
        setShowPopup(true);
        window.dispatchEvent(
          new CustomEvent("close-all-hover-popups", {
            detail: { source: "pending-delivery" },
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

  const hasNoPendingDeliveries = thisWeek === 0;

  const isSubstantial = percentageChange >= 10;
  const changeMagnitude = isSubstantial ? "Substantial" : "Slight";

  const pillBackgroundColor = hasNoPendingDeliveries
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
  const changeText = hasNoPendingDeliveries
    ? "No pending deliveries"
    : isAllTime
      ? "Total pending deliveries across all time"
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

  // Format the date range footer using en-GB locale ("from DD MMM YYYY to
  // DD MMM YYYY"). Returns null when either bound is missing.
  const formatDateRange = (): string | null => {
    if (!dateRange.earliest || !dateRange.latest) return null;

    const earliest = new Date(dateRange.earliest).toLocaleDateString("en-GB");
    const latest = new Date(dateRange.latest).toLocaleDateString("en-GB");
    return `from ${earliest} to ${latest}`;
  };
  const dateRangeText = formatDateRange();

  // Format value impact as negative number with thousand separators (AED rendered separately)
  const formatValueImpactNumber = (value: number): string => {
    const absValue = Math.abs(value);
    const formatted = absValue.toLocaleString("en-US", {
      maximumFractionDigits: 0,
    });
    return `-${formatted}`;
  };

  return (
    <div
      ref={widgetRef}
      className="item"
      style={{ cursor: "pointer" }}
      onClick={() => router.push("/dashboard/details/pending-deliveries")}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
    >
      <div className="top">
        <span>Pending Deliveries</span>
        <img src={deliveriesIcon} alt="deliveries icon" />
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
          <h3 style={{ fontWeight: 600, margin: 0 }}>Pending Delivery</h3>

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
            This is the total financial risk from all pending deliveries
            including paid amounts and outstanding credit balances. Cash
            transactions appear after payment.
          </p>

          <hr
            style={{
              border: "none",
              borderTop: "1px solid #eee",
              margin: "15px 0",
            }}
          />

          {/* Items Delay + Value Impact stats */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              marginBottom: "10px",
            }}
          >
            <div
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
                {itemsDelayed}
              </span>
              <span style={{ color: "#333", fontWeight: 700 }}>Item Delay</span>
            </div>
            <div
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
                {formatValueImpactNumber(valueImpact)}{" "}
                <span style={{ color: "#999", fontWeight: 400 }}>AED</span>
              </span>
              <span style={{ color: "#333", fontWeight: 700 }}>
                Value Impact
              </span>
            </div>
          </div>

          <hr
            style={{
              border: "none",
              borderTop: "1px solid #eee",
              margin: "15px 0",
            }}
          />

          {/* Delayed Vendors */}
          <div style={{ marginBottom: "10px" }}>
            <h4 style={{ margin: "0 0 10px 0" }}>DELAYED VENDORS</h4>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "4px" }}
            >
              {delayedVendors.length === 0 ? (
                <span style={{ color: "#aaa" }}>No data</span>
              ) : (
                <>
                  {delayedVendors.slice(0, 5).map((vendor, idx) => (
                    <div
                      key={`${vendor.supplier_name}-${idx}`}
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
                        {vendor.lpo_count}
                      </span>
                      <span style={{ color: "#333" }}>
                        {vendor.supplier_name || "Unknown vendor"}
                      </span>
                    </div>
                  ))}
                  {delayedVendors.length > 5 && (
                    <span style={{ color: "#555" }}>
                      ... and {delayedVendors.length - 5} more vendors
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

          {/* Project Impact Value */}
          <div style={{ marginBottom: "10px" }}>
            <h4 style={{ margin: "0 0 10px 0" }}>PROJECT IMPACT VALUE</h4>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "4px" }}
            >
              {projectImpactValue.length === 0 ? (
                <span style={{ color: "#aaa" }}>No data</span>
              ) : (
                <>
                  {projectImpactValue.slice(0, 5).map((project, idx) => (
                    <div
                      key={`${project.project_name}-${idx}`}
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
                        MR{project.mr_count === 1 ? "" : "s"} delayed for{" "}
                        <strong>
                          {project.project_name || "Unknown project"}
                        </strong>
                      </span>
                    </div>
                  ))}
                  {projectImpactValue.length > 5 && (
                    <span style={{ color: "#555" }}>
                      ... and {projectImpactValue.length - 5} more projects
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
            Based on {totalIssuedLpos.toLocaleString("en-US")} issued LPO
            {totalIssuedLpos === 1 ? "" : "s"} {dateRangeText && dateRangeText}
          </p>
        </div>
      )}
    </div>
  );
}
