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
        {deliveries.map((delivery) => (
          <tr key={delivery.id}>
            <td>{delivery.supplier_id}</td>
            <td>{delivery.delivery_date}</td>
            <td>{delivery.delivered}</td>
            <td>{delivery.remaining}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
