"use client";

import { useEffect, useState } from "react";
import { InventoryItem } from "./types/inventoryItem";
import CreateInventoryItemButton from "./components/_CreateInventoryItemButton";
import Button from "@/app/components/Button";

export default function Inventory() {
  const externalLinkIcon = "/icons/external-link.svg";

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [availableQuantities, setAvailableQuantities] = useState<{
    [itemId: number]: {
      available_quantity: number;
      total_stock: number;
      total_issued: number;
    };
  }>({});
  const [activeCategory, setActiveCategory] = useState<string>("ALL");

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/inventory`, {
      method: "GET",
    })
      .then((res) => res.json())
      .then((data) => {
        setInventory(data.data);
      });
  }, []);

  // Fetch available quantities for all inventory items
  useEffect(() => {
    async function fetchAllQuantities() {
      if (!inventory || inventory.length === 0) {
        return;
      }

      const quantities: {
        [itemId: number]: {
          available_quantity: number;
          total_stock: number;
          total_issued: number;
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
                available_quantity: data.data.available_quantity || 0,
                total_stock: data.data.total_stock || 0,
                total_issued: data.data.total_issued || 0,
              };
            } else {
              quantities[item.id] = {
                available_quantity: 0,
                total_stock: 0,
                total_issued: 0,
              };
            }
          } catch (error) {
            console.error(
              `Error fetching quantity for item ${item.id}:`,
              error
            );
            quantities[item.id] = {
              available_quantity: 0,
              total_stock: 0,
              total_issued: 0,
            };
          }
        });

        await Promise.all(fetchPromises);
        setAvailableQuantities(quantities);
      } catch (error) {
        console.error("Error fetching available quantities:", error);
      }
    }

    fetchAllQuantities();
  }, [inventory]);

  // Get unique categories
  const categories = Array.from(
    new Set(inventory.map((item) => item.category_name))
  ).sort();

  // Get item count per category
  const getCategoryCount = (category: string) => {
    return inventory.filter((item) => item.category_name === category).length;
  };

  // Filter inventory based on active category
  const filteredInventory =
    activeCategory === "ALL"
      ? inventory
      : inventory.filter((item) => item.category_name === activeCategory);

  // Get stock status based on available quantity
  const getStockStatus = (availableQty: number) => {
    if (availableQty === 0) {
      return {
        label: "NO STOCK",
        bgColor: "rgba(255, 181, 181, 1)",
        textColor: "rgba(248, 77, 77, 1)",
      };
    } else if (availableQty <= 10) {
      return {
        label: "LOW STOCK",
        bgColor: "rgba(255, 250, 189, 1)",
        textColor: "rgba(134, 83, 47, 1)",
      };
    } else {
      return {
        label: "IN STOCK",
        bgColor: "rgba(149, 222, 189, 1)",
        textColor: "rgba(0, 108, 60, 1)",
      };
    }
  };

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

      {/* Category Tabs */}
      <div className="category-grid">
        <div>
          <button
            className={`item ${activeCategory === "ALL" ? "active" : ""}`}
            onClick={() => setActiveCategory("ALL")}
            style={{ textTransform: "uppercase" }}
          >
            ALL ({inventory.length})
          </button>

          {categories.map((category) => (
            <button
              key={category}
              className={`item ${activeCategory === category ? "active" : ""}`}
              onClick={() => setActiveCategory(category)}
            >
              {category.toUpperCase()} ({getCategoryCount(category)})
            </button>
          ))}
        </div>
      </div>

      <br />
      <br />

      <div style={{ overflowX: "auto" }}>
        {filteredInventory.length > 0 ? (
          <table className="items-table">
            <thead>
              <tr>
                <th>#</th>
                <th>ID</th>
                <th>MATERIAL</th>
                <th>TOTAL QUANTITY</th>
                <th>STATUS</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filteredInventory.map((item, index) => {
                const quantityData = availableQuantities[item.id];
                const availableQty = quantityData?.available_quantity ?? 0;
                const stockStatus = getStockStatus(availableQty);

                return (
                  <tr key={item.id}>
                    <td>{index + 1}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      INV-{String(item.id).padStart(5, "0")}
                    </td>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "25px",
                        }}
                      >
                        <div style={{ width: "50px" }}>
                          {item.image ? (
                            <img
                              src={item.image}
                              alt="reference image"
                              width={50}
                            />
                          ) : (
                            "-"
                          )}
                        </div>
                        {item.description}
                      </div>
                    </td>

                    <td>{`${availableQty} ${item.unit || ""}`}</td>
                    <td>
                      <div
                        className="approval-pill normal-text"
                        style={{
                          backgroundColor: stockStatus.bgColor,
                          color: stockStatus.textColor,
                        }}
                      >
                        {stockStatus.label}
                      </div>
                    </td>
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
          <div style={{ textAlign: "center", padding: "40px", color: "#888" }}>
            No items found in this category
          </div>
        )}
      </div>
    </div>
  );
}
