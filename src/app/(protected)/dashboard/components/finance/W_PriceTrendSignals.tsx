"use client";

import { useEffect, useState } from "react";

interface PriceTrend {
  inventory_item_id: number;
  description: string;
  specification: string;
  unit: string;
  current_price: number;
  average_price: number;
  percentage_change: number;
  stock_count: number;
}

export default function PriceTrendSignalsWidget() {
  const [priceTrends, setPriceTrends] = useState<PriceTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(1);

  const arrowUpChartIcon = "/icons/arrow-up-chart.svg";
  const arrowDownChartIcon = "/icons/arrow-down-chart.svg";
  const downArrowIcon = "/icons/minimal-arrow-down.svg";

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/dashboard/finance/getAllUnitPriceAnalysis`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filter }),
          }
        );
        const data = await response.json();
        setPriceTrends(data);
      } catch (error) {
        console.error("Error fetching price trends:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [filter]);

  // Format currency
  const formatCurrency = (value: number) => {
    return `${Math.round(value)} AED`;
  };

  // Get filter label
  const getFilterLabel = () => {
    switch (filter) {
      case 0:
        return "All Time";
      case 1:
        return "24h";
      case 7:
        return "7d";
      case 30:
        return "30d";
      default:
        return `${filter}d`;
    }
  };

  if (loading) {
    return (
      <div className="item">
        <h3>Price Trend Signals</h3>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "200px",
          }}
        >
          <p style={{ color: "#888" }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (priceTrends.length === 0) {
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
          <h3>Price Trend Signals</h3>
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
                fontWeight: "600",
              }}
            >
              <option value={0}>All Time</option>
              <option value={1}>24h</option>
              <option value={7}>7d</option>
              <option value={30}>30d</option>
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
            minHeight: "200px",
          }}
        >
          <p style={{ color: "#888" }}>No price data available</p>
        </div>
      </div>
    );
  }

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
        <h3>Price Trend Signals</h3>
        <div style={{ position: "relative" }}>
          <select
            value={filter}
            onChange={(e) => setFilter(Number(e.target.value))}
            style={{
              padding: "8px 35px 8px 12px",
              borderRadius: "50px",
              backgroundColor: "white",
            }}
          >
            <option value={1}>24h</option>
            <option value={7}>7d</option>
            <option value={30}>30d</option>
          </select>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {priceTrends.map((trend, index) => {
          const isIncrease = trend.percentage_change > 0;
          const isDecrease = trend.percentage_change < 0;

          return (
            <div
              key={index}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "7px 7px",
                backgroundColor:
                  index % 2 === 0
                    ? "rgba(248, 249, 251, 1)"
                    : "rgba(255, 255, 255, 1)",
                borderRadius: "50px",
              }}
            >
              {/* Item Name */}
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: 0, fontWeight: "600" }}>
                  {trend.description}
                </h4>
              </div>

              {/* Current Price */}
              <div
                style={{
                  marginRight: "20px",
                  color: isIncrease
                    ? "rgba(248, 77, 77, 1)"
                    : isDecrease
                    ? "rgba(26, 216, 135, 1)"
                    : "#000",
                  fontWeight: "600",
                }}
              >
                {formatCurrency(trend.current_price)}
              </div>

              {/* Price Change Badge */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "7px 15px",
                  borderRadius: "50px",
                  backgroundColor: isIncrease
                    ? "rgba(244, 197, 197, 1)"
                    : isDecrease
                    ? "rgba(218, 255, 218, 1)"
                    : "rgba(239, 239, 239, 1)",
                  justifyContent: "center",
                }}
              >
                <span
                  style={{
                    fontWeight: "600",
                    color: isIncrease
                      ? "rgba(159, 71, 71, 1)"
                      : isDecrease
                      ? "rgba(0, 108, 60, 1)"
                      : "#737373",
                  }}
                >
                  {isIncrease ? "+" : "-"}
                  {Math.abs(trend.percentage_change).toFixed(0)}%
                </span>
                {isIncrease && (
                  <img src={arrowUpChartIcon} width={16} alt="arrow up" />
                )}
                {isDecrease && (
                  <img src={arrowDownChartIcon} width={16} alt="arrow down" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
