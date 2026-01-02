"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
  Tooltip,
} from "recharts";

interface StockHistoryChartProps {
  stocks: any[];
  stocksTransferIssue: any[];
  unit: string;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;

    return (
      <div
        style={{
          backgroundColor: "white",
          border: "2px solid #00804C",
          padding: "12px",
          borderRadius: "8px",
          fontSize: "12px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          minWidth: "200px",
        }}
      >
        <div style={{ fontWeight: "600", marginBottom: "8px" }}>
          {data.displayDate}
        </div>

        <div style={{ marginBottom: "4px" }}>
          <span style={{ color: "#00804C", fontWeight: "600" }}>
            +{data.added} {data.unit}
          </span>
          <span style={{ color: "#737373", fontSize: "11px" }}> added</span>
        </div>

        <div>
          <span style={{ color: "#C50C0F", fontWeight: "600" }}>
            -{data.removed} {data.unit}
          </span>
          <span style={{ color: "#737373", fontSize: "11px" }}> issued</span>
        </div>
      </div>
    );
  }
  return null;
};

export default function StockHistoryChart({
  stocks,
  stocksTransferIssue,
  unit,
}: StockHistoryChartProps) {
  const [timePeriod, setTimePeriod] = useState<string>("all");

  // Transform data - can be daily or monthly based on selection
  const transformData = (groupByDay: boolean = false) => {
    const dataMap: {
      [key: string]: {
        added: number;
        removed: number;
        timestamp: number;
        displayDate: string;
        shortDate: string;
      };
    } = {};

    // Helper function to get the appropriate key
    const getKey = (date: Date) => {
      if (groupByDay) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
          2,
          "0"
        )}-${String(date.getDate()).padStart(2, "0")}`;
      } else {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
          2,
          "0"
        )}`;
      }
    };

    // Helper function to format display date
    const formatDisplayDate = (date: Date, isDaily: boolean) => {
      if (isDaily) {
        return date
          .toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
          .toUpperCase();
      } else {
        return date
          .toLocaleDateString("en-GB", {
            month: "short",
            year: "numeric",
          })
          .toUpperCase();
      }
    };

    const formatShortDate = (date: Date, isDaily: boolean) => {
      if (isDaily) {
        return date
          .toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
          })
          .toUpperCase();
      } else {
        return date
          .toLocaleDateString("en-GB", {
            month: "short",
          })
          .toUpperCase();
      }
    };

    // Process stock additions
    stocks.forEach((stock) => {
      const date = new Date(stock.created_at);
      const key = getKey(date);

      if (!dataMap[key]) {
        dataMap[key] = {
          added: 0,
          removed: 0,
          timestamp: date.getTime(),
          displayDate: formatDisplayDate(date, groupByDay),
          shortDate: formatShortDate(date, groupByDay),
        };
      }

      dataMap[key].added += stock.quantity;
    });

    // Process only issues (not transfers)
    stocksTransferIssue.forEach((item) => {
      if (item.type.toLowerCase().includes("issue")) {
        const date = new Date(item.created_on);
        const key = getKey(date);

        if (!dataMap[key]) {
          dataMap[key] = {
            added: 0,
            removed: 0,
            timestamp: date.getTime(),
            displayDate: formatDisplayDate(date, groupByDay),
            shortDate: formatShortDate(date, groupByDay),
          };
        }

        dataMap[key].removed += Math.abs(item.quantity);
      }
    });

    // Convert to array and calculate net change
    const allData = Object.values(dataMap)
      .map((item) => ({
        ...item,
        netChange: item.added - item.removed,
        unit: unit,
      }))
      .sort((a, b) => a.timestamp - b.timestamp);

    return allData;
  };

  // Determine if we should group by day
  const isSpecificMonth =
    timePeriod !== "all" && timePeriod !== "12months" && timePeriod !== "";

  // Get all data (monthly)
  const allMonthlyData = transformData(false);

  // Filter data based on selected time period
  const getFilteredData = () => {
    if (timePeriod === "all") {
      return transformData(false);
    }

    if (timePeriod === "12months") {
      const now = new Date();
      const cutoffDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      return transformData(false).filter(
        (item) => item.timestamp >= cutoffDate.getTime()
      );
    }

    // Specific month - transform by day
    const [year, month] = timePeriod.split("-").map(Number);
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);

    const dailyData = transformData(true);

    return dailyData.filter((item) => {
      return (
        item.timestamp >= startOfMonth.getTime() &&
        item.timestamp <= endOfMonth.getTime()
      );
    });
  };

  const chartData = getFilteredData();

  // Calculate max value for Y-axis scaling
  const maxValue =
    chartData.length > 0
      ? Math.max(...chartData.map((d) => Math.abs(d.netChange)))
      : 100;
  const yAxisDomain = [-maxValue * 1.2, maxValue * 1.2];

  // Generate unique months for dropdown
  const getAvailableMonths = () => {
    const months = allMonthlyData.map((item) => {
      const date = new Date(item.timestamp);
      return {
        value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
          2,
          "0"
        )}`,
        label: item.displayDate,
      };
    });

    // Remove duplicates
    const uniqueMonths = months.filter(
      (month, index, self) =>
        index === self.findIndex((m) => m.value === month.value)
    );

    return uniqueMonths;
  };

  const availableMonths = getAvailableMonths();

  return (
    <div style={{ width: "100%", height: "500px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2>STOCK HISTORY</h2>

        <div>
          <select
            value={timePeriod}
            onChange={(e) => setTimePeriod(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              border: "1px solid #E5E5E5",
              backgroundColor: "white",
              fontSize: "12px",
              cursor: "pointer",
              textTransform: "uppercase",
            }}
          >
            <option value="all">ALL TIME</option>
            <option value="12months">LAST 12 MONTHS</option>
            <option disabled>───────────</option>
            {availableMonths.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <br />

      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height="85%">
          <LineChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#E5E5E5"
            />

            <XAxis
              dataKey="shortDate"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#737373", fontSize: 11 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />

            <YAxis
              domain={yAxisDomain}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#737373", fontSize: 12 }}
              tickFormatter={(value) => `${value > 0 ? "+" : ""}${value}`}
            />

            <Tooltip content={<CustomTooltip />} cursor={false} />

            {/* Zero reference line */}
            <ReferenceLine y={0} stroke="#737373" strokeWidth={2} />

            <Line
              type="monotone"
              dataKey="netChange"
              stroke="#00804C"
              strokeWidth={3}
              dot={{
                fill: "#00804C",
                stroke: "white",
                strokeWidth: 2,
                r: 5,
              }}
              activeDot={{
                fill: "#00804C",
                stroke: "white",
                strokeWidth: 2,
                r: 7,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            color: "#737373",
          }}
        >
          <p>No stock movement history available</p>
        </div>
      )}
    </div>
  );
}
