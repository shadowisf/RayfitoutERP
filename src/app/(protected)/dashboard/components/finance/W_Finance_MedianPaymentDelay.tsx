"use client";

import { useEffect, useState } from "react";

export default function FinanceMedianPaymentDelayWidget() {
  const [avgDays, setAvgDays] = useState<number>(0);
  const [paidCount, setPaidCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/dashboard/finance/getFinancialMedianPaymentDelay`,
    )
      .then((res) => res.json())
      .then((d) => {
        setAvgDays(Number(d?.avg_days ?? 0));
        setPaidCount(Number(d?.paid_count ?? 0));
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: "15px",
        padding: "28px 32px",
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: "180px",
      }}
    >
      <span
        style={{
          fontSize: "13px",
          fontWeight: 600,
          color: "rgba(74, 85, 101, 1)",
        }}
      >
        Median Payment Delay
      </span>

      <div>
        <p
          style={{
            fontSize: "28px",
            fontWeight: 600,
            margin: 0,
          }}
        >
          {isLoading ? "..." : `${avgDays} Days`}
        </p>
        <p
          style={{
            fontSize: "11px",
            color: "rgba(74, 85, 101, 1)",
            marginTop: "8px",
            margin: 0,
          }}
        >
          Based on {isLoading ? "—" : paidCount} paid LPOs
        </p>
      </div>
    </div>
  );
}
