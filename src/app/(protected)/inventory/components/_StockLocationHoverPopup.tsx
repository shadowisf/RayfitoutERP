"use client";

import { useEffect, useState } from "react";

type StockLocationHoverPopupProps = {
  inventoryItemId: number;
  mouseX: number;
  mouseY: number;
  unit: string;
};

type LocationData = {
  location: string;
  quantity: number;
};

export default function StockLocationHoverPopup({
  inventoryItemId,
  mouseX,
  mouseY,
  unit,
}: StockLocationHoverPopupProps) {
  const [locationData, setLocationData] = useState<LocationData[]>([]);
  const [totalStock, setTotalStock] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchLocationData() {
      setIsLoading(true);

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

        if (!result.success) {
          setLocationData([]);
          setTotalStock(0);
          return;
        }

        const stocks = Array.isArray(result.stocks) ? result.stocks : [];

        const transfers = Array.isArray(result.stocksTransferIssue)
          ? result.stocksTransferIssue
          : [];

        const locationMap: Record<string, number> = {};

        // 1️⃣ Add base stock quantities
        stocks.forEach((stock: any) => {
          const location = stock.location || "Unknown";
          const qty = Number(stock.quantity) || 0;

          if (!locationMap[location]) {
            locationMap[location] = 0;
          }

          locationMap[location] += qty;
        });

        // 2️⃣ Adjust using transfer / issue transactions
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

        // 3️⃣ Build UI data
        const locations: LocationData[] = Object.entries(locationMap)
          .filter(([_, qty]) => qty > 0)
          .map(([location, quantity], index) => ({
            location,
            quantity,
          }));

        const total = locations.reduce((sum, item) => sum + item.quantity, 0);

        setLocationData(locations);
        setTotalStock(total);
      } catch (error) {
        console.error("Error fetching stock locations:", error);
        setLocationData([]);
        setTotalStock(0);
      } finally {
        setIsLoading(false);
      }
    }

    fetchLocationData();
  }, [inventoryItemId]);

  const formatNumber = (value: number) =>
    value % 1 === 0 ? value : Number(value.toFixed(3));

  return (
    <div
      style={{
        position: "fixed",
        left: mouseX + 20,
        top: mouseY + 20,
        backgroundColor: "white",
        border: "1px solid rgba(223,223,223,1)",
        borderRadius: "10px",
        padding: "15px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        zIndex: 10000,
        minWidth: "300px",
        pointerEvents: "none",
      }}
    >
      {isLoading ? (
        <div style={{ textAlign: "center", color: "#888" }}>Loading...</div>
      ) : locationData.length > 0 ? (
        <>
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
        </>
      ) : (
        <div style={{ textAlign: "center", fontSize: "13px", color: "#888" }}>
          No stock locations found
        </div>
      )}
    </div>
  );
}
