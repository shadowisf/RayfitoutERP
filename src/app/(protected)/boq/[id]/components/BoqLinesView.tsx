"use client";

import { useState, useRef, useEffect } from "react";
import AddBoqItemButton from "./manager/_AddBoqItemButton";
import { BoqLine } from "../types/boqLine";
import DeleteBoqSubCategoryButton from "./manager/_DeleteBoqSubCategoryButton";
import RenameBoqSubCategoryButton from "./manager/_RenameBoqSubCategory";
import { useAuth } from "@/app/context/AuthContext";
import { BoqHeader } from "../types/boqHeader";
import DownloadBoqButton from "./manager/_DownloadBoqButton";
import ThreeDotsMenuButton from "./_ThreeDotsMenuButton";
import EditBoqItemLocationButton from "./manager/_EditBoqItemLocationButton";
import EditBoqCategoryButton from "./manager/_EditBoqCategoryButton";
import DeleteBoqCategoryButton from "./manager/_DeleteBoqCategoryButton";
import { DeleteBoqHeaderButton } from "@/app/(protected)/boq/[id]/components/manager/_DeleteBoqHeaderButton";
import EditBoqHeaderButton from "./manager/_EditBoqHeaderButton";

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
  boqLines,
  boqHeader,
}: BoqLinesViewProps) {
  const { userInfo } = useAuth();

  const locationIcon = "/icons/location-boq.svg";
  const arrowRight = "/icons/arrow-right.svg";

  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const categories = Object.keys(boqLines);
  const subCategories =
    activeCategory === "ALL"
      ? boqLines[categories[0]] || {}
      : boqLines[activeCategory] || {};

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

  // ✅ Calculate subtotal for a subcategory
  const calculateSubtotal = (items: BoqLine[]) => {
    return items.reduce((sum, item) => sum + (item.total_cost || 0), 0);
  };

  // ✅ Parse attachments helper function
  const parseAttachments = (attachments: any): string[] => {
    if (!attachments) return [];

    // If it's already an array, return it
    if (Array.isArray(attachments)) return attachments;

    // If it's a string, try to parse it
    if (typeof attachments === "string") {
      try {
        // Remove any whitespace and check if it's empty
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
    userInfo?.departmentID === 10;

  const canManage =
    userInfo?.departmentID === 8 || userInfo?.departmentID === 16;

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2>
          <a href="/project">PROJECTS</a> &gt;{" "}
          <a href={`/project/${boqHeader?.project_id}`}>
            {boqHeader?.project_name.toUpperCase()}
          </a>{" "}
          &gt; BOQ-
          {String(boqHeader?.id).padStart(5, "0")}
        </h2>
        <div style={{ display: "flex", gap: "5px" }}>
          {userInfo?.departmentID === 8 && (
            <>
              <EditBoqHeaderButton boqHeader={boqHeader} />
              <DeleteBoqHeaderButton boqHeader={boqHeader} />
            </>
          )}
        </div>
      </div>

      <br />
      <br />

      <div className="category-grid">
        {/* Category Tabs with Scroll */}
        <div style={{ position: "relative", flex: 1, maxWidth: "775px" }}>
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
                  "linear-gradient(to right, #f8f9fb 0%, rgba(255, 255, 255, 0) 100%)",
                pointerEvents: "none",
                zIndex: 5,
              }}
            />
          )}

          {/* Left Arrow Button */}
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
            <div style={{ display: "flex", gap: "1px" }}>
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

              {categories.map(function (category) {
                return (
                  <div
                    key={category}
                    className={`item ${
                      activeCategory === category ? "active" : ""
                    }`}
                    onClick={function () {
                      setActiveCategory(category);
                    }}
                    style={{ flexShrink: 0, cursor: "pointer" }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: "10px",
                      }}
                    >
                      {category}

                      {activeCategory === category && (
                        <div style={{ display: "flex", gap: "5px" }}>
                          <EditBoqCategoryButton
                            oldCategory={activeCategory}
                            boqID={boqHeader.id}
                            onSuccess={() => setActiveCategory("ALL")}
                          />
                          <DeleteBoqCategoryButton
                            category={activeCategory}
                            boqID={boqHeader.id}
                            onSuccess={() => setActiveCategory("ALL")}
                          />
                        </div>
                      )}
                    </div>
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
                  "linear-gradient(to left, #f8f9fb 0%, rgba(255, 255, 255, 0) 100%)",
                pointerEvents: "none",
                zIndex: 5,
              }}
            />
          )}

          {/* Right Arrow Button */}
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
          {(userInfo?.departmentID === 8 || userInfo?.departmentID === 16) && (
            <>
              <AddBoqItemButton
                boqHeaderID={boqHeader.id}
                bgColor="black"
                borderColor="black"
                textColor="white"
              >
                ADD CATEGORY & ITEM +
              </AddBoqItemButton>
            </>
          )}

          <DownloadBoqButton boqHeader={boqHeader} boqLines={boqLines} />

          {/*           <EditBoqHeaderButton boqHeader={boqHeader} /> */}
        </div>
      </div>

      <br />
      <br />

      {activeCategory === "ALL"
        ? Object.entries(boqLines).map(
            ([category, subCategoriesData], categoryIndex) =>
              Object.entries(subCategoriesData).map(function (
                [subCategory, items],
                subCategoryIndex,
              ) {
                // ✅ Calculate subtotal
                const subtotal = calculateSubtotal(items);

                return (
                  <div
                    key={`${category}-${subCategory}`}
                    className="subcategory-section"
                  >
                    <div className="subcategory-header">
                      <h2 style={{ textTransform: "uppercase" }}>
                        <span style={{ marginRight: "25px" }}>
                          {categoryIndex + 1}.{subCategoryIndex + 1}
                        </span>
                        {category} / {subCategory}
                      </h2>

                      {(userInfo?.departmentID === 8 ||
                        userInfo?.departmentID === 16) && (
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

                      <tbody>
                        {items.map((item, itemIndex) => {
                          // ✅ Parse attachments for each item
                          const attachmentUrls = parseAttachments(
                            item.attachments,
                          );

                          return (
                            <tr key={item.id}>
                              <td>
                                {categoryIndex + 1}.{subCategoryIndex + 1}.
                                {itemIndex + 1}
                              </td>

                              <td>
                                <strong>{item.item_name}</strong>

                                {item.item_description && (
                                  <>
                                    <br />
                                    <br />

                                    <p>{item.item_description}</p>

                                    <br />
                                  </>
                                )}

                                {item.location && (
                                  <>
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

                                    <br />
                                  </>
                                )}

                                {item.scope_of_work && (
                                  <>
                                    <div
                                      style={{
                                        backgroundColor:
                                          "rgba(225, 225, 225, 1)",
                                        borderRadius: "50px",
                                        padding: "4px 10px",
                                        width: "fit-content",
                                      }}
                                    >
                                      <strong>{item.scope_of_work}</strong>
                                    </div>
                                  </>
                                )}
                              </td>

                              <td>
                                {item.quantity} {item.unit}
                              </td>

                              {canSeePrice && (
                                <>
                                  <td>
                                    {item.rate_per_quantity?.toLocaleString()}
                                  </td>
                                  <td>
                                    {boqHeader.currency}{" "}
                                    {item.total_cost?.toLocaleString()}
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

                              {canManage && (
                                <td>
                                  <ThreeDotsMenuButton item={item} />
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>

                      {/* ✅ SUBTOTAL ROW — PERFECTLY ALIGNED */}
                      {canSeePrice && (
                        <tfoot
                          style={{
                            borderTop: "1px solid rgba(232, 223, 223, 1)",
                          }}
                        >
                          <tr>
                            <td></td>
                            <td>
                              <h3>SUBTOTAL FOR {subCategory}</h3>
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

                      {(userInfo?.departmentID === 8 ||
                        userInfo?.departmentID === 16) && (
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

                    <br />
                    <br />
                    <br />
                    <br />
                    <br />
                  </div>
                );
              }),
          )
        : Object.entries(subCategories).map(function (
            [subCategory, items],
            index,
          ) {
            // ✅ Calculate subtotal
            const subtotal = calculateSubtotal(items);

            return (
              <div key={subCategory} className="subcategory-section">
                <div className="subcategory-header">
                  <h2>
                    <span style={{ marginRight: "25px" }}>
                      {categories.indexOf(activeCategory) + 1}.{index + 1}{" "}
                    </span>
                    {subCategory}
                  </h2>

                  {(userInfo?.departmentID === 8 ||
                    userInfo?.departmentID === 16) && (
                    <div className="right">
                      <RenameBoqSubCategoryButton
                        item={items[0]}
                        category={activeCategory}
                        subCategory={subCategory}
                      />

                      <DeleteBoqSubCategoryButton
                        item={items[0]}
                        category={activeCategory}
                        subCategory={subCategory}
                      />
                    </div>
                  )}
                </div>

                <br />
                <br />

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

                  <tbody>
                    {items.map((item, itemIndex) => {
                      // ✅ Parse attachments for each item
                      const attachmentUrls = parseAttachments(item.attachments);

                      return (
                        <tr key={item.id}>
                          <td>
                            {categories.indexOf(activeCategory) + 1}.{index + 1}
                            .{itemIndex + 1}
                          </td>

                          <td>
                            <strong>{item.item_name}</strong>

                            {item.item_description && (
                              <>
                                <br />
                                <br />

                                <p>{item.item_description}</p>

                                <br />
                              </>
                            )}

                            {item.location && (
                              <>
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

                                <br />
                              </>
                            )}

                            {item.scope_of_work && (
                              <>
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
                              </>
                            )}
                          </td>

                          <td>
                            {item.quantity} {item.unit}
                          </td>

                          {canSeePrice && (
                            <>
                              <td>
                                {item.rate_per_quantity?.toLocaleString()}
                              </td>
                              <td>
                                {boqHeader.currency}{" "}
                                {item.total_cost?.toLocaleString()}
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

                          {canManage && (
                            <td>
                              <ThreeDotsMenuButton item={item} />
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>

                  {/* ✅ SUBTOTAL ROW — PERFECTLY ALIGNED */}
                  {canSeePrice && (
                    <tfoot
                      style={{
                        borderTop: "1px solid rgba(232, 223, 223, 1)",
                      }}
                    >
                      <tr>
                        <td></td>
                        <td>
                          <h3>SUBTOTAL FOR {subCategory}</h3>
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

                  {(userInfo?.departmentID === 8 ||
                    userInfo?.departmentID === 16) && (
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
                            autoCategory={activeCategory}
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

                <br />
                <br />
                <br />
                <br />
                <br />
              </div>
            );
          })}

      {(userInfo?.departmentID === 8 || userInfo?.departmentID === 16) &&
        activeCategory !== "ALL" && (
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
    </>
  );
}
