"use client";

import FormPopUp from "@/app/components/FormPopup";
import { useEffect, useState, useMemo, useRef } from "react";
import { MrLine } from "../types/mrLine";
import { JoLine } from "../types/joLine";
import Button from "@/app/components/Button";
import { MrHeader } from "../types/mrHeader";
import { useAuth } from "@/app/context/AuthContext";
import DownloadBoqButton from "@/app/(protected)/project/[id]/boq/[boqId]/components/manager/_DownloadBoqButton";

type BoqReferencePopUpProps = {
  mrHeader: MrHeader;
  item: MrLine | JoLine;
};

type BoqItemDetail = {
  id: number;
  item_number: string;
  item_name: string;
  item_description?: string;
  location?: string;
  scope_of_work?: string;
  quantity: number;
  unit: string;
  rate_per_quantity: number;
  total_cost: number;
  attachments?: string;
  boq_header_id: number;
  category: string;
  sub_category: string;
  category_number: number;
  subcategory_number: number;
};

// Grouped by category only for tabs and summary
type GroupedByCategory = {
  [category: string]: {
    category_number: number;
    boq_header_id: number;
    items: BoqItemDetail[];
    totalPrice: number;
    subCategories: string[];
  };
};

// Grouped by category.subcategory for ALL view
type GroupedBySubCategory = {
  [key: string]: {
    category: string;
    sub_category: string;
    category_number: number;
    subcategory_number: number;
    boq_header_id: number;
    items: BoqItemDetail[];
    totalPrice: number;
  };
};

// Helper function to format quantity without trailing zeroes
const formatQuantity = (quantity: number): string => {
  if (quantity === null || quantity === undefined) return "-";
  if (Number.isInteger(quantity)) return quantity.toString();
  return parseFloat(quantity.toString()).toString();
};

// Transform BoqItemDetail[] to GroupedBoqLines format for DownloadBoqButton
const transformToGroupedBoqLines = (items: BoqItemDetail[]): any => {
  const grouped: any = {};

  items.forEach((item) => {
    if (!grouped[item.category]) {
      grouped[item.category] = {};
    }
    if (!grouped[item.category][item.sub_category]) {
      grouped[item.category][item.sub_category] = [];
    }

    // Transform BoqItemDetail to match BoqLine structure expected by DownloadBoqButton
    const boqLine: any = {
      id: item.id,
      item_number: item.item_number,
      item_name: item.item_name,
      item_description: item.item_description,
      location: item.location,
      scope_of_work: item.scope_of_work,
      quantity: item.quantity,
      unit: item.unit,
      rate_per_quantity: item.rate_per_quantity,
      total_cost: item.total_cost,
      attachments: item.attachments,
      boq_id: item.boq_header_id,
      category: item.category,
      sub_category: item.sub_category,
      category_number: item.category_number,
      subcategory_number: item.subcategory_number,
    };

    grouped[item.category][item.sub_category].push(boqLine);
  });

  return grouped;
};

// Create a minimal boqHeader from mrHeader and items
const createBoqHeaderFromData = (
  mrHeader: MrHeader,
  items: BoqItemDetail[],
): any => {
  if (items.length === 0) return {};

  // Use the first item's boq_header_id to create a minimal header
  return {
    id: items[0]?.boq_header_id || 0,
    project_id: mrHeader.project_id,
    name: items[0]?.item_name || "BOQ Reference",
    boq_date: new Date().toISOString(),
    currency: "AED",
    project_name: mrHeader.project_name,
  };
};

export default function BoqReferencePopUp({
  item,
  mrHeader,
}: BoqReferencePopUpProps) {
  const { userInfo } = useAuth();

  const externalLinkIcon = "/icons/external-link.svg";
  const locationIcon = "/icons/location-boq.svg";
  const arrowRight = "/icons/arrow-right.svg";
  const searchIcon = "/icons/search.svg";

  const [isOpen, setIsOpen] = useState(false);
  const [boqItems, setBoqItems] = useState<BoqItemDetail[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Fetch BOQ items
  useEffect(() => {
    if (!isOpen || !item.boq_line_ids || !mrHeader.project_id) return;

    setIsLoading(true);

    const boqIdsArray = item.boq_line_ids
      .split(",")
      .map((id: string) => parseInt(id.trim()))
      .filter((id: number) => !isNaN(id));

    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/boq/getAllBoqLinesWithNumberRef`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: mrHeader.project_id }),
      },
    )
      .then((res) => res.json())
      .then((allBoqLines) => {
        const filteredItems = allBoqLines
          .filter((boqLine: any) => boqIdsArray.includes(boqLine.id))
          .map((boqLine: any) => ({
            id: boqLine.id,
            item_number: boqLine.item_number,
            item_name: boqLine.item_name,
            item_description: boqLine.item_description,
            location: boqLine.location,
            scope_of_work: boqLine.scope_of_work,
            quantity: boqLine.quantity,
            unit: boqLine.unit,
            rate_per_quantity: boqLine.rate_per_quantity,
            total_cost: boqLine.total_cost,
            attachments: boqLine.attachments,
            boq_header_id: boqLine.boq_id,
            category: boqLine.category,
            sub_category: boqLine.sub_category,
            category_number: boqLine.category_number,
            subcategory_number: boqLine.subcategory_number,
          }));

        setBoqItems(filteredItems);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching BOQ items:", error);
        setIsLoading(false);
      });
  }, [isOpen, item.boq_line_ids, mrHeader.project_id]);

  // Group by category only (for tabs and summary)
  const groupedByCategory = useMemo(() => {
    const grouped: GroupedByCategory = {};

    boqItems.forEach((boqItem) => {
      const catKey = boqItem.category;

      if (!grouped[catKey]) {
        grouped[catKey] = {
          category_number: boqItem.category_number,
          boq_header_id: boqItem.boq_header_id,
          items: [],
          totalPrice: 0,
          subCategories: [],
        };
      }

      grouped[catKey].items.push(boqItem);
      grouped[catKey].totalPrice += boqItem.total_cost || 0;

      if (!grouped[catKey].subCategories.includes(boqItem.sub_category)) {
        grouped[catKey].subCategories.push(boqItem.sub_category);
      }
    });

    return Object.entries(grouped)
      .sort(([, a], [, b]) => a.category_number - b.category_number)
      .reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {} as GroupedByCategory);
  }, [boqItems]);

  // Group by category.subcategory (for ALL view display)
  const groupedBySubCategory = useMemo(() => {
    const grouped: GroupedBySubCategory = {};

    boqItems.forEach((boqItem) => {
      const key = `${boqItem.category_number}.${boqItem.subcategory_number}`;

      if (!grouped[key]) {
        grouped[key] = {
          category: boqItem.category,
          sub_category: boqItem.sub_category,
          category_number: boqItem.category_number,
          subcategory_number: boqItem.subcategory_number,
          boq_header_id: boqItem.boq_header_id,
          items: [],
          totalPrice: 0,
        };
      }

      grouped[key].items.push(boqItem);
      grouped[key].totalPrice += boqItem.total_cost || 0;
    });

    return Object.entries(grouped)
      .sort(([, a], [, b]) => {
        if (a.category_number !== b.category_number) {
          return a.category_number - b.category_number;
        }
        return a.subcategory_number - b.subcategory_number;
      })
      .reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {} as GroupedBySubCategory);
  }, [boqItems]);

  // Filter based on search
  const filteredByCategory = useMemo(() => {
    if (!searchQuery.trim()) return groupedByCategory;

    const query = searchQuery.toLowerCase();
    const filtered: GroupedByCategory = {};

    Object.entries(groupedByCategory).forEach(([category, group]) => {
      const matchingItems = group.items.filter((item) => {
        return (
          item.item_number?.toLowerCase().includes(query) ||
          item.item_name?.toLowerCase().includes(query) ||
          item.item_description?.toLowerCase().includes(query) ||
          item.location?.toLowerCase().includes(query)
        );
      });

      if (matchingItems.length > 0) {
        filtered[category] = {
          ...group,
          items: matchingItems,
          totalPrice: matchingItems.reduce(
            (sum, item) => sum + (item.total_cost || 0),
            0,
          ),
          subCategories: [
            ...new Set(matchingItems.map((item) => item.sub_category)),
          ],
        };
      }
    });

    return filtered;
  }, [groupedByCategory, searchQuery]);

  const filteredBySubCategory = useMemo(() => {
    if (!searchQuery.trim()) return groupedBySubCategory;

    const query = searchQuery.toLowerCase();
    const filtered: GroupedBySubCategory = {};

    Object.entries(groupedBySubCategory).forEach(([key, group]) => {
      const matchingItems = group.items.filter((item) => {
        return (
          item.item_number?.toLowerCase().includes(query) ||
          item.item_name?.toLowerCase().includes(query) ||
          item.item_description?.toLowerCase().includes(query) ||
          item.location?.toLowerCase().includes(query)
        );
      });

      if (matchingItems.length > 0) {
        filtered[key] = {
          ...group,
          items: matchingItems,
          totalPrice: matchingItems.reduce(
            (sum, item) => sum + (item.total_cost || 0),
            0,
          ),
        };
      }
    });

    return filtered;
  }, [groupedBySubCategory, searchQuery]);

  const categoryKeys = Object.keys(filteredByCategory);
  const subCategoryKeys = Object.keys(filteredBySubCategory);

  const activeCategoryData =
    activeCategory !== "ALL" && activeCategory !== "SUMMARY"
      ? filteredByCategory[activeCategory]
      : null;

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
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -300 : 300,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [categoryKeys]);

  // Calculate grand total
  const grandTotal = useMemo(() => {
    return Object.values(filteredByCategory).reduce(
      (sum, group) => sum + group.totalPrice,
      0,
    );
  }, [filteredByCategory]);

  const canSeePrice =
    userInfo?.departmentID === 8 ||
    userInfo?.departmentID === 12 ||
    userInfo?.departmentID === 10 ||
    userInfo?.departmentID === 16;

  // Helper for alternating row background
  const getRowBgColor = (index: number): string => {
    return index % 2 === 0 ? "white" : "rgba(246, 246, 246, 1)";
  };

  // Transform boqItems for DownloadBoqButton - use filtered items based on current view
  const downloadBoqLines = useMemo(() => {
    let itemsToDownload: BoqItemDetail[] = [];

    if (activeCategory === "ALL") {
      // Use all filtered items
      itemsToDownload = Object.values(filteredBySubCategory).flatMap(
        (group) => group.items,
      );
    } else if (activeCategory === "SUMMARY") {
      // Use all filtered items from all categories
      itemsToDownload = Object.values(filteredByCategory).flatMap(
        (group) => group.items,
      );
    } else if (activeCategoryData) {
      // Use items from selected category
      itemsToDownload = activeCategoryData.items;
    }

    return transformToGroupedBoqLines(itemsToDownload);
  }, [
    activeCategory,
    activeCategoryData,
    filteredByCategory,
    filteredBySubCategory,
  ]);

  // Create boqHeader for download
  const downloadBoqHeader = useMemo(() => {
    return createBoqHeaderFromData(mrHeader, boqItems);
  }, [mrHeader, boqItems]);

  // Get item name for download
  const itemName = useMemo(() => {
    return (
      (item as any).material_description ||
      (item as any).description ||
      "Unknown"
    );
  }, [item]);

  return (
    <>
      <Button
        componentType={"button"}
        bgColor={"rgba(239, 239, 239, 1)"}
        borderColor={"rgba(223, 223, 223, 1)"}
        textColor={"black"}
        onClick={(e) => {
          e.preventDefault();
          setIsOpen(true);
          setActiveCategory("ALL");
          setSearchQuery("");
        }}
        style={{ padding: "7px 7px" }}
      >
        <img src={externalLinkIcon} alt="external link icon" />
      </Button>

      {isOpen && (
        <FormPopUp
          header="BILL OF QUANTITY REFERENCE"
          setIsOpen={setIsOpen}
          style={{
            whiteSpace: "pre-wrap",
            minWidth: "1500px",
            minHeight: "85dvh",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            {/* Search Bar */}
            <div
              style={{
                position: "relative",
                flex: 1,
                maxWidth: "400px",
                backgroundColor: "white",
                marginBottom: "20px",
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

            {/* Download Button - Only show if there are items to download */}
            {boqItems.length > 0 && (
              <DownloadBoqButton
                boqHeader={downloadBoqHeader}
                boqLines={downloadBoqLines}
                isReference={true}
                mrHeader={mrHeader}
                itemName={itemName}
                itemId={item.id}
              />
            )}
          </div>

          {/* Category Grid - Grouped by Category Only */}
          <div className="category-grid">
            <div style={{ position: "relative", flex: 1 }}>
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
                      "linear-gradient(to right, white 0%, rgba(255, 255, 255, 0) 100%)",
                    pointerEvents: "none",
                    zIndex: 5,
                  }}
                />
              )}

              {/* Left Arrow Button */}
              {showLeftArrow && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    scroll("left");
                  }}
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
                    style={{ transform: "rotate(-180deg)", width: "12px" }}
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
                  {/* SUMMARY tab - only if canSeePrice */}
                  {canSeePrice && (
                    <div
                      className={`item ${activeCategory === "SUMMARY" ? "active" : ""}`}
                      onClick={() => setActiveCategory("SUMMARY")}
                      style={{
                        flexShrink: 0,
                        textTransform: "uppercase",
                        cursor: "pointer",
                      }}
                    >
                      SUMMARY
                    </div>
                  )}

                  {/* ALL tab */}
                  <div
                    className={`item ${activeCategory === "ALL" ? "active" : ""}`}
                    onClick={() => setActiveCategory("ALL")}
                    style={{
                      flexShrink: 0,
                      textTransform: "uppercase",
                      cursor: "pointer",
                    }}
                  >
                    ALL
                  </div>

                  {/* Category tabs - grouped by category only */}
                  {categoryKeys.map((category) => {
                    const group = filteredByCategory[category];
                    return (
                      <div
                        key={category}
                        className={`item ${activeCategory === category ? "active" : ""}`}
                        onClick={() => setActiveCategory(category)}
                        style={{
                          flexShrink: 0,
                          cursor: "pointer",
                          textTransform: "uppercase",
                        }}
                      >
                        {category}
                      </div>
                    );
                  })}
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
                      "linear-gradient(to left, white 0%, rgba(255, 255, 255, 0) 100%)",
                    pointerEvents: "none",
                    zIndex: 5,
                  }}
                />
              )}

              {/* Right Arrow Button */}
              {showRightArrow && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    scroll("right");
                  }}
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
                  <img
                    src={arrowRight}
                    style={{ width: "12px" }}
                    alt="scroll right"
                  />
                </button>
              )}
            </div>
          </div>

          <br />
          <br />

          {/* No Results Message */}
          {searchQuery.trim() && categoryKeys.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "40px",
                color: "rgba(128, 128, 128, 1)",
              }}
            >
              <p>No results found for "{searchQuery}"</p>
            </div>
          )}

          {/* Content Area */}
          <div style={{ maxHeight: "500px", overflowY: "auto" }}>
            {isLoading ? (
              <div style={{ textAlign: "center", padding: "40px" }}>
                Loading BOQ details...
              </div>
            ) : categoryKeys.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px" }}>
                No BOQ items found
              </div>
            ) : activeCategory === "SUMMARY" ? (
              // SUMMARY View - Categories only (aggregated)
              <table className="items-table">
                <thead>
                  <tr>
                    <th
                      style={{
                        padding: "15px 30px",
                        textAlign: "left",
                        background: "rgba(239, 239, 239, 1)",
                        fontWeight: 900,
                        whiteSpace: "nowrap",
                      }}
                    >
                      #
                    </th>
                    <th
                      style={{
                        padding: "15px 30px",
                        textAlign: "left",
                        background: "rgba(239, 239, 239, 1)",
                        fontWeight: 900,
                        whiteSpace: "nowrap",
                      }}
                    >
                      CATEGORY
                    </th>
                    {canSeePrice && (
                      <th
                        style={{
                          padding: "15px 30px",
                          textAlign: "left",
                          background: "rgba(239, 239, 239, 1)",
                          fontWeight: 900,
                          whiteSpace: "nowrap",
                        }}
                      >
                        SUBTOTAL
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {categoryKeys.map((category, index) => {
                    const group = filteredByCategory[category];
                    const bgColor = getRowBgColor(index);
                    return (
                      <tr
                        key={category}
                        style={{ cursor: "pointer" }}
                        onClick={() => setActiveCategory(category)}
                      >
                        <td
                          style={{
                            padding: "25px 30px",
                            textAlign: "left",
                            verticalAlign: "middle",
                            backgroundColor: bgColor,
                          }}
                        >
                          {index + 1}
                        </td>
                        <td
                          style={{
                            padding: "25px 30px",
                            textAlign: "left",
                            verticalAlign: "middle",
                            backgroundColor: bgColor,
                            textTransform: "uppercase",
                            fontWeight: 600,
                          }}
                        >
                          {category}
                        </td>
                        {canSeePrice && (
                          <td
                            style={{
                              padding: "25px 30px",
                              textAlign: "left",
                              verticalAlign: "middle",
                              backgroundColor: bgColor,
                              fontWeight: 600,
                            }}
                          >
                            AED {group.totalPrice.toLocaleString()}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
                {canSeePrice && (
                  <tfoot
                    style={{ borderTop: "1px solid rgba(232, 223, 223, 1)" }}
                  >
                    <tr>
                      <td
                        style={{
                          padding: "25px 30px",
                          textAlign: "left",
                          verticalAlign: "middle",
                          backgroundColor: "white",
                        }}
                      ></td>
                      <td
                        style={{
                          padding: "25px 30px",
                          textAlign: "left",
                          verticalAlign: "middle",
                          backgroundColor: "white",
                        }}
                      >
                        <h3>SUBTOTAL</h3>
                      </td>
                      <td
                        style={{
                          padding: "25px 30px",
                          textAlign: "left",
                          verticalAlign: "middle",
                          backgroundColor: "white",
                        }}
                      >
                        <h3 style={{ textWrap: "nowrap" }}>
                          AED {grandTotal.toLocaleString()}
                        </h3>
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            ) : activeCategory === "ALL" ? (
              // ALL View - Show all subcategories grouped
              subCategoryKeys.map((key, groupIndex) => {
                const group = filteredBySubCategory[key];
                return (
                  <div key={key} style={{ marginBottom: "30px" }}>
                    {/* Subcategory Header - Simple text only */}
                    <h2
                      style={{
                        textTransform: "uppercase",
                      }}
                    >
                      {group.category_number}.{group.subcategory_number}{" "}
                      {group.category} / {group.sub_category}
                    </h2>

                    <br />

                    {/* Items Table */}
                    <table className="items-table">
                      <thead>
                        <tr>
                          <th
                            style={{
                              padding: "15px 30px",
                              textAlign: "left",
                              background: "rgba(239, 239, 239, 1)",
                              fontWeight: 900,
                              whiteSpace: "nowrap",
                            }}
                          >
                            #
                          </th>
                          <th
                            style={{
                              padding: "15px 30px",
                              textAlign: "left",
                              background: "rgba(239, 239, 239, 1)",
                              fontWeight: 900,
                              whiteSpace: "nowrap",
                            }}
                          >
                            ITEM
                          </th>
                          <th
                            style={{
                              padding: "15px 30px",
                              textAlign: "left",
                              background: "rgba(239, 239, 239, 1)",
                              fontWeight: 900,
                              whiteSpace: "nowrap",
                            }}
                          >
                            QUANTITY
                          </th>
                          {canSeePrice && (
                            <th
                              style={{
                                padding: "15px 30px",
                                textAlign: "left",
                                background: "rgba(239, 239, 239, 1)",
                                fontWeight: 900,
                                whiteSpace: "nowrap",
                              }}
                            >
                              TOTAL PRICE
                            </th>
                          )}
                          <th
                            style={{
                              padding: "15px 30px",
                              textAlign: "left",
                              background: "rgba(239, 239, 239, 1)",
                              fontWeight: 900,
                              whiteSpace: "nowrap",
                            }}
                          >
                            ATTACHMENT(S)
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.items.map((boqItem, itemIndex) => {
                          const attachmentUrls = parseAttachments(
                            boqItem.attachments,
                          );
                          const bgColor = getRowBgColor(itemIndex);

                          return (
                            <tr key={boqItem.id}>
                              <td
                                style={{
                                  whiteSpace: "nowrap",
                                  padding: "25px 30px",
                                  textAlign: "left",
                                  verticalAlign: "middle",
                                  backgroundColor: bgColor,
                                }}
                              >
                                {boqItem.item_number}
                              </td>
                              <td
                                style={{
                                  padding: "25px 30px",
                                  textAlign: "left",
                                  verticalAlign: "middle",
                                  backgroundColor: bgColor,
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "10px",
                                  }}
                                >
                                  <strong>{boqItem.item_name}</strong>

                                  {boqItem.item_description && (
                                    <p style={{ whiteSpace: "pre-wrap" }}>
                                      {boqItem.item_description}
                                    </p>
                                  )}

                                  {boqItem.location && (
                                    <div
                                      style={{
                                        display: "flex",
                                        gap: "10px",
                                        alignItems: "center",
                                      }}
                                    >
                                      <img
                                        src={locationIcon}
                                        style={{ width: "16px" }}
                                        alt="location"
                                      />
                                      <span
                                        style={{
                                          fontWeight: 600,
                                          marginTop: "4px",
                                          color: "rgba(105, 105, 105, 1)",
                                        }}
                                      >
                                        {boqItem.location}
                                      </span>
                                    </div>
                                  )}

                                  {boqItem.scope_of_work && (
                                    <div
                                      style={{
                                        backgroundColor:
                                          "rgba(225, 225, 225, 1)",
                                        borderRadius: "50px",
                                        padding: "4px 10px",
                                        width: "fit-content",
                                      }}
                                    >
                                      <strong>{boqItem.scope_of_work}</strong>
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td
                                style={{
                                  padding: "25px 30px",
                                  textAlign: "left",
                                  verticalAlign: "middle",
                                  backgroundColor: bgColor,
                                }}
                              >
                                {formatQuantity(item.quantity)} {item.unit}
                              </td>
                              {canSeePrice && (
                                <td
                                  style={{
                                    padding: "25px 30px",
                                    textAlign: "left",
                                    verticalAlign: "middle",
                                    backgroundColor: bgColor,
                                  }}
                                >
                                  AED {boqItem.total_cost?.toLocaleString()}
                                </td>
                              )}
                              <td
                                className="attachments"
                                style={{
                                  padding: "25px 30px",
                                  textAlign: "left",
                                  verticalAlign: "middle",
                                  backgroundColor: bgColor,
                                }}
                              >
                                <div
                                  className="attachments-grid"
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(2, 60px)",
                                    gap: "5px",
                                  }}
                                >
                                  {attachmentUrls.map((url, i) => (
                                    <img
                                      key={i}
                                      src={url}
                                      alt="attachment"
                                      style={{
                                        width: "60px",
                                        height: "100%",
                                        objectFit: "contain",
                                      }}
                                    />
                                  ))}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      {canSeePrice && (
                        <tfoot
                          style={{
                            borderTop: "1px solid rgba(232, 223, 223, 1)",
                          }}
                        >
                          <tr>
                            <td
                              style={{
                                padding: "25px 30px",
                                textAlign: "left",
                                verticalAlign: "middle",
                                backgroundColor: "white",
                              }}
                            ></td>
                            <td
                              style={{
                                padding: "25px 30px",
                                textAlign: "left",
                                verticalAlign: "middle",
                                backgroundColor: "white",
                              }}
                            >
                              <h3>SUBTOTAL</h3>
                            </td>
                            <td
                              style={{
                                padding: "25px 30px",
                                textAlign: "left",
                                verticalAlign: "middle",
                                backgroundColor: "white",
                              }}
                            ></td>
                            <td
                              style={{
                                padding: "25px 30px",
                                textAlign: "left",
                                verticalAlign: "middle",
                                backgroundColor: "white",
                              }}
                            >
                              <h3 style={{ textWrap: "nowrap" }}>
                                AED {group.totalPrice.toLocaleString()}
                              </h3>
                            </td>
                            <td
                              style={{
                                padding: "25px 30px",
                                textAlign: "left",
                                verticalAlign: "middle",
                                backgroundColor: "white",
                              }}
                            ></td>
                          </tr>
                        </tfoot>
                      )}
                    </table>

                    <br />
                    <br />
                  </div>
                );
              })
            ) : activeCategoryData ? (
              // Individual Category View - Show all items in this category (all subcategories)
              <div>
                {/* Items from all subcategories in this category */}
                {activeCategoryData.subCategories.map((subCat, subIndex) => {
                  // Get items for this subcategory
                  const subCatItems = activeCategoryData.items.filter(
                    (item) => item.sub_category === subCat,
                  );

                  if (subCatItems.length === 0) return null;

                  const firstItem = subCatItems[0];
                  const subCatTotal = subCatItems.reduce(
                    (sum, item) => sum + (item.total_cost || 0),
                    0,
                  );

                  return (
                    <div key={subCat} style={{ marginBottom: "30px" }}>
                      {/* Subcategory Header */}
                      <h2
                        style={{
                          textTransform: "uppercase",
                        }}
                      >
                        {activeCategoryData.category_number}.
                        {firstItem.subcategory_number} {subCat}
                      </h2>

                      <br />

                      <table className="items-table">
                        <thead>
                          <tr>
                            <th
                              style={{
                                padding: "15px 30px",
                                textAlign: "left",
                                background: "rgba(239, 239, 239, 1)",
                                fontWeight: 900,
                                whiteSpace: "nowrap",
                              }}
                            >
                              #
                            </th>
                            <th
                              style={{
                                padding: "15px 30px",
                                textAlign: "left",
                                background: "rgba(239, 239, 239, 1)",
                                fontWeight: 900,
                                whiteSpace: "nowrap",
                              }}
                            >
                              ITEM
                            </th>
                            <th
                              style={{
                                padding: "15px 30px",
                                textAlign: "left",
                                background: "rgba(239, 239, 239, 1)",
                                fontWeight: 900,
                                whiteSpace: "nowrap",
                              }}
                            >
                              QUANTITY
                            </th>
                            {canSeePrice && (
                              <th
                                style={{
                                  padding: "15px 30px",
                                  textAlign: "left",
                                  background: "rgba(239, 239, 239, 1)",
                                  fontWeight: 900,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                TOTAL PRICE
                              </th>
                            )}
                            <th
                              style={{
                                padding: "15px 30px",
                                textAlign: "left",
                                background: "rgba(239, 239, 239, 1)",
                                fontWeight: 900,
                                whiteSpace: "nowrap",
                              }}
                            >
                              ATTACHMENT(S)
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {subCatItems.map((boqItem, itemIndex) => {
                            const attachmentUrls = parseAttachments(
                              boqItem.attachments,
                            );
                            const bgColor = getRowBgColor(itemIndex);

                            return (
                              <tr key={boqItem.id}>
                                <td
                                  style={{
                                    whiteSpace: "nowrap",
                                    padding: "25px 30px",
                                    textAlign: "left",
                                    verticalAlign: "middle",
                                    backgroundColor: bgColor,
                                  }}
                                >
                                  {boqItem.item_number}
                                </td>
                                <td
                                  style={{
                                    padding: "25px 30px",
                                    textAlign: "left",
                                    verticalAlign: "middle",
                                    backgroundColor: bgColor,
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: "10px",
                                    }}
                                  >
                                    <strong>{boqItem.item_name}</strong>

                                    {boqItem.item_description && (
                                      <p style={{ whiteSpace: "pre-wrap" }}>
                                        {boqItem.item_description}
                                      </p>
                                    )}

                                    {boqItem.location && (
                                      <div
                                        style={{
                                          display: "flex",
                                          gap: "10px",
                                          alignItems: "center",
                                        }}
                                      >
                                        <img
                                          src={locationIcon}
                                          style={{ width: "16px" }}
                                          alt="location"
                                        />
                                        <span
                                          style={{
                                            fontWeight: 600,
                                            marginTop: "4px",
                                            color: "rgba(105, 105, 105, 1)",
                                          }}
                                        >
                                          {boqItem.location}
                                        </span>
                                      </div>
                                    )}

                                    {boqItem.scope_of_work && (
                                      <div
                                        style={{
                                          backgroundColor:
                                            "rgba(225, 225, 225, 1)",
                                          borderRadius: "50px",
                                          padding: "4px 10px",
                                          width: "fit-content",
                                        }}
                                      >
                                        <strong>{boqItem.scope_of_work}</strong>
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td
                                  style={{
                                    padding: "25px 30px",
                                    textAlign: "left",
                                    verticalAlign: "middle",
                                    backgroundColor: bgColor,
                                  }}
                                >
                                  {formatQuantity(item.quantity)} {item.unit}
                                </td>
                                {canSeePrice && (
                                  <td
                                    style={{
                                      padding: "25px 30px",
                                      textAlign: "left",
                                      verticalAlign: "middle",
                                      backgroundColor: bgColor,
                                    }}
                                  >
                                    AED {boqItem.total_cost?.toLocaleString()}
                                  </td>
                                )}
                                <td
                                  className="attachments"
                                  style={{
                                    padding: "25px 30px",
                                    textAlign: "left",
                                    verticalAlign: "middle",
                                    backgroundColor: bgColor,
                                  }}
                                >
                                  <div
                                    className="attachments-grid"
                                    style={{
                                      display: "grid",
                                      gridTemplateColumns: "repeat(2, 60px)",
                                      gap: "5px",
                                    }}
                                  >
                                    {attachmentUrls.map((url, i) => (
                                      <img
                                        key={i}
                                        src={url}
                                        alt="attachment"
                                        style={{
                                          width: "60px",
                                          height: "100%",
                                          objectFit: "contain",
                                        }}
                                      />
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        {canSeePrice && (
                          <tfoot
                            style={{
                              borderTop: "1px solid rgba(232, 223, 223, 1)",
                            }}
                          >
                            <tr>
                              <td
                                style={{
                                  padding: "25px 30px",
                                  textAlign: "left",
                                  verticalAlign: "middle",
                                  backgroundColor: "white",
                                }}
                              ></td>
                              <td
                                style={{
                                  padding: "25px 30px",
                                  textAlign: "left",
                                  verticalAlign: "middle",
                                  backgroundColor: "white",
                                }}
                              >
                                <h3 style={{ fontSize: "14px" }}>SUBTOTAL</h3>
                              </td>
                              <td
                                style={{
                                  padding: "25px 30px",
                                  textAlign: "left",
                                  verticalAlign: "middle",
                                  backgroundColor: "white",
                                }}
                              ></td>
                              <td
                                style={{
                                  padding: "25px 30px",
                                  textAlign: "left",
                                  verticalAlign: "middle",
                                  backgroundColor: "white",
                                }}
                              >
                                <h3
                                  style={{
                                    textWrap: "nowrap",
                                    fontSize: "14px",
                                  }}
                                >
                                  AED {subCatTotal.toLocaleString()}
                                </h3>
                              </td>
                              <td
                                style={{
                                  padding: "25px 30px",
                                  textAlign: "left",
                                  verticalAlign: "middle",
                                  backgroundColor: "white",
                                }}
                              ></td>
                            </tr>
                          </tfoot>
                        )}
                      </table>

                      <br />
                      <br />
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        </FormPopUp>
      )}
    </>
  );
}

const parseAttachments = (attachments: any): string[] => {
  if (!attachments) return [];
  if (Array.isArray(attachments)) return attachments;
  if (typeof attachments === "string") {
    try {
      if (attachments.trim() === "") return [];
      const parsed = JSON.parse(attachments);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error("Failed to parse attachments:", error);
      return [];
    }
  }
  return [];
};
