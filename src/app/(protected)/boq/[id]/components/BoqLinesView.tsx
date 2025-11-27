"use client";

import { useState, useEffect } from "react";
import AddBoqItemButton from "./_AddBoqItemButton";
import EditBoqItemButton from "./_EditBoqItemButton";
import { BoqLine } from "../types/boqLine";
import DeleteBoqItemButton from "./_DeleteBoqItemButton";
import DeleteBoqSubCategoryButton from "./_DeleteBoqSubCategoryButton";
import RenameBoqSubCategoryButton from "./_RenameBoqSubCategory";

type GroupedBoqLines = {
  [category: string]: {
    [subCategory: string]: BoqLine[];
  };
};

type BoqLinesViewProps = {
  boqLines: GroupedBoqLines;
  boqHeaderID: string;
};

export default function BoqLinesView({
  boqLines,
  boqHeaderID,
}: BoqLinesViewProps) {
  const pencilIcon = "/icons/pencil.svg";
  const trashIcon = "/icons/trash.svg";

  const [activeCategory, setActiveCategory] = useState<string>("");
  const [expandedDescriptions, setExpandedDescriptions] = useState<number[]>(
    []
  );

  const categories = Object.keys(boqLines);
  const subCategories = boqLines[activeCategory] || {};

  useEffect(
    function () {
      const categories = Object.keys(boqLines);
      if (categories.length > 0) {
        setActiveCategory(categories[0]);
      }
    },
    [boqLines]
  );

  function toggleDescription(itemId: number) {
    setExpandedDescriptions(function (prev) {
      if (prev.includes(itemId)) {
        return prev.filter(function (id) {
          return id !== itemId;
        });
      } else {
        return [...prev, itemId];
      }
    });
  }

  function isExpanded(itemId: number) {
    return expandedDescriptions.includes(itemId);
  }

  return (
    <>
      <div className="category-grid">
        <div>
          {categories.map(function (category) {
            return (
              <button
                key={category}
                className={`item ${
                  activeCategory === category ? "active" : ""
                }`}
                onClick={function () {
                  setActiveCategory(category);
                }}
              >
                {category}
              </button>
            );
          })}
        </div>

        <AddBoqItemButton
          boqHeaderID={boqHeaderID}
          bgColor="black"
          borderColor="black"
          textColor="white"
        >
          ADD CATEGORY & ITEM +
        </AddBoqItemButton>
      </div>

      <br />
      <br />

      {Object.entries(subCategories).map(function (
        [subCategory, items],
        index
      ) {
        return (
          <div key={subCategory} className="subcategory-section">
            <div className="subcategory-header">
              <h2>
                <span style={{ marginRight: "25px" }}>
                  {categories.indexOf(activeCategory) + 1}.{index + 1}{" "}
                </span>
                {subCategory}
              </h2>

              <div className="right">
                <DeleteBoqSubCategoryButton
                  item={items[0]}
                  category={activeCategory}
                  subCategory={subCategory}
                >
                  DELETE
                </DeleteBoqSubCategoryButton>

                <RenameBoqSubCategoryButton
                  item={items[0]}
                  category={activeCategory}
                  subCategory={subCategory}
                >
                  RENAME
                </RenameBoqSubCategoryButton>
              </div>
            </div>

            <br />
            <br />

            <table className="items-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>ITEM</th>
                  <th>QTY</th>
                  <th>UNIT</th>
                  <th>RATE</th>
                  <th>TOTAL COST</th>
                  <th>LOCATION</th>
                  <th>ITEM DESCRIPTION</th>
                  <th>ATTACHMENT(S)</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {items.map(function (item, itemIndex) {
                  const expanded = isExpanded(item.id);
                  const maxLength = 100;
                  const needsCollapse =
                    item.item_description &&
                    item.item_description.length > maxLength;

                  return (
                    <tr key={item.id}>
                      <td>
                        {categories.indexOf(activeCategory) + 1}.{index + 1}.
                        {itemIndex + 1}
                      </td>
                      <td>{item.item_name}</td>
                      <td>{item.quantity}</td>
                      <td>{item.unit}</td>
                      <td>{item.rate_per_quantity?.toLocaleString()}</td>
                      <td>AED {item.total_cost?.toLocaleString()}</td>
                      <td>{item.location?.split(" - ").pop()}</td>
                      <td
                        className="item-description"
                        style={{ whiteSpace: "pre-wrap", width: "300px" }}
                      >
                        {needsCollapse ? (
                          <>
                            {expanded
                              ? item.item_description
                              : item.item_description.substring(0, maxLength) +
                                "..."}
                            <br />
                            <br />
                            <span
                              className="toggle-btn"
                              onClick={function () {
                                toggleDescription(item.id);
                              }}
                            >
                              {expanded ? "SHOW LESS" : "SHOW MORE"}
                            </span>
                          </>
                        ) : (
                          item.item_description
                        )}
                      </td>
                      <td className="attachments">
                        <div className="attachments-grid">
                          {(() => {
                            try {
                              // Check if attachments exists and is not null/undefined
                              if (!item.attachments) {
                                return null;
                              }

                              // If it's already an array, use it directly
                              if (Array.isArray(item.attachments)) {
                                return item.attachments.map(function (
                                  url: string,
                                  i: number
                                ) {
                                  return (
                                    <img key={i} src={url} alt="attachment" />
                                  );
                                });
                              }

                              // If it's a string, parse it
                              if (typeof item.attachments === "string") {
                                if (item.attachments.trim() === "") {
                                  return null;
                                }

                                const attachments = JSON.parse(
                                  item.attachments
                                );

                                if (!Array.isArray(attachments)) {
                                  return null;
                                }

                                return attachments.map(function (
                                  url: string,
                                  i: number
                                ) {
                                  return (
                                    <img key={i} src={url} alt="attachment" />
                                  );
                                });
                              }

                              return null;
                            } catch (error) {
                              console.error(
                                "Failed to parse attachments:",
                                error,
                                item.attachments
                              );
                              return null;
                            }
                          })()}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "10px" }}>
                          <EditBoqItemButton
                            item={item}
                            bgColor={"rgba(239, 239, 239, 1)"}
                            borderColor={"rgba(223, 223, 223, 1)"}
                            textColor={"black"}
                          >
                            <img src={pencilIcon} alt="pencil icon" />
                          </EditBoqItemButton>

                          <DeleteBoqItemButton
                            item={item}
                            bgColor={"rgba(239, 239, 239, 1)"}
                            borderColor={"rgba(223, 223, 223, 1)"}
                            textColor={"black"}
                          >
                            <img src={trashIcon} alt="trash icon" />
                          </DeleteBoqItemButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <br />

            <AddBoqItemButton
              boqHeaderID={boqHeaderID}
              bgColor="rgba(239, 239, 239, 1)"
              borderColor="rgba(239, 239, 239, 1)"
              textColor="black"
              full
              autoCategory={activeCategory}
              autoSubCategory={subCategory}
            >
              ADD ITEM +
            </AddBoqItemButton>

            <br />

            <br />
            <br />
            <br />
            <br />
          </div>
        );
      })}

      <AddBoqItemButton
        boqHeaderID={boqHeaderID}
        bgColor="rgba(239, 239, 239, 1)"
        borderColor="rgba(239, 239, 239, 1)"
        textColor="black"
        full
        autoCategory={activeCategory}
      >
        ADD SUBCATEGORY & ITEM +
      </AddBoqItemButton>
    </>
  );
}
