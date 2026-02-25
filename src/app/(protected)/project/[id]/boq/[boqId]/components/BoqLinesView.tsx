"use client";

import { useState, useRef, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DraggableBoqItem } from "./DraggableItem";
import AddBoqItemButton from "./manager/_AddBoqItemButton";
import { BoqLine } from "../types/boqLine";
import DeleteBoqSubCategoryButton from "./manager/_DeleteBoqSubCategoryButton";
import RenameBoqSubCategoryButton from "./manager/_RenameBoqSubCategory";
import { useAuth } from "@/app/context/AuthContext";
import { BoqHeader } from "../types/boqHeader";
import DownloadBoqButton from "./manager/_DownloadBoqButton";
import EditBoqCategoryButton from "./manager/_EditBoqCategoryButton";
import DeleteBoqCategoryButton from "./manager/_DeleteBoqCategoryButton";
import EditBoqHeaderButton from "./manager/_EditBoqHeaderButton";
import { DraggableCategory } from "./DraggableCategory";
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers";
import EditBoqItemLocationButton from "./manager/_EditBoqItemLocationButton";
import ThreeDotsMenuButton from "@/app/components/_ThreeButtonsMenuButton";
import DeleteBoqItemButton from "./manager/_DeleteBoqItemButton";
import DuplicateBoqItemButton from "./manager/_DuplicateBoqItemButton";
import EditBoqItemButton from "./manager/_EditBoqItemButton";
import InfoPopUpButton from "@/app/components/_InfoPopUpButton";
import { DeleteBoqHeaderButton } from "./manager/_DeleteBoqHeaderButton";

type GroupedBoqLines = {
  [category: string]: {
    [subCategory: string]: BoqLine[];
  };
};

// Store original indices structure
type IndexedBoqLine = BoqLine & {
  originalCategoryIndex: number;
  originalSubCategoryIndex: number;
  originalItemIndex: number;
};

type GroupedIndexedBoqLines = {
  [category: string]: {
    [subCategory: string]: IndexedBoqLine[];
  };
};

type BoqLinesViewProps = {
  boqLines: GroupedBoqLines;
  boqHeader: BoqHeader;
};

// ===== SEARCH HELPER FUNCTIONS =====

// Check if query is a position search (e.g., "2", "2.1", "2.1.1", "2.1.5")
const isPositionSearch = (query: string): boolean => {
  // Match patterns like "2", "2.1", "2.1.1", "2.10.15" etc.
  return /^\d+(\.\d+)?(\.\d+)?$/.test(query.trim());
};

// Parse position search into components
const parsePositionQuery = (
  query: string,
): { cat?: number; sub?: number; item?: number } => {
  const parts = query.trim().split(".").map(Number);
  return {
    cat: parts[0],
    sub: parts[1],
    item: parts[2],
  };
};

// Check if item matches position query
const matchesPosition = (item: IndexedBoqLine, query: string): boolean => {
  if (!isPositionSearch(query)) return false;

  const { cat, sub, item: itemIdx } = parsePositionQuery(query);

  // Check category match (1-based to 0-based conversion)
  if (cat !== undefined && item.originalCategoryIndex !== cat - 1) return false;

  // Check subcategory match
  if (sub !== undefined && item.originalSubCategoryIndex !== sub - 1)
    return false;

  // Check item match
  if (itemIdx !== undefined && item.originalItemIndex !== itemIdx - 1)
    return false;

  return true;
};

const normalizeBoqId = (id: string | number): string => {
  const idStr = String(id);
  return idStr.replace(/\D/g, "").replace(/^0+/, "");
};

const matchesItemId = (itemId: string | number, query: string): boolean => {
  const normalizedQuery = normalizeBoqId(query);
  const normalizedItemId = normalizeBoqId(itemId);

  if (!normalizedQuery) return false;

  if (normalizedQuery === normalizedItemId) return true;
  if (normalizedItemId.includes(normalizedQuery)) return true;

  const queryLower = query.toLowerCase().replace(/\s/g, "");
  if (queryLower.includes("boq")) {
    const queryNum = normalizeBoqId(query);
    if (queryNum && normalizedItemId.includes(queryNum)) return true;
  }

  return false;
};

// Add original indices to all items
const addOriginalIndices = (lines: GroupedBoqLines): GroupedIndexedBoqLines => {
  const indexed: GroupedIndexedBoqLines = {};

  Object.entries(lines).forEach(([category, subCategories], catIdx) => {
    indexed[category] = {};
    Object.entries(subCategories).forEach(([subCategory, items], subIdx) => {
      indexed[category][subCategory] = items.map((item, itemIdx) => ({
        ...item,
        originalCategoryIndex: catIdx,
        originalSubCategoryIndex: subIdx,
        originalItemIndex: itemIdx,
      }));
    });
  });

  return indexed;
};

const filterBoqLines = (
  lines: GroupedIndexedBoqLines,
  query: string,
): GroupedIndexedBoqLines => {
  if (!query.trim()) return lines;

  const normalizedQuery = query.toLowerCase().trim();
  const isPosSearch = isPositionSearch(query);
  const filtered: GroupedIndexedBoqLines = {};

  Object.entries(lines).forEach(([category, subCategories]) => {
    Object.entries(subCategories).forEach(([subCategory, items]) => {
      const matchingItems = items.filter((item) => {
        // PRIORITY 1: Position search (if query looks like "2.1.1")
        if (isPosSearch) {
          return matchesPosition(item, query);
        }

        // PRIORITY 2: ID search (BOQ-00128, 128, etc.)
        const idMatch = matchesItemId(item.id, query);
        if (idMatch) return true;

        // PRIORITY 3: Text search (name, description, etc.)
        const nameMatch = item.item_name
          ?.toLowerCase()
          .includes(normalizedQuery);
        const descMatch = item.item_description
          ?.toLowerCase()
          .includes(normalizedQuery);
        const scopeMatch = item.scope_of_work
          ?.toLowerCase()
          .includes(normalizedQuery);
        const locationMatch = item.location
          ?.toLowerCase()
          .includes(normalizedQuery);

        return nameMatch || descMatch || scopeMatch || locationMatch;
      });

      if (matchingItems.length > 0) {
        if (!filtered[category]) filtered[category] = {};
        filtered[category][subCategory] = matchingItems;
      }
    });
  });

  return filtered;
};

export default function BoqLinesView({
  boqLines: initialBoqLines,
  boqHeader,
}: BoqLinesViewProps) {
  const { userInfo } = useAuth();

  const externalLinkIcon = "/icons/external-link.svg";
  const searchIcon = "/icons/search.svg";
  const locationIcon = "/icons/location-boq.svg";
  const arrowRight = "/icons/arrow-right.svg";

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const [originalBoqLines, setOriginalBoqLines] =
    useState<GroupedIndexedBoqLines>({});
  const [boqLines, setBoqLines] = useState<GroupedIndexedBoqLines>({});

  useEffect(() => {
    const indexed = addOriginalIndices(initialBoqLines);
    setOriginalBoqLines(indexed);
    setBoqLines(indexed);
  }, [initialBoqLines]);

  useEffect(() => {
    const filtered = filterBoqLines(originalBoqLines, searchQuery);
    setBoqLines(filtered);
  }, [originalBoqLines, searchQuery]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const categories = Object.keys(boqLines);
  const subCategories =
    activeCategory === "ALL" || activeCategory === "SUMMARY"
      ? boqLines[categories[0]] || {}
      : boqLines[activeCategory] || {};

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleCategoryDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = categories.indexOf(active.id as string);
    const newIndex = categories.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedCategories = arrayMove(categories, oldIndex, newIndex);
    const newBoqLines: GroupedIndexedBoqLines = {};
    reorderedCategories.forEach((cat) => {
      newBoqLines[cat] = boqLines[cat];
    });
    setBoqLines(newBoqLines);
    await saveCategoryOrder(reorderedCategories);
  };

  const handleAllSubcategoryDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const [activeCategoryName, activeSubCat] = (active.id as string).split(
      "___",
    );
    const [overCategoryName, overSubCat] = (over.id as string).split("___");

    if (activeCategoryName !== overCategoryName) {
      alert(
        "You cannot place this subcategory in the middle of a different category.",
      );
      return;
    }

    const subCategoryKeys = Object.keys(boqLines[activeCategoryName]);
    const oldIndex = subCategoryKeys.indexOf(activeSubCat);
    const newIndex = subCategoryKeys.indexOf(overSubCat);
    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedSubcategories = arrayMove(
      subCategoryKeys,
      oldIndex,
      newIndex,
    );
    const newSubcategories: { [subCategory: string]: IndexedBoqLine[] } = {};
    reorderedSubcategories.forEach((subCat) => {
      newSubcategories[subCat] = boqLines[activeCategoryName][subCat];
    });

    setBoqLines({ ...boqLines, [activeCategoryName]: newSubcategories });
    await saveSubcategoryOrder(activeCategoryName, reorderedSubcategories);
  };

  const handleSubcategoryDragEnd = async (
    event: DragEndEvent,
    category: string,
  ) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const subCategoryKeys = Object.keys(boqLines[category]);
    const oldIndex = subCategoryKeys.indexOf(active.id as string);
    const newIndex = subCategoryKeys.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedSubcategories = arrayMove(
      subCategoryKeys,
      oldIndex,
      newIndex,
    );
    const newSubcategories: { [subCategory: string]: IndexedBoqLine[] } = {};
    reorderedSubcategories.forEach((subCat) => {
      newSubcategories[subCat] = boqLines[category][subCat];
    });

    setBoqLines({ ...boqLines, [category]: newSubcategories });
    await saveSubcategoryOrder(category, reorderedSubcategories);
  };

  const handleItemDragEnd = async (
    event: DragEndEvent,
    category: string,
    subCategory: string,
  ) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const items = boqLines[category][subCategory];
    const oldIndex = items.findIndex((item) => String(item.id) === active.id);
    const newIndex = items.findIndex((item) => String(item.id) === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedItems = arrayMove(items, oldIndex, newIndex);
    setBoqLines({
      ...boqLines,
      [category]: { ...boqLines[category], [subCategory]: reorderedItems },
    });
    await saveItemOrder(reorderedItems);
  };

  const saveCategoryOrder = async (categories: string[]) => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/boq/reorderBoq`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "category",
          items: categories.map((category, index) => ({
            category,
            order: index + 1,
            boqId: boqHeader.id,
          })),
        }),
      });
    } catch (error) {
      console.error("Failed to save category order:", error);
      alert("Failed to save new category order. Please try again.");
    }
  };

  const saveSubcategoryOrder = async (
    category: string,
    subcategories: string[],
  ) => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/boq/reorderBoq`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "subcategory",
          items: subcategories.map((subCategory, index) => ({
            category,
            subCategory,
            order: index + 1,
            boqId: boqHeader.id,
          })),
        }),
      });
    } catch (error) {
      console.error("Failed to save subcategory order:", error);
      alert("Failed to save new subcategory order. Please try again.");
    }
  };

  const saveItemOrder = async (items: IndexedBoqLine[]) => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/boq/reorderBoq`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "item",
          items: items.map((item, index) => ({
            id: item.id,
            item_order: index + 1,
          })),
        }),
      });
    } catch (error) {
      console.error("Failed to save item order:", error);
      alert("Failed to save new item order. Please try again.");
    }
  };

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

  const calculateSubtotal = (items: IndexedBoqLine[]) => {
    return items.reduce((sum, item) => sum + (item.total_cost || 0), 0);
  };

  const calculateCategorySubtotal = (category: string) => {
    const subCategories = boqLines[category];
    let total = 0;
    Object.values(subCategories).forEach((items) => {
      total += calculateSubtotal(items);
    });
    return total;
  };

  const parseAttachments = (attachments: any): string[] => {
    if (!attachments) return [];
    if (Array.isArray(attachments)) return attachments;
    if (typeof attachments === "string") {
      try {
        if (attachments.trim() === "") return [];
        const parsed = JSON.parse(attachments);
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        return [];
      }
    }
    return [];
  };

  const canSeePrice =
    userInfo?.departmentID === 8 ||
    userInfo?.departmentID === 12 ||
    userInfo?.departmentID === 10 ||
    userInfo?.departmentID === 16;
  const canManage =
    userInfo?.departmentID === 8 || userInfo?.departmentID === 16;

  const getAllSubcategoryKeys = () => {
    const allKeys: string[] = [];
    Object.entries(boqLines).forEach(([category, subCats]) => {
      Object.keys(subCats).forEach((subCat) => {
        allKeys.push(`${category}___${subCat}`);
      });
    });
    return allKeys;
  };

  const SubcategorySection = ({
    category,
    subCategory,
    items,
    isDragEnabled,
    canManage,
    canSeePrice,
    boqHeader,
    locationIcon,
    sensors,
    activeCategory,
    handleItemDragEnd,
    parseAttachments,
  }: any) => {
    const sortableId =
      activeCategory === "ALL" ? `${category}___${subCategory}` : subCategory;
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: sortableId, disabled: !isDragEnabled });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.7 : 1,
      marginBottom: isDragging ? "20px" : "0",
    };

    const firstItem = items[0];
    const originalCategoryIndex = firstItem?.originalCategoryIndex ?? 0;
    const originalSubCategoryIndex = firstItem?.originalSubCategoryIndex ?? 0;

    return (
      <div ref={setNodeRef} style={style}>
        <div className="subcategory-section">
          <div
            className="subcategory-header"
            style={{ justifyContent: "flex-start" }}
          >
            <h1
              style={{
                textTransform: activeCategory === "ALL" ? "uppercase" : "none",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              {canManage && isDragEnabled && (
                <span
                  {...attributes}
                  {...listeners}
                  style={{
                    cursor: "grab",
                    color: "#999",
                    userSelect: "none",
                    fontSize: "20px",
                  }}
                  title="Drag to reorder subcategory"
                >
                  ⋮⋮
                </span>
              )}
              <span style={{ marginRight: "15px" }}>
                {originalCategoryIndex + 1}.{originalSubCategoryIndex + 1}
              </span>
              {activeCategory === "ALL"
                ? `${category} / ${subCategory}`
                : subCategory}
            </h1>

            {canManage && (
              <div className="right">
                <RenameBoqSubCategoryButton
                  item={items[0]}
                  category={category}
                  subCategory={subCategory}
                />
                <DeleteBoqSubCategoryButton
                  item={items[0]}
                  category={category}
                  subCategory={subCategory}
                />
              </div>
            )}
          </div>

          <br />
          <br />

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(event: DragEndEvent) =>
              handleItemDragEnd(event, category, subCategory)
            }
          >
            <table className="items-table two-toned">
              <thead>
                <tr>
                  <th>#</th>
                  <th>DN NUMBER & DATE</th>
                  <th>ITEM</th>
                  <th>QUANTITY</th>
                  {canSeePrice && (
                    <>
                      <th>RATE</th>
                      <th>TOTAL PRICE</th>
                    </>
                  )}
                  <th>ATTACHMENTS</th>
                  <th>REMARKS</th>
                  {canManage && <th></th>}
                </tr>
              </thead>

              <SortableContext
                items={items.map((item: IndexedBoqLine) => String(item.id))}
                strategy={verticalListSortingStrategy}
              >
                <tbody>
                  {items.map((item: IndexedBoqLine) => {
                    const attachmentUrls = parseAttachments(item.attachments);
                    return (
                      <DraggableBoqItem
                        key={item.id}
                        id={String(item.id)}
                        isDragEnabled={canManage}
                        categoryIndex={item.originalCategoryIndex}
                        subCategoryIndex={item.originalSubCategoryIndex}
                        itemIndex={item.originalItemIndex}
                      >
                        <td>{item.dn_number_and_date || "-"}</td>

                        <td>
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "10px",
                            }}
                          >
                            <strong>{item.item_name}</strong>
                            {item.item_description && (
                              <p style={{ whiteSpace: "pre-wrap" }}>
                                {item.item_description}
                              </p>
                            )}
                            {item.location && (
                              <div
                                style={{
                                  display: "flex",
                                  gap: "10px",
                                  alignItems: "center",
                                }}
                              >
                                <img src={locationIcon} />
                                <span
                                  style={{
                                    fontWeight: 600,
                                    marginTop: "4px",
                                    color: "rgba(105, 105, 105, 1)",
                                  }}
                                >
                                  {item.location}
                                </span>
                                <EditBoqItemLocationButton item={item} />
                              </div>
                            )}
                            {item.scope_of_work && (
                              <div
                                style={{
                                  backgroundColor: "rgba(225, 225, 225, 1)",
                                  borderRadius: "50px",
                                  padding: "4px 10px",
                                  width: "fit-content",
                                }}
                              >
                                <strong>{item.scope_of_work}</strong>
                              </div>
                            )}
                          </div>
                        </td>

                        <td>
                          {item.quantity} {item.unit}
                        </td>

                        {canSeePrice && (
                          <>
                            <td>{item.rate_per_quantity?.toLocaleString()}</td>
                            <td>
                              {boqHeader.currency}{" "}
                              {item.total_cost?.toLocaleString()}
                            </td>
                          </>
                        )}

                        <td className="attachments">
                          <div className="attachments-grid">
                            {attachmentUrls.map((url: string, i: number) => (
                              <img key={i} src={url} alt="attachment" />
                            ))}
                          </div>
                        </td>

                        <td>{item.remarks || "-"}</td>

                        {canManage && (
                          <td>
                            <ThreeDotsMenuButton>
                              <EditBoqItemButton item={item} />
                              <DuplicateBoqItemButton item={item} />
                              <DeleteBoqItemButton item={item} />
                            </ThreeDotsMenuButton>
                          </td>
                        )}
                      </DraggableBoqItem>
                    );
                  })}
                </tbody>
              </SortableContext>

              {canSeePrice && (
                <tfoot
                  style={{ borderTop: "1px solid rgba(232, 223, 223, 1)" }}
                >
                  <tr>
                    <td></td>
                    <td></td>
                    <td>
                      <h3>SUBTOTAL</h3>
                    </td>
                    <td colSpan={canSeePrice ? 2 : 1}></td>
                    <td>
                      <h3 style={{ textWrap: "nowrap" }}>
                        {boqHeader.currency}{" "}
                        {calculateSubtotal(items).toLocaleString()}
                      </h3>
                    </td>
                    <td colSpan={canManage ? 3 : 1}></td>
                  </tr>
                </tfoot>
              )}

              {canManage && (
                <tfoot
                  style={{ borderTop: "1px solid rgba(232, 223, 223, 1)" }}
                >
                  <tr>
                    <td colSpan={9}>
                      <AddBoqItemButton
                        boqHeaderID={boqHeader.id}
                        bgColor="rgba(239, 239, 239, 1)"
                        borderColor="rgba(239, 239, 239, 1)"
                        textColor="black"
                        full
                        autoCategory={category}
                        autoSubCategory={subCategory}
                        style={{ padding: "20px 0px" }}
                        currency={boqHeader.currency}
                      >
                        ADD ITEM +
                      </AddBoqItemButton>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </DndContext>

          <br />
          <br />
          <br />
          <br />
          <br />
        </div>
      </div>
    );
  };

  const renderSubcategorySection = (
    category: string,
    subCategory: string,
    items: IndexedBoqLine[],
  ) => {
    return (
      <SubcategorySection
        key={`${category}-${subCategory}`}
        category={category}
        subCategory={subCategory}
        items={items}
        isDragEnabled={canManage}
        canManage={canManage}
        canSeePrice={canSeePrice}
        boqHeader={boqHeader}
        locationIcon={locationIcon}
        sensors={sensors}
        activeCategory={activeCategory}
        handleItemDragEnd={handleItemDragEnd}
        parseAttachments={parseAttachments}
      />
    );
  };

  return (
    <div className="dashboard">
      <h1>
        <a href="/project">PROJECTS</a> &gt;{" "}
        <a href={`/project/${boqHeader?.project_id}`}>
          {boqHeader?.project_name.toUpperCase()}
        </a>{" "}
        &gt; BOQ-{String(boqHeader?.id).padStart(5, "0")}
      </h1>

      <br />
      <br />

      <div className="project-with-id">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "25px",
              textTransform: "uppercase",
            }}
          >
            <div>
              <small>BOQ NUMBER</small>
              <h2>BOQ-{String(boqHeader?.id).padStart(5, "0")}</h2>
            </div>
            <div>
              <small>LOCATION</small>
              <h2>{boqHeader?.location}</h2>
            </div>
            <div>
              <small>CLIENT NAME</small>
              <h2>{boqHeader?.client_name}</h2>
            </div>
            <div>
              <small>DATE</small>
              <h2>
                {boqHeader?.boq_date
                  ? new Date(boqHeader?.boq_date).toLocaleDateString("en-GB")
                  : "-"}
              </h2>
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            {(userInfo?.departmentID === 8 ||
              userInfo?.departmentID === 16) && (
              <>
                <EditBoqHeaderButton boqHeader={boqHeader} />
                <DeleteBoqHeaderButton boqHeader={boqHeader} />
              </>
            )}
          </div>
        </div>

        <br />
        <br />

        <div
          style={{ display: "flex", gap: "10px", textTransform: "uppercase" }}
        >
          <InfoPopUpButton
            text={boqHeader.payment_terms}
            header={"PAYMENT TERMS"}
            style={{ padding: "7px 25px", borderRadius: "50px" }}
            bgColor="transparent"
            borderColor="rgba(207, 207, 207, 1)"
            textColor="black"
          >
            PAYMENT TERMS <img src={externalLinkIcon} />
          </InfoPopUpButton>
          <InfoPopUpButton
            text={boqHeader.validity_terms}
            header={"VALIDITY TERMS"}
            style={{ padding: "7px 25px", borderRadius: "50px" }}
            bgColor="transparent"
            borderColor="rgba(207, 207, 207, 1)"
            textColor="black"
          >
            VALIDITY TERMS <img src={externalLinkIcon} />
          </InfoPopUpButton>
          <InfoPopUpButton
            text={boqHeader.warranty}
            header={"WARRANTY"}
            style={{ padding: "7px 25px", borderRadius: "50px" }}
            bgColor="transparent"
            borderColor="rgba(207, 207, 207, 1)"
            textColor="black"
          >
            WARRANTY <img src={externalLinkIcon} />
          </InfoPopUpButton>
          <InfoPopUpButton
            text={boqHeader.completion}
            header={"COMPLETION"}
            style={{ padding: "7px 25px", borderRadius: "50px" }}
            bgColor="transparent"
            borderColor="rgba(207, 207, 207, 1)"
            textColor="black"
          >
            COMPLETION <img src={externalLinkIcon} />
          </InfoPopUpButton>
          <InfoPopUpButton
            text={boqHeader.exclusion}
            header={"EXCLUSIONS"}
            style={{ padding: "7px 25px", borderRadius: "50px" }}
            bgColor="transparent"
            borderColor="rgba(207, 207, 207, 1)"
            textColor="black"
          >
            EXCLUSIONS <img src={externalLinkIcon} />
          </InfoPopUpButton>
        </div>
      </div>

      <br />
      <br />

      <div
        className="category-grid"
        style={{ display: "flex", gap: "50px", alignItems: "center" }}
      >
        {/* Slider container - now flex: 1 to take remaining space */}
        <div
          style={{
            position: "relative",
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
          }}
        >
          {showLeftArrow && (
            <>
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: "300px",
                  background:
                    "linear-gradient(to right, #f8f9fb 0%,  rgba(248, 249, 251, 0) 100%)",
                  pointerEvents: "none",
                  zIndex: 5,
                }}
              />
              <button
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
                />
              </button>
            </>
          )}

          <div
            ref={scrollContainerRef}
            onScroll={checkScroll}
            style={{
              overflowX: "auto",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              width: "100%",
            }}
          >
            <style jsx>{`
              div::-webkit-scrollbar {
                display: none;
              }
            `}</style>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleCategoryDragEnd}
              modifiers={[restrictToHorizontalAxis]}
            >
              <SortableContext
                items={categories}
                strategy={horizontalListSortingStrategy}
              >
                <div
                  style={{ display: "flex", gap: "1px", width: "max-content" }}
                >
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
                  {categories.map((category) => (
                    <DraggableCategory
                      key={category}
                      id={category}
                      isDragEnabled={canManage}
                      isActive={activeCategory === category}
                      onClick={() => setActiveCategory(category)}
                    >
                      <div
                        style={{
                          display: "flex",
                          gap: "10px",
                          alignItems: "center",
                        }}
                      >
                        <span>{category}</span>
                        {activeCategory === category && canManage && (
                          <div style={{ display: "flex", gap: "5px" }}>
                            <EditBoqCategoryButton
                              oldCategory={activeCategory}
                              boqID={boqHeader.id}
                            />
                            <DeleteBoqCategoryButton
                              category={activeCategory}
                              boqID={boqHeader.id}
                            />
                          </div>
                        )}
                      </div>
                    </DraggableCategory>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>

          {showRightArrow && (
            <>
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: 0,
                  bottom: 0,
                  width: "300px",
                  background:
                    "linear-gradient(to left, #f8f9fb 0%, rgba(248, 249, 251, 0) 100%)",
                  pointerEvents: "none",
                  zIndex: 5,
                }}
              />
              <button
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
                  width: "40px",
                  height: "40px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <img src={arrowRight} />
              </button>
            </>
          )}
        </div>

        {/* Right side buttons - fixed width, no shrink */}
        <div style={{ display: "flex", gap: "10px", flexShrink: 0 }}>
          <div
            style={{
              width: "300px",
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
                width: "100%",
                padding: "10px 40px 10px 15px",
                borderRadius: "8px",
                border: "1px solid rgba(223, 223, 223, 1)",
                fontSize: "14px",
                boxSizing: "border-box",
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
          {canManage && (
            <AddBoqItemButton
              boqHeaderID={boqHeader.id}
              bgColor="black"
              borderColor="black"
              textColor="white"
              currency={boqHeader.currency}
            >
              ADD CATEGORY & ITEM +
            </AddBoqItemButton>
          )}
          <DownloadBoqButton boqHeader={boqHeader} boqLines={boqLines} />
        </div>
      </div>

      <br />
      <br />

      {activeCategory === "SUMMARY" ? (
        <table className="items-table two-toned">
          <thead>
            <tr>
              <th>#</th>
              <th>CATEGORY</th>
              <th>SUBTOTAL</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category, index) => (
              <tr key={category}>
                <td>{index + 1}</td>
                <td>{category}</td>
                <td>
                  {boqHeader.currency}{" "}
                  {calculateCategorySubtotal(category).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot style={{ borderTop: "1px solid rgba(232, 223, 223, 1)" }}>
            {boqHeader?.discount && boqHeader?.discount > 0 && (
              <tr>
                <td></td>
                <td>
                  <h3>SUBTOTAL</h3>
                </td>
                <td>
                  <h3>
                    {boqHeader.currency}{" "}
                    {categories
                      .reduce(
                        (total, category) =>
                          total + calculateCategorySubtotal(category),
                        0,
                      )
                      .toLocaleString()}
                  </h3>
                </td>
              </tr>
            )}
            {boqHeader?.discount && boqHeader?.discount > 0 && (
              <tr>
                <td></td>
                <td>
                  <h3>SPECIAL DISCOUNT</h3>
                </td>
                <td>
                  <h3>
                    {boqHeader.currency} {boqHeader.discount}
                  </h3>
                </td>
              </tr>
            )}
            <tr>
              <td></td>
              <td>
                <h3>GRAND TOTAL</h3>
              </td>
              <td>
                <h3>
                  {boqHeader.currency}{" "}
                  {(
                    categories.reduce(
                      (total, category) =>
                        total + calculateCategorySubtotal(category),
                      0,
                    ) - (boqHeader.discount || 0)
                  ).toLocaleString()}
                </h3>
              </td>
            </tr>
          </tfoot>
        </table>
      ) : activeCategory === "ALL" ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleAllSubcategoryDragEnd}
        >
          <SortableContext
            items={getAllSubcategoryKeys()}
            strategy={verticalListSortingStrategy}
          >
            {Object.entries(boqLines).map(([category, subCategoriesData]) =>
              Object.entries(subCategoriesData).map(([subCategory, items]) =>
                renderSubcategorySection(category, subCategory, items),
              ),
            )}
          </SortableContext>
        </DndContext>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={(event) => handleSubcategoryDragEnd(event, activeCategory)}
        >
          <SortableContext
            items={Object.keys(subCategories)}
            strategy={verticalListSortingStrategy}
          >
            {Object.entries(subCategories).map(([subCategory, items]) =>
              renderSubcategorySection(activeCategory, subCategory, items),
            )}
          </SortableContext>
        </DndContext>
      )}

      {canManage &&
        activeCategory !== "ALL" &&
        activeCategory !== "SUMMARY" && (
          <AddBoqItemButton
            boqHeaderID={boqHeader.id}
            bgColor="rgba(239, 239, 239, 1)"
            borderColor="transparent"
            textColor="black"
            full
            autoCategory={activeCategory}
            currency={boqHeader.currency}
            style={{ padding: "40px 0px", backgroundColor: "white" }}
          >
            ADD SUBCATEGORY & ITEM +
          </AddBoqItemButton>
        )}
    </div>
  );
}
