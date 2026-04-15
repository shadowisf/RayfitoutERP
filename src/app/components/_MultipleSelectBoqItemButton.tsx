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
  onSelectBoq: (
    boqLineIDs: number[],
    boqInfo: string,
    selectedLines?: BoqLine[],
  ) => void;
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
  const externalLinkIcon = "/icons/external-link.svg";

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

  const formatQty = (val: any) => {
    const num = Number(val);
    if (isNaN(num)) return val;
    return num % 1 === 0 ? num.toFixed(0) : parseFloat(num.toFixed(2)).toString();
  };

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

  // Category & subcategory filter state
  const [filterCategories, setFilterCategories] = useState<Set<string>>(
    new Set(),
  );
  const [filterSubCategories, setFilterSubCategories] = useState<Set<string>>(
    new Set(),
  );
  const [showFilterPopup, setShowFilterPopup] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState("");
  const [subCategorySearchQuery, setSubCategorySearchQuery] = useState("");
  const allCategories = Object.keys(groupedBoqLines);
  const filterIcon = "/icons/filter.svg";

  // Temp filter state (only applied on CONFIRM)
  const [tempFilterCategories, setTempFilterCategories] = useState<Set<string>>(
    new Set(),
  );
  const [tempFilterSubCategories, setTempFilterSubCategories] = useState<
    Set<string>
  >(new Set());

  // Collapsible state for categories and subcategories in the table
  const [collapsedCategories, setCollapsedCategories] = useState<
    Record<string, boolean>
  >({});
  const [collapsedSubCategories, setCollapsedSubCategories] = useState<
    Record<string, boolean>
  >({});

  // Get all subcategories, optionally filtered by selected categories (uses temp state for popup)
  const getAvailableSubCategories = (
    catSet: Set<string> = tempFilterCategories,
  ): string[] => {
    const subCats = new Set<string>();
    Object.entries(groupedBoqLines).forEach(([category, subCategories]) => {
      if (catSet.size > 0 && !catSet.has(category)) return;
      Object.keys(subCategories).forEach((subCat) => subCats.add(subCat));
    });
    return Array.from(subCats).sort();
  };

  // Get the parent category of a subcategory
  const getCategoryForSubCategory = (subCat: string): string | null => {
    for (const [category, subCategories] of Object.entries(groupedBoqLines)) {
      if (subCat in subCategories) return category;
    }
    return null;
  };

  const toggleFilterCategory = (category: string) => {
    setTempFilterCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
        // Remove subcategories belonging to this category
        const subCatsToRemove = Object.keys(groupedBoqLines[category] || {});
        setTempFilterSubCategories((prevSub) => {
          const nextSub = new Set(prevSub);
          subCatsToRemove.forEach((sc) => nextSub.delete(sc));
          return nextSub;
        });
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const toggleFilterSubCategory = (subCategory: string) => {
    setTempFilterSubCategories((prev) => {
      const next = new Set(prev);
      if (next.has(subCategory)) {
        next.delete(subCategory);
      } else {
        next.add(subCategory);
        // Auto-select the parent category
        const parentCat = getCategoryForSubCategory(subCategory);
        if (parentCat) {
          setTempFilterCategories(
            (prevCat) => new Set([...prevCat, parentCat]),
          );
        }
      }
      return next;
    });
  };

  const handleFilterOpen = () => {
    setTempFilterCategories(new Set(filterCategories));
    setTempFilterSubCategories(new Set(filterSubCategories));
    setCategorySearchQuery("");
    setSubCategorySearchQuery("");
    setShowFilterPopup(true);
  };

  const handleFilterApply = () => {
    setFilterCategories(new Set(tempFilterCategories));
    setFilterSubCategories(new Set(tempFilterSubCategories));
    setShowFilterPopup(false);
  };

  const handleFilterReset = () => {
    setTempFilterCategories(new Set());
    setTempFilterSubCategories(new Set());
  };

  const hasActiveFilters =
    filterCategories.size > 0 || filterSubCategories.size > 0;
  const totalFilterCount = filterCategories.size + filterSubCategories.size;

  // Filter BOQ lines based on search query and category/subcategory filter
  useEffect(() => {
    const hasSearch = searchQuery.trim().length > 0;
    const hasCatFilter = filterCategories.size > 0;
    const hasSubCatFilter = filterSubCategories.size > 0;

    if (!hasSearch && !hasCatFilter && !hasSubCatFilter) {
      setFilteredGroupedBoqLines(groupedBoqLines);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered: GroupedBoqLines = {};

    Object.entries(groupedBoqLines).forEach(([category, subCategories]) => {
      // Skip categories not in filter (if category filter is active)
      if (hasCatFilter && !filterCategories.has(category)) return;

      Object.entries(subCategories).forEach(([subCategory, items]) => {
        // Skip subcategories not in filter (if subcategory filter is active)
        if (hasSubCatFilter && !filterSubCategories.has(subCategory)) return;

        const filteredItems = hasSearch
          ? items.filter((boq) => {
              return (
                boq.item_number?.toLowerCase().includes(query) ||
                boq.item_name?.toLowerCase().includes(query) ||
                category.toLowerCase().includes(query) ||
                subCategory.toLowerCase().includes(query)
              );
            })
          : items;

        if (filteredItems.length > 0) {
          if (!filtered[category]) {
            filtered[category] = {};
          }
          filtered[category][subCategory] = filteredItems;
        }
      });
    });

    setFilteredGroupedBoqLines(filtered);
  }, [searchQuery, groupedBoqLines, filterCategories, filterSubCategories]);

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
  /* const isCategorySelected = (category: string) => {
    return selectedCategories.has(category);
  }; */

  // Check if subcategory is selected
  const isSubCategorySelected = (category: string, subCategory: string) => {
    return selectedSubCategories.has(`${category}::${subCategory}`);
  };

  // Create the modal content
  const modalContent = isOpen && (
    <FormPopUp
      header={"SELECT BOQ ITEMS"}
      setIsOpen={setIsOpen}
      handleSubmit={handleSubmit}
      addButtonLabel={"CONFIRM"}
      style={{ width: "75dvw", height: "95dvh" }}
    >
      {/* Search Bar + Filter Button */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
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

      <br />

      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <Button
          componentType={"button"}
          bgColor={"white"}
          borderColor={"rgba(223, 223, 223, 1)"}
          textColor={"black"}
          onClick={(e) => {
            e.preventDefault();
            handleFilterOpen();
          }}
          style={{
            padding: "7px 20px",
            borderRadius: "25px",
          }}
        >
          <img src={filterIcon} alt="filter" />
          FILTER
        </Button>

        {/* Active Filter Bubbles */}
        {hasActiveFilters && (
          <div
            style={{
              display: "flex",
              gap: "10px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            {filterCategories.size > 0 && (
              <Button
                style={{
                  borderRadius: "25px",
                  fontWeight: "600",
                  textWrap: "nowrap",
                }}
                componentType="none"
                bgColor="rgba(239, 239, 239, 1)"
                borderColor="transparent"
                textColor="black"
              >
                CATEGORY:{" "}
                <span style={{ color: "rgba(1, 139, 80, 1)" }}>
                  {Array.from(filterCategories)[0].toUpperCase()}
                  {filterCategories.size > 1 &&
                    `, +${filterCategories.size - 1} MORE`}
                </span>
              </Button>
            )}
            {filterSubCategories.size > 0 && (
              <Button
                style={{
                  borderRadius: "25px",
                  fontWeight: "600",
                  textWrap: "nowrap",
                }}
                componentType="none"
                bgColor="rgba(239, 239, 239, 1)"
                borderColor="transparent"
                textColor="black"
              >
                SUBCATEGORY:{" "}
                <span style={{ color: "rgba(1, 139, 80, 1)" }}>
                  {Array.from(filterSubCategories)[0].toUpperCase()}
                  {filterSubCategories.size > 1 &&
                    `, +${filterSubCategories.size - 1} MORE`}
                </span>
              </Button>
            )}
            <Button
              onClick={() => {
                setFilterCategories(new Set());
                setFilterSubCategories(new Set());
              }}
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

      <br />
      <br />

      {/* Selected Items Bubbles */}
      {tempSelectedBoqIDs.length > 0 && (
        <>
          <h3>ITEM(S) SELECTED ({tempSelectedBoqIDs.length}):</h3>
          <br />
          <div
            style={{
              display: "flex",
              gap: "10px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            {tempSelectedBoqIDs.map((id) => {
              const boq = boqLineValues.find((b) => b.id === id);
              if (!boq) return null;
              return (
                <Button
                  key={id}
                  componentType="none"
                  bgColor="rgba(239, 239, 239, 1)"
                  borderColor="transparent"
                  textColor="black"
                  style={{
                    borderRadius: "25px",
                    fontWeight: "600",
                    textWrap: "nowrap",
                  }}
                >
                  {boq.item_number} - {boq.item_name}
                  <Button
                    componentType={"button"}
                    bgColor={"transparent"}
                    borderColor={"transparent"}
                    textColor={"black"}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setTempSelectedBoqIDs((prev) =>
                        prev.filter((i) => i !== id),
                      );
                    }}
                    style={{ padding: "0px" }}
                  >
                    <img src={crossIcon} style={{ marginBottom: "2px" }} />
                  </Button>
                </Button>
              );
            })}
          </div>

          <br />
          <br />
        </>
      )}

      {/* Category Grid — commented out
      <div className="category-grid" style={{ marginBottom: "20px" }}>
        <div style={{ position: "relative", flex: 1, maxWidth: "70dvw" }}>
          <div
            ref={scrollContainerRef}
            onScroll={checkScroll}
            style={{ overflowX: "auto", scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            <div style={{ display: "flex", gap: "1px" }}>
              <div
                className={`item ${activeBoqCategory === "ALL" ? "active" : ""}`}
                onClick={() => setActiveBoqCategory("ALL")}
                style={{ flexShrink: 0, textTransform: "uppercase", cursor: "pointer" }}
              >
                ALL
              </div>
              {boqCategories.map((category) => (
                <div
                  key={category}
                  className={`item ${activeBoqCategory === category ? "active" : ""}`}
                  onClick={() => setActiveBoqCategory(category)}
                  style={{ flexShrink: 0, cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}
                >
                  {category}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      */}

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
      <div>
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
                      marginBottom: collapsedCategories[category]
                        ? "0px"
                        : "15px",
                      padding: "10px 0",
                      borderBottom: "2px solid rgba(0, 0, 0, 0.1)",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                    onClick={() =>
                      setCollapsedCategories((prev) => ({
                        ...prev,
                        [category]: !prev[category],
                      }))
                    }
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      style={{
                        transition: "transform 0.2s ease",
                        transform: collapsedCategories[category]
                          ? "rotate(-90deg)"
                          : "rotate(0deg)",
                      }}
                    >
                      <path
                        d="M3.5 5.25L7 8.75L10.5 5.25"
                        stroke="black"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>

                    <h2
                      style={{
                        margin: 0,
                        textTransform: "uppercase",
                        fontSize: "18px",
                      }}
                    >
                      {categoryIndex + 1}. {category}
                    </h2>

                    <div
                      style={{
                        backgroundColor: "black",
                        color: "white",
                        borderRadius: "50px",
                        padding: "3px 8px",
                        fontWeight: "600",
                        fontSize: "12px",
                      }}
                    >
                      {Object.values(subCategoriesData).reduce(
                        (sum, items) => sum + items.length,
                        0,
                      )}{" "}
                      Items
                    </div>
                  </div>

                  {!collapsedCategories[category] &&
                    Object.entries(subCategoriesData).map(
                      ([subCategory, items], subCategoryIndex) => (
                        <div
                          key={`${category}-${subCategory}`}
                          style={{ marginBottom: "20px", marginLeft: "20px" }}
                        >
                          {/* Subcategory Header with Checkbox & Collapse */}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                              marginBottom: collapsedSubCategories[
                                `${category}::${subCategory}`
                              ]
                                ? "0px"
                                : "10px",
                              cursor: "pointer",
                              userSelect: "none",
                            }}
                            onClick={() => {
                              const key = `${category}::${subCategory}`;
                              setCollapsedSubCategories((prev) => ({
                                ...prev,
                                [key]: !prev[key],
                              }));
                            }}
                          >
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 14 14"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                              style={{
                                transition: "transform 0.2s ease",
                                transform: collapsedSubCategories[
                                  `${category}::${subCategory}`
                                ]
                                  ? "rotate(-90deg)"
                                  : "rotate(0deg)",
                              }}
                            >
                              <path
                                d="M3.5 5.25L7 8.75L10.5 5.25"
                                stroke="black"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>

                            <span
                              style={{
                                fontWeight: 600,
                                fontSize: "14px",
                              }}
                            >
                              {categoryIndex + 1}.{subCategoryIndex + 1}{" "}
                              {subCategory}
                            </span>

                            {/* Subcategory checkbox — commented out
                            <label
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                cursor: "pointer",
                                fontWeight: 600,
                                fontSize: "14px",
                              }}
                              onClick={(e) => e.stopPropagation()}
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
                            */}

                            <div
                              style={{
                                backgroundColor: "rgba(239, 239, 239, 1)",
                                borderRadius: "50px",
                                padding: "2px 8px",
                                fontWeight: "600",
                                fontSize: "11px",
                                color: "rgba(100, 100, 100, 1)",
                              }}
                            >
                              {items.length} Items
                            </div>
                          </div>

                          {!collapsedSubCategories[
                            `${category}::${subCategory}`
                          ] && (
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
                                          type={
                                            singleSelect ? "radio" : "checkbox"
                                          }
                                          name={
                                            singleSelect
                                              ? "boq-select"
                                              : undefined
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
                                            <p
                                              style={{ whiteSpace: "pre-wrap" }}
                                            >
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
                                                  color:
                                                    "rgba(105, 105, 105, 1)",
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
                                              <strong>
                                                {boq.scope_of_work}
                                              </strong>
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                      <td>
                                        {formatQty(boq.quantity)} {boq.unit}
                                      </td>

                                      {canSeePrice && (
                                        <>
                                          <td>
                                            {formatPrice(boq.rate_per_quantity)}
                                          </td>
                                          <td style={{ textWrap: "nowrap" }}>
                                            {formatPriceAED(boq.total_cost)}
                                          </td>
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
                          )}
                        </div>
                      ),
                    )}
                </div>
              ),
            )
          : Object.entries(boqSubCategories).map(
              ([subCategory, items], index) => (
                <div key={subCategory} style={{ marginBottom: "30px" }}>
                  {/* Subcategory Header with Checkbox & Collapse for single category view */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      marginBottom: collapsedSubCategories[
                        `${activeBoqCategory}::${subCategory}`
                      ]
                        ? "0px"
                        : "10px",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                    onClick={() => {
                      const key = `${activeBoqCategory}::${subCategory}`;
                      setCollapsedSubCategories((prev) => ({
                        ...prev,
                        [key]: !prev[key],
                      }));
                    }}
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 14 14"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      style={{
                        transition: "transform 0.2s ease",
                        transform: collapsedSubCategories[
                          `${activeBoqCategory}::${subCategory}`
                        ]
                          ? "rotate(-90deg)"
                          : "rotate(0deg)",
                      }}
                    >
                      <path
                        d="M3.5 5.25L7 8.75L10.5 5.25"
                        stroke="black"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>

                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: "14px",
                      }}
                    >
                      {boqCategories.indexOf(activeBoqCategory) + 1}.{index + 1}{" "}
                      {subCategory}
                    </span>

                    {/* Subcategory checkbox — commented out
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        cursor: "pointer",
                        fontWeight: 600,
                        fontSize: "14px",
                      }}
                      onClick={(e) => e.stopPropagation()}
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
                    */}

                    <div
                      style={{
                        backgroundColor: "rgba(239, 239, 239, 1)",
                        borderRadius: "50px",
                        padding: "2px 8px",
                        fontWeight: "600",
                        fontSize: "11px",
                        color: "rgba(100, 100, 100, 1)",
                      }}
                    >
                      {items.length} Items
                    </div>
                  </div>

                  {!collapsedSubCategories[
                    `${activeBoqCategory}::${subCategory}`
                  ] && (
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
                                {formatQty(boq.quantity)} {boq.unit}
                              </td>

                              {canSeePrice && (
                                <>
                                  <td>{formatPrice(boq.rate_per_quantity)}</td>
                                  <td style={{ textWrap: "nowrap" }}>
                                    {formatPriceAED(boq.total_cost)}
                                  </td>
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
                  )}

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
          <>
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
              style={{ filter: "invert(1)", marginBottom: "2px" }}
              onClick={handleReset}
            />
          </>
        ) : (
          <>
            <span>SELECT BOQ ITEMS</span>
            <img
              src={externalLinkIcon}
              alt="external link"
              style={{ filter: "invert(1)", marginBottom: "2px" }}
              onClick={handleReset}
            />
          </>
        )}
      </Button>

      {typeof window !== "undefined" &&
        modalContent &&
        createPortal(modalContent, document.body)}

      {typeof window !== "undefined" &&
        showFilterPopup &&
        createPortal(
          <FormPopUp
            header={"FILTER BOQ ITEMS"}
            setIsOpen={setShowFilterPopup}
            handleSubmit={handleFilterApply}
            addButtonLabel="CONFIRM"
            style={{ height: "95dvh" }}
            secondButton={
              <Button
                componentType={"button"}
                bgColor={"white"}
                borderColor={"black"}
                textColor={"black"}
                onClick={handleFilterReset}
              >
                RESET
              </Button>
            }
          >
            {/* Categories */}
            <div style={{ marginBottom: "30px" }}>
              <h3
                style={{
                  marginBottom: "15px",
                  fontSize: "14px",
                  fontWeight: "600",
                }}
              >
                CATEGORY
              </h3>
              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  padding: "10px",
                }}
              >
                <div style={{ position: "relative", marginBottom: "15px" }}>
                  <input
                    type="text"
                    placeholder="SEARCH"
                    value={categorySearchQuery}
                    onChange={(e) => setCategorySearchQuery(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 40px 10px 15px",
                      borderRadius: "8px",
                      border: "1px solid rgba(223, 223, 223, 1)",
                      fontSize: "14px",
                      backgroundColor: "rgba(245, 245, 245, 1)",
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
                <div style={{ maxHeight: "250px", overflowY: "auto" }}>
                  {allCategories
                    .filter((c) =>
                      c
                        .toLowerCase()
                        .includes(categorySearchQuery.toLowerCase()),
                    )
                    .map((category) => (
                      <div key={category} style={{ marginBottom: "10px" }}>
                        <label
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            cursor: "pointer",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={tempFilterCategories.has(category)}
                            onChange={() => toggleFilterCategory(category)}
                            style={{
                              width: "18px",
                              height: "18px",
                              cursor: "pointer",
                              accentColor: "#10b981",
                            }}
                          />
                          <h4>{category}</h4>
                        </label>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Subcategories */}
            <div style={{ marginBottom: "30px" }}>
              <h3
                style={{
                  marginBottom: "15px",
                  fontSize: "14px",
                  fontWeight: "600",
                }}
              >
                SUBCATEGORY
              </h3>
              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  padding: "10px",
                }}
              >
                <div style={{ position: "relative", marginBottom: "15px" }}>
                  <input
                    type="text"
                    placeholder="SEARCH"
                    value={subCategorySearchQuery}
                    onChange={(e) => setSubCategorySearchQuery(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 40px 10px 15px",
                      borderRadius: "8px",
                      border: "1px solid rgba(223, 223, 223, 1)",
                      fontSize: "14px",
                      backgroundColor: "rgba(245, 245, 245, 1)",
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
                <div style={{ maxHeight: "250px", overflowY: "auto" }}>
                  {getAvailableSubCategories().length === 0 ? (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "20px",
                        color: "#888",
                      }}
                    >
                      Select a category to see subcategories
                    </div>
                  ) : (
                    getAvailableSubCategories()
                      .filter((sc) =>
                        sc
                          .toLowerCase()
                          .includes(subCategorySearchQuery.toLowerCase()),
                      )
                      .map((subCategory) => (
                        <div key={subCategory} style={{ marginBottom: "10px" }}>
                          <label
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                              cursor: "pointer",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={tempFilterSubCategories.has(subCategory)}
                              onChange={() =>
                                toggleFilterSubCategory(subCategory)
                              }
                              style={{
                                width: "18px",
                                height: "18px",
                                cursor: "pointer",
                                accentColor: "#10b981",
                              }}
                            />
                            <h4>{subCategory}</h4>
                          </label>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
          </FormPopUp>,
          document.body,
        )}
    </>
  );
}
