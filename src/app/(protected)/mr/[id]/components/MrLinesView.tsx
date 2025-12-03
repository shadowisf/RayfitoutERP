"use client";

import { useState, useEffect } from "react";
import AddMrItemButton from "./_AddMrItemButton";
import { MrLine } from "../types/mrLine";
import EditMrItemButton from "./_EditMrItemButton";
import DeleteMrItemButton from "./_DeleteMrItemButton";
import RenameMrSubCategoryButton from "./_RenameMrSubCategoryButton";
import DeleteMrSubCategoryButton from "./_DeleteMrSubCategoryButton";
import BoqReferencePopUp from "./BoqReferencePopUp";
import SubmitMrForApprovalButton from "./_SubmitMrForApprovalButton";
import { MrHeader } from "../types/mrHeader";
import { useAuth } from "@/app/context/AuthContext";
import ApprovalMrItemButton from "./_ApprovalMrItemButtons";
import SubmitMrForResubmissionButton from "./_SubmitMrForResubmissionButton";
import SubmitMrForQuotationsButton from "./_SubmitMrForQuotations";

type GroupedMrLines = {
  [category: string]: {
    [subCategory: string]: MrLine[];
  };
};

type MrLinesViewProps = {
  mrLines: GroupedMrLines;
  mrHeader: MrHeader;
};

export default function MrLinesView({ mrHeader, mrLines }: MrLinesViewProps) {
  const { userInfo } = useAuth();

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

  function getActiveCategoryID() {
    const firstSubCategory = Object.values(subCategories)[0];
    if (firstSubCategory && firstSubCategory.length > 0) {
      return String(firstSubCategory[0].material_category_id);
    }
    return undefined;
  }

  function hasRejectedOrClarifiedItems() {
    let hasRejectedOrClarified = false;
    let allItemsReviewed = true;

    for (const category in mrLines) {
      for (const subCategory in mrLines[category]) {
        const items = mrLines[category][subCategory];

        for (const item of items) {
          const status = item.approval_status?.toLowerCase();

          if (status === "rejected" || status === "clarified") {
            hasRejectedOrClarified = true;
          }

          if (!status || status === "pending") {
            allItemsReviewed = false;
          }
        }
      }
    }

    return allItemsReviewed && hasRejectedOrClarified;
  }

  function allItemsApproved() {
    let allReviewed = true;
    let allApproved = true;

    for (const category in mrLines) {
      for (const subCategory in mrLines[category]) {
        const items = mrLines[category][subCategory];

        for (const item of items) {
          const status = item.approval_status?.toLowerCase();

          // Check if item has been reviewed
          if (!status || status === "pending") {
            allReviewed = false;
          }

          // Check if item is approved
          if (status !== "approved") {
            allApproved = false;
          }
        }
      }
    }

    return allReviewed && allApproved;
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

        {(mrHeader.progress_id === 1 || mrHeader.progress_id === 5) &&
          userInfo?.departmentID === mrHeader.department_id && (
            <AddMrItemButton
              mrHeaderID={mrHeader.id}
              projectID={mrHeader.project_id}
              bgColor="black"
              borderColor="black"
              textColor="white"
            >
              ADD CATEGORY & ITEM +
            </AddMrItemButton>
          )}
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

              {mrHeader.progress_id === 1 &&
                userInfo?.departmentID === mrHeader.department_id && (
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
                )}
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
                  {/* RESUBMISSION */}
                  {((mrHeader.progress_id === 5 &&
                    (userInfo?.departmentID === mrHeader.department_id ||
                      userInfo?.departmentID === 8)) ||
                    (mrHeader.progress_id === 3 &&
                      userInfo?.departmentID === mrHeader.department_id)) && (
                    <th>APPROVAL STATUS</th>
                  )}
                  {/* DRAFT OR RESUBMISSION */}
                  {(mrHeader.progress_id === 1 || mrHeader.progress_id === 5) &&
                    userInfo?.departmentID === mrHeader.department_id && (
                      <th>ACTIONS</th>
                    )}
                  {/* MANAGER REVIEW */}
                  {mrHeader.progress_id === 3 &&
                    userInfo?.departmentID === 8 && <th>ACTIONS</th>}
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
                        <td>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                            }}
                          >
                            {item.boq_item_number}
                            <BoqReferencePopUp item={item} />
                          </div>
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

                        {/* MANAGER & DEPARTMENT VIEW */}
                        {(((mrHeader.progress_id === 5 ||
                          mrHeader.progress_id === 3) &&
                          userInfo?.departmentID === mrHeader.department_id) ||
                          ((mrHeader.progress_id === 5 ||
                            mrHeader.progress_id === 3) &&
                            userInfo?.departmentID === 8)) && (
                          <td>
                            <div style={{ display: "flex", gap: "10px" }}>
                              <ApprovalMrItemButton
                                item={item}
                                progressID={mrHeader.progress_id}
                              />
                            </div>
                          </td>
                        )}

                        {/* DEPARTMENT ACTIONS */}
                        {(mrHeader.progress_id === 1 ||
                          mrHeader.progress_id === 5) &&
                          userInfo?.departmentID === mrHeader.department_id && (
                            <td>
                              <div style={{ display: "flex", gap: "10px" }}>
                                {(mrHeader.progress_id === 1 ||
                                  (mrHeader.progress_id === 5 &&
                                    (item.approval_status?.toLowerCase() ===
                                      "rejected" ||
                                      item.approval_status?.toLowerCase() ===
                                        "clarified"))) && (
                                  <>
                                    <EditMrItemButton
                                      projectID={mrHeader.project_id}
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
                                  </>
                                )}
                              </div>
                            </td>
                          )}
                      </tr>
                    );
                  })}
              </tbody>
            </table>

            <br />

            {(mrHeader.progress_id === 1 || mrHeader.progress_id === 5) &&
              userInfo?.departmentID === mrHeader.department_id && (
                <AddMrItemButton
                  projectID={mrHeader.project_id}
                  mrHeaderID={mrHeader.id}
                  bgColor="rgba(239, 239, 239, 1)"
                  borderColor="rgba(239, 239, 239, 1)"
                  textColor="black"
                  full
                  autoCategoryID={String(items[0].material_category_id)}
                  autoSubCategoryID={String(items[0].material_subcategory_id)}
                >
                  ADD ITEM +
                </AddMrItemButton>
              )}

            <br />
            <br />
            <br />
            <br />
            <br />
          </div>
        );
      })}

      {(mrHeader.progress_id === 1 || mrHeader.progress_id === 5) &&
        userInfo?.departmentID === mrHeader.department_id && (
          <AddMrItemButton
            projectID={mrHeader.project_id}
            mrHeaderID={mrHeader.id}
            bgColor="rgba(239, 239, 239, 1)"
            borderColor="rgba(239, 239, 239, 1)"
            textColor="black"
            full
            autoCategoryID={getActiveCategoryID()}
          >
            ADD SUBCATEGORY & ITEM +
          </AddMrItemButton>
        )}

      <br />
      <br />
      <br />
      <br />
      <br />

      {(mrHeader.progress_id === 1 || mrHeader.progress_id === 5) &&
        userInfo?.departmentID === mrHeader.department_id && (
          <div className="bottom-nav">
            <SubmitMrForApprovalButton
              mrHeaderID={mrHeader.id}
              bgColor="white"
              borderColor="white"
              textColor="black"
            >
              SUBMIT FOR APPROVAL
            </SubmitMrForApprovalButton>
          </div>
        )}

      {hasRejectedOrClarifiedItems() &&
        userInfo?.departmentID === 8 &&
        mrHeader.progress_id === 3 && (
          <div className="bottom-nav">
            <SubmitMrForResubmissionButton
              mrHeaderID={mrHeader.id}
              bgColor="white"
              borderColor="white"
              textColor="black"
            >
              SUBMIT FOR RESUBMISSION
            </SubmitMrForResubmissionButton>
          </div>
        )}

      {allItemsApproved() &&
        userInfo?.departmentID === 8 &&
        mrHeader.progress_id === 3 && (
          <div className="bottom-nav">
            <SubmitMrForQuotationsButton
              mrHeaderID={mrHeader.id}
              bgColor="white"
              borderColor="white"
              textColor="black"
            >
              SUBMIT FOR QUOTATIONS
            </SubmitMrForQuotationsButton>
          </div>
        )}
    </>
  );
}
