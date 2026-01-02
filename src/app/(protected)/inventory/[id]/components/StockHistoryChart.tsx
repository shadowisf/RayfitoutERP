"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
  Tooltip,
  Cell,
} from "recharts";

interface StockHistoryChartProps {
  stocks: any[];
  stocksTransferIssue: any[];
  unit: string;
  inventoryItemCreatedAt: string;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;

    // Check if this is the creation point
    if (data.isCreationPoint) {
      return (
        <div
          style={{
            backgroundColor: "white",
            border: "2px solid #737373",
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
          <div style={{ color: "#737373" }}>Item Created</div>
        </div>
      );
    }

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

        {/* Stock Additions */}
        {data.addedTransactions && data.addedTransactions.length > 0 && (
          <div style={{ marginBottom: "8px" }}>
            <div
              style={{
                color: "#00804C",
                fontWeight: "600",
                marginBottom: "4px",
              }}
            >
              Added (+{data.added} {data.unit}):
            </div>
            {data.addedTransactions.map((transaction: any, index: number) => (
              <div
                key={index}
                style={{
                  fontSize: "11px",
                  color: "#737373",
                  marginLeft: "8px",
                }}
              >
                • TA-{String(transaction.batch_id).padStart(5, "0")}:{" "}
                {transaction.quantity} {data.unit}
              </div>
            ))}
          </div>
        )}

        {/* Stock Issues */}
        {data.removedTransactions && data.removedTransactions.length > 0 && (
          <div style={{ marginBottom: "8px" }}>
            <div
              style={{
                color: "#C50C0F",
                fontWeight: "600",
                marginBottom: "4px",
              }}
            >
              Issued (-{data.removed} {data.unit}):
            </div>
            {data.removedTransactions.map((transaction: any, index: number) => (
              <div
                key={index}
                style={{
                  fontSize: "11px",
                  color: "#737373",
                  marginLeft: "8px",
                }}
              >
                • TA-{String(transaction.id).padStart(5, "0")}:{" "}
                {transaction.quantity} {data.unit}
              </div>
            ))}
          </div>
        )}

        <div
          style={{
            borderTop: "1px solid #E5E5E5",
            paddingTop: "8px",
            fontWeight: "700",
          }}
        >
          Total: {data.netChange} {data.unit}
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
  inventoryItemCreatedAt,
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
        isCreationPoint?: boolean;
        addedTransactions: any[];
        removedTransactions: any[];
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

    // Add creation point (starting at 0)
    const creationDate = new Date(inventoryItemCreatedAt);
    const creationKey = getKey(creationDate);
    dataMap[creationKey] = {
      added: 0,
      removed: 0,
      timestamp: creationDate.getTime(),
      displayDate: formatDisplayDate(creationDate, groupByDay),
      shortDate: formatShortDate(creationDate, groupByDay),
      isCreationPoint: true,
      addedTransactions: [],
      removedTransactions: [],
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
          addedTransactions: [],
          removedTransactions: [],
        };
      }

      dataMap[key].added += stock.quantity;
      dataMap[key].addedTransactions.push({
        batch_id: stock.batch_id,
        quantity: stock.quantity,
      });
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
            addedTransactions: [],
            removedTransactions: [],
          };
        }

        dataMap[key].removed += Math.abs(item.quantity);
        dataMap[key].removedTransactions.push({
          id: item.id,
          quantity: Math.abs(item.quantity),
        });
      }
    });

    // Convert to array and calculate cumulative quantity
    const allData = Object.values(dataMap).sort(
      (a, b) => a.timestamp - b.timestamp
    );

    let cumulativeQuantity = 0;
    const dataWithCumulative = allData.map((item) => {
      cumulativeQuantity += item.added - item.removed;
      return {
        ...item,
        netChange: cumulativeQuantity,
        unit: unit,
      };
    });

    return dataWithCumulative;
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
  const yAxisDomain = [0, maxValue * 1.2];

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
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            barCategoryGap={0}
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
              tickFormatter={(value) => `${value}`}
            />

            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: "rgba(0,0,0,0.05)" }}
            />

            {/* Zero reference line */}
            <ReferenceLine y={0} stroke="#737373" strokeWidth={2} />

            <Bar dataKey="netChange" radius={[0, 0, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.isCreationPoint ? "#737373" : "#00804C"}
                />
              ))}
            </Bar>
          </BarChart>
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
