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
      if (transaction.type.toLowerCase().includes("issue")) {
        const fromLocation = transaction.from_location || "Unknown";
        if (!locationMap[fromLocation]) {
          locationMap[fromLocation] = 0;
        }
        locationMap[fromLocation] -= transaction.quantity;
      } else if (transaction.type.toLowerCase().includes("transfer")) {
        // For transfers, move stock from one location to another when received
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
    <div style={{ textTransform: "uppercase" }}>
      <h2>STOCKS</h2>

      <br />

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
                color: "#737373",
              }}
            >
              TOTAL
            </div>
            <div style={{ fontSize: "36px" }}>{totalStock}</div>
            <div
              style={{
                color: "#737373",
              }}
            >
              {unit}
            </div>
          </div>
        </div>

        {/* Stock Locations Legend */}
        <div style={{ flex: 1, textTransform: "uppercase" }}>
          <h3>STOCK LOCATIONS</h3>

          <br />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
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
                  style={{ display: "flex", alignItems: "center", gap: "10px" }}
                >
                  <div
                    style={{
                      width: "12px",
                      height: "12px",
                      borderRadius: "50%",
                      backgroundColor: location.color,
                    }}
                  />
                  <span>{location.name}</span>
                </div>
                <span>
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
