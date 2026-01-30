"use client";

import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface TopSuppliersChartProps {
  stocks: any[];
  stocksTransferIssue: any[];
  unit: string;
}

// Custom tooltip component
const CustomTooltip = ({ active, payload, totalStock, unit }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    const color = data.payload.color || data.color || "#00804C";
    const percentage =
      totalStock > 0 ? ((data.value / totalStock) * 100).toFixed(0) : 0;

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

export default function TopSuppliersChart({
  stocks,
  stocksTransferIssue,
  unit,
}: TopSuppliersChartProps) {
  const [isHovered, setIsHovered] = useState(false);

  const formatNumber = (value: number): string | number => {
    // Check if the number has decimal places
    if (value % 1 === 0) {
      // No decimal places, return as integer
      return Math.round(value);
    } else {
      // Has decimal places, format to remove trailing zeros
      return parseFloat(value.toFixed(3));
    }
  };

  // Calculate net stock by supplier (accounting for issues and transfers)
  const calculateStockBySupplier = () => {
    const supplierMap: { [key: string]: number } = {};

    // Add initial stock quantities by supplier
    stocks.forEach((stock) => {
      const supplier = stock.supplier_name || "Others";
      if (!supplierMap[supplier]) {
        supplierMap[supplier] = 0;
      }
      supplierMap[supplier] += stock.quantity;
    });

    // Subtract issued/transferred quantities
    stocksTransferIssue.forEach((transaction) => {
      if (transaction.type.includes("Issue")) {
        // Subtract issues if received
        if (transaction.received) {
          // Find the original stock entry to get supplier
          const originalStock = stocks.find(
            (s) => s.location === transaction.from_location,
          );
          const supplier = originalStock?.supplier_name || "Others";

          if (supplierMap[supplier]) {
            supplierMap[supplier] -= transaction.quantity;
          }
        }
      } else if (transaction.type.toLowerCase().includes("transfer")) {
        // For transfers, we don't subtract because stock still exists in system
        // It's just moved to a different location
        // If you want to track by original supplier regardless of location,
        // transfers don't affect supplier totals
      }
    });

    // Filter out suppliers with zero or negative stock
    // Convert to array and sort by quantity (descending)
    const supplierArray = Object.entries(supplierMap)
      .map(([supplier, quantity]) => ({ supplier, quantity }))
      .filter((item) => item.quantity > 0)
      .sort((a, b) => b.quantity - a.quantity);

    return supplierArray;
  };

  const stockBySupplier = calculateStockBySupplier();

  // Calculate total stock
  const totalStock = stockBySupplier.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );

  // Define colors for different suppliers
  const COLORS = [
    "#00804C", // Green - Top supplier
    "#7B68EE", // Purple
    "#87CEEB", // Light Blue
    "#FFD700", // Gold
    "#FF6B6B", // Red
    "#D3D3D3", // Gray - Others (typically last)
  ];

  // Transform data for the chart
  const chartData = stockBySupplier.map((item, index) => ({
    name: item.supplier,
    value: item.quantity,
    color: COLORS[index % COLORS.length],
  }));

  // Calculate percentage for top supplier
  const topSupplierPercentage =
    totalStock > 0 && stockBySupplier.length > 0
      ? Math.round((stockBySupplier[0].quantity / totalStock) * 100)
      : 0;

  // Get the initial of the top supplier
  const topSupplierInitial =
    stockBySupplier.length > 0
      ? stockBySupplier[0].supplier.charAt(0).toUpperCase()
      : "N";

  return (
    <div
      style={{
        backgroundColor: "rgba(248, 249, 251, 1)",
        padding: "15px",
        borderRadius: "10px",
      }}
    >
      <h2>TOP VENDORS</h2>

      <br />
      <br />

      {stockBySupplier.length > 0 ? (
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
                    <CustomTooltip totalStock={totalStock} unit={unit} />
                  }
                  wrapperStyle={{ zIndex: 100 }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Center "ALL TIME" with Top Supplier Initial Badge */}
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
                  {topSupplierPercentage}%
                </p>
              </div>
            )} */}
          </div>

          {/* Supplier Legend */}
          <div style={{ marginTop: "16px", fontSize: "12px" }}>
            {chartData.map((supplier, index) => (
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
                      backgroundColor: supplier.color,
                    }}
                  />
                  <span style={{ textTransform: "uppercase" }}>
                    {supplier.name}
                  </span>
                </div>
                <span style={{ fontWeight: "600" }}>
                  {formatNumber(supplier.value)} {unit}
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
          No supplier data available
        </div>
      )}
    </div>
  );
}
