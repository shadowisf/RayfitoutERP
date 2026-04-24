"use client";

import { useEffect, useState } from "react";

function formatAED(val: number): string {
  return val.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function FinanceOutstandingPayablesWidget() {
  const [amount, setAmount] = useState<number>(0);
  const [lpoCount, setLpoCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/dashboard/finance/getFinancialOutstandingPayables`,
    )
      .then((res) => res.json())
      .then((d) => {
        setAmount(Number(d?.amount ?? 0));
        setLpoCount(Number(d?.lpo_count ?? 0));
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
        Outstanding Payables
      </p>
      <p
        style={{
          fontSize: "22px",
          fontWeight: 700,
          margin: 0,
          color: "rgba(20,20,20,1)",
        }}
      >
        {isLoading ? "..." : `${formatAED(amount)} AED`}
      </p>
      <p
        style={{
          fontSize: "11px",
          color: "rgba(150,150,150,1)",
          marginTop: "6px",
        }}
      >
        Based on {isLoading ? "—" : lpoCount} LPOs (including credit)
      </p>
    </div>
  );
}
