"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import HoverLoadingCursor from "../HoverLoadingCursor";

type props = {
  filterDays?: number;
};

type TopProject = {
  project_name: string;
  total_amount: number;
};

type TopSupplier = {
  supplier_name: string;
  total_amount: number;
};

export default function OutboundPaymentMrsWidget({ filterDays }: props) {
  const router = useRouter();
  const outboundPaymentsIcon = "/icons/outbound-payments.svg";
  const upArrow = "/icons/arrow-up-chart-red-big.svg";
  const downArrow = "/icons/arrow-down-chart-green-big.svg";

  const [thisWeek, setThisWeek] = useState<number>(0);
  const [lastWeek, setLastWeek] = useState<number>(0);
  const [percentageChange, setPercentageChange] = useState<number>(0);
  const [isIncrease, setIsIncrease] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [items, setItems] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [paidTotal, setPaidTotal] = useState<number>(0);
  const [committedTotal, setCommittedTotal] = useState<number>(0);
  const [topProjects, setTopProjects] = useState<TopProject[]>([]);
  const [topSuppliers, setTopSuppliers] = useState<TopSupplier[]>([]);
  const [lpoCount, setLpoCount] = useState<number>(0);
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
    const handleScroll = () => {
      setShowPopup(false);
    };
    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, []);

  useEffect(() => {
    const handleCloseAll = (e: Event) => {
      const customE = e as CustomEvent;
      if (customE.detail?.source !== "outbound-payment") {
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
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/dashboard/manager/getTotalOutboundPayment`,
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
        const thisWeekCount = data.this_week_total || 0;
        const lastWeekCount = data.last_week_total || 0;

        setThisWeek(thisWeekCount);
        setLastWeek(lastWeekCount);
        setItems(data.items || []);
        setTotalCount(data.total_count || 0);
        setPaidTotal(data.paid_total || 0);
        setCommittedTotal(data.committed_total || 0);
        setTopProjects(data.top_projects || []);
        setTopSuppliers(data.top_suppliers || []);
        setLpoCount(data.lpo_count || 0);
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
        console.error("Error fetching outbound payment data:", err);
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
        detail: { source: "outbound-payment" },
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
            detail: { source: "outbound-payment" },
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

  const hasNoOutboundPayments = thisWeek === 0;

  const isSubstantial = percentageChange >= 10;
  const changeMagnitude = isSubstantial ? "Substantial" : "Slight";

  const pillBackgroundColor = hasNoOutboundPayments
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
  const changeText = hasNoOutboundPayments
    ? "No outbound payments"
    : isAllTime
      ? "Total outbound payments across all time"
      : isIncrease
        ? `${changeMagnitude} increase from last ${periodLabel}`
        : `${changeMagnitude} decrease from last ${periodLabel}`;

  // Helper function to format numbers with commas and 2 decimal places
  const formatCurrency = (value: number) => {
    return value.toLocaleString("en-US", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
  };

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

  const balance = paidTotal + committedTotal;

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
      onClick={() => router.push("/dashboard/details/outbound-payments")}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
    >
      <div className="top">
        <span>Outbound Payments</span>
        <img src={outboundPaymentsIcon} alt="deliveries icon" />
      </div>
      <div>
        <div className="bottom">
          <p className="number">
            {isLoading ? (
              "..."
            ) : (
              <>AED {formatCurrency(Number(thisWeek || 0))}</>
            )}
          </p>
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
          <h3 style={{ fontWeight: 600, margin: 0 }}>Outbound Payments</h3>

          {/* Balance */}
          <p
            style={{
              fontWeight: 700,
              margin: "10px 0",
              display: "flex",
              alignItems: "baseline",
              gap: "10px",
            }}
          >
            <span>
              <span style={{ color: "rgba(248, 77, 77, 1)" }}>
                +{formatCurrency(balance)}
              </span>{" "}
              <span style={{ color: "#999", fontWeight: 400 }}>AED</span>{" "}
            </span>
            <strong style={{ color: "#333" }}>Balance</strong>
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
            Financial exposure from issued LPOs only. Includes paid LPO values
            and committed outstanding balances for credit suppliers. Cash
            suppliers are reflected only once payment is released.
          </p>

          <hr
            style={{
              border: "none",
              borderTop: "1px solid #eee",
              margin: "15px 0",
            }}
          />

          {/* Payment Breakdown */}
          {(paidTotal > 0 || committedTotal > 0) && (
            <div style={{ marginBottom: "10px" }}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                {paidTotal > 0 && (
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
                      +{formatCurrency(paidTotal)}{" "}
                      <span style={{ color: "#999", fontWeight: 400 }}>
                        AED
                      </span>
                    </span>
                    <span style={{ color: "#333" }}>
                      <strong>Paid (Cash + Credit)</strong>
                    </span>
                  </div>
                )}
                {committedTotal > 0 && (
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
                      +{formatCurrency(committedTotal)}{" "}
                      <span style={{ color: "#999", fontWeight: 400 }}>
                        AED
                      </span>
                    </span>
                    <span style={{ color: "#333" }}>
                      <strong>Committed (Credit)</strong>
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <hr
            style={{
              border: "none",
              borderTop: "1px solid #eee",
              margin: "15px 0",
            }}
          />

          {/* Top Projects */}
          <div style={{ marginBottom: "10px" }}>
            <h4 style={{ margin: "0 0 10px 0" }}>TOP 5 PROJECTS</h4>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              {topProjects.length === 0 ? (
                <span style={{ color: "#aaa" }}>No data</span>
              ) : (
                <>
                  {topProjects.slice(0, 5).map((project) => (
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
                        +{formatCurrency(Number(project.total_amount))}{" "}
                        <span style={{ color: "#999", fontWeight: 400 }}>
                          AED
                        </span>
                      </span>
                      <span style={{ color: "#333" }}>
                        for <strong>{project.project_name}</strong>
                      </span>
                    </div>
                  ))}
                  {topProjects.length > 5 && (
                    <span style={{ color: "#555" }}>
                      ... and {topProjects.length - 5} more projects
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

          {/* Top Suppliers */}
          <div style={{ marginBottom: "10px" }}>
            <h4 style={{ margin: "0 0 10px 0" }}>TOP 5 SUPPLIERS</h4>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              {topSuppliers.length === 0 ? (
                <span style={{ color: "#aaa" }}>No data</span>
              ) : (
                <>
                  {topSuppliers.slice(0, 5).map((supplier) => (
                    <div
                      key={supplier.supplier_name}
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
                        +{formatCurrency(Number(supplier.total_amount))}{" "}
                        <span style={{ color: "#999", fontWeight: 400 }}>
                          AED
                        </span>
                      </span>
                      <span style={{ color: "#333" }}>
                        from{" "}
                        <strong>
                          {supplier.supplier_name || "Unknown Supplier"}
                        </strong>
                      </span>
                    </div>
                  ))}
                  {topSuppliers.length > 5 && (
                    <span style={{ color: "#555" }}>
                      ... and {topSuppliers.length - 5} more suppliers
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
            Based on {lpoCount} issued LPOs {dateRangeText && dateRangeText}
          </p>
        </div>
      )}
    </div>
  );
}
