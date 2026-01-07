"use client";

import { useEffect, useState } from "react";

export default function AvgTimeSpentPerStageWidget() {
  const [data, setData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

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
          setData(responseData);
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

  const getBarColor = (hours: number, stageName: string) => {
    if (stageName.toLowerCase().includes("delivery") && hours > 30) {
      return "rgba(248, 77, 77, 1)"; // Red
    }
    if (stageName.toLowerCase().includes("lpo") && hours < 5) {
      return "rgba(26, 216, 135, 1)"; // Green
    }
    return "rgba(200, 200, 200, 1)"; // Gray
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
          marginBottom: "30px",
        }}
      >
        <h3 style={{ margin: 0 }}>Average Time Spent Per Stage</h3>
      </div>

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
        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          {data.map((item, index) => {
            const barWidth =
              maxHours > 0 ? (item.averageHours / maxHours) * 100 : 0;
            const barColor = getBarColor(item.averageHours, item.stage);
            const isHovered = hoveredIndex === index;

            return (
              <div key={index}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "5px",
                  }}
                >
                  <span>{item.stage}</span>
                </div>

                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    height: "25px",
                    backgroundColor: "rgba(240, 240, 240, 1)",
                    borderRadius: "20px",
                    overflow: "visible",
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
