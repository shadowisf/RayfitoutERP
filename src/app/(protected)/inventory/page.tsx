"use client";

import { useEffect, useState } from "react";
import { InventoryItem } from "./types/inventoryItem";
import CreateInventoryItemButton from "./components/_CreateInventoryItemButton";
import { QRCodeSVG } from "qrcode.react";
import Button from "@/app/components/Button";

export default function Inventory() {
  const externalLinkIcon = "/icons/external-link.svg";

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [stockQuantities, setStockQuantities] = useState<{
    [itemId: number]: {
      total_quantity: number;
    };
  }>({});

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/inventory`, {
      method: "GET",
    })
      .then((res) => res.json())
      .then((data) => {
        setInventory(data.data);
      });
  }, []);

  // Fetch total quantities for all inventory items
  useEffect(() => {
    async function fetchAllQuantities() {
      if (!inventory || inventory.length === 0) {
        return;
      }

      const quantities: {
        [itemId: number]: {
          total_quantity: number;
          batch_count: number;
        };
      } = {};

      try {
        const fetchPromises = inventory.map(async (item) => {
          try {
            const response = await fetch(
              `${process.env.NEXT_PUBLIC_BASE_URL}/api/stock/getTotalQuantityByInventoryItemID`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  inventory_item_id: item.id,
                }),
              }
            );

            const data = await response.json();

            if (data.success && data.data) {
              quantities[item.id] = {
                total_quantity: data.data.total_quantity || 0,
                batch_count: data.data.batch_count || 0,
              };
            } else {
              quantities[item.id] = {
                total_quantity: 0,
                batch_count: 0,
              };
            }
          } catch (error) {
            console.error(
              `Error fetching quantity for item ${item.id}:`,
              error
            );
            quantities[item.id] = {
              total_quantity: 0,
              batch_count: 0,
            };
          }
        });

        await Promise.all(fetchPromises);
        setStockQuantities(quantities);
      } catch (error) {
        console.error("Error fetching stock quantities:", error);
      }
    }

    fetchAllQuantities();
  }, [inventory]);

  return (
    <div className="dashboard">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2>INVENTORY</h2>
        <CreateInventoryItemButton />
      </div>

      <br />
      <br />
      <br />

      <div style={{ overflowX: "auto" }}>
        {inventory ? (
          <table className="items-table">
            <thead>
              <tr>
                <th>#</th>
                <th>ID</th>
                <th>CATEGORY</th>
                <th>SUBCATEGORY</th>
                <th>DESCRIPTION</th>
                <th>TOTAL QUANTITY</th>
                <th>DETAILS</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((item, index) => {
                const stockData = stockQuantities[item.id];
                const totalQty = stockData?.total_quantity ?? 0;

                return (
                  <tr key={item.id}>
                    <td>{index + 1}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      MRT-{String(item.id).padStart(5, "0")}
                    </td>
                    <td>{item.category_name}</td>
                    <td>{item.subcategory_name}</td>
                    <td>{item.description}</td>
                    <td>{`${totalQty} ${item.unit || ""}`}</td>

                    <td>
                      <Button
                        componentType={"link"}
                        bgColor={"rgba(239, 239, 239, 1)"}
                        borderColor={"rgba(223, 223, 223, 1)"}
                        textColor={"white"}
                        style={{ padding: "7px 7px" }}
                        href={`/inventory/${item.id}`}
                      >
                        <img src={externalLinkIcon} alt="external link"></img>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          ""
        )}
      </div>
    </div>
  );
}
