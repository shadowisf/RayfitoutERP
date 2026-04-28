"use client";

import { useEffect, useState } from "react";

type TopVendor = {
  supplier_id: number;
  supplier_name: string;
  payment_type: string;
  total_lpos: number;
  amount: number;
};

function formatAED(val: number): string {
  return val.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function FinanceTopVendorsBySpendWidget() {
  const [vendors, setVendors] = useState<TopVendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/dashboard/finance/getFinancialTopVendorsBySpend`,
    )
      .then((res) => res.json())
      .then((d) => setVendors(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <>
      <h2>Top Vendors By Spend</h2>
      <br />
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
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "rgba(245, 246, 248, 1)" }}>
                {[
                  { label: "", width: "5%" },
                  { label: "VENDOR", width: "auto" },
                  { label: "PAYMENT TYPE", width: "16%" },
                  { label: "TOTAL LPOS", width: "14%" },
                  { label: "AMOUNT", width: "20%" },
                ].map(({ label, width }, i) => (
                  <th
                    key={i}
                    style={{
                      textAlign: "left",
                      padding: "9px 12px",
                      fontSize: "12px",
                      fontWeight: 700,
                      width,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vendors.map((vendor, i) => (
                <tr
                  key={vendor.supplier_id}
                  style={{
                    borderBottom: "1px solid rgba(243, 244, 246, 1)",
                  }}
                >
                  {/* # */}
                  <td
                    style={{
                      padding: "10px 12px",
                      fontSize: "12px",
                      color: "rgba(120,120,120,1)",
                    }}
                  >
                    {i + 1}
                  </td>

                  {/* VENDOR */}
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
                    }}
                  >
                    {vendor.supplier_name}
                  </td>

                  {/* PAYMENT TYPE */}
                  <td
                    style={{
                      padding: "10px 12px",
                      fontSize: "12px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {vendor.payment_type}
                  </td>

                  {/* TOTAL LPOS */}
                  <td
                    style={{
                      padding: "10px 12px",
                      fontSize: "12px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {vendor.total_lpos}
                  </td>

                  {/* AMOUNT */}
                  <td
                    style={{
                      padding: "10px 12px",
                      fontSize: "12px",
                      color: "rgba(30,30,30,1)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    AED {formatAED(vendor.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
