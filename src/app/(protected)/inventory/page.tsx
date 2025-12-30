"use client";

import { useEffect, useState } from "react";
import { InventoryItem } from "./types/inventoryItem";
import CreateInventoryItemButton from "./components/_CreateInventoryItemButton";
import Button from "@/app/components/Button";

export default function Inventory() {
  const externalLinkIcon = "/icons/external-link.svg";

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [stockQuantities, setStockQuantities] = useState<{
    [itemId: number]: {
      total_quantity: number;
      batch_count: number;
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

  // Group inventory by category and subcategory
  const groupedInventory = inventory.reduce((acc: any, item: InventoryItem) => {
    const category = item.category_name || "Uncategorized";
    const subCategory = item.subcategory_name || "Uncategorized";

    if (!acc[category]) {
      acc[category] = {};
    }

    if (!acc[category][subCategory]) {
      acc[category][subCategory] = [];
    }

    acc[category][subCategory].push(item);

    return acc;
  }, {});

  const categories = Object.keys(groupedInventory);
  const subCategories =
    activeCategory === "ALL"
      ? groupedInventory[categories[0]] || {}
      : groupedInventory[activeCategory] || {};

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

      {/* Category Tabs */}
      <div className="category-grid">
        <div>
          <button
            className={`item ${activeCategory === "ALL" ? "active" : ""}`}
            onClick={() => setActiveCategory("ALL")}
            style={{ textTransform: "uppercase" }}
          >
            ALL
          </button>

          {categories.map((category) => (
            <button
              key={category}
              className={`item ${activeCategory === category ? "active" : ""}`}
              onClick={() => setActiveCategory(category)}
              style={{ textTransform: "uppercase" }}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <br />
      <br />
      <br />
      <br />

      {/* Display inventory grouped by subcategory */}
      {activeCategory === "ALL"
        ? Object.entries(groupedInventory).map(
            ([category, subCategoriesData], categoryIndex) =>
              Object.entries(subCategoriesData as any).map(
                ([subCategory, items], subCategoryIndex) => (
                  <div
                    key={`${category}-${subCategory}`}
                    className="subcategory-section"
                  >
                    <div className="subcategory-header">
                      <h2 style={{ textTransform: "uppercase" }}>
                        {category} - {subCategory}
                      </h2>
                    </div>

                    <br />
                    <br />

                    <div style={{ overflowX: "auto" }}>
                      <table className="items-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>ID</th>
                            <th>DESCRIPTION</th>
                            <th>TYPE</th>
                            <th>TOTAL QUANTITY</th>
                            <th>DETAILS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(items as InventoryItem[]).map((item, itemIndex) => {
                            const stockData = stockQuantities[item.id];
                            const totalQty = stockData?.total_quantity ?? 0;

                            return (
                              <tr key={item.id}>
                                <td>{itemIndex + 1}</td>
                                <td style={{ whiteSpace: "nowrap" }}>
                                  INV-{String(item.id).padStart(5, "0")}
                                </td>
                                <td>{item.description}</td>
                                <td>{item.type}</td>
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
                                    <img
                                      src={externalLinkIcon}
                                      alt="external link"
                                    />
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <br />
                    <br />
                    <br />
                  </div>
                )
              )
          )
        : Object.entries(subCategories).map(
            ([subCategory, items], subCategoryIndex) => (
              <div key={subCategory} className="subcategory-section">
                <div className="subcategory-header">
                  <h2 style={{ textTransform: "uppercase" }}>{subCategory}</h2>
                </div>

                <br />
                <br />

                <div style={{ overflowX: "auto" }}>
                  <table className="items-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>ID</th>
                        <th>DESCRIPTION</th>
                        <th>TYPE</th>
                        <th>TOTAL QUANTITY</th>
                        <th>DETAILS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(items as InventoryItem[]).map((item, itemIndex) => {
                        const stockData = stockQuantities[item.id];
                        const totalQty = stockData?.total_quantity ?? 0;

                        return (
                          <tr key={item.id}>
                            <td>{itemIndex + 1}</td>
                            <td style={{ whiteSpace: "nowrap" }}>
                              INV-{String(item.id).padStart(5, "0")}
                            </td>
                            <td>{item.description}</td>
                            <td>{item.type}</td>
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
                                <img
                                  src={externalLinkIcon}
                                  alt="external link"
                                />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <br />
                <br />
                <br />
              </div>
            )
          )}
    </div>
  );
}
