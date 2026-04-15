"use client";

import { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

interface Props {
  stocks: any[];
  stocksTransferIssue: any[];
  unit: string;
}

const TIME_FILTERS = [
  { value: "30d", label: "Last 30 Days" },
  { value: "3m", label: "Last 3 Months" },
  { value: "6m", label: "Last 6 Months" },
  { value: "1y", label: "Last 1 Year" },
];

function getFilterDate(filter: string): Date {
  const now = new Date();
  switch (filter) {
    case "30d":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
    case "3m":
      return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    case "6m":
      return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    case "1y":
      return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    default:
      return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  }
}

function formatDate(date: Date): string {
  const day = date.getDate().toString().padStart(2, "0");
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${day} ${months[date.getMonth()]}`;
}

function toDayKey(date: Date): string {
  return `${date.getFullYear()}-${(date.getMonth() + 1)
    .toString()
    .padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
}

function formatNumber(value: number): string | number {
  if (value % 1 === 0) {
    return Math.round(value);
  }
  return parseFloat(value.toFixed(3));
}

const CustomTooltip = ({ active, payload, label, unit }: any) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          backgroundColor: "white",
          padding: "10px 14px",
          borderRadius: "10px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          border: "1px solid #e0e0e0",
          fontSize: "12px",
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: "4px" }}>{label}</div>
        <div style={{ color: "rgb(138, 168, 23)" }}>
          {formatNumber(payload[0].value)} {unit}
        </div>
      </div>
    );
  }
  return null;
};

export default function StockHistoryWidget({
  stocks,
  stocksTransferIssue,
  unit,
}: Props) {
  const [timeFilter, setTimeFilter] = useState("1y");

  const { chartData, currentStock } = useMemo(() => {
    // Build a list of all events with date and quantity change
    const events: { date: Date; delta: number }[] = [];

    stocks.forEach((stock) => {
      const date = new Date(stock.created_at);
      events.push({ date, delta: Number(stock.quantity) || 0 });
    });

    stocksTransferIssue.forEach((transaction) => {
      const type = (transaction.type || "").toLowerCase();
      const date = new Date(transaction.created_on);
      const qty = Number(transaction.quantity) || 0;

      if (type.includes("issue") || type.includes("send")) {
        events.push({ date, delta: -qty });
      } else if (type.includes("transfer")) {
        events.push({ date, delta: -qty });
      }
    });

    // Sort events by date
    events.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Group deltas by day
    const dayMap: { [key: string]: { date: Date; delta: number } } = {};
    events.forEach((event) => {
      const key = toDayKey(event.date);
      if (!dayMap[key]) {
        dayMap[key] = { date: event.date, delta: 0 };
      }
      dayMap[key].delta += event.delta;
    });

    // Build running total
    const sortedDays = Object.entries(dayMap).sort(([a], [b]) =>
      a.localeCompare(b),
    );

    let runningTotal = 0;
    const allPoints: { dateKey: string; date: Date; balance: number }[] = [];

    sortedDays.forEach(([key, { date, delta }]) => {
      runningTotal += delta;
      allPoints.push({ dateKey: key, date, balance: runningTotal });
    });

    // Current stock is the final running total
    const currentStockValue =
      allPoints.length > 0 ? allPoints[allPoints.length - 1].balance : 0;

    // Filter by time range
    const filterDate = getFilterDate(timeFilter);
    const filtered = allPoints.filter((p) => p.date >= filterDate);

    // Format for chart
    const data = filtered.map((p) => ({
      name: formatDate(p.date),
      balance: parseFloat(p.balance.toFixed(3)),
    }));

    return { chartData: data, currentStock: currentStockValue };
  }, [stocks, stocksTransferIssue, timeFilter]);

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "5px",
        }}
      >
        <h2>STOCKS HISTORY</h2>
        <select
          value={timeFilter}
          onChange={(e) => setTimeFilter(e.target.value)}
          style={{
            padding: "8px 14px",
            borderRadius: "50px",
            border: "1px solid rgba(223, 223, 223, 1)",
            backgroundColor: "white",
            cursor: "pointer",
            fontSize: "13px",
            width: "auto",
          }}
        >
          {TIME_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="stockGreenFill" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="rgb(138, 168, 23)"
                  stopOpacity={0.2}
                />
                <stop
                  offset="100%"
                  stopColor="rgb(138, 168, 23)"
                  stopOpacity={0.02}
                />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: "#999" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#999" }}
              axisLine={false}
              tickLine={false}
              label={{
                value: unit,
                angle: -90,
                position: "insideLeft",
                style: { fontSize: 11, fill: "#999" },
              }}
            />
            <Tooltip content={<CustomTooltip unit={unit} />} />
            <Area
              type="linear"
              dataKey="balance"
              stroke="rgb(138, 168, 23)"
              strokeWidth={2}
              fill="url(#stockGreenFill)"
              dot={{ r: 3, fill: "rgb(138, 168, 23)", strokeWidth: 0 }}
              activeDot={{
                r: 5,
                fill: "rgb(138, 168, 23)",
                strokeWidth: 2,
                stroke: "#fff",
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div
          style={{
            height: 300,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#999",
            fontSize: "14px",
          }}
        >
          No stock data available for this period
        </div>
      )}
    </div>
  );
}
