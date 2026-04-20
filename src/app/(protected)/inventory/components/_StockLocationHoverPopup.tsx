"use client";

import { useEffect, useState } from "react";

type StockLocationHoverPopupProps = {
  inventoryItemId: number;
  mouseX: number;
  mouseY: number;
  unit: string;
  prefetchedData?: any;
  anchorRect?: DOMRect | null;
};

type LocationData = {
  location: string;
  quantity: number;
};

function processStockData(result: any): {
  locations: LocationData[];
  total: number;
} {
  if (!result?.success) {
    return { locations: [], total: 0 };
  }

  const stocks = Array.isArray(result.stocks) ? result.stocks : [];
  const transfers = Array.isArray(result.stocksTransferIssue)
    ? result.stocksTransferIssue
    : [];

  const locationMap: Record<string, number> = {};

  stocks.forEach((stock: any) => {
    const location = stock.location || "Unknown";
    const qty = Number(stock.quantity) || 0;
    if (!locationMap[location]) locationMap[location] = 0;
    locationMap[location] += qty;
  });

  transfers.forEach((tx: any) => {
    const type = (tx.type || "").toLowerCase();
    const qty = Number(tx.quantity) || 0;

    if (type.includes("issue") || type.includes("send")) {
      const from = tx.from_location || "Unknown";
      if (!locationMap[from]) locationMap[from] = 0;
      locationMap[from] -= qty;
    }

    if (type.includes("transfer")) {
      const from = tx.from_location || "Unknown";
      const to = tx.to_location || "Unknown";
      if (!locationMap[from]) locationMap[from] = 0;
      if (!locationMap[to]) locationMap[to] = 0;
      locationMap[from] -= qty;
      locationMap[to] += qty;
    }
  });

  const locations: LocationData[] = Object.entries(locationMap)
    .filter(([_, qty]) => qty > 0)
    .map(([location, quantity]) => ({ location, quantity }));

  const total = locations.reduce((sum, item) => sum + item.quantity, 0);
  return { locations, total };
}

export default function StockLocationHoverPopup({
  inventoryItemId,
  mouseX,
  mouseY,
  unit,
  prefetchedData,
  anchorRect,
}: StockLocationHoverPopupProps) {
  const [locationData, setLocationData] = useState<LocationData[]>([]);
  const [totalStock, setTotalStock] = useState(0);

  useEffect(() => {
    // If prefetched data is available, use it directly
    if (prefetchedData) {
      const { locations, total } = processStockData(prefetchedData);
      setLocationData(locations);
      setTotalStock(total);

      return;
    }

    // Fallback: fetch if no prefetched data
    async function fetchLocationData() {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/stock/getStocksByInventoryItemID`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ inventoryItemId }),
          },
        );
        const result = await response.json();
        const { locations, total } = processStockData(result);
        setLocationData(locations);
        setTotalStock(total);
      } catch (error) {
        console.error("Error fetching stock locations:", error);
        setLocationData([]);
        setTotalStock(0);
      }
    }

    fetchLocationData();
  }, [inventoryItemId, prefetchedData]);

  const formatNumber = (value: number) =>
    value % 1 === 0 ? value : Number(value.toFixed(3));

  // Compute static position anchored to the material column cell
  const popupWidth = 320;
  let left: number;
  let top: number;

  if (anchorRect && typeof window !== "undefined") {
    // Prefer right of the cell; fall back to left if not enough space
    const spaceRight = window.innerWidth - anchorRect.right;
    left =
      spaceRight >= popupWidth + 15
        ? anchorRect.right + 15
        : anchorRect.left - popupWidth - 15;
    left = Math.max(10, Math.min(left, window.innerWidth - popupWidth - 10));
    // Vertically center the popup on the cell
    const cellMidY = anchorRect.top + anchorRect.height / 2;
    top = Math.max(10, Math.min(cellMidY - 60, window.innerHeight - 250));
  } else {
    left = mouseX + 20;
    top = mouseY + 20;
  }

  return (
    <div
      style={{
        position: "fixed",
        left,
        top,
        backgroundColor: "white",
        border: "1px solid rgba(223,223,223,1)",
        borderRadius: "10px",
        padding: "15px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        zIndex: 10000,
        width: `${popupWidth}px`,
        pointerEvents: "none",
      }}
    >
      <table className="items-table popup-hover">
        <thead>
          <tr>
            <th>LOCATION</th>
            <th>QTY</th>
          </tr>
        </thead>
        <tbody>
          {locationData.map((item, idx) => (
            <tr key={idx}>
              <td>{item.location.toUpperCase()}</td>
              <td>
                {formatNumber(item.quantity)} {unit}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
