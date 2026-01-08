"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface ReservedStocksChart {
  stocks: any[];
  stocksTransferIssue: any[];
  unit: string;
}

export default function ReservedStocksChart({
  stocks,
  stocksTransferIssue,
  unit,
}: ReservedStocksChart) {
  // Calculate total quantity issued by project (only from stocksTransferIssue)
  const calculateRequestsByProject = () => {
    const projectMap: { [key: string]: number } = {};

    // Only process ISSUE transactions from stocksTransferIssue table
    stocksTransferIssue.forEach((transaction) => {
      // Only count issues
      if (transaction.type.toLowerCase().includes("issue")) {
        // Check if project exists, otherwise group as "Others"
        const project =
          transaction.project_name && transaction.project_id
            ? transaction.project_name
            : "Others";

        if (!projectMap[project]) {
          projectMap[project] = 0;
        }
        projectMap[project] += Math.abs(transaction.quantity);
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

            {/* Percentage Badge */}
            <div
              style={{
                position: "absolute",
                top: "10px",
                left: "10px",
                backgroundColor: "white",
                padding: "4px 8px",
                borderRadius: "12px",
                fontSize: "12px",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              }}
            >
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: chartData[0]?.color || "#00804C",
                }}
              />
              {topProjectPercentage}%
            </div>
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
