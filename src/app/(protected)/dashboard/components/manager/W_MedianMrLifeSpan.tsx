"use client";

import { useEffect, useState } from "react";

export default function MedianMRLifespanWidget() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [filter, setFilter] = useState(7);

  useEffect(() => {
    setError(null);
    setIsLoading(true);

    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/dashboard/manager/getMedianMrLifeSpan`,
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
        setData(responseData);
      })
      .catch((err) => {
        console.error("Error fetching median lifespan:", err);
        setError(err.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [filter]);

  // ✅ Helper function to format hours into days and hours
  const formatHours = (hours: number) => {
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;

      if (remainingHours === 0) {
        return `${days}d`;
      }
      return `${days}d ${remainingHours}h`;
    }
    return `${hours} Hrs`;
  };

  if (error) {
    return (
      <div
        style={{
          backgroundColor: "white",
          padding: "15px",
          borderRadius: "15px",
          textAlign: "center",
          color: "rgba(248, 77, 77, 1)",
        }}
      >
        Error: {error}
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div
        style={{
          backgroundColor: "white",
          padding: "15px",
          borderRadius: "15px",
          textAlign: "center",
          color: "#888",
        }}
      >
        Loading...
      </div>
    );
  }

  // Get max value from the chart data
  const maxValue = Math.max(
    ...data.chartData.map((d: any) => d.median).filter((m: number) => m > 0),
    1,
  );

  const chartHeight = 125;
  const minBarHeight = 10;

  // Check if we have any completed MRs
  const hasData = data.chartData.some((d: any) => d.median > 0);

  // Dynamic label for time period
  const isAllTime = filter === 0;
  const periodLabel = isAllTime
    ? "all time"
    : filter === 7
      ? "last 7 days"
      : filter === 14
        ? "last 14 days"
        : filter === 30
          ? "last month"
          : `last ${filter} days`;

  const comparisonLabel =
    filter === 7
      ? "LAST WEEK"
      : filter === 14
        ? "PREVIOUS 14 DAYS"
        : filter === 30
          ? "PREVIOUS MONTH"
          : `PREVIOUS ${filter} DAYS`;

  return (
    <div
      style={{
        backgroundColor: "white",
        padding: "15px",
        borderRadius: "15px",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "20px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h3>Median MR Lifespan</h3>
          <select
            onChange={(e) => setFilter(Number(e.target.value))}
            value={filter}
            style={{
              width: "150px",
              backgroundColor: "rgba(236, 236, 236, 1)",
              borderRadius: "50px",
            }}
          >
            <option value={0}>All Time</option>
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={30}>1 month</option>
          </select>
        </div>
        <br />
        {/* ✅ Updated to show days and hours */}
        <h1 style={{ fontSize: "32px", fontWeight: "900" }}>
          {formatHours(data.currentMedian)}
        </h1>
        {isAllTime ? (
          <span style={{ color: "#888", fontWeight: "600" }}>
            MEDIAN ACROSS ALL TIME
          </span>
        ) : data.previousMedian > 0 ? (
          <span
            style={{
              margin: 0,
              color: data.isFaster
                ? "rgba(26, 216, 135, 1)"
                : "rgba(248, 77, 77, 1)",
              fontWeight: "600",
            }}
          >
            {data.changeDescription.toUpperCase()}{" "}
            <span style={{ color: "black" }}>
              ({data.percentageChange}% {data.isFaster ? "FASTER" : "SLOWER"}{" "}
              THAN {comparisonLabel})
            </span>
          </span>
        ) : (
          <span style={{ color: "#888", fontWeight: "600" }}>
            {data.changeDescription.toUpperCase()}
          </span>
        )}
      </div>

      {/* Bar Chart */}
      {!hasData ? (
        <div
          style={{
            height: `${chartHeight}px`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgba(150, 150, 150, 1)",
            fontSize: "14px",
          }}
        >
          No completed MRs in the {periodLabel}
        </div>
      ) : (
        <div
          style={{
            position: "relative",
            height: `${chartHeight}px`,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            gap: "10px",
            paddingLeft: "60px",
          }}
        >
          {/* Median Line */}
          {data.overallMedian > 0 && (
            <div
              style={{
                position: "absolute",
                left: "60px",
                right: 0,
                bottom: `${
                  (data.overallMedian / maxValue) * (chartHeight - 30)
                }px`,
                height: "2px",
                backgroundColor: "rgba(180, 180, 180, 1)",
                zIndex: 5,
                pointerEvents: "none",
              }}
            >
              {/* MED. Label with arrow */}
              <div
                style={{
                  position: "absolute",
                  left: "-60px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0px",
                }}
              >
                <div
                  style={{
                    backgroundColor: "black",
                    color: "white",
                    padding: "4px 10px",
                    borderRadius: "6px",
                  }}
                >
                  MED.
                </div>
                {/* Arrow triangle pointing right */}
                <div
                  style={{
                    width: 0,
                    height: 0,
                    borderTop: "6px solid transparent",
                    borderBottom: "6px solid transparent",
                    borderLeft: "6px solid black",
                  }}
                />
              </div>
            </div>
          )}

          {/* Bars */}
          {data.chartData.map((item: any, index: number) => {
            const hasValue = item.median > 0;

            // Skip rendering if no value
            if (!hasValue) return null;

            // Calculate bar height
            let barHeight = (item.median / maxValue) * chartHeight;
            barHeight = Math.max(barHeight, minBarHeight);

            const isHovered = hoveredIndex === index;

            return (
              <div
                key={index}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                {/* Bar */}
                <div
                  style={{
                    width: "100%",
                    maxWidth: "60px",
                    height: `${barHeight}px`,
                    background:
                      "linear-gradient(180deg, rgba(26, 216, 135, 1) 0%, rgba(26, 216, 135, 0.6) 100%)",
                    borderRadius: "50px",
                    position: "relative",
                  }}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {/* Tooltip on hover */}
                  {isHovered && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: "100%",
                        left: "50%",
                        transform: "translateX(-50%)",
                        marginBottom: "10px",
                        backgroundColor: "black",
                        color: "white",
                        padding: "6px 12px",
                        borderRadius: "8px",
                        fontSize: "13px",
                        fontWeight: "bold",
                        whiteSpace: "nowrap",
                        zIndex: 20,
                        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                      }}
                    >
                      {/* ✅ Updated tooltip to show days and hours */}
                      {formatHours(item.median)} ({item.count}{" "}
                      {item.count === 1 ? "MR" : "MRs"}){/* Tooltip Arrow */}
                      <div
                        style={{
                          position: "absolute",
                          top: "100%",
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
