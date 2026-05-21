"use client";

import { useEffect, useRef, useState } from "react";
import Button from "@/app/components/Button";

// ── Formatters ────────────────────────────────────────────────────────────────

function formatMillions(val: number): string {
  if (val >= 1_000_000) {
    const m = val / 1_000_000;
    return `${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  if (val >= 1_000) {
    const k = val / 1_000;
    return `${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}K`;
  }
  return val.toLocaleString("en-GB");
}

function formatAEDFull(val: number): string {
  return val.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(raw: string | null): string {
  if (!raw) return "–";
  return new Date(raw).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ── Types ─────────────────────────────────────────────────────────────────────

type LpoRow = {
  mr_header_id: number;
  lpo_id: number;
  total: number;
  date: string;
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function FinanceCommittedSpentWidget() {
  const [committedTotal, setCommittedTotal] = useState<number>(0);
  const [lpoCount, setLpoCount] = useState<number>(0);
  const [oldestDate, setOldestDate] = useState<string | null>(null);
  const [latestDate, setLatestDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hover popup state
  const [showPopup, setShowPopup] = useState(false);
  const [lpoRows, setLpoRows] = useState<LpoRow[] | null>(null);
  const [lpoLoading, setLpoLoading] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<NodeJS.Timeout | null>(null);

  // ── Fetch summary ────────────────────────────────────────────────────────
  useEffect(() => {
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/dashboard/finance/getFinancialCommittedSpent`,
    )
      .then((res) => res.json())
      .then((d) => {
        setCommittedTotal(Number(d?.committed_total ?? 0));
        setLpoCount(Number(d?.lpo_count ?? 0));
        setOldestDate(d?.oldest_date ?? null);
        setLatestDate(d?.latest_date ?? null);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  // ── Close on blur ────────────────────────────────────────────────────────
  useEffect(() => {
    const close = () => setShowPopup(false);
    window.addEventListener("blur", close);
    return () => window.removeEventListener("blur", close);
  }, []);

  // ── Close on outside click ────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        widgetRef.current?.contains(e.target as Node) ||
        popupRef.current?.contains(e.target as Node)
      )
        return;
      setShowPopup(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Hide timer (grace period for cursor travel) ───────────────────────────
  const startHideTimer = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowPopup(false), 120);
  };

  const cancelHideTimer = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };

  // ── Lazy-fetch LPO rows on first hover ────────────────────────────────────
  const fetchLpos = () => {
    if (lpoRows !== null || lpoLoading) return;
    setLpoLoading(true);
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/dashboard/finance/getFinancialCommittedSpentLpos`,
    )
      .then((res) => res.json())
      .then((data) => setLpoRows(Array.isArray(data) ? data : []))
      .catch(() => setLpoRows([]))
      .finally(() => setLpoLoading(false));
  };

  const handleMouseEnter = () => {
    if (window.matchMedia("(max-width: 768px)").matches) return;
    cancelHideTimer();
    setShowPopup(true);
    fetchLpos();
  };

  const handleMouseLeave = () => startHideTimer();

  // ── Popup positioning — stationary, anchored to widget right/left ─────────
  const popupWidth = 520;

  const getPopupPosition = () => {
    if (!widgetRef.current) return { left: 10, top: 80 };
    const rect = widgetRef.current.getBoundingClientRect();
    const spaceRight = window.innerWidth - rect.right;
    const left =
      spaceRight >= popupWidth + 10
        ? rect.right + 10
        : rect.left - popupWidth - 10;
    return { left: Math.max(10, left), top: 80 };
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <div
        ref={widgetRef}
        style={{
          backgroundColor: "white",
          borderRadius: "15px",
          padding: "28px 32px",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          minHeight: "150px",
          cursor: "default",
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <span
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color: "rgba(74, 85, 101, 1)",
          }}
        >
          Unpaid + Paid
        </span>

        <div>
          <p
            style={{
              fontSize: "28px",
              fontWeight: 600,
              margin: 0,
              color: "rgba(20,20,20,1)",
            }}
          >
            {isLoading ? "..." : `${formatAEDFull(committedTotal)} AED`}
          </p>
          <p
            style={{
              fontSize: "11px",
              color: "rgba(74, 85, 101, 1)",
              marginTop: "8px",
              margin: 0,
            }}
          >
            {isLoading ? "—" : `Based on ${lpoCount} LPOs (including credit)`}
          </p>
        </div>
      </div>

      {/* ── Hover popup ─────────────────────────────────────────────────────── */}
      {showPopup && (
        <div
          ref={popupRef}
          onMouseEnter={cancelHideTimer}
          onMouseLeave={() => setShowPopup(false)}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            left: getPopupPosition().left,
            top: getPopupPosition().top,
            backgroundColor: "white",
            color: "black",
            border: "1px solid rgba(223,223,223,1)",
            borderRadius: "10px",
            padding: 0,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 10000,
            width: `${popupWidth}px`,
            maxHeight: "calc(100vh - 160px)",
            overflowY: "auto",
            pointerEvents: "auto",
            cursor: "default",
            userSelect: "text",
          }}
        >
          {lpoLoading ? (
            <div
              style={{
                textAlign: "center",
                color: "#888",
                fontSize: "13px",
                padding: "15px",
              }}
            >
              Loading...
            </div>
          ) : Array.isArray(lpoRows) && lpoRows.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                color: "#888",
                fontSize: "13px",
                padding: "15px",
              }}
            >
              No committed LPOs
            </div>
          ) : Array.isArray(lpoRows) ? (
            <div style={{ padding: "12px" }}>
              <table
                className="items-table popup-hover"
                style={{ width: "100%" }}
              >
                <thead>
                  <tr>
                    <th>LPO NUMBER</th>
                    <th>TOTAL PRICE</th>
                    <th>DATE</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {lpoRows.map((row, i) => (
                    <tr key={i}>
                      <td style={{ whiteSpace: "nowrap" }}>
                        LPO-{String(row.lpo_id).padStart(5, "0")}
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        AED {formatAEDFull(row.total)}
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>{row.date}</td>
                      <td>
                        <Button
                          componentType="link"
                          bgColor="rgba(239,239,239,1)"
                          borderColor="rgba(223,223,223,1)"
                          textColor="black"
                          style={{ padding: "7px 7px" }}
                          onClick={(e: React.MouseEvent) => e.stopPropagation()}
                          href={`/mr/${row.mr_header_id}/lpo/${row.lpo_id}`}
                        >
                          <img src="/icons/external-link.svg" alt="open" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      )}
    </>
  );
}
