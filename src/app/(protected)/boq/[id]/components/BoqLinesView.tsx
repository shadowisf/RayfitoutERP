"use client";

import { useState, useEffect } from "react";
import AddBoqItemButton from "./manager/_AddBoqItemButton";
import EditBoqItemButton from "./manager/_EditBoqItemButton";
import { BoqLine } from "../types/boqLine";
import DeleteBoqItemButton from "./manager/_DeleteBoqItemButton";
import DeleteBoqSubCategoryButton from "./manager/_DeleteBoqSubCategoryButton";
import RenameBoqSubCategoryButton from "./manager/_RenameBoqSubCategory";
import { useAuth } from "@/app/context/AuthContext";
import ItemDescriptionPopUp from "./ItemDescriptionPopUp";
import { BoqHeader } from "../types/boqHeader";
import DownloadBOQButton from "./manager/_DownloadBOQButton";

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

        <div style={{ display: "flex", gap: "10px" }}>
          {userInfo?.departmentID === 8 && (
            <>
              <AddBoqItemButton
                boqHeaderID={boqHeader.id}
                bgColor="black"
                borderColor="black"
                textColor="white"
              >
                ADD CATEGORY & ITEM +
              </AddBoqItemButton>

              <DownloadBOQButton
                boqHeader={boqHeader}
                boqLines={boqLines}
                bgColor="black"
                borderColor="black"
                textColor="white"
              >
                DOWNLOAD BOQ
              </DownloadBOQButton>
            </>
          )}
        </div>
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

              {userInfo?.departmentID === 8 && (
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
              )}
            </div>

            <br />
            <br />

            <table className="items-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>ITEM</th>
                  <th>QUANTITY</th>
                  <th>UNIT</th>
                  <th>RATE</th>
                  <th>TOTAL COST</th>
                  <th>LOCATION</th>
                  <th>ITEM DESCRIPTION</th>
                  <th>ATTACHMENT(S)</th>
                  {userInfo?.departmentID === 8 && <th>ACTION</th>}
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
                      {/* <td
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
                      </td> */}
                      <td>
                        <ItemDescriptionPopUp item={item} />
                      </td>
                      {/* <td>
                        <div style={{ whiteSpace: "pre-wrap" }}>
                          {item.item_description}
                        </div>
                      </td> */}
                      <td className="attachments">
                        <div className="attachments-grid">
                          {(() => {
                            try {
                              if (!item.attachments) {
                                return null;
                              }

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
                                    <a href={url} key={i} target="_blank">
                                      <img key={i} src={url} alt="attachment" />
                                    </a>
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

                      {userInfo?.departmentID === 8 && (
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
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <br />

            {userInfo?.departmentID === 8 && (
              <AddBoqItemButton
                boqHeaderID={boqHeader.id}
                bgColor="rgba(239, 239, 239, 1)"
                borderColor="rgba(239, 239, 239, 1)"
                textColor="black"
                full
                autoCategory={activeCategory}
                autoSubCategory={subCategory}
              >
                ADD ITEM +
              </AddBoqItemButton>
            )}

            <br />

            <br />
            <br />
            <br />
            <br />
          </div>
        );
      })}

      {userInfo?.departmentID === 8 && (
        <AddBoqItemButton
          boqHeaderID={boqHeader.id}
          bgColor="rgba(239, 239, 239, 1)"
          borderColor="rgba(239, 239, 239, 1)"
          textColor="black"
          full
          autoCategory={activeCategory}
        >
          ADD SUBCATEGORY & ITEM +
        </AddBoqItemButton>
      )}
    </>
  );
}
