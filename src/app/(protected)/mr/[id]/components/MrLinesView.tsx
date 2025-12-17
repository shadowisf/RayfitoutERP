"use client";

import { useState, useEffect } from "react";
import AddMrItemButton from "./department/_AddMrItemButton";
import { MrLine } from "../types/mrLine";
import EditMrItemButton from "./department/_EditMrItemButton";
import DeleteMrItemButton from "./department/_DeleteMrItemButton";
import RenameMrSubCategoryButton from "./department/_RenameMrSubCategoryButton";
import DeleteMrSubCategoryButton from "./department/_DeleteMrSubCategoryButton";
import BoqReferencePopUp from "./BoqReferencePopUp";
import SubmitForInitialApprovalButton from "./department/_SubmitForInitialApprovalButton";
import { MrHeader } from "../types/mrHeader";
import { useAuth } from "@/app/context/AuthContext";
import InitialApprovalButtons from "./manager/_InitialApprovalButtons";
import SubmitForResubmissionButton from "./manager/_SubmitForInitialResubmissionButton";
import SubmitForQuotationsButton from "./manager/_SubmitForQuotationsButton";
import SupplierAndQuotationButton from "./procurement/_SupplierAndQuotationButton";
import SubmitForPricingApprovalButton from "./procurement/_SubmitForPriceApprovalButton";
import NotesPopUp from "./NotesPopUp";
import PriceApprovalButton from "./manager/_PriceApprovalButton";
import SubmitForPricingResubmissionButton from "./manager/_SubmitForPriceResubmissionButton";
import SubmitForLPO from "./manager/_SubmitForLPOButton";
import Button from "@/app/components/Button";
import SupplierDetailsPopUp from "./SupplierDetailsPopUp";
import IssueLPOButton from "./procurement/_IssueLPOButton";
import SubmitForPaymentButton from "./procurement/_SubmitForPaymentButton";
import PaymentButtons from "./finance/_PaymentButtons";
import SubmitForDeliveryButton from "./finance/_SubmitForDeliveryButton";
import CreateGRNButton from "./storekeeper/_CreateGRNButton";
import SubmitForQC from "./storekeeper/_SubmitForQCButton";
import QCCheckListButton from "./qualityControl/_QCCheckListButton";
import SubmitForStockEntryButton from "./qualityControl/_SubmitForStockEntry";

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

  const [supplierApprovalStatus, setSupplierApprovalStatus] = useState<{
    [itemId: number]: "approved" | "rejected" | "pending";
  }>({});
  const [isCheckingSupplierApprovals, setIsCheckingSupplierApprovals] =
    useState<boolean>(true);

  const [lpoInvoiceStatus, setLpoInvoiceStatus] = useState<{
    [supplierId: number]: {
      hasLpo: boolean;
      hasInvoice: boolean;
      hasSignedFile: boolean;
    };
  }>({});
  const [isCheckingLpoInvoices, setIsCheckingLpoInvoices] =
    useState<boolean>(true);

  const [mrLinesBySupplier, setMrLinesBySupplier] =
    useState<GroupedMrLinesBySupplier>({});

  const categories = Object.keys(mrLines);
  const subCategories = mrLines[activeCategory] || {};
  const suppliers = Object.keys(mrLinesBySupplier);

  const [lpoPaymentStatus, setLpoPaymentStatus] = useState<{
    [supplierId: number]: "approved" | "rejected" | "pending";
  }>({});
  const [isCheckingPaymentStatus, setIsCheckingPaymentStatus] =
    useState<boolean>(true);

  const [grnStatus, setGrnStatus] = useState<{
    [supplierId: number]: boolean;
  }>({});
  const [isCheckingGrn, setIsCheckingGrn] = useState<boolean>(true);

  const [qcStatus, setQcStatus] = useState<{
    [itemId: number]: "passed" | "failed" | "pending";
  }>({});
  const [isCheckingQc, setIsCheckingQc] = useState<boolean>(true);

  useEffect(
    function () {
      const categories = Object.keys(mrLines);
      if (categories.length > 0) {
        setActiveCategory(categories[0]);
      }
    },
    [mrLines]
  );

  useEffect(() => {
    const supplierGroups: GroupedMrLinesBySupplier = {};

    for (const category in mrLines) {
      for (const subCategory in mrLines[category]) {
        for (const supplier in mrLines[category][subCategory]) {
          const items = mrLines[category][subCategory][supplier];

          if (!supplierGroups[supplier]) {
            supplierGroups[supplier] = [];
          }

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
        const allItemIds: number[] = [];
        for (const category in mrLines) {
          for (const subCategory in mrLines[category]) {
            for (const supplier in mrLines[category][subCategory]) {
              const items = mrLines[category][subCategory][supplier];
              items.forEach((item) => allItemIds.push(item.id));
            }
          }
        }

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
        const allItemIds: number[] = [];
        for (const category in mrLines) {
          for (const subCategory in mrLines[category]) {
            for (const supplier in mrLines[category][subCategory]) {
              const items = mrLines[category][subCategory][supplier];
              items.forEach((item) => allItemIds.push(item.id));
            }
          }
        }

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
                const hasApproved = data.some(
                  (q: any) => q.approval_status === "Approved"
                );

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

  useEffect(() => {
    async function checkGrnStatuses() {
      if (mrHeader.progress_id !== 17) {
        setIsCheckingGrn(false);
        return;
      }

      setIsCheckingGrn(true);
      const statusMap: { [supplierId: number]: boolean } = {};

      try {
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

        const checkPromises = Array.from(uniqueSuppliers.keys()).map(
          async (supplierId) => {
            try {
              const lpoResponse = await fetch(
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

              if (lpoResponse.ok) {
                const lpoData = await lpoResponse.json();

                if (
                  lpoData.success &&
                  lpoData.data &&
                  lpoData.data.length > 0
                ) {
                  const lpo = lpoData.data[0];

                  const grnResponse = await fetch(
                    `${process.env.NEXT_PUBLIC_BASE_URL}/api/grn/getGRNDetailsByLPOID`,
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ lpo_id: lpo.id }),
                    }
                  );

                  if (grnResponse.ok) {
                    const grnData = await grnResponse.json();
                    statusMap[supplierId] = !!(
                      grnData.success &&
                      grnData.data &&
                      grnData.data.id
                    );
                  } else {
                    statusMap[supplierId] = false;
                  }
                } else {
                  statusMap[supplierId] = false;
                }
              } else {
                statusMap[supplierId] = false;
              }
            } catch (error) {
              console.error(
                `Error checking GRN for supplier ${supplierId}:`,
                error
              );
              statusMap[supplierId] = false;
            }
          }
        );

        await Promise.all(checkPromises);
        setGrnStatus(statusMap);
      } catch (error) {
        console.error("Error checking GRN statuses:", error);
      } finally {
        setIsCheckingGrn(false);
      }
    }

    checkGrnStatuses();
  }, [mrLines, mrHeader.progress_id, mrHeader.id]);

  // Check QC status for all items
  useEffect(() => {
    async function checkQcStatuses() {
      if (mrHeader.progress_id !== 21) {
        setIsCheckingQc(false);
        return;
      }

      setIsCheckingQc(true);
      const statusMap: {
        [itemId: number]: "passed" | "failed" | "pending";
      } = {};

      try {
        const allItems: MrLine[] = [];

        // Collect all items
        for (const category in mrLines) {
          for (const subCategory in mrLines[category]) {
            for (const supplier in mrLines[category][subCategory]) {
              const items = mrLines[category][subCategory][supplier];
              allItems.push(...items);
            }
          }
        }

        // Check QC status for each item
        const checkPromises = allItems.map(async (item) => {
          try {
            // First get the LPO
            const lpoResponse = await fetch(
              `${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo/getLPOByMrHeaderID`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  mr_header_id: mrHeader.id,
                  supplier_id: item.approved_supplier_id,
                }),
              }
            );

            if (lpoResponse.ok) {
              const lpoData = await lpoResponse.json();

              if (lpoData.success && lpoData.data && lpoData.data.length > 0) {
                const lpo = lpoData.data[0];

                // Get LPO details to find lpo_mr_line_id
                const lpoDetailsResponse = await fetch(
                  `${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo/getLPODetails`,
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ lpo_id: lpo.id }),
                  }
                );

                if (lpoDetailsResponse.ok) {
                  const lpoDetailsData = await lpoDetailsResponse.json();

                  if (
                    lpoDetailsData.success &&
                    lpoDetailsData.data &&
                    lpoDetailsData.data.lpo_mr_lines
                  ) {
                    const lpoLine = lpoDetailsData.data.lpo_mr_lines.find(
                      (line: any) => line.mr_line_id === item.id
                    );

                    if (lpoLine) {
                      // Check QC status
                      const qcResponse = await fetch(
                        `${process.env.NEXT_PUBLIC_BASE_URL}/api/qc/getQCByLPOMrLineID`,
                        {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            lpo_mr_line_id: lpoLine.id,
                          }),
                        }
                      );

                      if (qcResponse.ok) {
                        const qcData = await qcResponse.json();

                        if (qcData.success && qcData.data) {
                          statusMap[item.id] = qcData.data.qc_status;
                        } else {
                          statusMap[item.id] = "pending";
                        }
                      } else {
                        statusMap[item.id] = "pending";
                      }
                    } else {
                      statusMap[item.id] = "pending";
                    }
                  } else {
                    statusMap[item.id] = "pending";
                  }
                } else {
                  statusMap[item.id] = "pending";
                }
              } else {
                statusMap[item.id] = "pending";
              }
            } else {
              statusMap[item.id] = "pending";
            }
          } catch (error) {
            console.error(`Error checking QC for item ${item.id}:`, error);
            statusMap[item.id] = "pending";
          }
        });

        await Promise.all(checkPromises);
        setQcStatus(statusMap);
      } catch (error) {
        console.error("Error checking QC statuses:", error);
      } finally {
        setIsCheckingQc(false);
      }
    }

    checkQcStatuses();
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
    let hasRejected = false;
    let allItemsReviewed = true;

    for (const category in mrLines) {
      for (const subCategory in mrLines[category]) {
        for (const supplier in mrLines[category][subCategory]) {
          const items = mrLines[category][subCategory][supplier];

          for (const item of items) {
            const status = item.approval_status?.toLowerCase();

            if (status === "rejected") {
              hasRejected = true;
            }

            if (!status || status === "pending") {
              allItemsReviewed = false;
            }
          }
        }
      }
    }

    return allItemsReviewed && hasRejected;
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
    let totalItems = 0;
    for (const category in mrLines) {
      for (const subCategory in mrLines[category]) {
        for (const supplier in mrLines[category][subCategory]) {
          totalItems += mrLines[category][subCategory][supplier].length;
        }
      }
    }

    return (
      totalItems > 0 &&
      itemsWithQuotations.size === totalItems &&
      !isCheckingQuotations
    );
  }

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

  function allSuppliersHaveLpoWithInvoicesAndSignedFiles() {
    if (isCheckingLpoInvoices) return false;

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

    if (uniqueSupplierIds.size === 0) return false;

    for (const supplierId of uniqueSupplierIds) {
      const status = lpoInvoiceStatus[supplierId];

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

  function getAllItemsInSubCategory(subCategoryData: {
    [supplier: string]: MrLine[];
  }): MrLine[] {
    const allItems: MrLine[] = [];
    for (const supplier in subCategoryData) {
      allItems.push(...subCategoryData[supplier]);
    }
    return allItems;
  }

  function allLposHavePaymentStatus() {
    if (isCheckingPaymentStatus) return false;

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

    if (uniqueSupplierIds.size === 0) return false;

    for (const supplierId of uniqueSupplierIds) {
      const status = lpoPaymentStatus[supplierId];

      if (!status || status === "pending") {
        return false;
      }
    }

    return true;
  }

  function allSuppliersHaveGrn() {
    if (isCheckingGrn) return false;

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

    if (uniqueSupplierIds.size === 0) return false;

    for (const supplierId of uniqueSupplierIds) {
      const hasGrn = grnStatus[supplierId];

      if (!hasGrn) {
        return false;
      }
    }

    return true;
  }

  // Check if all items have passed QC
  function allItemsPassedQc() {
    if (isCheckingQc) return false;

    let totalItems = 0;
    let allPassed = true;
    let allChecked = true;

    for (const category in mrLines) {
      for (const subCategory in mrLines[category]) {
        for (const supplier in mrLines[category][subCategory]) {
          const items = mrLines[category][subCategory][supplier];

          for (const item of items) {
            totalItems++;
            const status = qcStatus[item.id];

            if (!status || status === "pending") {
              allChecked = false;
            }

            if (status !== "passed") {
              allPassed = false;
            }
          }
        }
      }
    }

    return totalItems > 0 && allChecked && allPassed;
  }

  function hasAnyRejectedItems() {
    for (const category in mrLines) {
      for (const subCategory in mrLines[category]) {
        for (const supplier in mrLines[category][subCategory]) {
          const items = mrLines[category][subCategory][supplier];

          for (const item of items) {
            const status = item.approval_status?.toLowerCase();

            if (status === "rejected") {
              return true;
            }
          }
        }
      }
    }

    return false;
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
          </div>
        )}
      </div>

      <br />
      <br />

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

              {/* SHOW BY ITEM */}
              {Object.entries(suppliers).map(
                ([supplier, items], supplierIndex) => (
                  <div key={supplier} style={{ marginBottom: "2rem" }}>
                    <table className="items-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>DESCRIPTION</th>
                          <th>QUANTITY</th>
                          <th>BOF REF.</th>
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
                          {mrHeader.progress_id >= 10 /* &&
                            [8, 9, 10, 11, 12].includes(
                              userInfo?.departmentID ?? 0
                            ) */ && <th>SUPPLIER & QUOTATION</th>}
                          {mrHeader.progress_id === 7 &&
                            userInfo?.departmentID === 9 && (
                              <th>SUPPLIER & QUOTATION</th>
                            )}
                          {userInfo?.departmentID === 12 &&
                            mrHeader.progress_id === 21 && (
                              <th>QUALITY CONTROL</th>
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
                                <td>
                                  {item.quantity} {item.unit}
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
                                      <InitialApprovalButtons
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
                                        <SupplierAndQuotationButton
                                          mrHeader={mrHeader}
                                          mrLineID={item.id}
                                          bgColor="black"
                                          textColor="white"
                                          borderColor="black"
                                          style={{
                                            padding: "7px 25px",
                                            borderRadius: "25px",
                                          }}
                                        >
                                          Add Suppliers & Quotation
                                        </SupplierAndQuotationButton>
                                      </div>
                                    </td>
                                  )}

                                {[10, 11].includes(mrHeader.progress_id) &&
                                  userInfo?.departmentID === 8 && (
                                    <td>
                                      <PriceApprovalButton
                                        progressID={mrHeader.progress_id}
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

                                {mrHeader.progress_id >= 12 && (
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

                                {userInfo?.departmentID === 12 &&
                                  mrHeader.progress_id === 21 && (
                                    <td>
                                      <QCCheckListButton
                                        item={item}
                                        mrHeader={mrHeader}
                                        progressID={mrHeader.progress_id}
                                      />
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
                  userInfo?.departmentID === 10 ||
                  userInfo?.departmentID === 11 ||
                  userInfo?.departmentID === 12) && (
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
                    Issue LPO +
                  </IssueLPOButton>
                )}

                {userInfo?.departmentID === 10 &&
                  mrHeader.progress_id === 14 && (
                    <PaymentButtons
                      mrHeaderId={mrHeader.id}
                      supplierId={items[0].approved_supplier_id}
                    />
                  )}

                {mrHeader.progress_id >= 17 && (
                  <CreateGRNButton
                    mrHeader={mrHeader}
                    mrLines={items}
                    bgColor="black"
                    borderColor="black"
                    textColor="white"
                    style={{ padding: "5px 20px", borderRadius: "25px" }}
                  >
                    Add GRN +
                  </CreateGRNButton>
                )}
              </div>
            </div>

            <br />
            <br />

            {/* SHOW BY SUPPLIER */}
            <table className="items-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>CATEGORY</th>
                  <th>SUBCATEGORY</th>
                  <th>DESCRIPTION</th>
                  <th>QUANTITY</th>
                  <th>BOQ REF.</th>
                  <th>NOTES</th>
                  {mrHeader.progress_id >= 12 && <th>SUPPLIER & QUOTATION</th>}
                  {userInfo?.departmentID === 12 &&
                    mrHeader.progress_id === 21 && <th>QUALITY CONTROL</th>}
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
                      {item.quantity} {item.unit}
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
                      <NotesPopUp item={item} />
                    </td>

                    {mrHeader.progress_id >= 12 && (
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
                              backgroundColor: "rgba(239, 239, 239, 1)",
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

                    {userInfo?.departmentID === 12 &&
                      mrHeader.progress_id === 21 && (
                        <td>
                          <QCCheckListButton
                            item={item}
                            mrHeader={mrHeader}
                            progressID={mrHeader.progress_id}
                          />
                        </td>
                      )}
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
        userInfo?.departmentID === mrHeader.department_id &&
        !hasAnyRejectedItems() && ( // Add this check
          <div className="bottom-nav">
            <SubmitForInitialApprovalButton
              mrHeaderID={mrHeader.id}
              bgColor="white"
              borderColor="white"
              textColor="black"
            >
              SUBMIT FOR INITIAL APPROVAL
            </SubmitForInitialApprovalButton>
          </div>
        )}

      {hasRejectedItems() &&
        userInfo?.departmentID === 8 &&
        mrHeader.progress_id === 3 && (
          <div className="bottom-nav">
            <SubmitForResubmissionButton
              mrHeaderID={mrHeader.id}
              bgColor="white"
              borderColor="white"
              textColor="black"
            >
              RETURN FOR MATERIAL CORRECTIONS
            </SubmitForResubmissionButton>
          </div>
        )}

      {allItemsApproved() &&
        userInfo?.departmentID === 8 &&
        mrHeader.progress_id === 3 && (
          <div className="bottom-nav">
            <SubmitForQuotationsButton
              mrHeaderID={mrHeader.id}
              bgColor="white"
              borderColor="white"
              textColor="black"
            >
              SUBMIT FOR QUOTATIONS
            </SubmitForQuotationsButton>
          </div>
        )}

      {allItemsHaveSupplierQuotations() &&
        !hasAnyRejectedSuppliers() &&
        userInfo?.departmentID === 9 &&
        (mrHeader.progress_id === 7 || mrHeader.progress_id === 11) && (
          <div className="bottom-nav">
            <SubmitForPricingApprovalButton
              mrHeaderID={mrHeader.id}
              bgColor="white"
              borderColor="white"
              textColor="black"
            >
              SUBMIT FOR PRICING APPROVAL
            </SubmitForPricingApprovalButton>
          </div>
        )}

      {hasRejectedSuppliers() &&
        userInfo?.departmentID === 8 &&
        mrHeader.progress_id === 10 && (
          <div className="bottom-nav">
            <SubmitForPricingResubmissionButton
              mrHeaderID={mrHeader.id}
              bgColor="white"
              borderColor="white"
              textColor="black"
            >
              RETURN FOR PRICING CORRECTIONS
            </SubmitForPricingResubmissionButton>
          </div>
        )}

      {allSuppliersApproved() &&
        userInfo?.departmentID === 8 &&
        mrHeader.progress_id === 10 && (
          <div className="bottom-nav">
            <SubmitForLPO
              mrLines={mrLines}
              mrHeaderID={mrHeader.id}
              bgColor="white"
              borderColor="white"
              textColor="black"
            >
              SUBMIT FOR LOCAL PURCHASE ORDER
            </SubmitForLPO>
          </div>
        )}

      {allSuppliersHaveLpoWithInvoicesAndSignedFiles() &&
        userInfo?.departmentID === 9 &&
        mrHeader.progress_id === 12 && (
          <div className="bottom-nav">
            <SubmitForPaymentButton mrHeaderID={mrHeader.id}>
              SUBMIT FOR PAYMENT
            </SubmitForPaymentButton>
          </div>
        )}

      {allLposHavePaymentStatus() &&
        userInfo?.departmentID === 10 &&
        mrHeader.progress_id === 14 && (
          <div className="bottom-nav">
            <SubmitForDeliveryButton mrHeaderID={mrHeader.id}>
              SUBMIT FOR DELIVERY
            </SubmitForDeliveryButton>
          </div>
        )}

      {allSuppliersHaveGrn() &&
        userInfo?.departmentID === 11 &&
        mrHeader.progress_id === 17 && (
          <div className="bottom-nav">
            <SubmitForQC mrHeaderID={mrHeader.id}>
              SUBMIT FOR QUALITY CONTROL
            </SubmitForQC>
          </div>
        )}

      {allItemsPassedQc() &&
        userInfo?.departmentID === 12 &&
        mrHeader.progress_id === 21 && (
          <div className="bottom-nav">
            <SubmitForStockEntryButton mrHeaderID={mrHeader.id}>
              SUBMIT FOR STOCK ENTRY
            </SubmitForStockEntryButton>
          </div>
        )}
    </>
  );
}
