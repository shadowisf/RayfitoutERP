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
import SubmitMrForResubmissionButton from "./manager/_SubmitMrForInitialResubmissionButton";
import SubmitMrForQuotationsButton from "./manager/_SubmitMrForQuotationsButton";
import MrSupplierAndQuotationButton from "./procurement/_MrSupplierAndQuotationButton";
import SubmitMrForPricingApprovalButton from "./procurement/_SubmitMrForPriceApprovalButton";
import NotesPopUp from "./NotesPopUp";
import PriceApprovalMrItemButton from "./manager/_PriceApprovalMrItemButton";
import SubmitMrForPricingResubmissionButton from "./manager/_SubmitMrForPriceResubmissionButton";
import SubmitMrForLPO from "./manager/_SubmitMrForLPO";
import Button from "@/app/components/Button";
import SupplierDetailsPopUp from "./SupplierDetailsPopUp";
import IssueLPOButton from "./procurement/_IssueLPOButton";
import SubmitMrForPaymentButton from "./procurement/_SubmitMrForPaymentButton";
import PaymentMrItemButton from "./finance/_PaymentMrItemButton";
import SubmitMrForAwaitingDeliveryButton from "./finance/_SubmitForAwaitingDelivery";

type GroupedMrLines = {
  [category: string]: {
    [subCategory: string]: {
      [supplier: string]: MrLine[];
    };
  };
};

type GroupedMrLinesBySupplier = {
  [supplierName: string]: MrLine[];
};

type MrLinesViewProps = {
  mrLines: GroupedMrLines;
  mrHeader: MrHeader;
};

export default function MrLinesView({ mrHeader, mrLines }: MrLinesViewProps) {
  const { userInfo } = useAuth();

  const pencilIcon = "/icons/pencil.svg";
  const trashIcon = "/icons/trash.svg";
  const externalLinkIcon = "/icons/external-link.svg";

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

  // Updated state for tracking LPO, invoice, and signed file status
  const [lpoInvoiceStatus, setLpoInvoiceStatus] = useState<{
    [supplierId: number]: {
      hasLpo: boolean;
      hasInvoice: boolean;
      hasSignedFile: boolean; // Added this
    };
  }>({});
  const [isCheckingLpoInvoices, setIsCheckingLpoInvoices] =
    useState<boolean>(true);

  // Group items by supplier - using the correct type
  const [mrLinesBySupplier, setMrLinesBySupplier] =
    useState<GroupedMrLinesBySupplier>({});

  const categories = Object.keys(mrLines);
  const subCategories = mrLines[activeCategory] || {};
  const suppliers = Object.keys(mrLinesBySupplier);

  // Add this new state for tracking payment status
  const [lpoPaymentStatus, setLpoPaymentStatus] = useState<{
    [supplierId: number]: "approved" | "rejected" | "pending";
  }>({});
  const [isCheckingPaymentStatus, setIsCheckingPaymentStatus] =
    useState<boolean>(true);

  useEffect(
    function () {
      const categories = Object.keys(mrLines);
      if (categories.length > 0) {
        setActiveCategory(categories[0]);
      }
    },
    [mrLines]
  );

  // Group items by supplier - extract from nested structure
  useEffect(() => {
    const supplierGroups: GroupedMrLinesBySupplier = {};

    // Iterate through all categories, subcategories, and suppliers
    for (const category in mrLines) {
      for (const subCategory in mrLines[category]) {
        for (const supplier in mrLines[category][subCategory]) {
          const items = mrLines[category][subCategory][supplier];

          if (!supplierGroups[supplier]) {
            supplierGroups[supplier] = [];
          }

          // Add all items from this supplier
          supplierGroups[supplier].push(...items);
        }
      }
    }

    setMrLinesBySupplier(supplierGroups);
  }, [mrLines]);

  useEffect(() => {
    async function checkAllQuotations() {
      if (mrHeader.progress_id !== 7 && mrHeader.progress_id !== 11) {
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
            for (const supplier in mrLines[category][subCategory]) {
              const items = mrLines[category][subCategory][supplier];
              items.forEach((item) => allItemIds.push(item.id));
            }
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
      if (mrHeader.progress_id !== 10 && mrHeader.progress_id !== 11) {
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
            for (const supplier in mrLines[category][subCategory]) {
              const items = mrLines[category][subCategory][supplier];
              items.forEach((item) => allItemIds.push(item.id));
            }
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

  // Updated: Check LPO, invoice, and signed file status for each supplier
  useEffect(() => {
    async function checkLpoInvoices() {
      if (mrHeader.progress_id !== 12) {
        setIsCheckingLpoInvoices(false);
        return;
      }

      setIsCheckingLpoInvoices(true);
      const statusMap: {
        [supplierId: number]: {
          hasLpo: boolean;
          hasInvoice: boolean;
          hasSignedFile: boolean;
        };
      } = {};

      try {
        // Get unique suppliers with their IDs
        const uniqueSuppliers = new Map<number, string>();

        for (const category in mrLines) {
          for (const subCategory in mrLines[category]) {
            for (const supplier in mrLines[category][subCategory]) {
              const items = mrLines[category][subCategory][supplier];
              if (items.length > 0) {
                const supplierId = items[0].approved_supplier_id;
                if (supplierId) {
                  uniqueSuppliers.set(supplierId, supplier);
                }
              }
            }
          }
        }

        // Check each supplier for LPO, invoice, and signed file
        const checkPromises = Array.from(uniqueSuppliers.keys()).map(
          async (supplierId) => {
            try {
              const response = await fetch(
                `${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo/getLPOByMrHeaderID`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    mr_header_id: mrHeader.id,
                    supplier_id: supplierId,
                  }),
                }
              );

              if (response.ok) {
                const data = await response.json();

                if (data.success && data.data && data.data.length > 0) {
                  const lpo = data.data[0];

                  // Check if invoice files exist and have at least one file
                  let hasInvoice = false;
                  if (lpo.invoice_file) {
                    try {
                      const parsedFiles =
                        typeof lpo.invoice_file === "string"
                          ? JSON.parse(lpo.invoice_file)
                          : lpo.invoice_file;
                      hasInvoice =
                        Array.isArray(parsedFiles) && parsedFiles.length > 0;
                    } catch (error) {
                      console.error("Error parsing invoice files:", error);
                      hasInvoice = false;
                    }
                  }

                  // Check if signed files exist and have at least one file
                  let hasSignedFile = false;
                  if (lpo.signed_file) {
                    try {
                      const parsedFiles =
                        typeof lpo.signed_file === "string"
                          ? JSON.parse(lpo.signed_file)
                          : lpo.signed_file;
                      hasSignedFile =
                        Array.isArray(parsedFiles) && parsedFiles.length > 0;
                    } catch (error) {
                      console.error("Error parsing signed files:", error);
                      hasSignedFile = false;
                    }
                  }

                  statusMap[supplierId] = {
                    hasLpo: true,
                    hasInvoice: hasInvoice,
                    hasSignedFile: hasSignedFile,
                  };
                } else {
                  statusMap[supplierId] = {
                    hasLpo: false,
                    hasInvoice: false,
                    hasSignedFile: false,
                  };
                }
              } else {
                statusMap[supplierId] = {
                  hasLpo: false,
                  hasInvoice: false,
                  hasSignedFile: false,
                };
              }
            } catch (error) {
              console.error(
                `Error checking LPO for supplier ${supplierId}:`,
                error
              );
              statusMap[supplierId] = {
                hasLpo: false,
                hasInvoice: false,
                hasSignedFile: false,
              };
            }
          }
        );

        await Promise.all(checkPromises);
        setLpoInvoiceStatus(statusMap);
      } catch (error) {
        console.error("Error checking LPO and invoices:", error);
      } finally {
        setIsCheckingLpoInvoices(false);
      }
    }

    checkLpoInvoices();
  }, [mrLines, mrHeader.progress_id, mrHeader.id]);

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
    if (firstSubCategory) {
      const firstSupplier = Object.values(firstSubCategory)[0];
      if (firstSupplier && firstSupplier.length > 0) {
        return String(firstSupplier[0].material_category_id);
      }
    }
    return undefined;
  }

  function hasRejectedItems() {
    let hasRejectedOrClarified = false;
    let allItemsReviewed = true;

    for (const category in mrLines) {
      for (const subCategory in mrLines[category]) {
        for (const supplier in mrLines[category][subCategory]) {
          const items = mrLines[category][subCategory][supplier];

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
    }

    return allItemsReviewed && hasRejectedOrClarified;
  }

  function allItemsApproved() {
    let allReviewed = true;
    let allApproved = true;

    for (const category in mrLines) {
      for (const subCategory in mrLines[category]) {
        for (const supplier in mrLines[category][subCategory]) {
          const items = mrLines[category][subCategory][supplier];

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
    }

    return allReviewed && allApproved;
  }

  function allItemsHaveSupplierQuotations() {
    // Get total count of items
    let totalItems = 0;
    for (const category in mrLines) {
      for (const subCategory in mrLines[category]) {
        for (const supplier in mrLines[category][subCategory]) {
          totalItems += mrLines[category][subCategory][supplier].length;
        }
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
        for (const supplier in mrLines[category][subCategory]) {
          const items = mrLines[category][subCategory][supplier];

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
        for (const supplier in mrLines[category][subCategory]) {
          const items = mrLines[category][subCategory][supplier];

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
    }

    return allReviewed && allApproved;
  }

  // Check if any items have rejected suppliers (for procurement stage)
  function hasAnyRejectedSuppliers() {
    if (isCheckingSupplierApprovals) return false;

    for (const category in mrLines) {
      for (const subCategory in mrLines[category]) {
        for (const supplier in mrLines[category][subCategory]) {
          const items = mrLines[category][subCategory][supplier];

          for (const item of items) {
            const status = supplierApprovalStatus[item.id];

            if (status === "rejected") {
              return true;
            }
          }
        }
      }
    }

    return false;
  }

  // Updated: Check if all suppliers have LPO with invoices AND signed files
  function allSuppliersHaveLpoWithInvoicesAndSignedFiles() {
    if (isCheckingLpoInvoices) return false;

    // Get unique supplier IDs
    const uniqueSupplierIds = new Set<number>();

    for (const category in mrLines) {
      for (const subCategory in mrLines[category]) {
        for (const supplier in mrLines[category][subCategory]) {
          const items = mrLines[category][subCategory][supplier];
          if (items.length > 0 && items[0].approved_supplier_id) {
            uniqueSupplierIds.add(items[0].approved_supplier_id);
          }
        }
      }
    }

    // Check if all suppliers have LPO with invoices AND signed files
    if (uniqueSupplierIds.size === 0) return false;

    for (const supplierId of uniqueSupplierIds) {
      const status = lpoInvoiceStatus[supplierId];

      // If supplier doesn't have LPO, invoice, OR signed file, return false
      if (
        !status ||
        !status.hasLpo ||
        !status.hasInvoice ||
        !status.hasSignedFile
      ) {
        return false;
      }
    }

    return true;
  }

  // Helper function to get all items from a subcategory (flattened from all suppliers)
  function getAllItemsInSubCategory(subCategoryData: {
    [supplier: string]: MrLine[];
  }): MrLine[] {
    const allItems: MrLine[] = [];
    for (const supplier in subCategoryData) {
      allItems.push(...subCategoryData[supplier]);
    }
    return allItems;
  }

  // Add this new useEffect to check payment statuses
  useEffect(() => {
    async function checkPaymentStatuses() {
      if (mrHeader.progress_id !== 14) {
        setIsCheckingPaymentStatus(false);
        return;
      }

      setIsCheckingPaymentStatus(true);
      const statusMap: {
        [supplierId: number]: "approved" | "rejected" | "pending";
      } = {};

      try {
        // Get unique suppliers with their IDs
        const uniqueSuppliers = new Map<number, string>();

        for (const category in mrLines) {
          for (const subCategory in mrLines[category]) {
            for (const supplier in mrLines[category][subCategory]) {
              const items = mrLines[category][subCategory][supplier];
              if (items.length > 0) {
                const supplierId = items[0].approved_supplier_id;
                if (supplierId) {
                  uniqueSuppliers.set(supplierId, supplier);
                }
              }
            }
          }
        }

        // Check each supplier for payment status
        const checkPromises = Array.from(uniqueSuppliers.keys()).map(
          async (supplierId) => {
            try {
              const response = await fetch(
                `${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo/getLPOByMrHeaderID`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    mr_header_id: mrHeader.id,
                    supplier_id: supplierId,
                  }),
                }
              );

              if (response.ok) {
                const data = await response.json();

                if (data.success && data.data && data.data.length > 0) {
                  const lpo = data.data[0];
                  const paymentStatus = lpo.payment_status;

                  if (!paymentStatus) {
                    statusMap[supplierId] = "pending";
                  } else if (paymentStatus.toLowerCase() === "approved") {
                    statusMap[supplierId] = "approved";
                  } else if (paymentStatus.toLowerCase() === "rejected") {
                    statusMap[supplierId] = "rejected";
                  } else {
                    statusMap[supplierId] = "pending";
                  }
                } else {
                  statusMap[supplierId] = "pending";
                }
              } else {
                statusMap[supplierId] = "pending";
              }
            } catch (error) {
              console.error(
                `Error checking payment status for supplier ${supplierId}:`,
                error
              );
              statusMap[supplierId] = "pending";
            }
          }
        );

        await Promise.all(checkPromises);
        setLpoPaymentStatus(statusMap);
      } catch (error) {
        console.error("Error checking payment statuses:", error);
      } finally {
        setIsCheckingPaymentStatus(false);
      }
    }

    checkPaymentStatuses();
  }, [mrLines, mrHeader.progress_id, mrHeader.id]);

  // Add this new function to check if all LPOs have been reviewed
  function allLposHavePaymentStatus() {
    if (isCheckingPaymentStatus) return false;

    // Get unique supplier IDs
    const uniqueSupplierIds = new Set<number>();

    for (const category in mrLines) {
      for (const subCategory in mrLines[category]) {
        for (const supplier in mrLines[category][subCategory]) {
          const items = mrLines[category][subCategory][supplier];
          if (items.length > 0 && items[0].approved_supplier_id) {
            uniqueSupplierIds.add(items[0].approved_supplier_id);
          }
        }
      }
    }

    // Check if all suppliers have a payment status (approved or rejected)
    if (uniqueSupplierIds.size === 0) return false;

    for (const supplierId of uniqueSupplierIds) {
      const status = lpoPaymentStatus[supplierId];

      // If supplier doesn't have a status or is still pending, return false
      if (!status || status === "pending") {
        return false;
      }
    }

    return true;
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
        {mrHeader.progress_id >= 12 && (
          <div
            style={{
              display: "flex",
              gap: "10px",
            }}
          >
            <Button
              componentType={"button"}
              bgColor={showBySupplier ? "black" : "transparent"}
              borderColor={"black"}
              textColor={showBySupplier ? "white" : "black"}
              style={{
                padding: "7px 20px",
                borderRadius: "25px",
              }}
              onClick={() => {
                setShowBySupplier(true);
                setShowByItem(false);
              }}
            >
              SHOW BY SUPPLIER
            </Button>
            <Button
              componentType={"button"}
              bgColor={showByItem ? "black" : "transparent"}
              borderColor={"black"}
              textColor={showByItem ? "white" : "black"}
              style={{
                padding: "7px 20px",
                borderRadius: "25px",
              }}
              onClick={() => {
                setShowByItem(true);
                setShowBySupplier(false);
              }}
            >
              SHOW BY ITEM
            </Button>
          </div>
        )}

        {/* Only show category tabs when in item view */}
        {showByItem && (
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
                {categories.map((category) => (
                  <button
                    key={category}
                    className={`item ${
                      activeCategory === category ? "active" : ""
                    }`}
                    onClick={() => setActiveCategory(category)}
                    style={{ textTransform: "uppercase" }}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {(mrHeader.progress_id === 1 || mrHeader.progress_id === 5) &&
          userInfo?.departmentID === mrHeader.department_id &&
          showByItem && (
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

      {/* Show by Item View - now includes supplier grouping */}
      {showByItem &&
        Object.entries(subCategories).map(function (
          [subCategory, suppliers],
          index
        ) {
          const allItems = getAllItemsInSubCategory(suppliers);
          const firstItem = allItems[0];

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
                  userInfo?.departmentID === mrHeader.department_id &&
                  firstItem && (
                    <div className="right">
                      <DeleteMrSubCategoryButton
                        items={allItems}
                        category={activeCategory}
                        subCategory={subCategory}
                      >
                        DELETE
                      </DeleteMrSubCategoryButton>

                      <RenameMrSubCategoryButton
                        items={allItems}
                        categoryID={String(firstItem.material_category_id)}
                        subCategoryID={String(
                          firstItem.material_subcategory_id
                        )}
                      >
                        RENAME
                      </RenameMrSubCategoryButton>
                    </div>
                  )}
              </div>

              <br />
              <br />

              {/* Iterate through each supplier within the subcategory */}
              {Object.entries(suppliers).map(
                ([supplier, items], supplierIndex) => (
                  <div key={supplier} style={{ marginBottom: "2rem" }}>
                    <table className="items-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>DESCRIPTION</th>
                          <th>QUANTITY</th>
                          <th>UNIT</th>
                          <th>BILL OF QUANTITY REFERENCE</th>
                          <th>NOTES</th>
                          {((mrHeader.progress_id === 5 &&
                            (userInfo?.departmentID ===
                              mrHeader.department_id ||
                              userInfo?.departmentID === 8)) ||
                            (mrHeader.progress_id === 3 &&
                              userInfo?.departmentID ===
                                mrHeader.department_id)) && (
                            <th>APPROVAL STATUS</th>
                          )}
                          {(mrHeader.progress_id === 1 ||
                            mrHeader.progress_id === 5) &&
                            userInfo?.departmentID ===
                              mrHeader.department_id && <th>ACTIONS</th>}
                          {mrHeader.progress_id === 3 &&
                            userInfo?.departmentID === 8 && <th>ACTIONS</th>}
                          {(mrHeader.progress_id >= 7 ||
                            userInfo?.departmentID === 9 ||
                            userInfo?.departmentID === 8 ||
                            userInfo?.departmentID === 10) && (
                            <th>SUPPLIER & QUOTATION</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {Array.isArray(items) &&
                          items.map(function (item, itemIndex) {
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

                                {(((mrHeader.progress_id === 5 ||
                                  mrHeader.progress_id === 3) &&
                                  userInfo?.departmentID ===
                                    mrHeader.department_id) ||
                                  ((mrHeader.progress_id === 5 ||
                                    mrHeader.progress_id === 3) &&
                                    userInfo?.departmentID === 8)) && (
                                  <td>
                                    <div
                                      style={{ display: "flex", gap: "10px" }}
                                    >
                                      <InitialApprovalMrItemButton
                                        item={item}
                                        progressID={mrHeader.progress_id}
                                      />
                                    </div>
                                  </td>
                                )}

                                {(mrHeader.progress_id === 1 ||
                                  mrHeader.progress_id === 5) &&
                                  userInfo?.departmentID ===
                                    mrHeader.department_id && (
                                    <td>
                                      <div
                                        style={{
                                          display: "flex",
                                          gap: "10px",
                                        }}
                                      >
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
                                              borderColor={
                                                "rgba(223, 223, 223, 1)"
                                              }
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
                                              borderColor={
                                                "rgba(223, 223, 223, 1)"
                                              }
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

                                {(mrHeader.progress_id === 7 ||
                                  mrHeader.progress_id === 11 ||
                                  mrHeader.progress_id === 10) &&
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
                                          mrHeader={mrHeader}
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

                                {((mrHeader.progress_id >= 12 &&
                                  userInfo?.departmentID === 9) ||
                                  userInfo?.departmentID === 10) && (
                                  <td>
                                    <div
                                      style={{
                                        display: "flex",
                                        gap: "10px",
                                        alignItems: "center",
                                      }}
                                    >
                                      {item.approved_supplier_name}{" "}
                                      <SupplierDetailsPopUp
                                        item={item}
                                        style={{
                                          padding: "7px 7px",
                                          backgroundColor:
                                            "rgba(239, 239, 239, 1)",
                                          borderColor: "rgba(223, 223, 223, 1)",
                                        }}
                                      >
                                        <img
                                          src={externalLinkIcon}
                                          alt="external link icon"
                                        />
                                      </SupplierDetailsPopUp>
                                    </div>
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>

                    <br />
                  </div>
                )
              )}

              {(mrHeader.progress_id === 1 || mrHeader.progress_id === 5) &&
                userInfo?.departmentID === mrHeader.department_id &&
                firstItem && (
                  <AddMrItemButton
                    projectID={mrHeader.project_id}
                    mrHeaderID={mrHeader.id}
                    bgColor="rgba(239, 239, 239, 1)"
                    borderColor="rgba(239, 239, 239, 1)"
                    textColor="black"
                    full
                    autoCategoryID={String(firstItem.material_category_id)}
                    autoSubCategoryID={String(
                      firstItem.material_subcategory_id
                    )}
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

      {/* Show by Supplier View - No tabs, all suppliers in a list */}
      {showBySupplier &&
        Object.entries(mrLinesBySupplier).map(([supplier, items], index) => (
          <div key={supplier} className="subcategory-section">
            <div className="subcategory-header">
              <div style={{ display: "flex", gap: "10px" }}>
                <h2
                  style={{
                    textTransform: "uppercase",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  {supplier}
                </h2>

                <SupplierDetailsPopUp
                  item={items[0]}
                  style={{ padding: "0px", border: "none" }}
                >
                  <img
                    src={externalLinkIcon}
                    alt="external link"
                    style={{ width: "12px" }}
                  />
                </SupplierDetailsPopUp>
              </div>

              <div className="right" style={{ display: "flex", gap: "20px" }}>
                {((mrHeader.progress_id >= 12 &&
                  userInfo?.departmentID === 9) ||
                  userInfo?.departmentID === 10) && (
                  <IssueLPOButton
                    mrHeader={mrHeader}
                    mrLines={items}
                    bgColor="black"
                    borderColor="black"
                    textColor="white"
                    style={{
                      padding: "7px 20px",
                      borderRadius: "25px",
                    }}
                  >
                    Issue LPO
                  </IssueLPOButton>
                )}

                {userInfo?.departmentID === 10 &&
                  mrHeader.progress_id === 14 && (
                    <PaymentMrItemButton
                      mrHeaderId={mrHeader.id}
                      supplierId={items[0].approved_supplier_id}
                    />
                  )}
              </div>
            </div>

            <br />
            <br />

            <table className="items-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>CATEGORY</th>
                  <th>SUB CATEGORY</th>
                  <th>DESCRIPTION</th>
                  <th>NOTES</th>
                  <th>BILL OF QUANTITY REFERENCE</th>
                  <th>QUANTITY</th>
                  <th>UNIT PRICE</th>
                  <th>TOTAL PRICE</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: MrLine, itemIndex: number) => (
                  <tr key={item.id}>
                    <td>{itemIndex + 1}</td>
                    <td>{item.material_category}</td>
                    <td>{item.material_subcategory}</td>
                    <td>{item.material_description}</td>
                    <td>
                      <NotesPopUp item={item} />
                    </td>
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
                      {item.quantity} {item.unit}
                    </td>
                    <td>{item.approved_unit_price || "-"}</td>
                    <td>{item.approved_total_price || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <br />
            <br />
            <br />
            <br />
            <br />
          </div>
        ))}

      {(mrHeader.progress_id === 1 || mrHeader.progress_id === 5) &&
        userInfo?.departmentID === mrHeader.department_id &&
        showByItem && (
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
        !hasAnyRejectedSuppliers() &&
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
              mrLines={mrLines}
              mrHeaderID={mrHeader.id}
              bgColor="white"
              borderColor="white"
              textColor="black"
            >
              SUBMIT FOR LPO
            </SubmitMrForLPO>
          </div>
        )}

      {allSuppliersHaveLpoWithInvoicesAndSignedFiles() &&
        userInfo?.departmentID === 9 &&
        mrHeader.progress_id === 12 && (
          <div className="bottom-nav">
            <SubmitMrForPaymentButton mrHeaderID={mrHeader.id}>
              SUBMIT FOR PAYMENT
            </SubmitMrForPaymentButton>
          </div>
        )}

      {allLposHavePaymentStatus() &&
        userInfo?.departmentID === 10 &&
        mrHeader.progress_id === 14 && (
          <div className="bottom-nav">
            <SubmitMrForAwaitingDeliveryButton mrHeaderID={mrHeader.id}>
              SUBMIT FOR AWAITING DELIVERY
            </SubmitMrForAwaitingDeliveryButton>
          </div>
        )}
    </>
  );
}
