"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Button from "@/app/components/Button";

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

type SortDir = "asc" | "desc";

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span style={{ marginLeft: 4, fontSize: 10, opacity: active ? 1 : 0.35 }}>
      {active ? (dir === "asc" ? "↑" : "↓") : "↕"}
    </span>
  );
}

export default function FinanceRecentTransactionsWidget() {
  const [transactions, setTransactions] = useState<RecentTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortKey, setSortKey] = useState<"amount" | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/dashboard/finance/getFinancialRecentTransactions`,
    )
      .then((res) => res.json())
      .then((d) => setTransactions(d?.transactions ?? []))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const handleSort = () => {
    if (sortKey !== "amount") {
      setSortKey("amount");
      setSortDir("desc");
    } else if (sortDir === "desc") {
      setSortDir("asc");
    } else {
      setSortKey(null);
      setSortDir("desc");
    }
  };

  const sorted = useMemo(() => {
    if (!sortKey) return [...transactions];
    const mul = sortDir === "asc" ? 1 : -1;
    return [...transactions].sort((a, b) => mul * (a.amount - b.amount));
  }, [transactions, sortKey, sortDir]);

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

        <Button
          componentType={"link"}
          href="/finance/transactions"
          bgColor={"white"}
          borderColor={"rgba(223,223,223,1)"}
          textColor={"black"}
          style={{ borderRadius: 50, fontSize: "12px" }}
        >
          VIEW FULL REPORT
          <span>›</span>
        </Button>
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
          style={{
            width: "100%",
            borderCollapse: "separate",
            borderSpacing: 0,
          }}
        >
          <thead>
            <tr>
              {[
                { label: "LPO", width: "15%" },
                { label: "VENDOR", width: "40%" },
                { label: "PAYMENT TYPE", width: "22%" },
              ].map(({ label, width }, index) => (
                <th
                  key={label}
                  style={{
                    textAlign: "left",
                    padding: "9px 12px",
                    fontSize: "10px",
                    fontWeight: 700,
                    width,
                    backgroundColor: "rgba(245, 246, 248, 1)",
                    borderRadius: index === 0 ? "50px 0 0 50px" : undefined,
                  }}
                >
                  {label}
                </th>
              ))}
              <th
                onClick={handleSort}
                style={{
                  textAlign: "left",
                  padding: "9px 12px",
                  fontSize: "10px",
                  fontWeight: 700,
                  width: "23%",
                  backgroundColor: "rgba(245, 246, 248, 1)",
                  borderRadius: "0 50px 50px 0",
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                AMOUNT
                <SortIcon active={sortKey === "amount"} dir={sortDir} />
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((tx, i) => {
              const isAlt = i % 2 !== 0;
              const altBg = isAlt ? "rgba(249, 249, 249, 1)" : undefined;
              return (
                <tr key={i}>
                  <td
                    style={{
                      padding: "10px 12px",
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "rgba(30,30,30,1)",
                      whiteSpace: "nowrap",
                      backgroundColor: altBg,
                      borderRadius: isAlt ? "50px 0 0 50px" : undefined,
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
                      backgroundColor: altBg,
                    }}
                  >
                    {tx.vendor_name}
                  </td>
                  <td
                    style={{
                      padding: "10px 12px",
                      fontSize: "12px",
                      whiteSpace: "nowrap",
                      backgroundColor: altBg,
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
                      backgroundColor: altBg,
                      borderRadius: isAlt ? "0 50px 50px 0" : undefined,
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
