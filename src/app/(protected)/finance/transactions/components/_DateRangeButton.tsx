"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";

// ── Constants ─────────────────────────────────────────────────────────────────
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

// ── Helpers ───────────────────────────────────────────────────────────────────
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
      return [null, null];
  }
}

export function formatRangeLabel(
  start: Date | null,
  end: Date | null,
  preset: string | null,
): string {
  if (preset && preset !== "All time") return preset;
  if (!start) return "All time";
  const fmt = (d: Date) =>
    `${d.getDate()} ${MON_SHORT[d.getMonth()]} ${d.getFullYear()}`;
  return end && !isSameDay(start, end)
    ? `${fmt(start)} – ${fmt(end)}`
    : fmt(start);
}

// ── CalendarMonth ─────────────────────────────────────────────────────────────
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
}: {
  year: number;
  month: number;
  pendingStart: Date | null;
  pendingEnd: Date | null;
  hoverDate: Date | null;
  onDayClick: (d: Date) => void;
  onDayHover: (d: Date) => void;
  showPrev?: boolean;
  showNext?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
}) {
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
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 32px)",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
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

// ── DateRangePicker ───────────────────────────────────────────────────────────
function DateRangePicker({
  initialStart,
  initialEnd,
  initialPreset,
  onApply,
  onClose,
}: {
  initialStart: Date | null;
  initialEnd: Date | null;
  initialPreset: string | null;
  onApply: (
    start: Date | null,
    end: Date | null,
    preset: string | null,
  ) => void;
  onClose: () => void;
}) {
  const [pendingStart, setPendingStart] = useState<Date | null>(initialStart);
  const [pendingEnd, setPendingEnd] = useState<Date | null>(initialEnd);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [activePreset, setActivePreset] = useState<string | null>(
    initialPreset,
  );

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
      if (date >= pendingStart) setPendingEnd(endOfDay(date));
      else {
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

      {/* Presets sidebar */}
      <div
        style={{
          width: 200,
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
            onClick={() => {
              setActivePreset("All time");
              setPendingStart(null);
              setPendingEnd(null);
            }}
            style={{
              flex: 1,
              padding: "8px 0",
              borderRadius: 6,
              border: "1px solid black",
              backgroundColor: "white",
              cursor: "pointer",
              color: "black",
              fontSize: 11,
              fontWeight: 600,
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

// ── DateRangeButton ───────────────────────────────────────────────────────────
export type DateRange = {
  start: Date | null;
  end: Date | null;
  preset: string | null;
};

export default function DateRangeButton({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (range: DateRange) => void;
}) {
  const calendarIcon = "/icons/calendar.svg";
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(
    null,
  );
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Calculate fixed position from button rect when opening
  const handleToggle = () => {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
    setOpen((o) => !o);
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node) &&
        pickerRef.current &&
        !pickerRef.current.contains(e.target as Node)
      )
        setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const label = formatRangeLabel(value.start, value.end, value.preset);

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleToggle}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "7px 14px",
          borderRadius: 50,
          border: "1px solid rgba(241,244,246,1)",
          backgroundColor: "white",
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 600,
          color: "black",
          whiteSpace: "nowrap",
        }}
      >
        {label}
        <img
          src={calendarIcon}
          alt="calendar"
          style={{ width: 14, height: 14, opacity: 0.5 }}
        />
      </button>

      {open &&
        coords &&
        createPortal(
          <div
            ref={pickerRef}
            style={{
              position: "fixed",
              top: coords.top,
              right: coords.right,
              zIndex: 9999,
            }}
          >
            <DateRangePicker
              initialStart={value.start}
              initialEnd={value.end}
              initialPreset={value.preset}
              onApply={(start, end, preset) => {
                onChange({ start, end, preset });
                setOpen(false);
              }}
              onClose={() => setOpen(false)}
            />
          </div>,
          document.body,
        )}
    </>
  );
}
