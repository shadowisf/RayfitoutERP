"use client";

import { useEffect, useState } from "react";

type RecentTransaction = {
  display_id: string;
  vendor_name: string;
  payment_type: string;
  amount: number;
};

function formatAED(val: number): string {
  return val.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function FinanceRecentTransactionsWidget() {
  const [transactions, setTransactions] = useState<RecentTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/dashboard/finance/getFinancialRecentTransactions`,
    )
      .then((res) => res.json())
      .then((d) => setTransactions(d?.transactions ?? []))
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
          Recent Transactions
        </p>
      </div>

      {isLoading ? (
        <p style={{ fontSize: "13px", color: "rgba(150,150,150,1)" }}>
          Loading...
        </p>
      ) : !transactions.length ? (
        <p style={{ fontSize: "13px", color: "rgba(150,150,150,1)" }}>
          No transactions yet
        </p>
      ) : (
        <table
          style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}
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
            {transactions.map((tx, i) => (
              <tr
                key={i}
                style={{ borderBottom: "1px solid rgba(245,245,245,1)" }}
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
                <td style={{ padding: "8px 8px", color: "rgba(80,80,80,1)" }}>
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
  );
}
