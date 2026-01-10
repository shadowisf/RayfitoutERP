"use client";

import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface ReservedStocksChart {
  stocks: any[];
  stocksTransferIssue: any[];
  unit: string;
}

// Custom tooltip component
const CustomTooltip = ({ active, payload, totalRequests, unit }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    const color = data.payload.color || data.color || "#00804C";

    const percentage =
      totalRequests > 0 ? ((data.value / totalRequests) * 100).toFixed(0) : 0;

    return (
      <div
        style={{
          backgroundColor: "white",
          padding: "10px",
          borderRadius: "25px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          border: "1px solid #e0e0e0",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: color,
              display: "inline-block",
            }}
          />
          <strong style={{ fontSize: "12px" }}>{percentage}%</strong>
        </div>

        {/* <div style={{ fontSize: "12px", color: "#737373" }}>
          {data.value} {unit} ({percentage}%)
        </div> */}
      </div>
    );
  }

  return null;
};

export default function ReservedStocksChart({
  stocks,
  stocksTransferIssue,
  unit,
}: ReservedStocksChart) {
  const [isHovered, setIsHovered] = useState(false);

  // Calculate total quantity issued by project (only from stocksTransferIssue)
  const calculateRequestsByProject = () => {
    const projectMap: { [key: string]: number } = {};

    // Process ISSUE transactions from stocksTransferIssue table
    // Note: Each transaction now has quantity from the junction table
    stocksTransferIssue.forEach((transaction) => {
      // Only count issues that have been received (completed)
      if (
        transaction.type.toLowerCase().includes("issue") &&
        transaction.received === 1
      ) {
        // Check if project exists, otherwise group as "Others"
        const project =
          transaction.project_name && transaction.project_id
            ? transaction.project_name
            : "Others";

        if (!projectMap[project]) {
          projectMap[project] = 0;
        }

        // Use the quantity from junction table
        projectMap[project] += Math.abs(transaction.quantity || 0);
      }
    });

    // Convert to array and sort by quantity (descending)
    const projectArray = Object.entries(projectMap)
      .map(([project, quantity]) => ({ project, quantity }))
      .filter((item) => item.quantity > 0)
      .sort((a, b) => b.quantity - a.quantity);

    return projectArray;
  };

  const requestsByProject = calculateRequestsByProject();

  // Calculate total requests
  const totalRequests = requestsByProject.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  // Define colors for different projects
  const COLORS = [
    "#00804C", // Green - Top project
    "#7B68EE", // Purple
    "#87CEEB", // Light Blue
    "#FFD700", // Gold
    "#FF6B6B", // Red
    "#D3D3D3", // Gray - Others (typically last)
  ];

  // Transform data for the chart
  const chartData = requestsByProject.map((item, index) => ({
    name: item.project,
    value: item.quantity,
    color: COLORS[index % COLORS.length],
  }));

  // Calculate percentage for top project
  const topProjectPercentage =
    totalRequests > 0 && requestsByProject.length > 0
      ? Math.round((requestsByProject[0].quantity / totalRequests) * 100)
      : 0;

  return (
    <div
      style={{
        backgroundColor: "rgba(248, 249, 251, 1)",
        padding: "15px",
        borderRadius: "10px",
      }}
    >
      <h2>RESERVED STOCKS</h2>

      <br />
      <br />

      {requestsByProject.length > 0 ? (
        <>
          <div
            style={{ position: "relative", width: "200px", height: "200px" }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={
                    <CustomTooltip totalRequests={totalRequests} unit={unit} />
                  }
                  wrapperStyle={{ zIndex: 100 }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Center "ALL TIME" */}
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                textAlign: "center",
                pointerEvents: "none",
                zIndex: 1,
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  color: "#737373",
                  textTransform: "uppercase",
                  marginBottom: "4px",
                }}
              >
                ALL TIME
              </div>
            </div>

            {/* Percentage Badge - Only show on hover */}
            {/* {isHovered && (
              <div
                style={{
                  position: "absolute",
                  top: "10px",
                  left: "10px",
                  backgroundColor: "white",
                  padding: "10px",
                  borderRadius: "5px",
                  fontSize: "12px",
                  fontWeight: "600",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                  border: "1px solid #e0e0e0",
                  pointerEvents: "none",
                  zIndex: 50,
                  opacity: 1,
                  transition: "opacity 0.15s ease-in",
                }}
              >
                <p style={{ margin: 0, fontWeight: "600", fontSize: "12px" }}>
                  {chartData[0]?.name}
                </p>
                <p
                  style={{
                    margin: "4px 0 0 0",
                    fontSize: "12px",
                    color: "#737373",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: chartData[0]?.color || "#00804C",
                      display: "inline-block",
                    }}
                  />
                  {topProjectPercentage}%
                </p>
              </div>
            )} */}
          </div>

          {/* Project Legend */}
          <div style={{ marginTop: "16px", fontSize: "12px" }}>
            {chartData.map((project, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "8px",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <div
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: project.color,
                    }}
                  />
                  <span style={{ textTransform: "uppercase" }}>
                    {project.name}
                  </span>
                </div>
                <span style={{ fontWeight: "600" }}>
                  {project.value} {unit}
                </span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div
          style={{
            textAlign: "center",
            padding: "40px",
            color: "#737373",
          }}
        >
          No reserved stocks data available
        </div>
      )}
    </div>
  );
}
