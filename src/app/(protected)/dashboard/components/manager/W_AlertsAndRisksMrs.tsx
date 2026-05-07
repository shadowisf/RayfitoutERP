"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import OverviewHoverPopup from "../OverviewHoverPopup";

export default function AlertsAndRiskMrsWidget() {
  const router = useRouter();
  const warningIcon = "/icons/warning-line.svg";
  const pendingResolutionsIcon = "/icons/pending-resolutions.svg";

  const [totalCriticalMrs, setTotalCriticalMrs] = useState<number>(0);
  const [criticalItems, setCriticalItems] = useState<any[]>([]);
  const [criticalTotalCount, setCriticalTotalCount] = useState<number>(0);
  const [criticalDateRange, setCriticalDateRange] = useState<{
    earliest: string | null;
    latest: string | null;
  }>({ earliest: null, latest: null });

  const [totalLateDeliveries, setTotalLateDeliveries] = useState<number>(0);
  const [lateItems, setLateItems] = useState<any[]>([]);
  const [lateTotalCount, setLateTotalCount] = useState<number>(0);
  const [lateDateRange, setLateDateRange] = useState<{
    earliest: string | null;
    latest: string | null;
  }>({ earliest: null, latest: null });

  const [totalPendingResolutions, setTotalPendingResolutions] =
    useState<number>(0);

  // Hover popup state for Critical MRs
  const [showCriticalPopup, setShowCriticalPopup] = useState(false);
  const [criticalMousePos, setCriticalMousePos] = useState({ x: 0, y: 0 });
  const criticalHoverTimer = useRef<NodeJS.Timeout | null>(null);
  const criticalHideTimer = useRef<NodeJS.Timeout | null>(null);
  const criticalWidgetRef = useRef<HTMLDivElement>(null);

  // Hover popup state for Late Deliveries
  const [showLatePopup, setShowLatePopup] = useState(false);
  const [lateMousePos, setLateMousePos] = useState({ x: 0, y: 0 });
  const lateHoverTimer = useRef<NodeJS.Timeout | null>(null);
  const lateHideTimer = useRef<NodeJS.Timeout | null>(null);
  const lateWidgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleCloseAll = (e: Event) => {
      const customE = e as CustomEvent;
      if (customE.detail?.source !== "alerts-risks") {
        setShowCriticalPopup(false);
        setShowLatePopup(false);
        if (criticalHoverTimer.current) {
          clearTimeout(criticalHoverTimer.current);
          criticalHoverTimer.current = null;
        }
        if (lateHoverTimer.current) {
          clearTimeout(lateHoverTimer.current);
          lateHoverTimer.current = null;
        }
      }
    };
    window.addEventListener("close-all-hover-popups", handleCloseAll);
    return () => window.removeEventListener("close-all-hover-popups", handleCloseAll);
  }, []);

  useEffect(() => {
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/dashboard/manager/getTotalCriticalMrs`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 20 }),
      },
    )
      .then((res) => res.json())
      .then((data) => {
        setTotalCriticalMrs(data.overdue_count || 0);
        setCriticalItems(data.items || []);
        setCriticalTotalCount(data.total_count || 0);
        setCriticalDateRange(
          data.date_range || { earliest: null, latest: null },
        );
      });

    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/dashboard/manager/getTotalLateDeliveries`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 20 }),
      },
    )
      .then((res) => res.json())
      .then((data) => {
        setTotalLateDeliveries(data.overdue_count || 0);
        setLateItems(data.items || []);
        setLateTotalCount(data.total_count || 0);
        setLateDateRange(
          data.date_range || { earliest: null, latest: null },
        );
      });
  }, []);

  // Hover handlers for Critical MRs
  const handleCriticalMouseEnter = (e: React.MouseEvent) => {
    window.dispatchEvent(new CustomEvent("close-all-hover-popups", { detail: { source: "alerts-risks" } }));
    if (criticalHideTimer.current) { clearTimeout(criticalHideTimer.current); criticalHideTimer.current = null; }
    setCriticalMousePos({ x: e.clientX, y: e.clientY });
    if (!showCriticalPopup) {
      criticalHoverTimer.current = setTimeout(() => {
        setShowCriticalPopup(true);
        window.dispatchEvent(new CustomEvent("close-all-hover-popups", { detail: { source: "alerts-risks" } }));
      }, 2000);
    }
  };
  const handleCriticalMouseMove = (e: React.MouseEvent) => {
    if (!showCriticalPopup) setCriticalMousePos({ x: e.clientX, y: e.clientY });
  };
  const handleCriticalMouseLeave = () => {
    if (criticalHoverTimer.current) {
      clearTimeout(criticalHoverTimer.current);
      criticalHoverTimer.current = null;
    }
    if (showCriticalPopup) {
      criticalHideTimer.current = setTimeout(() => setShowCriticalPopup(false), 2500);
    }
  };
  const handleCriticalPopupEnter = () => {
    if (criticalHideTimer.current) { clearTimeout(criticalHideTimer.current); criticalHideTimer.current = null; }
  };
  const handleCriticalPopupLeave = () => {
    criticalHideTimer.current = setTimeout(() => setShowCriticalPopup(false), 2500);
  };

  // Hover handlers for Late Deliveries
  const handleLateMouseEnter = (e: React.MouseEvent) => {
    window.dispatchEvent(new CustomEvent("close-all-hover-popups", { detail: { source: "alerts-risks" } }));
    if (lateHideTimer.current) { clearTimeout(lateHideTimer.current); lateHideTimer.current = null; }
    setLateMousePos({ x: e.clientX, y: e.clientY });
    if (!showLatePopup) {
      lateHoverTimer.current = setTimeout(() => {
        setShowLatePopup(true);
        window.dispatchEvent(new CustomEvent("close-all-hover-popups", { detail: { source: "alerts-risks" } }));
      }, 2000);
    }
  };
  const handleLateMouseMove = (e: React.MouseEvent) => {
    if (!showLatePopup) setLateMousePos({ x: e.clientX, y: e.clientY });
  };
  const handleLateMouseLeave = () => {
    if (lateHoverTimer.current) {
      clearTimeout(lateHoverTimer.current);
      lateHoverTimer.current = null;
    }
    if (showLatePopup) {
      lateHideTimer.current = setTimeout(() => setShowLatePopup(false), 2500);
    }
  };
  const handleLatePopupEnter = () => {
    if (lateHideTimer.current) { clearTimeout(lateHideTimer.current); lateHideTimer.current = null; }
  };
  const handleLatePopupLeave = () => {
    lateHideTimer.current = setTimeout(() => setShowLatePopup(false), 2500);
  };

  const formatDaysOverdue = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return `${days}d overdue`;
  };

  return (
    <div className="widget-container">
      <h3>Alerts & Risks</h3>
      <br />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "5px",
        }}
      >
        {/* Critical MRs */}
        <div
          ref={criticalWidgetRef}
          style={{
            backgroundColor: "rgba(255, 226, 226, 1)",
            cursor: "pointer",
            minHeight: "175px",
            padding: "20px",
            borderRadius: "15px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
          onClick={() => router.push("/dashboard/details/critical-mrs")}
          onMouseEnter={handleCriticalMouseEnter}
          onMouseMove={handleCriticalMouseMove}
          onMouseLeave={handleCriticalMouseLeave}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span></span>
            <img src={warningIcon} alt="critical icon" />
          </div>
          <div style={{ color: "rgba(190, 20, 20, 1)" }}>
            <p style={{ fontSize: "24px", fontWeight: 600 }}>{totalCriticalMrs || 0}</p>
            <span>Critical MRs</span>
          </div>

          {showCriticalPopup && criticalItems.length > 0 && (
            <OverviewHoverPopup
              mouseX={criticalMousePos.x}
              mouseY={criticalMousePos.y}
              anchorRect={criticalWidgetRef.current?.getBoundingClientRect() ?? null}
              onMouseEnter={handleCriticalPopupEnter}
              onMouseLeave={handleCriticalPopupLeave}
              items={criticalItems}
              totalCount={criticalTotalCount}
              columns={[
                { key: "display_id", label: "MR/LPO NUMBER" },
                {
                  key: "overdue_date",
                  label: "OVERDUE",
                  format: (val: string) => formatDaysOverdue(val),
                },
              ]}
              emptyMessage="No critical MRs"
              dateRange={criticalDateRange}
            />
          )}
        </div>

        {/* Late Deliveries */}
        <div
          ref={lateWidgetRef}
          style={{
            backgroundColor: "rgba(255, 226, 226, 1)",
            cursor: "pointer",
            minHeight: "175px",
            padding: "20px",
            borderRadius: "15px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
          onClick={() => router.push("/dashboard/details/late-deliveries")}
          onMouseEnter={handleLateMouseEnter}
          onMouseMove={handleLateMouseMove}
          onMouseLeave={handleLateMouseLeave}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span></span>
            <img src={warningIcon} alt="late deliveries icon" />
          </div>
          <div style={{ color: "rgba(190, 20, 20, 1)" }}>
            <p style={{ fontSize: "24px", fontWeight: 600 }}>{totalLateDeliveries || 0}</p>
            <span>Late Deliveries</span>
          </div>

          {showLatePopup && lateItems.length > 0 && (
            <OverviewHoverPopup
              mouseX={lateMousePos.x}
              mouseY={lateMousePos.y}
              anchorRect={lateWidgetRef.current?.getBoundingClientRect() ?? null}
              onMouseEnter={handleLatePopupEnter}
              onMouseLeave={handleLatePopupLeave}
              items={lateItems}
              totalCount={lateTotalCount}
              columns={[
                { key: "display_id", label: "LPO NUMBER" },
                {
                  key: "item_count",
                  label: "ITEMS",
                  format: (val: number) => `${val} items`,
                },
              ]}
              emptyMessage="No late deliveries"
              dateRange={lateDateRange}
            />
          )}
        </div>

        {/* Pending Resolutions */}
        <div
          style={{
            backgroundColor: "rgba(245, 253, 223, 1)",
            minHeight: "175px",
            padding: "20px",
            borderRadius: "15px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span></span>
            <img src={pendingResolutionsIcon} alt="resolutions icon" />
          </div>
          <div style={{ color: "rgba(134, 146, 30, 1)" }}>
            <p style={{ fontSize: "24px", fontWeight: 600 }}>0</p>
            <span>Pending Resolutions</span>
          </div>
        </div>
      </div>
    </div>
  );
}
