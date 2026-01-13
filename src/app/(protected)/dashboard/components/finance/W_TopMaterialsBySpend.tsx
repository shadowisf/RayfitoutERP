"use client";

import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface MaterialSpending {
  category_name: string;
  total_spend: number | string;
}

// Tooltip (unchanged styling)
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    const color = data.payload.color || data.color || "#00804C";

    const formatAED = (value: number) => {
      if (value >= 1_000_000) {
        return `${(value / 1_000_000).toFixed(1)}M AED`;
      }
      if (value >= 1_000) {
        return `${(value / 1_000).toFixed(1)}K AED`;
      }
      return `${value.toLocaleString()} AED`;
    };

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
          <strong style={{ fontSize: "12px" }}>{formatAED(data.value)}</strong>
        </div>
      </div>
    );
  }

  return null;
};

export default function TopMaterialsBySpendingChart() {
  const [materials, setMaterials] = useState<MaterialSpending[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/dashboard/finance/getTopMaterialsBySpend`,
          { cache: "no-store" }
        );
        const data = await res.json();
        setMaterials(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const materialData = materials
    .map((item) => ({
      name: item.category_name || "Others",
      value: Number(item.total_spend),
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);

  const totalSpend = materialData.reduce((sum, item) => sum + item.value, 0);

  const COLORS = [
    "#00804C",
    "#7B68EE",
    "#87CEEB",
    "#FFD700",
    "#FF6B6B",
    "#D3D3D3",
  ];

  const chartData = materialData.map((item, index) => ({
    ...item,
    color: COLORS[index % COLORS.length],
  }));

  return (
    <div className="item">
      <h3>Top Materials By Spend</h3>

      <br />
      <br />

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#737373" }}>
          Loading...
        </div>
      ) : chartData.length > 0 ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "40px",
          }}
        >
          {/* LEGEND — LEFT */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              fontSize: "12px",
            }}
          >
            {chartData.map((item, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: item.color,
                  }}
                />
                <span style={{ textTransform: "uppercase" }}>{item.name}</span>
              </div>
            ))}
          </div>

          {/* PIE CHART — RIGHT */}
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
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={<CustomTooltip totalSpend={totalSpend} />}
                  wrapperStyle={{ zIndex: 100 }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* CENTER LABEL */}
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                textAlign: "center",
                pointerEvents: "none",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  color: "#737373",
                  textTransform: "uppercase",
                }}
              >
                ALL TIME
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "40px", color: "#737373" }}>
          No material data available
        </div>
      )}
    </div>
  );
}
