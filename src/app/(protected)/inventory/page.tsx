"use client";

import { useEffect, useState, useRef } from "react";
import { InventoryItem } from "./types/inventoryItem";
import CreateInventoryItemButton from "./components/_CreateInventoryItemButton";
import Button from "@/app/components/Button";
import EditInventoryItemButton from "./components/_EditInventoryItemButton";
import TransferIssueMultipleStocks from "./components/_TransferIssueMultipleStocksButton";
import TransactionDetailsPopUpButton from "./[id]/components/_IssueDetailsPopUpButton";
import FilterButton from "./[id]/components/_FilterButton";
import DeleteTransferButton from "./components/_DeleteTransferButton";
import DeleteInventoryItemButton from "./[id]/components/_DeleteInventoryItemButton";

export default function Inventory() {
  const externalLinkIcon = "/icons/external-link.svg";
  const searchIcon = "/icons/search.svg";
  const warningIcon = "/icons/warning.svg";
  const noImageIcon = "/icons/no-image.jpg";
  const arrowRight = "/icons/arrow-right.svg";

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [availableQuantities, setAvailableQuantities] = useState<{
    [itemId: number]: {
      available_quantity: number;
      total_stock: number;
      total_issued: number;
    };
  }>({});
  // ✅ Add loading state
  const [isLoadingQuantities, setIsLoadingQuantities] = useState(false);

  const [activeTab, setActiveTab] = useState<"inventory" | "transfer-log">(
    "inventory",
  );
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<
    "none" | "high-low" | "low-high" | "newest-oldest" | "oldest-newest"
  >("none");
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [filters, setFilters] = useState<{
    selectedCategories: string[];
    selectedLocations: string[];
    selectedProjects: number[];
    stockAddedIn: string;
    selectedStockStatuses: string[];
  }>({
    selectedCategories: [],
    selectedLocations: [],
    selectedProjects: [],
    stockAddedIn: "all",
    selectedStockStatuses: [],
  });
  const [stocksByInventoryItem, setStocksByInventoryItem] = useState<{
    [itemId: number]: any[];
  }>({});
  const [availableProjects, setAvailableProjects] = useState<
    { id: number; name: string }[]
  >([]);
  const [transferLogTimeFilter, setTransferLogTimeFilter] =
    useState<string>("all");

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get("tab");
    const search = urlParams.get("search");

    // Set active tab if provided
    if (tab === "transfer-log") {
      setActiveTab("transfer-log");
    }

    // Set search query if provided
    if (search) {
      setSearchQuery(search);
    }

    // Clean up URL after reading parameters (optional)
    if (tab || search) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  async function getInventoryItems() {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/inventory`,
        {
          method: "GET",
        },
      );
      const data = await response.json();
      setInventory(data.data);
    } catch (error) {
      console.error("Error fetching inventory items:", error);
    }
  }

  // Fetch available quantities for all inventory items
  useEffect(() => {
    async function fetchAllQuantities() {
      if (!inventory || inventory.length === 0) {
        return;
      }

      // ✅ Set loading state to true
      setIsLoadingQuantities(true);

      try {
        const hasProjectFilter = filters.selectedProjects.length === 1;
        const hasLocationFilter = filters.selectedLocations.length === 1;

        const inventoryIds = inventory.map((item) => item.id);

        const allQuantities: {
          [itemId: number]: {
            available_quantity: number;
            total_stock: number;
            total_issued: number;
          };
        } = {};

        // ✅ Process in batches to avoid overwhelming the server
        const batchSize = 10; // Reduced batch size for parallel processing
        const batches = [];

        for (let i = 0; i < inventoryIds.length; i += batchSize) {
          batches.push(inventoryIds.slice(i, i + batchSize));
        }

        // ✅ Process batches sequentially to avoid rate limiting
        for (const batch of batches) {
          try {
            // ✅ Fetch all items in the batch in parallel
            const quantityPromises = batch.map(async (itemId) => {
              const body: any = { inventory_item_id: itemId };

              // Add filters if needed
              if (hasProjectFilter) {
                body.project_id = filters.selectedProjects[0];
              }

              if (hasLocationFilter) {
                body.location = filters.selectedLocations[0];
              }

              const response = await fetch(
                `${process.env.NEXT_PUBLIC_BASE_URL}/api/stock/getTotalQuantityByInventoryItemID`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(body),
                },
              );

              const data = await response.json();

              if (data.success && data.data) {
                return {
                  itemId,
                  quantity: data.data.available_quantity || 0,
                  total_stock: data.data.total_stock || 0,
                  total_issued: data.data.total_issued || 0,
                };
              }

              return {
                itemId,
                quantity: 0,
                total_stock: 0,
                total_issued: 0,
              };
            });

            // Wait for all requests in this batch to complete
            const results = await Promise.all(quantityPromises);

            // Aggregate results
            results.forEach((result) => {
              allQuantities[result.itemId] = {
                available_quantity: result.quantity,
                total_stock: result.total_stock,
                total_issued: result.total_issued,
              };
            });

            // ✅ Small delay between batches to prevent overwhelming the server
            await new Promise((resolve) => setTimeout(resolve, 100));
          } catch (error) {
            console.error(`Error fetching batch:`, error);
          }
        }

        setAvailableQuantities(allQuantities);
      } catch (error) {
        console.error("Error fetching available quantities:", error);
      } finally {
        // ✅ Set loading state to false when done
        setIsLoadingQuantities(false);
      }
    }

    fetchAllQuantities();
  }, [inventory, filters.selectedProjects, filters.selectedLocations]);

  useEffect(() => {
    getInventoryItems();
  }, []);

  // Fetch all stocks for filtering
  useEffect(() => {
    async function fetchAllStocks() {
      if (!inventory || inventory.length === 0) return;

      const stocksMap: { [itemId: number]: any[] } = {};

      try {
        // ✅ Batch the stock fetches
        const inventoryIds = inventory.map((item) => item.id);
        const batchSize = 100;

        for (let i = 0; i < inventoryIds.length; i += batchSize) {
          const batch = inventoryIds.slice(i, i + batchSize);

          // Fetch regular stocks for this batch
          const stocksResponse = await fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL}/api/stock/getStocksByBatch`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ inventory_item_ids: batch }),
            },
          );

          if (stocksResponse.ok) {
            const stocksData = await stocksResponse.json();

            if (stocksData.success && stocksData.data) {
              // Group stocks by inventory_item_id
              stocksData.data.forEach((stock: any) => {
                if (!stocksMap[stock.inventory_item_id]) {
                  stocksMap[stock.inventory_item_id] = [];
                }
                stocksMap[stock.inventory_item_id].push({
                  ...stock,
                  source: "stock",
                });
              });
            }
          }
        }

        // Fetch transfer/issue transactions (only once)
        const transfersResponse = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/stock/getAllTransferIssueTransactions`,
          {
            method: "GET",
          },
        );

        if (transfersResponse.ok) {
          const transfersData = await transfersResponse.json();

          if (transfersData.success && transfersData.transactions) {
            // Add transfer locations to stocksMap
            transfersData.transactions.forEach((transfer: any) => {
              if (transfer.items && Array.isArray(transfer.items)) {
                transfer.items.forEach((item: any) => {
                  if (!stocksMap[item.inventory_item_id]) {
                    stocksMap[item.inventory_item_id] = [];
                  }

                  // Add to_location as a location for this item
                  if (transfer.to_location) {
                    stocksMap[item.inventory_item_id].push({
                      inventory_item_id: item.inventory_item_id,
                      location: transfer.to_location,
                      source: "transfer",
                      transfer_id: transfer.id,
                    });
                  }
                });
              }
            });
          }
        }

        setStocksByInventoryItem(stocksMap);
      } catch (error) {
        console.error("Error fetching stocks:", error);
      }
    }

    fetchAllStocks();
  }, [inventory]);

  // Fetch projects for display
  useEffect(() => {
    async function fetchProjects() {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/stock/getAvailableProjects`,
          {
            method: "GET",
          },
        );

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.projects) {
            setAvailableProjects(data.projects);
          }
        }
      } catch (error) {
        console.error("Error fetching projects:", error);
      }
    }

    fetchProjects();
  }, []);

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
        },
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

  // ✅ Add loading status helper
  const getLoadingStatus = () => {
    return {
      label: "LOADING...",
      bgColor: "rgba(231, 231, 231, 1)",
      textColor: "rgba(107, 107, 107, 1)",
    };
  };

  // Get unique categories
  const categories = Array.from(
    new Set(inventory.map((item) => item.category_name)),
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

    // Filter by selected categories from filter
    if (filters.selectedCategories.length > 0) {
      processed = processed.filter((item) =>
        filters.selectedCategories.includes(item.category_name),
      );
    }

    // Filter by selected locations from filter (check stocks table AND transfer table)
    if (filters.selectedLocations.length > 0) {
      processed = processed.filter((item) => {
        const itemStocks = stocksByInventoryItem[item.id] || [];

        // Check if item exists in regular stocks with selected location
        const hasStockLocation = itemStocks.some((stock) =>
          filters.selectedLocations.includes(stock.location),
        );

        // If already found in stocks, return true
        if (hasStockLocation) return true;

        // Otherwise, we need to check transfers - you'll need to fetch this data
        // For now, just return hasStockLocation
        return hasStockLocation;
      });
    }

    // Filter by selected projects from filter (check stocks table)
    if (filters.selectedProjects.length > 0) {
      processed = processed.filter((item) => {
        const itemStocks = stocksByInventoryItem[item.id] || [];
        return itemStocks.some((stock) =>
          filters.selectedProjects.includes(stock.project_id),
        );
      });
    }

    // Filter by stock added in timeframe (check stocks table created_at)
    if (filters.stockAddedIn !== "all") {
      const now = new Date();
      const timeframes: { [key: string]: number } = {
        "24h": 1,
        "3d": 3,
        "7d": 7,
        "14d": 14,
        "30d": 30,
      };

      const daysAgo = timeframes[filters.stockAddedIn];
      if (daysAgo) {
        const cutoffDate = new Date(
          now.getTime() - daysAgo * 24 * 60 * 60 * 1000,
        );

        processed = processed.filter((item) => {
          const itemStocks = stocksByInventoryItem[item.id] || [];
          return itemStocks.some((stock) => {
            const createdDate = new Date(stock.created_at);
            return createdDate >= cutoffDate;
          });
        });
      }
    }

    // ✅ Filter by stock status (BEFORE other filters that depend on order)
    if (filters.selectedStockStatuses.length > 0) {
      processed = processed.filter((item) => {
        const quantityData = availableQuantities[item.id];
        const availableQty = quantityData?.available_quantity ?? 0;
        const stockStatus = getStockStatus(
          availableQty,
          item.minimum_stock_quantity,
        );

        return filters.selectedStockStatuses.includes(stockStatus.label);
      });
    }

    // Filter by active category tab
    if (activeCategory !== "ALL") {
      processed = processed.filter(
        (item) => item.category_name === activeCategory,
      );
    }

    // Filter by search query
    if (searchQuery.trim() !== "") {
      const rawQuery = searchQuery.toLowerCase().trim();
      // Remove "inv-" if user typed it
      const normalizedQuery = rawQuery.replace(/^inv-/, "");

      processed = processed.filter((item) => {
        // Search in description
        const descriptionMatch = item.description
          .toLowerCase()
          .includes(rawQuery);

        // Search in inventory ID with prefix (INV-00157, INV-157, 157)
        const formattedInventoryId = `inv-${item.id.toString().padStart(5, "0")}`;
        const inventoryIdMatch =
          formattedInventoryId.includes(rawQuery) ||
          item.id.toString().includes(normalizedQuery);

        // Search in quantity + unit (e.g., "10 NOS", "1 KG")
        const quantityData = availableQuantities[item.id];
        const availableQty = quantityData?.available_quantity ?? 0;
        const cleanQuantity = parseFloat(availableQty.toString());
        const quantityUnitString = `${cleanQuantity} ${item.unit || ""}`
          .toLowerCase()
          .trim();
        const quantityUnitMatch = quantityUnitString.includes(rawQuery);

        return descriptionMatch || inventoryIdMatch || quantityUnitMatch;
      });
    }

    // Sort by user-selected sort order
    if (sortOrder !== "none") {
      processed = [...processed].sort((a, b) => {
        if (sortOrder === "high-low" || sortOrder === "low-high") {
          const qtyA = availableQuantities[a.id]?.available_quantity ?? 0;
          const qtyB = availableQuantities[b.id]?.available_quantity ?? 0;

          if (sortOrder === "high-low") {
            return qtyB - qtyA;
          } else {
            return qtyA - qtyB;
          }
        } else if (
          sortOrder === "newest-oldest" ||
          sortOrder === "oldest-newest"
        ) {
          const dateA = new Date(a.created_at).getTime();
          const dateB = new Date(b.created_at).getTime();

          if (sortOrder === "newest-oldest") {
            return dateB - dateA;
          } else {
            return dateA - dateB;
          }
        }
        return 0;
      });
    }

    // ✅ Always sort OUT OF STOCK items to the bottom (UNLESS filtering by stock status)
    // If user is specifically filtering by OUT OF STOCK, don't push them to bottom
    if (
      filters.selectedStockStatuses.length === 0 ||
      filters.selectedStockStatuses.length > 1
    ) {
      processed = [...processed].sort((a, b) => {
        const qtyA = availableQuantities[a.id]?.available_quantity ?? 0;
        const qtyB = availableQuantities[b.id]?.available_quantity ?? 0;

        // If A is out of stock and B is not, B comes first
        if (qtyA === 0 && qtyB !== 0) return 1;
        // If B is out of stock and A is not, A comes first
        if (qtyB === 0 && qtyA !== 0) return -1;

        // If both have stock or both out of stock, maintain existing sort order
        return 0;
      });
    }

    return processed;
  };

  const processedInventory = getProcessedInventory();

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
          label: "PENDING",
          bgColor: "rgba(255, 242, 196, 1)",
          textColor: "rgba(180, 98, 10, 1)",
        };
      }
      if (transaction.type?.toLowerCase().includes("issue")) {
        return {
          label: "PENDING",
          bgColor: "rgba(255, 242, 196, 1)",
          textColor: "rgba(180, 98, 10, 1)",
        };
      }
      if (transaction.type?.toLowerCase().includes("transfer")) {
        return {
          label: "PENDING",
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

  const getFilteredTransactions = () => {
    let filtered = allTransactions;

    // Apply time filter
    if (transferLogTimeFilter !== "all") {
      const now = new Date();
      const timeframes: { [key: string]: number } = {
        "24h": 1,
        "3d": 3,
        "7d": 7,
        "14d": 14,
        "30d": 30,
        "90d": 90,
      };

      const daysAgo = timeframes[transferLogTimeFilter];
      if (daysAgo) {
        const cutoffDate = new Date(
          now.getTime() - daysAgo * 24 * 60 * 60 * 1000,
        );

        filtered = filtered.filter((transaction) => {
          const transactionDate = new Date(transaction.created_on);
          return transactionDate >= cutoffDate;
        });
      }
    }

    // Apply search filter
    if (searchQuery.trim() !== "") {
      const rawQuery = searchQuery.toLowerCase().trim();
      // Remove "ta-" if user typed it
      const normalizedQuery = rawQuery.replace(/^ta-/, "");

      filtered = filtered.filter((transaction) => {
        // Search in materials
        const materialMatch = transaction.items?.some((item: any) =>
          item.description?.toLowerCase().includes(rawQuery),
        );

        // Search in locations
        const locationMatch =
          transaction.from_location?.toLowerCase().includes(rawQuery) ||
          transaction.to_location?.toLowerCase().includes(rawQuery);

        // Search in transaction ID (TA-00018, TA-018, 18)
        const formattedTransactionId = `ta-${transaction.id
          ?.toString()
          .padStart(5, "0")}`;
        const transactionIdMatch =
          formattedTransactionId.includes(rawQuery) ||
          transaction.id?.toString().includes(normalizedQuery);

        // Search in project name
        const projectMatch = transaction.project_name
          ?.toLowerCase()
          .includes(rawQuery);

        // ✅ Search in quantity + unit (e.g., "1 NOS", "5 KG")
        const quantityUnitMatch = transaction.items?.some((item: any) => {
          const cleanQuantity = parseFloat(item.quantity);
          const quantityUnitString = `${cleanQuantity} ${item.unit || ""}`
            .toLowerCase()
            .trim();
          return quantityUnitString.includes(rawQuery);
        });

        return (
          materialMatch ||
          locationMatch ||
          transactionIdMatch ||
          projectMatch ||
          quantityUnitMatch
        );
      });
    }

    return filtered;
  };

  const filteredTransactions = getFilteredTransactions();

  // Helper function to get stock added label
  const getStockAddedLabel = (value: string) => {
    const labels: { [key: string]: string } = {
      all: "All Times",
      "24h": "Last 24 hours",
      "3d": "Last 3 days",
      "7d": "Last 7 days",
      "14d": "Last 14 days",
      "30d": "Last 30 days",
    };
    return labels[value] || value;
  };

  // Reset all filters
  const resetAllFilters = () => {
    setFilters({
      selectedCategories: [],
      selectedLocations: [],
      selectedProjects: [],
      stockAddedIn: "all",
      selectedStockStatuses: [],
    });
  };

  // Check if any filters are active
  const hasActiveFilters =
    filters.selectedCategories.length > 0 ||
    filters.selectedLocations.length > 0 ||
    filters.selectedProjects.length > 0 ||
    filters.stockAddedIn !== "all" ||
    filters.selectedStockStatuses.length > 0;

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
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <Button
            componentType={"button"}
            bgColor={activeTab === "inventory" ? "black" : "transparent"}
            borderColor={"black"}
            textColor={activeTab === "inventory" ? "white" : "black"}
            onClick={() => setActiveTab("inventory")}
            style={{
              padding: "7px 20px",
              borderRadius: "25px",
            }}
          >
            INVENTORY
          </Button>

          <Button
            componentType={"button"}
            bgColor={activeTab === "transfer-log" ? "black" : "transparent"}
            borderColor={"black"}
            textColor={activeTab === "transfer-log" ? "white" : "black"}
            onClick={() => setActiveTab("transfer-log")}
            style={{
              padding: "7px 20px",
              borderRadius: "25px",
            }}
          >
            TRANSFER LOG
          </Button>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          {activeTab === "transfer-log" && (
            <select
              value={transferLogTimeFilter}
              onChange={(e) => setTransferLogTimeFilter(e.target.value)}
              style={{
                padding: "10px 15px",
                borderRadius: "50px",
                border: "1px solid rgba(223, 223, 223, 1)",
                backgroundColor: "white",
                cursor: "pointer",
              }}
            >
              <option value="all">All Time</option>
              <option value="24h">Last 24 Hours</option>
              <option value="3d">Last 3 Days</option>
              <option value="7d">Last 7 Days</option>
              <option value="14d">Last 14 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
          )}

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
        </div>
      </div>

      <br />

      {activeTab === "inventory" && (
        <>
          {/* Category Tabs with Scroll */}
          <div className="category-grid" style={{ position: "relative" }}>
            {/* Left Fade Gradient */}
            {showLeftArrow && (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: "300px",
                  background:
                    "linear-gradient(to right, #f8f9fb 0%, rgba(255, 255, 255, 0) 100%)",
                  pointerEvents: "none",
                  zIndex: 5,
                }}
              />
            )}

            {/* Left Arrow Button */}
            {showLeftArrow && (
              <button
                onClick={() => scroll("left")}
                style={{
                  position: "absolute",
                  left: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  zIndex: 10,
                  backgroundColor: "black",
                  color: "white",
                  border: "none",
                  borderRadius: "10px",
                  width: "40px",
                  height: "40px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <img
                  src={arrowRight}
                  style={{ transform: "rotate(-180deg)" }}
                  alt="scroll left"
                />
              </button>
            )}

            <div
              ref={scrollContainerRef}
              onScroll={checkScroll}
              style={{
                overflowX: "auto",
                scrollbarWidth: "none",
                msOverflowStyle: "none",
              }}
            >
              <style jsx>{`
                div::-webkit-scrollbar {
                  display: none;
                }
              `}</style>
              <div style={{ display: "flex", gap: "1px" }}>
                <button
                  className={`item ${activeCategory === "ALL" ? "active" : ""}`}
                  onClick={() => setActiveCategory("ALL")}
                  style={{ flexShrink: 0, textTransform: "uppercase" }}
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
                    style={{ flexShrink: 0, textTransform: "uppercase" }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <span>{category.toUpperCase()}</span>
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

            {/* Right Fade Gradient */}
            {showRightArrow && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: 0,
                  bottom: 0,
                  width: "300px",
                  background:
                    "linear-gradient(to left, #f8f9fb 0%, rgba(255, 255, 255, 0) 100%)",
                  pointerEvents: "none",
                  zIndex: 5,
                }}
              />
            )}

            {/* Right Arrow Button */}
            {showRightArrow && (
              <button
                onClick={() => scroll("right")}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  zIndex: 10,
                  backgroundColor: "black",
                  borderRadius: "10px",
                  color: "white",
                  border: "none",
                  width: "40px",
                  height: "40px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <img src={arrowRight} alt="scroll right" />
              </button>
            )}
          </div>

          <br />

          {activeTab === "inventory" && (
            <div style={{ display: "flex", gap: "10px" }}>
              <div style={{ display: "flex", gap: "10px" }}>
                <select
                  value={sortOrder}
                  onChange={(e) =>
                    setSortOrder(
                      e.target.value as
                        | "none"
                        | "high-low"
                        | "low-high"
                        | "newest-oldest"
                        | "oldest-newest",
                    )
                  }
                  style={{
                    padding: "10px 15px",
                    borderRadius: "50px",
                    border: "1px solid rgba(223, 223, 223, 1)",
                    backgroundColor: "white",
                    cursor: "pointer",
                  }}
                >
                  <option value="none">Sort by stock</option>
                  <option value="high-low">Highest - Lowest</option>
                  <option value="low-high">Lowest - Highest</option>
                  <option value="newest-oldest">Newest - Oldest</option>
                  <option value="oldest-newest">Oldest - Newest</option>
                </select>

                <FilterButton
                  categories={categories}
                  onApplyFilters={setFilters}
                  currentFilters={filters}
                />
              </div>

              {hasActiveFilters && (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "10px",
                    alignItems: "center",
                  }}
                >
                  {/* Subcategory Filters */}
                  {filters.selectedCategories.length > 0 && (
                    <Button
                      style={{
                        borderRadius: "50px",
                        fontWeight: 600,
                      }}
                      componentType={"none"}
                      bgColor={"rgba(239, 239, 239, 1)"}
                      borderColor={"transparent"}
                      textColor={"black"}
                    >
                      SUBCATEGORY:{" "}
                      <span
                        style={{
                          color: "rgba(16, 185, 129, 1)",
                        }}
                      >
                        {filters.selectedCategories[0].toUpperCase()}
                        {filters.selectedCategories.length > 1 &&
                          `, +${filters.selectedCategories.length - 1} MORE`}
                      </span>
                    </Button>
                  )}

                  {/* Stock Added Filter */}
                  {filters.stockAddedIn !== "all" && (
                    <Button
                      style={{
                        borderRadius: "50px",
                        fontWeight: "600",
                      }}
                      componentType={"none"}
                      bgColor={"rgba(239, 239, 239, 1)"}
                      borderColor={"transparent"}
                      textColor={"black"}
                    >
                      STOCK ADDED IN:{" "}
                      <span
                        style={{
                          color: "rgba(16, 185, 129, 1)",
                        }}
                      >
                        {getStockAddedLabel(filters.stockAddedIn).toUpperCase()}
                      </span>
                    </Button>
                  )}

                  {filters.selectedStockStatuses.length > 0 && (
                    <Button
                      style={{
                        borderRadius: "50px",
                        fontWeight: "600",
                      }}
                      componentType={"none"}
                      bgColor={"rgba(239, 239, 239, 1)"}
                      borderColor={"transparent"}
                      textColor={"black"}
                    >
                      STATUS:{" "}
                      <span style={{ color: "rgba(16, 185, 129, 1)" }}>
                        {filters.selectedStockStatuses[0]}
                        {filters.selectedStockStatuses.length > 1 &&
                          `, +${filters.selectedStockStatuses.length - 1} MORE`}
                      </span>
                    </Button>
                  )}

                  {/* Project Filters */}
                  {filters.selectedProjects.length > 0 && (
                    <Button
                      style={{
                        borderRadius: "50px",
                        fontWeight: "600",
                      }}
                      componentType={"none"}
                      bgColor={"rgba(239, 239, 239, 1)"}
                      borderColor={"transparent"}
                      textColor={"black"}
                    >
                      PROJECT:{" "}
                      <span style={{ color: "rgba(16, 185, 129, 1)" }}>
                        {(() => {
                          const firstProject = availableProjects.find(
                            (p) => p.id === filters.selectedProjects[0],
                          );
                          return firstProject
                            ? firstProject.name.toUpperCase()
                            : "UNKNOWN";
                        })()}
                        {filters.selectedProjects.length > 1 &&
                          `, +${filters.selectedProjects.length - 1} MORE`}
                      </span>
                    </Button>
                  )}

                  {/* Location Filters */}
                  {filters.selectedLocations.length > 0 && (
                    <Button
                      style={{
                        borderRadius: "50px",
                        fontWeight: "600",
                      }}
                      componentType={"none"}
                      bgColor={"rgba(239, 239, 239, 1)"}
                      borderColor={"transparent"}
                      textColor={"black"}
                    >
                      LOCATION:{" "}
                      <span style={{ color: "rgba(16, 185, 129, 1)" }}>
                        {filters.selectedLocations[0].toUpperCase()}
                        {filters.selectedLocations.length > 1 &&
                          `, +${filters.selectedLocations.length - 1} MORE`}
                      </span>
                    </Button>
                  )}

                  {/* Reset Filter Button */}
                  <Button
                    onClick={resetAllFilters}
                    componentType={"button"}
                    bgColor={"transparent"}
                    borderColor={"transparent"}
                    textColor={"black"}
                    style={{ padding: "0px" }}
                  >
                    RESET FILTER
                  </Button>
                </div>
              )}
            </div>
          )}

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

                    // ✅ Show loading status if still fetching quantities
                    const stockStatus = isLoadingQuantities
                      ? getLoadingStatus()
                      : getStockStatus(
                          availableQty,
                          item.minimum_stock_quantity,
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

                        <td>
                          {/* ✅ Show loading or actual quantity */}
                          {isLoadingQuantities ? (
                            <span style={{ color: "rgba(107, 107, 107, 1)" }}>
                              Loading...
                            </span>
                          ) : (
                            `${availableQty} ${item.unit || ""}`
                          )}
                        </td>
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

                            {/* ✅ Only show delete button if not loading and qty is 0 */}
                            {!isLoadingQuantities && availableQty === 0 && (
                              <DeleteInventoryItemButton inventoryItem={item} />
                            )}

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
                {searchQuery.trim() !== "" ||
                filters.selectedCategories.length > 0 ||
                filters.selectedLocations.length > 0 ||
                filters.selectedProjects.length > 0 ||
                filters.stockAddedIn !== "all"
                  ? "No items found matching your filters"
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
                  <th></th>
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
                              ),
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
                      <td>
                        <DeleteTransferButton
                          transaction={transaction}
                          onSuccess={() => fetchAllTransactions()}
                        />
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
