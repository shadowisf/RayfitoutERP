"use client";

import { useState } from "react";
import AddBoqItemButton from "./manager/_AddBoqItemButton";
import EditBoqItemButton from "./manager/_EditBoqItemButton";
import { BoqLine } from "../types/boqLine";
import DeleteBoqItemButton from "./manager/_DeleteBoqItemButton";
import DeleteBoqSubCategoryButton from "./manager/_DeleteBoqSubCategoryButton";
import RenameBoqSubCategoryButton from "./manager/_RenameBoqSubCategory";
import { useAuth } from "@/app/context/AuthContext";
import ItemDescriptionPopUp from "./ItemDescriptionPopUp";
import { BoqHeader } from "../types/boqHeader";
import DownloadBoqButton from "./manager/_DownloadBoqButton";

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

  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [expandedDescriptions, setExpandedDescriptions] = useState<number[]>(
    []
  );

  const categories = Object.keys(boqLines);
  const subCategories =
    activeCategory === "ALL"
      ? boqLines[categories[0]] || {}
      : boqLines[activeCategory] || {};

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
          <button
            className={`item ${activeCategory === "ALL" ? "active" : ""}`}
            onClick={() => setActiveCategory("ALL")}
            style={{ textTransform: "uppercase" }}
          >
            ALL
          </button>

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
            </>
          )}

          <DownloadBoqButton
            boqHeader={boqHeader}
            boqLines={boqLines}
            bgColor="black"
            borderColor="black"
            textColor="white"
          >
            DOWNLOAD BOQ
          </DownloadBoqButton>
        </div>
      </div>

      <br />
      <br />

      {activeCategory === "ALL"
        ? Object.entries(boqLines).map(
            ([category, subCategoriesData], categoryIndex) =>
              Object.entries(subCategoriesData).map(function (
                [subCategory, items],
                subCategoryIndex
              ) {
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
                        {category} - {subCategory}
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

                    <table className="items-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>ITEM</th>
                          <th>DESCRIPTION</th>
                          <th>LOCATION</th>
                          <th>QUANTITY</th>
                          <th>RATE</th>
                          <th>TOTAL COST</th>
                          <th>ATTACHMENTS</th>
                          {(userInfo?.departmentID === 8 ||
                            userInfo?.departmentID === 16) && <th>ACTIONS</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {items.map(function (item, itemIndex) {
                          return (
                            <tr key={item.id}>
                              <td>
                                {categoryIndex + 1}.{subCategoryIndex + 1}.
                                {itemIndex + 1}
                              </td>
                              <td>{item.item_name}</td>
                              <td>
                                {item.item_description ? (
                                  <ItemDescriptionPopUp item={item} />
                                ) : (
                                  "-"
                                )}
                              </td>
                              <td>{item.location?.split(" - ").pop()}</td>
                              <td>{item.quantity}</td>
                              <td>
                                {item.rate_per_quantity?.toLocaleString()}{" "}
                                {item.unit}
                              </td>
                              <td>AED {item.total_cost?.toLocaleString()}</td>

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
                                            <img
                                              key={i}
                                              src={url}
                                              alt="attachment"
                                            />
                                          );
                                        });
                                      }

                                      if (
                                        typeof item.attachments === "string"
                                      ) {
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
                                            <a
                                              href={url}
                                              key={i}
                                              target="_blank"
                                            >
                                              <img
                                                key={i}
                                                src={url}
                                                alt="attachment"
                                              />
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

                              {(userInfo?.departmentID === 8 ||
                                userInfo?.departmentID === 16) && (
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

                    {(userInfo?.departmentID === 8 ||
                      userInfo?.departmentID === 16) && (
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
                    )}

                    <br />
                    <br />
                    <br />
                    <br />
                    <br />
                  </div>
                );
              })
          )
        : Object.entries(subCategories).map(function (
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
                      {(userInfo?.departmentID === 8 ||
                        userInfo?.departmentID === 16) && <th>ACTION</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(function (item, itemIndex) {
                      return (
                        <tr key={item.id}>
                          <td>
                            {categories.indexOf(activeCategory) + 1}.{index + 1}
                            .{itemIndex + 1}
                          </td>
                          <td>{item.item_name}</td>
                          <td>{item.quantity}</td>
                          <td>{item.unit}</td>
                          <td>{item.rate_per_quantity?.toLocaleString()}</td>
                          <td>AED {item.total_cost?.toLocaleString()}</td>
                          <td>{item.location?.split(" - ").pop()}</td>
                          <td>
                            <ItemDescriptionPopUp item={item} />
                          </td>
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
                                        <img
                                          key={i}
                                          src={url}
                                          alt="attachment"
                                        />
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
                                          <img
                                            key={i}
                                            src={url}
                                            alt="attachment"
                                          />
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

                          {(userInfo?.departmentID === 8 ||
                            userInfo?.departmentID === 16) && (
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
                    style={{ padding: "20px 0px" }}
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

      {userInfo?.departmentID === 8 && activeCategory !== "ALL" && (
        <AddBoqItemButton
          boqHeaderID={boqHeader.id}
          bgColor="rgba(239, 239, 239, 1)"
          borderColor="rgba(239, 239, 239, 1)"
          textColor="black"
          full
          autoCategory={activeCategory}
          style={{ padding: "20px 0px", backgroundColor: "white" }}
        >
          ADD SUBCATEGORY & ITEM +
        </AddBoqItemButton>
      )}
    </>
  );
}
