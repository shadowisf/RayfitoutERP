"use client";

import { useEffect, useState } from "react";

interface TopVendor {
  supplier_id: number;
  supplier_name: string;
  total_quantity: number;
  lpo_count: number;
}

type Props = {
  filterDays?: number;
};

export default function TopVendorsByVolumeWidget({ filterDays }: Props) {
  const [vendors, setVendors] = useState<TopVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredVendorId, setHoveredVendorId] = useState<number | null>(null);
  const [filter, setFilter] = useState(filterDays);

  const downArrowIcon = "/icons/minimal-arrow-down.svg";

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/dashboard/procurement/getTopVendorsByVolume`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filter }),
          },
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Check if data has an error property
        if (data.error) {
          throw new Error(data.error);
        }

        // Ensure data is an array
        if (Array.isArray(data)) {
          setVendors(data);
        } else {
          console.error("Received non-array data:", data);
          setVendors([]);
        }
      } catch (error: any) {
        console.error("Error fetching vendor volume data:", error);
        setError(error.message || "Failed to fetch data");
        setVendors([]);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [filter]);

  // Format quantity
  const formatQuantity = (value: number) => {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
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

  if (error) {
    return (
      <div className="item">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <h3 style={{ margin: 0 }}>Top Vendors By Order Volume</h3>
          <div style={{ position: "relative" }}>
            <select
              value={filter}
              onChange={(e) => setFilter(Number(e.target.value))}
              style={{
                padding: "8px 35px 8px 12px",
                borderRadius: "50px",
                border: "1px solid rgba(223, 223, 223, 1)",
                backgroundColor: "white",
                cursor: "pointer",
                appearance: "none",
                WebkitAppearance: "none",
                MozAppearance: "none",
              }}
            >
              <option value={7}>Last 7 Days</option>
              <option value={14}>Last 14 Days</option>
              <option value={30}>Last Month</option>
            </select>
            <img
              src={downArrowIcon}
              alt="dropdown"
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
                width: "10px",
                height: "10px",
              }}
            />
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "150px",
          }}
        >
          <p style={{ color: "#f84d4d" }}>Error: {error}</p>
        </div>
      </div>
    );
  }

  if (vendors.length === 0) {
    return (
      <div className="item">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <h3 style={{ margin: 0 }}>Top Vendors By Order Volume</h3>
          <div style={{ position: "relative" }}>
            <select
              value={filter}
              onChange={(e) => setFilter(Number(e.target.value))}
              style={{
                padding: "8px 35px 8px 12px",
                borderRadius: "50px",
                border: "1px solid rgba(223, 223, 223, 1)",
                backgroundColor: "white",
                cursor: "pointer",
                appearance: "none",
                WebkitAppearance: "none",
                MozAppearance: "none",
              }}
            >
              <option value={7}>Last 7 Days</option>
              <option value={14}>Last 14 Days</option>
              <option value={30}>Last Month</option>
            </select>
            <img
              src={downArrowIcon}
              alt="dropdown"
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
                width: "10px",
                height: "10px",
              }}
            />
          </div>
        </div>
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

  // Calculate max value for bar width calculation
  const maxQuantity = Math.max(...vendors.map((v) => v.total_quantity));

  return (
    <div className="item">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h3 style={{ margin: 0 }}>Top Vendors By Order Volume</h3>
        <div style={{ position: "relative" }}>
          <select
            value={filter}
            onChange={(e) => setFilter(Number(e.target.value))}
            style={{
              padding: "8px 35px 8px 12px",
              borderRadius: "50px",
              border: "1px solid rgba(223, 223, 223, 1)",
              backgroundColor: "white",
              cursor: "pointer",
              appearance: "none",
              WebkitAppearance: "none",
              MozAppearance: "none",
            }}
          >
            <option value={7}>Last 7 Days</option>
            <option value={14}>Last 14 Days</option>
            <option value={30}>Last Month</option>
          </select>
          <img
            src={downArrowIcon}
            alt="dropdown"
            style={{
              position: "absolute",
              right: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "none",
              width: "10px",
              height: "10px",
            }}
          />
        </div>
      </div>

      <br />

      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {vendors.map((vendor, index) => {
          // Calculate bar width as percentage of max value
          const widthPercentage = (vendor.total_quantity / maxQuantity) * 100;

          return (
            <div
              key={vendor.supplier_id}
              style={{ width: "100%", position: "relative" }}
              onMouseEnter={() => setHoveredVendorId(vendor.supplier_id)}
              onMouseLeave={() => setHoveredVendorId(null)}
            >
              {/* Tooltip */}
              {hoveredVendorId === vendor.supplier_id && (
                <div
                  style={{
                    position: "absolute",
                    top: "-45px",
                    left: "75%",
                    transform: "translateX(-50%)",
                    backgroundColor: "rgba(0, 0, 0, 0.9)",
                    color: "white",
                    padding: "8px 12px",
                    borderRadius: "5px",
                    whiteSpace: "nowrap",
                    zIndex: 10,
                    pointerEvents: "none",
                  }}
                >
                  {formatQuantity(vendor.total_quantity)} Material Items
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

              {/* Bar */}
              <div
                style={{
                  width: "100%",
                  height: "30px",
                  backgroundColor: "#E0E0E0",
                  borderRadius: "25px",
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    width: `${widthPercentage}%`,
                    height: "100%",
                    backgroundColor: "#00D68F",
                    borderRadius: "25px",
                  }}
                />
              </div>

              {/* Vendor Name */}
              <p
                style={{
                  margin: "8px 0 0 0",
                  textTransform: "uppercase",
                  color: "#000",
                }}
              >
                {vendor.supplier_name || "Unknown Vendor"}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
