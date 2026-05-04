"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";

type TopVendor = {
  supplier_id: number;
  supplier_name: string;
  payment_type: string;
  total_lpos: number;
  amount: number;
};

type SortKey = "total_lpos" | "amount";
type SortDir = "asc" | "desc";

function formatAED(val: number): string {
  return val.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span style={{ marginLeft: 4, fontSize: 10, opacity: active ? 1 : 0.35 }}>
      {active ? (dir === "asc" ? "↑" : "↓") : "↕"}
    </span>
  );
}

export default function FinanceTopVendorsBySpendWidget() {
  const [vendors, setVendors] = useState<TopVendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/dashboard/finance/getFinancialTopVendorsBySpend`,
    )
      .then((res) => res.json())
      .then((d) => setVendors(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const handleSort = (key: SortKey) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("desc");
    } else if (sortDir === "desc") {
      setSortDir("asc");
    } else {
      setSortKey(null);
      setSortDir("desc");
    }
  };

  const sorted = useMemo(() => {
    if (!sortKey) return [...vendors];
    return [...vendors].sort((a, b) => {
      const mul = sortDir === "asc" ? 1 : -1;
      return mul * (a[sortKey] - b[sortKey]);
    });
  }, [vendors, sortKey, sortDir]);

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <h2 style={{ margin: 0 }}>Top Vendors By Spend</h2>
        <Link
          href="/finance/vendors"
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
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "15px",
          padding: "20px 24px",
        }}
      >
        {isLoading ? (
          <p style={{ fontSize: "13px", color: "rgba(150,150,150,1)" }}>
            Loading...
          </p>
        ) : !vendors.length ? (
          <p style={{ fontSize: "13px", color: "rgba(150,150,150,1)" }}>
            No vendor data available
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
                {/* VENDOR — not sortable */}
                <th style={{ textAlign: "left", padding: "9px 12px", fontSize: "12px", fontWeight: 700, width: "auto", whiteSpace: "nowrap", backgroundColor: "rgba(245,246,248,1)", borderRadius: "50px 0 0 50px" }}>
                  VENDOR
                </th>
                {/* PAYMENT TYPE — not sortable */}
                <th style={{ textAlign: "left", padding: "9px 12px", fontSize: "12px", fontWeight: 700, width: "16%", whiteSpace: "nowrap", backgroundColor: "rgba(245,246,248,1)" }}>
                  PAYMENT TYPE
                </th>
                {/* TOTAL LPOS — sortable */}
                <th onClick={() => handleSort("total_lpos")} style={{ textAlign: "left", padding: "9px 12px", fontSize: "12px", fontWeight: 700, width: "14%", whiteSpace: "nowrap", backgroundColor: "rgba(245,246,248,1)", cursor: "pointer", userSelect: "none" }}>
                  TOTAL LPOS<SortIcon active={sortKey === "total_lpos"} dir={sortDir} />
                </th>
                {/* TOTAL SPENT — sortable */}
                <th onClick={() => handleSort("amount")} style={{ textAlign: "left", padding: "9px 12px", fontSize: "12px", fontWeight: 700, width: "20%", whiteSpace: "nowrap", backgroundColor: "rgba(245,246,248,1)", borderRadius: "0 50px 50px 0", cursor: "pointer", userSelect: "none" }}>
                  TOTAL SPENT<SortIcon active={sortKey === "amount"} dir={sortDir} />
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((vendor, i) => {
                const isAlt = i % 2 !== 0;
                const altBg = isAlt ? "rgba(249, 249, 249, 1)" : undefined;
                return (
                  <tr key={vendor.supplier_id}>
                    <td
                      style={{
                        padding: "10px 12px",
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "rgba(30,30,30,1)",
                        maxWidth: "0",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        backgroundColor: altBg,
                        borderRadius: isAlt ? "50px 0 0 50px" : undefined,
                      }}
                    >
                      {vendor.supplier_name}
                    </td>
                    <td
                      style={{
                        padding: "10px 12px",
                        fontSize: "12px",
                        whiteSpace: "nowrap",
                        backgroundColor: altBg,
                      }}
                    >
                      {vendor.payment_type}
                    </td>
                    <td
                      style={{
                        padding: "10px 12px",
                        fontSize: "12px",
                        whiteSpace: "nowrap",
                        backgroundColor: altBg,
                      }}
                    >
                      {vendor.total_lpos}
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
                      AED {formatAED(vendor.amount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
