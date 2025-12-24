"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface TopSuppliersChartProps {
  stocks: any[];
  unit: string;
}

export default function TopSuppliersChart({
  stocks,
  unit,
}: TopSuppliersChartProps) {
  // Calculate stock by supplier
  const calculateStockBySupplier = () => {
    const supplierMap: { [key: string]: number } = {};

    // Group stocks by supplier
    stocks.forEach((stock) => {
      const supplier = stock.supplier_name || "OTHERS";
      if (!supplierMap[supplier]) {
        supplierMap[supplier] = 0;
      }
      supplierMap[supplier] += stock.quantity;
    });

    // Convert to array and sort by quantity
    const supplierArray = Object.entries(supplierMap)
      .map(([supplier, quantity]) => ({ supplier, quantity }))
      .sort((a, b) => b.quantity - a.quantity);

    return supplierArray;
  };

  const stockBySupplier = calculateStockBySupplier();

  // Calculate total stock
  const totalStock = stockBySupplier.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  // Define colors for different suppliers
  const COLORS = [
    "#00804C", // Green - Top supplier
    "#7B68EE", // Purple
    "#87CEEB", // Light Blue
    "#D3D3D3", // Gray - Others
    "#FFD700", // Gold
    "#FF6B6B", // Red
  ];

  // Transform data for the chart
  const chartData = stockBySupplier.map((item, index) => ({
    name: item.supplier,
    value: item.quantity,
    color: COLORS[index % COLORS.length],
  }));

  // Calculate percentage for top supplier
  const topSupplierPercentage =
    totalStock > 0
      ? Math.round((stockBySupplier[0]?.quantity / totalStock) * 100)
      : 0;

  return (
    <div>
      <h2>TOP SUPPLIERS</h2>
      
      <br />
      <br />

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

        {/* Center "ALL TIME" with F Badge */}
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
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              backgroundColor: "#FFD700",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "20px",
              fontWeight: "bold",
              color: "white",
              margin: "0 auto",
            }}
          >
            F
          </div>
        </div>

        {/* Percentage Badge */}
        {stockBySupplier.length > 0 && (
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
            {topSupplierPercentage}%
          </div>
        )}
      </div>

      {/* Supplier Legend */}
      <div style={{ marginTop: "16px", fontSize: "12px" }}>
        {chartData.map((supplier, index) => (
          <div
            key={index}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "8px",
            }}
          >
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: supplier.color,
              }}
            />
            <span style={{ textTransform: "uppercase" }}>{supplier.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
