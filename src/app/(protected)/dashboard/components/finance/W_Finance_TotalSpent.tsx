"use client";

import { useEffect, useState } from "react";

function formatMillions(val: number): string {
  if (val >= 1_000_000) {
    const m = val / 1_000_000;
    return `${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  if (val >= 1_000) {
    const k = val / 1_000;
    return `${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}K`;
  }
  return val.toLocaleString("en-US");
}

export default function FinanceTotalSpentWidget() {
  const [totalSpent, setTotalSpent] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/dashboard/finance/getFinancialTotalSpent`,
    )
      .then((res) => res.json())
      .then((d) => setTotalSpent(Number(d?.total_spent ?? 0)))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div
      style={{
        backgroundColor: "rgba(12, 143, 87, 1)",
        borderRadius: "12px",
        padding: "28px 32px",
        color: "white",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: "180px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <span
          style={{
            fontSize: "13px",
            fontWeight: 600,
            opacity: 0.85,
            letterSpacing: "0.05em",
          }}
        >
          Total Spent
        </span>
        <img
          src="/icons/spent-inverted.svg"
          alt="spent"
          style={{ width: "22px", opacity: 0.85 }}
        />
      </div>

      <div>
        <p
          style={{
            fontSize: "40px",
            fontWeight: 800,
            margin: 0,
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
          }}
        >
          {isLoading ? "..." : formatMillions(totalSpent)}{" "}
          <span style={{ fontSize: "20px", fontWeight: 500 }}>AED</span>
        </p>
        <p style={{ fontSize: "12px", opacity: 0.75, marginTop: "8px" }}>
          Total value of all active and completed LPOs
        </p>
      </div>
    </div>
  );
}
