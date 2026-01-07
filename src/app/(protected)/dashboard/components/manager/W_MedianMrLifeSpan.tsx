"use client";

import { useEffect, useState } from "react";

export default function MedianMRLifespanWidget() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    setError(null);

    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/dashboard/manager/getMedianMrLifeSpan`
    )
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((responseData) => {
        console.log("Chart Data:", responseData); // Debug log
        setData(responseData);
      })
      .catch((err) => {
        console.error("Error fetching median lifespan:", err);
        setError(err.message);
      });
  }, []);

  if (error || !data) {
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
        Error: {error || "No data available"}
      </div>
    );
  }

  // Get max value, ensure it's at least 1 to avoid division by zero
  const maxValue = Math.max(
    ...data.chartData.map((d: any) => d.median).filter((m: number) => m > 0),
    data.overallMedian,
    1
  );

  const chartHeight = 200; // Increased height for better visibility
  const minBarHeight = 10; // Minimum visible height for bars with data

  // Check if we have any data
  const hasData = data.chartData.some((d: any) => d.median > 0);

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
        <h3>Median MR Lifespan</h3>
        <br />
        <h1 style={{ fontSize: "32px", fontWeight: "900" }}>
          {data.currentMedian} Hrs
        </h1>
        <span
          style={{
            margin: 0,
            color: data.isFaster
              ? "rgba(26, 216, 135, 1)"
              : "rgba(248, 77, 77, 1)",
            fontWeight: "600",
          }}
        >
          {data.percentageChange}% {data.isFaster ? "FASTER" : "SLOWER"}{" "}
          <span style={{ color: "black" }}>THAN LAST WEEK</span>
        </span>
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
          No completed MRs in the last 7 days
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
            paddingBottom: "20px",
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
                  20 + (data.overallMedian / maxValue) * (chartHeight - 20)
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
                    fontSize: "12px",
                    fontWeight: "bold",
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
            // Calculate bar height
            let barHeight = 0;
            if (item.median > 0) {
              barHeight = (item.median / maxValue) * (chartHeight - 20);
              // Ensure minimum visible height
              barHeight = Math.max(barHeight, minBarHeight);
            }

            const isHovered = hoveredIndex === index;
            const hasValue = item.median > 0;

            return (
              <div
                key={index}
                style={{
                  flex: 1,
                  maxWidth: "60px",
                  height: `${barHeight}px`,
                  background: hasValue
                    ? "linear-gradient(180deg, rgba(26, 216, 135, 1) 0%, rgba(26, 216, 135, 0.6) 100%)"
                    : "rgba(230, 230, 230, 0.3)", // Light gray for empty days
                  borderRadius: "50px 50px 50px 50px",
                  position: "relative",
                  transition: "opacity 0.2s ease",
                  cursor: hasValue ? "pointer" : "default",
                  opacity: isHovered ? 0.85 : 1,
                  minHeight: hasValue ? `${minBarHeight}px` : "5px", // Thin line for empty days
                }}
                onMouseEnter={() => hasValue && setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Tooltip on hover */}
                {isHovered && hasValue && (
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
                    {item.median} Hrs ({item.count} MRs)
                    {/* Tooltip Arrow */}
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
            );
          })}
        </div>
      )}
    </div>
  );
}
