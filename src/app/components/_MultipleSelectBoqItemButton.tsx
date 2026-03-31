"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import FormPopUp from "@/app/components/FormPopup";
import { toast } from "@/app/components/Toast";
import { useAuth } from "@/app/context/AuthContext";
import Button from "./Button";
import { BoqLine } from "../(protected)/project/[id]/boq/[boqId]/types/boqLine";
import { formatPrice, formatPriceAED } from "@/lib/formatPrice";

type props = {
  projectID: number;
  onSelectBoq: (boqLineIDs: number[], boqInfo: string, selectedLines?: BoqLine[]) => void;
  currentBoqLineIDs?: number[];
  disabled?: boolean;
  style?: React.CSSProperties;
  singleSelect?: boolean;
};

type GroupedBoqLines = {
  [category: string]: {
    [subCategory: string]: BoqLine[];
  };
};

export default function MultipleSelectBoqItemButton({
  projectID,
  onSelectBoq,
  currentBoqLineIDs = [],
  disabled,
  style,
  singleSelect = false,
}: props) {
  const locationIcon = "/icons/location-boq.svg";
  const arrowRight = "/icons/arrow-right.svg";
  const searchIcon = "/icons/search.svg";
  const crossIcon = "/icons/cross-small.svg";

  const { userInfo } = useAuth();

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(false);

  const [boqLineValues, setBoqLineValues] = useState<BoqLine[]>([]);
  const [groupedBoqLines, setGroupedBoqLines] = useState<GroupedBoqLines>({});
  const [filteredGroupedBoqLines, setFilteredGroupedBoqLines] =
    useState<GroupedBoqLines>({});
  const [tempSelectedBoqIDs, setTempSelectedBoqIDs] = useState<number[]>(
    currentBoqLineIDs || [],
  );
  const [selectedBoqInfo, setSelectedBoqInfo] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Track selected categories and subcategories
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set(),
  );
  const [selectedSubCategories, setSelectedSubCategories] = useState<
    Set<string>
  >(new Set());

  // BOQ Category states
  const [activeBoqCategory, setActiveBoqCategory] = useState<string>("ALL");
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const boqCategories = Object.keys(filteredGroupedBoqLines);
  const boqSubCategories =
    activeBoqCategory === "ALL"
      ? filteredGroupedBoqLines[boqCategories[0]] || {}
      : filteredGroupedBoqLines[activeBoqCategory] || {};

  const canSeePrice =
    userInfo?.departmentID === 8 ||
    userInfo?.departmentID === 12 ||
    userInfo?.departmentID === 10;

  // Filter BOQ lines based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredGroupedBoqLines(groupedBoqLines);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered: GroupedBoqLines = {};

    Object.entries(groupedBoqLines).forEach(([category, subCategories]) => {
      Object.entries(subCategories).forEach(([subCategory, items]) => {
        const filteredItems = items.filter((boq) => {
          return (
            boq.item_number?.toLowerCase().includes(query) ||
            boq.item_name?.toLowerCase().includes(query)
          );
        });

        if (filteredItems.length > 0) {
          if (!filtered[category]) {
            filtered[category] = {};
          }
          filtered[category][subCategory] = filteredItems;
        }
      });
    });

    setFilteredGroupedBoqLines(filtered);
  }, [searchQuery, groupedBoqLines]);

  // Check scroll position for arrows
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
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [boqCategories]);

  // Fetch BOQ lines when projectID is available
  useEffect(() => {
    if (projectID && projectID > 0) {
      fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/boq/getAllBoqLinesWithNumberRef`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_id: projectID,
          }),
        },
      )
        .then((res) => res.json())
        .then(function (data) {
          if (!data || !Array.isArray(data)) {
            console.error("Invalid BOQ data:", data);
            setBoqLineValues([]);
            return;
          }

          setBoqLineValues(data);

          // Group BOQ lines by category and subcategory
          const grouped: GroupedBoqLines = {};
          data.forEach((boqLine: BoqLine) => {
            const category = boqLine.category || "Uncategorized";
            const subCategory = boqLine.sub_category || "General";

            if (!grouped[category]) {
              grouped[category] = {};
            }
            if (!grouped[category][subCategory]) {
              grouped[category][subCategory] = [];
            }
            grouped[category][subCategory].push(boqLine);
          });

          setGroupedBoqLines(grouped);
          setFilteredGroupedBoqLines(grouped);
        })
        .catch((err) => {
          console.error("Error fetching BOQ lines:", err);
          setBoqLineValues([]);
          setGroupedBoqLines({});
          setFilteredGroupedBoqLines({});
        });
    }
  }, [projectID, isOpen]);

  // Set selectedBoqInfo when currentBoqLineIDs exist (for editing)
  useEffect(() => {
    if (currentBoqLineIDs.length > 0 && boqLineValues.length > 0) {
      const selectedBoqs = boqLineValues.filter((boq) =>
        currentBoqLineIDs.includes(boq.id),
      );

      if (selectedBoqs.length > 0) {
        const infoText =
          selectedBoqs.length === 1
            ? `${selectedBoqs[0].item_number} ${selectedBoqs[0].item_name}`
            : `${selectedBoqs.length} BOQ ITEMS SELECTED`;

        setSelectedBoqInfo(infoText);
        setTempSelectedBoqIDs(currentBoqLineIDs);
      }
    }
  }, [currentBoqLineIDs, boqLineValues]);

  // Reset temp selection and search when form opens
  useEffect(() => {
    if (isOpen) {
      setTempSelectedBoqIDs(currentBoqLineIDs || []);
      setSearchQuery("");
    }
  }, [isOpen, currentBoqLineIDs]);

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

  // Toggle individual item
  const handleCheckboxToggle = (boqId: number) => {
    if (singleSelect) {
      setTempSelectedBoqIDs([boqId]);
      return;
    }
    setTempSelectedBoqIDs((prev) => {
      const isSelected = prev.includes(boqId);
      if (isSelected) {
        return prev.filter((id) => id !== boqId);
      } else {
        return [...prev, boqId];
      }
    });
  };

  // Toggle entire category
  const toggleCategory = (category: string, isChecked: boolean) => {
    const categoryData = filteredGroupedBoqLines[category];
    if (!categoryData) return;

    const allIdsInCategory: number[] = [];
    Object.values(categoryData).forEach((items) => {
      items.forEach((item) => allIdsInCategory.push(item.id));
    });

    if (isChecked) {
      // Add category to selected
      setSelectedCategories((prev) => new Set([...prev, category]));
      // Add all items from this category
      setTempSelectedBoqIDs((prev) => [
        ...new Set([...prev, ...allIdsInCategory]),
      ]);
      // Add all subcategories
      const subCats = Object.keys(categoryData).map(
        (subCat) => `${category}::${subCat}`,
      );
      setSelectedSubCategories((prev) => new Set([...prev, ...subCats]));
    } else {
      // Remove category from selected
      setSelectedCategories((prev) => {
        const newSet = new Set(prev);
        newSet.delete(category);
        return newSet;
      });
      // Remove all items from this category
      setTempSelectedBoqIDs((prev) =>
        prev.filter((id) => !allIdsInCategory.includes(id)),
      );
      // Remove all subcategories of this category
      setSelectedSubCategories((prev) => {
        const newSet = new Set(prev);
        const subCatsToRemove = Object.keys(categoryData).map(
          (subCat) => `${category}::${subCat}`,
        );
        subCatsToRemove.forEach((subCat) => newSet.delete(subCat));
        return newSet;
      });
    }
  };

  // Toggle entire subcategory
  const toggleSubCategory = (
    category: string,
    subCategory: string,
    isChecked: boolean,
  ) => {
    const items = filteredGroupedBoqLines[category]?.[subCategory] || [];
    const idsInSubCategory = items.map((item) => item.id);
    const subCatKey = `${category}::${subCategory}`;

    if (isChecked) {
      // Add subcategory to selected
      setSelectedSubCategories((prev) => new Set([...prev, subCatKey]));
      // Add all items from this subcategory
      setTempSelectedBoqIDs((prev) => [
        ...new Set([...prev, ...idsInSubCategory]),
      ]);
      // Check if all subcategories in this category are now selected
      const allSubCats = Object.keys(filteredGroupedBoqLines[category] || {});
      const selectedSubCatsInCategory = Array.from(
        selectedSubCategories,
      ).filter((key) => key.startsWith(`${category}::`));
      if (selectedSubCatsInCategory.length + 1 >= allSubCats.length) {
        setSelectedCategories((prev) => new Set([...prev, category]));
      }
    } else {
      // Remove subcategory from selected
      setSelectedSubCategories((prev) => {
        const newSet = new Set(prev);
        newSet.delete(subCatKey);
        return newSet;
      });
      // Remove all items from this subcategory
      setTempSelectedBoqIDs((prev) =>
        prev.filter((id) => !idsInSubCategory.includes(id)),
      );
      // Remove category from selected since not all subcategories are selected
      setSelectedCategories((prev) => {
        const newSet = new Set(prev);
        newSet.delete(category);
        return newSet;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (tempSelectedBoqIDs.length === 0) {
      toast("Please select at least one bill of quantity item", "error");
      return;
    }

    const selectedBoqs = boqLineValues.filter((boq) =>
      tempSelectedBoqIDs.includes(boq.id),
    );

    const infoText =
      selectedBoqs.length === 1
        ? `${selectedBoqs[0].item_number} ${selectedBoqs[0].item_name}`
        : `${selectedBoqs.length} BOQ ITEMS SELECTED`;

    onSelectBoq(tempSelectedBoqIDs, infoText, selectedBoqs);
    setSelectedBoqInfo(infoText);
    setIsOpen(false);
  };

  // Check if category is fully selected
  const isCategorySelected = (category: string) => {
    return selectedCategories.has(category);
  };

  // Check if subcategory is selected
  const isSubCategorySelected = (category: string, subCategory: string) => {
    return selectedSubCategories.has(`${category}::${subCategory}`);
  };

  // Create the modal content
  const modalContent = isOpen && (
    <FormPopUp
      header={"SELECT BILL OF QUANTITY ITEMS"}
      setIsOpen={setIsOpen}
      handleSubmit={handleSubmit}
      addButtonLabel={"CONFIRM"}
      style={{ minWidth: "1300px", minHeight: "80dvh" }}
    >
      {/* Search Bar */}
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

      <br />
      <br />

      {!singleSelect && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            marginBottom: "10px",
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "14px",
            }}
          >
            <input
              type="checkbox"
              checked={
                boqCategories.length > 0 &&
                boqCategories.every((cat) => selectedCategories.has(cat))
              }
              onChange={(e) => {
                const isChecked = e.target.checked;
                boqCategories.forEach((cat) => {
                  toggleCategory(cat, isChecked);
                });
              }}
              style={{
                width: "18px",
                height: "18px",
                cursor: "pointer",
                accentColor: "rgba(0, 163, 93, 1)",
              }}
            />
            SELECT ALL CATEGORIES
          </label>
        </div>
      )}

      <br />
      <br />

      {/* Category Grid with Select All */}
      <div className="category-grid" style={{ marginBottom: "20px" }}>
        <div style={{ position: "relative", flex: 1, maxWidth: "70dvw" }}>
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
              <div
                className={`item ${
                  activeBoqCategory === "ALL" ? "active" : ""
                }`}
                onClick={() => setActiveBoqCategory("ALL")}
                style={{
                  flexShrink: 0,
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                ALL
              </div>

              {boqCategories.map(function (category) {
                return (
                  <div
                    key={category}
                    className={`item ${
                      activeBoqCategory === category ? "active" : ""
                    }`}
                    onClick={function () {
                      setActiveBoqCategory(category);
                    }}
                    style={{
                      flexShrink: 0,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    {!singleSelect && (
                      <input
                        type="checkbox"
                        checked={isCategorySelected(category)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleCategory(category, e.target.checked);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          width: "16px",
                          height: "16px",
                          cursor: "pointer",
                          accentColor: "rgba(0, 163, 93, 1)",
                        }}
                      />
                    )}
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

      {/* No Results Message */}
      {searchQuery.trim() && boqCategories.length === 0 && (
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

      {/* BOQ Items Table */}
      <div style={{ maxHeight: "500px", overflowY: "auto" }}>
        {activeBoqCategory === "ALL"
          ? Object.entries(filteredGroupedBoqLines).map(
              ([category, subCategoriesData], categoryIndex) => (
                <div key={category} style={{ marginBottom: "30px" }}>
                  {/* Category Header with Select All for Subcategories */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "15px",
                      marginBottom: "15px",
                      padding: "10px 0",
                      borderBottom: "2px solid rgba(0, 0, 0, 0.1)",
                    }}
                  >
                    {!singleSelect && (
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          cursor: "pointer",
                          fontWeight: 600,
                          fontSize: "12px",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={
                            Object.keys(subCategoriesData).length > 0 &&
                            Object.keys(subCategoriesData).every((subCat) =>
                              isSubCategorySelected(category, subCat),
                            )
                          }
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            Object.keys(subCategoriesData).forEach((subCat) => {
                              toggleSubCategory(category, subCat, isChecked);
                            });
                          }}
                          style={{
                            width: "16px",
                            height: "16px",
                            cursor: "pointer",
                            accentColor: "rgba(0, 163, 93, 1)",
                          }}
                        />
                      </label>
                    )}

                    <h2
                      style={{
                        margin: 0,
                        textTransform: "uppercase",
                        fontSize: "18px",
                      }}
                    >
                      {categoryIndex + 1}. {category}
                    </h2>
                  </div>

                  {Object.entries(subCategoriesData).map(
                    ([subCategory, items], subCategoryIndex) => (
                      <div
                        key={`${category}-${subCategory}`}
                        style={{ marginBottom: "20px", marginLeft: "20px" }}
                      >
                        {/* Subcategory Header with Checkbox */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            marginBottom: "10px",
                          }}
                        >
                          <label
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              cursor: "pointer",
                              fontWeight: 600,
                              fontSize: "14px",
                            }}
                          >
                            {!singleSelect && (
                              <input
                                type="checkbox"
                                checked={isSubCategorySelected(
                                  category,
                                  subCategory,
                                )}
                                onChange={(e) =>
                                  toggleSubCategory(
                                    category,
                                    subCategory,
                                    e.target.checked,
                                  )
                                }
                                style={{
                                  width: "18px",
                                  height: "18px",
                                  cursor: "pointer",
                                  accentColor: "rgba(0, 163, 93, 1)",
                                }}
                              />
                            )}
                            {categoryIndex + 1}.{subCategoryIndex + 1}{" "}
                            {subCategory}
                          </label>
                        </div>

                        <table className="items-table two-toned">
                          <thead>
                            <tr>
                              <th></th>
                              <th>#</th>
                              <th>ITEM</th>
                              <th>QUANTITY</th>
                              {canSeePrice && (
                                <>
                                  <th>RATE</th>
                                  <th>TOTAL PRICE</th>
                                </>
                              )}
                              <th>ATTACHMENTS</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((boq) => {
                              const attachmentUrls = parseAttachments(
                                boq.attachments,
                              );

                              return (
                                <tr key={boq.id}>
                                  <td onClick={(e) => e.stopPropagation()}>
                                    <input
                                      type={singleSelect ? "radio" : "checkbox"}
                                      name={
                                        singleSelect ? "boq-select" : undefined
                                      }
                                      checked={tempSelectedBoqIDs.includes(
                                        boq.id,
                                      )}
                                      onChange={() =>
                                        handleCheckboxToggle(boq.id)
                                      }
                                      style={{
                                        width: "18px",
                                        height: "18px",
                                        cursor: "pointer",
                                        accentColor: "rgba(0, 163, 93, 1)",
                                      }}
                                    />
                                  </td>
                                  <td style={{ whiteSpace: "nowrap" }}>
                                    {boq.item_number}
                                  </td>
                                  <td>
                                    <div
                                      style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "10px",
                                      }}
                                    >
                                      <strong>{boq.item_name}</strong>

                                      {boq.item_description && (
                                        <p style={{ whiteSpace: "pre-wrap" }}>
                                          {boq.item_description}
                                        </p>
                                      )}

                                      {boq.location && (
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
                                            {boq.location}
                                          </span>
                                        </div>
                                      )}

                                      {boq.scope_of_work && (
                                        <div
                                          style={{
                                            backgroundColor:
                                              "rgba(225, 225, 225, 1)",
                                            borderRadius: "50px",
                                            padding: "4px 10px",
                                            width: "fit-content",
                                          }}
                                        >
                                          <strong>{boq.scope_of_work}</strong>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td>
                                    {boq.quantity} {boq.unit}
                                  </td>

                                  {canSeePrice && (
                                    <>
                                      <td>
                                        {formatPrice(boq.rate_per_quantity)}
                                      </td>
                                      <td>{formatPriceAED(boq.total_cost)}</td>
                                    </>
                                  )}

                                  <td className="attachments">
                                    <div className="attachments-grid">
                                      {attachmentUrls.map((url, i) => (
                                        <img
                                          key={i}
                                          src={url}
                                          alt="attachment"
                                        />
                                      ))}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ),
                  )}
                </div>
              ),
            )
          : Object.entries(boqSubCategories).map(
              ([subCategory, items], index) => (
                <div key={subCategory} style={{ marginBottom: "30px" }}>
                  {/* Subcategory Header with Checkbox for single category view */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      marginBottom: "10px",
                    }}
                  >
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        cursor: "pointer",
                        fontWeight: 600,
                        fontSize: "14px",
                      }}
                    >
                      {!singleSelect && (
                        <input
                          type="checkbox"
                          checked={isSubCategorySelected(
                            activeBoqCategory,
                            subCategory,
                          )}
                          onChange={(e) =>
                            toggleSubCategory(
                              activeBoqCategory,
                              subCategory,
                              e.target.checked,
                            )
                          }
                          style={{
                            width: "18px",
                            height: "18px",
                            cursor: "pointer",
                            accentColor: "rgba(0, 163, 93, 1)",
                          }}
                        />
                      )}
                      {boqCategories.indexOf(activeBoqCategory) + 1}.{index + 1}{" "}
                      {subCategory}
                    </label>
                  </div>

                  <table className="items-table two-toned">
                    <thead>
                      <tr>
                        <th></th>
                        <th>#</th>
                        <th>ITEM</th>
                        <th>QUANTITY</th>
                        {canSeePrice && (
                          <>
                            <th>RATE</th>
                            <th>TOTAL PRICE</th>
                          </>
                        )}
                        <th>ATTACHMENTS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((boq, itemIndex) => {
                        const attachmentUrls = parseAttachments(
                          boq.attachments,
                        );

                        return (
                          <tr key={boq.id}>
                            <td onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={tempSelectedBoqIDs.includes(boq.id)}
                                onChange={() => handleCheckboxToggle(boq.id)}
                                style={{
                                  width: "18px",
                                  height: "18px",
                                  cursor: "pointer",
                                  accentColor: "rgba(0, 163, 93, 1)",
                                }}
                              />
                            </td>
                            <td style={{ whiteSpace: "nowrap" }}>
                              {boqCategories.indexOf(activeBoqCategory) + 1}.
                              {index + 1}.{itemIndex + 1}
                            </td>
                            <td>
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "10px",
                                }}
                              >
                                <strong>{boq.item_name}</strong>

                                {boq.item_description && (
                                  <p>{boq.item_description}</p>
                                )}

                                {boq.location && (
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
                                      {boq.location}
                                    </span>
                                  </div>
                                )}

                                {boq.scope_of_work && (
                                  <div
                                    style={{
                                      backgroundColor: "rgba(225, 225, 225, 1)",
                                      borderRadius: "50px",
                                      padding: "4px 10px",
                                      width: "fit-content",
                                    }}
                                  >
                                    <strong>{boq.scope_of_work}</strong>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td>
                              {boq.quantity} {boq.unit}
                            </td>

                            {canSeePrice && (
                              <>
                                <td>{formatPrice(boq.rate_per_quantity)}</td>
                                <td>{formatPriceAED(boq.total_cost)}</td>
                              </>
                            )}

                            <td className="attachments">
                              <div className="attachments-grid">
                                {attachmentUrls.map((url, i) => (
                                  <img key={i} src={url} alt="attachment" />
                                ))}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  <br />
                  <br />
                  <br />
                </div>
              ),
            )}
      </div>
    </FormPopUp>
  );

  const handleReset = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setTempSelectedBoqIDs([]);
    setSelectedBoqInfo("");
    setSelectedCategories(new Set());
    setSelectedSubCategories(new Set());
    onSelectBoq([], "");
  };

  return (
    <>
      <Button
        componentType={"button"}
        bgColor={"black"}
        borderColor={"black"}
        textColor={"white"}
        onClick={(e) => {
          e.preventDefault();
          setIsOpen(true);
        }}
        full
        disabled={disabled}
        style={style}
      >
        {currentBoqLineIDs.length > 0 && selectedBoqInfo ? (
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <span
              style={{
                maxWidth: "300px",
                display: "inline-block",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {selectedBoqInfo}
            </span>
            <img
              src={crossIcon}
              alt="cross"
              style={{ filter: "invert(1)" }}
              onClick={handleReset}
            />
          </div>
        ) : (
          "SELECT BOQ ITEMS"
        )}
      </Button>

      {typeof window !== "undefined" &&
        modalContent &&
        createPortal(modalContent, document.body)}
    </>
  );
}
