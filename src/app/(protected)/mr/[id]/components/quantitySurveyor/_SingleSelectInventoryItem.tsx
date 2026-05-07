"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { InventoryItem } from "@/app/(protected)/inventory/types/inventoryItem";
import FormPopUp from "@/app/components/FormPopup";

type Props = {
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onConfirm: (inventoryItemId: number) => void;
  initialSearchQuery?: string;
};

type QuantityData = {
  available_quantity: number;
  total_stock: number;
  total_issued: number;
};

export default function SingleSelectInventoryItem({
  setIsOpen,
  onConfirm,
  initialSearchQuery,
}: Props) {
  const searchIcon = "/icons/search.svg";
  const noImageIcon = "/icons/no-image.jpg";
  const arrowRight = "/icons/arrow-right.svg";

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [quantities, setQuantities] = useState<{
    [itemId: number]: QuantityData;
  }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingQty, setIsLoadingQty] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery || "");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [sortOrder, setSortOrder] = useState<
    "none" | "high-low" | "low-high" | "newest-oldest" | "oldest-newest"
  >("none");

  // Category scroll
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    fetchInventory();
  }, []);

  async function fetchInventory() {
    setIsLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/inventory`,
      );
      const data = await res.json();
      if (data.success) {
        setInventory(data.data);
      }
    } catch {
      console.error("Failed to fetch inventory");
    }
    setIsLoading(false);
  }

  // Fetch quantities for current page items
  useEffect(() => {
    if (paginatedItems.length === 0) return;
    fetchQuantities(paginatedItems.map((i) => i.id));
  }, [currentPage, searchQuery, activeCategory, sortOrder, inventory]);

  async function fetchQuantities(itemIds: number[]) {
    setIsLoadingQty(true);
    try {
      const promises = itemIds.map((id) =>
        fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/stock/getTotalQuantityByInventoryItemID`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ inventory_item_id: id }),
          },
        ).then((r) => r.json()),
      );

      const results = await Promise.all(promises);
      const newQuantities: { [id: number]: QuantityData } = {};
      results.forEach((result, index) => {
        if (result.success) {
          newQuantities[itemIds[index]] = {
            available_quantity: result.data.available_quantity,
            total_stock: result.data.total_stock,
            total_issued: result.data.total_issued,
          };
        }
      });

      setQuantities((prev) => ({ ...prev, ...newQuantities }));
    } catch {
      console.error("Failed to fetch quantities");
    }
    setIsLoadingQty(false);
  }

  // Category scroll handlers
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

  useEffect(() => {
    checkScroll();
  }, [inventory]);

  // Get unique categories
  const categories = useMemo(() => {
    return Array.from(new Set(inventory.map((i) => i.category_name))).sort();
  }, [inventory]);

  const getCategoryCount = (category: string) => {
    return inventory.filter((item) => item.category_name === category).length;
  };

  // Filtered + sorted items
  const filteredItems = useMemo(() => {
    let items = [...inventory];

    // Category filter
    if (activeCategory !== "ALL") {
      items = items.filter((i) => i.category_name === activeCategory);
    }

    // Search filter (matching inventory page logic)
    if (searchQuery.trim() !== "") {
      const rawQuery = searchQuery.toLowerCase().trim();
      const normalizedQuery = rawQuery.replace(/^inv-/, "");

      items = items.filter((item) => {
        const descriptionMatch = item.description
          .toLowerCase()
          .includes(rawQuery);

        const formattedInventoryId = `inv-${item.id.toString().padStart(5, "0")}`;
        const inventoryIdMatch =
          formattedInventoryId.includes(rawQuery) ||
          item.id.toString().includes(normalizedQuery);

        return descriptionMatch || inventoryIdMatch;
      });
    }

    // Sort
    if (sortOrder === "newest-oldest" || sortOrder === "oldest-newest") {
      items.sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return sortOrder === "newest-oldest" ? dateB - dateA : dateA - dateB;
      });
    } else if (sortOrder === "high-low" || sortOrder === "low-high") {
      items.sort((a, b) => {
        const qtyA = quantities[a.id]?.available_quantity ?? 0;
        const qtyB = quantities[b.id]?.available_quantity ?? 0;
        return sortOrder === "high-low" ? qtyB - qtyA : qtyA - qtyB;
      });
    }

    return items;
  }, [inventory, activeCategory, searchQuery, sortOrder, quantities]);

  // Pagination
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeCategory, sortOrder]);

  function getStockStatus(availableQty: number, minimumStock: number) {
    if (availableQty === 0) {
      return {
        label: "EMPTY STOCK",
        bgColor: "rgba(255, 181, 181, 1)",
        textColor: "rgba(248, 77, 77, 1)",
      };
    }
    if (availableQty <= minimumStock) {
      return {
        label: "LOW STOCK",
        bgColor: "rgba(255, 250, 189, 1)",
        textColor: "rgba(134, 83, 47, 1)",
      };
    }
    return {
      label: "IN-STOCK",
      bgColor: "rgba(149, 222, 189, 1)",
      textColor: "rgba(0, 108, 60, 1)",
    };
  }

  // Pagination page numbers (matching inventory page pattern)
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      }
    }

    return pages;
  };

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedId) {
      onConfirm(selectedId);
    }
  }

  return (
    <FormPopUp
      header={"SELECT INVENTORY ITEM"}
      setIsOpen={setIsOpen}
      handleSubmit={handleSubmit}
      addButtonLabel={"CONFIRM"}
      style={{ minWidth: "85dvw", minHeight: "90dvh" }}
    >
      {/* Hidden required input driven by selectedId for form validity */}
      <input
        type="text"
        value={selectedId ? String(selectedId) : ""}
        required
        onChange={() => {}}
        style={{
          position: "absolute",
          opacity: 0,
          width: 0,
          height: 0,
          pointerEvents: "none",
        }}
        tabIndex={-1}
      />

      {/* Category Tabs with Scroll */}
      <div
        className="category-grid"
        style={{
          position: "relative",
          maxWidth: "900px",
        }}
      >
        {showLeftArrow && (
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: "200px",
              background:
                "linear-gradient(to right, white 0%, rgba(255, 255, 255, 0) 100%)",
              pointerEvents: "none",
              zIndex: 5,
            }}
          />
        )}

        {showLeftArrow && (
          <button
            type="button"
            onClick={() => scroll("left")}
            style={{
              position: "absolute",
              left: "0px",
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 10,
              backgroundColor: "black",
              color: "white",
              border: "none",
              borderRadius: "10px",
              width: "35px",
              height: "35px",
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
              type="button"
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
                type="button"
                key={category}
                className={`item ${activeCategory === category ? "active" : ""}`}
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

        {showRightArrow && (
          <div
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              bottom: 0,
              width: "200px",
              background:
                "linear-gradient(to left, white 0%, rgba(255, 255, 255, 0) 100%)",
              pointerEvents: "none",
              zIndex: 5,
            }}
          />
        )}

        {showRightArrow && (
          <button
            type="button"
            onClick={() => scroll("right")}
            style={{
              position: "absolute",
              right: "0px",
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 10,
              backgroundColor: "black",
              borderRadius: "10px",
              color: "white",
              border: "none",
              width: "35px",
              height: "35px",
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

      {/* Sort + Search Row */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          paddingTop: "20px",
          marginTop: "15px",
          borderTop: "1px solid rgba(207, 207, 207, 1)",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "10px",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
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
                backgroundColor: "white",
                cursor: "pointer",
                border: "1px solid rgba(241, 244, 246, 1)",
              }}
            >
              <option value="none">SORT BY STOCK STATUS</option>
              <option value="high-low">SORT BY HIGHEST TO LOWEST STOCK</option>
              <option value="low-high">SORT BY LOWEST TO HIGHEST STOCK</option>
              <option value="newest-oldest">
                SORT BY NEWEST TO OLDEST ITEMS
              </option>
              <option value="oldest-newest">
                SORT BY OLDEST TO NEWEST ITEMS
              </option>
            </select>
          </div>

          <div
            style={{
              maxWidth: "300px",
              backgroundColor: "white",
              position: "relative",
            }}
          >
            <input
              type="text"
              placeholder="SEARCH"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "300px",
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

      {/* Table */}
      <div style={{ overflow: "auto" }}>
        {isLoading ? (
          <div
            style={{
              padding: "40px",
              textAlign: "center",
              color: "#888",
            }}
          >
            Loading inventory...
          </div>
        ) : filteredItems.length === 0 ? (
          <div
            style={{
              padding: "40px",
              textAlign: "center",
              color: "#888",
            }}
          >
            {searchQuery.trim() !== ""
              ? "No items found matching your search"
              : "No items found in this category"}
          </div>
        ) : (
          <table className="items-table alt">
            <thead>
              <tr>
                <th></th>
                <th>ITEM NUMBER</th>
                <th>MATERIAL</th>
                <th>TOTAL QTY</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.map((item) => {
                const qty = quantities[item.id];
                const availableQty = qty?.available_quantity ?? 0;
                const stockStatus = getStockStatus(
                  availableQty,
                  item.minimum_stock_quantity,
                );

                return (
                  <tr
                    key={item.id}
                    style={{
                      cursor: "pointer",
                      backgroundColor:
                        selectedId === item.id
                          ? "rgba(34, 150, 100, 0.08)"
                          : "transparent",
                    }}
                    onClick={() => setSelectedId(item.id)}
                  >
                    <td>
                      <input
                        type="radio"
                        name="inventory-select"
                        checked={selectedId === item.id}
                        onChange={() => setSelectedId(item.id)}
                        style={{ cursor: "pointer" }}
                      />
                    </td>
                    <td style={{ whiteSpace: "nowrap", fontWeight: "600" }}>
                      INV-{String(item.id).padStart(5, "0")}
                    </td>
                    <td style={{ fontWeight: "600" }}>
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
                    <td style={{ fontWeight: "600" }}>
                      {isLoadingQty && qty === undefined ? (
                        <span style={{ color: "#888" }}>Loading...</span>
                      ) : (
                        `${availableQty} ${item.unit || ""}`
                      )}
                    </td>
                    <td>
                      {isLoadingQty && qty === undefined ? (
                        <div
                          className="approval-pill normal-text"
                          style={{
                            backgroundColor: "rgba(231, 231, 231, 1)",
                            color: "rgba(107, 107, 107, 1)",
                          }}
                        >
                          LOADING...
                        </div>
                      ) : (
                        <div
                          className="approval-pill normal-text"
                          style={{
                            backgroundColor: stockStatus.bgColor,
                            color: stockStatus.textColor,
                            fontWeight: "normal",
                          }}
                        >
                          {stockStatus.label}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "10px",
            marginTop: "20px",
          }}
        >
          <button
            type="button"
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
            style={{
              padding: "8px 12px",
              borderRadius: "5px",
              border: "1px solid rgba(223, 223, 223, 1)",
              backgroundColor: "white",
              color: "black",
              cursor: currentPage === 1 ? "not-allowed" : "pointer",
              fontWeight: "600",
              minWidth: "40px",
              opacity: currentPage === 1 ? 0.4 : 1,
            }}
          >
            ‹
          </button>

          {getPageNumbers().map((page, index) => (
            <button
              type="button"
              key={index}
              onClick={() => typeof page === "number" && setCurrentPage(page)}
              disabled={page === "..."}
              style={{
                padding: "8px 12px",
                borderRadius: "5px",
                border: "1px solid rgba(223, 223, 223, 1)",
                backgroundColor:
                  page === currentPage
                    ? "black"
                    : page === "..."
                      ? "transparent"
                      : "white",
                color: page === currentPage ? "white" : "black",
                cursor: page === "..." ? "default" : "pointer",
                fontWeight: "600",
                minWidth: "40px",
              }}
            >
              {page}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            style={{
              padding: "8px 12px",
              borderRadius: "5px",
              border: "1px solid rgba(223, 223, 223, 1)",
              backgroundColor: "white",
              color: "black",
              cursor: currentPage === totalPages ? "not-allowed" : "pointer",
              fontWeight: "600",
              minWidth: "40px",
              opacity: currentPage === totalPages ? 0.4 : 1,
            }}
          >
            ›
          </button>
        </div>
      )}
    </FormPopUp>
  );
}
