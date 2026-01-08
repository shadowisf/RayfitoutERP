"use client";

import { useEffect, useState } from "react";

export default function AvgTimeSpentPerStageWidget() {
  const [data, setData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // ✅ Define stage order based on MR progression
  const stageOrder = [
    "Draft",
    "Initial approval rejected",
    "Awaiting initial approval",
    "Awaiting quotations",
    "Price approval rejected",
    "Awaiting price approval",
    "Awaiting LPO & invoice",
    "Payment rejected",
    "Pending payment",
    "GRN failed",
    "Pending delivery",
    "Awaiting QC check",
    "Failed QC",
    "Awaiting stock entry",
  ];

  useEffect(() => {
    setError(null);

    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/dashboard/manager/getAvgTimeSpentPerStage`
    )
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((responseData) => {
        if (Array.isArray(responseData)) {
          // Filter out "Completed" stage
          const filteredData = responseData.filter(
            (item) => item.stage.toLowerCase() !== "completed"
          );

          // ✅ Sort by stage order
          const sortedData = filteredData.sort((a, b) => {
            const indexA = stageOrder.findIndex(
              (stage) => stage.toLowerCase() === a.stage.toLowerCase()
            );
            const indexB = stageOrder.findIndex(
              (stage) => stage.toLowerCase() === b.stage.toLowerCase()
            );

            // If stage not found in order, put it at the end
            const orderA = indexA === -1 ? 999 : indexA;
            const orderB = indexB === -1 ? 999 : indexB;

            return orderA - orderB;
          });

          setData(sortedData);
        } else {
          console.error("Response is not an array:", responseData);
          setData([]);
          setError("Invalid data format received");
        }
      })
      .catch((err) => {
        console.error("Error fetching stage times:", err);
        setError(err.message);
        setData([]);
      });
  }, []);

  const maxHours =
    data.length > 0 ? Math.max(...data.map((d) => d.averageHours), 0) : 0;
  const minHours =
    data.length > 0 ? Math.min(...data.map((d) => d.averageHours), 0) : 0;

  // ✅ Calculate color based on hours relative to min/max
  const getBarColor = (hours: number) => {
    if (maxHours === minHours) {
      // If all values are the same, use middle color
      return "rgba(121, 121, 158, 1)";
    }

    // Calculate percentage from min to max
    const percentage = (hours - minHours) / (maxHours - minHours);

    // Interpolate between green (lowest) and red (highest)
    const red = Math.round(26 + percentage * (216 - 26));
    const green = Math.round(216 - percentage * (216 - 26));
    const blue = Math.round(135 - percentage * (135 - 26));

    return `rgba(${red}, ${green}, ${blue}, 1)`;
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
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h3 style={{ margin: 0 }}>Average Time Spent Per Stage</h3>
      </div>

      <br />

      {error ? (
        <div
          style={{
            textAlign: "center",
            padding: "40px",
            color: "rgba(248, 77, 77, 1)",
          }}
        >
          Error: {error}
        </div>
      ) : data.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#888" }}>
          No data available
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {data.map((item, index) => {
            const barWidth =
              maxHours > 0 ? (item.averageHours / maxHours) * 100 : 0;
            const barColor = getBarColor(item.averageHours); // ✅ Use gradient color
            const isHovered = hoveredIndex === index;

            return (
              <div
                key={index}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "15px",
                }}
              >
                {/* Stage label on the left */}
                <div
                  style={{
                    minWidth: "200px",
                  }}
                >
                  {item.stage}
                </div>

                {/* Bar on the right with dynamic width */}
                <div
                  style={{
                    position: "relative",
                    flex: 1,
                    height: "25px",
                  }}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <div
                    style={{
                      width: `${barWidth}%`,
                      height: "100%",
                      backgroundColor: barColor,
                      borderRadius: "20px",
                      position: "relative",
                      transition: "background-color 0.3s ease",
                    }}
                  >
                    {/* Hover Tooltip */}
                    {isHovered && item.averageHours > 0 && (
                      <div
                        style={{
                          position: "absolute",
                          left: "50%",
                          top: "-40px",
                          transform: "translateX(-50%)",
                          backgroundColor: "black",
                          color: "white",
                          padding: "6px 12px",
                          borderRadius: "8px",
                          fontSize: "13px",
                          fontWeight: "600",
                          whiteSpace: "nowrap",
                          zIndex: 10,
                          boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
                        }}
                      >
                        {item.averageHours < 1
                          ? `${Math.round(item.averageHours * 60)} Minutes`
                          : `${item.averageHours} Hr${
                              item.averageHours !== 1 ? "s" : ""
                            }`}
                        {/* Tooltip Arrow */}
                        <div
                          style={{
                            position: "absolute",
                            bottom: "-5px",
                            left: "50%",
                            transform: "translateX(-50%)",
                            width: "0",
                            height: "0",
                            borderLeft: "5px solid transparent",
                            borderRight: "5px solid transparent",
                            borderTop: "5px solid black",
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
