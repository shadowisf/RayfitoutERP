"use client";

import { useState, useEffect } from "react";
import AddMrItemButton from "./department/_AddMrItemButton";
import { MrLine } from "../types/mrLine";
import EditMrItemButton from "./department/_EditMrItemButton";
import DeleteMrItemButton from "./department/_DeleteMrItemButton";
import RenameMrSubCategoryButton from "./department/_RenameMrSubCategoryButton";
import DeleteMrSubCategoryButton from "./department/_DeleteMrSubCategoryButton";
import BoqReferencePopUp from "./BoqReferencePopUp";
import SubmitMrForApprovalButton from "./department/_SubmitMrForApprovalButton";
import { MrHeader } from "../types/mrHeader";
import { useAuth } from "@/app/context/AuthContext";
import InitialApprovalMrItemButton from "./manager/_InitialApprovalMrItemButtons";
import SubmitMrForResubmissionButton from "./manager/_SubmitMrForResubmissionButton";
import SubmitMrForQuotationsButton from "./manager/_SubmitMrForQuotationsButton";
import MrSupplierAndQuotationButton from "./procurement/_MrSupplierAndQuotationButton";
import SubmitMrForPricingApprovalButton from "./procurement/_SubmitMrForPriceApprovalButton";
import NotesPopUp from "./NotesPopUp";
import PriceApprovalMrItemButton from "./manager/_PriceApprovalMrItemButton";
import SubmitMrForPricingResubmissionButton from "./manager/_SubmitMrForPriceResubmissionButton";
import SubmitMrForLPO from "./manager/_SubmitMrForLPO";
import Button from "@/app/components/Button";

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

  const [showBySupplier, setShowBySupplier] = useState<boolean>(false);
  const [showByItem, setShowByItem] = useState<boolean>(true);
  const [itemsWithQuotations, setItemsWithQuotations] = useState<Set<number>>(
    new Set()
  );
  const [isCheckingQuotations, setIsCheckingQuotations] =
    useState<boolean>(true);

  // New state for tracking supplier approval status
  const [supplierApprovalStatus, setSupplierApprovalStatus] = useState<{
    [itemId: number]: "approved" | "rejected" | "pending";
  }>({});
  const [isCheckingSupplierApprovals, setIsCheckingSupplierApprovals] =
    useState<boolean>(true);

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

  // Check which items have supplier quotations
  useEffect(() => {
    async function checkAllQuotations() {
      if (mrHeader.progress_id !== 7) {
        setIsCheckingQuotations(false);
        return;
      }

      setIsCheckingQuotations(true);
      const itemsWithQuotes = new Set<number>();

      try {
        // Get all item IDs
        const allItemIds: number[] = [];
        for (const category in mrLines) {
          for (const subCategory in mrLines[category]) {
            const items = mrLines[category][subCategory];
            items.forEach((item) => allItemIds.push(item.id));
          }
        }

        // Check each item for quotations
        const checkPromises = allItemIds.map(async (itemId) => {
          try {
            const response = await fetch(
              "/api/supplier/getAllSupplierAndQuotationByMrLineID",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: itemId }),
              }
            );

            if (response.ok) {
              const data = await response.json();
              // Check if there are at least 3 quotations
              if (data && Array.isArray(data) && data.length >= 3) {
                itemsWithQuotes.add(itemId);
              }
            }
          } catch (error) {
            console.error(
              `Error checking quotations for item ${itemId}:`,
              error
            );
          }
        });

        await Promise.all(checkPromises);
        setItemsWithQuotations(itemsWithQuotes);
      } catch (error) {
        console.error("Error checking quotations:", error);
      } finally {
        setIsCheckingQuotations(false);
      }
    }

    checkAllQuotations();
  }, [mrLines, mrHeader.progress_id]);

  // Check supplier approval status for pricing approval stage
  useEffect(() => {
    async function checkSupplierApprovals() {
      if (mrHeader.progress_id !== 10) {
        setIsCheckingSupplierApprovals(false);
        return;
      }

      setIsCheckingSupplierApprovals(true);
      const statusMap: {
        [itemId: number]: "approved" | "rejected" | "pending";
      } = {};

      try {
        // Get all item IDs
        const allItemIds: number[] = [];
        for (const category in mrLines) {
          for (const subCategory in mrLines[category]) {
            const items = mrLines[category][subCategory];
            items.forEach((item) => allItemIds.push(item.id));
          }
        }

        // Check each item's supplier approval status
        const checkPromises = allItemIds.map(async (itemId) => {
          try {
            const response = await fetch(
              "/api/supplier/getAllSupplierAndQuotationByMrLineID",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: itemId }),
              }
            );

            if (response.ok) {
              const data = await response.json();

              if (data && Array.isArray(data) && data.length > 0) {
                // Check if any quotation is approved
                const hasApproved = data.some(
                  (q: any) => q.approval_status === "Approved"
                );

                // Check if all quotations are rejected
                const allRejected = data.every(
                  (q: any) => q.approval_status === "Rejected"
                );

                if (hasApproved) {
                  statusMap[itemId] = "approved";
                } else if (allRejected) {
                  statusMap[itemId] = "rejected";
                } else {
                  statusMap[itemId] = "pending";
                }
              } else {
                statusMap[itemId] = "pending";
              }
            }
          } catch (error) {
            console.error(
              `Error checking supplier approvals for item ${itemId}:`,
              error
            );
            statusMap[itemId] = "pending";
          }
        });

        await Promise.all(checkPromises);
        setSupplierApprovalStatus(statusMap);
      } catch (error) {
        console.error("Error checking supplier approvals:", error);
      } finally {
        setIsCheckingSupplierApprovals(false);
      }
    }

    checkSupplierApprovals();
  }, [mrLines, mrHeader.progress_id]);

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

  function hasRejectedItems() {
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

          if (!status || status === "pending") {
            allReviewed = false;
          }

          if (status !== "approved") {
            allApproved = false;
          }
        }
      }
    }

    return allReviewed && allApproved;
  }

  function allItemsHaveSupplierQuotations() {
    // Get total count of items
    let totalItems = 0;
    for (const category in mrLines) {
      for (const subCategory in mrLines[category]) {
        totalItems += mrLines[category][subCategory].length;
      }
    }

    // Check if all items have quotations
    return (
      totalItems > 0 &&
      itemsWithQuotations.size === totalItems &&
      !isCheckingQuotations
    );
  }

  // Check if any supplier quotations are rejected
  function hasRejectedSuppliers() {
    if (isCheckingSupplierApprovals) return false;

    let hasRejected = false;
    let allReviewed = true;

    for (const category in mrLines) {
      for (const subCategory in mrLines[category]) {
        const items = mrLines[category][subCategory];

        for (const item of items) {
          const status = supplierApprovalStatus[item.id];

          if (status === "rejected") {
            hasRejected = true;
          }

          if (!status || status === "pending") {
            allReviewed = false;
          }
        }
      }
    }

    return allReviewed && hasRejected;
  }

  // Check if all supplier quotations are approved
  function allSuppliersApproved() {
    if (isCheckingSupplierApprovals) return false;

    let allReviewed = true;
    let allApproved = true;

    for (const category in mrLines) {
      for (const subCategory in mrLines[category]) {
        const items = mrLines[category][subCategory];

        for (const item of items) {
          const status = supplierApprovalStatus[item.id];

          if (!status || status === "pending") {
            allReviewed = false;
          }

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
      <div
        className="category-grid"
        style={{
          flexDirection: "column",
          gap: "2rem",
        }}
      >
        {mrHeader.progress_id === 10 && userInfo?.departmentID === 9 && (
          <div
            style={{
              display: "flex",
              gap: " 2rem",
            }}
          >
            <Button
              componentType={"button"}
              bgColor={"black"}
              borderColor={"black"}
              textColor={"white"}
              style={{
                padding: "7px 20px",
                borderRadius: "25px",
              }}
              onClick={() => {
                setShowBySupplier(!setShowBySupplier);
                setShowByItem(false);
                console.log("show by supplier clicked");
              }}
            >
              SHOW BY SUPPLIER
            </Button>
            <Button
              componentType={"button"}
              bgColor={"transparent"}
              borderColor={"black"}
              textColor={"black"}
              style={{
                padding: "7px 20px",
                borderRadius: "25px",
              }}
              onClick={() => {
                setShowByItem(!showByItem);
                setShowBySupplier(false);
                console.log("show by item clicked");
              }}
            >
              SHOW BY ITEM
            </Button>
          </div>
        )}
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              width: "100%",
              alignItems: "center",
            }}
          >
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
            {mrHeader.progress_id === 10 && userInfo?.departmentID === 9 && (
              <div
                style={{
                  display: "flex",
                  gap: " 2rem",
                }}
              >
                <Button
                  componentType={"button"}
                  bgColor={"black"}
                  borderColor={"black"}
                  textColor={"white"}
                  style={{
                    padding: "7px 20px",
                    borderRadius: "25px",
                  }}
                >
                  Issue LPO
                </Button>
                <Button
                  componentType={"button"}
                  bgColor={"black"}
                  borderColor={"black"}
                  textColor={"white"}
                  style={{
                    padding: "7px 20px",
                    borderRadius: "25px",
                  }}
                >
                  Upload Image
                </Button>
              </div>
            )}
          </div>
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
          <div
            key={subCategory}
            className="subcategory-section"
          >
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
                  {/* MANAGER APPROVAL */}
                  {mrHeader.progress_id === 3 &&
                    userInfo?.departmentID === 8 && <th>ACTIONS</th>}

                  {/* PROCUREMENT */}
                  {(mrHeader.progress_id === 7 ||
                    mrHeader.progress_id === 11) &&
                    userInfo?.departmentID === 9 && (
                      <th>SUPPLIER & QUOTATION</th>
                    )}

                  {/* MANAGER PRICING APPROVAL */}
                  {mrHeader.progress_id === 10 &&
                    userInfo?.departmentID === 8 && (
                      <th>SUPPLIER & QUOTATION</th>
                    )}
                </tr>
              </thead>
              <tbody>
                {Array.isArray(items) &&
                  items.map(function (item, itemIndex) {
                    const expanded = isExpanded(item.id);
                    const maxLength = 100;
                    const needsCollapse =
                      item.notes && item.notes.length > maxLength;
                    const hasQuotations = itemsWithQuotations.has(item.id);

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
                        <td>
                          <NotesPopUp item={item} />
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
                              <InitialApprovalMrItemButton
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
                                      <img
                                        src={pencilIcon}
                                        alt="pencil icon"
                                      />
                                    </EditMrItemButton>

                                    <DeleteMrItemButton
                                      item={item}
                                      bgColor={"rgba(239, 239, 239, 1)"}
                                      borderColor={"rgba(223, 223, 223, 1)"}
                                      textColor={"black"}
                                    >
                                      <img
                                        src={trashIcon}
                                        alt="trash icon"
                                      />
                                    </DeleteMrItemButton>
                                  </>
                                )}
                              </div>
                            </td>
                          )}

                        {/* PROCUREMENT */}
                        {(mrHeader.progress_id === 7 ||
                          mrHeader.progress_id === 11) &&
                          userInfo?.departmentID === 9 && (
                            <td>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "10px",
                                }}
                              >
                                <MrSupplierAndQuotationButton
                                  mrLineID={item.id}
                                  bgColor="black"
                                  textColor="white"
                                  borderColor="black"
                                  style={{
                                    padding: "7px 10px",
                                    borderRadius: "25px",
                                  }}
                                />
                              </div>
                            </td>
                          )}

                        {/* MANAGER PRICING APPROVAL */}
                        {mrHeader.progress_id === 10 &&
                          userInfo?.departmentID === 8 && (
                            <td>
                              <PriceApprovalMrItemButton
                                mrLineID={item.id}
                                bgColor="white"
                                borderColor="rgba(207, 207, 207, 1)"
                                textColor="black"
                                style={{
                                  borderRadius: "25px",
                                  padding: "5px 20px",
                                }}
                              />
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

      {hasRejectedItems() &&
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

      {allItemsHaveSupplierQuotations() &&
        userInfo?.departmentID === 9 &&
        (mrHeader.progress_id === 7 || mrHeader.progress_id === 11) && (
          <div className="bottom-nav">
            <SubmitMrForPricingApprovalButton
              mrHeaderID={mrHeader.id}
              bgColor="white"
              borderColor="white"
              textColor="black"
            >
              SUBMIT FOR PRICING APPROVAL
            </SubmitMrForPricingApprovalButton>
          </div>
        )}

      {hasRejectedSuppliers() &&
        userInfo?.departmentID === 8 &&
        mrHeader.progress_id === 10 && (
          <div className="bottom-nav">
            <SubmitMrForPricingResubmissionButton
              mrHeaderID={mrHeader.id}
              bgColor="white"
              borderColor="white"
              textColor="black"
            >
              SUBMIT FOR PRICING RESUBMISSION
            </SubmitMrForPricingResubmissionButton>
          </div>
        )}

      {allSuppliersApproved() &&
        userInfo?.departmentID === 8 &&
        mrHeader.progress_id === 10 && (
          <div className="bottom-nav">
            <SubmitMrForLPO
              mrHeaderID={mrHeader.id}
              bgColor="white"
              borderColor="white"
              textColor="black"
            >
              SUBMIT FOR LPO
            </SubmitMrForLPO>
          </div>
        )}
    </>
  );
}
