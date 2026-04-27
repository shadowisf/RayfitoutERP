"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

type ChartRow = Record<string, string | number>;

interface SpendingData {
  projects: string[];
  chartData: ChartRow[];
}

const PROJECT_COLORS = [
  "#0C8F57",
  "#6366F1",
  "#F59E0B",
  "#EF4444",
  "#3B82F6",
  "#EC4899",
  "#14B8A6",
  "#8B5CF6",
  "#F97316",
  "#84CC16",
];

function formatAEDShort(val: number): string {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(0)}K`;
  return val.toLocaleString("en-US");
}

function formatAEDFull(val: number): string {
  return val.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;

  const entries = payload.filter((p: any) => p.value > 0);
  if (!entries.length) return null;

  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: "12px",
        padding: "12px 16px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
        border: "1px solid rgba(230,230,230,1)",
        minWidth: "180px",
      }}
    >
      <p
        style={{
          fontSize: "11px",
          fontWeight: 700,
          color: "rgba(100,100,100,1)",
          marginBottom: "8px",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </p>
      {entries.map((entry: any) => (
        <div
          key={entry.dataKey}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "4px",
          }}
        >
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: entry.color,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: "11px",
              color: "rgba(60,60,60,1)",
              flex: 1,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: "140px",
            }}
          >
            {entry.dataKey}
          </span>
          <span
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: "rgba(20,20,20,1)",
              whiteSpace: "nowrap",
            }}
          >
            {formatAEDFull(entry.value)} AED
          </span>
        </div>
      ))}
    </div>
  );
};

const CustomLegend = ({
  projects,
  colors,
  activeProject,
  onToggle,
}: {
  projects: string[];
  colors: string[];
  activeProject: string | null;
  onToggle: (p: string) => void;
}) => (
  <div
    style={{
      display: "flex",
      flexWrap: "wrap",
      gap: "12px",
      marginTop: "16px",
    }}
  >
    {projects.map((project, i) => {
      const isActive = activeProject === null || activeProject === project;
      return (
        <button
          key={project}
          onClick={() => onToggle(project)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "4px 8px",
            borderRadius: "20px",
            backgroundColor: isActive ? "rgba(240,242,245,1)" : "transparent",
            opacity: isActive ? 1 : 0.4,
            transition: "opacity 0.15s, background-color 0.15s",
          }}
        >
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: colors[i % colors.length],
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: "rgba(60,60,60,1)",
              whiteSpace: "nowrap",
            }}
          >
            {project}
          </span>
        </button>
      );
    })}
  </div>
);

export default function FinanceSpendingByProjectWidget() {
  const [data, setData] = useState<SpendingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeProject, setActiveProject] = useState<string | null>(null);

  useEffect(() => {
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/dashboard/finance/getFinancialSpendingByProject`,
    )
      .then((res) => res.json())
      .then((d) => setData(d))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const handleToggle = (project: string) => {
    setActiveProject((prev) => (prev === project ? null : project));
  };

  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: "15px",
        padding: "28px 32px",
        marginTop: "16px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
        }}
      >
        <div>
          <p
            style={{
              fontSize: "14px",
              fontWeight: 700,
              color: "rgba(20,20,20,1)",
              margin: 0,
            }}
          >
            Total Spent by Project
          </p>
          <p
            style={{
              fontSize: "11px",
              color: "rgba(120,120,120,1)",
              margin: "4px 0 0",
            }}
          >
            Monthly breakdown — last 12 months
          </p>
        </div>
      </div>

      {/* Chart */}
      {isLoading ? (
        <div
          style={{
            height: "260px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgba(150,150,150,1)",
            fontSize: "13px",
          }}
        >
          Loading...
        </div>
      ) : !data?.chartData?.length ? (
        <div
          style={{
            height: "260px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgba(150,150,150,1)",
            fontSize: "13px",
          }}
        >
          No spending data available
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart
              data={data.chartData}
              margin={{ top: 8, right: 8, left: 8, bottom: 4 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(230,230,230,1)"
                vertical={false}
              />
              <XAxis
                dataKey="month"
                tick={{
                  fontSize: 11,
                  fontWeight: 600,
                  fill: "rgba(120,120,120,1)",
                }}
                tickLine={false}
                axisLine={{ stroke: "rgba(230,230,230,1)" }}
              />
              <YAxis
                tickFormatter={formatAEDShort}
                tick={{
                  fontSize: 10,
                  fontWeight: 500,
                  fill: "rgba(150,150,150,1)",
                }}
                tickLine={false}
                axisLine={false}
                width={52}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{
                  stroke: "rgba(180,180,180,0.4)",
                  strokeWidth: 1,
                  strokeDasharray: "4 2",
                }}
              />
              {data.projects.map((project, i) => (
                <Line
                  key={project}
                  type="monotone"
                  dataKey={project}
                  stroke={PROJECT_COLORS[i % PROJECT_COLORS.length]}
                  strokeWidth={
                    activeProject === null || activeProject === project ? 2 : 1
                  }
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  opacity={
                    activeProject === null || activeProject === project
                      ? 1
                      : 0.2
                  }
                />
              ))}
            </LineChart>
          </ResponsiveContainer>

          {/* Legend */}
          {data.projects.length > 0 && (
            <CustomLegend
              projects={data.projects}
              colors={PROJECT_COLORS}
              activeProject={activeProject}
              onToggle={handleToggle}
            />
          )}
        </>
      )}
    </div>
  );
}
