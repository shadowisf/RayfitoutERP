"use client";

import { useEffect, useState } from "react";

type Props = {
  stocks: any[];
  stocksTransferIssue: any[];
  unit: string;
};

export default function TotalQuantityWidget({
  stocks,
  stocksTransferIssue,
  unit,
}: Props) {
  const [totalQty, setTotalQty] = useState<number | null>(null);

  // Helper function to format numbers
  const formatNumber = (value: number): string | number => {
    // Check if the number has decimal places
    if (value % 1 === 0) {
      // No decimal places, return as integer
      return Math.round(value);
    } else {
      // Has decimal places, format to remove trailing zeros
      return parseFloat(value.toFixed(3));
    }
  };

  // Function to calculate total stock including issues and transfers
  const calculateTotalStock = (
    stocks: any[],
    stocksTransferIssue: any[],
  ): number => {
    const locationMap: { [key: string]: number } = {};

    // 1️⃣ Add base stock quantities
    stocks.forEach((stock) => {
      const location = stock.location || "Unknown";
      if (!locationMap[location]) locationMap[location] = 0;
      locationMap[location] += Number(stock.quantity);
    });

    // 2️⃣ Adjust for issued, sent, and transferred quantities
    stocksTransferIssue.forEach((tx) => {
      const type = tx.type.toLowerCase();
      const from = tx.from_location || "Unknown";
      const to = tx.to_location || "Unknown";
      const qty = Number(tx.quantity) || 0;

      if (type.includes("issue") || type.includes("send")) {
        if (!locationMap[from]) locationMap[from] = 0;
        locationMap[from] -= qty;
      } else if (type.includes("transfer")) {
        if (!locationMap[from]) locationMap[from] = 0;
        if (!locationMap[to]) locationMap[to] = 0;
        locationMap[from] -= qty;
        locationMap[to] += qty;
      }
    });

    // 3️⃣ Sum all positive quantities
    const total = Object.values(locationMap).reduce(
      (sum, qty) => sum + (qty > 0 ? qty : 0),
      0,
    );

    return total;
  };

  useEffect(() => {
    try {
      const total = calculateTotalStock(stocks, stocksTransferIssue);
      setTotalQty(total);
    } catch (err) {
      console.error("Error calculating total quantity:", err);
      setTotalQty(null);
    }
  }, [stocks, stocksTransferIssue]);

  return (
    <div
      style={{
        backgroundColor: "rgba(248, 249, 251, 1)",
        padding: "15px",
        borderRadius: "10px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        flex: 1,
      }}
    >
      <h3 style={{ color: "rgba(89, 89, 89, 1)" }}>TOTAL QTY.</h3>
      <div>
        <h2 style={{ fontSize: "48px" }}>
          {totalQty !== null ? formatNumber(totalQty) : "N/A"}
        </h2>
        <h3>{unit || "-"}</h3>
      </div>
    </div>
  );
}
