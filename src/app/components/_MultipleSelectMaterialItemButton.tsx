"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import FormPopUp from "@/app/components/FormPopup";
import Button from "./Button";
import CreateNewMaterialButton from "./_CreateNewMaterialButton";
import { useAuth } from "../context/AuthContext";

function FilterCheckbox({
  checked,
  indeterminate,
  onChange,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      className="filter-checkbox"
      checked={checked}
      onChange={onChange}
    />
  );
}

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
  const catScrollContainerRef = useRef<HTMLDivElement>(null);

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

  // New state variables
  const [showOnlySelected, setShowOnlySelected] = useState(false);
  const [activeCategoryTab, setActiveCategoryTab] = useState("");
  const [activeSubCategoryTab, setActiveSubCategoryTab] = useState("");

  // Category tab scroll arrows
  const [showLeftCatArrow, setShowLeftCatArrow] = useState(false);
  const [showRightCatArrow, setShowRightCatArrow] = useState(false);

  const checkCatScroll = () => {
    if (catScrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } =
        catScrollContainerRef.current;
      setShowLeftCatArrow(scrollLeft > 0);
      setShowRightCatArrow(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  const scrollCats = (direction: "left" | "right") => {
    if (catScrollContainerRef.current) {
      catScrollContainerRef.current.scrollBy({
        left: direction === "left" ? -300 : 300,
        behavior: "smooth",
      });
    }
  };

  // Tab scroll arrows
  const [showLeftTabArrow, setShowLeftTabArrow] = useState(false);
  const [showRightTabArrow, setShowRightTabArrow] = useState(false);

  const checkTabScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } =
        scrollContainerRef.current;
      setShowLeftTabArrow(scrollLeft > 0);
      setShowRightTabArrow(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  const scrollTabs = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -300 : 300,
        behavior: "smooth",
      });
    }
  };

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
    setFilterGroupSearch("");
    setExpandedFilterGroups(new Set());
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

  const [expandedFilterGroups, setExpandedFilterGroups] = useState<Set<string>>(
    new Set(),
  );
  const [filterGroupSearch, setFilterGroupSearch] = useState("");

  const toggleGroupedCategory = (category: string) => {
    const subcats = Object.keys(groupedItems[category] || {});
    const allSelected = subcats.every((sc) => tempFilterSubCategories.has(sc));
    const willCheck = !allSelected;
    setTempFilterSubCategories((prev) => {
      const next = new Set(prev);
      subcats.forEach((sc) => (willCheck ? next.add(sc) : next.delete(sc)));
      return next;
    });
    setTempFilterCategories((prev) => {
      const next = new Set(prev);
      willCheck ? next.add(category) : next.delete(category);
      return next;
    });
  };

  const toggleGroupedSubCategory = (subCategory: string) => {
    const parentCat = getCategoryForSubCategory(subCategory);
    const wasSelected = tempFilterSubCategories.has(subCategory);
    const newSubCats = new Set(tempFilterSubCategories);
    wasSelected ? newSubCats.delete(subCategory) : newSubCats.add(subCategory);
    setTempFilterSubCategories(newSubCats);
    if (parentCat) {
      const subcats = Object.keys(groupedItems[parentCat] || {});
      const anyLeft = subcats.some((sc) => newSubCats.has(sc));
      setTempFilterCategories((prev) => {
        const next = new Set(prev);
        anyLeft ? next.add(parentCat) : next.delete(parentCat);
        return next;
      });
    }
  };

  const hasActiveFilters =
    filterCategories.size > 0 || filterSubCategories.size > 0;

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Derived: available category tabs (filtered to only cats with selected items when showOnlySelected)
  const availableCategoryTabs = (() => {
    if (showOnlySelected) {
      const cats = new Set<string>();
      Object.entries(filteredGroupedItems).forEach(([cat, subCats]) => {
        const hasSelected = Object.values(subCats).some((items) =>
          items.some((item) => tempSelectedIDs.includes(item.id)),
        );
        if (hasSelected) cats.add(cat);
      });
      return Array.from(cats).sort();
    }
    return Object.keys(filteredGroupedItems).sort();
  })();

  // Derived: available subcategory tabs filtered by active category (and selected when showOnlySelected)
  const availableSubCategoryTabs = (() => {
    const subs = new Set<string>();
    Object.entries(filteredGroupedItems).forEach(([cat, subCats]) => {
      if (activeCategoryTab && cat !== activeCategoryTab) return;
      Object.entries(subCats).forEach(([sub, items]) => {
        if (
          showOnlySelected &&
          !items.some((item) => tempSelectedIDs.includes(item.id))
        )
          return;
        subs.add(sub);
      });
    });
    return Array.from(subs).sort();
  })();

  // Flatten items for current view
  const flatItems = (() => {
    let items: PredefinedItem[] = [];
    Object.entries(filteredGroupedItems).forEach(([cat, subCats]) => {
      if (activeCategoryTab && cat !== activeCategoryTab) return;
      Object.entries(subCats).forEach(([sub, subItems]) => {
        if (activeSubCategoryTab && sub !== activeSubCategoryTab) return;
        items.push(...subItems);
      });
    });
    if (showOnlySelected) {
      items = items.filter((item) => tempSelectedIDs.includes(item.id));
    }
    return items;
  })();

  const totalPages = Math.ceil(flatItems.length / ITEMS_PER_PAGE);
  const paginatedItems = flatItems.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

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

  const [isFetchingItems, setIsFetchingItems] = useState(false);

  // Fetch predefined items when popup opens
  useEffect(() => {
    if (!isOpen) return;

    setIsFetchingItems(true);
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
      })
      .finally(() => setIsFetchingItems(false));
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
      setShowOnlySelected(false);
      setActiveSubCategoryTab("");
    }
  }, [isOpen, currentItemIDs]);

  // Reset page when switching subcategory or category tab
  useEffect(() => {
    setCurrentPage(1);
  }, [activeSubCategoryTab, activeCategoryTab, showOnlySelected]);

  // Exit "selected only" mode when nothing is selected
  useEffect(() => {
    if (showOnlySelected && tempSelectedIDs.length === 0) {
      setShowOnlySelected(false);
      setActiveCategoryTab("");
      setActiveSubCategoryTab("");
    }
  }, [tempSelectedIDs, showOnlySelected]);

  // Re-check tab scroll arrows when available tabs change
  useEffect(() => {
    setTimeout(checkTabScroll, 50);
  }, [availableSubCategoryTabs.length]);

  useEffect(() => {
    setTimeout(checkCatScroll, 50);
  }, [availableCategoryTabs.length]);

  const getItemsForSubCategory = (sub: string): PredefinedItem[] => {
    const items: PredefinedItem[] = [];
    Object.values(filteredGroupedItems).forEach((subCats) => {
      if (subCats[sub]) items.push(...subCats[sub]);
    });
    return items;
  };

  const isSubCategoryFullySelected = (sub: string): boolean => {
    const items = getItemsForSubCategory(sub);
    return (
      items.length > 0 &&
      items.every((item) => tempSelectedIDs.includes(item.id))
    );
  };

  const toggleSubCategorySelection = (sub: string) => {
    const items = getItemsForSubCategory(sub);
    const allSelected = items.every((item) =>
      tempSelectedIDs.includes(item.id),
    );
    const ids = items.map((i) => i.id);
    if (allSelected) {
      setTempSelectedIDs((prev) => prev.filter((id) => !ids.includes(id)));
    } else {
      setTempSelectedIDs((prev) => [...new Set([...prev, ...ids])]);
    }
  };

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
          gap: "10px",
        }}
      >
        <button
          type="button"
          onClick={() => setCurrentPage(currentPage - 1)}
          disabled={currentPage === 1}
          style={{
            padding: "8px 12px",
            borderRadius: "5px",
            border: "1px solid rgba(223,223,223,1)",
            backgroundColor: "white",
            cursor: currentPage === 1 ? "not-allowed" : "pointer",
            fontWeight: 600,
            minWidth: "40px",
            opacity: currentPage === 1 ? 0.4 : 1,
            color: "black",
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
              border: "1px solid rgba(223,223,223,1)",
              backgroundColor:
                page === currentPage
                  ? "black"
                  : page === "..."
                    ? "transparent"
                    : "white",
              color: page === currentPage ? "white" : "black",
              cursor: page === "..." ? "default" : "pointer",
              fontWeight: 600,
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
            border: "1px solid rgba(223,223,223,1)",
            backgroundColor: "white",
            cursor: currentPage === totalPages ? "not-allowed" : "pointer",
            fontWeight: 600,
            minWidth: "40px",
            opacity: currentPage === totalPages ? 0.4 : 1,
            color: "black",
          }}
        >
          ›
        </button>
      </div>
    );
  };

  const modalContent = isOpen && (
    <FormPopUp
      header={"SELECT MATERIAL(S)"}
      setIsOpen={setIsOpen}
      handleSubmit={handleSubmit}
      addButtonLabel={"CONFIRM"}
      style={{ width: "75dvw", height: "95dvh" }}
      stickyFooter={
        totalPages > 1 || tempSelectedIDs.length > 0 ? (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "15px" }}
          >
            {totalPages > 1 && <PaginationControls />}
            {tempSelectedIDs.length > 0 && (
              <div>
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    marginBottom: "10px",
                    display: "block",
                  }}
                >
                  ITEM SELECTED ({tempSelectedIDs.length})
                </span>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {tempSelectedIDs.map((id) => {
                    const item = allItems.find((i) => i.id === id);
                    if (!item) return null;
                    return (
                      <Button
                        key={id}
                        componentType="button"
                        bgColor="rgba(239,239,239,1)"
                        borderColor="transparent"
                        textColor="black"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setTempSelectedIDs((prev) =>
                            prev.filter((i) => i !== id),
                          );
                        }}
                        style={{
                          borderRadius: "50px",
                          fontWeight: 600,
                          textWrap: "nowrap",
                          fontSize: "10px",
                          padding: "4px 10px",
                        }}
                      >
                        {item.material_description}{" "}
                        <img src={crossSmallIcon} style={{ width: "10px" }} />
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : undefined
      }
    >
      <div style={{ width: "100%", overflow: "hidden" }}>
        {/* Search Bar + New Material Button */}
        <div
          style={{
            display: "flex",
            gap: "10px",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              position: "relative",
              maxWidth: "250px",
              flex: "0 0 250px",
            }}
          >
            <input
              type="text"
              placeholder="SEARCH"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 40px 8px 15px",
                borderRadius: "8px",
                border: "1px solid rgba(223,223,223,1)",
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

          {/* {(userInfo?.departmentID === 16 || userInfo?.departmentID === 8) && (
            <CreateNewMaterialButton
              onSuccess={handleNewMaterialCreated}
              style={{ padding: "7px 20px" }}
            />
          )} */}

          <CreateNewMaterialButton
            onSuccess={handleNewMaterialCreated}
            style={{ padding: "7px 20px" }}
          />
        </div>

        <br />
        <br />

        {/* Category tabs */}
        {availableCategoryTabs.length > 0 && (
          <div
            style={{
              position: "relative",
              maxWidth: "calc(75dvw - 90px)",
              overflow: "hidden",
            }}
          >
            {showLeftCatArrow && (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: "120px",
                  background:
                    "linear-gradient(to right, white 0%, rgba(255,255,255,0) 100%)",
                  pointerEvents: "none",
                  zIndex: 5,
                }}
              />
            )}
            {showLeftCatArrow && (
              <button
                type="button"
                onClick={() => scrollCats("left")}
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
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <img
                  src={arrowRight}
                  style={{ transform: "rotate(180deg)" }}
                  alt="scroll left"
                />
              </button>
            )}
            <div
              ref={catScrollContainerRef}
              onScroll={checkCatScroll}
              style={{
                display: "flex",
                gap: "8px",
                overflowX: "auto",
                scrollbarWidth: "none",
                msOverflowStyle:
                  "none" as React.CSSProperties["msOverflowStyle"],
                paddingLeft: showLeftCatArrow ? "44px" : "0",
                paddingRight: showRightCatArrow ? "44px" : "0",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setActiveCategoryTab("");
                  setActiveSubCategoryTab("");
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 14px",
                  borderRadius: "6px",
                  border: "none",
                  backgroundColor: !activeCategoryTab
                    ? "rgba(239,239,239,1)"
                    : "rgba(221,221,221,1)",
                  color: "black",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  fontSize: "13px",
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                ALL
              </button>
              {availableCategoryTabs.map((cat) => {
                const isActive = activeCategoryTab === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setActiveCategoryTab(isActive ? "" : cat);
                      setActiveSubCategoryTab("");
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "6px 14px",
                      borderRadius: "6px",
                      border: "none",
                      backgroundColor: isActive
                        ? "rgba(239,239,239,1)"
                        : "rgba(221,221,221,1)",
                      color: "black",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      fontSize: "13px",
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    {cat.toUpperCase()}
                  </button>
                );
              })}
            </div>
            {showRightCatArrow && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: 0,
                  bottom: 0,
                  width: "120px",
                  background:
                    "linear-gradient(to left, white 0%, rgba(255,255,255,0) 100%)",
                  pointerEvents: "none",
                  zIndex: 5,
                }}
              />
            )}
            {showRightCatArrow && (
              <button
                type="button"
                onClick={() => scrollCats("right")}
                style={{
                  position: "absolute",
                  right: "0px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  zIndex: 10,
                  backgroundColor: "black",
                  color: "white",
                  border: "none",
                  borderRadius: "10px",
                  width: "32px",
                  height: "32px",
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
        )}

        <br />
        <br />

        {/* Filter row */}
        <div
          style={{
            display: "flex",
            gap: "10px",
            alignItems: "center",
            flexWrap: "wrap",
            marginBottom: "15px",
          }}
        >
          <Button
            componentType="button"
            bgColor="white"
            borderColor="rgba(241,244,246,1)"
            textColor="black"
            onClick={(e) => {
              e.preventDefault();
              handleFilterOpen();
            }}
            style={{ borderRadius: "50px" }}
          >
            FILTER <img src={filterIcon} alt="filter" />
          </Button>

          {/* Selected items chip */}
          {tempSelectedIDs.length > 0 && (
            <Button
              componentType="button"
              bgColor={showOnlySelected ? "black" : "rgba(239,239,239,1)"}
              borderColor="transparent"
              textColor={showOnlySelected ? "white" : "black"}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setShowOnlySelected((v) => !v);
                setActiveCategoryTab("");
                setActiveSubCategoryTab("");
              }}
              style={{
                borderRadius: "50px",
                fontWeight: 600,
                textWrap: "nowrap",
              }}
            >
              SELECTED ITEMS ({tempSelectedIDs.length})
            </Button>
          )}

          {/* Category filter chip */}
          {filterCategories.size > 0 && (
            <Button
              componentType="button"
              bgColor="rgba(239,239,239,1)"
              borderColor="transparent"
              textColor="black"
              onClick={() => {
                setFilterCategories(new Set());
                setFilterSubCategories(new Set());
                setActiveSubCategoryTab("");
              }}
              style={{
                borderRadius: "50px",
                fontWeight: 600,
                textWrap: "nowrap",
              }}
            >
              CATEGORY:{" "}
              <span style={{ color: "rgba(16,185,129,1)" }}>
                {Array.from(filterCategories)[0].toUpperCase()}
                {filterCategories.size > 1
                  ? `, +${filterCategories.size - 1} MORE`
                  : ""}
              </span>{" "}
              <img src={crossSmallIcon} style={{ width: "12px" }} />
            </Button>
          )}

          {/* Subcategory filter chip */}
          {filterSubCategories.size > 0 && (
            <Button
              componentType="button"
              bgColor="rgba(239,239,239,1)"
              borderColor="transparent"
              textColor="black"
              onClick={() => {
                setFilterSubCategories(new Set());
                setActiveSubCategoryTab("");
              }}
              style={{
                borderRadius: "50px",
                fontWeight: 600,
                textWrap: "nowrap",
              }}
            >
              SUBCATEGORY:{" "}
              <span style={{ color: "rgba(16,185,129,1)" }}>
                {Array.from(filterSubCategories)[0].toUpperCase()}
                {filterSubCategories.size > 1
                  ? `, +${filterSubCategories.size - 1} MORE`
                  : ""}
              </span>{" "}
              <img src={crossSmallIcon} style={{ width: "12px" }} />
            </Button>
          )}
        </div>

        {/* Subcategory tabs */}
        {availableSubCategoryTabs.length > 0 && (
          <div
            style={{
              position: "relative",
              maxWidth: "calc(75dvw - 90px)",
              overflow: "hidden",
            }}
          >
            {/* Left fade + arrow */}
            {showLeftTabArrow && (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: "120px",
                  background:
                    "linear-gradient(to right, white 0%, rgba(255,255,255,0) 100%)",
                  pointerEvents: "none",
                  zIndex: 5,
                }}
              />
            )}
            {showLeftTabArrow && (
              <button
                type="button"
                onClick={() => scrollTabs("left")}
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
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <img
                  src={arrowRight}
                  style={{ transform: "rotate(180deg)" }}
                  alt="scroll left"
                />
              </button>
            )}

            {/* Scrollable tab strip */}
            <div
              ref={scrollContainerRef}
              onScroll={checkTabScroll}
              style={{
                display: "flex",
                gap: "8px",
                overflowX: "auto",
                scrollbarWidth: "none",
                msOverflowStyle:
                  "none" as React.CSSProperties["msOverflowStyle"],
                marginBottom: "0",
                paddingLeft: showLeftTabArrow ? "44px" : "0",
                paddingRight: showRightTabArrow ? "44px" : "0",
              }}
            >
              {availableSubCategoryTabs.map((sub, idx) => {
                const isActive = activeSubCategoryTab === sub;
                const isChecked = isSubCategoryFullySelected(sub);
                const isFirst = idx === 0;
                const isLast = idx === availableSubCategoryTabs.length - 1;
                return (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => setActiveSubCategoryTab(isActive ? "" : sub)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "6px 14px",
                      borderRadius: isActive
                        ? `${isFirst ? "0" : "6px"} ${isLast ? "0" : "6px"} 0 0`
                        : "6px 6px 0 0",
                      border: "none",
                      borderBottom: "none",
                      backgroundColor: isActive
                        ? "rgba(239,239,239,1)"
                        : "rgba(221,221,221,1)",
                      color: "black",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      fontSize: "13px",
                      fontWeight: 600,
                      flexShrink: 0,
                      position: "relative",
                      zIndex: isActive ? 1 : 0,
                    }}
                  >
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSubCategorySelection(sub);
                      }}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "14px",
                        height: "14px",
                        minWidth: "14px",
                        borderRadius: "3px",
                        border: isChecked
                          ? "2px solid rgba(0,163,93,1)"
                          : "2px solid rgba(180,180,180,1)",
                        backgroundColor: isChecked
                          ? "rgba(0,163,93,1)"
                          : "white",
                        flexShrink: 0,
                        cursor: "pointer",
                      }}
                    >
                      {isChecked && (
                        <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                          <path
                            d="M1 3.5L3.5 6L8 1"
                            stroke="white"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>
                    {sub.toUpperCase()}
                  </button>
                );
              })}
            </div>

            {/* Right fade + arrow */}
            {showRightTabArrow && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: 0,
                  bottom: 0,
                  width: "120px",
                  background:
                    "linear-gradient(to left, white 0%, rgba(255,255,255,0) 100%)",
                  pointerEvents: "none",
                  zIndex: 5,
                }}
              />
            )}
            {showRightTabArrow && (
              <button
                type="button"
                onClick={() => scrollTabs("right")}
                style={{
                  position: "absolute",
                  right: "0px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  zIndex: 10,
                  backgroundColor: "black",
                  color: "white",
                  border: "none",
                  borderRadius: "10px",
                  width: "32px",
                  height: "32px",
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
        )}

        {/* No results message */}
        {!isFetchingItems && flatItems.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "40px",
              color: "rgba(128,128,128,1)",
            }}
          >
            {showOnlySelected
              ? "No selected items match current filters."
              : searchQuery.trim()
                ? `No results for "${searchQuery}"`
                : "No items found."}
          </div>
        )}

        {/* Flat items table */}
        {flatItems.length > 0 && (
          <table
            className="items-table two-toned"
            style={{
              tableLayout: "fixed",
              width: "100%",
              borderTopLeftRadius: "0",
              borderTopRightRadius: "0",
            }}
          >
            <colgroup>
              <col style={{ width: "50px" }} />
              <col style={{ width: "auto" }} />
              <col style={{ width: "200px" }} />
            </colgroup>
            <thead>
              <tr>
                <th></th>
                <th>MATERIAL</th>
                <th>UNIT</th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => handleCheckboxToggle(item.id)}
                  style={{ cursor: "pointer" }}
                >
                  <td onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={tempSelectedIDs.includes(item.id)}
                      onChange={() => handleCheckboxToggle(item.id)}
                      style={{
                        width: "18px",
                        height: "18px",
                        cursor: "pointer",
                        accentColor: "rgba(0,163,93,1)",
                      }}
                    />
                  </td>
                  <td>{item.material_description}</td>
                  <td>{item.unit || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
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
            {/* Grouped Category / Subcategory filter */}
            <div style={{ marginBottom: "30px" }}>
              <h3
                style={{
                  marginBottom: "15px",
                  fontSize: "14px",
                  fontWeight: "600",
                }}
              >
                CATEGORY &amp; SUBCATEGORY
              </h3>
              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  padding: "10px",
                }}
              >
                {/* Search */}
                <div style={{ position: "relative", marginBottom: "15px" }}>
                  <input
                    type="text"
                    placeholder="SEARCH"
                    value={filterGroupSearch}
                    onChange={(e) => setFilterGroupSearch(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 40px 10px 15px",
                      borderRadius: "8px",
                      border: "1px solid rgba(223,223,223,1)",
                      fontSize: "14px",
                      backgroundColor: "rgba(245,245,245,1)",
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

                {/* Select All */}
                {(() => {
                  const allSubcats = allCategoryNames.flatMap((c) =>
                    Object.keys(groupedItems[c] || {}),
                  );
                  const allChecked =
                    allSubcats.length > 0 &&
                    allSubcats.every((sc) => tempFilterSubCategories.has(sc));
                  const anyChecked = allSubcats.some((sc) =>
                    tempFilterSubCategories.has(sc),
                  );
                  return (
                    <div style={{ marginBottom: "10px" }}>
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          cursor: "pointer",
                        }}
                      >
                        <FilterCheckbox
                          checked={allChecked}
                          indeterminate={!allChecked && anyChecked}
                          onChange={() => {
                            if (allChecked) {
                              setTempFilterSubCategories(new Set());
                              setTempFilterCategories(new Set());
                            } else {
                              setTempFilterSubCategories(new Set(allSubcats));
                              setTempFilterCategories(
                                new Set(allCategoryNames),
                              );
                            }
                          }}
                        />
                        <h4>Select All</h4>
                      </label>
                    </div>
                  );
                })()}

                {/* Groups */}
                <div style={{ maxHeight: "320px", overflowY: "auto" }}>
                  {(() => {
                    const q = filterGroupSearch.trim().toLowerCase();
                    const visibleGroups = allCategoryNames
                      .map((cat) => ({
                        cat,
                        subcats: q
                          ? Object.keys(groupedItems[cat] || {}).filter(
                              (sc) =>
                                sc.toLowerCase().includes(q) ||
                                cat.toLowerCase().includes(q),
                            )
                          : Object.keys(groupedItems[cat] || {}),
                      }))
                      .filter((g) => g.subcats.length > 0);

                    if (visibleGroups.length === 0) {
                      return (
                        <div
                          style={{
                            textAlign: "center",
                            padding: "20px",
                            color: "#888",
                          }}
                        >
                          No results found
                        </div>
                      );
                    }

                    return visibleGroups.map(({ cat, subcats }) => {
                      const allSubcatsChecked =
                        subcats.length > 0 &&
                        subcats.every((sc) => tempFilterSubCategories.has(sc));
                      const someSubcatsChecked = subcats.some((sc) =>
                        tempFilterSubCategories.has(sc),
                      );
                      const isExpanded =
                        q !== "" ||
                        expandedFilterGroups.has(cat) ||
                        subcats.length === 1;

                      return (
                        <div key={cat} style={{ marginBottom: "10px" }}>
                          {/* Category header row */}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                            }}
                          >
                            <FilterCheckbox
                              checked={allSubcatsChecked}
                              indeterminate={
                                !allSubcatsChecked && someSubcatsChecked
                              }
                              onChange={() => toggleGroupedCategory(cat)}
                            />
                            <h4
                              style={{
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                flex: 1,
                              }}
                              onClick={() =>
                                setExpandedFilterGroups((prev) => {
                                  const next = new Set(prev);
                                  next.has(cat)
                                    ? next.delete(cat)
                                    : next.add(cat);
                                  return next;
                                })
                              }
                            >
                              {cat}
                              <span style={{ fontSize: "10px", color: "#888" }}>
                                {isExpanded ? "∧" : "∨"}
                              </span>
                            </h4>
                          </div>

                          {/* Subcategory items (indented) */}
                          {isExpanded && (
                            <div
                              style={{ marginLeft: "28px", marginTop: "8px" }}
                            >
                              {subcats.map((sc) => (
                                <div key={sc} style={{ marginBottom: "8px" }}>
                                  <label
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "10px",
                                      cursor: "pointer",
                                    }}
                                  >
                                    <FilterCheckbox
                                      checked={tempFilterSubCategories.has(sc)}
                                      onChange={() =>
                                        toggleGroupedSubCategory(sc)
                                      }
                                    />
                                    <h4>{sc}</h4>
                                  </label>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          </FormPopUp>,
          document.body,
        )}
    </>
  );
}
