"use client";

import { useEffect, useState } from "react";
import FinanceSpendingByProjectWidget from "./W_Finance_SpendingByProject";

type RecentTransaction = {
  display_id: string;
  vendor_name: string;
  payment_type: string;
  amount: number;
};

type FinancialData = {
  total_spent: number;
  outstanding_amount: number;
  outstanding_count: number;
  avg_payment_days: number;
  paid_count: number;
  recent_transactions: RecentTransaction[];
};

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

function formatAED(val: number): string {
  return val.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function FinancialOverviewWidget() {
  const [data, setData] = useState<FinancialData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/dashboard/finance/getFinancialOverview`,
    )
      .then((res) => res.json())
      .then((d) => setData(d))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div>
      <h2>Financial Overview</h2>
      <br />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1.2fr 2.2fr",
          gap: "16px",
          alignItems: "stretch",
        }}
      >
        {/* ── LEFT: Total Spent ── */}
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
              {isLoading ? "..." : formatMillions(data?.total_spent ?? 0)}{" "}
              <span style={{ fontSize: "20px", fontWeight: 500 }}>AED</span>
            </p>
            <p style={{ fontSize: "12px", opacity: 0.75, marginTop: "8px" }}>
              Represents the total amount spent from x - y
            </p>
          </div>
        </div>

        {/* ── MIDDLE: Outstanding Payables + Median Payment Delay ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Outstanding Payables */}
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
              {isLoading
                ? "..."
                : `${formatAED(data?.outstanding_amount ?? 0)} AED`}
            </p>
            <p
              style={{
                fontSize: "11px",
                color: "rgba(150,150,150,1)",
                marginTop: "6px",
              }}
            >
              Based on {isLoading ? "—" : (data?.outstanding_count ?? 0)} LPOs
              (including credit)
            </p>
          </div>

          {/* Median Payment Delay */}
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
              {isLoading ? "..." : `${data?.avg_payment_days ?? 0} Days`}
            </p>
            <p
              style={{
                fontSize: "11px",
                color: "rgba(150,150,150,1)",
                marginTop: "6px",
              }}
            >
              Based on {isLoading ? "—" : (data?.paid_count ?? 0)} LPOs
              (including credit)
            </p>
          </div>
        </div>

        {/* ── RIGHT: Recent Transaction ── */}
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "12px",
            padding: "20px 24px",
            border: "1px solid rgba(230,230,230,1)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <p style={{ fontWeight: 700, fontSize: "14px", margin: 0 }}>
              Recent Transaction
            </p>
            {/* <button style={{ fontSize: "12px", fontWeight: 600, background: "none", border: "none", cursor: "pointer", color: "rgba(80,80,80,1)" }}>
              VIEW FULL REPORT &gt;
            </button> */}
          </div>

          {isLoading ? (
            <p style={{ fontSize: "13px", color: "rgba(150,150,150,1)" }}>
              Loading...
            </p>
          ) : !data?.recent_transactions?.length ? (
            <p style={{ fontSize: "13px", color: "rgba(150,150,150,1)" }}>
              No transactions yet
            </p>
          ) : (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "12px",
              }}
            >
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(230,230,230,1)" }}>
                  {["LPO", "VENDOR", "PAYMENT TYPE", "AMOUNT"].map((col) => (
                    <th
                      key={col}
                      style={{
                        textAlign: "left",
                        padding: "6px 8px",
                        fontWeight: 700,
                        color: "rgba(100,100,100,1)",
                        fontSize: "11px",
                        letterSpacing: "0.04em",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.recent_transactions.map((tx, i) => (
                  <tr
                    key={i}
                    style={{
                      borderBottom: "1px solid rgba(245,245,245,1)",
                    }}
                  >
                    <td
                      style={{
                        padding: "8px 8px",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {tx.display_id}
                    </td>
                    <td
                      style={{
                        padding: "8px 8px",
                        color: "rgba(60,60,60,1)",
                        maxWidth: "140px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {tx.vendor_name}
                    </td>
                    <td
                      style={{ padding: "8px 8px", color: "rgba(80,80,80,1)" }}
                    >
                      {tx.payment_type}
                    </td>
                    <td
                      style={{
                        padding: "8px 8px",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatAED(tx.amount)} AED
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── BOTTOM: Spending by Project Chart ── */}
      <FinanceSpendingByProjectWidget />
    </div>
  );
}
