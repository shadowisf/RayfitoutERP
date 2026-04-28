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
        borderRadius: "15px",
        padding: "28px 32px",
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: "150px",
      }}
    >
      <span
        style={{
          fontSize: "13px",
          fontWeight: 600,
          color: "rgba(74, 85, 101, 1)",
        }}
      >
        Outstanding Payables
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
          {isLoading ? "..." : `${formatAED(amount)} AED`}
        </p>
        <p
          style={{
            fontSize: "11px",
            color: "rgba(74, 85, 101, 1)",
            marginTop: "8px",
            margin: 0,
          }}
        >
          Based on {isLoading ? "—" : lpoCount} LPOs (including credit)
        </p>
      </div>
    </div>
  );
}
