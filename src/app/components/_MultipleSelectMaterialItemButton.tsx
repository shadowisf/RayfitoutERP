"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import FormPopUp from "@/app/components/FormPopup";
import Button from "./Button";
import CreateNewMaterialButton from "./_CreateNewMaterialButton";
import { useAuth } from "../context/AuthContext";

export type PredefinedItem = {
  id: number;
  item_code: string;
  category_id: number;
  subcategory_id: number;
  material_description: string;
  brand: string | null;
  unit: string | null;
  category_name: string;
  subcategory_name: string;
};

type GroupedItems = {
  [category: string]: {
    [subCategory: string]: PredefinedItem[];
  };
};

type props = {
  onSelectItems: (items: PredefinedItem[]) => void;
  currentItemIDs?: number[];
  disabled?: boolean;
  style?: React.CSSProperties;
};

const ITEMS_PER_PAGE = 50;

export default function MultipleSelectMaterialItemButton({
  onSelectItems,
  currentItemIDs = [],
  disabled,
  style,
}: props) {
  const { userInfo } = useAuth();

  const arrowRight = "/icons/arrow-right.svg";
  const searchIcon = "/icons/search.svg";
  const externalLinkIcon = "/icons/external-link.svg";
  const pencilIcon = "/icons/pencil.svg";
  const crossSmallIcon = "/icons/cross-small.svg";

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(false);

  const [allItems, setAllItems] = useState<PredefinedItem[]>([]);
  const [groupedItems, setGroupedItems] = useState<GroupedItems>({});
  const [filteredGroupedItems, setFilteredGroupedItems] =
    useState<GroupedItems>({});
  const [tempSelectedIDs, setTempSelectedIDs] = useState<number[]>(
    currentItemIDs || [],
  );
  const [selectedInfo, setSelectedInfo] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedSubCategories, setSelectedSubCategories] = useState<
    Set<string>
  >(new Set());

  // Category & subcategory filter state
  const [filterCategories, setFilterCategories] = useState<Set<string>>(
    new Set(),
  );
  const [filterSubCategories, setFilterSubCategories] = useState<Set<string>>(
    new Set(),
  );
  const [showFilterPopup, setShowFilterPopup] = useState(false);
  const [tempFilterCategories, setTempFilterCategories] = useState<Set<string>>(
    new Set(),
  );
  const [tempFilterSubCategories, setTempFilterSubCategories] = useState<
    Set<string>
  >(new Set());
  const [categorySearchQuery, setCategorySearchQuery] = useState("");
  const [subCategorySearchQuery, setSubCategorySearchQuery] = useState("");
  const filterIcon = "/icons/filter.svg";

  const allCategoryNames = Object.keys(groupedItems);

  const getAvailableSubCategories = (
    catSet: Set<string> = tempFilterCategories,
  ): string[] => {
    const subCats = new Set<string>();
    Object.entries(groupedItems).forEach(([category, subCategories]) => {
      if (catSet.size > 0 && !catSet.has(category)) return;
      Object.keys(subCategories).forEach((subCat) => subCats.add(subCat));
    });
    return Array.from(subCats).sort();
  };

  const getCategoryForSubCategory = (subCat: string): string | null => {
    for (const [category, subCategories] of Object.entries(groupedItems)) {
      if (subCat in subCategories) return category;
    }
    return null;
  };

  const toggleFilterCategory = (category: string) => {
    setTempFilterCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
        const subCatsToRemove = Object.keys(groupedItems[category] || {});
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

  // Collapsible state for categories and subcategories
  const [collapsedCategories, setCollapsedCategories] = useState<
    Record<string, boolean>
  >({});
  const [collapsedSubCategories, setCollapsedSubCategories] = useState<
    Record<string, boolean>
  >({});

  // Category tab states
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  const categories = Object.keys(filteredGroupedItems);

  // Flatten items for current view (respecting active category + search)
  const flatItems = (() => {
    const items: PredefinedItem[] = [];
    if (activeCategory === "ALL") {
      Object.values(filteredGroupedItems).forEach((subCats) => {
        Object.values(subCats).forEach((subItems) => {
          items.push(...subItems);
        });
      });
    } else {
      const subCats = filteredGroupedItems[activeCategory] || {};
      Object.values(subCats).forEach((subItems) => {
        items.push(...subItems);
      });
    }
    return items;
  })();

  const totalPages = Math.ceil(flatItems.length / ITEMS_PER_PAGE);
  const paginatedItems = flatItems.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  // Group paginated items back into category > subcategory for rendering
  const paginatedGrouped = (() => {
    const grouped: GroupedItems = {};
    paginatedItems.forEach((item) => {
      const cat = item.category_name || "Uncategorized";
      const sub = item.subcategory_name || "General";
      if (!grouped[cat]) grouped[cat] = {};
      if (!grouped[cat][sub]) grouped[cat][sub] = [];
      grouped[cat][sub].push(item);
    });
    return grouped;
  })();

  // Filter items based on search query and category/subcategory filter
  useEffect(() => {
    const hasSearch = searchQuery.trim().length > 0;
    const hasCatFilter = filterCategories.size > 0;
    const hasSubCatFilter = filterSubCategories.size > 0;

    if (!hasSearch && !hasCatFilter && !hasSubCatFilter) {
      setFilteredGroupedItems(groupedItems);
      setCurrentPage(1);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered: GroupedItems = {};

    Object.entries(groupedItems).forEach(([category, subCats]) => {
      if (hasCatFilter && !filterCategories.has(category)) return;

      Object.entries(subCats).forEach(([subCategory, items]) => {
        if (hasSubCatFilter && !filterSubCategories.has(subCategory)) return;

        const filteredItems = hasSearch
          ? items.filter((item) => {
              return (
                item.material_description?.toLowerCase().includes(query) ||
                item.item_code?.toLowerCase().includes(query) ||
                item.brand?.toLowerCase().includes(query) ||
                category.toLowerCase().includes(query) ||
                subCategory.toLowerCase().includes(query)
              );
            })
          : items;

        if (filteredItems.length > 0) {
          if (!filtered[category]) filtered[category] = {};
          filtered[category][subCategory] = filteredItems;
        }
      });
    });

    setFilteredGroupedItems(filtered);
    setCurrentPage(1);
  }, [searchQuery, groupedItems, filterCategories, filterSubCategories]);

  // Reset page on category change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory]);

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
  }, [categories]);

  // Fetch predefined items when popup opens
  useEffect(() => {
    if (!isOpen) return;

    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getPredefinedItems`)
      .then((res) => res.json())
      .then((data) => {
        if (!data || !Array.isArray(data)) {
          setAllItems([]);
          return;
        }

        setAllItems(data);

        const grouped: GroupedItems = {};
        data.forEach((item: PredefinedItem) => {
          const category = item.category_name || "Uncategorized";
          const subCategory = item.subcategory_name || "General";
          if (!grouped[category]) grouped[category] = {};
          if (!grouped[category][subCategory])
            grouped[category][subCategory] = [];
          grouped[category][subCategory].push(item);
        });

        setGroupedItems(grouped);
        setFilteredGroupedItems(grouped);
      })
      .catch((err) => {
        console.error("Error fetching predefined items:", err);
        setAllItems([]);
        setGroupedItems({});
        setFilteredGroupedItems({});
      });
  }, [isOpen]);

  // Update info text when currentItemIDs change
  useEffect(() => {
    if (currentItemIDs.length > 0 && allItems.length > 0) {
      const selected = allItems.filter((i) => currentItemIDs.includes(i.id));
      if (selected.length > 0) {
        const infoText =
          selected.length === 1
            ? selected[0].material_description
            : `${selected.length} ITEMS SELECTED`;
        setSelectedInfo(infoText);
        setTempSelectedIDs(currentItemIDs);
      }
    } else if (currentItemIDs.length === 0) {
      setSelectedInfo("");
    }
  }, [currentItemIDs, allItems]);

  // Reset temp selection and search when form opens
  useEffect(() => {
    if (isOpen) {
      setTempSelectedIDs(currentItemIDs || []);
      setSearchQuery("");
      setCurrentPage(1);
      setActiveCategory("ALL");
    }
  }, [isOpen, currentItemIDs]);

  // Toggle individual item
  const handleCheckboxToggle = (itemId: number) => {
    setTempSelectedIDs((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId],
    );
  };

  // Toggle entire subcategory
  const toggleSubCategory = (
    category: string,
    subCategory: string,
    isChecked: boolean,
  ) => {
    const items = filteredGroupedItems[category]?.[subCategory] || [];
    const idsInSubCategory = items.map((item) => item.id);
    const subCatKey = `${category}::${subCategory}`;

    if (isChecked) {
      setSelectedSubCategories((prev) => new Set([...prev, subCatKey]));
      setTempSelectedIDs((prev) => [
        ...new Set([...prev, ...idsInSubCategory]),
      ]);
    } else {
      setSelectedSubCategories((prev) => {
        const newSet = new Set(prev);
        newSet.delete(subCatKey);
        return newSet;
      });
      setTempSelectedIDs((prev) =>
        prev.filter((id) => !idsInSubCategory.includes(id)),
      );
    }
  };

  const isSubCategorySelected = (category: string, subCategory: string) => {
    return selectedSubCategories.has(`${category}::${subCategory}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const selectedItems = allItems.filter((item) =>
      tempSelectedIDs.includes(item.id),
    );

    const infoText =
      selectedItems.length === 1
        ? selectedItems[0].material_description
        : `${selectedItems.length} ITEMS SELECTED`;

    onSelectItems(selectedItems);
    setSelectedInfo(infoText);
    setIsOpen(false);
  };

  const handleReset = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setTempSelectedIDs([]);
    setSelectedInfo("");
    setSelectedSubCategories(new Set());
    onSelectItems([]);
  };

  // Handle NEW MATERIAL subcategory selection — auto-fill category
  // Handle new material created from CreateNewMaterialButton
  const handleNewMaterialCreated = (newItem: PredefinedItem) => {
    setAllItems((prev) => [...prev, newItem]);
    setGroupedItems((prev) => {
      const cat = newItem.category_name || "Uncategorized";
      const sub = newItem.subcategory_name || "General";
      const updated = { ...prev };
      if (!updated[cat]) updated[cat] = {};
      if (!updated[cat][sub]) updated[cat][sub] = [];
      updated[cat][sub] = [...updated[cat][sub], newItem];
      return updated;
    });
    setFilteredGroupedItems((prev) => {
      const cat = newItem.category_name || "Uncategorized";
      const sub = newItem.subcategory_name || "General";
      const updated = { ...prev };
      if (!updated[cat]) updated[cat] = {};
      if (!updated[cat][sub]) updated[cat][sub] = [];
      updated[cat][sub] = [...updated[cat][sub], newItem];
      return updated;
    });
    setTempSelectedIDs((prev) => [...prev, newItem.id]);
  };

  // Pagination controls
  const PaginationControls = () => {
    const getPageNumbers = () => {
      const pages: (number | string)[] = [];
      const maxVisible = 7;

      if (totalPages <= maxVisible) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
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
          for (let i = currentPage - 1; i <= currentPage + 1; i++)
            pages.push(i);
          pages.push("...");
          pages.push(totalPages);
        }
      }
      return pages;
    };

    if (totalPages <= 1) return null;

    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "8px",
          marginTop: "15px",
        }}
      >
        <button
          type="button"
          onClick={() => setCurrentPage(currentPage - 1)}
          disabled={currentPage === 1}
          style={{
            padding: "6px 10px",
            borderRadius: "5px",
            border: "1px solid rgba(223, 223, 223, 1)",
            backgroundColor: "white",
            color: "black",
            cursor: currentPage === 1 ? "not-allowed" : "pointer",
            fontWeight: "600",
            minWidth: "36px",
            fontSize: "13px",
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
              padding: "6px 10px",
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
              minWidth: "36px",
              fontSize: "13px",
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
            padding: "6px 10px",
            borderRadius: "5px",
            border: "1px solid rgba(223, 223, 223, 1)",
            backgroundColor: "white",
            color: "black",
            cursor: currentPage === totalPages ? "not-allowed" : "pointer",
            fontWeight: "600",
            minWidth: "36px",
            fontSize: "13px",
            opacity: currentPage === totalPages ? 0.4 : 1,
          }}
        >
          ›
        </button>
      </div>
    );
  };

  // Render items table for a subcategory
  const renderItemsTable = (items: PredefinedItem[]) => (
    <>
      <table
        className="items-table two-toned"
        style={{ tableLayout: "fixed", width: "100%" }}
      >
        <colgroup>
          <col style={{ width: "50px" }} />
          <col style={{ width: "140px" }} />
          <col style={{ width: "auto" }} />
          <col style={{ width: "100px" }} />
        </colgroup>
        <thead>
          <tr>
            <th></th>
            <th>CODE</th>
            <th>ITEM</th>
            <th>UNIT</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={tempSelectedIDs.includes(item.id)}
                  onChange={() => handleCheckboxToggle(item.id)}
                  style={{
                    width: "18px",
                    height: "18px",
                    cursor: "pointer",
                    accentColor: "rgba(0, 163, 93, 1)",
                  }}
                />
              </td>
              <td style={{ whiteSpace: "nowrap" }}>{item.item_code || "-"}</td>
              <td>{item.material_description}</td>
              <td>{item.unit || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <br />
      <br />
    </>
  );

  // Subcategory header with checkbox & collapse
  const renderSubCategoryHeader = (
    category: string,
    subCategory: string,
    label: string,
    itemCount: number,
  ) => {
    const subKey = `${category}::${subCategory}`;
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: collapsedSubCategories[subKey] ? "0px" : "10px",
          cursor: "pointer",
          userSelect: "none",
        }}
        onClick={() =>
          setCollapsedSubCategories((prev) => ({
            ...prev,
            [subKey]: !prev[subKey],
          }))
        }
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 14 14"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            transition: "transform 0.2s ease",
            transform: collapsedSubCategories[subKey]
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
            textTransform: "uppercase",
          }}
        >
          {label.toUpperCase()}
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
            textTransform: "capitalize",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={isSubCategorySelected(category, subCategory)}
            onChange={(e) =>
              toggleSubCategory(category, subCategory, e.target.checked)
            }
            style={{
              width: "18px",
              height: "18px",
              cursor: "pointer",
              accentColor: "rgba(0, 163, 93, 1)",
            }}
          />
          {label.toUpperCase()}
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
          {itemCount} Items
        </div>
      </div>
    );
  };

  // Category tabs renderer (shared between select popup and could be reused)
  const renderCategoryTabs = () => (
    <div className="category-grid" style={{ marginBottom: "20px" }}>
      <div style={{ position: "relative", flex: 1, maxWidth: "70dvw" }}>
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
              className={`item ${activeCategory === "ALL" ? "active" : ""}`}
              onClick={() => setActiveCategory("ALL")}
              style={{
                flexShrink: 0,
                cursor: "pointer",
              }}
            >
              ALL
            </div>

            {categories.map((category) => (
              <div
                key={category}
                className={`item ${activeCategory === category ? "active" : ""}`}
                onClick={() => setActiveCategory(category)}
                style={{
                  flexShrink: 0,
                  cursor: "pointer",
                  textTransform: "capitalize",
                }}
              >
                {category.toUpperCase()}
              </div>
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
              width: "300px",
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
  );

  const modalContent = isOpen && (
    <FormPopUp
      header={"SELECT MATERIAL ITEMS"}
      setIsOpen={setIsOpen}
      handleSubmit={handleSubmit}
      addButtonLabel={"CONFIRM"}
      style={{ width: "75dvw", height: "95dvh" }}
    >
      {/* Search Bar + New Material Button */}
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
              padding: "8px 40px 8px 15px",
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

        {(userInfo?.departmentID === 16 || userInfo?.departmentID === 8) && (
          <CreateNewMaterialButton
            onSuccess={handleNewMaterialCreated}
            style={{ padding: "7px 20px" }}
          />
        )}
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

      {tempSelectedIDs.length > 0 && (
        <>
          <h3>ITEM(S) SELECTED ({tempSelectedIDs.length}):</h3>
          <br />
          <div
            style={{
              display: "flex",
              gap: "10px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            {tempSelectedIDs.map((id) => {
              const item = allItems.find((i) => i.id === id);
              if (!item) return null;
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
                  {item.material_description}
                  <Button
                    componentType={"button"}
                    bgColor={"transparent"}
                    borderColor={"transparent"}
                    textColor={"black"}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setTempSelectedIDs((prev) =>
                        prev.filter((i) => i !== id),
                      );
                    }}
                    style={{ padding: "0px" }}
                  >
                    <img src={crossSmallIcon} style={{ marginBottom: "2px" }} />
                  </Button>
                </Button>
              );
            })}
          </div>
          <br />
          <br />
        </>
      )}

      {/* Category Tabs — commented out
      {renderCategoryTabs()}
      */}

      {/* No Results */}
      {searchQuery.trim() && categories.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "40px",
            color: "rgba(128, 128, 128, 1)",
          }}
        >
          <p>No results found for &quot;{searchQuery}&quot;</p>
        </div>
      )}

      {/* Items — paginated */}
      <div style={{ overflowY: "auto" }}>
        {activeCategory === "ALL"
          ? Object.entries(paginatedGrouped).map(
              ([category, subCatsData], categoryIndex) => (
                <div key={category} style={{ marginBottom: "30px" }}>
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
                        fontSize: "18px",
                        textTransform: "capitalize",
                      }}
                    >
                      {categoryIndex + 1}. {category.toUpperCase()}
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
                      {Object.values(subCatsData).reduce(
                        (sum, items) => sum + items.length,
                        0,
                      )}{" "}
                      Items
                    </div>
                  </div>

                  {!collapsedCategories[category] &&
                    Object.entries(subCatsData).map(
                      ([subCategory, items], subIndex) => (
                        <div
                          key={`${category}-${subCategory}`}
                          style={{ marginBottom: "20px", marginLeft: "20px" }}
                        >
                          {renderSubCategoryHeader(
                            category,
                            subCategory,
                            `${categoryIndex + 1}.${subIndex + 1} ${subCategory}`,
                            items.length,
                          )}
                          {!collapsedSubCategories[
                            `${category}::${subCategory}`
                          ] && renderItemsTable(items)}
                        </div>
                      ),
                    )}
                </div>
              ),
            )
          : Object.entries(paginatedGrouped).map(
              ([category, subCatsData], catIdx) =>
                Object.entries(subCatsData).map(
                  ([subCategory, items], subIdx) => (
                    <div
                      key={`${category}-${subCategory}`}
                      style={{ marginBottom: "30px" }}
                    >
                      {renderSubCategoryHeader(
                        category,
                        subCategory,
                        `${categories.indexOf(activeCategory) + 1}.${subIdx + 1} ${subCategory}`,
                        items.length,
                      )}
                      {!collapsedSubCategories[`${category}::${subCategory}`] &&
                        renderItemsTable(items)}
                    </div>
                  ),
                ),
            )}
      </div>

      {/* Pagination */}
      <PaginationControls />
    </FormPopUp>
  );

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
        full={currentItemIDs.length === 0}
        disabled={disabled}
        style={style}
      >
        {currentItemIDs.length > 0 ? (
          <>
            EDIT
            <img
              src={pencilIcon}
              alt="edit"
              style={{ filter: "invert(1)", marginBottom: "2px" }}
            />
          </>
        ) : (
          <>
            SELECT MATERIAL ITEMS
            <img
              src={externalLinkIcon}
              alt="external link"
              style={{ filter: "invert(1)", marginBottom: "2px" }}
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
            header={"FILTER MATERIAL ITEMS"}
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
                  {allCategoryNames
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
