"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

// ─────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────
type ChartRow = Record<string, string | number>;
interface TableRow {
  project: string;
  total: number;
}
interface SpendingData {
  projects: string[];
  project_budgets: Record<string, number>;
  chartData: ChartRow[];
  table_data: TableRow[];
  granularity: "daily" | "monthly";
}

// ─────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────
const LINE_COLOR = "rgba(137, 168, 27, 1)";
const MON_SHORT = [
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
const MON_FULL = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const DOW_LABELS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const PRESETS = [
  "Past 2 Days",
  "Last 7 Days",
  "Last 30 Days",
  "Last 60 Days",
  "Last 90 Days",
  "Previous Month",
  "All time",
];

// ─────────────────────────────────────────────────
// Date helpers
// ─────────────────────────────────────────────────
function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}
function endOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
}
function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function toISO(d: Date): string {
  return d.toISOString().split("T")[0];
}

function getPresetRange(label: string): [Date | null, Date | null] {
  const today = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());
  switch (label) {
    case "Past 2 Days":
      return [new Date(today.getTime() - 86_400_000), todayEnd];
    case "Last 7 Days":
      return [new Date(today.getTime() - 6 * 86_400_000), todayEnd];
    case "Last 30 Days":
      return [new Date(today.getTime() - 29 * 86_400_000), todayEnd];
    case "Last 60 Days":
      return [new Date(today.getTime() - 59 * 86_400_000), todayEnd];
    case "Last 90 Days":
      return [new Date(today.getTime() - 89 * 86_400_000), todayEnd];
    case "Previous Month": {
      const d = new Date();
      return [
        startOfDay(new Date(d.getFullYear(), d.getMonth() - 1, 1)),
        endOfDay(new Date(d.getFullYear(), d.getMonth(), 0)),
      ];
    }
    default:
      return [null, null]; // All time
  }
}

function formatRangeLabel(
  start: Date | null,
  end: Date | null,
  preset: string | null,
): string {
  if (preset) return preset;
  if (!start) return "All time";
  const fmt = (d: Date) =>
    `${d.getDate()} ${MON_SHORT[d.getMonth()]} ${d.getFullYear()}`;
  return end && !isSameDay(start, end)
    ? `${fmt(start)} – ${fmt(end)}`
    : fmt(start);
}

function formatAEDShort(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return v.toLocaleString("en-US");
}
function formatAEDFull(v: number): string {
  return v.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ─────────────────────────────────────────────────
// Budget Limit Pill Label
// ─────────────────────────────────────────────────
const BudgetLabel = (props: any) => {
  const { viewBox, budget } = props;
  if (!viewBox) return null;
  const { x, y } = viewBox;
  const text = `BUDGET LIMIT AED ${formatAEDShort(budget)}`;
  const charW = 6.2;
  const padH = 10;
  const rectW = text.length * charW + padH * 2;
  const rectH = 18;
  return (
    <g>
      <rect
        x={x + 4}
        y={y - rectH / 2}
        width={rectW}
        height={rectH}
        rx={9}
        fill="rgba(235,235,235,1)"
      />
      <text
        x={x + 4 + rectW / 2}
        y={y + 4.5}
        textAnchor="middle"
        fontSize={9.5}
        fontWeight={600}
        fill="rgba(110,110,110,1)"
      >
        {text}
      </text>
    </g>
  );
};

// ─────────────────────────────────────────────────
// Custom Tooltip
// ─────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        backgroundColor: "rgba(20,20,20,1)",
        padding: "12px 16px",
        borderRadius: 10,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "rgba(180,180,180,1)",
          marginBottom: 4,
          fontWeight: 400,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 16, color: "white", fontWeight: 600 }}>
        AED {formatAEDFull(Number(payload[0]?.value ?? 0))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────
// CalendarMonth
// ─────────────────────────────────────────────────
interface CalMonthProps {
  showPrev?: boolean;
  showNext?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  year: number;
  month: number;
  pendingStart: Date | null;
  pendingEnd: Date | null;
  hoverDate: Date | null;
  onDayClick: (d: Date) => void;
  onDayHover: (d: Date) => void;
}
function CalendarMonth({
  year,
  month,
  pendingStart,
  pendingEnd,
  hoverDate,
  onDayClick,
  onDayHover,
  showPrev,
  showNext,
  onPrev,
  onNext,
}: CalMonthProps) {
  const today = startOfDay(new Date());
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay();
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const effectiveEnd = pendingEnd || hoverDate;

  return (
    <div style={{ width: 224 }}>
      {/* Month header row — arrows occupy col 1 (Sun) / col 7 (Sat) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 32px)",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        {/* Left arrow (col 1 = Sunday) */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          {showPrev && (
            <button
              onClick={onPrev}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 18,
                color: "rgba(80,80,80,1)",
                padding: 0,
                lineHeight: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 32,
                height: 32,
              }}
            >
              ‹
            </button>
          )}
        </div>

        {/* Month + year title spanning cols 2–6 */}
        <div
          style={{
            gridColumn: "2 / 7",
            textAlign: "center",
            fontWeight: 600,
            fontSize: 14,
            color: "rgba(20,20,20,1)",
          }}
        >
          {MON_FULL[month]} {year}
        </div>

        {/* Right arrow (col 7 = Saturday) */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          {showNext && (
            <button
              onClick={onNext}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 18,
                color: "rgba(80,80,80,1)",
                padding: 0,
                lineHeight: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 32,
                height: 32,
              }}
            >
              ›
            </button>
          )}
        </div>
      </div>

      {/* Weekday labels */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 32px)",
          marginBottom: 18,
        }}
      >
        {DOW_LABELS.map((d) => (
          <div
            key={d}
            style={{
              textAlign: "center",
              fontSize: 9,
              color: "#aaa",
              fontWeight: 400,
              padding: "2px 0",
            }}
          >
            {d}
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 32px)" }}>
        {cells.map((day, i) => {
          if (!day) return <div key={i} style={{ height: 32 }} />;
          const date = new Date(year, month, day, 12, 0, 0);
          const isFuture = startOfDay(date) > today;
          const isStart = pendingStart ? isSameDay(date, pendingStart) : false;
          const isEnd = pendingEnd ? isSameDay(date, pendingEnd) : false;
          const isHover =
            !pendingEnd && hoverDate ? isSameDay(date, hoverDate) : false;
          const inRange =
            pendingStart &&
            effectiveEnd &&
            date > pendingStart &&
            date < effectiveEnd;
          const hasRange = Boolean(
            pendingStart &&
            effectiveEnd &&
            !isSameDay(pendingStart, effectiveEnd),
          );

          let bandBg = "transparent";
          if (!isFuture) {
            if (isStart && hasRange)
              bandBg =
                "linear-gradient(to right, transparent 50%, rgba(0,0,0,0.06) 50%)";
            else if (
              (isEnd || isHover) &&
              pendingStart &&
              !isSameDay(date, pendingStart)
            )
              bandBg =
                "linear-gradient(to left, transparent 50%, rgba(0,0,0,0.06) 50%)";
            else if (inRange) bandBg = "rgba(0,0,0,0.06)";
          }

          const isSelected =
            !isFuture && (isStart || isEnd || (isHover && Boolean(pendingStart)));

          return (
            <div
              key={i}
              style={{
                background: bandBg,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: 32,
                cursor: isFuture ? "default" : "pointer",
                opacity: isFuture ? 0.5 : 1,
              }}
              onClick={() => !isFuture && onDayClick(date)}
              onMouseEnter={() => !isFuture && onDayHover(date)}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  backgroundColor: isSelected
                    ? "rgba(20,20,20,1)"
                    : "transparent",
                  color: isSelected ? "white" : "rgba(20,20,20,1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  fontWeight: isSelected ? 700 : 400,
                  transition: "background-color 0.1s",
                }}
              >
                {day}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// DateRangePicker
// ─────────────────────────────────────────────────
interface DateRangePickerProps {
  initialStart: Date | null;
  initialEnd: Date | null;
  onApply: (
    start: Date | null,
    end: Date | null,
    preset: string | null,
  ) => void;
  onClose: () => void;
}
function DateRangePicker({
  initialStart,
  initialEnd,
  onApply,
  onClose,
}: DateRangePickerProps) {
  const [pendingStart, setPendingStart] = useState<Date | null>(initialStart);
  const [pendingEnd, setPendingEnd] = useState<Date | null>(initialEnd);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const initLeft = useMemo(() => {
    const base = initialStart || new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  }, []);
  const [leftMonthDate, setLeftMonthDate] = useState<Date>(initLeft);

  const rightMonthDate = new Date(
    leftMonthDate.getFullYear(),
    leftMonthDate.getMonth() + 1,
    1,
  );

  const handlePrev = () =>
    setLeftMonthDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const handleNext = () =>
    setLeftMonthDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const handleDayClick = (date: Date) => {
    setActivePreset(null);
    if (!pendingStart || (pendingStart && pendingEnd)) {
      setPendingStart(startOfDay(date));
      setPendingEnd(null);
    } else {
      if (date >= pendingStart) {
        setPendingEnd(endOfDay(date));
      } else {
        setPendingStart(startOfDay(date));
        setPendingEnd(null);
      }
    }
  };

  const handlePreset = (label: string) => {
    setActivePreset(label);
    const [s, e] = getPresetRange(label);
    setPendingStart(s);
    setPendingEnd(e);
    setHoverDate(null);
    const base = s || new Date();
    setLeftMonthDate(new Date(base.getFullYear(), base.getMonth(), 1));
  };

  const handleReset = () => {
    setActivePreset("All time");
    setPendingStart(null);
    setPendingEnd(null);
  };

  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: 12,
        boxShadow: "0 8px 32px rgba(0,0,0,0.16)",
        border: "1px solid rgba(220,220,220,1)",
        display: "flex",
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      {/* Calendars */}
      <div style={{ padding: "24px 28px" }}>
        <div
          style={{ display: "flex", gap: 36 }}
          onMouseLeave={() => setHoverDate(null)}
        >
          <CalendarMonth
            year={leftMonthDate.getFullYear()}
            month={leftMonthDate.getMonth()}
            pendingStart={pendingStart}
            pendingEnd={pendingEnd}
            hoverDate={hoverDate}
            onDayClick={handleDayClick}
            onDayHover={setHoverDate}
            showPrev
            onPrev={handlePrev}
          />
          <CalendarMonth
            year={rightMonthDate.getFullYear()}
            month={rightMonthDate.getMonth()}
            pendingStart={pendingStart}
            pendingEnd={pendingEnd}
            hoverDate={hoverDate}
            onDayClick={handleDayClick}
            onDayHover={setHoverDate}
            showNext
            onNext={handleNext}
          />
        </div>
      </div>

      {/* Presets sidebar + RESET/APPLY at the bottom */}
      <div
        style={{
          width: 250,
          borderLeft: "1px solid rgba(235,235,235,1)",
          padding: "20px 0 16px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          {PRESETS.map((preset) => (
            <button
              key={preset}
              onClick={() => handlePreset(preset)}
              style={{
                background:
                  activePreset === preset ? "rgba(245,245,245,1)" : "none",
                border: "none",
                cursor: "pointer",
                padding: "10px 20px",
                textAlign: "left",
                fontSize: 13,
                color: "rgba(30,30,30,1)",
                fontWeight: activePreset === preset ? 600 : 400,
              }}
            >
              {preset}
            </button>
          ))}
        </div>

        <br />

        {/* RESET / APPLY */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            gap: 8,
            padding: "12px 12px 0",
          }}
        >
          <button
            onClick={handleReset}
            style={{
              flex: 1,
              padding: "8px 0",
              borderRadius: 6,
              border: "1px solid black",
              backgroundColor: "white",
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 600,
              color: "rgba(40,40,40,1)",
            }}
          >
            RESET
          </button>
          <button
            onClick={() => onApply(pendingStart, pendingEnd, activePreset)}
            style={{
              flex: 1,
              padding: "8px 0",
              borderRadius: 6,
              border: "none",
              backgroundColor: "rgba(20,20,20,1)",
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 600,
              color: "white",
            }}
          >
            APPLY
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// ProjectsTable
// ─────────────────────────────────────────────────
function ProjectsTable({
  data,
  isLoading,
}: {
  data: TableRow[];
  isLoading: boolean;
}) {
  const [sortKey, setSortKey] = useState<"total" | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const handleSort = (key: "total") => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("desc");
    } else if (sortDir === "desc") {
      setSortDir("asc");
    } else {
      setSortKey(null);
      setSortDir("desc");
    }
  };

  const sorted = useMemo(() => {
    // Always pin Unspecified last
    const rest = data.filter((d) => d.project !== "Unspecified");
    const unspecified = data.filter((d) => d.project === "Unspecified");
    if (!sortKey) return [...rest, ...unspecified];
    const mul = sortDir === "asc" ? 1 : -1;
    return [...rest.sort((a, b) => mul * (a.total - b.total)), ...unspecified];
  }, [data, sortKey, sortDir]);

  return (
    <div
      style={{
        width: 500,
        flexShrink: 0,
        paddingLeft: 24,
      }}
    >
      {isLoading ? (
        <p style={{ fontSize: 12, color: "#999" }}>Loading…</p>
      ) : (
        <table
          style={{
            width: "100%",
            borderCollapse: "separate",
            borderSpacing: 0,
            fontSize: 11,
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  textAlign: "left",
                  padding: "9px 12px",
                  fontWeight: 700,
                  fontSize: 10,
                  backgroundColor: "rgba(245,246,248,1)",
                  borderRadius: "50px 0 0 50px",
                  whiteSpace: "nowrap",
                }}
              >
                PROJECT
              </th>
              <th
                onClick={() => handleSort("total")}
                style={{
                  textAlign: "left",
                  padding: "9px 12px",
                  fontWeight: 700,
                  fontSize: 10,
                  whiteSpace: "nowrap",
                  backgroundColor: "rgba(245,246,248,1)",
                  borderRadius: "0 50px 50px 0",
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                COMMITTED + CASH
                <span style={{ marginLeft: 4, fontSize: 9, opacity: sortKey === "total" ? 1 : 0.35 }}>
                  {sortKey === "total" ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => {
              const isAlt = i % 2 !== 0;
              const altBg = isAlt ? "rgba(249, 249, 249, 1)" : undefined;
              return (
                <tr key={i}>
                  <td
                    style={{
                      padding: "10px 12px",
                      color: "rgba(30,30,30,1)",
                      maxWidth: 180,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontSize: 12,
                      backgroundColor: altBg,
                      borderRadius: isAlt ? "50px 0 0 50px" : undefined,
                    }}
                  >
                    {row.project}
                  </td>
                  <td
                    style={{
                      padding: "10px 12px",
                      color: "rgba(20,20,20,1)",
                      whiteSpace: "nowrap",
                      fontSize: 12,
                      backgroundColor: altBg,
                      borderRadius: isAlt ? "0 50px 50px 0" : undefined,
                    }}
                  >
                    AED {formatAEDFull(row.total)}
                  </td>
                </tr>
              );
            })}
            {!data.length && (
              <tr>
                <td
                  colSpan={3}
                  style={{
                    padding: "20px 6px",
                    textAlign: "center",
                    color: "#aaa",
                    fontSize: 12,
                  }}
                >
                  No data
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────
export default function FinanceSpendingByProjectWidget() {
  const [data, setData] = useState<SpendingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [appliedStart, setAppliedStart] = useState<Date | null>(null);
  const [appliedEnd, setAppliedEnd] = useState<Date | null>(null);
  const [appliedPreset, setAppliedPreset] = useState<string | null>("All time");
  const [pickerOpen, setPickerOpen] = useState(false);

  const pickerWrapRef = useRef<HTMLDivElement>(null);

  // Close picker on outside click
  useEffect(() => {
    if (!pickerOpen) return;
    const handle = (e: MouseEvent) => {
      if (
        pickerWrapRef.current &&
        !pickerWrapRef.current.contains(e.target as Node)
      )
        setPickerOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [pickerOpen]);

  // Build query string (changes trigger re-fetch)
  const queryStr = useMemo(() => {
    const p = new URLSearchParams();
    if (appliedStart) p.set("startDate", toISO(appliedStart));
    if (appliedEnd) p.set("endDate", toISO(appliedEnd));
    return p.toString();
  }, [appliedStart, appliedEnd]);

  useEffect(() => {
    setIsLoading(true);
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/dashboard/finance/getFinancialSpendingByProject?${queryStr}`,
    )
      .then((r) => r.json())
      .then((d: SpendingData) => {
        setData(d);
        setSelectedProject((prev) =>
          d.projects?.length > 0
            ? d.projects.includes(prev)
              ? prev
              : d.projects[0]
            : "",
        );
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [queryStr]);

  const chartData = useMemo(
    () =>
      data?.chartData?.map((row) => ({
        month: row.month as string,
        value: Number(row[selectedProject] ?? 0),
      })) ?? [],
    [data, selectedProject],
  );

  const budget = selectedProject
    ? (data?.project_budgets?.[selectedProject] ?? 0)
    : 0;

  // Ensure Y-axis always reaches the budget line when it's above the data
  const yAxisMax = useMemo(() => {
    const dataMax = chartData.length
      ? Math.max(...chartData.map((r) => r.value as number))
      : 0;
    const ceiling = Math.max(dataMax, budget);
    return ceiling > 0 ? Math.ceil(ceiling * 1.15) : undefined;
  }, [chartData, budget]);

  const rangeLabel = formatRangeLabel(appliedStart, appliedEnd, appliedPreset);

  const handleApply = (
    start: Date | null,
    end: Date | null,
    preset: string | null,
  ) => {
    setAppliedStart(start);
    setAppliedEnd(end);
    setAppliedPreset(preset);
    setPickerOpen(false);
  };

  return (
    <>
      {/* ── Outside the card: h2 + date filter (space-between) ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <h2 style={{ margin: 0 }}>Top Projects By Spend</h2>

        <div style={{ position: "relative" }} ref={pickerWrapRef}>
          <button
            onClick={() => setPickerOpen((v) => !v)}
            style={{
              padding: "7px 14px",
              borderRadius: 50,
              border: "1px solid rgba(223,223,223,1)",
              backgroundColor: "white",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
              color: "rgba(40,40,40,1)",
              display: "flex",
              alignItems: "center",
              gap: 7,
            }}
          >
            {rangeLabel}
            <img
              src="/icons/calendar.svg"
              alt="calendar"
              style={{ width: 13, height: 13, opacity: 0.5 }}
            />
          </button>

          {pickerOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                right: 0,
                zIndex: 300,
              }}
            >
              <DateRangePicker
                initialStart={appliedStart}
                initialEnd={appliedEnd}
                onApply={handleApply}
                onClose={() => setPickerOpen(false)}
              />
            </div>
          )}
        </div>
      </div>
      {/* ── White card ── */}
      <div
        style={{
          backgroundColor: "white",
          borderRadius: 15,
          padding: "28px 32px",
        }}
      >
        {/* Project dropdown */}
        <div style={{ marginBottom: 16 }}>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            disabled={isLoading || !data?.projects?.length}
            style={{
              padding: "7px 14px",
              borderRadius: 50,
              border: "none",
              backgroundColor: "white",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              color: "rgba(40,40,40,1)",
              width: "auto",
            }}
          >
            {data?.projects?.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* Body: chart + table */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 0 }}>
          {/* Chart */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {isLoading ? (
              <div
                style={{
                  height: 300,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#999",
                  fontSize: 13,
                }}
              >
                Loading…
              </div>
            ) : !chartData.length ? (
              <div
                style={{
                  height: 300,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#999",
                  fontSize: 13,
                }}
              >
                No spending data for this period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor={LINE_COLOR}
                        stopOpacity={0.18}
                      />
                      <stop
                        offset="100%"
                        stopColor={LINE_COLOR}
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                  </defs>

                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "#999" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={formatAEDShort}
                    tick={{ fontSize: 11, fill: "#999" }}
                    axisLine={false}
                    tickLine={false}
                    width={52}
                    domain={[0, yAxisMax ?? "auto"]}
                  />
                  <Tooltip content={<CustomTooltip />} />

                  {budget > 0 && (
                    <ReferenceLine
                      y={budget}
                      stroke="rgba(190,190,190,1)"
                      strokeDasharray="6 4"
                      strokeWidth={1}
                      label={<BudgetLabel budget={budget} />}
                    />
                  )}

                  <Area
                    type="linear"
                    dataKey="value"
                    stroke={LINE_COLOR}
                    strokeWidth={2}
                    fill="url(#spendFill)"
                    dot={{ r: 7, fill: LINE_COLOR, strokeWidth: 0, opacity: 1 }}
                    activeDot={{
                      r: 9,
                      fill: LINE_COLOR,
                      strokeWidth: 2,
                      stroke: "#fff",
                      opacity: 1,
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Projects table */}
          <ProjectsTable data={data?.table_data ?? []} isLoading={isLoading} />
        </div>
      </div>{" "}
      {/* end white card */}
    </>
  );
}
