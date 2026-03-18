"use client";

import { useState, useEffect, useMemo } from "react";
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
import SubmitForPaymentButton, {
  SupplierInfo,
} from "./procurement/_SubmitForPaymentButton";
import PaymentButtons from "../lpo/[lpoId]/components/finance/_PaymentButtons";
import CreateGRNButton from "../lpo/[lpoId]/components/storekeeper/_CreateGRNButton";
import QCCheckListButton from "../lpo/[lpoId]/components/qualityControl/_QCCheckListButton";
import AddToInventoryButton from "../lpo/[lpoId]/components/storekeeper/_AddStockButton";
import QCRecheckButton from "./procurement/_QCRecheckButton";
import ResolutionButton from "./procurement/_AddResolutionButton";
import QSInitialApprovalButtons from "./quantitySurveyor/_InitialApprovalButton";
import QSReviewButton from "./quantitySurveyor/_QSReviewButton";
import SubmitForQSPricingApprovalButton from "./procurement/_SubmitForQSPricingApprovalButton";
import CheckPricesButton from "./quantitySurveyor/_CheckPricesButton";
import InfoPopUpButton from "@/app/components/_InfoPopUpButton";
import SubmitForQSApprovalButton from "./department/_SubmitForQSApprovalButton";
import MrTransferIssueButton from "./storekeeper/_MrTransferIssueButton";
import MrDownloadDnButton from "./storekeeper/_MrDownloadDnButton";
import MrUploadSignedDnButton from "./storekeeper/_MrUploadSignedDnButton";
import SubmitForStockTransferCompletion from "./storekeeper/_SubmitForStockTransferCompletion";

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

export default function MrLinesView({
  mrHeader,
  mrLines: rawMrLines,
}: MrLinesViewProps) {
  const { userInfo } = useAuth();

  const pencilIcon = "/icons/pencil.svg";
  const trashIcon = "/icons/trash.svg";
  const externalLinkIcon = "/icons/external-link.svg";

  // After stock transfer (progress > 4), filter out item_available lines
  // They've been fulfilled via stock transfer and shouldn't appear in quotation/LPO stages
  const mrLines = useMemo(() => {
    if (mrHeader.progress_id <= 4) return rawMrLines;

    const filtered: GroupedMrLines = {};
    for (const category in rawMrLines) {
      filtered[category] = {};
      for (const subCategory in rawMrLines[category]) {
        filtered[category][subCategory] = {};
        for (const supplier in rawMrLines[category][subCategory]) {
          const items = rawMrLines[category][subCategory][supplier].filter(
            (item) => item.qs_review_type !== "item_available",
          );
          if (items.length > 0) {
            filtered[category][subCategory][supplier] = items;
          }
        }
        if (Object.keys(filtered[category][subCategory]).length === 0) {
          delete filtered[category][subCategory];
        }
      }
      if (Object.keys(filtered[category]).length === 0) {
        delete filtered[category];
      }
    }
    return filtered;
  }, [rawMrLines, mrHeader.progress_id]);

  const [activeCategory, setActiveCategory] = useState<string>("ALL");

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
  const [lpoLinePrices, setLpoLinePrices] = useState<{
    [mrLineId: number]: {
      unitPrice: number;
      totalPrice: number;
      vatRate: number;
    };
  }>({});

  // LPO per-supplier info for showing "View LPO" links at stage 12+
  const [lpoPerSupplier, setLpoPerSupplier] = useState<{
    [supplierId: number]: {
      lpoId: number;
      progressId: number;
      progressName: string;
    };
  }>({});

  // Inventory match suggestions for QS Review stage
  const [inventoryMatches, setInventoryMatches] = useState<{
    [description: string]: {
      id: number;
      description: string;
    } | null;
  }>({});

  const canSeePrice =
    userInfo?.departmentID === 8 ||
    userInfo?.departmentID === 9 ||
    userInfo?.departmentID === 12 ||
    userInfo?.departmentID === 10 ||
    userInfo?.departmentID === 16;

  // Compute columns before TOTAL PRICE and columns after it for subtotal alignment
  // Subtotal only renders when progress_id >= 10 && canSeePrice
  const subtotalLabelColSpan = (() => {
    const pid = mrHeader.progress_id;
    const dept = userInfo?.departmentID;
    let count = 0;

    // #, ITEM
    count += 2;
    // QTY columns: progress >= 9 means 3 cols, else 1
    count += pid >= 9 ? 3 : 1;
    // BOQ REF, BRAND & SPECS, ATTACHMENT
    count += 3;
    // APPROVAL STATUS (only at progress 2, 3, 5 — not at >= 10)
    // ACTIONS columns before price (progress 1, 5, 11, 3, 2 — mostly not at >= 10 except 11)
    if (pid === 11 && dept === mrHeader.department_id) count += 1; // ACTIONS
    if (pid === 11 && dept === 9) count += 1; // ACTIONS
    // VENDOR & QUOTATION (progress >= 10 and !== 11)
    if (pid >= 10 && pid !== 11) count += 1;
    return count;
  })();

  // For the "by item" table which has CATEGORY + SUBCATEGORY columns
  const subtotalLabelColSpanByItem = subtotalLabelColSpan + 2;

  const subtotalTrailingColSpan = (() => {
    const pid = mrHeader.progress_id;
    const dept = userInfo?.departmentID;
    let count = 0;

    if (dept === 11 && pid === 4) count += 1; // STOCK TRANSFER — not at >= 10
    if (dept === 12 && pid === 21) count += 1; // QUALITY CONTROL
    if (dept === 11 && pid === 24) count += 1; // STOCKS
    if (dept === 9 && pid === 23) count += 1; // RESOLUTION
    if ((pid === 9 || pid === 10) && (dept === 8 || dept === 16)) count += 1; // ACTIONS

    return count;
  })();

  const formatNumber = (value: unknown): string => {
    // Convert to number safely
    const num = Number(value);

    // If not a valid number, return empty string or 0
    if (isNaN(num)) return "";

    // Integer case
    if (Number.isInteger(num)) {
      return num.toString();
    }

    // Decimal case: max 3 decimals, remove trailing zeros
    return parseFloat(num.toFixed(3)).toString();
  };

  // Fetch inventory matches for QS Review stage
  useEffect(() => {
    if (mrHeader.progress_id !== 2) return;

    const descriptions: string[] = [];
    for (const category in mrLines) {
      for (const subCategory in mrLines[category]) {
        for (const supplier in mrLines[category][subCategory]) {
          const items = mrLines[category][subCategory][supplier];
          for (const item of items) {
            if (item.material_description && !item.qs_review_type) {
              descriptions.push(item.material_description);
            }
          }
        }
      }
    }

    if (descriptions.length === 0) return;

    async function fetchMatches() {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/inventory/searchByDescription`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ descriptions }),
          },
        );
        const data = await res.json();
        if (data.success) {
          setInventoryMatches(data.data);
        }
      } catch {
        console.error("Failed to fetch inventory matches");
      }
    }

    fetchMatches();
  }, [mrHeader.progress_id, mrLines]);

  useEffect(() => {
    async function fetchLpoPrices() {
      const pricesMap: {
        [mrLineId: number]: {
          unitPrice: number;
          totalPrice: number;
          vatRate: number;
        };
      } = {};

      try {
        // Get all unique supplier IDs
        const uniqueSuppliers = new Map<number, MrLine[]>();

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

        // Fetch LPO details for each supplier
        const fetchPromises = Array.from(uniqueSuppliers.entries()).map(
          async ([supplierId, supplierItems]) => {
            try {
              // Get LPO for this supplier
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

                  // Get LPO details
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
                      // Map LPO line prices to MR line IDs
                      lpoDetailsData.data.lpo_mr_lines.forEach(
                        (lpoLine: any) => {
                          const unitPrice = Number(lpoLine.unit_price) || 0;
                          const quantity =
                            Number(lpoLine.approved_proposed_quantity) || 0;
                          const vatRate = Number(lpo.vat_rate) || 0;

                          pricesMap[lpoLine.mr_line_id] = {
                            unitPrice: unitPrice,
                            totalPrice: unitPrice * quantity,
                            vatRate: vatRate,
                          };
                        },
                      );
                    }
                  }
                }
              }
            } catch (error) {
              console.error(
                `Error fetching LPO prices for supplier ${supplierId}:`,
                error,
              );
            }
          },
        );

        await Promise.all(fetchPromises);
        setLpoLinePrices(pricesMap);
      } catch (error) {
        console.error("Error fetching LPO prices:", error);
      }
    }

    fetchLpoPrices();
  }, [mrLines, mrHeader.progress_id, mrHeader.id]);

  // Fetch LPO IDs and progress per supplier for "View LPO" links
  useEffect(() => {
    async function fetchLpoPerSupplier() {
      if (mrHeader.progress_id < 12) return;

      const supplierLpoMap: {
        [supplierId: number]: {
          lpoId: number;
          progressId: number;
          progressName: string;
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

        const fetchPromises = Array.from(uniqueSuppliers.keys()).map(
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

                  // Fetch LPO progress name
                  const lpoDetailRes = await fetch(
                    `${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo/getLPOWithLines`,
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ lpo_id: lpo.id }),
                    },
                  );

                  if (lpoDetailRes.ok) {
                    const lpoDetail = await lpoDetailRes.json();
                    if (lpoDetail.success && lpoDetail.data?.lpo) {
                      supplierLpoMap[supplierId] = {
                        lpoId: lpo.id,
                        progressId: lpoDetail.data.lpo.progress_id,
                        progressName: lpoDetail.data.lpo.progress_name || "",
                      };
                    }
                  }
                }
              }
            } catch (error) {
              console.error(
                `Error fetching LPO for supplier ${supplierId}:`,
                error,
              );
            }
          },
        );

        await Promise.all(fetchPromises);
        setLpoPerSupplier(supplierLpoMap);
      } catch (error) {
        console.error("Error fetching LPO per supplier:", error);
      }
    }

    fetchLpoPerSupplier();
  }, [mrLines, mrHeader.progress_id, mrHeader.id]);

  // Add this useEffect after your other useEffects in MrLinesView.tsx
  useEffect(() => {
    // Calculate total invoice amount from lpoLinePrices
    let total = 0;

    // Sum up all LPO line prices
    Object.values(lpoLinePrices).forEach((price) => {
      total += price.totalPrice || 0;
    });

    // If no LPO prices yet, calculate from mrLines using approved prices
    if (total === 0 && mrHeader.progress_id >= 10) {
      for (const category in mrLines) {
        for (const subCategory in mrLines[category]) {
          for (const supplier in mrLines[category][subCategory]) {
            const items = mrLines[category][subCategory][supplier];
            items.forEach((item) => {
              const unitPrice = Number(item.approved_unit_price) || 0;
              // Use proposed quantity if available, otherwise requested quantity
              const proposedQty = Number(item.approved_proposed_quantity) || 0;
              const quantity =
                proposedQty > 0 ? proposedQty : Number(item.quantity) || 0;
              total += unitPrice * quantity;
            });
          }
        }
      }
    }

    setTotalInvoiceAmount(Number(total.toFixed(2)));
  }, [lpoLinePrices, mrLines, mrHeader.progress_id]);

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

  function calculateItemsTotal(items: MrLine[]): number {
    let total = 0;

    items.forEach((item: MrLine) => {
      let unitPrice: number;
      let quantity: number;

      if (mrHeader.progress_id >= 12 && lpoLinePrices[item.id]) {
        // Use LPO prices
        unitPrice = lpoLinePrices[item.id].unitPrice;
        // Use proposed quantity if available, otherwise requested quantity
        const proposedQty = Number(item.approved_proposed_quantity) || 0;
        quantity = proposedQty > 0 ? proposedQty : Number(item.quantity) || 0;
        /* vatRate = lpoLinePrices[item.id].vatRate; */
      } else {
        // Use quotation prices
        unitPrice = Number(item.approved_unit_price) || 0;
        quantity = Number(item.approved_proposed_quantity) || 0;
        /* vatRate = Number(item.approved_vat_rate) || 0; */
      }

      const subtotal = unitPrice * quantity;
      // Don't add VAT to match your original calculation
      total += subtotal;
    });

    return Number(total.toFixed(2));
  }

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

  // Check if all items have qs_review_type set (for QS submit button)
  function allItemsQSReviewed() {
    for (const category in mrLines) {
      for (const subCategory in mrLines[category]) {
        for (const supplier in mrLines[category][subCategory]) {
          const items = mrLines[category][subCategory][supplier];
          for (const item of items) {
            if (!item.qs_review_type) return false;
          }
        }
      }
    }
    return true;
  }

  // Get all flat items from grouped mrLines
  function getAllFlatItems(): MrLine[] {
    const items: MrLine[] = [];
    for (const category in mrLines) {
      for (const subCategory in mrLines[category]) {
        for (const supplier in mrLines[category][subCategory]) {
          items.push(...mrLines[category][subCategory][supplier]);
        }
      }
    }
    return items;
  }

  // Get item_available items
  function getItemAvailableItems(): MrLine[] {
    return getAllFlatItems().filter(
      (l) => l.qs_review_type === "item_available",
    );
  }

  // Check if all stock transfers are complete (for stock transfer submit)
  function allStockTransfersComplete(): boolean {
    const items = getItemAvailableItems();
    if (items.length === 0) return false;
    return items.every((l) => l.stock_transfer_id && l.signed_dn_file);
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

      // ✅ If supplier doesn't exist in status map yet, not ready
      if (!status || !status.hasLpo) {
        return false;
      }

      // ✅ Get supplier type and normalize it
      const supplierType = status.supplierType?.toLowerCase() || "";

      // ✅ Check if it's a credit supplier (skip invoice/signed LPO)
      const isCredit = supplierType.includes("credit");

      // ✅ Check if it's a marketplace/online supplier (skip signed LPO)
      const isMarketplace =
        supplierType.includes("marketplace") || supplierType.includes("online");

      if (isCredit) {
        // ✅ Credit suppliers: ONLY require LPO (no invoice, no signed file)
        continue;
      } else if (isMarketplace) {
        // ✅ Marketplace/Online suppliers: Require LPO + invoice (NO signed file)
        if (!status.hasInvoice) {
          return false;
        }
      } else {
        // ✅ Cash/Local suppliers: Require LPO + invoice + signed file
        if (!status.hasInvoice || !status.hasSignedFile) {
          return false;
        }
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

  // Add this function with your other helper functions
  function hasAnyItemWithBoqReference() {
    for (const category in mrLines) {
      for (const subCategory in mrLines[category]) {
        for (const supplier in mrLines[category][subCategory]) {
          const items = mrLines[category][subCategory][supplier];
          for (const item of items) {
            if (item.boq_line_ids) {
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
                    >
                      ADD CATEGORY & ITEM +
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
                        {userInfo?.departmentID === 8 &&
                          mrHeader.progress_id === 10 && (
                            <PriceApprovalButton
                              progressID={mrHeader.progress_id}
                              mrLine={{} as MrLine}
                              isSmartSelectPortal
                              allMrLines={
                                showByItem
                                  ? { [category]: { [subCategory]: suppliers } }
                                  : mrLinesBySupplier
                              }
                              portalTargetId={`smart-select-portal-${categoryIndex}-${subCategoryIndex}`}
                            />
                          )}

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
                            <table className="items-table two-toned">
                              <thead>
                                <tr>
                                  <th>#</th>
                                  <th>ITEM</th>
                                  {mrHeader.progress_id >= 9 ? (
                                    <>
                                      <th>QTY FOR USE</th>
                                      <th>QTY FOR STOCKS</th>
                                      <th>TOTAL QTY</th>
                                    </>
                                  ) : (
                                    <th>REQUESTED QTY</th>
                                  )}
                                  <th>BOQ REF.</th>
                                  <th>BRAND & SPECS</th>
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
                                    mrHeader.progress_id === 5 ||
                                    mrHeader.progress_id === 11) &&
                                    userInfo?.departmentID ===
                                      mrHeader.department_id && (
                                      <th>ACTIONS</th>
                                    )}
                                  {mrHeader.progress_id === 11 &&
                                    userInfo?.departmentID === 9 && (
                                      <th>ACTIONS</th>
                                    )}
                                  {mrHeader.progress_id === 3 &&
                                    (userInfo?.departmentID === 8 ||
                                      userInfo?.departmentID ===
                                        mrHeader.department_id) && (
                                      <th>QS REVIEW</th>
                                    )}
                                  {mrHeader.progress_id === 3 &&
                                    userInfo?.departmentID === 8 && (
                                      <th>ACTIONS</th>
                                    )}
                                  {mrHeader.progress_id === 2 &&
                                    userInfo?.departmentID === 16 && (
                                      <th>ACTIONS</th>
                                    )}
                                  {mrHeader.progress_id >= 10 &&
                                    mrHeader.progress_id !== 11 && (
                                      <th>
                                        <div
                                          style={{
                                            display: "flex",
                                            gap: "10px",
                                            alignItems: "center",
                                          }}
                                        >
                                          <span>VENDOR & QUOTATION</span>
                                          {userInfo?.departmentID === 8 &&
                                            mrHeader.progress_id === 10 && (
                                              <div
                                                id={`smart-select-portal-${categoryIndex}-${subCategoryIndex}`}
                                              ></div>
                                            )}
                                        </div>
                                      </th>
                                    )}
                                  {mrHeader.progress_id === 7 &&
                                    userInfo?.departmentID === 9 && (
                                      <th>VENDOR & QUOTATION</th>
                                    )}
                                  {mrHeader.progress_id === 9 &&
                                    userInfo?.departmentID === 16 && (
                                      <th>VENDOR & QUOTATION</th>
                                    )}
                                  {mrHeader.progress_id >= 10 &&
                                    canSeePrice && <th>UNIT PRICE</th>}
                                  {mrHeader.progress_id >= 10 &&
                                    canSeePrice && <th>TOTAL PRICE</th>}
                                  {userInfo?.departmentID === 11 &&
                                    mrHeader.progress_id === 4 && (
                                      <th>STOCK TRANSFER</th>
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
                                  {(mrHeader.progress_id === 9 ||
                                    mrHeader.progress_id === 10) &&
                                    (userInfo?.departmentID === 8 ||
                                      userInfo?.departmentID === 16) && (
                                      <th>ACTIONS</th>
                                    )}
                                </tr>
                              </thead>
                              <tbody>
                                {Array.isArray(items) &&
                                  items.map(function (item, itemIndex) {
                                    return (
                                      <tr key={item.id}>
                                        <td>{itemIndex + 1}</td>
                                        <td>
                                          {item.material_description}
                                          {item.qs_review_type ===
                                            "item_available" &&
                                            mrHeader.progress_id <= 4 &&
                                            item.linked_inventory_item_description && (
                                              <div
                                                style={{
                                                  fontSize: "10px",
                                                  color:
                                                    "rgba(26, 216, 135, 1)",
                                                  marginTop: "4px",
                                                  display: "flex",
                                                  alignItems: "center",
                                                  gap: "4px",
                                                }}
                                              >
                                                Item available:{" "}
                                                {
                                                  item.linked_inventory_item_description
                                                }
                                                <img
                                                  src={externalLinkIcon}
                                                  alt=""
                                                  style={{
                                                    width: "10px",
                                                    height: "10px",
                                                    filter:
                                                      "invert(68%) sepia(52%) saturate(531%) hue-rotate(103deg) brightness(92%) contrast(89%)",
                                                  }}
                                                />
                                              </div>
                                            )}
                                        </td>
                                        {mrHeader.progress_id >= 9 ? (
                                          <>
                                            <td>
                                              {formatNumber(item?.quantity)}{" "}
                                              {item.unit}
                                            </td>
                                            <td>
                                              {(() => {
                                                const proposedQty =
                                                  Number(
                                                    item.approved_proposed_quantity,
                                                  ) || 0;
                                                const requestedQty =
                                                  Number(item.quantity) || 0;
                                                const stockQty =
                                                  proposedQty > requestedQty
                                                    ? proposedQty - requestedQty
                                                    : 0;
                                                return stockQty > 0
                                                  ? `${formatNumber(stockQty)} ${item.unit}`
                                                  : "-";
                                              })()}
                                            </td>
                                            <td>
                                              {formatNumber(
                                                item?.approved_proposed_quantity,
                                              )}{" "}
                                              {item.unit}
                                            </td>
                                          </>
                                        ) : (
                                          <td>
                                            {formatNumber(item?.quantity)}{" "}
                                            {item.unit}
                                          </td>
                                        )}
                                        <td>
                                          {item.boq_line_ids ? (
                                            <BoqReferencePopUp
                                              item={item}
                                              mrHeader={mrHeader}
                                            />
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
                                                  <h2>{item.brand || "-"}</h2>

                                                  <br />

                                                  <small>SPECIFICATION</small>
                                                  <h2>
                                                    {item.specification || "-"}
                                                  </h2>
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

                                        {!(
                                          mrHeader.progress_id === 3 &&
                                          userInfo?.departmentID === 8
                                        ) &&
                                          (((mrHeader.progress_id === 5 ||
                                            mrHeader.progress_id === 3 ||
                                            mrHeader.progress_id === 2) &&
                                            userInfo?.departmentID ===
                                              mrHeader.department_id) ||
                                            ((mrHeader.progress_id === 5 ||
                                              mrHeader.progress_id === 3) &&
                                              userInfo?.departmentID === 8) ||
                                            ((mrHeader.progress_id === 5 ||
                                              mrHeader.progress_id === 2) &&
                                              userInfo?.departmentID ===
                                                16)) && (
                                            <td>
                                              <div
                                                style={{
                                                  display: "flex",
                                                  flexDirection: "column",
                                                  gap: "10px",
                                                }}
                                              >
                                                {/* Show QS Review buttons (Item Available / Need Order) */}
                                                {(mrHeader.progress_id === 5 ||
                                                  mrHeader.progress_id === 2) &&
                                                  (userInfo?.departmentID ===
                                                    mrHeader.department_id ||
                                                    userInfo?.departmentID ===
                                                      16 ||
                                                    userInfo?.departmentID ===
                                                      8) && (
                                                    <QSReviewButton
                                                      item={item}
                                                      progressID={
                                                        mrHeader.progress_id
                                                      }
                                                      inventoryMatch={
                                                        inventoryMatches[
                                                          item
                                                            .material_description
                                                        ] || null
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

                                        {/* QS Review column at Manager Approval stage */}
                                        {mrHeader.progress_id === 3 &&
                                          (userInfo?.departmentID === 8 ||
                                            userInfo?.departmentID ===
                                              mrHeader.department_id) && (
                                            <td>
                                              {item.qs_review_type ===
                                              "need_order" ? (
                                                <div
                                                  className="approval-pill"
                                                  style={{
                                                    backgroundColor:
                                                      "rgba(34, 150, 100, 1)",
                                                    color: "white",
                                                  }}
                                                >
                                                  <span
                                                    style={{
                                                      textWrap: "nowrap",
                                                    }}
                                                  >
                                                    Need Order
                                                  </span>
                                                </div>
                                              ) : item.qs_review_type ===
                                                "item_available" ? (
                                                <div
                                                  className="approval-pill"
                                                  style={{
                                                    backgroundColor:
                                                      "rgba(34, 150, 100, 1)",
                                                    color: "white",
                                                  }}
                                                >
                                                  <span
                                                    style={{
                                                      textWrap: "nowrap",
                                                    }}
                                                  >
                                                    {item.linked_inventory_item_description ||
                                                      "Item Available"}
                                                  </span>
                                                  {item.linked_inventory_item_id && (
                                                    <Button
                                                      componentType="link"
                                                      bgColor={"transparent"}
                                                      borderColor={
                                                        "transparent"
                                                      }
                                                      textColor={"black"}
                                                      href={`/inventory/${item.linked_inventory_item_id}`}
                                                      style={{ padding: "0px" }}
                                                    >
                                                      <img
                                                        src={externalLinkIcon}
                                                        alt="view"
                                                        style={{
                                                          filter: "invert(1)",
                                                          cursor: "pointer",
                                                        }}
                                                      />
                                                    </Button>
                                                  )}
                                                </div>
                                              ) : (
                                                "-"
                                              )}
                                            </td>
                                          )}

                                        {/* Manager ACTIONS cell at Manager Approval stage */}
                                        {mrHeader.progress_id === 3 &&
                                          userInfo?.departmentID === 8 && (
                                            <td>
                                              <InitialApprovalButtons
                                                item={item}
                                                progressID={
                                                  mrHeader.progress_id
                                                }
                                              />
                                            </td>
                                          )}

                                        {(mrHeader.progress_id === 1 ||
                                          mrHeader.progress_id === 5 ||
                                          mrHeader.progress_id === 11) &&
                                          userInfo?.departmentID ===
                                            mrHeader.department_id && (
                                            <td>
                                              <div
                                                style={{
                                                  display: "flex",
                                                  gap: "10px",
                                                }}
                                              >
                                                <EditMrItemButton
                                                  projectID={
                                                    mrHeader.project_id
                                                  }
                                                  item={item}
                                                  bgColor="rgba(239, 239, 239, 1)"
                                                  borderColor="rgba(223, 223, 223, 1)"
                                                  textColor="black"
                                                >
                                                  <img
                                                    src={pencilIcon}
                                                    alt="pencil icon"
                                                  />
                                                </EditMrItemButton>

                                                <DeleteMrItemButton
                                                  item={item}
                                                  bgColor="rgba(239, 239, 239, 1)"
                                                  borderColor="rgba(223, 223, 223, 1)"
                                                  textColor="black"
                                                >
                                                  <img
                                                    src={trashIcon}
                                                    alt="trash icon"
                                                  />
                                                </DeleteMrItemButton>
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
                                                  padding: "7px 20px",
                                                }}
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
                                              {/* {canSeePrice && (
                                                <span>
                                                  {item.approved_total_price}{" "}
                                                  AED
                                                </span>
                                              )} */}
                                            </div>
                                          </td>
                                        )}

                                        {mrHeader.progress_id >= 10 &&
                                          canSeePrice && (
                                            <td>
                                              {(() => {
                                                let unitPrice: number;
                                                let vatRate: number;

                                                if (
                                                  mrHeader.progress_id >= 12 &&
                                                  lpoLinePrices[item.id]
                                                ) {
                                                  // Use LPO prices
                                                  unitPrice =
                                                    lpoLinePrices[item.id]
                                                      .unitPrice;
                                                  //vatRate = lpoLinePrices[item.id].vatRate;
                                                } else {
                                                  // Use quotation prices
                                                  unitPrice =
                                                    Number(
                                                      item.approved_unit_price,
                                                    ) || 0;
                                                  //vatRate = Number(item.approved_vat_rate) || 0;
                                                }

                                                //const priceWithVat = unitPrice * (1 + vatRate / 100);
                                                return `AED ${unitPrice.toFixed(2)}`;
                                              })()}
                                            </td>
                                          )}

                                        {mrHeader.progress_id >= 10 &&
                                          canSeePrice && (
                                            <td>
                                              {(() => {
                                                let totalPrice: number;
                                                let vatRate: number;

                                                if (
                                                  mrHeader.progress_id >= 12 &&
                                                  lpoLinePrices[item.id]
                                                ) {
                                                  // Use LPO prices
                                                  totalPrice =
                                                    lpoLinePrices[item.id]
                                                      .totalPrice;
                                                  /* vatRate = lpoLinePrices[item.id].vatRate; */
                                                } else {
                                                  // Use quotation prices
                                                  totalPrice =
                                                    Number(
                                                      item.approved_total_price,
                                                    ) || 0;
                                                  /* vatRate = Number(item.approved_vat_rate) || 0; */
                                                }

                                                /* const priceWithVat = totalPrice * (1 + vatRate / 100); */
                                                return `AED ${totalPrice.toFixed(2)}`;
                                              })()}
                                            </td>
                                          )}

                                        {(mrHeader.progress_id === 9 ||
                                          mrHeader.progress_id === 10) &&
                                          (userInfo?.departmentID === 8 ||
                                            userInfo?.departmentID === 16) && (
                                            <td>
                                              <DeleteMrItemButton
                                                item={item}
                                                bgColor="rgba(239, 239, 239, 1)"
                                                borderColor="rgba(223, 223, 223, 1)"
                                                textColor="black"
                                              >
                                                <img
                                                  src={trashIcon}
                                                  alt="trash icon"
                                                />
                                              </DeleteMrItemButton>
                                            </td>
                                          )}

                                        {/* Stock Transfer actions at progress_id 4 (ALL view - storekeeper only) */}
                                        {userInfo?.departmentID === 11 &&
                                          mrHeader.progress_id === 4 && (
                                            <td>
                                              {item.qs_review_type ===
                                              "item_available" ? (
                                                <div
                                                  style={{
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    gap: "6px",
                                                  }}
                                                >
                                                  {!item.stock_transfer_id ? (
                                                    <MrTransferIssueButton
                                                      item={item}
                                                    />
                                                  ) : (
                                                    <>
                                                      <MrDownloadDnButton
                                                        transactionID={
                                                          item.stock_transfer_id
                                                        }
                                                      />
                                                      <MrUploadSignedDnButton
                                                        transactionID={
                                                          item.stock_transfer_id
                                                        }
                                                        mrLineId={item.id}
                                                      />
                                                    </>
                                                  )}
                                                </div>
                                              ) : (
                                                "-"
                                              )}
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

                              {mrHeader.progress_id >= 10 && canSeePrice && (
                                <tfoot
                                  style={{
                                    borderTop:
                                      "1px solid rgba(239, 239, 239, 1)",
                                  }}
                                >
                                  <tr>
                                    <td colSpan={subtotalLabelColSpan} />
                                    <td
                                      style={{
                                        fontWeight: "600",
                                      }}
                                    >
                                      SUBTOTAL
                                    </td>
                                    <td
                                      style={{
                                        fontWeight: "600",
                                      }}
                                    >
                                      AED{" "}
                                      {calculateItemsTotal(
                                        getAllItemsInSubCategory(suppliers),
                                      ).toFixed(2)}
                                    </td>
                                    {subtotalTrailingColSpan > 0 && (
                                      <td colSpan={subtotalTrailingColSpan} />
                                    )}
                                  </tr>
                                </tfoot>
                              )}
                            </table>

                            <br />
                            <br />
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
                    {userInfo?.departmentID === 8 &&
                      mrHeader.progress_id === 10 && (
                        <PriceApprovalButton
                          progressID={mrHeader.progress_id}
                          mrLine={{} as MrLine}
                          isSmartSelectPortal
                          allMrLines={
                            showByItem
                              ? {
                                  [activeCategory]: {
                                    [subCategory]: suppliers,
                                  },
                                }
                              : mrLinesBySupplier
                          }
                          portalTargetId={`smart-select-portal-specific-${index}`}
                        />
                      )}

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
                        <table className="items-table two-toned">
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>ITEM</th>
                              {mrHeader.progress_id >= 9 ? (
                                <>
                                  <th>QTY FOR USE</th>
                                  <th>QTY FOR STOCKS</th>
                                  <th>TOTAL QTY</th>
                                </>
                              ) : (
                                <th>REQUESTED QTY</th>
                              )}
                              <th>BOQ REF.</th>
                              <th>BRAND & SPECS</th>
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
                                mrHeader.progress_id === 5 ||
                                mrHeader.progress_id === 11) &&
                                userInfo?.departmentID ===
                                  mrHeader.department_id && <th>ACTIONS</th>}
                              {mrHeader.progress_id === 11 &&
                                userInfo?.departmentID === 9 && (
                                  <th>ACTIONS</th>
                                )}
                              {mrHeader.progress_id === 3 &&
                                (userInfo?.departmentID === 8 ||
                                  userInfo?.departmentID ===
                                    mrHeader.department_id) && (
                                  <th>QS REVIEW</th>
                                )}
                              {mrHeader.progress_id === 3 &&
                                userInfo?.departmentID === 8 && (
                                  <th>ACTIONS</th>
                                )}
                              {mrHeader.progress_id === 2 &&
                                userInfo?.departmentID === 16 && (
                                  <th>ACTIONS</th>
                                )}
                              {mrHeader.progress_id >= 10 &&
                                mrHeader.progress_id !== 11 && (
                                  <th>
                                    <div
                                      style={{
                                        display: "flex",
                                        gap: "10px",
                                        alignItems: "center",
                                      }}
                                    >
                                      <span>VENDOR & QUOTATION</span>
                                      {userInfo?.departmentID === 8 &&
                                        mrHeader.progress_id === 10 && (
                                          <div
                                            id={`smart-select-portal-specific-${index}`}
                                          ></div>
                                        )}
                                    </div>
                                  </th>
                                )}
                              {mrHeader.progress_id === 7 &&
                                userInfo?.departmentID === 9 && (
                                  <th>VENDOR & QUOTATION</th>
                                )}
                              {mrHeader.progress_id === 9 &&
                                userInfo?.departmentID === 16 && (
                                  <th>VENDOR & QUOTATION</th>
                                )}
                              {mrHeader.progress_id >= 10 && canSeePrice && (
                                <th>UNIT PRICE</th>
                              )}
                              {mrHeader.progress_id >= 10 && canSeePrice && (
                                <th>TOTAL PRICE</th>
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
                              {(userInfo?.departmentID === 11 ||
                                userInfo?.departmentID === 8) &&
                                mrHeader.progress_id === 4 && (
                                  <th>STOCK TRANSFER</th>
                                )}
                              {(mrHeader.progress_id === 9 ||
                                mrHeader.progress_id === 10) &&
                                (userInfo?.departmentID === 8 ||
                                  userInfo?.departmentID === 16) && (
                                  <th>ACTIONS</th>
                                )}
                            </tr>
                          </thead>
                          <tbody>
                            {Array.isArray(items) &&
                              items.map(function (item, itemIndex) {
                                return (
                                  <tr key={item.id}>
                                    <td>{itemIndex + 1}</td>
                                    <td>
                                      {item.material_description}
                                      {item.qs_review_type ===
                                        "item_available" &&
                                        mrHeader.progress_id <= 4 &&
                                        item.linked_inventory_item_description && (
                                          <div
                                            style={{
                                              fontSize: "10px",
                                              color: "rgba(26, 216, 135, 1)",
                                              marginTop: "4px",
                                              display: "flex",
                                              alignItems: "center",
                                              gap: "4px",
                                            }}
                                          >
                                            Item available:{" "}
                                            {
                                              item.linked_inventory_item_description
                                            }
                                            <img
                                              src={externalLinkIcon}
                                              alt=""
                                              style={{
                                                width: "10px",
                                                height: "10px",
                                                filter:
                                                  "invert(68%) sepia(52%) saturate(531%) hue-rotate(103deg) brightness(92%) contrast(89%)",
                                              }}
                                            />
                                          </div>
                                        )}
                                    </td>
                                    {mrHeader.progress_id >= 9 ? (
                                      <>
                                        <td>
                                          {formatNumber(item?.quantity)}{" "}
                                          {item.unit}
                                        </td>
                                        <td>
                                          {(() => {
                                            const proposedQty =
                                              Number(
                                                item.approved_proposed_quantity,
                                              ) || 0;
                                            const requestedQty =
                                              Number(item.quantity) || 0;
                                            const stockQty =
                                              proposedQty > requestedQty
                                                ? proposedQty - requestedQty
                                                : 0;
                                            return stockQty > 0
                                              ? `${formatNumber(stockQty)} ${item.unit}`
                                              : "-";
                                          })()}
                                        </td>
                                        <td>
                                          {formatNumber(
                                            item?.approved_proposed_quantity,
                                          )}{" "}
                                          {item.unit}
                                        </td>
                                      </>
                                    ) : (
                                      <td>
                                        {formatNumber(item?.quantity)}{" "}
                                        {item.unit}
                                      </td>
                                    )}
                                    <td>
                                      {item.boq_line_ids ? (
                                        <BoqReferencePopUp
                                          item={item}
                                          mrHeader={mrHeader}
                                        />
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
                                              <h2>{item.brand || "-"}</h2>

                                              <br />

                                              <small>SPECIFICATION</small>
                                              <h2>
                                                {item.specification || "-"}
                                              </h2>
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

                                    {!(
                                      mrHeader.progress_id === 3 &&
                                      userInfo?.departmentID === 8
                                    ) &&
                                      (((mrHeader.progress_id === 5 ||
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
                                            {/* Show QS Review buttons (Item Available / Need Order) */}
                                            {(mrHeader.progress_id === 5 ||
                                              mrHeader.progress_id === 2) &&
                                              (userInfo?.departmentID ===
                                                mrHeader.department_id ||
                                                userInfo?.departmentID === 16 ||
                                                userInfo?.departmentID ===
                                                  8) && (
                                                <QSReviewButton
                                                  item={item}
                                                  progressID={
                                                    mrHeader.progress_id
                                                  }
                                                  inventoryMatch={
                                                    inventoryMatches[
                                                      item.material_description
                                                    ] || null
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

                                    {/* QS Review column at Manager Approval stage (supplier view) */}
                                    {mrHeader.progress_id === 3 &&
                                      (userInfo?.departmentID === 8 ||
                                        userInfo?.departmentID ===
                                          mrHeader.department_id) && (
                                        <td>
                                          {item.qs_review_type ===
                                          "need_order" ? (
                                            <div
                                              className="approval-pill"
                                              style={{
                                                backgroundColor:
                                                  "rgba(34, 150, 100, 1)",
                                                color: "white",
                                              }}
                                            >
                                              <span
                                                style={{ textWrap: "nowrap" }}
                                              >
                                                Need Order
                                              </span>
                                            </div>
                                          ) : item.qs_review_type ===
                                            "item_available" ? (
                                            <div
                                              className="approval-pill"
                                              style={{
                                                backgroundColor:
                                                  "rgba(34, 150, 100, 1)",
                                                color: "white",
                                              }}
                                            >
                                              <span
                                                style={{ textWrap: "nowrap" }}
                                              >
                                                {item.linked_inventory_item_description ||
                                                  "Item Available"}
                                              </span>
                                              {item.linked_inventory_item_id && (
                                                <Button
                                                  componentType="link"
                                                  bgColor={"transparent"}
                                                  borderColor={"transparent"}
                                                  textColor={"black"}
                                                  href={`/inventory/${item.linked_inventory_item_id}`}
                                                  style={{ padding: "0px" }}
                                                >
                                                  <img
                                                    src={externalLinkIcon}
                                                    alt="view"
                                                    style={{
                                                      filter: "invert(1)",
                                                      cursor: "pointer",
                                                    }}
                                                  />
                                                </Button>
                                              )}
                                            </div>
                                          ) : (
                                            "-"
                                          )}
                                        </td>
                                      )}

                                    {/* Manager ACTIONS cell at Manager Approval stage (supplier view) */}
                                    {mrHeader.progress_id === 3 &&
                                      userInfo?.departmentID === 8 && (
                                        <td>
                                          <InitialApprovalButtons
                                            item={item}
                                            progressID={mrHeader.progress_id}
                                          />
                                        </td>
                                      )}

                                    {(mrHeader.progress_id === 1 ||
                                      mrHeader.progress_id === 5 ||
                                      mrHeader.progress_id === 11) &&
                                      userInfo?.departmentID ===
                                        mrHeader.department_id && (
                                        <td>
                                          <div
                                            style={{
                                              display: "flex",
                                              gap: "10px",
                                            }}
                                          >
                                            <EditMrItemButton
                                              projectID={mrHeader.project_id}
                                              item={item}
                                              bgColor="rgba(239, 239, 239, 1)"
                                              borderColor="rgba(223, 223, 223, 1)"
                                              textColor="black"
                                            >
                                              <img
                                                src={pencilIcon}
                                                alt="pencil icon"
                                              />
                                            </EditMrItemButton>

                                            <DeleteMrItemButton
                                              item={item}
                                              bgColor="rgba(239, 239, 239, 1)"
                                              borderColor="rgba(223, 223, 223, 1)"
                                              textColor="black"
                                            >
                                              <img
                                                src={trashIcon}
                                                alt="trash icon"
                                              />
                                            </DeleteMrItemButton>
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
                                              padding: "7px 20px",
                                            }}
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
                                          {/* {canSeePrice && (
                                            <span>
                                              {item.approved_total_price} AED
                                            </span>
                                          )} */}
                                        </div>
                                      </td>
                                    )}

                                    {mrHeader.progress_id >= 10 &&
                                      canSeePrice && (
                                        <td>
                                          {(() => {
                                            let unitPrice: number;
                                            let vatRate: number;

                                            if (
                                              mrHeader.progress_id >= 12 &&
                                              lpoLinePrices[item.id]
                                            ) {
                                              // Use LPO prices
                                              unitPrice =
                                                lpoLinePrices[item.id]
                                                  .unitPrice;
                                              //vatRate = lpoLinePrices[item.id].vatRate;
                                            } else {
                                              // Use quotation prices
                                              unitPrice =
                                                Number(
                                                  item.approved_unit_price,
                                                ) || 0;
                                              //vatRate = Number(item.approved_vat_rate) || 0;
                                            }

                                            //const priceWithVat = unitPrice * (1 + vatRate / 100);
                                            return `AED ${unitPrice.toFixed(2)}`;
                                          })()}
                                        </td>
                                      )}

                                    {mrHeader.progress_id >= 10 &&
                                      canSeePrice && (
                                        <td>
                                          {(() => {
                                            let totalPrice: number;
                                            let vatRate: number;

                                            if (
                                              mrHeader.progress_id >= 12 &&
                                              lpoLinePrices[item.id]
                                            ) {
                                              // Use LPO prices
                                              totalPrice =
                                                lpoLinePrices[item.id]
                                                  .totalPrice;
                                              /* vatRate = lpoLinePrices[item.id].vatRate; */
                                            } else {
                                              // Use quotation prices
                                              totalPrice =
                                                Number(
                                                  item.approved_total_price,
                                                ) || 0;
                                              /* vatRate = Number(item.approved_vat_rate) || 0; */
                                            }

                                            /* const priceWithVat = totalPrice * (1 + vatRate / 100); */
                                            return `AED ${totalPrice.toFixed(2)}`;
                                          })()}
                                        </td>
                                      )}

                                    {(mrHeader.progress_id === 9 ||
                                      mrHeader.progress_id === 10) &&
                                      (userInfo?.departmentID === 8 ||
                                        userInfo?.departmentID === 16) && (
                                        <td>
                                          <DeleteMrItemButton
                                            item={item}
                                            bgColor="rgba(239, 239, 239, 1)"
                                            borderColor="rgba(223, 223, 223, 1)"
                                            textColor="black"
                                          >
                                            <img
                                              src={trashIcon}
                                              alt="trash icon"
                                            />
                                          </DeleteMrItemButton>
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

                                    {/* Stock Transfer actions at progress_id 4 (specific category view) */}
                                    {(userInfo?.departmentID === 11 ||
                                      userInfo?.departmentID === 8) &&
                                      mrHeader.progress_id === 4 && (
                                        <td>
                                          {item.qs_review_type ===
                                          "item_available" ? (
                                            <div
                                              style={{
                                                display: "flex",
                                                flexDirection: "column",
                                                gap: "6px",
                                              }}
                                            >
                                              {!item.stock_transfer_id ? (
                                                <MrTransferIssueButton
                                                  item={item}
                                                />
                                              ) : (
                                                <>
                                                  <MrDownloadDnButton
                                                    transactionID={
                                                      item.stock_transfer_id
                                                    }
                                                  />
                                                  <MrUploadSignedDnButton
                                                    transactionID={
                                                      item.stock_transfer_id
                                                    }
                                                    mrLineId={item.id}
                                                  />
                                                </>
                                              )}
                                            </div>
                                          ) : (
                                            "-"
                                          )}
                                        </td>
                                      )}
                                  </tr>
                                );
                              })}
                          </tbody>

                          {mrHeader.progress_id >= 10 && canSeePrice && (
                            <tfoot
                              style={{
                                borderTop: "1px solid rgba(239, 239, 239, 1)",
                              }}
                            >
                              <tr>
                                <td colSpan={subtotalLabelColSpan} />
                                <td
                                  style={{
                                    fontWeight: "600",
                                    
                                  }}
                                >
                                  SUBTOTAL
                                </td>
                                <td
                                  style={{
                                    fontWeight: "600",
                                    
                                  }}
                                >
                                  AED{" "}
                                  {calculateItemsTotal(
                                    getAllItemsInSubCategory(suppliers),
                                  ).toFixed(2)}
                                </td>
                                {subtotalTrailingColSpan > 0 && (
                                  <td colSpan={subtotalTrailingColSpan} />
                                )}
                              </tr>
                            </tfoot>
                          )}
                        </table>

                        <br />
                        <br />
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
              <div
                style={{ display: "flex", gap: "10px", alignItems: "center" }}
              >
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

                {/* LPO Progress Badge + View LPO link */}
                {mrHeader.progress_id >= 13 &&
                  items[0]?.approved_supplier_id &&
                  lpoPerSupplier[items[0].approved_supplier_id] &&
                  (() => {
                    const lpoInfo =
                      lpoPerSupplier[items[0].approved_supplier_id];
                    const isLpoRejected = ["reject", "fail"].some((word) =>
                      lpoInfo.progressName?.toLowerCase().includes(word),
                    );
                    const isLpoCompleted = lpoInfo.progressId === 25;
                    const lpoProgressStyle = isLpoRejected
                      ? {
                          backgroundColor: "rgba(255, 181, 181, 1)",
                          color: "rgba(248, 77, 77, 1)",
                        }
                      : isLpoCompleted
                        ? {
                            backgroundColor: "rgba(87, 244, 176, 1)",
                            color: "rgba(31, 101, 71, 1)",
                          }
                        : {
                            backgroundColor: "rgba(255, 250, 189, 1)",
                            color: "rgba(134, 83, 47, 1)",
                          };

                    return (
                      <>
                        <span
                          className="approval-pill normal-text"
                          style={{
                            ...lpoProgressStyle,
                            textTransform: "uppercase",
                            fontSize: "11px",
                            padding: "4px 10px",
                          }}
                        >
                          {lpoInfo.progressName}
                        </span>
                        <Button
                          componentType="link"
                          bgColor="black"
                          borderColor="black"
                          textColor="white"
                          href={`/mr/${mrHeader.id}/lpo/${lpoInfo.lpoId}`}
                          style={{
                            padding: "5px 15px",
                            borderRadius: "50px",
                            fontSize: "11px",
                            fontWeight: "600",
                          }}
                        >
                          VIEW LPO &gt;
                        </Button>
                      </>
                    );
                  })()}
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
                    />
                  )}

                {(userInfo?.departmentID === 8 ||
                  userInfo?.departmentID === 9) &&
                  mrHeader.progress_id === 13 && (
                    <PaymentButtons
                      mrHeader={mrHeader}
                      mrLine={items[0]}
                      supplierId={items[0].approved_supplier_id}
                    />
                  )}

                {mrHeader.progress_id > 14 && (
                  <PaymentButtons
                    mrHeader={mrHeader}
                    mrLine={items[0]}
                    supplierId={items[0].approved_supplier_id}
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

            <table className="items-table two-toned">
              <thead>
                <tr>
                  <th>#</th>
                  <th>CATEGORY</th>
                  <th>SUBCATEGORY</th>
                  <th>ITEM</th>
                  {mrHeader.progress_id >= 9 ? (
                    <>
                      <th>QTY FOR USE</th>
                      <th>QTY FOR STOCKS</th>
                      <th>TOTAL QTY</th>
                    </>
                  ) : (
                    <th>REQUESTED QTY</th>
                  )}
                  <th>BOQ REF.</th>
                  <th>BRAND & SPECS</th>
                  {/* {mrHeader.progress_id >= 12 && <th>VENDOR & QUOTATION</th>} */}
                  <th>ATTACHMENT</th>
                  {mrHeader.progress_id >= 10 && canSeePrice && (
                    <th>UNIT PRICE</th>
                  )}
                  {mrHeader.progress_id >= 10 && canSeePrice && (
                    <th>TOTAL PRICE</th>
                  )}
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
                    <td>
                      {item.material_description}
                      {item.qs_review_type === "item_available" &&
                        mrHeader.progress_id <= 4 &&
                        item.linked_inventory_item_description && (
                          <div
                            style={{
                              fontSize: "10px",
                              color: "rgba(26, 216, 135, 1)",
                              marginTop: "4px",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            Item available:{" "}
                            {item.linked_inventory_item_description}
                            <img
                              src={externalLinkIcon}
                              alt=""
                              style={{
                                width: "10px",
                                height: "10px",
                                filter:
                                  "invert(68%) sepia(52%) saturate(531%) hue-rotate(103deg) brightness(92%) contrast(89%)",
                              }}
                            />
                          </div>
                        )}
                    </td>
                    {mrHeader.progress_id >= 9 ? (
                      <>
                        <td>
                          {formatNumber(item?.quantity)} {item.unit}
                        </td>
                        <td>
                          {(() => {
                            const proposedQty =
                              Number(item.approved_proposed_quantity) || 0;
                            const requestedQty = Number(item.quantity) || 0;
                            const stockQty =
                              proposedQty > requestedQty
                                ? proposedQty - requestedQty
                                : 0;
                            return stockQty > 0
                              ? `${formatNumber(stockQty)} ${item.unit}`
                              : "-";
                          })()}
                        </td>
                        <td>
                          {formatNumber(item?.approved_proposed_quantity)}{" "}
                          {item.unit}
                        </td>
                      </>
                    ) : (
                      <td>
                        {formatNumber(item?.quantity)} {item.unit}
                      </td>
                    )}
                    <td>
                      {item.boq_line_ids ? (
                        <BoqReferencePopUp item={item} mrHeader={mrHeader} />
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
                              <h2>{item.brand || "-"}</h2>

                              <br />

                              <small>SPECIFICATION</small>
                              <h2>{item.specification || "-"}</h2>
                            </>
                          }
                          header="BRAND & SPECIFICATION"
                        />
                      ) : (
                        "-"
                      )}
                    </td>

                    {/* {mrHeader.progress_id >= 12 && (
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
                          {canSeePrice && (
                            <span>{item.approved_total_price} AED</span>
                          )}
                        </div>
                      </td>
                    )} */}

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
                          <img src={externalLinkIcon} alt="external link" />
                        </Button>
                      ) : (
                        "-"
                      )}
                    </td>

                    {mrHeader.progress_id >= 10 && canSeePrice && (
                      <td>
                        {(() => {
                          let unitPrice: number;

                          if (
                            mrHeader.progress_id >= 12 &&
                            lpoLinePrices[item.id]
                          ) {
                            // Use LPO prices
                            unitPrice = lpoLinePrices[item.id].unitPrice;
                            //vatRate = lpoLinePrices[item.id].vatRate;
                          } else {
                            // Use quotation prices
                            unitPrice = Number(item.approved_unit_price) || 0;
                            //vatRate = Number(item.approved_vat_rate) || 0;
                          }

                          //const priceWithVat = unitPrice * (1 + vatRate / 100);
                          return `AED ${unitPrice.toFixed(2)}`;
                        })()}
                      </td>
                    )}

                    {mrHeader.progress_id >= 10 && canSeePrice && (
                      <td>
                        {(() => {
                          let totalPrice: number;

                          if (
                            mrHeader.progress_id >= 12 &&
                            lpoLinePrices[item.id]
                          ) {
                            // Use LPO prices
                            totalPrice = lpoLinePrices[item.id].totalPrice;
                            /* vatRate = lpoLinePrices[item.id].vatRate; */
                          } else {
                            // Use quotation prices
                            totalPrice = Number(item.approved_total_price) || 0;
                            /* vatRate = Number(item.approved_vat_rate) || 0; */
                          }

                          /* const priceWithVat = totalPrice * (1 + vatRate / 100); */
                          return `AED ${totalPrice.toFixed(2)}`;
                        })()}
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

              {mrHeader.progress_id >= 10 && canSeePrice && (
                <tfoot
                  style={{
                    borderTop: "1px solid rgba(239, 239, 239, 1)",
                  }}
                >
                  <tr>
                    <td colSpan={subtotalLabelColSpanByItem} />
                    <td
                      style={{
                        fontWeight: "600",
                        
                      }}
                    >
                      SUBTOTAL
                    </td>
                    <td
                      style={{
                        fontWeight: "600",
                        
                      }}
                    >
                      AED {calculateItemsTotal(items).toFixed(2)}
                    </td>
                    {subtotalTrailingColSpan > 0 && (
                      <td colSpan={subtotalTrailingColSpan} />
                    )}
                  </tr>
                </tfoot>
              )}
            </table>

            <br />
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
            {/* ✅ Check if any item has BOQ reference */}
            {hasAnyItemWithBoqReference() ? (
              // If any item has BOQ → Submit for QS Approval
              <SubmitForQSApprovalButton
                mrHeader={mrHeader}
                disabled={hasAnyRejectedItems() || hasAnyQSRejectedItems()}
                style={{
                  opacity:
                    hasAnyRejectedItems() || hasAnyQSRejectedItems()
                      ? "0.5"
                      : "1",
                  cursor:
                    hasAnyRejectedItems() || hasAnyQSRejectedItems()
                      ? "not-allowed"
                      : "pointer",
                  pointerEvents:
                    hasAnyRejectedItems() || hasAnyQSRejectedItems()
                      ? "none"
                      : "auto",
                }}
              />
            ) : (
              // If no items have BOQ → Submit directly to Manager Approval
              <SubmitForInitialApprovalButton
                mrHeader={mrHeader}
                progressId={mrHeader.progress_id}
                disabled={hasAnyRejectedItems()}
                style={{
                  opacity: hasAnyRejectedItems() ? "0.5" : "1",
                  cursor: hasAnyRejectedItems() ? "not-allowed" : "pointer",
                  pointerEvents: hasAnyRejectedItems() ? "none" : "auto",
                }}
              />
            )}
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
            <SubmitForResubmissionButton mrHeader={mrHeader} />
          ) : (
            <SubmitForQuotationsButton
              mrHeader={mrHeader}
              progressId={mrHeader.progress_id}
              disabled={!allItemsApproved()}
              label={(() => {
                const allItems = getAllFlatItems();
                const hasItemAvailable = allItems.some(
                  (l) => l.qs_review_type === "item_available",
                );
                return hasItemAvailable
                  ? "SUBMIT FOR STOCK TRANSFER"
                  : "SUBMIT FOR QUOTATIONS";
              })()}
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

          <SubmitForInitialApprovalButton
            mrHeader={mrHeader}
            progressId={mrHeader.progress_id}
            disabled={!allItemsQSReviewed()}
            style={{
              opacity: !allItemsQSReviewed() ? "0.5" : "1",
              cursor: !allItemsQSReviewed() ? "not-allowed" : "pointer",
              pointerEvents: !allItemsQSReviewed() ? "none" : "auto",
            }}
          />
        </div>
      )}

      {/* Stock Transfer (Progress 4) - Storekeeper actions */}
      {(userInfo?.departmentID === 11 || userInfo?.departmentID === 8) &&
        mrHeader.progress_id === 4 && (
          <div className="bottom-nav">
            <div></div>
            <SubmitForStockTransferCompletion
              mrHeader={mrHeader}
              mrLines={getAllFlatItems()}
            />
          </div>
        )}

      {/* Awaiting Quotations / Price Approval Rejected (Progress 7 or 11) - Procurement Submit for Pricing Approval */}
      {userInfo?.departmentID === 9 &&
        (mrHeader.progress_id === 7 || mrHeader.progress_id === 11) && (
          <div className="bottom-nav">
            <div></div>

            {/* ✅ Check if any item has BOQ reference */}
            {hasAnyItemWithBoqReference() ? (
              // If any item has BOQ → Submit for QS Price Approval
              <SubmitForQSPricingApprovalButton
                mrHeaderID={mrHeader.id}
                disabled={
                  !allItemsHaveSupplierQuotations() ||
                  hasAnyRejectedSuppliers() ||
                  hasAnyQSRejectedSuppliers()
                }
                style={{
                  opacity:
                    !allItemsHaveSupplierQuotations() ||
                    hasAnyRejectedSuppliers() ||
                    hasAnyQSRejectedSuppliers()
                      ? "0.5"
                      : "1",
                  cursor:
                    !allItemsHaveSupplierQuotations() ||
                    hasAnyRejectedSuppliers() ||
                    hasAnyQSRejectedSuppliers()
                      ? "not-allowed"
                      : "pointer",
                  pointerEvents:
                    !allItemsHaveSupplierQuotations() ||
                    hasAnyRejectedSuppliers() ||
                    hasAnyQSRejectedSuppliers()
                      ? "none"
                      : "auto",
                }}
              />
            ) : (
              // If no items have BOQ → Submit directly to Manager Price Approval
              <SubmitForPricingApprovalButton
                mrHeaderID={mrHeader.id}
                progressId={mrHeader.progress_id}
                disabled={
                  !allItemsHaveSupplierQuotations() || hasAnyRejectedSuppliers()
                }
                style={{
                  opacity:
                    !allItemsHaveSupplierQuotations() ||
                    hasAnyRejectedSuppliers()
                      ? "0.5"
                      : "1",
                  cursor:
                    !allItemsHaveSupplierQuotations() ||
                    hasAnyRejectedSuppliers()
                      ? "not-allowed"
                      : "pointer",
                  pointerEvents:
                    !allItemsHaveSupplierQuotations() ||
                    hasAnyRejectedSuppliers()
                      ? "none"
                      : "auto",
                }}
              />
            )}
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
              progressId={mrHeader.progress_id}
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

      {/* LPO & Invoice (Progress 12) - Procurement Submit for Payment */}
      {/* LPO & Invoice (Progress 12) - Procurement Submit for Payment */}
      {userInfo?.departmentID === 9 && mrHeader.progress_id === 12 && (
        <div className="bottom-nav">
          <div></div>
          {(() => {
            // Build suppliers array from your existing data
            const suppliersArray: SupplierInfo[] = [];

            for (const category in mrLines) {
              for (const subCategory in mrLines[category]) {
                for (const supplierName in mrLines[category][subCategory]) {
                  const items = mrLines[category][subCategory][supplierName];
                  if (items.length > 0) {
                    const supplierId = items[0].approved_supplier_id;
                    const lpoInfo = supplierId
                      ? lpoPerSupplier[supplierId]
                      : null;
                    const lpoStatus = supplierId
                      ? lpoInvoiceStatus[supplierId]
                      : null;

                    if (lpoInfo && lpoStatus?.hasLpo) {
                      suppliersArray.push({
                        supplierId: supplierId!,
                        lpoId: lpoInfo.lpoId,
                        supplierType: lpoStatus.supplierType || "unknown",
                        supplierName: supplierName,
                      });
                    }
                  }
                }
              }
            }

            return (
              <SubmitForPaymentButton
                mrHeaderID={mrHeader.id}
                suppliers={suppliersArray}
                disabled={
                  !allSuppliersHaveLpoWithInvoicesAndSignedFiles() ||
                  suppliersArray.length === 0
                }
                mode="multi"
                paymentValue={totalInvoiceAmount}
                style={{
                  opacity: !allSuppliersHaveLpoWithInvoicesAndSignedFiles()
                    ? "0.5"
                    : "1",
                  cursor: !allSuppliersHaveLpoWithInvoicesAndSignedFiles()
                    ? "not-allowed"
                    : "pointer",
                }}
              />
            );
          })()}
        </div>
      )}
    </>
  );
}
