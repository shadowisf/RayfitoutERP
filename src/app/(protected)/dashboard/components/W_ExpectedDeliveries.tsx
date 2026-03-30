"use client";

import Button from "@/app/components/Button";
import { useEffect, useState } from "react";

export default function ExpectedDeliveriesWidget() {
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [rowLimit, setRowLimit] = useState<number>(20);

  const externalLinkIcon = "/icons/external-link.svg";

  useEffect(() => {
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/dashboard/manager/getExpectedDeliveries`,
    )
      .then((res) => res.json())
      .then((data) => {
        setDeliveries(data);
      });
  }, []);

  if (deliveries.length === 0) {
    return null;
  }

  const displayedDeliveries = deliveries.slice(0, rowLimit);

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2>EXPECTED DELIVERIES</h2>
        <select
          value={rowLimit}
          onChange={(e) => setRowLimit(Number(e.target.value))}
          style={{
            width: "150px",
            backgroundColor: "white",
            borderRadius: "50px",
          }}
        >
          {[20, 50, 100, 200].map((n) => (
            <option key={n} value={n}>
              Show {n} rows
            </option>
          ))}
        </select>
      </div>
      <br />
      <table className="items-table two-toned alt">
        <thead>
          <tr>
            <th>LPO NUMBER</th>
            <th>VENDOR</th>
            <th>ETA</th>
            <th>ITEMS</th>
            <th>STATUS</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {displayedDeliveries.map((delivery) => {
            const deliveryDate = new Date(delivery.delivery_date);
            const today = new Date();

            // Set hours to 0 for date-only comparison
            deliveryDate.setHours(0, 0, 0, 0);
            today.setHours(0, 0, 0, 0);

            // Only overdue if delivery date is BEFORE today (not today itself)
            const isOverdue = deliveryDate < today;

            return (
              <tr key={delivery.id}>
                <td>LPO-{String(delivery.id).padStart(5, "0")}</td>
                <td>{delivery.supplier_name}</td>
                <td>
                  {new Date(delivery.delivery_date).toLocaleDateString("en-GB")}
                </td>
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
                <td>
                  <Button
                    componentType={"link"}
                    bgColor={"rgba(239, 239, 239, 1)"}
                    borderColor={"rgba(223, 223, 223, 1)"}
                    textColor={"black"}
                    href={`/mr/${delivery.mr_header_id}/lpo/${delivery.id}`}
                    style={{ padding: "7px 7px" }}
                  >
                    <img src={externalLinkIcon} alt="external link" />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}
