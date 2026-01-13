"use client";

import { useEffect, useState } from "react";

interface TopVendor {
  supplier_id: number;
  supplier_name: string;
  total_spend: number;
  lpo_count: number;
}

export default function TopVendorsBySpendWidget() {
  const [vendors, setVendors] = useState<TopVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredVendorId, setHoveredVendorId] = useState<number | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/dashboard/procurement/getTopVendorsBySpend`
        );
        const data = await response.json();
        setVendors(data);
      } catch (error) {
        console.error("Error fetching vendor spend data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Format currency
  const formatCurrency = (value: number) => {
    return `${value.toLocaleString(undefined, {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    })} AED`;
  };

  if (loading) {
    return (
      <div
        className="item"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "200px",
        }}
      >
        <p style={{ color: "#888" }}>Loading...</p>
      </div>
    );
  }

  if (vendors.length === 0) {
    return (
      <div className="item">
        <h3>Top Vendor By Spend</h3>
        <br />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "150px",
          }}
        >
          <p style={{ color: "#888" }}>No vendor data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="item">
      <h3 style={{ margin: 0 }}>Top Vendor By Spend</h3>
      <br />
      <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        {vendors.map((vendor, index) => {
          const isHovered = hoveredVendorId === vendor.supplier_id;

          return (
            <div
              key={vendor.supplier_id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "15px",
                backgroundColor: "rgba(195, 243, 222, 1)",
                borderRadius: "50px",
                padding: "10px 15px",
                position: "relative",
              }}
              onMouseEnter={() => setHoveredVendorId(vendor.supplier_id)}
              onMouseLeave={() => setHoveredVendorId(null)}
            >
              {/* Tooltip */}
              {isHovered && (
                <div
                  style={{
                    position: "absolute",
                    top: "-50px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    backgroundColor: "rgba(0, 0, 0, 0.9)",
                    color: "white",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    whiteSpace: "nowrap",
                    zIndex: 10,
                    pointerEvents: "none",
                  }}
                >
                  {vendor.lpo_count} LPO{vendor.lpo_count !== 1 ? "s" : ""}
                  {/* Triangle pointer */}
                  <div
                    style={{
                      position: "absolute",
                      bottom: "-5px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: 0,
                      height: 0,
                      borderLeft: "5px solid transparent",
                      borderRight: "5px solid transparent",
                      borderTop: "5px solid rgba(0, 0, 0, 0.9)",
                    }}
                  />
                </div>
              )}

              {/* Number Badge */}
              <div
                style={{
                  width: "25px",
                  height: "25px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(26, 216, 135, 1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "bold",
                  color: "black",
                  flexShrink: 0,
                }}
              >
                {index + 1}
              </div>

              {/* Vendor Name */}
              <div
                style={{
                  flex: 1,
                  fontWeight: "600",
                  textTransform: "uppercase",
                  color: "black",
                }}
              >
                {vendor.supplier_name || "Unknown Vendor"}
              </div>

              {/* Total Spend */}
              <div
                style={{
                  fontWeight: "600",
                  color: "black",
                  whiteSpace: "nowrap",
                }}
              >
                {formatCurrency(vendor.total_spend)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
