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

  // Calculate reserved quantity by project
  const calculateReservedByProject = () => {
    // ✅ Step 1: Calculate total stock per inventory item
    const totalStockPerItem: { [itemId: number]: number } = {};

    stocks.forEach((stock) => {
      const itemId = stock.inventory_item_id;
      if (!totalStockPerItem[itemId]) {
        totalStockPerItem[itemId] = 0;
      }
      totalStockPerItem[itemId] += Math.abs(stock.quantity || 0);
    });

    // ✅ Step 2: Calculate total issued per inventory item (NO received check)
    const totalIssuedPerItem: { [itemId: number]: number } = {};

    stocksTransferIssue.forEach((transaction) => {
      // Only check if it's an issue type, don't check received status
      if (transaction.type?.toLowerCase().includes("issue")) {
        const itemId = transaction.inventory_item_id;
        if (!totalIssuedPerItem[itemId]) {
          totalIssuedPerItem[itemId] = 0;
        }
        totalIssuedPerItem[itemId] += Math.abs(transaction.quantity || 0);
      }
    });

    // ✅ Step 3: Calculate available stock per item
    const availableStockPerItem: { [itemId: number]: number } = {};

    Object.keys(totalStockPerItem).forEach((itemIdStr) => {
      const itemId = Number(itemIdStr);
      const totalStock = totalStockPerItem[itemId] || 0;
      const totalIssued = totalIssuedPerItem[itemId] || 0;
      availableStockPerItem[itemId] = Math.max(0, totalStock - totalIssued);
    });

    // ✅ Step 4: Calculate reserved per project per item
    const projectMap: {
      [projectName: string]: {
        totalReserved: number;
        itemsReserved: { [itemId: number]: number };
      };
    } = {};

    stocks.forEach((stock) => {
      // Only count stocks reserved to a project
      if (stock.project_id && stock.project_name) {
        const project = stock.project_name;
        const itemId = stock.inventory_item_id;

        if (!projectMap[project]) {
          projectMap[project] = {
            totalReserved: 0,
            itemsReserved: {},
          };
        }

        if (!projectMap[project].itemsReserved[itemId]) {
          projectMap[project].itemsReserved[itemId] = 0;
        }

        projectMap[project].itemsReserved[itemId] += Math.abs(
          stock.quantity || 0,
        );
      }
    });

    // ✅ Step 5: Cap reserved to available stock
    Object.keys(projectMap).forEach((project) => {
      let projectTotal = 0;

      Object.keys(projectMap[project].itemsReserved).forEach((itemIdStr) => {
        const itemId = Number(itemIdStr);
        const reservedQty = projectMap[project].itemsReserved[itemId];
        const availableQty = availableStockPerItem[itemId] || 0;

        // Cap reserved to available
        const actualReserved = Math.min(reservedQty, availableQty);
        projectMap[project].itemsReserved[itemId] = actualReserved;
        projectTotal += actualReserved;
      });

      projectMap[project].totalReserved = projectTotal;
    });

    // ✅ Step 6: Convert to array and filter out zero quantities
    const projectArray = Object.entries(projectMap)
      .map(([project, data]) => ({
        project,
        quantity: data.totalReserved,
      }))
      .filter((item) => item.quantity > 0)
      .sort((a, b) => b.quantity - a.quantity);

    return projectArray;
  };

  const reservedByProject = calculateReservedByProject();

  // Calculate total reserved
  const totalReserved = reservedByProject.reduce(
    (sum, item) => sum + item.quantity,
    0,
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
  const chartData = reservedByProject.map((item, index) => ({
    name: item.project,
    value: item.quantity,
    color: COLORS[index % COLORS.length],
  }));

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

      {reservedByProject.length > 0 ? (
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
                    <CustomTooltip totalRequests={totalReserved} unit={unit} />
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
