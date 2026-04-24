"use client";

import { useEffect, useState } from "react";

type StageData = {
  stage: string;
  medianMinutes: number;
  medianHoursFloat: number;
  hours: number;
  minutes: number;
  count: number;
};

export default function AvgTimeSpentPerStageWidget() {
  const [data, setData] = useState<StageData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [filter, setFilter] = useState(0);

  // ✅ Define MR stage order
  const stageOrder = [
    // "Draft",
    "QS Review",
    "Manager Approval",
    "Requested Rejected",
    "Quotations",
    "QS Price Check",
    "Manager Price Approval",
    "Price Approval Rejected",
    "LPO & Invoice",
    "Payment Rejected",
    "Pending Payments",
    // "GRN Failed",
    "Awaiting Delivery",
    // "QC Check",
    // "Failed QC",
    "Stock Entry",
  ];

  useEffect(() => {
    setError(null);
    setIsLoading(true);

    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/dashboard/manager/getAvgTimeSpentPerStage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filter }),
      },
    )
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((responseData) => {
        if (!Array.isArray(responseData)) {
          throw new Error("Invalid data format");
        }

        // ❌ Remove Completed stage, hidden stages, and filter out < 1 minute or 0
        const filtered = responseData.filter(
          (item) =>
            item.stage.toLowerCase() !== "completed" &&
            item.medianMinutes >= 1 &&
            stageOrder.some(
              (s) => s.toLowerCase() === item.stage.toLowerCase(),
            ),
        );

        // ✅ Sort by defined stage order
        const sorted = filtered.sort((a, b) => {
          const indexA = stageOrder.findIndex(
            (stage) => stage.toLowerCase() === a.stage.toLowerCase(),
          );
          const indexB = stageOrder.findIndex(
            (stage) => stage.toLowerCase() === b.stage.toLowerCase(),
          );

          return (
            (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB)
          );
        });

        setData(sorted);
      })
      .catch((err) => {
        console.error("Error fetching stage times:", err);
        setError(err.message);
        setData([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [filter]);

  // ✅ Use logarithmic scaling for better visibility of small values
  const maxMinutes =
    data.length > 0 ? Math.max(...data.map((d) => d.medianMinutes)) : 0;

  const minMinutes =
    data.length > 0 ? Math.min(...data.map((d) => d.medianMinutes)) : 0;

  // ✅ Calculate bar width with logarithmic scaling for better visibility
  const getBarWidth = (minutes: number) => {
    if (maxMinutes === 0) return 0;

    // Use log scale to make small values more visible
    const logMin = Math.log10(Math.max(minMinutes, 1));
    const logMax = Math.log10(maxMinutes);
    const logValue = Math.log10(Math.max(minutes, 1));

    if (logMax === logMin) return 100;

    const percentage = ((logValue - logMin) / (logMax - logMin)) * 100;

    // Ensure minimum 5% width for visibility
    return Math.max(percentage, 5);
  };

  // ✅ Color: green for lowest, red for highest, gray for rest
  const getBarColor = (minutes: number) => {
    if (minutes === minMinutes) {
      return "rgba(26, 216, 135, 1)"; // Green for lowest
    }
    if (minutes === maxMinutes) {
      return "rgba(216, 26, 26, 1)"; // Red for highest
    }
    return "rgba(206, 206, 206, 1)"; // Gray for all others
  };

  // ✅ Updated format function to show days
  const formatDuration = (h: number, m: number) => {
    const totalHours = h;

    if (totalHours === 0 && m === 0) return "0 min";

    // If 24 hours or more, show in days
    if (totalHours >= 24) {
      const days = Math.floor(totalHours / 24);
      const remainingHours = totalHours % 24;

      if (remainingHours === 0 && m === 0) {
        return days === 1 ? "1 day" : `${days} days`;
      }
      if (remainingHours > 0 && m === 0) {
        return days === 1
          ? `1 day ${remainingHours} hr`
          : `${days} days ${remainingHours} hr`;
      }
      if (remainingHours === 0 && m > 0) {
        return days === 1 ? `1 day ${m} min` : `${days} days ${m} min`;
      }
      return days === 1
        ? `1 day ${remainingHours} hr ${m} min`
        : `${days} days ${remainingHours} hr ${m} min`;
    }

    // Less than 24 hours - show as before
    if (h > 0 && m > 0) return `${h} hr ${m} min`;
    if (h > 0) return `${h} hr`;
    return `${m} min`;
  };

  return (
    <div
      style={{
        backgroundColor: "white",
        padding: "15px",
        borderRadius: "15px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <h3 style={{ margin: 0 }}>Median Time Spent Per Stage</h3>
        <select
          onChange={(e) => setFilter(Number(e.target.value))}
          value={filter}
          style={{
            width: "150px",
            backgroundColor: "rgba(236, 236, 236, 1)",
            borderRadius: "50px",
          }}
        >
          <option value={0}>All time</option>
          <option value={7}>Last 7 Days</option>
          <option value={14}>Last 14 Days</option>
          <option value={30}>Last month</option>
        </select>
      </div>

      <br />

      {isLoading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#888" }}>
          Loading...
        </div>
      ) : error ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#f84d4d" }}>
          Error: {error}
        </div>
      ) : data.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#888" }}>
          No data available
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {data.map((item, index) => {
            const barWidth = getBarWidth(item.medianMinutes);
            const barColor = getBarColor(item.medianMinutes);
            const isHovered = hoveredIndex === index;

            return (
              <div
                key={index}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.5fr 1fr",
                  gap: "10px",
                }}
              >
                {/* Stage name */}
                <div style={{ minWidth: "200px", fontSize: "14px" }}>
                  {item.stage}
                </div>

                {/* Bar */}
                <div
                  style={{ flex: 1, height: "15px", position: "relative" }}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <div
                    style={{
                      width: `${barWidth}%`,
                      height: "100%",
                      backgroundColor: barColor,
                      borderRadius: "20px",
                    }}
                  />

                  {/* Tooltip */}
                  {isHovered && (
                    <div
                      style={{
                        position: "absolute",
                        left: `${barWidth}%`,
                        top: "-40px",
                        transform: "translateX(-50%)",
                        backgroundColor: "black",
                        color: "white",
                        padding: "6px 12px",
                        borderRadius: "8px",
                        fontSize: "13px",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        zIndex: 10,
                      }}
                    >
                      {formatDuration(item.hours, item.minutes)}

                      <div
                        style={{
                          position: "absolute",
                          bottom: "-5px",
                          left: "50%",
                          transform: "translateX(-50%)",
                          width: 0,
                          height: 0,
                          borderLeft: "5px solid transparent",
                          borderRight: "5px solid transparent",
                          borderTop: "5px solid black",
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
