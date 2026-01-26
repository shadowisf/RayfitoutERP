"use client";

import { useState, useEffect, useRef, use } from "react";
import AddMrItemButton from "./department/_AddMrItemButton";
import { MrLine } from "../types/mrLine";
import EditMrItemButton from "./department/_EditMrItemButton";
import DeleteMrItemButton from "./department/_DeleteMrItemButton";
import RenameMrSubCategoryButton from "./department/_RenameMrSubCategoryButton";
import DeleteMrSubCategoryButton from "./department/_DeleteMrSubCategoryButton";
import BoqReferencePopUp from "./BoqReferencePopUp";
import SubmitForInitialApprovalButton from "./quantitySurveyor/_SubmitForInitialApprovalButton";
import { MrHeader } from "../types/mrHeader";
import { useAuth } from "@/app/context/AuthContext";
import InitialApprovalButtons from "./manager/_InitialApprovalButtons";
import SubmitForResubmissionButton from "./manager/_SubmitForInitialResubmissionButton";
import SubmitForQuotationsButton from "./manager/_SubmitForQuotationsButton";
import SupplierAndQuotationButton from "./procurement/_SupplierAndQuotationButton";
import SubmitForPricingApprovalButton from "./quantitySurveyor/_SubmitForPriceApprovalButton";
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
import QCCheckListButton from "./qualityControl/_QCCheckListButton";
import SubmitForStockEntryButton from "./qualityControl/_SubmitForStockEntry";
import AddToInventoryButton from "./storekeeper/_AddStockButton";
import CompleteMaterialRequestButton from "./storekeeper/_CompleteMaterialRequestButton";
import SubmitForProcurementResolutionButton from "./qualityControl/_SubmitForProcurementResolution";
import QCRecheckButton from "./procurement/_QCRecheckButton";
import ResolutionButton from "./procurement/_AddResolutionButton";
import SubmitForLPOResubmissionButton from "./finance/_SubmitForLPOResubmission";
import SubmitForLPOResubmissionGRNFailButton from "./storekeeper/_SubmitForLPOResubmissionGRNFail";
import InfoPopUpButton from "@/app/components/_InfoPopUpButton";
import SubmitForQSApprovalButton from "./department/_SubmitForQSApprovalButton";
import QSInitialApprovalButtons from "./quantitySurveyor/_InitialApprovalButton";
import SubmitForQSPricingApprovalButton from "./procurement/_SubmitForQSPricingApprovalButton";
import CheckPricesButton from "./quantitySurveyor/_CheckPricesButton";
import CancelMaterialRequestButton from "./_CancelMaterialRequest";

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

  const totalInvoicePortalRef = useRef<HTMLDivElement>(null);

  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [expandedDescriptions, setExpandedDescriptions] = useState<number[]>(
    [],
  );

  const [showBySupplier, setShowBySupplier] = useState<boolean>(
    mrHeader.progress_id >= 12,
  );
  const [showByItem, setShowByItem] = useState<boolean>(
    mrHeader.progress_id < 12,
  );
  const [itemsWithQuotations, setItemsWithQuotations] = useState<Set<number>>(
    new Set(),
  );
  const [isCheckingQuotations, setIsCheckingQuotations] =
    useState<boolean>(true);

  const [supplierApprovalStatus, setSupplierApprovalStatus] = useState<{
    [itemId: number]: "approved" | "rejected" | "pending";
  }>({});
  const [isCheckingSupplierApprovals, setIsCheckingSupplierApprovals] =
    useState<boolean>(true);
  const [supplierQSApprovalStatus, setSupplierQSApprovalStatus] = useState<{
    [itemId: number]: "approved" | "rejected" | "pending";
  }>({});
  const [isCheckingSupplierQSApprovals, setIsCheckingSupplierQSApprovals] =
    useState<boolean>(true);

  const [lpoInvoiceStatus, setLpoInvoiceStatus] = useState<{
    [supplierId: number]: {
      hasLpo: boolean;
      hasInvoice: boolean;
      hasSignedFile: boolean;
      supplierType: string;
    };
  }>({});
  const [isCheckingLpoInvoices, setIsCheckingLpoInvoices] =
    useState<boolean>(true);

  const [mrLinesBySupplier, setMrLinesBySupplier] =
    useState<GroupedMrLinesBySupplier>({});

  const [regroupedMrLines, setRegroupedMrLines] = useState<GroupedMrLines>({});

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

  const [inventoryStatus, setInventoryStatus] = useState<{
    [itemId: number]: boolean;
  }>({});
  const [isCheckingInventory, setIsCheckingInventory] = useState<boolean>(true);
  // Add this state near the other state declarations at the top
  const [grnQuantityMismatch, setGrnQuantityMismatch] = useState<{
    [supplierId: number]: boolean;
  }>({});
  const [isCheckingGrnQuantity, setIsCheckingGrnQuantity] =
    useState<boolean>(true);
  const [totalInvoiceAmount, setTotalInvoiceAmount] = useState(0);
  const [mrLinePrices, setMrLinePrices] = useState<{ [key: number]: number }>(
    {},
  );

  // Regroup mrLines based on progress_id
  useEffect(() => {
    // For progress_id < 12, regroup mrLines to combine all suppliers under one group
    if (mrHeader.progress_id >= 10) {
      const regrouped: GroupedMrLines = {};

      for (const category in mrLines) {
        regrouped[category] = {};

        for (const subCategory in mrLines[category]) {
          regrouped[category][subCategory] = {
            "All Items": [], // Single group for all items
          };

          // Collect all items from all suppliers into one array
          for (const supplier in mrLines[category][subCategory]) {
            const items = mrLines[category][subCategory][supplier];
            regrouped[category][subCategory]["All Items"].push(...items);
          }
        }
      }

      setRegroupedMrLines(regrouped);
    } else {
      // For progress_id >= 12, use original grouping
      setRegroupedMrLines(mrLines);
    }
  }, [mrLines, mrHeader.progress_id]);

  const categories = Object.keys(regroupedMrLines);
  const subCategories =
    activeCategory === "ALL"
      ? regroupedMrLines[categories[0]] || {}
      : regroupedMrLines[activeCategory] || {};

  // Add this useEffect after the other useEffect hooks
  useEffect(() => {
    async function checkGrnQuantityMismatch() {
      if (mrHeader.progress_id !== 17) {
        setIsCheckingGrnQuantity(false);
        return;
      }

      setIsCheckingGrnQuantity(true);
      const mismatchMap: { [supplierId: number]: boolean } = {};

      try {
        const uniqueSuppliers = new Map<number, MrLine[]>();

        // Collect unique suppliers along with their items
        for (const category in mrLines) {
          for (const subCategory in mrLines[category]) {
            for (const supplier in mrLines[category][subCategory]) {
              const items = mrLines[category][subCategory][supplier];
              if (items.length > 0) {
                const supplierId = items[0].approved_supplier_id;
                if (supplierId) {
                  if (!uniqueSuppliers.has(supplierId)) {
                    uniqueSuppliers.set(supplierId, []);
                  }
                  uniqueSuppliers.get(supplierId)?.push(...items);
                }
              }
            }
          }
        }

        const checkPromises = Array.from(uniqueSuppliers.entries()).map(
          async ([supplierId, supplierItems]) => {
            try {
              // Get LPO
              const lpoResponse = await fetch(
                `${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo/getLPOByMrHeaderID`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    mr_header_id: mrHeader.id,
                    supplier_id: supplierId,
                  }),
                },
              );

              if (lpoResponse.ok) {
                const lpoData = await lpoResponse.json();

                if (
                  lpoData.success &&
                  lpoData.data &&
                  lpoData.data.length > 0
                ) {
                  const lpo = lpoData.data[0];

                  // Get GRN details
                  const grnResponse = await fetch(
                    `${process.env.NEXT_PUBLIC_BASE_URL}/api/grn/getGRNDetailsByLPOID`,
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ lpo_id: lpo.id }),
                    },
                  );

                  if (grnResponse.ok) {
                    const grnData = await grnResponse.json();

                    if (grnData.success && grnData.data && grnData.data.id) {
                      // Get LPO details to get the mr_line_id mapping
                      const lpoDetailsResponse = await fetch(
                        `${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo/getLPODetails`,
                        {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ lpo_id: lpo.id }),
                        },
                      );

                      if (lpoDetailsResponse.ok) {
                        const lpoDetailsData = await lpoDetailsResponse.json();

                        if (
                          lpoDetailsData.success &&
                          lpoDetailsData.data &&
                          lpoDetailsData.data.lpo_mr_lines
                        ) {
                          // Check if grn_lines exists and is an array (FIX: changed from grn_mr_lines to grn_lines)
                          if (
                            !grnData.data.grn_lines ||
                            !Array.isArray(grnData.data.grn_lines)
                          ) {
                            console.log(
                              `No GRN lines found for supplier ${supplierId}`,
                            );
                            mismatchMap[supplierId] = false;
                            return;
                          }

                          // Now check for mismatches (FIX: changed from grn_mr_lines to grn_lines)
                          const hasMismatch = grnData.data.grn_lines.some(
                            (grnLine: any) => {
                              // Find the lpo_mr_line
                              const lpoMrLine =
                                lpoDetailsData.data.lpo_mr_lines.find(
                                  (line: any) =>
                                    line.id === grnLine.lpo_mr_line_id,
                                );

                              if (lpoMrLine) {
                                // Find the corresponding mr_line from supplierItems
                                const correspondingMrLine = supplierItems.find(
                                  (item) => item.id === lpoMrLine.mr_line_id,
                                );

                                if (correspondingMrLine) {
                                  const orderedQty =
                                    parseFloat(
                                      String(correspondingMrLine.quantity),
                                    ) || 0;
                                  const receivedQty =
                                    parseFloat(
                                      String(grnLine.received_quantity),
                                    ) || 0;

                                  const isMismatch = orderedQty !== receivedQty;

                                  console.log(
                                    `Supplier ${supplierId}, Item ${correspondingMrLine.id}: Ordered=${orderedQty}, Received=${receivedQty}, Mismatch=${isMismatch}`,
                                  );

                                  return isMismatch;
                                }
                              }
                              return false;
                            },
                          );

                          mismatchMap[supplierId] = hasMismatch;
                          console.log(
                            `Supplier ${supplierId} final mismatch: ${hasMismatch}`,
                          );
                        } else {
                          mismatchMap[supplierId] = false;
                        }
                      } else {
                        mismatchMap[supplierId] = false;
                      }
                    } else {
                      mismatchMap[supplierId] = false;
                    }
                  } else {
                    mismatchMap[supplierId] = false;
                  }
                } else {
                  mismatchMap[supplierId] = false;
                }
              } else {
                mismatchMap[supplierId] = false;
              }
            } catch (error) {
              console.error(
                `Error checking GRN quantity for supplier ${supplierId}:`,
                error,
              );
              mismatchMap[supplierId] = false;
            }
          },
        );

        await Promise.all(checkPromises);

        console.log("Final mismatchMap:", mismatchMap);

        setGrnQuantityMismatch(mismatchMap);
      } catch (error) {
        console.error("Error checking GRN quantity mismatches:", error);
      } finally {
        setIsCheckingGrnQuantity(false);
      }
    }

    checkGrnQuantityMismatch();
  }, [mrLines, mrHeader.progress_id, mrHeader.id]);

  // Add this function to check if any supplier has quantity mismatch
  function hasAnyGrnQuantityMismatch() {
    if (isCheckingGrnQuantity) return false;

    return Object.values(grnQuantityMismatch).some(
      (hasMismatch) => hasMismatch,
    );
  }

  useEffect(() => {
    const total = Object.values(mrLinePrices).reduce(
      (sum, price) => sum + price,
      0,
    );
    setTotalInvoiceAmount(total);
  }, [mrLinePrices]);

  const handleTotalPriceChange = (mrLineId: number, totalPrice: number) => {
    setMrLinePrices((prev) => ({
      ...prev,
      [mrLineId]: totalPrice,
    }));
  };

  useEffect(() => {
    const supplierGroups: GroupedMrLinesBySupplier = {};

    // For progress_id < 12, flatten all items first to remove supplier grouping
    if (mrHeader.progress_id < 12) {
      const allItems: MrLine[] = [];

      // Collect all items regardless of supplier grouping
      for (const category in mrLines) {
        for (const subCategory in mrLines[category]) {
          for (const supplier in mrLines[category][subCategory]) {
            const items = mrLines[category][subCategory][supplier];
            allItems.push(...items);
          }
        }
      }

      // Group all items under "All Items"
      supplierGroups["All Items"] = allItems;
    } else {
      // For progress_id >= 12, keep supplier grouping
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
    }

    setMrLinesBySupplier(supplierGroups);
  }, [mrLines, mrHeader.progress_id]);

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
              },
            );

            if (response.ok) {
              const data = await response.json();
              // Changed from >= 3 to >= 1
              if (data && Array.isArray(data) && data.length >= 1) {
                itemsWithQuotes.add(itemId);
              }
            }
          } catch (error) {
            console.error(
              `Error checking quotations for item ${itemId}:`,
              error,
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
              },
            );

            if (response.ok) {
              const data = await response.json();

              if (data && Array.isArray(data) && data.length > 0) {
                const hasApproved = data.some(
                  (q: any) => q.approval_status === "Approved",
                );

                const allRejected = data.every(
                  (q: any) => q.approval_status === "Rejected",
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
              error,
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
    async function checkSupplierQSApprovals() {
      if (mrHeader.progress_id !== 9 && mrHeader.progress_id !== 11) {
        setIsCheckingSupplierQSApprovals(false);
        return;
      }

      setIsCheckingSupplierQSApprovals(true);
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
              },
            );

            if (response.ok) {
              const data = await response.json();

              if (data && Array.isArray(data) && data.length > 0) {
                const hasApproved = data.some(
                  (q: any) => q.qs_approval_status === "Approved",
                );

                const allRejected = data.every(
                  (q: any) => q.qs_approval_status === "Rejected",
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
              `Error checking QS supplier approvals for item ${itemId}:`,
              error,
            );
            statusMap[itemId] = "pending";
          }
        });

        await Promise.all(checkPromises);
        setSupplierQSApprovalStatus(statusMap);
      } catch (error) {
        console.error("Error checking QS supplier approvals:", error);
      } finally {
        setIsCheckingSupplierQSApprovals(false);
      }
    }

    checkSupplierQSApprovals();
  }, [mrLines, mrHeader.progress_id]);

  useEffect(() => {
    async function checkLpoInvoices() {
      if (
        mrHeader.progress_id !== 12 &&
        mrHeader.progress_id !== 13 &&
        mrHeader.progress_id !== 16
      ) {
        setIsCheckingLpoInvoices(false);
        return;
      }

      setIsCheckingLpoInvoices(true);
      const statusMap: {
        [supplierId: number]: {
          hasLpo: boolean;
          hasInvoice: boolean;
          hasSignedFile: boolean;
          supplierType: string;
        };
      } = {};

      try {
        const uniqueSuppliers = new Map<
          number,
          { name: string; type: string }
        >();

        for (const category in mrLines) {
          for (const subCategory in mrLines[category]) {
            for (const supplier in mrLines[category][subCategory]) {
              const items = mrLines[category][subCategory][supplier];
              if (items.length > 0) {
                const supplierId = items[0].approved_supplier_id;
                const supplierType = items[0].approved_supplier_type || ""; // ✅ Get supplier type
                if (supplierId) {
                  uniqueSuppliers.set(supplierId, {
                    name: supplier,
                    type: supplierType,
                  });
                }
              }
            }
          }
        }

        const checkPromises = Array.from(uniqueSuppliers.entries()).map(
          async ([supplierId, supplierInfo]) => {
            // ✅ Changed to entries()
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
                },
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
                    supplierType: supplierInfo.type, // ✅ Add supplier type
                  };
                } else {
                  statusMap[supplierId] = {
                    hasLpo: false,
                    hasInvoice: false,
                    hasSignedFile: false,
                    supplierType: supplierInfo.type, // ✅ Add supplier type
                  };
                }
              } else {
                statusMap[supplierId] = {
                  hasLpo: false,
                  hasInvoice: false,
                  hasSignedFile: false,
                  supplierType: supplierInfo.type, // ✅ Add supplier type
                };
              }
            } catch (error) {
              console.error(
                `Error checking LPO for supplier ${supplierId}:`,
                error,
              );
              statusMap[supplierId] = {
                hasLpo: false,
                hasInvoice: false,
                hasSignedFile: false,
                supplierType: supplierInfo.type, // ✅ Add supplier type
              };
            }
          },
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
                },
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
                error,
              );
              statusMap[supplierId] = "pending";
            }
          },
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
                },
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
                    },
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
                error,
              );
              statusMap[supplierId] = false;
            }
          },
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

        for (const category in mrLines) {
          for (const subCategory in mrLines[category]) {
            for (const supplier in mrLines[category][subCategory]) {
              const items = mrLines[category][subCategory][supplier];
              allItems.push(...items);
            }
          }
        }

        const checkPromises = allItems.map(async (item) => {
          try {
            const lpoResponse = await fetch(
              `${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo/getLPOByMrHeaderID`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  mr_header_id: mrHeader.id,
                  supplier_id: item.approved_supplier_id,
                }),
              },
            );

            if (lpoResponse.ok) {
              const lpoData = await lpoResponse.json();

              if (lpoData.success && lpoData.data && lpoData.data.length > 0) {
                const lpo = lpoData.data[0];

                const lpoDetailsResponse = await fetch(
                  `${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo/getLPODetails`,
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ lpo_id: lpo.id }),
                  },
                );

                if (lpoDetailsResponse.ok) {
                  const lpoDetailsData = await lpoDetailsResponse.json();

                  if (
                    lpoDetailsData.success &&
                    lpoDetailsData.data &&
                    lpoDetailsData.data.lpo_mr_lines
                  ) {
                    const lpoLine = lpoDetailsData.data.lpo_mr_lines.find(
                      (line: any) => line.mr_line_id === item.id,
                    );

                    if (lpoLine) {
                      const qcResponse = await fetch(
                        `${process.env.NEXT_PUBLIC_BASE_URL}/api/qc/getQCByLPOMrLineID`,
                        {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            lpo_mr_line_id: lpoLine.id,
                          }),
                        },
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

  useEffect(() => {
    async function checkStockStatuses() {
      if (mrHeader.progress_id !== 24) {
        setIsCheckingInventory(false);
        return;
      }

      setIsCheckingInventory(true);
      const statusMap: { [itemId: number]: boolean } = {};

      try {
        const allItems: MrLine[] = [];
        for (const category in mrLines) {
          for (const subCategory in mrLines[category]) {
            for (const supplier in mrLines[category][subCategory]) {
              const items = mrLines[category][subCategory][supplier];
              allItems.push(...items);
            }
          }
        }

        const checkPromises = allItems.map(async (item) => {
          try {
            const response = await fetch(
              `${process.env.NEXT_PUBLIC_BASE_URL}/api/stock/getStockByMrLineID`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  mr_line_id: item.id,
                }),
              },
            );

            const data = await response.json();

            if (data.success && data.data) {
              statusMap[item.id] = true;
            } else {
              statusMap[item.id] = false;
            }
          } catch (error) {
            console.error(`Error checking stock for item ${item.id}:`, error);
            statusMap[item.id] = false;
          }
        });

        await Promise.all(checkPromises);
        setInventoryStatus(statusMap);
      } catch (error) {
        console.error("Error checking stock statuses:", error);
      } finally {
        setIsCheckingInventory(false);
      }
    }

    checkStockStatuses();
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
    if (activeCategory === "ALL") {
      const firstCategory = Object.keys(regroupedMrLines)[0];
      if (firstCategory) {
        const firstSubCategory = Object.values(
          regroupedMrLines[firstCategory],
        )[0];
        if (firstSubCategory) {
          const firstSupplier = Object.values(firstSubCategory)[0];
          if (firstSupplier && firstSupplier.length > 0) {
            return String(firstSupplier[0].material_category_id);
          }
        }
      }
      return undefined;
    }

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

  function hasQSRejectedItems() {
    let hasRejected = false;
    let allItemsReviewed = true;

    for (const category in mrLines) {
      for (const subCategory in mrLines[category]) {
        for (const supplier in mrLines[category][subCategory]) {
          const items = mrLines[category][subCategory][supplier];

          for (const item of items) {
            const status = item.qs_approval_status?.toLowerCase();

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

  function hasQSRejectedSuppliers() {
    if (isCheckingSupplierQSApprovals) return false;

    let hasRejected = false;
    let allReviewed = true;

    for (const category in mrLines) {
      for (const subCategory in mrLines[category]) {
        for (const supplier in mrLines[category][subCategory]) {
          const items = mrLines[category][subCategory][supplier];

          for (const item of items) {
            const status = supplierQSApprovalStatus[item.id];

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

  function allSuppliersQSApproved() {
    if (isCheckingSupplierQSApprovals) return false;

    let allReviewed = true;
    let allApproved = true;

    for (const category in mrLines) {
      for (const subCategory in mrLines[category]) {
        for (const supplier in mrLines[category][subCategory]) {
          const items = mrLines[category][subCategory][supplier];

          for (const item of items) {
            const status = supplierQSApprovalStatus[item.id];

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

  function hasAnyQSRejectedSuppliers() {
    if (isCheckingSupplierQSApprovals) return false;

    for (const category in mrLines) {
      for (const subCategory in mrLines[category]) {
        for (const supplier in mrLines[category][subCategory]) {
          const items = mrLines[category][subCategory][supplier];

          for (const item of items) {
            const status = supplierQSApprovalStatus[item.id];

            if (status === "rejected") {
              return true;
            }
          }
        }
      }
    }

    return false;
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

  function allItemsQSApproved() {
    let allReviewed = true;
    let allApproved = true;

    for (const category in mrLines) {
      for (const subCategory in mrLines[category]) {
        for (const supplier in mrLines[category][subCategory]) {
          const items = mrLines[category][subCategory][supplier];

          for (const item of items) {
            const status = item.qs_approval_status?.toLowerCase();

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

      if (!status || !status.hasLpo || !status.hasInvoice) {
        return false;
      }

      // ✅ Only require signed file for local suppliers
      const isMarketplace = status.supplierType
        ?.toLowerCase()
        .includes("marketplace");

      if (!isMarketplace && !status.hasSignedFile) {
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

  function hasAllItemsCompletedQc() {
    if (isCheckingQc) return false;

    let totalItems = 0;
    let allCompleted = true;

    for (const category in mrLines) {
      for (const subCategory in mrLines[category]) {
        for (const supplier in mrLines[category][subCategory]) {
          const items = mrLines[category][subCategory][supplier];

          for (const item of items) {
            totalItems++;
            const status = qcStatus[item.id];

            if (!status || status === "pending") {
              allCompleted = false;
            }
          }
        }
      }
    }

    return totalItems > 0 && allCompleted;
  }

  function allItemsHaveStock() {
    if (isCheckingInventory) return false;

    let totalItems = 0;
    let itemsWithStock = 0;

    for (const category in mrLines) {
      for (const subCategory in mrLines[category]) {
        for (const supplier in mrLines[category][subCategory]) {
          const items = mrLines[category][subCategory][supplier];

          for (const item of items) {
            totalItems++;
            if (inventoryStatus[item.id]) {
              itemsWithStock++;
            }
          }
        }
      }
    }

    return totalItems > 0 && itemsWithStock === totalItems;
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

  function hasAnyQSRejectedItems() {
    for (const category in mrLines) {
      for (const subCategory in mrLines[category]) {
        for (const supplier in mrLines[category][subCategory]) {
          const items = mrLines[category][subCategory][supplier];

          for (const item of items) {
            const status = item.qs_approval_status?.toLowerCase();

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
              SHOW BY VENDOR
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
                <button
                  className={`item ${activeCategory === "ALL" ? "active" : ""}`}
                  onClick={() => setActiveCategory("ALL")}
                  style={{ textTransform: "uppercase" }}
                >
                  ALL
                </button>

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
                  <>
                    {/* CATEGORY + SUBCATEGORY + ITEM */}
                    <AddMrItemButton
                      mrHeaderID={mrHeader.id}
                      projectID={mrHeader.project_id}
                      bgColor="black"
                      borderColor="black"
                      textColor="white"
                      purposeID={mrHeader.purpose_id}
                    >
                      ADD ITEM +
                    </AddMrItemButton>
                  </>
                )}
            </div>
          </div>
        )}
      </div>

      <br />
      <br />

      {showByItem &&
        (activeCategory === "ALL"
          ? Object.entries(regroupedMrLines).map(
              ([category, subCategoriesData], categoryIndex) =>
                Object.entries(subCategoriesData).map(function (
                  [subCategory, suppliers],
                  subCategoryIndex,
                ) {
                  const allItems = getAllItemsInSubCategory(suppliers);
                  const firstItem = allItems[0];

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

                        {mrHeader.progress_id === 1 &&
                          userInfo?.departmentID === mrHeader.department_id &&
                          firstItem && (
                            <div className="right">
                              <RenameMrSubCategoryButton
                                items={allItems}
                                categoryID={String(
                                  firstItem.material_category_id,
                                )}
                                subCategoryID={String(
                                  firstItem.material_subcategory_id,
                                )}
                              ></RenameMrSubCategoryButton>

                              <DeleteMrSubCategoryButton
                                items={allItems}
                                subCategory={subCategory}
                              />
                            </div>
                          )}
                      </div>

                      <br />
                      <br />

                      {Object.entries(suppliers).map(
                        ([supplier, items], supplierIndex) => (
                          <div key={supplier} style={{ marginBottom: "2rem" }}>
                            <table className="items-table">
                              <thead>
                                <tr>
                                  <th>#</th>
                                  <th>DESCRIPTION</th>
                                  <th>QTY</th>
                                  <th>BOQ REF.</th>
                                  <th>BRAND & SPECIFICATION</th>
                                  <th>ATTACHMENT</th>
                                  {((mrHeader.progress_id === 5 &&
                                    (userInfo?.departmentID ===
                                      mrHeader.department_id ||
                                      userInfo?.departmentID === 8 ||
                                      userInfo?.departmentID === 16)) ||
                                    (mrHeader.progress_id === 3 &&
                                      userInfo?.departmentID ===
                                        mrHeader.department_id &&
                                      userInfo?.departmentID !== 8) ||
                                    (mrHeader.progress_id === 2 &&
                                      userInfo?.departmentID ===
                                        mrHeader.department_id &&
                                      userInfo?.departmentID !== 16)) && (
                                    <th>APPROVAL STATUS</th>
                                  )}
                                  {(mrHeader.progress_id === 1 ||
                                    mrHeader.progress_id === 5) &&
                                    userInfo?.departmentID ===
                                      mrHeader.department_id && (
                                      <th>ACTIONS</th>
                                    )}
                                  {mrHeader.progress_id === 3 &&
                                    userInfo?.departmentID === 8 && (
                                      <th>ACTIONS</th>
                                    )}
                                  {mrHeader.progress_id === 2 &&
                                    userInfo?.departmentID === 16 && (
                                      <th>ACTIONS</th>
                                    )}
                                  {mrHeader.progress_id >= 10 && (
                                    <th>VENDOR & QUOTATION</th>
                                  )}
                                  {mrHeader.progress_id === 7 &&
                                    userInfo?.departmentID === 9 && (
                                      <th>VENDOR & QUOTATION</th>
                                    )}
                                  {mrHeader.progress_id === 9 &&
                                    userInfo?.departmentID === 16 && (
                                      <th>VENDOR & QUOTATION</th>
                                    )}
                                  {userInfo?.departmentID === 12 &&
                                    mrHeader.progress_id === 21 && (
                                      <th>QUALITY CONTROL</th>
                                    )}
                                  {userInfo?.departmentID === 11 &&
                                    mrHeader.progress_id === 24 && (
                                      <th>STOCKS</th>
                                    )}
                                  {userInfo?.departmentID === 9 &&
                                    mrHeader.progress_id === 23 && (
                                      <th>RESOLUTION</th>
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
                                          {item.boq_item_number ? (
                                            <div
                                              style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "10px",
                                              }}
                                            >
                                              {item.boq_item_number}
                                              <BoqReferencePopUp
                                                item={item}
                                                mrHeader={mrHeader}
                                              />
                                            </div>
                                          ) : (
                                            "-"
                                          )}
                                        </td>
                                        <td>
                                          {item.brand || item.specification ? (
                                            <InfoPopUpButton
                                              text={
                                                <>
                                                  <small>BRAND</small>
                                                  <h2>{item.brand}</h2>

                                                  <br />

                                                  <small>SPECIFICATION</small>
                                                  <h2>{item.specification}</h2>
                                                </>
                                              }
                                              header="BRAND & SPECIFICATION"
                                            />
                                          ) : (
                                            "-"
                                          )}
                                        </td>
                                        <td>
                                          {item.attachment ? (
                                            <Button
                                              componentType={"link"}
                                              bgColor={"rgba(239, 239, 239, 1)"}
                                              borderColor={
                                                "rgba(223, 223, 223, 1)"
                                              }
                                              textColor={"black"}
                                              style={{ padding: "7px 7px" }}
                                              href={item.attachment}
                                              target="_blank"
                                            >
                                              <img
                                                src={externalLinkIcon}
                                                alt="external link"
                                              />
                                            </Button>
                                          ) : (
                                            "-"
                                          )}
                                        </td>

                                        {(((mrHeader.progress_id === 5 ||
                                          mrHeader.progress_id === 3 ||
                                          mrHeader.progress_id === 2) &&
                                          userInfo?.departmentID ===
                                            mrHeader.department_id) ||
                                          ((mrHeader.progress_id === 5 ||
                                            mrHeader.progress_id === 3) &&
                                            userInfo?.departmentID === 8) ||
                                          ((mrHeader.progress_id === 5 ||
                                            mrHeader.progress_id === 2) &&
                                            userInfo?.departmentID === 16)) && (
                                          <td>
                                            <div
                                              style={{
                                                display: "flex",
                                                flexDirection: "column",
                                                gap: "10px",
                                              }}
                                            >
                                              {/* Show QS approval buttons */}
                                              {(mrHeader.progress_id === 5 ||
                                                mrHeader.progress_id === 2) &&
                                                (userInfo?.departmentID ===
                                                  mrHeader.department_id ||
                                                  userInfo?.departmentID ===
                                                    16) && (
                                                  <QSInitialApprovalButtons
                                                    item={item}
                                                    progressID={
                                                      mrHeader.progress_id
                                                    }
                                                  />
                                                )}

                                              {/* Show Manager approval buttons */}
                                              {(mrHeader.progress_id === 5 ||
                                                mrHeader.progress_id === 3) &&
                                                (userInfo?.departmentID ===
                                                  mrHeader.department_id ||
                                                  userInfo?.departmentID ===
                                                    8) && (
                                                  <InitialApprovalButtons
                                                    item={item}
                                                    progressID={
                                                      mrHeader.progress_id
                                                    }
                                                  />
                                                )}
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
                                                    projectID={
                                                      mrHeader.project_id
                                                    }
                                                    purposeID={
                                                      mrHeader.purpose_id
                                                    }
                                                    item={item}
                                                    bgColor={
                                                      "rgba(239, 239, 239, 1)"
                                                    }
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
                                                    bgColor={
                                                      "rgba(239, 239, 239, 1)"
                                                    }
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
                                                  mrLine={item}
                                                />
                                              </div>
                                            </td>
                                          )}

                                        {mrHeader.progress_id === 9 &&
                                          userInfo?.departmentID === 16 && (
                                            <td>
                                              <CheckPricesButton
                                                progressID={
                                                  mrHeader.progress_id
                                                }
                                                mrLine={item}
                                              />
                                            </td>
                                          )}

                                        {[10, 11].includes(
                                          mrHeader.progress_id,
                                        ) &&
                                          userInfo?.departmentID === 8 && (
                                            <td>
                                              <PriceApprovalButton
                                                progressID={
                                                  mrHeader.progress_id
                                                }
                                                mrLine={item}
                                                bgColor="white"
                                                borderColor="rgba(207, 207, 207, 1)"
                                                textColor="black"
                                                style={{
                                                  borderRadius: "25px",
                                                  padding: "5px 20px",
                                                }}
                                                portalTarget={document.getElementById(
                                                  "total-invoice-portal",
                                                )}
                                                onTotalPriceChange={
                                                  handleTotalPriceChange
                                                }
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
                                                  borderColor:
                                                    "rgba(223, 223, 223, 1)",
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
                                              />
                                            </td>
                                          )}

                                        {userInfo?.departmentID === 11 &&
                                          mrHeader.progress_id === 24 && (
                                            <td>
                                              <AddToInventoryButton
                                                mrLine={item}
                                              />
                                            </td>
                                          )}

                                        {userInfo?.departmentID === 9 &&
                                          mrHeader.progress_id === 23 && (
                                            <td>
                                              <ResolutionButton
                                                mrHeader={mrHeader}
                                                item={item}
                                              />
                                            </td>
                                          )}
                                      </tr>
                                    );
                                  })}
                              </tbody>
                            </table>

                            {mrHeader.progress_id === 10 &&
                              userInfo?.departmentID === 8 && (
                                <div id={`total-invoice-portal`}>
                                  <br />
                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      backgroundColor: "rgba(239, 239, 239, 1)",
                                      padding: "7px 20px",
                                      borderRadius: "25px",
                                    }}
                                  >
                                    <h4>TOTAL</h4>
                                    <h4>{totalInvoiceAmount.toFixed(2)} AED</h4>
                                  </div>
                                </div>
                              )}

                            <br />
                          </div>
                        ),
                      )}

                      {(mrHeader.progress_id === 1 ||
                        mrHeader.progress_id === 5) &&
                        userInfo?.departmentID === mrHeader.department_id &&
                        firstItem && (
                          <>
                            {/* ALL CATEGORY */}
                            <AddMrItemButton
                              projectID={mrHeader.project_id}
                              mrHeaderID={mrHeader.id}
                              bgColor="rgba(239, 239, 239, 1)"
                              borderColor="rgba(239, 239, 239, 1)"
                              textColor="black"
                              full
                              autoCategoryID={String(
                                firstItem.material_category_id,
                              )}
                              autoSubCategoryIDs={(() => {
                                const subcatId =
                                  firstItem.material_subcategory_id;

                                // If it's already an array, return it
                                if (Array.isArray(subcatId)) {
                                  return subcatId.map((id) =>
                                    typeof id === "string" ? parseInt(id) : id,
                                  );
                                }

                                // If it's a string like "7, 8, 9", split it
                                if (typeof subcatId === "string") {
                                  return subcatId
                                    .split(",")
                                    .map((id) => id.trim())
                                    .filter((id) => id && id !== "")
                                    .map((id) => parseInt(id))
                                    .filter((id) => !isNaN(id));
                                }

                                // If it's a single number
                                if (typeof subcatId === "number") {
                                  return [subcatId];
                                }

                                return [];
                              })()}
                              purposeID={mrHeader.purpose_id}
                              style={{ padding: "20px 0px" }}
                            >
                              ADD ITEM +
                            </AddMrItemButton>

                            <br />
                            <br />
                            <br />
                            <br />
                            <br />
                          </>
                        )}
                    </div>
                  );
                }),
            )
          : Object.entries(subCategories).map(function (
              [subCategory, suppliers],
              index,
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
                          <RenameMrSubCategoryButton
                            items={allItems}
                            categoryID={String(firstItem.material_category_id)}
                            subCategoryID={String(
                              firstItem.material_subcategory_id,
                            )}
                          />

                          <DeleteMrSubCategoryButton
                            items={allItems}
                            subCategory={subCategory}
                          />
                        </div>
                      )}
                  </div>

                  <br />
                  <br />

                  {Object.entries(suppliers).map(
                    ([supplier, items], supplierIndex) => (
                      <div key={supplier} style={{ marginBottom: "2rem" }}>
                        <table className="items-table">
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>DESCRIPTION</th>
                              <th>QTY</th>
                              <th>BOQ REF.</th>
                              <th>BRAND & SPECIFICATION</th>
                              <th>ATTACHMENT</th>
                              {((mrHeader.progress_id === 5 &&
                                (userInfo?.departmentID ===
                                  mrHeader.department_id ||
                                  userInfo?.departmentID === 8 ||
                                  userInfo?.departmentID === 16)) ||
                                (mrHeader.progress_id === 3 &&
                                  userInfo?.departmentID ===
                                    mrHeader.department_id &&
                                  userInfo?.departmentID !== 8) ||
                                (mrHeader.progress_id === 2 &&
                                  userInfo?.departmentID ===
                                    mrHeader.department_id &&
                                  userInfo?.departmentID !== 16)) && (
                                <th>APPROVAL STATUS</th>
                              )}
                              {(mrHeader.progress_id === 1 ||
                                mrHeader.progress_id === 5) &&
                                userInfo?.departmentID ===
                                  mrHeader.department_id && <th>ACTIONS</th>}
                              {mrHeader.progress_id === 3 &&
                                userInfo?.departmentID === 8 && (
                                  <th>ACTIONS</th>
                                )}
                              {mrHeader.progress_id === 2 &&
                                userInfo?.departmentID === 16 && (
                                  <th>ACTIONS</th>
                                )}
                              {mrHeader.progress_id >= 10 && (
                                <th>VENDOR & QUOTATION</th>
                              )}
                              {mrHeader.progress_id === 7 &&
                                userInfo?.departmentID === 9 && (
                                  <th>VENDOR & QUOTATION</th>
                                )}
                              {mrHeader.progress_id === 9 &&
                                userInfo?.departmentID === 16 && (
                                  <th>VENDOR & QUOTATION</th>
                                )}
                              {userInfo?.departmentID === 12 &&
                                mrHeader.progress_id === 21 && (
                                  <th>QUALITY CONTROL</th>
                                )}
                              {userInfo?.departmentID === 11 &&
                                mrHeader.progress_id === 24 && <th>STOCKS</th>}
                              {userInfo?.departmentID === 9 &&
                                mrHeader.progress_id === 23 && (
                                  <th>RESOLUTION</th>
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
                                      {item.boq_item_number ? (
                                        <div
                                          style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "10px",
                                          }}
                                        >
                                          {item.boq_item_number}
                                          <BoqReferencePopUp
                                            item={item}
                                            mrHeader={mrHeader}
                                          />
                                        </div>
                                      ) : (
                                        "-"
                                      )}
                                    </td>
                                    <td>
                                      {item.brand || item.specification ? (
                                        <InfoPopUpButton
                                          text={
                                            <>
                                              <small>BRAND</small>
                                              <h2>{item.brand}</h2>

                                              <br />

                                              <small>SPECIFICATION</small>
                                              <h2>{item.specification}</h2>
                                            </>
                                          }
                                          header="BRAND & SPECIFICATION"
                                        />
                                      ) : (
                                        "-"
                                      )}
                                    </td>

                                    <td>
                                      {item.attachment ? (
                                        <Button
                                          componentType={"link"}
                                          bgColor={"rgba(239, 239, 239, 1)"}
                                          borderColor={"rgba(223, 223, 223, 1)"}
                                          textColor={"black"}
                                          style={{ padding: "7px 7px" }}
                                          href={item.attachment}
                                          target="_blank"
                                        >
                                          <img
                                            src={externalLinkIcon}
                                            alt="external link"
                                          />
                                        </Button>
                                      ) : (
                                        "-"
                                      )}
                                    </td>

                                    {(((mrHeader.progress_id === 5 ||
                                      mrHeader.progress_id === 3 ||
                                      mrHeader.progress_id === 2) &&
                                      userInfo?.departmentID ===
                                        mrHeader.department_id) ||
                                      ((mrHeader.progress_id === 5 ||
                                        mrHeader.progress_id === 3) &&
                                        userInfo?.departmentID === 8) ||
                                      ((mrHeader.progress_id === 5 ||
                                        mrHeader.progress_id === 2) &&
                                        userInfo?.departmentID === 16)) && (
                                      <td>
                                        <div
                                          style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: "10px",
                                          }}
                                        >
                                          {/* Show QS approval buttons */}
                                          {(mrHeader.progress_id === 5 ||
                                            mrHeader.progress_id === 2) &&
                                            (userInfo?.departmentID ===
                                              mrHeader.department_id ||
                                              userInfo?.departmentID ===
                                                16) && (
                                              <QSInitialApprovalButtons
                                                item={item}
                                                progressID={
                                                  mrHeader.progress_id
                                                }
                                              />
                                            )}

                                          {/* Show Manager approval buttons */}
                                          {(mrHeader.progress_id === 5 ||
                                            mrHeader.progress_id === 3) &&
                                            (userInfo?.departmentID ===
                                              mrHeader.department_id ||
                                              userInfo?.departmentID === 8) && (
                                              <InitialApprovalButtons
                                                item={item}
                                                progressID={
                                                  mrHeader.progress_id
                                                }
                                              />
                                            )}
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
                                                purposeID={mrHeader.purpose_id}
                                                item={item}
                                                bgColor={
                                                  "rgba(239, 239, 239, 1)"
                                                }
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
                                                bgColor={
                                                  "rgba(239, 239, 239, 1)"
                                                }
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
                                              mrLine={item}
                                            />
                                          </div>
                                        </td>
                                      )}

                                    {mrHeader.progress_id === 9 &&
                                      userInfo?.departmentID === 16 && (
                                        <td>
                                          <CheckPricesButton
                                            progressID={mrHeader.progress_id}
                                            mrLine={item}
                                          />
                                        </td>
                                      )}

                                    {[10, 11].includes(mrHeader.progress_id) &&
                                      userInfo?.departmentID === 8 && (
                                        <td>
                                          <PriceApprovalButton
                                            progressID={mrHeader.progress_id}
                                            mrLine={item}
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
                                              borderColor:
                                                "rgba(223, 223, 223, 1)",
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
                                          />
                                        </td>
                                      )}

                                    {userInfo?.departmentID === 11 &&
                                      mrHeader.progress_id === 24 && (
                                        <td>
                                          <AddToInventoryButton mrLine={item} />
                                        </td>
                                      )}

                                    {userInfo?.departmentID === 9 &&
                                      mrHeader.progress_id === 23 && (
                                        <td>
                                          <ResolutionButton
                                            mrHeader={mrHeader}
                                            item={item}
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
                    ),
                  )}

                  {(mrHeader.progress_id === 1 || mrHeader.progress_id === 5) &&
                    userInfo?.departmentID === mrHeader.department_id &&
                    firstItem && (
                      <>
                        {/* SPECIFIC CATEGORY */}
                        <AddMrItemButton
                          projectID={mrHeader.project_id}
                          mrHeaderID={mrHeader.id}
                          bgColor="rgba(239, 239, 239, 1)"
                          borderColor="rgba(239, 239, 239, 1)"
                          textColor="black"
                          full
                          autoCategoryID={String(
                            firstItem.material_category_id,
                          )}
                          autoSubCategoryIDs={(() => {
                            const subcatId = firstItem.material_subcategory_id;

                            // If it's already an array, return it
                            if (Array.isArray(subcatId)) {
                              return subcatId.map((id) =>
                                typeof id === "string" ? parseInt(id) : id,
                              );
                            }

                            // If it's a string like "7, 8, 9", split it
                            if (typeof subcatId === "string") {
                              return subcatId
                                .split(",")
                                .map((id) => id.trim())
                                .filter((id) => id && id !== "")
                                .map((id) => parseInt(id))
                                .filter((id) => !isNaN(id));
                            }

                            // If it's a single number
                            if (typeof subcatId === "number") {
                              return [subcatId];
                            }

                            return [];
                          })()}
                          purposeID={mrHeader.purpose_id}
                          style={{ padding: "20px 0px" }}
                        >
                          ADD ITEM +
                        </AddMrItemButton>

                        <br />
                        <br />
                        <br />
                        <br />
                        <br />
                      </>
                    )}
                </div>
              );
            }))}

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
                  style={{
                    padding: "7px 7px",
                    backgroundColor: "rgba(239, 239, 239, 1)",
                    borderColor: "rgba(223, 223, 223, 1)",
                  }}
                >
                  <img
                    src={externalLinkIcon}
                    alt="external link"
                    style={{ width: "12px" }}
                  />
                </SupplierDetailsPopUp>
              </div>

              <div className="right">
                {mrHeader.progress_id === 23 &&
                  userInfo?.departmentID === 9 && (
                    <QCRecheckButton mrHeader={mrHeader} />
                  )}

                {mrHeader.progress_id >= 12 && (
                  <IssueLPOButton mrHeader={mrHeader} mrLines={items} />
                )}

                {(userInfo?.departmentID === 10 ||
                  userInfo?.departmentID === 11) &&
                  (mrHeader.progress_id === 13 ||
                    mrHeader.progress_id === 14) && (
                    <PaymentButtons
                      mrHeader={mrHeader}
                      mrLine={items[0]}
                      supplierId={items[0].approved_supplier_id}
                      portalTarget={document.getElementById(
                        `total-invoice-${items[0].approved_supplier_id}`,
                      )}
                    />
                  )}

                {(mrHeader.progress_id === 16 || mrHeader.progress_id === 17) &&
                  userInfo?.departmentID === 11 && (
                    <CreateGRNButton
                      mrHeader={mrHeader}
                      mrLines={items}
                      progress_id={mrHeader.progress_id}
                    />
                  )}

                {mrHeader.progress_id >= 18 && (
                  <CreateGRNButton
                    mrHeader={mrHeader}
                    mrLines={items}
                    progress_id={mrHeader.progress_id}
                  />
                )}

                {/* {(mrHeader.progress_id >= 18 ||
                  mrHeader.progress_id === 17 ||
                  mrHeader.progress_id === 16) &&
                  userInfo?.departmentID === 11 && (
                    <CreateGRNButton
                      mrHeader={mrHeader}
                      mrLines={items}
                      progress_id={mrHeader.progress_id}
                    />
                  )} */}
              </div>
            </div>

            <br />
            <br />

            <table className="items-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>CATEGORY</th>
                  <th>SUBCATEGORY</th>
                  <th>DESCRIPTION</th>
                  <th>QTY</th>
                  <th>BOQ REF.</th>
                  <th>BRAND & SPECIFICATION</th>
                  {mrHeader.progress_id >= 12 && <th>VENDOR & QUOTATION</th>}
                  {userInfo?.departmentID === 12 &&
                    mrHeader.progress_id === 21 && <th>QUALITY CONTROL</th>}
                  {mrHeader.progress_id === 24 &&
                    userInfo?.departmentID === 11 && <th>STOCKS</th>}
                  {mrHeader.progress_id === 23 &&
                    userInfo?.departmentID === 9 && <th>RESOLUTION</th>}
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
                      {item.boq_item_number ? (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                          }}
                        >
                          {item.boq_item_number}
                          <BoqReferencePopUp item={item} mrHeader={mrHeader} />
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>
                      {item.brand || item.specification ? (
                        <InfoPopUpButton
                          text={
                            <>
                              <small>BRAND</small>
                              <h2>{item.brand}</h2>

                              <br />

                              <small>SPECIFICATION</small>
                              <h2>{item.specification}</h2>
                            </>
                          }
                          header="BRAND & SPECIFICATION"
                        />
                      ) : (
                        "-"
                      )}
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
                          <QCCheckListButton item={item} mrHeader={mrHeader} />
                        </td>
                      )}

                    {userInfo?.departmentID === 11 &&
                      mrHeader.progress_id === 24 && (
                        <td>
                          <AddToInventoryButton mrLine={item} />
                        </td>
                      )}

                    {mrHeader.progress_id === 23 &&
                      userInfo?.departmentID === 9 && (
                        <td>
                          <ResolutionButton mrHeader={mrHeader} item={item} />
                        </td>
                      )}
                  </tr>
                ))}
              </tbody>
            </table>

            {mrHeader.progress_id === 14 && userInfo?.departmentID === 10 && (
              <div id={`total-invoice-${items[0].approved_supplier_id}`}>
                {/* <br />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    backgroundColor: "rgba(239, 239, 239, 1)",
                    padding: "7px 20px",
                    borderRadius: "25px",
                  }}
                >
                  <h4>TOTAL INVOICE</h4>
                  <h4>123 AED</h4>
                </div> */}
              </div>
            )}

            <br />
            <br />
          </div>
        ))}

      {(mrHeader.progress_id === 1 || mrHeader.progress_id === 5) &&
        userInfo?.departmentID === mrHeader.department_id &&
        activeCategory !== "ALL" &&
        showByItem && (
          <>
            <br />
            <br />
            <br />
            <br />
            <br />

            {/* SUBCATEGORY + ITEM */}
            <AddMrItemButton
              projectID={mrHeader.project_id}
              mrHeaderID={mrHeader.id}
              bgColor="rgba(239, 239, 239, 1)"
              borderColor="rgba(239, 239, 239, 1)"
              textColor="black"
              full
              autoCategoryID={getActiveCategoryID()}
              purposeID={mrHeader.purpose_id}
              style={{ padding: "40px 0px", backgroundColor: "white" }}
            >
              ADD SUBCATEGORY & ITEM +
            </AddMrItemButton>

            <br />
            <br />
            <br />
            <br />
            <br />
          </>
        )}

      {(mrHeader.progress_id === 1 || mrHeader.progress_id === 5) &&
        userInfo?.departmentID === mrHeader.department_id && (
          <div className="bottom-nav">
            <div></div>
            {/* <SubmitForInitialApprovalButton
              mrHeaderID={mrHeader.id}
              disabled={hasAnyRejectedItems()}
              style={{
                opacity: hasAnyRejectedItems() ? "0.5" : "1",
                cursor: hasAnyRejectedItems() ? "not-allowed" : "pointer",
                pointerEvents: hasAnyRejectedItems() ? "none" : "auto",
              }}
            /> */}
            <SubmitForQSApprovalButton
              mrHeaderID={mrHeader.id}
              disabled={hasAnyRejectedItems()}
              style={{
                opacity: hasAnyRejectedItems() ? "0.5" : "1",
                cursor: hasAnyRejectedItems() ? "not-allowed" : "pointer",
                pointerEvents: hasAnyRejectedItems() ? "none" : "auto",
              }}
            />
          </div>
        )}

      {/* {mrHeader.progress_id < 12 &&
        mrHeader.progress_id > 1 &&
        mrHeader.department_id === userInfo?.departmentID && (
          <div className="bottom-nav">
            <CancelMaterialRequestButton
              mrHeaderID={mrHeader.id}
              bgColor="black"
              borderColor="white"
              textColor="white"
            >
              ROLL BACK MATERIAL REQUEST
            </CancelMaterialRequestButton>
          </div>
        )} */}

      {/* Awaiting Initial Approval (Progress 3) - Management Actions */}
      {userInfo?.departmentID === 8 && mrHeader.progress_id === 3 && (
        <div className="bottom-nav">
          {/* <CancelMaterialRequestButton
            mrHeaderID={mrHeader.id}
            bgColor="black"
            borderColor="white"
            textColor="white"
          >
            CANCEL MATERIAL REQUEST
          </CancelMaterialRequestButton> */}

          <div></div>

          {hasRejectedItems() ? (
            <SubmitForResubmissionButton mrHeaderID={mrHeader.id} />
          ) : (
            <SubmitForQuotationsButton
              mrHeaderID={mrHeader.id}
              disabled={!allItemsApproved()}
              style={{
                opacity: !allItemsApproved() ? "0.5" : "1",
                cursor: !allItemsApproved() ? "not-allowed" : "pointer",
                pointerEvents: !allItemsApproved() ? "none" : "auto",
              }}
            />
          )}
        </div>
      )}

      {userInfo?.departmentID === 16 && mrHeader.progress_id === 2 && (
        <div className="bottom-nav">
          {/* <CancelMaterialRequestButton
      mrHeaderID={mrHeader.id}
      bgColor="black"
      borderColor="white"
      textColor="white"
    >
      CANCEL MATERIAL REQUEST
    </CancelMaterialRequestButton> */}

          <div></div>

          {hasQSRejectedItems() ? (
            <SubmitForResubmissionButton mrHeaderID={mrHeader.id} />
          ) : (
            <SubmitForInitialApprovalButton
              mrHeaderID={mrHeader.id}
              disabled={!allItemsQSApproved()} // Changed this line
              style={{
                opacity: !allItemsQSApproved() ? "0.5" : "1", // Changed this line
                cursor: !allItemsQSApproved() ? "not-allowed" : "pointer", // Changed this line
                pointerEvents: !allItemsQSApproved() ? "none" : "auto", // Changed this line
              }}
            />
          )}
        </div>
      )}

      {/* Awaiting Quotations / Price Approval Rejected (Progress 7 or 11) - Procurement Submit for Pricing Approval */}
      {userInfo?.departmentID === 9 &&
        (mrHeader.progress_id === 7 || mrHeader.progress_id === 11) && (
          <div className="bottom-nav">
            <div></div>

            <SubmitForQSPricingApprovalButton
              mrHeaderID={mrHeader.id}
              disabled={
                !allItemsHaveSupplierQuotations() ||
                hasAnyRejectedSuppliers() ||
                hasAnyQSRejectedSuppliers() // Added this condition
              }
              style={{
                opacity:
                  !allItemsHaveSupplierQuotations() ||
                  hasAnyRejectedSuppliers() ||
                  hasAnyQSRejectedSuppliers() // Added this condition
                    ? "0.5"
                    : "1",
                cursor:
                  !allItemsHaveSupplierQuotations() ||
                  hasAnyRejectedSuppliers() ||
                  hasAnyQSRejectedSuppliers() // Added this condition
                    ? "not-allowed"
                    : "pointer",
                pointerEvents:
                  !allItemsHaveSupplierQuotations() ||
                  hasAnyRejectedSuppliers() ||
                  hasAnyQSRejectedSuppliers() // Added this condition
                    ? "none"
                    : "auto",
              }}
            />
          </div>
        )}

      {/* Awaiting Price Approval (Progress 10) - Management Actions */}
      {userInfo?.departmentID === 8 && mrHeader.progress_id === 10 && (
        <div className="bottom-nav">
          {/* <CancelMaterialRequestButton
      mrHeaderID={mrHeader.id}
      bgColor="black"
      borderColor="white"
      textColor="white"
    >
      CANCEL MATERIAL REQUEST
    </CancelMaterialRequestButton> */}

          <div></div>

          {hasRejectedSuppliers() ? (
            <SubmitForPricingResubmissionButton mrHeaderID={mrHeader.id} />
          ) : (
            <SubmitForLPO
              mrLines={mrLines}
              mrHeaderID={mrHeader.id}
              disabled={!allSuppliersApproved()}
              style={{
                opacity: !allSuppliersApproved() ? "0.5" : "1",
                cursor: !allSuppliersApproved() ? "not-allowed" : "pointer",
                pointerEvents: !allSuppliersApproved() ? "none" : "auto",
              }}
            />
          )}
        </div>
      )}

      {userInfo?.departmentID === 16 && mrHeader.progress_id === 9 && (
        <div className="bottom-nav">
          <div></div>

          {hasQSRejectedSuppliers() ? (
            <SubmitForPricingResubmissionButton mrHeaderID={mrHeader.id} />
          ) : (
            <SubmitForPricingApprovalButton
              mrHeaderID={mrHeader.id}
              disabled={!allSuppliersQSApproved()}
              style={{
                opacity: !allSuppliersQSApproved() ? "0.5" : "1",
                cursor: !allSuppliersQSApproved() ? "not-allowed" : "pointer",
                pointerEvents: !allSuppliersQSApproved() ? "none" : "auto",
              }}
            />
          )}
        </div>
      )}

      {/* Awaiting LPO & Invoice (Progress 12) - Procurement Submit for Payment */}
      {userInfo?.departmentID === 9 &&
        (mrHeader.progress_id === 12 ||
          mrHeader.progress_id === 13 ||
          mrHeader.progress_id === 16) && (
          <div className="bottom-nav">
            <div></div>
            <SubmitForPaymentButton
              mrHeaderID={mrHeader.id}
              disabled={!allSuppliersHaveLpoWithInvoicesAndSignedFiles()}
              style={{
                opacity: !allSuppliersHaveLpoWithInvoicesAndSignedFiles()
                  ? "0.5"
                  : "1",
                cursor: !allSuppliersHaveLpoWithInvoicesAndSignedFiles()
                  ? "not-allowed"
                  : "pointer",
                pointerEvents: !allSuppliersHaveLpoWithInvoicesAndSignedFiles()
                  ? "none"
                  : "auto",
              }}
            />
          </div>
        )}

      {/* Pending Payment (Progress 14) - Finance Submit for Delivery or Return to LPO */}
      {userInfo?.departmentID === 10 && mrHeader.progress_id === 14 && (
        <div className="bottom-nav">
          <div></div>
          {(() => {
            // Check if any LPO has rejected payment status
            const hasRejectedPayment = Object.values(lpoPaymentStatus).some(
              (status) => status === "rejected",
            );

            // Check if all LPOs have approved payment status
            const allPaymentsApproved = Object.values(lpoPaymentStatus).every(
              (status) => status === "approved",
            );

            // If any payment is rejected, show LPO resubmission button
            if (hasRejectedPayment) {
              return (
                <SubmitForLPOResubmissionButton mrHeaderID={mrHeader.id} />
              );
            } else {
              // Show Submit for Delivery button, disabled if not all payments are approved
              return (
                <SubmitForDeliveryButton
                  mrHeaderID={mrHeader.id}
                  disabled={!allPaymentsApproved}
                  style={{
                    opacity: !allPaymentsApproved ? "0.5" : "1",
                    cursor: !allPaymentsApproved ? "not-allowed" : "pointer",
                    pointerEvents: !allPaymentsApproved ? "none" : "auto",
                  }}
                />
              );
            }
          })()}
        </div>
      )}

      {userInfo?.departmentID === 11 && mrHeader.progress_id === 17 && (
        <div className="bottom-nav">
          <div></div>
          {!isCheckingGrnQuantity && allSuppliersHaveGrn() ? (
            hasAnyGrnQuantityMismatch() ? (
              <SubmitForLPOResubmissionGRNFailButton mrHeaderID={mrHeader.id} />
            ) : (
              /* <SubmitForQC mrHeaderID={mrHeader.id} /> */
              // uncomment this when qc is ready
              <SubmitForStockEntryButton mrHeaderID={mrHeader.id} />
            )
          ) : (
            /* <SubmitForQC
              mrHeaderID={mrHeader.id}
              disabled={true}
              style={{
                opacity: "0.5",
                cursor: "not-allowed",
                pointerEvents: "none",
              }}
            /> */
            // uncomment this when qc is ready

            <SubmitForStockEntryButton
              mrHeaderID={mrHeader.id}
              disabled={true}
              style={{
                opacity: "0.5",
                cursor: "not-allowed",
                pointerEvents: "none",
              }}
            />
          )}
        </div>
      )}

      {/* Awaiting QC Check (Progress 21) - QC Submit for Stock Entry or Return for Resolution */}
      {userInfo?.departmentID === 12 && mrHeader.progress_id === 21 && (
        <div className="bottom-nav">
          <div></div>
          {!allItemsPassedQc() && !isCheckingQc && hasAllItemsCompletedQc() ? (
            <SubmitForProcurementResolutionButton mrHeaderID={mrHeader.id} />
          ) : (
            <SubmitForStockEntryButton
              mrHeaderID={mrHeader.id}
              disabled={!allItemsPassedQc()}
              style={{
                opacity: !allItemsPassedQc() ? "0.5" : "1",
                cursor: !allItemsPassedQc() ? "not-allowed" : "pointer",
                pointerEvents: !allItemsPassedQc() ? "none" : "auto",
              }}
            />
          )}
        </div>
      )}

      {/* Awaiting Stock Entry (Progress 24) - Storekeeper Complete Material Request */}
      {userInfo?.departmentID === 11 && mrHeader.progress_id === 24 && (
        <div className="bottom-nav">
          <div></div>
          <CompleteMaterialRequestButton
            mrHeaderID={mrHeader.id}
            disabled={!allItemsHaveStock()}
            style={{
              opacity: !allItemsHaveStock() ? "0.5" : "1",
              cursor: !allItemsHaveStock() ? "not-allowed" : "pointer",
              pointerEvents: !allItemsHaveStock() ? "none" : "auto",
            }}
          />
        </div>
      )}
    </>
  );
}
