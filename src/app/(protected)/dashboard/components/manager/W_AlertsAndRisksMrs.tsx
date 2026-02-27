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

  const [totalLateDeliveries, setTotalLateDeliveries] = useState<number>(0);
  const [lateItems, setLateItems] = useState<any[]>([]);
  const [lateTotalCount, setLateTotalCount] = useState<number>(0);

  const [totalPendingResolutions, setTotalPendingResolutions] =
    useState<number>(0);

  // Hover popup state for Critical MRs
  const [showCriticalPopup, setShowCriticalPopup] = useState(false);
  const [criticalMousePos, setCriticalMousePos] = useState({ x: 0, y: 0 });
  const criticalHoverTimer = useRef<NodeJS.Timeout | null>(null);

  // Hover popup state for Late Deliveries
  const [showLatePopup, setShowLatePopup] = useState(false);
  const [lateMousePos, setLateMousePos] = useState({ x: 0, y: 0 });
  const lateHoverTimer = useRef<NodeJS.Timeout | null>(null);

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
      });
  }, []);

  // Hover handlers for Critical MRs
  const handleCriticalMouseEnter = (e: React.MouseEvent) => {
    setCriticalMousePos({ x: e.clientX, y: e.clientY });
    criticalHoverTimer.current = setTimeout(() => {
      setShowCriticalPopup(true);
    }, 2000);
  };
  const handleCriticalMouseMove = (e: React.MouseEvent) => {
    setCriticalMousePos({ x: e.clientX, y: e.clientY });
  };
  const handleCriticalMouseLeave = () => {
    if (criticalHoverTimer.current) {
      clearTimeout(criticalHoverTimer.current);
      criticalHoverTimer.current = null;
    }
    setShowCriticalPopup(false);
  };

  // Hover handlers for Late Deliveries
  const handleLateMouseEnter = (e: React.MouseEvent) => {
    setLateMousePos({ x: e.clientX, y: e.clientY });
    lateHoverTimer.current = setTimeout(() => {
      setShowLatePopup(true);
    }, 2000);
  };
  const handleLateMouseMove = (e: React.MouseEvent) => {
    setLateMousePos({ x: e.clientX, y: e.clientY });
  };
  const handleLateMouseLeave = () => {
    if (lateHoverTimer.current) {
      clearTimeout(lateHoverTimer.current);
      lateHoverTimer.current = null;
    }
    setShowLatePopup(false);
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
          className="item"
          style={{
            backgroundColor: "rgba(255, 226, 226, 1)",
            cursor: "pointer",
          }}
          onClick={() => router.push("/dashboard/details/critical-mrs")}
          onMouseEnter={handleCriticalMouseEnter}
          onMouseMove={handleCriticalMouseMove}
          onMouseLeave={handleCriticalMouseLeave}
        >
          <div className="top">
            <span></span>
            <img src={warningIcon} alt="critical icon" />
          </div>
          <div style={{ color: "rgba(190, 20, 20, 1)" }}>
            <div className="bottom">
              <p className="number">{totalCriticalMrs || 0}</p>
            </div>
            <span>Critical MRs</span>
          </div>

          {showCriticalPopup && criticalItems.length > 0 && (
            <OverviewHoverPopup
              mouseX={criticalMousePos.x}
              mouseY={criticalMousePos.y}
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
            />
          )}
        </div>

        {/* Late Deliveries */}
        <div
          className="item"
          style={{
            backgroundColor: "rgba(255, 226, 226, 1)",
            cursor: "pointer",
          }}
          onClick={() => router.push("/dashboard/details/late-deliveries")}
          onMouseEnter={handleLateMouseEnter}
          onMouseMove={handleLateMouseMove}
          onMouseLeave={handleLateMouseLeave}
        >
          <div className="top">
            <span></span>
            <img src={warningIcon} alt="late deliveries icon" />
          </div>
          <div style={{ color: "rgba(190, 20, 20, 1)" }}>
            <div className="bottom">
              <p className="number">{totalLateDeliveries || 0}</p>
            </div>
            <span>Late Deliveries</span>
          </div>

          {showLatePopup && lateItems.length > 0 && (
            <OverviewHoverPopup
              mouseX={lateMousePos.x}
              mouseY={lateMousePos.y}
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
            />
          )}
        </div>

        {/* Pending Resolutions */}
        <div
          className="item"
          style={{ backgroundColor: "rgba(245, 253, 223, 1)" }}
        >
          <div className="top">
            <span></span>
            <img src={pendingResolutionsIcon} alt="resolutions icon" />
          </div>
          <div style={{ color: "rgba(134, 146, 30, 1)" }}>
            <div className="bottom">
              <p className="number">0</p>
            </div>
            <span>Pending Resolutions</span>
          </div>
        </div>
      </div>
    </div>
  );
}
