"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface StockHistoryChartProps {
  stocks: any[];
  stocksTransferIssue: any[];
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div
        style={{
          backgroundColor:
            data.type === "ADDED"
              ? "#00804C"
              : data.type === "ISSUED"
              ? "#C50C0F"
              : "#CEBA1D",
          color: "white",
          padding: "8px 12px",
          borderRadius: "8px",
          fontSize: "12px",
          fontWeight: "600",
        }}
      >
        <div>{data.date}</div>
        <div>{data.label}</div>
      </div>
    );
  }
  return null;
};

const CustomDot = (props: any) => {
  const { cx, cy, payload } = props;

  const colorMap = {
    ADDED: "#00804C",
    ISSUED: "#C50C0F",
    TRANSFERRED: "#CEBA1D",
  };

  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={8}
        fill={colorMap[payload.type as keyof typeof colorMap] || "#00804C"}
        stroke="white"
        strokeWidth={3}
      />
    </g>
  );
};

export default function StockHistoryChart({
  stocks,
  stocksTransferIssue,
}: StockHistoryChartProps) {
  // Combine and transform data for the chart
  const transformData = () => {
    const stocksData = stocks.map((stock) => ({
      date: new Date(stock.created_at)
        .toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
        })
        .toUpperCase(),
      month: new Date(stock.created_at).toLocaleDateString("en-US", {
        month: "short",
      }),
      quantity: stock.quantity,
      type: "ADDED",
      label: stock.batch_id
        ? `BA-${stock.batch_id.toString().padStart(5, "0")}`
        : "Stock Added",
      timestamp: new Date(stock.created_at).getTime(),
    }));

    const transferIssueData = stocksTransferIssue.map((item) => ({
      date: new Date(item.created_on)
        .toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
        })
        .toUpperCase(),
      month: new Date(item.created_on).toLocaleDateString("en-US", {
        month: "short",
      }),
      quantity:
        item.type === "Issue" ? -Math.abs(item.quantity) : item.quantity,
      type: item.type === "Transfer" ? "TRANSFERRED" : "ISSUED",
      label:
        item.purpose || (item.type === "Transfer" ? "Transferred" : "Issued"),
      timestamp: new Date(item.created_on).getTime(),
    }));

    // Combine and sort by timestamp
    const allData = [...stocksData, ...transferIssueData].sort(
      (a, b) => a.timestamp - b.timestamp
    );

    // Calculate cumulative quantity for the area chart
    let cumulative = 0;
    return allData.map((item) => {
      cumulative += item.quantity;
      return {
        ...item,
        cumulativeQuantity: cumulative,
      };
    });
  };

  const chartData = transformData();

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorQuantity" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#95DEBD" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#95DEBD" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#E5E5E5"
          />
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#737373", fontSize: 12 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#737373", fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} cursor={false} />
          <Area
            type="monotone"
            dataKey="cumulativeQuantity"
            stroke="#00804C"
            strokeWidth={2}
            fill="url(#colorQuantity)"
            dot={<CustomDot />}
            activeDot={{ r: 10 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
