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
import { DeleteBoqHeaderButton } from "@/app/(protected)/boq/[id]/components/manager/_DeleteBoqHeaderButton";
import EditBoqHeaderButton from "./manager/_EditBoqHeaderButton";
import { DraggableCategory } from "./DraggableCategory";
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers";
import EditBoqItemLocationButton from "./manager/_EditBoqItemLocationButton";
import ThreeDotsMenuButton from "@/app/components/_ThreeButtonsMenuButton";
import DeleteBoqItemButton from "./manager/_DeleteBoqItemButton";
import DuplicateBoqItemButton from "./manager/_DuplicateBoqItemButton";
import EditBoqItemButton from "./manager/_EditBoqItemButton";
import InfoPopUpButton from "@/app/components/_InfoPopUpButton";

type GroupedBoqLines = {
  [category: string]: {
    [subCategory: string]: BoqLine[];
  };
};

type BoqLinesViewProps = {
  boqLines: GroupedBoqLines;
  boqHeader: BoqHeader;
};

export default function BoqLinesView({
  boqLines: initialBoqLines,
  boqHeader,
}: BoqLinesViewProps) {
  const { userInfo } = useAuth();

  const externalLinkIcon = "/icons/external-link.svg";

  const locationIcon = "/icons/location-boq.svg";
  const arrowRight = "/icons/arrow-right.svg";

  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const [boqLines, setBoqLines] = useState<GroupedBoqLines>(initialBoqLines);

  useEffect(() => {
    setBoqLines(initialBoqLines);
  }, [initialBoqLines]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const categories = Object.keys(boqLines);
  const subCategories =
    activeCategory === "ALL" || activeCategory === "SUMMARY"
      ? boqLines[categories[0]] || {}
      : boqLines[activeCategory] || {};

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Handle drag end for categories
  const handleCategoryDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = categories.indexOf(active.id as string);
    const newIndex = categories.indexOf(over.id as string);

    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedCategories = arrayMove(categories, oldIndex, newIndex);

    // Rebuild boqLines with new category order
    const newBoqLines: GroupedBoqLines = {};
    reorderedCategories.forEach((cat) => {
      newBoqLines[cat] = boqLines[cat];
    });

    setBoqLines(newBoqLines);

    // Save to backend
    await saveCategoryOrder(reorderedCategories);
  };

  // Handle drag end for subcategories - works for ALL categories
  const handleAllSubcategoryDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    // Parse the combined IDs
    const [activeCategory, activeSubCat] = (active.id as string).split("___");
    const [overCategory, overSubCat] = (over.id as string).split("___");

    // Check if trying to drop between different categories
    if (activeCategory !== overCategory) {
      alert(
        "You cannot place this subcategory in the middle of a different category.",
      );
      return; // Cancel the drag operation
    }

    const subCategoryKeys = Object.keys(boqLines[activeCategory]);
    const oldIndex = subCategoryKeys.indexOf(activeSubCat);
    const newIndex = subCategoryKeys.indexOf(overSubCat);

    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedSubcategories = arrayMove(
      subCategoryKeys,
      oldIndex,
      newIndex,
    );

    // Rebuild the category with new subcategory order
    const newSubcategories: { [subCategory: string]: BoqLine[] } = {};
    reorderedSubcategories.forEach((subCat) => {
      newSubcategories[subCat] = boqLines[activeCategory][subCat];
    });

    setBoqLines({
      ...boqLines,
      [activeCategory]: newSubcategories,
    });

    // Save to backend
    await saveSubcategoryOrder(activeCategory, reorderedSubcategories);
  };

  // Handle drag end for subcategories within a category
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

    // Rebuild the category with new subcategory order
    const newSubcategories: { [subCategory: string]: BoqLine[] } = {};
    reorderedSubcategories.forEach((subCat) => {
      newSubcategories[subCat] = boqLines[category][subCat];
    });

    setBoqLines({
      ...boqLines,
      [category]: newSubcategories,
    });

    // Save to backend
    await saveSubcategoryOrder(category, reorderedSubcategories);
  };

  // Handle drag end for items within a subcategory
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

    // Update local state
    const updatedBoqLines = {
      ...boqLines,
      [category]: {
        ...boqLines[category],
        [subCategory]: reorderedItems,
      },
    };

    setBoqLines(updatedBoqLines);

    // Save to backend with the reordered items
    await saveItemOrder(reorderedItems);
  };

  const saveCategoryOrder = async (categories: string[]) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/boq/reorderBoq`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "category",
            items: categories.map((category, index) => ({
              category,
              order: index + 1, // ← Changed: Start from 1 instead of 0
              boqId: boqHeader.id,
            })),
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to save category order");
      }

      console.log("Category order saved successfully");
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
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/boq/reorderBoq`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "subcategory",
            items: subcategories.map((subCategory, index) => ({
              category,
              subCategory,
              order: index + 1, // ← Changed: Start from 1 instead of 0
              boqId: boqHeader.id,
            })),
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to save subcategory order");
      }

      console.log("Subcategory order saved successfully");
    } catch (error) {
      console.error("Failed to save subcategory order:", error);
      alert("Failed to save new subcategory order. Please try again.");
    }
  };

  const saveItemOrder = async (items: BoqLine[]) => {
    try {
      console.log(
        "Saving item order:",
        items.map((item, idx) => ({ id: item.id, order: idx + 1 })), // ← Changed: idx + 1
      );

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/boq/reorderBoq`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "item",
            items: items.map((item, index) => ({
              id: item.id,
              item_order: index + 1, // ← Changed: Start from 1 instead of 0
            })),
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to save item order");
      }

      console.log("Item order saved successfully");
    } catch (error) {
      console.error("Failed to save item order:", error);
      alert("Failed to save new item order. Please try again.");
    }
  };

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

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [categories]);

  // Calculate subtotal for a subcategory
  const calculateSubtotal = (items: BoqLine[]) => {
    return items.reduce((sum, item) => sum + (item.total_cost || 0), 0);
  };

  // Calculate subtotal for a category
  const calculateCategorySubtotal = (category: string) => {
    const subCategories = boqLines[category];
    let total = 0;
    Object.values(subCategories).forEach((items) => {
      total += calculateSubtotal(items);
    });
    return total;
  };

  // Parse attachments helper function
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

  const canSeePrice =
    userInfo?.departmentID === 8 ||
    userInfo?.departmentID === 12 ||
    userInfo?.departmentID === 10 ||
    userInfo?.departmentID === 16;

  const canManage =
    userInfo?.departmentID === 8 || userInfo?.departmentID === 16;

  // Get all subcategories for ALL view (for drag and drop context)
  const getAllSubcategoryKeys = () => {
    const allKeys: string[] = [];
    Object.entries(boqLines).forEach(([category, subCats]) => {
      Object.keys(subCats).forEach((subCat) => {
        allKeys.push(`${category}___${subCat}`); // Use unique ID
      });
    });
    return allKeys;
  };

  // Subcategory Section Component
  const SubcategorySection = ({
    category,
    subCategory,
    items,
    categoryIndex,
    subCategoryIndex,
    subtotal,
    itemIds,
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
    // Use combined ID for ALL view, regular ID for category view
    const sortableId =
      activeCategory === "ALL" ? `${category}___${subCategory}` : subCategory;

    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({
      id: sortableId,
      disabled: !isDragEnabled,
    });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.7 : 1,
      marginBottom: isDragging ? "20px" : "0",
    };

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
              {/* Show drag handle for canManage users when subcategory dragging is enabled */}
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
                {categoryIndex + 1}.{subCategoryIndex + 1}
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
                  <th style={{ minWidth: "600px" }}>ITEM</th>
                  <th>QUANTITY</th>

                  {canSeePrice && (
                    <>
                      <th>RATE</th>
                      <th>TOTAL PRICE</th>
                    </>
                  )}

                  <th>ATTACHMENTS</th>
                  {canManage && <th></th>}
                </tr>
              </thead>

              <SortableContext
                items={itemIds}
                strategy={verticalListSortingStrategy}
              >
                <tbody>
                  {items.map((item: BoqLine, itemIndex: number) => {
                    const attachmentUrls = parseAttachments(item.attachments);

                    return (
                      <DraggableBoqItem
                        key={item.id}
                        id={String(item.id)}
                        isDragEnabled={canManage}
                        categoryIndex={categoryIndex}
                        subCategoryIndex={subCategoryIndex}
                        itemIndex={itemIndex}
                      >
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
                  style={{
                    borderTop: "1px solid rgba(232, 223, 223, 1)",
                  }}
                >
                  <tr>
                    <td></td>
                    <td>
                      <h3>SUBTOTAL {/* FOR {subCategory} */}</h3>
                    </td>
                    <td colSpan={canSeePrice ? 2 : 1}></td>
                    <td>
                      <h3 style={{ textWrap: "nowrap" }}>
                        {boqHeader.currency} {subtotal.toLocaleString()}
                      </h3>
                    </td>
                    <td colSpan={canManage ? 2 : 1}></td>
                  </tr>
                </tfoot>
              )}

              {canManage && (
                <tfoot
                  style={{
                    borderTop: "1px solid rgba(232, 223, 223, 1)",
                  }}
                >
                  <tr>
                    <td colSpan={7}>
                      <AddBoqItemButton
                        boqHeaderID={boqHeader.id}
                        bgColor="rgba(239, 239, 239, 1)"
                        borderColor="rgba(239, 239, 239, 1)"
                        textColor="black"
                        full
                        autoCategory={category}
                        autoSubCategory={subCategory}
                        style={{ padding: "20px 0px" }}
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

  // Render subcategory section
  const renderSubcategorySection = (
    category: string,
    subCategory: string,
    items: BoqLine[],
    categoryIndex: number,
    subCategoryIndex: number,
  ) => {
    const subtotal = calculateSubtotal(items);
    const itemIds = items.map((item) => String(item.id));

    return (
      <SubcategorySection
        key={`${category}-${subCategory}`}
        category={category}
        subCategory={subCategory}
        items={items}
        categoryIndex={categoryIndex}
        subCategoryIndex={subCategoryIndex}
        subtotal={subtotal}
        itemIds={itemIds}
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
      <h2>
        <a href="/project">PROJECTS</a> &gt;{" "}
        <a href={`/project/${boqHeader?.project_id}`}>
          {boqHeader?.project_name.toUpperCase()}
        </a>{" "}
        &gt; BOQ-
        {String(boqHeader?.id).padStart(5, "0")}
      </h2>

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
              <small>BOQ ID</small>
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
          style={{
            display: "flex",
            gap: "25px",
            textTransform: "uppercase",
          }}
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

      <div className="category-grid">
        {/* Category Tabs with Scroll and Drag & Drop */}
        <div style={{ position: "relative", flex: 1, maxWidth: "925px" }}>
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
              <img src={arrowRight} style={{ transform: "rotate(-180deg)" }} />
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
                <div style={{ display: "flex", gap: "1px" }}>
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
              <img src={arrowRight} />
            </button>
          )}
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          {canManage && (
            <AddBoqItemButton
              boqHeaderID={boqHeader.id}
              bgColor="black"
              borderColor="black"
              textColor="white"
            >
              ADD CATEGORY & ITEM +
            </AddBoqItemButton>
          )}

          <DownloadBoqButton boqHeader={boqHeader} boqLines={boqLines} />
        </div>
      </div>

      <br />
      <br />

      {/* Render sections based on active category */}
      {activeCategory === "SUMMARY" ? (
        // Show summary table
        <table className="items-table two-toned">
          <thead>
            <tr>
              <th>#</th>
              <th>CATEGORY</th>
              <th>SUBTOTAL</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category, index) => {
              const categorySubtotal = calculateCategorySubtotal(category);
              return (
                <tr key={category}>
                  <td>{index + 1}</td>
                  <td>{category}</td>
                  <td>
                    {boqHeader.currency} {categorySubtotal.toLocaleString()}
                  </td>
                </tr>
              );
            })}
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
                  ) // subtract special discount here
                    .toLocaleString()}
                </h3>
              </td>
            </tr>
          </tfoot>
        </table>
      ) : activeCategory === "ALL" ? (
        // Show all categories and subcategories WITH SINGLE drag context
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleAllSubcategoryDragEnd}
        >
          <SortableContext
            items={getAllSubcategoryKeys()}
            strategy={verticalListSortingStrategy}
          >
            {Object.entries(boqLines).map(
              ([category, subCategoriesData], categoryIndex) =>
                Object.entries(subCategoriesData).map(
                  ([subCategory, items], subCategoryIndex) =>
                    renderSubcategorySection(
                      category,
                      subCategory,
                      items,
                      categoryIndex,
                      subCategoryIndex,
                    ),
                ),
            )}
          </SortableContext>
        </DndContext>
      ) : (
        // Show only subcategories for selected category (with subcategory drag and drop)
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={(event) => handleSubcategoryDragEnd(event, activeCategory)}
        >
          <SortableContext
            items={Object.keys(subCategories)}
            strategy={verticalListSortingStrategy}
          >
            {Object.entries(subCategories).map(([subCategory, items], index) =>
              renderSubcategorySection(
                activeCategory,
                subCategory,
                items,
                categories.indexOf(activeCategory),
                index,
              ),
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
            style={{ padding: "40px 0px", backgroundColor: "white" }}
          >
            ADD SUBCATEGORY & ITEM +
          </AddBoqItemButton>
        )}
    </div>
  );
}
