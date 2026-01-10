"use client";

import { useEffect, useState, useRef } from "react";
import { InventoryItem } from "./types/inventoryItem";
import CreateInventoryItemButton from "./components/_CreateInventoryItemButton";
import Button from "@/app/components/Button";
import EditInventoryItemButton from "./components/_EditInventoryItemButton";
import TransferIssueMultipleStocks from "./components/_TransferIssueMultipleStocksButton";
import DeleteInventoryItemButton from "./[id]/components/_DeleteInventoryItemButton";
import TransactionDetailsPopUpButton from "./[id]/components/_IssueDetailsPopUpButton";

export default function Inventory() {
  const externalLinkIcon = "/icons/external-link.svg";
  const searchIcon = "/icons/search.svg";
  const warningIcon = "/icons/warning.svg";
  const noImageIcon = "/icons/no-image.jpg";

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [availableQuantities, setAvailableQuantities] = useState<{
    [itemId: number]: {
      available_quantity: number;
      total_stock: number;
      total_issued: number;
    };
  }>({});
  const [activeTab, setActiveTab] = useState<"inventory" | "transfer-log">(
    "inventory"
  );
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"none" | "high-low" | "low-high">(
    "none"
  );
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  async function getInventoryItems() {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/inventory`,
        {
          method: "GET",
        }
      );
      const data = await response.json();
      setInventory(data.data);
    } catch (error) {
      console.error("Error fetching inventory items:", error);
    }
  }

  useEffect(() => {
    getInventoryItems();
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

  async function fetchAllTransactions() {
    if (activeTab !== "transfer-log") {
      return;
    }

    setIsLoadingTransactions(true);

    try {
      // Fetch all transfer/issue transactions
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/stock/getAllTransferIssueTransactions`,
        {
          method: "GET",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch transactions");
      }

      const data = await response.json();

      if (data.success && data.transactions) {
        // Sort by date (newest first)
        const sorted = data.transactions.sort((a: any, b: any) => {
          const dateA = new Date(a.created_on).getTime();
          const dateB = new Date(b.created_on).getTime();
          return dateB - dateA;
        });

        setAllTransactions(sorted);
      }
    } catch (error) {
      console.error("Error fetching all transactions:", error);
    } finally {
      setIsLoadingTransactions(false);
    }
  }

  // Fetch all transactions when Transfer Log tab is active
  useEffect(() => {
    fetchAllTransactions();
  }, [activeTab]);

  // Check scroll position to show/hide arrows
  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } =
        scrollContainerRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  // Get unique categories
  const categories = Array.from(
    new Set(inventory.map((item) => item.category_name))
  ).sort();

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [categories]);

  // Get item count per category
  const getCategoryCount = (category: string) => {
    return inventory.filter((item) => item.category_name === category).length;
  };

  // Filter, search, and sort inventory
  const getProcessedInventory = () => {
    let processed = inventory;

    // Filter by category
    if (activeCategory !== "ALL") {
      processed = processed.filter(
        (item) => item.category_name === activeCategory
      );
    }

    // Filter by search query
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      processed = processed.filter((item) =>
        item.description.toLowerCase().includes(query)
      );
    }

    // Sort by stock quantity
    if (sortOrder !== "none") {
      processed = [...processed].sort((a, b) => {
        const qtyA = availableQuantities[a.id]?.available_quantity ?? 0;
        const qtyB = availableQuantities[b.id]?.available_quantity ?? 0;

        if (sortOrder === "high-low") {
          return qtyB - qtyA;
        } else {
          return qtyA - qtyB;
        }
      });
    }

    return processed;
  };

  const processedInventory = getProcessedInventory();

  // Get stock status based on available quantity
  const getStockStatus = (availableQty: number, minimumStock: number) => {
    if (availableQty === 0) {
      return {
        label: "OUT OF STOCK",
        bgColor: "rgba(255, 181, 181, 1)",
        textColor: "rgba(248, 77, 77, 1)",
      };
    } else if (availableQty <= minimumStock) {
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

  // Get transfer type label
  const getTransferTypeLabel = (transaction: any) => {
    if (transaction.type?.toLowerCase().includes("transfer")) {
      return "MATERIAL TRANSFER";
    } else if (transaction.type?.toLowerCase().includes("issue")) {
      return "ISSUE FOR USE";
    } else if (transaction.type?.toLowerCase().includes("send")) {
      return "SEND FOR PROCESSING";
    }

    return transaction.type || "-";
  };

  // Get status for transfer log
  const getTransferStatus = (transaction: any) => {
    if (transaction.received === 1) {
      if (transaction.type?.toLowerCase().includes("issue")) {
        return {
          label: "STOCK ISSUED",
          bgColor: "rgba(255, 186, 187, 1)",
          textColor: "rgba(197, 12, 15, 1)",
        };
      } else if (transaction.type?.toLowerCase().includes("transfer")) {
        return {
          label: "STOCK TRANSFERRED",
          bgColor: "rgba(255, 186, 187, 1)",
          textColor: "rgba(197, 12, 15, 1)",
        };
      } else if (transaction.type?.toLowerCase().includes("send")) {
        return {
          label: "STOCK SENT FOR PROCESSING",
          bgColor: "rgba(255, 186, 187, 1)",
          textColor: "rgba(197, 12, 15, 1)",
        };
      }
    } else {
      if (transaction.type?.toLowerCase().includes("send")) {
        return {
          label: "SENT FOR PROCESSING",
          bgColor: "rgba(255, 242, 196, 1)",
          textColor: "rgba(180, 98, 10, 1)",
        };
      }
      if (transaction.type?.toLowerCase().includes("issue")) {
        return {
          label: "ISSUED FOR USE",
          bgColor: "rgba(255, 242, 196, 1)",
          textColor: "rgba(180, 98, 10, 1)",
        };
      }
      if (transaction.type?.toLowerCase().includes("transfer")) {
        return {
          label: "STOCK TRANSFERRED",
          bgColor: "rgba(255, 242, 196, 1)",
          textColor: "rgba(180, 98, 10, 1)",
        };
      }
    }

    return {
      label: "COMPLETED",
      bgColor: "rgba(149, 222, 189, 1)",
      textColor: "rgba(0, 108, 60, 1)",
    };
  };

  // Filter transactions based on search
  const getFilteredTransactions = () => {
    if (searchQuery.trim() === "") {
      return allTransactions;
    }

    const query = searchQuery.toLowerCase();
    return allTransactions.filter((transaction) => {
      // Search in materials
      const materialMatch = transaction.items?.some((item: any) =>
        item.description?.toLowerCase().includes(query)
      );

      // Search in locations
      const locationMatch =
        transaction.from_location?.toLowerCase().includes(query) ||
        transaction.to_location?.toLowerCase().includes(query);

      return materialMatch || locationMatch;
    });
  };

  const filteredTransactions = getFilteredTransactions();

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
        <div style={{ display: "flex", gap: "10px" }}>
          <CreateInventoryItemButton onSuccess={() => getInventoryItems()} />

          {inventory.length > 0 && (
            <TransferIssueMultipleStocks
              onSuccess={() => fetchAllTransactions()}
            />
          )}
        </div>
      </div>

      <br />

      <div className="category-grid">
        <div>
          <button
            className={`item-alt ${activeTab === "inventory" ? "active" : ""}`}
            onClick={() => setActiveTab("inventory")}
          >
            INVENTORY
          </button>
          <button
            className={`item-alt ${
              activeTab === "transfer-log" ? "active" : ""
            }`}
            onClick={() => setActiveTab("transfer-log")}
          >
            TRANSFER LOG
          </button>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          {activeTab === "inventory" && (
            <select
              value={sortOrder}
              onChange={(e) =>
                setSortOrder(e.target.value as "none" | "high-low" | "low-high")
              }
              style={{
                padding: "10px 15px",
                borderRadius: "8px",
                border: "1px solid rgba(223, 223, 223, 1)",
                backgroundColor: "white",
                cursor: "pointer",
                width: "250px",
              }}
            >
              <option value="none">SORT BY STOCK</option>
              <option value="high-low">HIGHEST TO LOWEST STOCK</option>
              <option value="low-high">LOWEST TO HIGHEST STOCK</option>
            </select>
          )}
          {activeTab === "inventory" && (
            <div
              style={{
                position: "relative",
                flex: 1,
                maxWidth: "400px",
                backgroundColor: "white",
              }}
            >
              <input
                type="text"
                placeholder="SEARCH"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "400px",
                  padding: "10px 40px 10px 15px",
                  borderRadius: "8px",
                  border: "1px solid rgba(223, 223, 223, 1)",
                  fontSize: "14px",
                }}
              />
              <img
                src={searchIcon}
                alt="search"
                style={{
                  position: "absolute",
                  right: "15px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: "16px",
                  height: "16px",
                  opacity: 0.5,
                }}
              />
            </div>
          )}
        </div>
      </div>

      <br />
      <br />

      {activeTab === "inventory" && (
        <>
          {/* Category Tabs with Scroll */}
          <div style={{ position: "relative" }}>
            {showLeftArrow && (
              <button
                onClick={() => scroll("left")}
                style={{
                  position: "absolute",
                  left: 0,
                  top: "50%",
                  transform: "translateY(-50%)",
                  zIndex: 10,
                  backgroundColor: "white",
                  border: "1px solid rgba(223, 223, 223, 1)",
                  borderRadius: "50%",
                  width: "40px",
                  height: "40px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                }}
              >
                ←
              </button>
            )}

            <div
              ref={scrollContainerRef}
              onScroll={checkScroll}
              className="category-grid"
              style={{
                overflowX: "auto",
                scrollbarWidth: "none",
                msOverflowStyle: "none",
              }}
            >
              <style jsx>{`
                .category-grid::-webkit-scrollbar {
                  display: none;
                }
              `}</style>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  className={`item ${activeCategory === "ALL" ? "active" : ""}`}
                  onClick={() => setActiveCategory("ALL")}
                  style={{ flexShrink: 0 }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <span>ALL</span>
                    <span
                      style={{
                        backgroundColor:
                          activeCategory === "ALL"
                            ? "white"
                            : "rgba(205, 205, 205, 1)",
                        color: "black",
                        borderRadius: "5px",
                        padding: "2px 10px",
                      }}
                    >
                      {inventory.length}
                    </span>
                  </div>
                </button>

                {categories.map((category) => (
                  <button
                    key={category}
                    className={`item ${
                      activeCategory === category ? "active" : ""
                    }`}
                    onClick={() => setActiveCategory(category)}
                    style={{ flexShrink: 0 }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <span>{category.toUpperCase()} </span>
                      <span
                        style={{
                          backgroundColor:
                            activeCategory === category
                              ? "white"
                              : "rgba(205, 205, 205, 1)",
                          color: "black",
                          borderRadius: "5px",
                          padding: "2px 10px",
                        }}
                      >
                        {getCategoryCount(category)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {showRightArrow && (
              <button
                onClick={() => scroll("right")}
                style={{
                  position: "absolute",
                  right: 0,
                  top: "50%",
                  transform: "translateY(-50%)",
                  zIndex: 10,
                  backgroundColor: "white",
                  border: "1px solid rgba(223, 223, 223, 1)",
                  borderRadius: "50%",
                  width: "40px",
                  height: "40px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                }}
              >
                →
              </button>
            )}
          </div>

          <br />
          <br />

          {/* Inventory Table */}
          <div style={{ overflowX: "auto" }}>
            {processedInventory.length > 0 ? (
              <table className="items-table two-toned">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>ID</th>
                    <th style={{ minWidth: "600px" }}>MATERIAL</th>
                    <th>TOTAL QUANTITY</th>
                    <th>STATUS</th>
                    <th>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {processedInventory.map((item, index) => {
                    const quantityData = availableQuantities[item.id];
                    const availableQty = quantityData?.available_quantity ?? 0;
                    const stockStatus = getStockStatus(
                      availableQty,
                      item.minimum_stock_quantity
                    );

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
                                  style={{
                                    aspectRatio: "1/1",
                                    objectFit: "cover",
                                    borderRadius: "5px",
                                  }}
                                />
                              ) : (
                                <img
                                  src={noImageIcon}
                                  alt="reference image"
                                  width={50}
                                  style={{
                                    aspectRatio: "1/1",
                                    objectFit: "cover",
                                    borderRadius: "5px",
                                  }}
                                />
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
                          <div style={{ display: "flex", gap: "10px" }}>
                            <EditInventoryItemButton inventoryItem={item} />

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
                              ></img>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div
                style={{ textAlign: "center", padding: "40px", color: "#888" }}
              >
                {searchQuery.trim() !== ""
                  ? "No items found matching your search"
                  : "No items found in this category"}
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === "transfer-log" && (
        <div style={{ overflowX: "auto" }}>
          {isLoadingTransactions ? (
            <div
              style={{ textAlign: "center", padding: "40px", color: "#888" }}
            >
              Loading transactions...
            </div>
          ) : filteredTransactions.length > 0 ? (
            <table className="items-table two-toned">
              <thead>
                <tr>
                  <th>DATE & TIME</th>
                  <th></th>
                  <th style={{ paddingLeft: "5px" }}>TRANSACTION ID</th>
                  <th style={{ minWidth: "500px" }}>MATERIAL</th>
                  <th>TRANSFER TYPE</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((transaction, index) => {
                  const date = new Date(transaction.created_on);
                  const formattedDate = date
                    .toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                    .toUpperCase();

                  const status = getTransferStatus(transaction);
                  const transferType = getTransferTypeLabel(transaction);

                  return (
                    <tr key={`${transaction.id}-${index}`}>
                      <td style={{ whiteSpace: "nowrap" }}>{formattedDate}</td>
                      <td style={{ padding: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "flex-end",
                          }}
                        >
                          {transaction.received === 0 && (
                            <img src={warningIcon} alt="warning" />
                          )}
                        </div>
                      </td>
                      <td style={{ paddingLeft: "5px" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                          }}
                        >
                          <span>
                            TA-{transaction.id?.toString().padStart(5, "0")}
                          </span>
                          <TransactionDetailsPopUpButton
                            transferID={transaction.id}
                            onSuccess={() => fetchAllTransactions()}
                          />
                        </div>
                      </td>
                      <td>
                        {/* Display all materials */}
                        {transaction.items && transaction.items.length > 0 ? (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "5px",
                            }}
                          >
                            {transaction.items.map(
                              (item: any, itemIndex: number) => (
                                <div
                                  key={itemIndex}
                                  style={{
                                    marginBottom: "10px",
                                    marginTop: "10px",
                                  }}
                                >
                                  {item.description}
                                </div>
                              )
                            )}
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td style={{ textTransform: "uppercase" }}>
                        {transferType}
                      </td>
                      <td>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "10px",
                          }}
                        >
                          <div
                            className="approval-pill normal-text"
                            style={{
                              backgroundColor: status.bgColor,
                              color: status.textColor,
                              textTransform: "uppercase",
                            }}
                          >
                            {status.label}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div
              style={{ textAlign: "center", padding: "40px", color: "#888" }}
            >
              {searchQuery.trim() !== ""
                ? "No transactions found matching your search"
                : "No transactions found"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
