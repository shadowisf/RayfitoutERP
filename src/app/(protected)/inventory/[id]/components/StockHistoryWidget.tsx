"use client";

import { useState, useMemo } from "react";
import {
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

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
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

function toDayKey(date: Date): string {
  return `${date.getFullYear()}-${(date.getMonth() + 1)
    .toString()
    .padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
}

function toMonthKey(date: Date): string {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}`;
}

function formatDayLabel(date: Date): string {
  const day = date.getDate().toString().padStart(2, "0");
  return `${day} ${MONTHS[date.getMonth()]}`;
}

function formatMonthLabel(date: Date): string {
  return MONTHS[date.getMonth()];
}

function formatNumber(value: number): string | number {
  if (value % 1 === 0) return Math.round(value);
  return parseFloat(value.toFixed(3));
}

type ChartTransaction = { id: string; txType: "add" | "remove" };

const CustomTooltip = ({ active, payload, label, unit, isMonthly }: any) => {
  if (!active || !payload || !payload.length) return null;

  const point = payload[0].payload;
  const transactions: ChartTransaction[] = point.transactions || [];

  if (isMonthly) {
    // Monthly view: show only transaction IDs
    return (
      <div
        style={{
          backgroundColor: "white",
          padding: "10px 14px",
          borderRadius: "10px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          border: "1px solid #e0e0e0",
          fontSize: "12px",
          minWidth: "120px",
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: "6px" }}>{label}</div>
        {transactions.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
            {transactions.map((tx, i) => (
              <div
                key={i}
                style={{
                  color: tx.txType === "add" ? "rgb(0, 128, 76)" : "#C50C0F",
                  fontWeight: 600,
                  fontSize: "11px",
                }}
              >
                {tx.id}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: "#999" }}>No transactions</div>
        )}
      </div>
    );
  }

  // Daily view: show stock balance
  return (
    <div
      style={{
        backgroundColor: "rgba(20,20,20,1)",
        padding: "12px 16px",
        borderRadius: 10,
        boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
      }}
    >
      <div style={{ fontSize: 11, color: "rgba(180,180,180,1)", marginBottom: 4, fontWeight: 400 }}>{label}</div>
      <div style={{ fontSize: 16, color: "white", fontWeight: 700 }}>
        {formatNumber(payload[0].value)} {unit}
      </div>
    </div>
  );
};

export default function StockHistoryWidget({
  stocks,
  stocksTransferIssue,
  unit,
}: Props) {
  const [timeFilter, setTimeFilter] = useState("1y");

  const isMonthly = timeFilter !== "30d";

  const { chartData, currentStock } = useMemo(() => {
    // Build events with transaction IDs
    const events: {
      date: Date;
      delta: number;
      txId: string;
      txType: "add" | "remove";
    }[] = [];

    stocks.forEach((stock) => {
      const date = new Date(stock.created_at);
      events.push({
        date,
        delta: Number(stock.quantity) || 0,
        txId: `TA-${String(stock.id).padStart(5, "0")}`,
        txType: "add",
      });
    });

    stocksTransferIssue.forEach((transaction) => {
      const type = (transaction.type || "").toLowerCase();
      const date = new Date(transaction.created_on);
      const qty = Number(transaction.quantity) || 0;
      if (
        type.includes("issue") ||
        type.includes("send") ||
        type.includes("transfer")
      ) {
        events.push({
          date,
          delta: -qty,
          txId: `TA-${String(transaction.id).padStart(5, "0")}`,
          txType: "remove",
        });
      }
    });

    events.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Group by day (for 30d) or month (for 3m/6m/1y)
    const groupMap: {
      [key: string]: {
        date: Date;
        delta: number;
        transactions: ChartTransaction[];
      };
    } = {};

    events.forEach((event) => {
      const key = isMonthly
        ? toMonthKey(event.date)
        : toDayKey(event.date);
      if (!groupMap[key]) {
        groupMap[key] = { date: event.date, delta: 0, transactions: [] };
      }
      groupMap[key].delta += event.delta;
      groupMap[key].transactions.push({ id: event.txId, txType: event.txType });
    });

    // Build running total over ALL events first (for currentStock)
    const allSorted = Object.entries(groupMap).sort(([a], [b]) =>
      a.localeCompare(b),
    );

    let runningTotal = 0;
    const allPoints = allSorted.map(([, { date, delta, transactions }]) => {
      runningTotal += delta;
      return {
        date,
        balance: runningTotal,
        transactions,
        name: isMonthly ? formatMonthLabel(date) : formatDayLabel(date),
      };
    });

    const currentStockValue =
      allPoints.length > 0 ? allPoints[allPoints.length - 1].balance : 0;

    // Filter by time range
    const filterDate = getFilterDate(timeFilter);
    const filtered = allPoints.filter((p) => p.date >= filterDate);

    const data = filtered.map((p) => ({
      name: p.name,
      balance: parseFloat(p.balance.toFixed(3)),
      transactions: p.transactions,
    }));

    return { chartData: data, currentStock: currentStockValue };
  }, [stocks, stocksTransferIssue, timeFilter, isMonthly]);

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
            <Tooltip
              content={<CustomTooltip unit={unit} isMonthly={isMonthly} />}
            />
            <Area
              type="linear"
              dataKey="balance"
              stroke="rgb(138, 168, 23)"
              strokeWidth={2}
              fill="url(#stockGreenFill)"
              dot={{ r: 5, fill: "rgb(138, 168, 23)", strokeWidth: 0 }}
              activeDot={{
                r: 7,
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
