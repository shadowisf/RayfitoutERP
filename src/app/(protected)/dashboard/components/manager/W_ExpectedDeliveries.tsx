"use client";

import { useEffect, useState } from "react";

export default function ExpectedDeliveriesWidget() {
  const [deliveries, setDeliveries] = useState<any[]>([]);

  useEffect(() => {
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/dashboard/manager/getExpectedDeliveries`
    )
      .then((res) => res.json())
      .then((data) => {
        setDeliveries(data);
      });
  }, []);

  return (
    <table className="items-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>VENDOR</th>
          <th>ETA</th>
          <th>ITEMS</th>
          <th>STATUS</th>
        </tr>
      </thead>
      <tbody>
        {deliveries.map((delivery) => {
          const deliveryDate = new Date(delivery.delivery_date);
          const today = new Date();
          const isOverdue = deliveryDate < today;

          return (
            <tr key={delivery.id}>
              <td>LPO-{String(delivery.id).padStart(5, "0")}</td>
              <td>{delivery.supplier_name}</td>
              <td>{deliveryDate.toLocaleDateString("en-US")}</td>
              <td>{delivery.item_count}</td>
              <td>
                <div
                  className="approval-pill normal-text"
                  style={{
                    backgroundColor: isOverdue
                      ? "rgba(254, 218, 218, 1)"
                      : "rgba(154, 245, 206, 1)",
                    color: isOverdue
                      ? "rgba(165, 57, 57, 1)"
                      : "rgba(23, 148, 94, 1)",
                  }}
                >
                  {isOverdue ? "Overdue" : "On Schedule"}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
