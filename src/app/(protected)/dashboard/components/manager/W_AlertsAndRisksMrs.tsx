"use client";

import { useEffect, useState } from "react";

export default function AlertsAndRiskMrsWidget() {
  const warningIcon = "/icons/warning-line.svg";
  const pendingResolutionsIcon = "/icons/pending-resolutions.svg";

  const [totalCriticalMrs, setTotalCriticalMrs] = useState<number>(0);
  const [totalLateDeliveries, setTotalLateDeliveries] = useState<number>(0);
  const [totalPendingResolutions, setTotalPendingResolutions] =
    useState<number>(0);

  useEffect(() => {
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/dashboard/manager/getTotalCriticalMrs`
    )
      .then((res) => res.json())
      .then((data) => {
        setTotalCriticalMrs(data.overdue_count);
      });

    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/dashboard/manager/getTotalLateDeliveries`
    )
      .then((res) => res.json())
      .then((data) => {
        setTotalLateDeliveries(data.overdue_count);
      });
  }, []);

  return (
    <div
      style={{
        backgroundColor: "white",
        padding: "15px",
        borderRadius: "15px",
      }}
    >
      <h3>Alerts & Risks</h3>
      <br />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "5px",
        }}
      >
        <div
          className="item"
          style={{ backgroundColor: "rgba(255, 226, 226, 1)" }}
        >
          <div className="top">
            <span></span>
            <img src={warningIcon} alt="deliveries icon" />
          </div>
          <div style={{ color: "rgba(190, 20, 20, 1)" }}>
            <div className="bottom">
              <p className="number">{totalCriticalMrs}</p>
            </div>
            <span>Critical MRs</span>
          </div>
        </div>
        <div
          className="item"
          style={{ backgroundColor: "rgba(255, 226, 226, 1)" }}
        >
          <div className="top">
            <span></span>
            <img src={warningIcon} alt="deliveries icon" />
          </div>
          <div style={{ color: "rgba(190, 20, 20, 1)" }}>
            <div className="bottom">
              <p className="number">{totalLateDeliveries}</p>
            </div>
            <span>Late Deliveries</span>
          </div>
        </div>
        <div
          className="item"
          style={{ backgroundColor: "rgba(245, 253, 223, 1)" }}
        >
          <div className="top">
            <span></span>
            <img src={pendingResolutionsIcon} alt="deliveries icon" />
          </div>
          <div style={{ color: "rgba(134, 146, 30, 1)" }}>
            <div className="bottom">
              <p className="number">1</p>
            </div>
            <span>Pending Resolutions</span>
          </div>
        </div>
      </div>
    </div>
  );
}
