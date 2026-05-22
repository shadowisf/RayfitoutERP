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
  compact?: boolean;
};

type GroupedBoqLines = {
  [category: string]: {
    [subCategory: string]: BoqLine[];
  };
};

const ITEMS_PER_PAGE = 50;

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

export default function MultipleSelectBoqItemButton({
  projectID,
  onSelectBoq,
  currentBoqLineIDs = [],
  disabled,
  style,
  singleSelect = false,
  compact = false,
}: props) {
  const locationIcon = "/icons/location-boq.svg";
  const arrowRight = "/icons/arrow-right.svg";
  const searchIcon = "/icons/search.svg";
  const crossIcon = "/icons/cross-small.svg";
  const externalLinkIcon = "/icons/external-link.svg";
  const filterIcon = "/icons/filter.svg";

  const { userInfo } = useAuth();

  const scrollContainerRef = useRef<HTMLDivElement>(null); // subcategory tabs
  const catScrollContainerRef = useRef<HTMLDivElement>(null); // category tabs

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
    return num % 1 === 0
      ? num.toFixed(0)
      : parseFloat(num.toFixed(2)).toString();
  };

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
  const allCategories = Object.keys(groupedBoqLines);

  // Temp filter state (only applied on CONFIRM)
  const [tempFilterCategories, setTempFilterCategories] = useState<Set<string>>(
    new Set(),
  );
  const [tempFilterSubCategories, setTempFilterSubCategories] = useState<
    Set<string>
  >(new Set());

  // New state
  const [activeCategoryTab, setActiveCategoryTab] = useState("");
  const [activeSubCategoryTab, setActiveSubCategoryTab] = useState("");
  const [showOnlySelected, setShowOnlySelected] = useState(false);

  const [showLeftCatArrow, setShowLeftCatArrow] = useState(false);
  const [showRightCatArrow, setShowRightCatArrow] = useState(false);
  const [showLeftTabArrow, setShowLeftTabArrow] = useState(false);
  const [showRightTabArrow, setShowRightTabArrow] = useState(false);

  const [expandedFilterGroups, setExpandedFilterGroups] = useState<Set<string>>(
    new Set(),
  );
  const [filterGroupSearch, setFilterGroupSearch] = useState("");
  const [isFetchingItems, setIsFetchingItems] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Scroll functions for category tabs
  const checkCatScroll = () => {
    if (catScrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } =
        catScrollContainerRef.current;
      setShowLeftCatArrow(scrollLeft > 0);
      setShowRightCatArrow(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };
  const scrollCats = (direction: "left" | "right") => {
    catScrollContainerRef.current?.scrollBy({
      left: direction === "left" ? -300 : 300,
      behavior: "smooth",
    });
  };

  // Scroll functions for subcategory tabs
  const checkTabScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } =
        scrollContainerRef.current;
      setShowLeftTabArrow(scrollLeft > 0);
      setShowRightTabArrow(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };
  const scrollTabs = (direction: "left" | "right") => {
    scrollContainerRef.current?.scrollBy({
      left: direction === "left" ? -300 : 300,
      behavior: "smooth",
    });
  };

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

  const toggleGroupedCategory = (category: string) => {
    const subcats = Object.keys(groupedBoqLines[category] || {});
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
      const subcats = Object.keys(groupedBoqLines[parentCat] || {});
      const anyLeft = subcats.some((sc) => newSubCats.has(sc));
      setTempFilterCategories((prev) => {
        const next = new Set(prev);
        anyLeft ? next.add(parentCat) : next.delete(parentCat);
        return next;
      });
    }
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

  // Fetch BOQ lines when projectID is available
  useEffect(() => {
    if (projectID && projectID > 0) {
      setIsFetchingItems(true);
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
        })
        .finally(() => setIsFetchingItems(false));
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
      setActiveCategoryTab("");
      setActiveSubCategoryTab("");
      setShowOnlySelected(false);
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
      setSelectedCategories((prev) => new Set([...prev, category]));
      setTempSelectedBoqIDs((prev) => [
        ...new Set([...prev, ...allIdsInCategory]),
      ]);
      const subCats = Object.keys(categoryData).map(
        (subCat) => `${category}::${subCat}`,
      );
      setSelectedSubCategories((prev) => new Set([...prev, ...subCats]));
    } else {
      setSelectedCategories((prev) => {
        const newSet = new Set(prev);
        newSet.delete(category);
        return newSet;
      });
      setTempSelectedBoqIDs((prev) =>
        prev.filter((id) => !allIdsInCategory.includes(id)),
      );
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
      setSelectedSubCategories((prev) => new Set([...prev, subCatKey]));
      setTempSelectedBoqIDs((prev) => [
        ...new Set([...prev, ...idsInSubCategory]),
      ]);
      const allSubCats = Object.keys(filteredGroupedBoqLines[category] || {});
      const selectedSubCatsInCategory = Array.from(
        selectedSubCategories,
      ).filter((key) => key.startsWith(`${category}::`));
      if (selectedSubCatsInCategory.length + 1 >= allSubCats.length) {
        setSelectedCategories((prev) => new Set([...prev, category]));
      }
    } else {
      setSelectedSubCategories((prev) => {
        const newSet = new Set(prev);
        newSet.delete(subCatKey);
        return newSet;
      });
      setTempSelectedBoqIDs((prev) =>
        prev.filter((id) => !idsInSubCategory.includes(id)),
      );
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

  // Check if subcategory is selected
  const isSubCategorySelected = (category: string, subCategory: string) => {
    return selectedSubCategories.has(`${category}::${subCategory}`);
  };

  // Derived tab data
  const availableCategoryTabs = (() => {
    if (showOnlySelected) {
      const cats = new Set<string>();
      Object.entries(filteredGroupedBoqLines).forEach(([cat, subCats]) => {
        if (
          Object.values(subCats).some((items) =>
            items.some((item) => tempSelectedBoqIDs.includes(item.id)),
          )
        )
          cats.add(cat);
      });
      return Array.from(cats).sort();
    }
    return Object.keys(filteredGroupedBoqLines).sort();
  })();

  const availableSubCategoryTabs = (() => {
    const subs = new Set<string>();
    Object.entries(filteredGroupedBoqLines).forEach(([cat, subCats]) => {
      if (activeCategoryTab && cat !== activeCategoryTab) return;
      Object.entries(subCats).forEach(([sub, items]) => {
        if (
          showOnlySelected &&
          !items.some((item) => tempSelectedBoqIDs.includes(item.id))
        )
          return;
        subs.add(sub);
      });
    });
    return Array.from(subs).sort();
  })();

  // Data to actually render in the table
  const viewData: GroupedBoqLines = (() => {
    const result: GroupedBoqLines = {};
    Object.entries(filteredGroupedBoqLines).forEach(([cat, subCats]) => {
      if (activeCategoryTab && cat !== activeCategoryTab) return;
      Object.entries(subCats).forEach(([sub, items]) => {
        if (activeSubCategoryTab && sub !== activeSubCategoryTab) return;
        const filteredItems = showOnlySelected
          ? items.filter((item) => tempSelectedBoqIDs.includes(item.id))
          : items;
        if (filteredItems.length === 0) return;
        if (!result[cat]) result[cat] = {};
        result[cat][sub] = filteredItems;
      });
    });
    return result;
  })();

  // Flat items for current view (from viewData)
  const flatItems: BoqLine[] = (() => {
    const items: BoqLine[] = [];
    Object.values(viewData).forEach((subCats) => {
      Object.values(subCats).forEach((subItems) => items.push(...subItems));
    });
    return items;
  })();

  const totalPages = Math.ceil(flatItems.length / ITEMS_PER_PAGE);
  const paginatedItems = flatItems.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  // Scroll arrow effects (must be after derived values are declared)
  useEffect(() => {
    setTimeout(checkTabScroll, 50);
  }, [availableSubCategoryTabs.length]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setTimeout(checkCatScroll, 50);
  }, [availableCategoryTabs.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-check arrows after FormPopup's 500ms spinner clears
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      checkCatScroll();
      checkTabScroll();
    }, 600);
    return () => clearTimeout(timer);
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset page on tab/filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    activeSubCategoryTab,
    activeCategoryTab,
    showOnlySelected,
    searchQuery,
    filterCategories,
    filterSubCategories,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  // Exit "selected only" mode when nothing is selected
  useEffect(() => {
    if (showOnlySelected && tempSelectedBoqIDs.length === 0) {
      setShowOnlySelected(false);
      setActiveCategoryTab("");
      setActiveSubCategoryTab("");
    }
  }, [tempSelectedBoqIDs, showOnlySelected]);

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

  // Create the modal content
  const modalContent = isOpen && (
    <FormPopUp
      header={"SELECT BOQ ITEMS"}
      setIsOpen={setIsOpen}
      handleSubmit={handleSubmit}
      addButtonLabel={"CONFIRM"}
      style={{ width: "75dvw", height: "95dvh" }}
      stickyFooter={
        totalPages > 1 || tempSelectedBoqIDs.length > 0 ? (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "15px" }}
          >
            {totalPages > 1 && <PaginationControls />}
            {tempSelectedBoqIDs.length > 0 && (
              <div>
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    marginBottom: "10px",
                    display: "block",
                  }}
                >
                  ITEM SELECTED ({tempSelectedBoqIDs.length})
                </span>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {tempSelectedBoqIDs.map((id) => {
                    const boq = boqLineValues.find((b) => b.id === id);
                    if (!boq) return null;
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
                          setTempSelectedBoqIDs((prev) =>
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
                        {boq.item_number} - {boq.item_name}
                        <img src={crossIcon} style={{ width: "10px" }} />
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
        {/* Search bar */}
        <div
          style={{
            display: "flex",
            gap: "10px",
            alignItems: "center",
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
                padding: "7px 40px 7px 15px",
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
                  left: 0,
                  top: "50%",
                  transform: "translateY(-50%)",
                  zIndex: 10,
                  backgroundColor: "black",
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
                msOverflowStyle: "none" as any,
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
              {availableCategoryTabs.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setActiveCategoryTab(activeCategoryTab === cat ? "" : cat);
                    setActiveSubCategoryTab("");
                  }}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "6px",
                    border: "none",
                    backgroundColor:
                      activeCategoryTab === cat
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
              ))}
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
                  right: 0,
                  top: "50%",
                  transform: "translateY(-50%)",
                  zIndex: 10,
                  backgroundColor: "black",
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
          {tempSelectedBoqIDs.length > 0 && (
            <Button
              componentType="button"
              bgColor={showOnlySelected ? "black" : "rgba(239,239,239,1)"}
              borderColor="transparent"
              textColor={showOnlySelected ? "white" : "black"}
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
              SELECTED ITEMS ({tempSelectedBoqIDs.length})
            </Button>
          )}
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
              <img src={crossIcon} style={{ width: "12px" }} />
            </Button>
          )}
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
              <img src={crossIcon} style={{ width: "12px" }} />
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
                  left: 0,
                  top: "50%",
                  transform: "translateY(-50%)",
                  zIndex: 10,
                  backgroundColor: "black",
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
              ref={scrollContainerRef}
              onScroll={checkTabScroll}
              style={{
                display: "flex",
                gap: "8px",
                overflowX: "auto",
                scrollbarWidth: "none",
                msOverflowStyle: "none" as any,
                paddingLeft: showLeftTabArrow ? "44px" : "0",
                paddingRight: showRightTabArrow ? "44px" : "0",
              }}
            >
              {availableSubCategoryTabs.map((sub) => {
                const isActive = activeSubCategoryTab === sub;
                // check if all items in this sub (within active cat) are selected
                const subItems: BoqLine[] = [];
                Object.entries(filteredGroupedBoqLines).forEach(
                  ([cat, subCats]) => {
                    if (activeCategoryTab && cat !== activeCategoryTab) return;
                    if (subCats[sub]) subItems.push(...subCats[sub]);
                  },
                );
                const isChecked =
                  subItems.length > 0 &&
                  subItems.every((item) =>
                    tempSelectedBoqIDs.includes(item.id),
                  );
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
                      borderRadius: "6px 6px 0 0",
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
                    {!singleSelect && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          const ids = subItems.map((i) => i.id);
                          if (isChecked) {
                            setTempSelectedBoqIDs((prev) =>
                              prev.filter((id) => !ids.includes(id)),
                            );
                          } else {
                            setTempSelectedBoqIDs((prev) => [
                              ...new Set([...prev, ...ids]),
                            ]);
                          }
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
                          <svg
                            width="9"
                            height="7"
                            viewBox="0 0 9 7"
                            fill="none"
                          >
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
                    )}
                    {sub.toUpperCase()}
                  </button>
                );
              })}
            </div>
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
                  right: 0,
                  top: "50%",
                  transform: "translateY(-50%)",
                  zIndex: 10,
                  backgroundColor: "black",
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

        {/* No results */}
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

        {/* Flat BOQ table */}
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
              <col style={{ width: "120px" }} />
              <col />
              <col style={{ width: "130px" }} />
              {canSeePrice && (
                <>
                  <col style={{ width: "150px" }} />
                  <col style={{ width: "180px" }} />
                </>
              )}
              <col style={{ width: "150px" }} />
            </colgroup>
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
              {paginatedItems.map((boq) => {
                const attachmentUrls = parseAttachments(boq.attachments);
                return (
                  <tr
                    key={boq.id}
                    onClick={() => handleCheckboxToggle(boq.id)}
                    style={{ cursor: "pointer" }}
                  >
                    <td onClick={(e) => e.stopPropagation()}>
                      <input
                        type={singleSelect ? "radio" : "checkbox"}
                        name={singleSelect ? "boq-select" : undefined}
                        checked={tempSelectedBoqIDs.includes(boq.id)}
                        onChange={() => handleCheckboxToggle(boq.id)}
                        style={{
                          width: "18px",
                          height: "18px",
                          cursor: "pointer",
                          accentColor: "rgba(0,163,93,1)",
                        }}
                      />
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>{boq.item_number}</td>
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
                                color: "rgba(105,105,105,1)",
                              }}
                            >
                              {boq.location}
                            </span>
                          </div>
                        )}
                        {boq.scope_of_work && (
                          <div
                            style={{
                              backgroundColor: "rgba(225,225,225,1)",
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
      {compact ? (
        <Button
          componentType={"button"}
          bgColor={"rgb(239, 239, 239)"}
          borderColor={"rgb(223, 223, 223)"}
          textColor={"black"}
          onClick={(e) => {
            (e as React.MouseEvent).preventDefault();
            setIsOpen(true);
          }}
          disabled={disabled}
          style={{ padding: "7px 7px", ...style }}
        >
          {currentBoqLineIDs.length > 0 ? (
            <img src="/icons/pencil.svg" alt="edit boq" />
          ) : (
            <img src="/icons/plus.svg" alt="select boq" />
          )}
        </Button>
      ) : (
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
              <span>EDIT</span>
              <img
                src="/icons/pencil.svg"
                alt="edit"
                style={{ filter: "invert(1)", marginBottom: "2px" }}
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
      )}

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
                  const allSubcats = allCategories.flatMap((c) =>
                    Object.keys(groupedBoqLines[c] || {}),
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
                              setTempFilterCategories(new Set(allCategories));
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
                    const visibleGroups = allCategories
                      .map((cat) => ({
                        cat,
                        subcats: q
                          ? Object.keys(groupedBoqLines[cat] || {}).filter(
                              (sc) =>
                                sc.toLowerCase().includes(q) ||
                                cat.toLowerCase().includes(q),
                            )
                          : Object.keys(groupedBoqLines[cat] || {}),
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
