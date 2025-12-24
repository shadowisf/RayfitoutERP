"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface StockLocationChartProps {
  stocks: any[];
  stocksTransferIssue: any[];
  unit: string;
}

export default function StockLocationChart({
  stocks,
  stocksTransferIssue,
  unit,
}: StockLocationChartProps) {
  // Calculate stock by location
  const calculateStockByLocation = () => {
    const locationMap: { [key: string]: number } = {};

    // Add stocks from stocks table
    stocks.forEach((stock) => {
      const location = stock.location || "Unknown";
      if (!locationMap[location]) {
        locationMap[location] = 0;
      }
      locationMap[location] += stock.quantity;
    });

    // Subtract issued stocks and adjust for transfers
    stocksTransferIssue.forEach((transaction) => {
      if (transaction.type === "Issue") {
        // Deduct from from_location
        const fromLocation = transaction.from_location || "Unknown";
        if (!locationMap[fromLocation]) {
          locationMap[fromLocation] = 0;
        }
        locationMap[fromLocation] -= transaction.quantity;
      } else if (transaction.type === "Transfer") {
        // Deduct from from_location
        const fromLocation = transaction.from_location || "Unknown";
        if (!locationMap[fromLocation]) {
          locationMap[fromLocation] = 0;
        }
        locationMap[fromLocation] -= transaction.quantity;

        // Add to to_location
        const toLocation = transaction.to_location || "Unknown";
        if (!locationMap[toLocation]) {
          locationMap[toLocation] = 0;
        }
        locationMap[toLocation] += transaction.quantity;
      }
    });

    // Filter out locations with zero or negative stock
    const filteredLocations = Object.entries(locationMap)
      .filter(([_, quantity]) => quantity > 0)
      .map(([location, quantity]) => ({ location, quantity }));

    return filteredLocations;
  };

  const stockByLocation = calculateStockByLocation();

  // Calculate total stock
  const totalStock = stockByLocation.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  // Define colors for different locations
  const COLORS = [
    "#D3D3D3", // Gray
    "#4169E1", // Blue
    "#00804C", // Green
    "#FFD700", // Gold
    "#FF6B6B", // Red
    "#9B59B6", // Purple
  ];

  // Transform data for the chart
  const chartData = stockByLocation.map((item, index) => ({
    name: item.location,
    value: item.quantity,
    color: COLORS[index % COLORS.length],
  }));

  return (
    <div>
      <h2
        style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "20px" }}
      >
        STOCK
      </h2>

      <div style={{ display: "flex", gap: "40px", alignItems: "center" }}>
        {/* Donut Chart */}
        <div style={{ position: "relative", width: "200px", height: "200px" }}>
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

          {/* Center Text */}
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
              }}
            >
              TOTAL STOCK
            </div>
            <div style={{ fontSize: "36px", fontWeight: "bold" }}>
              {totalStock}
            </div>
            <div
              style={{
                fontSize: "14px",
                color: "#737373",
                textTransform: "uppercase",
              }}
            >
              {unit}
            </div>
          </div>
        </div>

        {/* Stock Locations Legend */}
        <div style={{ flex: 1 }}>
          <h3
            style={{
              fontSize: "14px",
              fontWeight: "600",
              marginBottom: "16px",
              textTransform: "uppercase",
            }}
          >
            STOCK LOCATIONS
          </h3>

          <div
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            {chartData.map((location, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <div
                    style={{
                      width: "12px",
                      height: "12px",
                      borderRadius: "50%",
                      backgroundColor: location.color,
                    }}
                  />
                  <span
                    style={{
                      fontSize: "14px",
                      textTransform: "uppercase",
                    }}
                  >
                    {location.name}
                  </span>
                </div>
                <span style={{ fontSize: "14px", fontWeight: "600" }}>
                  {location.value} {unit}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
