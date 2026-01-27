"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import FormPopUp from "@/app/components/FormPopup";
import { toast } from "@/app/components/Toast";
import { BoqLine } from "@/app/(protected)/boq/[id]/types/boqLine";
import { useAuth } from "@/app/context/AuthContext";
import Button from "./Button";

type props = {
  projectID: number;
  onSelectBoq: (boqLineID: string | number, boqInfo: string) => void;
  currentBoqLineID?: string | number;
  disabled?: boolean;
  style?: React.CSSProperties;
};

type GroupedBoqLines = {
  [category: string]: {
    [subCategory: string]: BoqLine[];
  };
};

export default function SingleSelectBoqItemButton({
  projectID,
  onSelectBoq,
  currentBoqLineID,
  disabled,
  style,
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
  const [tempSelectedBoqID, setTempSelectedBoqID] = useState<string | number>(
    currentBoqLineID || "",
  );
  const [selectedBoqInfo, setSelectedBoqInfo] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

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
    if (projectID) {
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
        });
    }
  }, [projectID, isOpen]);

  // Set selectedBoqInfo when currentBoqLineID exists (for editing)
  useEffect(() => {
    if (currentBoqLineID && boqLineValues.length > 0) {
      const currentBoq = boqLineValues.find(
        (boq) => boq.id === currentBoqLineID,
      );

      if (currentBoq) {
        setSelectedBoqInfo(currentBoq.item_number + " " + currentBoq.item_name);
        setTempSelectedBoqID(currentBoqLineID);
      }
    }
  }, [currentBoqLineID, boqLineValues]);

  // Reset temp selection and search when form opens
  useEffect(() => {
    if (isOpen) {
      setTempSelectedBoqID(currentBoqLineID || "");
      setSearchQuery("");
    }
  }, [isOpen, currentBoqLineID]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!tempSelectedBoqID) {
      toast("Please select a bill of quantity item", "error");
      return;
    }

    onSelectBoq(tempSelectedBoqID, selectedBoqInfo);
    setIsOpen(false);
  };

  // Create the modal content
  const modalContent = isOpen && (
    <FormPopUp
      header={"SELECT BILL OF QUANTITY ITEM"}
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

      {/* Category Grid */}
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
                    style={{ flexShrink: 0, cursor: "pointer" }}
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
              ([category, subCategoriesData], categoryIndex) =>
                Object.entries(subCategoriesData).map(
                  ([subCategory, items], subCategoryIndex) => (
                    <div
                      key={`${category}-${subCategory}`}
                      style={{ marginBottom: "30px" }}
                    >
                      <h2
                        style={{
                          marginBottom: "10px",
                          textTransform: "uppercase",
                        }}
                      >
                        {categoryIndex + 1}.{subCategoryIndex + 1} {category} /{" "}
                        {subCategory}
                      </h2>

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
                                    type="radio"
                                    name="boq-select"
                                    value={boq.id}
                                    checked={tempSelectedBoqID === boq.id}
                                    onChange={() => {
                                      setTempSelectedBoqID(boq.id);
                                      setSelectedBoqInfo(
                                        boq.item_number + " " + boq.item_name,
                                      );
                                    }}
                                    style={{
                                      width: "18px",
                                      height: "18px",
                                      cursor: "pointer",
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
                                      {boq.rate_per_quantity?.toLocaleString()}
                                    </td>
                                    <td>
                                      AED {boq.total_cost?.toLocaleString()}
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
                    </div>
                  ),
                ),
            )
          : Object.entries(boqSubCategories).map(
              ([subCategory, items], index) => (
                <div key={subCategory} style={{ marginBottom: "30px" }}>
                  <h2 style={{ marginBottom: "10px" }}>
                    {boqCategories.indexOf(activeBoqCategory) + 1}.{index + 1}{" "}
                    {subCategory}
                  </h2>

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
                                type="radio"
                                name="boq-select"
                                value={boq.id}
                                checked={tempSelectedBoqID === boq.id}
                                onChange={() => {
                                  setTempSelectedBoqID(boq.id);
                                  setSelectedBoqInfo(
                                    boq.item_number + " " + boq.item_name,
                                  );
                                }}
                                style={{
                                  width: "18px",
                                  height: "18px",
                                  cursor: "pointer",
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
                                <td>
                                  {boq.rate_per_quantity?.toLocaleString()}
                                </td>
                                <td>AED {boq.total_cost?.toLocaleString()}</td>
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
                </div>
              ),
            )}
      </div>
    </FormPopUp>
  );

  const handleReset = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // prevent opening modal
    setTempSelectedBoqID("");
    setSelectedBoqInfo("");
    onSelectBoq("", ""); // notify parent that BOQ is cleared
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
        {currentBoqLineID && selectedBoqInfo ? (
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <span
              style={{
                maxWidth: "300px", // adjust as needed
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
          "SELECT BOQ ITEM"
        )}
      </Button>

      {typeof window !== "undefined" &&
        modalContent &&
        createPortal(modalContent, document.body)}
    </>
  );
}
