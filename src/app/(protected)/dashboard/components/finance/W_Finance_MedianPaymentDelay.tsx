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
        borderRadius: "12px",
        padding: "20px 24px",
        border: "1px solid rgba(230,230,230,1)",
        flex: 1,
      }}
    >
      <p
        style={{
          fontSize: "12px",
          fontWeight: 600,
          color: "rgba(120,120,120,1)",
          marginBottom: "8px",
          letterSpacing: "0.04em",
        }}
      >
        Median Payment Delay
      </p>
      <p
        style={{
          fontSize: "22px",
          fontWeight: 700,
          margin: 0,
          color: "rgba(20,20,20,1)",
        }}
      >
        {isLoading ? "..." : `${avgDays} Days`}
      </p>
      <p
        style={{
          fontSize: "11px",
          color: "rgba(150,150,150,1)",
          marginTop: "6px",
        }}
      >
        Based on {isLoading ? "—" : paidCount} paid LPOs
      </p>
    </div>
  );
}
