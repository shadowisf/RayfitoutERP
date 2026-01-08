"use client";

import { useEffect, useState } from "react";

type Props = {
  inventoryItemId: number;
};

export default function AverageLeadTimeWidget({ inventoryItemId }: Props) {
  const [avgLeadTime, setAvgLeadTime] = useState<number | null>(null);

  useEffect(() => {
    const calculate = async () => {
      try {
        // 1️⃣ Fetch all stocks
        const stockRes = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/stock`
        );
        const stocks = await stockRes.json();

        // 2️⃣ Filter MR-based stocks ONLY
        const mrStocks = stocks.filter(
          (s: any) =>
            s.inventory_item_id === inventoryItemId && s.mr_header_id !== null
        );

        if (mrStocks.length === 0) {
          setAvgLeadTime(null);
          return;
        }

        // 3️⃣ Get unique MR header IDs
        const mrHeaderIds = [
          ...new Set(mrStocks.map((s: any) => s.mr_header_id)),
        ];

        // 4️⃣ Fetch each MR header one by one
        const mrHeaders: any[] = [];

        for (const id of mrHeaderIds) {
          try {
            const res = await fetch(
              `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMrHeaderByID`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
              }
            );

            const mrData = await res.json();
            if (mrData) mrHeaders.push(mrData);
          } catch (err) {
            console.error(`Failed to fetch MR header ${id}:`, err);
          }
        }

        // 5️⃣ Calculate lead times
        const leadTimes = mrHeaders
          .map((mr: any) => {
            if (!mr.date_requested || !mr.delivery_date) return null;

            const requested = new Date(mr.date_requested);
            const delivered = new Date(mr.delivery_date);

            const diffMs = delivered.getTime() - requested.getTime();
            const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

            return diffDays >= 0 ? diffDays : null;
          })
          .filter((d: number | null) => d !== null);

        if (leadTimes.length === 0) {
          setAvgLeadTime(null);
        } else {
          const avg =
            leadTimes.reduce((a: number, b: number) => a + b, 0) /
            leadTimes.length;
          setAvgLeadTime(Math.round(avg));
        }
      } catch (err) {
        console.error("Lead time calculation error:", err);
        setAvgLeadTime(null);
      }
    };

    calculate();
  }, [inventoryItemId]);

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
      <h3 style={{ color: "rgba(89, 89, 89, 1)" }}>AVG. LEAD TIME</h3>
      <div>
        <h2 style={{ fontSize: "48px" }}>
          {avgLeadTime !== null ? `${avgLeadTime}` : "N/A"}
        </h2>
        <h3>Days</h3>
      </div>
    </div>
  );
}
