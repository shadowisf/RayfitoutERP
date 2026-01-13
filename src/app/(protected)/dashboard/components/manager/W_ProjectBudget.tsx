"use client";

import { useEffect, useState } from "react";

type ChartDataPoint = {
  date: string;
  allocated: number;
  dailyAllocation: number;
};

type BudgetData = {
  project_id: number;
  project_name: string;
  quoted_budget: number | null;
  total_allocated_budget: number;
  remaining_budget: number | null;
  percentage_used: number | null;
  limit_budget: number | null;
  has_limit: boolean;
  chartData: ChartDataPoint[];
};

type Props = {
  projectId: number;
};

export default function BudgetAllocationGraph({ projectId }: Props) {
  const [data, setData] = useState<BudgetData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState(365); // Default to 1 year
  const [hoveredPoint, setHoveredPoint] = useState<ChartDataPoint | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const downArrowIcon = "/icons/minimal-arrow-down.svg";

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/dashboard/manager/getAllocatedBudgetWithDate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filter, project_id: projectId }),
      }
    )
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((responseData) => {
        setData(responseData);
      })
      .catch((err) => {
        console.error("Error fetching budget allocation:", err);
        setError(err.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [filter, projectId]);

  if (error) {
    return (
      <div
        style={{
          backgroundColor: "white",
          padding: "20px",
          borderRadius: "15px",
        }}
      >
        <div style={{ color: "rgba(248, 77, 77, 1)", textAlign: "center" }}>
          Error: {error}
        </div>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div
        style={{
          backgroundColor: "white",
          padding: "20px",
          borderRadius: "15px",
        }}
      >
        <div style={{ color: "#888", textAlign: "center" }}>Loading...</div>
      </div>
    );
  }

  // Aggregate data by month for longer periods (>90 days)
  const aggregateDataByPeriod = () => {
    if (filter <= 90) {
      return data.chartData;
    }

    const monthlyData: { [key: string]: ChartDataPoint } = {};

    data.chartData.forEach((point) => {
      const date = new Date(point.date);
      const monthKey = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}-01`;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          date: monthKey,
          allocated: point.allocated,
          dailyAllocation: point.dailyAllocation,
        };
      } else {
        monthlyData[monthKey].allocated = point.allocated;
        monthlyData[monthKey].dailyAllocation += point.dailyAllocation;
      }
    });

    return Object.values(monthlyData).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
  };

  const aggregatedData = aggregateDataByPeriod();

  const chartHeight = 250;
  const chartWidth = 1000;
  const padding = { top: 20, right: 20, bottom: 40, left: 80 };
  const graphWidth = chartWidth - padding.left - padding.right;
  const graphHeight = chartHeight - padding.top - padding.bottom;

  // Get max value for Y axis - dynamic scaling
  const dataMaxValue = Math.max(...aggregatedData.map((d) => d.allocated), 0);

  // If has limit budget, include it in max calculation
  let maxValue = dataMaxValue;
  if (data.has_limit && data.limit_budget) {
    maxValue = Math.max(maxValue, data.limit_budget);
  }

  // Add 10% padding to top for better visibility
  maxValue = maxValue * 1.1;

  // Ensure minimum scale for very low values
  if (maxValue < 100) {
    maxValue = 100;
  }

  const minValue = 0;

  // Calculate scales
  const xScale = graphWidth / (aggregatedData.length - 1 || 1);
  const yScale = graphHeight / (maxValue - minValue || 1);

  // Generate path for the line
  const linePath = aggregatedData
    .map((point, index) => {
      const x = padding.left + index * xScale;
      const y =
        padding.top + graphHeight - (point.allocated - minValue) * yScale;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  // Generate area path
  const areaPath = `
    ${linePath}
    L ${padding.left + graphWidth} ${padding.top + graphHeight}
    L ${padding.left} ${padding.top + graphHeight}
    Z
  `;

  // Calculate limit budget line Y position (only if has limit)
  const limitY =
    data.has_limit && data.limit_budget
      ? padding.top + graphHeight - (data.limit_budget - minValue) * yScale
      : null;

  // Format currency
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `AED ${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `AED ${(value / 1000).toFixed(0)}K`;
    }
    return `AED ${value.toLocaleString()}`;
  };

  // Format date for X axis
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (filter > 90) {
      return date.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      });
    }
    return date.toLocaleDateString("en-US", { month: "short" });
  };

  // Get X axis labels
  const getXAxisLabels = () => {
    const labels: { date: string; position: number }[] = [];

    if (filter > 90) {
      aggregatedData.forEach((point, index) => {
        labels.push({
          date: formatDate(point.date),
          position: padding.left + index * xScale,
        });
      });
    } else {
      let lastMonth = "";
      aggregatedData.forEach((point, index) => {
        const month = formatDate(point.date);
        if (month !== lastMonth) {
          labels.push({
            date: month,
            position: padding.left + index * xScale,
          });
          lastMonth = month;
        }
      });
    }

    return labels;
  };

  const xAxisLabels = getXAxisLabels();

  // Get Y axis labels - dynamic
  const getYAxisLabels = () => {
    const numLabels = 3;
    const interval = maxValue / (numLabels - 1);

    return Array.from({ length: numLabels }, (_, i) => ({
      value: i * interval,
      label: i === 0 ? "AED 0" : formatCurrency(i * interval),
    }));
  };

  const yAxisLabels = getYAxisLabels();

  return (
    <div
      style={{
        backgroundColor: "white",
        padding: "20px",
        borderRadius: "15px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "10px",
        }}
      >
        {/* Project Name */}
        <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "600" }}>
          {data.project_name}
        </h3>

        {/* Time Period Dropdown */}
        <div style={{ position: "relative" }}>
          <select
            value={filter}
            onChange={(e) => setFilter(Number(e.target.value))}
            style={{
              padding: "8px 35px 8px 12px",
              borderRadius: "50px",
              border: "1px solid rgba(223, 223, 223, 1)",
              backgroundColor: "white",
              cursor: "pointer",
              fontSize: "13px",
              appearance: "none",
              WebkitAppearance: "none",
              MozAppearance: "none",
            }}
          >
            <option value={365}>1 Year</option>
            <option value={180}>6 Months</option>
            <option value={90}>3 Months</option>
            <option value={30}>1 Month</option>
          </select>
          <img
            src={downArrowIcon}
            alt="dropdown"
            style={{
              position: "absolute",
              right: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "none",
              width: "10px",
              height: "10px",
            }}
          />
        </div>
      </div>

      {/* Budget Info */}
      <div style={{ marginBottom: "20px" }}>
        {data.has_limit && (
          <div
            style={{
              fontSize: "11px",
              color: "#999",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            LIMIT BUDGET {formatCurrency(data.limit_budget!)}
          </div>
        )}
        <div
          style={{
            fontSize: "11px",
            color: "#666",
            marginTop: "4px",
          }}
        >
          Allocated: {formatCurrency(data.total_allocated_budget)}
          {data.percentage_used !== null && ` (${data.percentage_used}%)`}
        </div>
      </div>

      {/* SVG Chart */}
      <svg
        width={chartWidth}
        height={chartHeight}
        style={{ overflow: "visible" }}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setMousePosition({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
          });
        }}
        onMouseLeave={() => setHoveredPoint(null)}
      >
        {/* Y Axis Labels */}
        {yAxisLabels.map((label, index) => {
          const y =
            padding.top + graphHeight - (label.value - minValue) * yScale;
          return (
            <g key={index}>
              <text
                x={padding.left - 10}
                y={y}
                textAnchor="end"
                fontSize="11"
                fill="#999"
                dominantBaseline="middle"
              >
                {label.label}
              </text>
              <line
                x1={padding.left}
                y1={y}
                x2={padding.left + graphWidth}
                y2={y}
                stroke="#f0f0f0"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
            </g>
          );
        })}

        {/* Limit Budget Line (only if has limit) */}
        {limitY !== null && (
          <line
            x1={padding.left}
            y1={limitY}
            x2={padding.left + graphWidth}
            y2={limitY}
            stroke="#ddd"
            strokeWidth="2"
            strokeDasharray="8 4"
          />
        )}

        {/* Area under the line */}
        <path d={areaPath} fill="rgba(139, 195, 74, 0.15)" />

        {/* Line */}
        <path d={linePath} fill="none" stroke="#8BC34A" strokeWidth="3" />

        {/* Data points */}
        {aggregatedData.map((point, index) => {
          const x = padding.left + index * xScale;
          const y =
            padding.top + graphHeight - (point.allocated - minValue) * yScale;
          const isHovered = hoveredPoint?.date === point.date;

          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r={isHovered ? 7 : 5}
              fill={isHovered ? "#8BC34A" : "white"}
              stroke="#8BC34A"
              strokeWidth="2"
              style={{ cursor: "pointer" }}
              onMouseEnter={() => setHoveredPoint(point)}
            />
          );
        })}

        {/* X Axis Labels */}
        {xAxisLabels.map((label, index) => (
          <text
            key={index}
            x={label.position}
            y={padding.top + graphHeight + 25}
            textAnchor="middle"
            fontSize="12"
            fill="#999"
          >
            {label.date}
          </text>
        ))}

        {/* Tooltip */}
        {hoveredPoint && (
          <g>
            <rect
              x={mousePosition.x - 90}
              y={mousePosition.y - 55}
              width="180"
              height="45"
              fill="black"
              rx="8"
            />
            <text
              x={mousePosition.x}
              y={mousePosition.y - 35}
              textAnchor="middle"
              fontSize="11"
              fill="white"
              fontWeight="500"
            >
              {new Date(hoveredPoint.date).toLocaleDateString("en-US", {
                month: "short",
                day: filter <= 90 ? "numeric" : undefined,
                year: "numeric",
              })}
            </text>
            <text
              x={mousePosition.x}
              y={mousePosition.y - 18}
              textAnchor="middle"
              fontSize="14"
              fill="white"
              fontWeight="bold"
            >
              {formatCurrency(hoveredPoint.allocated)}
            </text>
            <polygon
              points={`${mousePosition.x},${mousePosition.y - 10} ${
                mousePosition.x - 5
              },${mousePosition.y - 15} ${mousePosition.x + 5},${
                mousePosition.y - 15
              }`}
              fill="black"
            />
          </g>
        )}
      </svg>
    </div>
  );
}
