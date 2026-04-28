"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
        borderRadius: "15px",
        padding: "20px 24px",
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
        <p
          style={{
            fontWeight: 600,
            fontSize: "13px",
            color: "rgba(74, 85, 101, 1)",
            margin: 0,
          }}
        >
          Recent Transactions
        </p>
        <Link
          href="/finance/transactions"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "7px 14px",
            borderRadius: 50,
            border: "1px solid rgba(223,223,223,1)",
            backgroundColor: "white",
            fontSize: 12,
            fontWeight: 600,
            color: "rgba(30,30,30,1)",
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          VIEW FULL REPORT
          <span style={{ fontSize: 14, lineHeight: 1 }}>›</span>
        </Link>
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
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "rgba(245, 246, 248, 1)" }}>
              {[
                { label: "LPO", width: "15%" },
                { label: "VENDOR", width: "40%" },
                { label: "PAYMENT TYPE", width: "22%" },
                { label: "AMOUNT", width: "23%" },
              ].map(({ label, width }) => (
                <th
                  key={label}
                  style={{
                    textAlign: "left",
                    padding: "9px 12px",
                    fontSize: "10px",
                    fontWeight: 700,
                    width,
                  }}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx, i) => {
              return (
                <tr
                  key={i}
                  style={{
                    borderBottom: "1px solid rgba(243, 244, 246, 1)",
                  }}
                >
                  <td
                    style={{
                      padding: "10px 12px",
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "rgba(30,30,30,1)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {tx.display_id}
                  </td>
                  <td
                    style={{
                      padding: "10px 12px",
                      fontSize: "12px",
                      maxWidth: "0",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {tx.vendor_name}
                  </td>
                  <td
                    style={{
                      padding: "10px 12px",
                      fontSize: "12px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {tx.payment_type}
                  </td>
                  <td
                    style={{
                      padding: "10px 12px",
                      fontSize: "12px",
                      color: "rgba(30,30,30,1)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    AED {formatAED(tx.amount)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
