"use client";

import { useState, useEffect } from "react";
import AddMrItemButton from "./_AddMrItemButton";
import { MrLine } from "../types/mrLine";
import EditMrItemButton from "./_EditMrItemButton";
import DeleteMrItemButton from "./_DeleteMrItemButton";
import RenameMrSubCategoryButton from "./_RenameMrSubCategoryButton";
import DeleteMrSubCategoryButton from "./_DeleteMrSubCategoryButton";
import BoqRefPopUp from "./BoqRefPopUp";

type GroupedMrLines = {
  [category: string]: {
    [subCategory: string]: MrLine[];
  };
};

type MrLinesViewProps = {
  mrLines: GroupedMrLines;
  mrHeaderID: string;
  projectID: string;
};

export default function MrLinesView({
  mrLines,
  mrHeaderID,
  projectID,
}: MrLinesViewProps) {
  const pencilIcon = "/icons/pencil.svg";
  const trashIcon = "/icons/trash.svg";

  const [activeCategory, setActiveCategory] = useState<string>("");
  const [expandedDescriptions, setExpandedDescriptions] = useState<number[]>(
    []
  );

  const categories = Object.keys(mrLines);
  const subCategories = mrLines[activeCategory] || {};

  useEffect(
    function () {
      const categories = Object.keys(mrLines);
      if (categories.length > 0) {
        setActiveCategory(categories[0]);
      }
    },
    [mrLines]
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

  // Helper function to get the category ID from the active category
  function getActiveCategoryID() {
    const firstSubCategory = Object.values(subCategories)[0];
    if (firstSubCategory && firstSubCategory.length > 0) {
      return String(firstSubCategory[0].material_category_id);
    }
    return undefined;
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
                style={{ textTransform: "uppercase" }}
              >
                {category}
              </button>
            );
          })}
        </div>

        <AddMrItemButton
          mrHeaderID={mrHeaderID}
          projectID={projectID}
          bgColor="black"
          borderColor="black"
          textColor="white"
        >
          ADD CATEGORY & ITEM +
        </AddMrItemButton>
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
              <h2 style={{ textTransform: "uppercase" }}>
                <span style={{ marginRight: "25px" }}>
                  {categories.indexOf(activeCategory) + 1}.{index + 1}
                </span>
                {subCategory}
              </h2>

              <div className="right">
                <DeleteMrSubCategoryButton
                  items={items}
                  category={activeCategory}
                  subCategory={subCategory}
                >
                  DELETE
                </DeleteMrSubCategoryButton>

                <RenameMrSubCategoryButton
                  items={items}
                  categoryID={String(items[0].material_category_id)}
                  subCategoryID={String(items[0].material_subcategory_id)}
                >
                  RENAME
                </RenameMrSubCategoryButton>
              </div>
            </div>

            <br />
            <br />

            <table className="items-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>DESCRIPTION</th>
                  <th>QUANTITY</th>
                  <th>UNIT</th>
                  <th>BOQ REF</th>
                  <th>NOTES</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(items) &&
                  items.map(function (item, itemIndex) {
                    const expanded = isExpanded(item.id);
                    const maxLength = 100;
                    const needsCollapse =
                      item.notes && item.notes.length > maxLength;

                    return (
                      <tr key={item.id}>
                        <td>{itemIndex + 1}</td>
                        <td>{item.material_description}</td>
                        <td>{item.quantity}</td>
                        <td>{item.unit}</td>
                        <td
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                          }}
                        >
                          {item.boq_item_number}
                          <BoqRefPopUp item={item} />
                        </td>
                        <td
                          className="item-description"
                          style={{ whiteSpace: "pre-wrap", width: "300px" }}
                        >
                          {needsCollapse ? (
                            <>
                              {expanded
                                ? item.notes
                                : item.notes.substring(0, maxLength) + "..."}
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
                            item.notes
                          )}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "10px" }}>
                            <EditMrItemButton
                              projectID={projectID}
                              item={item}
                              bgColor={"rgba(239, 239, 239, 1)"}
                              borderColor={"rgba(223, 223, 223, 1)"}
                              textColor={"black"}
                            >
                              <img src={pencilIcon} alt="pencil icon" />
                            </EditMrItemButton>

                            <DeleteMrItemButton
                              item={item}
                              bgColor={"rgba(239, 239, 239, 1)"}
                              borderColor={"rgba(223, 223, 223, 1)"}
                              textColor={"black"}
                            >
                              <img src={trashIcon} alt="trash icon" />
                            </DeleteMrItemButton>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>

            <br />

            <AddMrItemButton
              projectID={projectID}
              mrHeaderID={mrHeaderID}
              bgColor="rgba(239, 239, 239, 1)"
              borderColor="rgba(239, 239, 239, 1)"
              textColor="black"
              full
              autoCategoryID={String(items[0].material_category_id)}
              autoSubCategoryID={String(items[0].material_subcategory_id)}
            >
              ADD ITEM +
            </AddMrItemButton>

            <br />
            <br />
            <br />
            <br />
            <br />
          </div>
        );
      })}

      <AddMrItemButton
        projectID={projectID}
        mrHeaderID={mrHeaderID}
        bgColor="rgba(239, 239, 239, 1)"
        borderColor="rsgba(239, 239, 239, 1)"
        textColor="black"
        full
        autoCategoryID={getActiveCategoryID()}
      >
        ADD SUBCATEGORY & ITEM +
      </AddMrItemButton>

      <br />
      <br />
      <br />
      <br />
      <br />
    </>
  );
}
