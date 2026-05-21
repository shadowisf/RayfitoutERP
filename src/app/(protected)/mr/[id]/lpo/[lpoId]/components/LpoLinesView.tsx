"use client";

import { useState, useEffect } from "react";
import { MrLine } from "../../../types/mrLine";
import { MrHeader } from "../../../types/mrHeader";
import { useAuth } from "@/app/context/AuthContext";
import Button from "@/app/components/Button";
import BoqReferencePopUp from "../../../../components/BoqReferencePopUp";
import SupplierDetailsPopUp from "../../../../components/SupplierDetailsPopUp";
import InfoPopUpButton from "@/app/components/_InfoPopUpButton";
import IssueLPOButton from "../../../components/procurement/_IssueLPOButton";
import PaymentButtons from "./finance/_PaymentButtons";
import SubmitForPaymentButton from "../../../components/procurement/_SubmitForPaymentButton";
import SubmitForDeliveryButton from "./finance/_SubmitForDeliveryButton";
import SubmitForLPOResubmissionButton from "./finance/_SubmitForLPOResubmission";
import SubmitForLPOResubmissionGRNFailButton from "./storekeeper/_SubmitForLPOResubmissionGRNFail";
/* TEMPORARILY DISABLED QC/CR
import SubmitForStockEntryButton from "./qualityControl/_SubmitForStockEntry";
import QCCheckListButton from "./qualityControl/_QCCheckListButton";
import DownloadCRButton from "@/app/(protected)/resolution/components/_DownloadCRButton";
*/
import CompleteMaterialRequestButton from "./storekeeper/_CompleteMaterialRequestButton";
import CreateGRNButton from "./storekeeper/_CreateGRNButton";
import SubmitForQCButton from "./storekeeper/_SubmitForQCButton";
import AddToInventoryButton from "./storekeeper/_AddStockButton";
import CommentsSection from "@/app/components/CommentsSection";
import { formatPriceAED } from "@/lib/formatPrice";
import DocumentsPopup from "./storekeeper/_DocumentPopUpButton";

type GroupedMrLines = {
  [category: string]: {
    [subCategory: string]: {
      [supplier: string]: MrLine[];
    };
  };
};

type LpoLinesViewProps = {
  lpoLines: GroupedMrLines;
  lpo: any; // LPO data from getLPOWithLines
  flatLines: any[];
  mrHeader: MrHeader;
  refreshKey?: number; // Changes on every server re-render to force useEffect re-runs
};

export default function LpoLinesView({
  lpoLines,
  lpo,
  flatLines,
  mrHeader,
  refreshKey,
}: LpoLinesViewProps) {
  const { userInfo } = useAuth();

  const externalLinkIcon = "/icons/external-link.svg";

  // Use the LPO's progress_id for stage-based logic
  const progressId = lpo.progress_id;
  const lpoId = lpo.id;

  // Payment status tracking
  const [lpoPaymentStatus, setLpoPaymentStatus] = useState<
    "approved" | "rejected" | "pending"
  >("pending");
  const [isCheckingPaymentStatus, setIsCheckingPaymentStatus] =
    useState<boolean>(true);

  // GRN status tracking
  const [hasGrn, setHasGrn] = useState<boolean>(false);
  const [isCheckingGrn, setIsCheckingGrn] = useState<boolean>(true);

  // GRN quantity mismatch tracking
  const [hasGrnQuantityMismatch, setHasGrnQuantityMismatch] =
    useState<boolean>(false);
  const [isCheckingGrnQuantity, setIsCheckingGrnQuantity] =
    useState<boolean>(true);

  // QC status tracking
  const [qcStatus, setQcStatus] = useState<{
    [itemId: number]: "passed" | "failed" | "pending";
  }>({});
  const [qcIds, setQcIds] = useState<{ [itemId: number]: number }>({});
  const [isCheckingQc, setIsCheckingQc] = useState<boolean>(true);

  // Inventory status tracking
  const [inventoryStatus, setInventoryStatus] = useState<{
    [itemId: number]: boolean;
  }>({});
  const [isCheckingInventory, setIsCheckingInventory] = useState<boolean>(true);

  // LPO invoice status
  const [lpoInvoiceStatus, setLpoInvoiceStatus] = useState<{
    hasLpo: boolean;
    hasInvoice: boolean;
    hasSignedFile: boolean;
    supplierType: string;
  }>({
    hasLpo: false,
    hasInvoice: false,
    hasSignedFile: false,
    supplierType: "",
  });
  const [isCheckingLpoInvoices, setIsCheckingLpoInvoices] =
    useState<boolean>(true);

  // Total invoice amount
  const [totalInvoiceAmount, setTotalInvoiceAmount] = useState(0);

  const canSeePrice =
    userInfo?.departmentID === 8 ||
    userInfo?.departmentID === 9 ||
    userInfo?.departmentID === 12 ||
    userInfo?.departmentID === 10 ||
    userInfo?.departmentID === 16;

  const formatNumber = (value: unknown): string => {
    const num = Number(value);
    if (isNaN(num)) return "";
    if (Number.isInteger(num)) return num.toString();
    return parseFloat(num.toFixed(3)).toString();
  };

  // Get all items flattened from lpoLines
  const allItems: MrLine[] = [];
  for (const category in lpoLines) {
    for (const subCategory in lpoLines[category]) {
      for (const supplier in lpoLines[category][subCategory]) {
        allItems.push(...lpoLines[category][subCategory][supplier]);
      }
    }
  }

  // Conditionally hide columns when all rows have no value
  const hasAnyAttachment = allItems.some((item) => !!item.attachment);
  const hasAnyBrandSpecs = allItems.some(
    (item) => !!(item.brand || item.specification),
  );
  const hasAnyQtyStocks = allItems.some((item) => {
    const proposedQty = Number(item.approved_proposed_quantity) || 0;
    const requestedQty = Number(item.quantity) || 0;
    return proposedQty > requestedQty;
  });

  // ============================================
  // DYNAMIC COLUMN CALCULATION FOR ALIGNMENT
  // ============================================

  // Base columns: #, CATEGORY, SUBCATEGORY, ITEM, QTY USE, [QTY STOCKS], TOTAL QTY, BOQ REF, [BRAND & SPECS], [ATTACHMENT]
  // Minimum always-visible: #, CATEGORY, SUBCATEGORY, ITEM, QTY USE, TOTAL QTY, BOQ REF = 7
  const BASE_COLUMN_COUNT =
    7 +
    (hasAnyQtyStocks ? 1 : 0) +
    (hasAnyBrandSpecs ? 1 : 0) +
    (hasAnyAttachment ? 1 : 0);

  // Price columns visibility
  const hasPriceColumns = canSeePrice;
  const priceColumnCount = hasPriceColumns ? 2 : 0; // UNIT PRICE and TOTAL PRICE

  // Action columns (conditional based on progress and department)
  // TEMPORARILY DISABLED QC/CR columns
  const hasQcColumn = false; // was: userInfo?.departmentID === 12 && progressId === 21;
  const hasCrColumn = false; // was: progressId >= 21;
  const hasStocksColumn = progressId === 24 && userInfo?.departmentID === 11;
  const actionColumnCount = [hasQcColumn, hasCrColumn, hasStocksColumn].filter(
    Boolean,
  ).length;

  // Total visible columns in the table
  const totalVisibleColumns =
    BASE_COLUMN_COUNT + priceColumnCount + actionColumnCount;

  // For summary rows: we need to span across the base columns to align with price columns
  // If prices are visible, SUBTOTAL label aligns with UNIT PRICE (column 11)
  // If prices are hidden, we span everything
  const summaryLabelColSpan = BASE_COLUMN_COUNT;
  const summaryValueColSpan = 1;
  const summaryTrailingColSpan = actionColumnCount > 0 ? actionColumnCount : 0;

  // ============================================

  // Filter out failed QC items at stock entry stage and beyond
  const displayItems: MrLine[] =
    progressId >= 24 && !isCheckingQc
      ? allItems.filter((item) => qcStatus[item.id] !== "failed")
      : allItems;

  // Calculate total from flatLines (LPO prices) using proposed quantity when available
  useEffect(() => {
    let total = 0;
    flatLines.forEach((line: any) => {
      const unitPrice = Number(line.lpo_unit_price) || 0;
      // Find the corresponding MrLine item to get proposed quantity
      const mrLineItem = allItems.find((item) => item.id === line.id);
      const proposedQty = mrLineItem
        ? Number(mrLineItem.approved_proposed_quantity) || 0
        : 0;
      const requestedQty = Number(line.quantity) || 0;
      const totalQty = proposedQty > 0 ? proposedQty : requestedQty;
      total += unitPrice * totalQty;
    });
    setTotalInvoiceAmount(Number(total.toFixed(2)));
  }, [flatLines, allItems.length]);

  // Check LPO invoice status
  useEffect(() => {
    async function checkLpoInvoices() {
      if (progressId !== 12 && progressId !== 13 && progressId !== 16) {
        setIsCheckingLpoInvoices(false);
        return;
      }

      setIsCheckingLpoInvoices(true);

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo/getLPODetails`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lpo_id: lpoId }),
          },
        );

        if (response.ok) {
          const data = await response.json();

          if (data.success && data.data) {
            const lpoDetails = data.data;

            let hasInvoice = false;
            if (lpoDetails.invoice_file) {
              try {
                const parsedFiles =
                  typeof lpoDetails.invoice_file === "string"
                    ? JSON.parse(lpoDetails.invoice_file)
                    : lpoDetails.invoice_file;
                hasInvoice =
                  Array.isArray(parsedFiles) && parsedFiles.length > 0;
              } catch {
                hasInvoice = false;
              }
            }

            let hasSignedFile = false;
            if (lpoDetails.signed_file) {
              try {
                const parsedFiles =
                  typeof lpoDetails.signed_file === "string"
                    ? JSON.parse(lpoDetails.signed_file)
                    : lpoDetails.signed_file;
                hasSignedFile =
                  Array.isArray(parsedFiles) && parsedFiles.length > 0;
              } catch {
                hasSignedFile = false;
              }
            }

            setLpoInvoiceStatus({
              hasLpo: true,
              hasInvoice,
              hasSignedFile,
              supplierType: lpo.supplier_type || "",
            });
          }
        }
      } catch (error) {
        console.error("Error checking LPO invoices:", error);
      } finally {
        setIsCheckingLpoInvoices(false);
      }
    }

    checkLpoInvoices();
  }, [progressId, lpoId, refreshKey]);

  // Check payment status
  useEffect(() => {
    async function checkPaymentStatus() {
      if (progressId !== 14) {
        setIsCheckingPaymentStatus(false);
        return;
      }

      setIsCheckingPaymentStatus(true);

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo/getLPODetails`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lpo_id: lpoId }),
          },
        );

        if (response.ok) {
          const data = await response.json();

          if (data.success && data.data) {
            const paymentStatus = data.data.payment_status;
            if (!paymentStatus) {
              setLpoPaymentStatus("pending");
            } else if (paymentStatus.toLowerCase() === "approved") {
              setLpoPaymentStatus("approved");
            } else if (paymentStatus.toLowerCase() === "rejected") {
              setLpoPaymentStatus("rejected");
            }
          }
        }
      } catch (error) {
        console.error("Error checking payment status:", error);
      } finally {
        setIsCheckingPaymentStatus(false);
      }
    }

    checkPaymentStatus();
  }, [progressId, lpoId, refreshKey]);

  // Check GRN status
  useEffect(() => {
    async function checkGrnStatus() {
      if (progressId !== 17 && progressId !== 16) {
        setIsCheckingGrn(false);
        return;
      }

      console.log(lpoId);

      setIsCheckingGrn(true);

      try {
        const grnResponse = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/grn/getGRNDetailsByLPOID`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lpo_id: lpoId }),
          },
        );

        if (grnResponse.ok) {
          const grnData = await grnResponse.json();

          console.log(grnData);

          setHasGrn(!!(grnData.success && grnData.data && grnData.data.id));
        }
      } catch (error) {
        console.error("Error checking GRN status:", error);
      } finally {
        setIsCheckingGrn(false);
      }
    }

    checkGrnStatus();
  }, [progressId, lpoId, refreshKey]);

  // Check GRN quantity mismatch
  useEffect(() => {
    async function checkGrnQuantityMismatch() {
      if (progressId !== 17) {
        setIsCheckingGrnQuantity(false);
        return;
      }

      setIsCheckingGrnQuantity(true);

      try {
        const grnResponse = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/grn/getGRNDetailsByLPOID`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lpo_id: lpoId }),
          },
        );

        if (grnResponse.ok) {
          const grnData = await grnResponse.json();

          if (grnData.success && grnData.data && grnData.data.id) {
            const lpoDetailsResponse = await fetch(
              `${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo/getLPODetails`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ lpo_id: lpoId }),
              },
            );

            if (lpoDetailsResponse.ok) {
              const lpoDetailsData = await lpoDetailsResponse.json();

              if (
                lpoDetailsData.success &&
                lpoDetailsData.data?.lpo_mr_lines &&
                grnData.data.grn_lines &&
                Array.isArray(grnData.data.grn_lines)
              ) {
                const hasMismatch = grnData.data.grn_lines.some(
                  (grnLine: any) => {
                    const lpoMrLine = lpoDetailsData.data.lpo_mr_lines.find(
                      (line: any) => line.id === grnLine.lpo_mr_line_id,
                    );

                    if (lpoMrLine) {
                      const correspondingMrLine = allItems.find(
                        (item) => item.id === lpoMrLine.mr_line_id,
                      );

                      if (correspondingMrLine) {
                        const orderedQty =
                          parseFloat(
                            String(
                              correspondingMrLine.approved_proposed_quantity,
                            ),
                          ) || 0;
                        const receivedQty =
                          parseFloat(String(grnLine.received_quantity)) || 0;
                        return orderedQty !== receivedQty;
                      }
                    }
                    return false;
                  },
                );

                setHasGrnQuantityMismatch(hasMismatch);
              }
            }
          }
        }
      } catch (error) {
        console.error("Error checking GRN quantity mismatch:", error);
      } finally {
        setIsCheckingGrnQuantity(false);
      }
    }

    checkGrnQuantityMismatch();
  }, [progressId, lpoId, allItems.length, refreshKey]);

  // Check QC statuses (at progress 21+ for CR column and to filter out failed items)
  useEffect(() => {
    async function checkQcStatuses() {
      if (progressId < 21) {
        setIsCheckingQc(false);
        return;
      }

      setIsCheckingQc(true);
      const statusMap: {
        [itemId: number]: "passed" | "failed" | "pending";
      } = {};
      const idMap: { [itemId: number]: number } = {};

      try {
        const lpoDetailsResponse = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo/getLPODetails`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lpo_id: lpoId }),
          },
        );

        if (lpoDetailsResponse.ok) {
          const lpoDetailsData = await lpoDetailsResponse.json();

          if (lpoDetailsData.success && lpoDetailsData.data?.lpo_mr_lines) {
            const checkPromises = allItems.map(async (item) => {
              try {
                const lpoLine = lpoDetailsData.data.lpo_mr_lines.find(
                  (line: any) => line.mr_line_id === item.id,
                );

                if (lpoLine) {
                  const qcResponse = await fetch(
                    `${process.env.NEXT_PUBLIC_BASE_URL}/api/qc/getQCByLPOMrLineID`,
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ lpo_mr_line_id: lpoLine.id }),
                    },
                  );

                  if (qcResponse.ok) {
                    const qcData = await qcResponse.json();
                    if (qcData.success && qcData.data) {
                      statusMap[item.id] = qcData.data.qc_status;
                      idMap[item.id] = qcData.data.id;
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
          }
        }

        setQcStatus(statusMap);
        setQcIds(idMap);
      } catch (error) {
        console.error("Error checking QC statuses:", error);
      } finally {
        setIsCheckingQc(false);
      }
    }

    checkQcStatuses();
  }, [progressId, lpoId, allItems.length, refreshKey]);

  // Check inventory/stock statuses
  useEffect(() => {
    async function checkStockStatuses() {
      if (progressId !== 24) {
        setIsCheckingInventory(false);
        return;
      }

      setIsCheckingInventory(true);
      const statusMap: { [itemId: number]: boolean } = {};

      try {
        const checkPromises = allItems.map(async (item) => {
          try {
            const response = await fetch(
              `${process.env.NEXT_PUBLIC_BASE_URL}/api/stock/getStockByMrLineID`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mr_line_id: item.id }),
              },
            );

            const data = await response.json();
            statusMap[item.id] = !!(data.success && data.data);
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
  }, [progressId, lpoId, allItems.length, refreshKey]);

  // Helper functions
  function allItemsPassedQc(): boolean {
    if (isCheckingQc) return false;
    if (allItems.length === 0) return false;
    return allItems.every((item) => qcStatus[item.id] === "passed");
  }

  function hasAllItemsCompletedQc(): boolean {
    if (isCheckingQc) return false;
    return allItems.every(
      (item) =>
        qcStatus[item.id] === "passed" || qcStatus[item.id] === "failed",
    );
  }

  function allItemsFailedQc(): boolean {
    if (isCheckingQc) return false;
    if (allItems.length === 0) return false;
    return allItems.every((item) => qcStatus[item.id] === "failed");
  }

  function allItemsHaveStock(): boolean {
    if (isCheckingInventory) return false;
    if (displayItems.length === 0) return false;
    return displayItems.every((item) => inventoryStatus[item.id] === true);
  }

  function hasLpoWithInvoiceAndSignedFile(): boolean {
    if (isCheckingLpoInvoices) return false;

    const supplierTypeLower = lpoInvoiceStatus.supplierType.toLowerCase();

    // Credit suppliers: no invoice or signed file needed (skip payment, go to delivery)
    if (supplierTypeLower.includes("credit")) {
      return lpoInvoiceStatus.hasLpo;
    }

    // Marketplace/Online suppliers: need invoice but NOT signed file
    if (
      supplierTypeLower.includes("marketplace") ||
      supplierTypeLower.includes("online")
    ) {
      return lpoInvoiceStatus.hasLpo && lpoInvoiceStatus.hasInvoice;
    }

    // Subcontractor: need invoice but NOT signed file
    if (supplierTypeLower.includes("subcontractor")) {
      return lpoInvoiceStatus.hasLpo && lpoInvoiceStatus.hasInvoice;
    }

    // Cash/Local and other types: need everything
    return (
      lpoInvoiceStatus.hasLpo &&
      lpoInvoiceStatus.hasInvoice &&
      lpoInvoiceStatus.hasSignedFile
    );
  }

  function calculateItemsTotal(items: MrLine[]): number {
    let total = 0;
    items.forEach((item: MrLine) => {
      const flatLine = flatLines.find((fl: any) => fl.id === item.id);
      if (flatLine) {
        const unitPrice = Number(flatLine.lpo_unit_price) || 0;
        const proposedQty = Number(item.approved_proposed_quantity) || 0;
        const requestedQty = Number(item.quantity) || 0;
        const totalQty = proposedQty > 0 ? proposedQty : requestedQty;
        total += unitPrice * totalQty;
      }
    });
    return Number(total.toFixed(2));
  }

  // Build a fake mrHeader with the LPO's progress_id for components that need it
  const lpoAsMrHeader: MrHeader = {
    ...mrHeader,
    progress_id: progressId,
    progress_name: lpo.progress_name,
    delivery_date: lpo.delivery_date,
  };

  // Add this helper function before the return statement
  function getVATRate(): number {
    // Get VAT rate from LPO, default to 0.05 (5%) if not set
    const vatRate = lpo?.vat_rate;
    if (vatRate === null || vatRate === undefined) {
      return 0.05; // Default 5% VAT for UAE
    }
    return Number(vatRate) / 100; // Convert percentage (e.g., 5) to decimal (0.05)
  }

  function getDiscountRate(): number {
    const discount = lpo?.discount;
    if (discount === null || discount === undefined) return 0;
    return Number(discount);
  }

  function getShippingAndHandling(): number {
    const shipping = lpo?.shipping_and_handling;
    if (shipping === null || shipping === undefined) return 0;
    return Number(shipping);
  }

  function calculateTotalWithVAT(subtotal: number): number {
    const discountRate = getDiscountRate();
    const shipping = getShippingAndHandling();
    const vatRate = getVATRate();

    const discountAmount = subtotal * (discountRate / 100);
    const subtotalAfterDiscount = subtotal - discountAmount;
    const subtotalWithShipping = subtotalAfterDiscount + shipping;
    const vatAmount = subtotalWithShipping * vatRate;
    return subtotalWithShipping + vatAmount;
  }

  return (
    <>
      <div className="mr-with-id">
        {/* Supplier header */}
        <div className="subcategory-section">
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
                {lpo.supplier_name}
              </h2>

              {allItems.length > 0 && (
                <SupplierDetailsPopUp
                  item={allItems[0]}
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
              )}
            </div>

            <div className="right">
              {/* At Stock Entry stage (24) show the unified Documents popup */}
              {progressId === 24 ? (
                <DocumentsPopup lpoId={lpoId} />
              ) : (
                <>
                  {progressId >= 12 && (
                    <IssueLPOButton
                      mrHeader={lpoAsMrHeader}
                      mrLines={allItems}
                    />
                  )}

                  {(userInfo?.departmentID === 10 ||
                    userInfo?.departmentID === 11) &&
                    progressId === 13 && (
                      <PaymentButtons
                        mrHeader={lpoAsMrHeader}
                        mrLine={allItems[0]}
                        supplierId={allItems[0]?.approved_supplier_id}
                      />
                    )}

                  {(userInfo?.departmentID === 8 ||
                    userInfo?.departmentID === 9) &&
                    progressId === 13 && (
                      <PaymentButtons
                        mrHeader={lpoAsMrHeader}
                        mrLine={allItems[0]}
                        supplierId={allItems[0]?.approved_supplier_id}
                      />
                    )}

                  {progressId > 14 && (
                    <PaymentButtons
                      mrHeader={lpoAsMrHeader}
                      mrLine={allItems[0]}
                      supplierId={allItems[0]?.approved_supplier_id}
                    />
                  )}

                  {(progressId === 16 || progressId === 17) &&
                    userInfo?.departmentID === 11 && (
                      <CreateGRNButton
                        mrHeader={lpoAsMrHeader}
                        mrLines={allItems}
                        progress_id={progressId}
                      />
                    )}

                  {progressId >= 18 && (
                    <CreateGRNButton
                      mrHeader={lpoAsMrHeader}
                      mrLines={allItems}
                      progress_id={progressId}
                    />
                  )}
                </>
              )}
            </div>
          </div>

          <br />

          <table
            className="items-table two-toned"
            style={{ tableLayout: "fixed", width: "100%" }}
          >
            <colgroup>
              <col style={{ width: "75px" }} />
              <col style={{ width: "175px" }} />
              <col style={{ width: "175px" }} />
              <col />
              <col style={{ width: "100px" }} />
              {hasAnyQtyStocks && <col style={{ width: "100px" }} />}
              <col style={{ width: "100px" }} />
              <col style={{ width: "100px" }} />
              {hasAnyBrandSpecs && <col style={{ width: "150px" }} />}
              {hasAnyAttachment && <col style={{ width: "150px" }} />}
              {canSeePrice && <col style={{ width: "150px" }} />}
              {canSeePrice && <col style={{ width: "150px" }} />}
              {progressId === 24 && userInfo?.departmentID === 11 && (
                <col style={{ width: "150px" }} />
              )}
            </colgroup>
            <thead>
              <tr>
                <th>#</th>
                <th>CATEGORY</th>
                <th>SUBCATEGORY</th>
                <th>ITEM</th>
                <th>QTY USE</th>
                {hasAnyQtyStocks && <th>QTY STOCKS</th>}
                <th>TOTAL QTY</th>
                <th>BOQ REF.</th>
                {hasAnyBrandSpecs && <th>BRAND & SPECS</th>}
                {hasAnyAttachment && <th>ATTACHMENT</th>}
                {canSeePrice && <th>UNIT PRICE</th>}
                {canSeePrice && <th>TOTAL PRICE</th>}
                {/* TEMPORARILY DISABLED QC/CR
              {userInfo?.departmentID === 12 && progressId === 21 && (
                <th>QC</th>
              )}
              {hasCrColumn && <th>CR</th>}
              */}
                {progressId === 24 && userInfo?.departmentID === 11 && (
                  <th>STOCKS</th>
                )}
              </tr>
            </thead>
            <tbody>
              {displayItems.map((item: MrLine, itemIndex: number) => {
                const flatLine = flatLines.find((fl: any) => fl.id === item.id);
                const unitPrice = flatLine
                  ? Number(flatLine.lpo_unit_price) || 0
                  : Number(item.approved_unit_price) || 0;
                const proposedQty =
                  Number(item.approved_proposed_quantity) || 0;
                const requestedQty = Number(item.quantity) || 0;
                const qtyForStocks =
                  proposedQty > 0 ? proposedQty - requestedQty : 0;
                const totalQty = proposedQty > 0 ? proposedQty : requestedQty;
                const totalPrice = unitPrice * totalQty;

                return (
                  <tr key={item.id}>
                    <td>{itemIndex + 1}</td>
                    <td>{item.material_category}</td>
                    <td>{item.material_subcategory}</td>
                    <td>
                      {item.material_description}
                      {progressId === 25 && item.stock_inventory_item_id && (
                        <div
                          style={{
                            fontStyle: "italic",
                            marginTop: "4px",
                            fontSize: "10px",
                          }}
                        >
                          <span style={{ color: "rgba(150, 150, 150, 1)" }}>
                            Stock added for:{" "}
                          </span>
                          <a
                            href={`/inventory/${item.stock_inventory_item_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontWeight: "600",
                              color: "black",
                              textDecoration: "none",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                            }}
                          >
                            &ldquo;{item.stock_inventory_item_name}&rdquo;
                            <img
                              src="/icons/external-link.svg"
                              alt=""
                              style={{ width: "10px", height: "10px" }}
                            />
                          </a>
                        </div>
                      )}
                    </td>
                    <td>
                      {formatNumber(item?.quantity)} {item.unit}
                    </td>
                    {hasAnyQtyStocks && (
                      <td>
                        {qtyForStocks > 0
                          ? `${formatNumber(qtyForStocks)} ${item.unit}`
                          : "-"}
                      </td>
                    )}
                    <td>
                      {formatNumber(totalQty)} {item.unit}
                    </td>
                    <td>
                      {item.boq_line_ids ? (
                        <BoqReferencePopUp item={item} mrHeader={mrHeader} />
                      ) : (
                        "-"
                      )}
                    </td>
                    {hasAnyBrandSpecs && (
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
                    )}
                    {hasAnyAttachment && (
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
                    )}

                    {canSeePrice && <td>{formatPriceAED(unitPrice)}</td>}

                    {canSeePrice && <td>{formatPriceAED(totalPrice)}</td>}

                    {/* TEMPORARILY DISABLED QC/CR
                  {userInfo?.departmentID === 12 && progressId === 21 && (
                    <td>
                      <QCCheckListButton item={item} mrHeader={lpoAsMrHeader} />
                    </td>
                  )}

                  {hasCrColumn && (
                    <td>
                      {qcIds[item.id] &&
                      qcStatus[item.id] !== "pending" ? (
                        <DownloadCRButton qcId={qcIds[item.id]} />
                      ) : (
                        "-"
                      )}
                    </td>
                  )}
                  */}

                    {userInfo?.departmentID === 11 && progressId === 24 && (
                      <td>
                        <AddToInventoryButton mrLine={item} />
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>

            {canSeePrice && (
              <tfoot
                style={{
                  borderTop: "1px solid rgba(239, 239, 239, 1)",
                }}
              >
                {/* Subtotal Row */}
                <tr>
                  <td colSpan={summaryLabelColSpan} />
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
                    {formatPriceAED(calculateItemsTotal(displayItems))}
                  </td>
                  {summaryTrailingColSpan > 0 && (
                    <td colSpan={summaryTrailingColSpan} />
                  )}
                </tr>

                {/* Discount Row */}
                {getDiscountRate() > 0 && (
                  <tr>
                    <td colSpan={summaryLabelColSpan} />
                    <td
                      style={{
                        fontWeight: "600",
                      }}
                    >
                      DISCOUNT ({getDiscountRate()}%)
                    </td>
                    <td
                      style={{
                        fontWeight: "600",
                      }}
                    >
                      -{" "}
                      {formatPriceAED(
                        calculateItemsTotal(displayItems) *
                          (getDiscountRate() / 100),
                      )}
                    </td>
                    {summaryTrailingColSpan > 0 && (
                      <td colSpan={summaryTrailingColSpan} />
                    )}
                  </tr>
                )}

                {/* Shipping & Handling Row */}
                {getShippingAndHandling() > 0 && (
                  <tr>
                    <td colSpan={summaryLabelColSpan} />
                    <td
                      style={{
                        fontWeight: "600",
                      }}
                    >
                      S&H
                    </td>
                    <td
                      style={{
                        fontWeight: "600",
                      }}
                    >
                      {formatPriceAED(getShippingAndHandling())}
                    </td>
                    {summaryTrailingColSpan > 0 && (
                      <td colSpan={summaryTrailingColSpan} />
                    )}
                  </tr>
                )}

                {/* Total with VAT Row */}
                <tr>
                  <td colSpan={summaryLabelColSpan} />
                  <td
                    style={{
                      fontWeight: "600",
                    }}
                  >
                    TOTAL W/ VAT
                  </td>
                  <td
                    style={{
                      fontWeight: "600",
                    }}
                  >
                    {formatPriceAED(
                      calculateTotalWithVAT(calculateItemsTotal(displayItems)),
                    )}
                  </td>
                  {summaryTrailingColSpan > 0 && (
                    <td colSpan={summaryTrailingColSpan} />
                  )}
                </tr>
              </tfoot>
            )}
          </table>

          <br />
          <br />
          <br />
        </div>

        {/* ── Duplicate empty table (same columns as main table, no rows) ── */}
        {canSeePrice && (
          <table
            className="items-table two-toned fixed-layout"
            style={{ minHeight: 0 }}
          >
            <colgroup>
              <col style={{ width: "75px" }} />
              <col style={{ width: "175px" }} />
              <col style={{ width: "175px" }} />
              <col />
              <col style={{ width: "100px" }} />
              {hasAnyQtyStocks && <col style={{ width: "100px" }} />}
              <col style={{ width: "100px" }} />
              <col style={{ width: "100px" }} />
              {hasAnyBrandSpecs && <col style={{ width: "150px" }} />}
              {hasAnyAttachment && <col style={{ width: "150px" }} />}
              {canSeePrice && <col style={{ width: "150px" }} />}
              {canSeePrice && <col style={{ width: "150px" }} />}
              {progressId === 24 && userInfo?.departmentID === 11 && (
                <col style={{ width: "150px" }} />
              )}
            </colgroup>
            <tbody />
            <tfoot style={{ borderTop: "1px solid rgba(239, 239, 239, 1)" }}>
              <tr>
                <td colSpan={summaryLabelColSpan} />
                <td style={{ fontWeight: "600" }}>MR VALUE</td>
                <td style={{ fontWeight: "600" }}>
                  {formatPriceAED(
                    calculateTotalWithVAT(calculateItemsTotal(displayItems)),
                  )}
                </td>
                {summaryTrailingColSpan > 0 && (
                  <td colSpan={summaryTrailingColSpan} />
                )}
              </tr>
            </tfoot>
          </table>
        )}
      </div>
      {/* end mr-with-id */}

      <CommentsSection
        mrHeaderId={mrHeader.id}
        lpoId={lpoId}
        stageName={lpo.progress_name || mrHeader.progress_name || ""}
      />

      {/* Awaiting LPO & Invoice (Progress 12, 13, 16) - Procurement Submit for Delivery (payment stage skipped) */}
      {userInfo?.departmentID === 9 &&
        (progressId === 12 || progressId === 13 || progressId === 16) && (
          <div className="bottom-nav">
            <div></div>
            <SubmitForDeliveryButton
              mrHeader={lpoAsMrHeader}
              lpoId={lpoId}
              deliveryDate={lpo.delivery_date || mrHeader.delivery_date}
              paymentValue={totalInvoiceAmount}
              disabled={!hasLpoWithInvoiceAndSignedFile()}
              style={{
                opacity: !hasLpoWithInvoiceAndSignedFile() ? "0.5" : "1",
                cursor: !hasLpoWithInvoiceAndSignedFile()
                  ? "not-allowed"
                  : "pointer",
                pointerEvents: !hasLpoWithInvoiceAndSignedFile()
                  ? "none"
                  : "auto",
              }}
            />
          </div>
        )}

      {/* Pending Payment (Progress 14) - REMOVED — payment stage skipped, LPO & Invoice goes directly to Awaiting Delivery */}
      {/* {userInfo?.departmentID === 10 && progressId === 14 && (
        <div className="bottom-nav">
          <div></div>
          {(() => {
            const hasRejectedPayment = lpoPaymentStatus === "rejected";
            const paymentApproved = lpoPaymentStatus === "approved";

            if (hasRejectedPayment) {
              return (
                <SubmitForLPOResubmissionButton
                  mrHeaderID={mrHeader.id}
                  lpoId={lpoId}
                />
              );
            } else {
              return (
                <SubmitForDeliveryButton
                  mrHeader={lpoAsMrHeader}
                  lpoId={lpoId}
                  deliveryDate={lpo.delivery_date || mrHeader.delivery_date}
                  paymentValue={totalInvoiceAmount}
                  disabled={!paymentApproved}
                  style={{
                    opacity: !paymentApproved ? "0.5" : "1",
                    cursor: !paymentApproved ? "not-allowed" : "pointer",
                    pointerEvents: !paymentApproved ? "none" : "auto",
                  }}
                />
              );
            }
          })()}
        </div>
      )} */}

      {/* Awaiting Delivery (Progress 17) - Storekeeper: GRN then Submit for QC or GRN Fail Resubmission */}
      {userInfo?.departmentID === 11 && progressId === 17 && (
        <div className="bottom-nav">
          <div></div>
          {!isCheckingGrnQuantity && hasGrn ? (
            hasGrnQuantityMismatch ? (
              <SubmitForLPOResubmissionGRNFailButton
                mrHeaderID={mrHeader.id}
                lpoId={lpoId}
              />
            ) : (
              <SubmitForQCButton mrHeaderID={mrHeader.id} lpoId={lpoId} />
            )
          ) : (
            <SubmitForQCButton
              mrHeaderID={mrHeader.id}
              lpoId={lpoId}
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

      {/* TEMPORARILY DISABLED QC
      {userInfo?.departmentID === 12 && progressId === 21 && (
        <div className="bottom-nav">
          <div></div>
          <SubmitForStockEntryButton
            mrHeaderID={mrHeader.id}
            lpoId={lpoId}
            label={
              hasAllItemsCompletedQc() && !allItemsPassedQc()
                ? allItemsFailedQc()
                  ? "SUBMIT FOR RESOLUTION"
                  : "SUBMIT FOR STOCK ENTRY AND RESOLUTION"
                : "SUBMIT FOR STOCK ENTRY"
            }
            disabled={!hasAllItemsCompletedQc()}
            style={{
              opacity: !hasAllItemsCompletedQc() ? "0.5" : "1",
              cursor: !hasAllItemsCompletedQc() ? "not-allowed" : "pointer",
              pointerEvents: !hasAllItemsCompletedQc() ? "none" : "auto",
            }}
          />
        </div>
      )}
      */}

      {/* Awaiting Stock Entry (Progress 24) - Storekeeper Complete */}
      {userInfo?.departmentID === 11 && progressId === 24 && (
        <div className="bottom-nav">
          <div></div>
          <CompleteMaterialRequestButton
            mrHeader={lpoAsMrHeader}
            mrLineItems={lpoLines}
            lpoId={lpoId}
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
