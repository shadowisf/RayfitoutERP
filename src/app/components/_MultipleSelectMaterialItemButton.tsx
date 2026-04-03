"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import SingleSelectDropdown from "@/app/components/SingleSelectDropdown";
import Button from "./Button";
import { UNIT_OPTIONS } from "@/constants/units";

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
  const arrowRight = "/icons/arrow-right.svg";
  const searchIcon = "/icons/search.svg";
  const externalLinkIcon = "/icons/external-link.svg";
  const pencilIcon = "/icons/pencil.svg";

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

  // Category tab states
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // NEW MATERIAL popup
  const [showNewMaterial, setShowNewMaterial] = useState(false);
  const [newMatDescription, setNewMatDescription] = useState("");
  const [newMatCategoryID, setNewMatCategoryID] = useState<string | number>("");
  const [newMatSubCategoryID, setNewMatSubCategoryID] = useState<
    string | number
  >("");
  const [newMatUnit, setNewMatUnit] = useState("");
  const [newMatBrand, setNewMatBrand] = useState("");
  const [materialCategoryValues, setMaterialCategoryValues] = useState<any[]>(
    [],
  );
  const [materialSubCategoryValues, setMaterialSubCategoryValues] = useState<
    any[]
  >([]);

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

  // Filter items based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredGroupedItems(groupedItems);
      setCurrentPage(1);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered: GroupedItems = {};

    Object.entries(groupedItems).forEach(([category, subCats]) => {
      Object.entries(subCats).forEach(([subCategory, items]) => {
        const filteredItems = items.filter((item) => {
          return (
            item.material_description?.toLowerCase().includes(query) ||
            item.item_code?.toLowerCase().includes(query) ||
            item.brand?.toLowerCase().includes(query)
          );
        });

        if (filteredItems.length > 0) {
          if (!filtered[category]) filtered[category] = {};
          filtered[category][subCategory] = filteredItems;
        }
      });
    });

    setFilteredGroupedItems(filtered);
    setCurrentPage(1);
  }, [searchQuery, groupedItems]);

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

  // Fetch categories for NEW MATERIAL form
  useEffect(() => {
    if (!showNewMaterial) return;
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMaterialCategoryValues`,
    )
      .then((res) => res.json())
      .then(setMaterialCategoryValues)
      .catch(console.error);

    // Always fetch all subcategories
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMaterialSubCategoryValues`,
      { method: "GET", headers: { "Content-Type": "application/json" } },
    )
      .then((res) => res.json())
      .then(setMaterialSubCategoryValues)
      .catch(console.error);
  }, [showNewMaterial]);

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
  const handleNewMatSubCategoryChange = (val: string | number) => {
    setNewMatSubCategoryID(val);
    if (val && materialSubCategoryValues.length > 0) {
      const subCat = materialSubCategoryValues.find((sc: any) => sc.id === val);
      if (subCat?.category_id && !newMatCategoryID) {
        setNewMatCategoryID(subCat.category_id);
      }
    }
  };

  // Handle NEW MATERIAL submit
  const handleNewMaterialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMatDescription.trim()) {
      return;
    }
    if (!newMatCategoryID) {
      return;
    }
    if (!newMatSubCategoryID) {
      return;
    }

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getPredefinedItems`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            material_description: newMatDescription.trim(),
            category_id: Number(newMatCategoryID),
            subcategory_id: Number(newMatSubCategoryID),
            unit: newMatUnit || null,
            brand: newMatBrand || null,
          }),
        },
      );

      if (!res.ok) return;

      const newItem: PredefinedItem = await res.json();

      // Add to allItems and groupedItems
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

      // Auto-select the new item
      setTempSelectedIDs((prev) => [...prev, newItem.id]);

      // Reset and close
      setShowNewMaterial(false);
      setNewMatDescription("");
      setNewMatCategoryID("");
      setNewMatSubCategoryID("");
      setNewMatUnit("");
      setNewMatBrand("");
    } catch {
      // silent
    }
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
      </div>
    );
  };

  // Render items table for a subcategory
  const renderItemsTable = (items: PredefinedItem[]) => (
    <>
      <table className="items-table two-toned">
        <thead>
          <tr>
            <th></th>
            <th>ITEM CODE</th>
            <th>DESCRIPTION</th>
            <th>BRAND</th>
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
              <td>{item.brand || "-"}</td>
              <td>{item.unit || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <br />
      <br />
    </>
  );

  // Subcategory header with checkbox
  const renderSubCategoryHeader = (
    category: string,
    subCategory: string,
    label: string,
  ) => (
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
          textTransform: "capitalize",
        }}
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
    </div>
  );

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
      style={{ minWidth: "1100px", minHeight: "80dvh" }}
    >
      {/* Search Bar + New Material Button */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "15px",
          marginBottom: "20px",
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
              width: "100%",
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

        <Button
          componentType={"button"}
          bgColor={"black"}
          borderColor={"black"}
          textColor={"white"}
          onClick={(e) => {
            e.preventDefault();
            setShowNewMaterial(true);
          }}
          style={{
            padding: "7px 20px",
          }}
        >
          NEW MATERIAL +
        </Button>
      </div>

      {/* Category Tabs */}
      {renderCategoryTabs()}

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
      <div style={{ maxHeight: "500px", overflowY: "auto" }}>
        {activeCategory === "ALL"
          ? Object.entries(paginatedGrouped).map(
              ([category, subCatsData], categoryIndex) => (
                <div key={category} style={{ marginBottom: "30px" }}>
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
                    <h2
                      style={{
                        margin: 0,
                        fontSize: "18px",
                        textTransform: "capitalize",
                      }}
                    >
                      {categoryIndex + 1}. {category.toUpperCase()}
                    </h2>
                  </div>

                  {Object.entries(subCatsData).map(
                    ([subCategory, items], subIndex) => (
                      <div
                        key={`${category}-${subCategory}`}
                        style={{ marginBottom: "20px", marginLeft: "20px" }}
                      >
                        {renderSubCategoryHeader(
                          category,
                          subCategory,
                          `${categoryIndex + 1}.${subIndex + 1} ${subCategory}`,
                        )}
                        {renderItemsTable(items)}
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
                      )}
                      {renderItemsTable(items)}
                    </div>
                  ),
                ),
            )}
      </div>

      {/* Pagination */}
      <PaginationControls />
    </FormPopUp>
  );

  // NEW MATERIAL popup (separate FormPopUp)
  const newMaterialModal = showNewMaterial && (
    <FormPopUp
      header={"CREATE NEW MATERIAL"}
      setIsOpen={setShowNewMaterial}
      handleSubmit={handleNewMaterialSubmit}
      addButtonLabel={"CONFIRM"}
    >
      <div className="input-row full">
        <InputItem
          label={"DESCRIPTION"}
          value={newMatDescription}
          type={"text"}
          required
          onChange={(e) => setNewMatDescription(e.target.value)}
        />
      </div>

      <div className="input-row half">
        <SingleSelectDropdown
          label={"CATEGORY"}
          dbData={materialCategoryValues}
          selectedValue={newMatCategoryID}
          onChange={(val) => {
            setNewMatCategoryID(val);
          }}
          placeholder="SELECT CATEGORY"
          required
          style={{ width: "350px" }}
        />
        <SingleSelectDropdown
          label={"SUBCATEGORY"}
          dbData={materialSubCategoryValues}
          selectedValue={newMatSubCategoryID}
          onChange={handleNewMatSubCategoryChange}
          placeholder="SELECT SUBCATEGORY"
          required
          style={{ width: "350px" }}
        />
      </div>

      <div className="input-row half">
        <InputItem
          label={"UNIT"}
          value={newMatUnit}
          type={"select"}
          placeholder={"SELECT UNIT"}
          onChange={(e) => setNewMatUnit(e.target.value)}
          selectOptions={[...UNIT_OPTIONS]}
          required
        />
        <InputItem
          label={"BRAND"}
          value={newMatBrand}
          type={"text"}
          onChange={(e) => setNewMatBrand(e.target.value)}
        />
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
        newMaterialModal &&
        createPortal(newMaterialModal, document.body)}
    </>
  );
}
