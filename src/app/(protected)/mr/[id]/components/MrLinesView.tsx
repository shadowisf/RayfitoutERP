"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import AddMrItemButton from "./department/_AddMrItemButton";
import { MrLine } from "../types/mrLine";
import EditMrItemButton from "./department/_EditMrItemButton";
import DeleteMrItemButton from "./department/_DeleteMrItemButton";
import RenameMrSubCategoryButton from "./department/_RenameMrSubCategoryButton";
import DeleteMrSubCategoryButton from "./department/_DeleteMrSubCategoryButton";
import BoqReferencePopUp from "../../components/BoqReferencePopUp";
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
import SupplierDetailsPopUp from "../../components/SupplierDetailsPopUp";
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
// import SubmitForQSPricingApprovalButton from "./procurement/_SubmitForQSPricingApprovalButton"; // disabled — QS Price Check stage bypassed
import CheckPricesButton from "./quantitySurveyor/_CheckPricesButton";
import InfoPopUpButton from "@/app/components/_InfoPopUpButton";
import SubmitForQSApprovalButton from "./department/_SubmitForQSApprovalButton";
import MrTransferIssueButton from "./storekeeper/_MrTransferIssueButton";
import MrDownloadDnButton from "./storekeeper/_MrDownloadDnButton";
import MrUploadSignedDnButton from "./storekeeper/_MrUploadSignedDnButton";
import SubmitForStockTransferCompletion from "./storekeeper/_SubmitForStockTransferCompletion";
import CommentsSection from "@/app/components/CommentsSection";
import { formatPrice, formatPriceAED } from "@/lib/formatPrice";
import QSActionsButton from "./quantitySurveyor/_QSActionsButton";
import QSEditQtyButton from "./quantitySurveyor/_QSEditQtyButton";
import QSEditBrandSpecButton from "./quantitySurveyor/_QSEditBrandSpecButton";
import ProcurementActionsButton from "./procurement/_ProcurementActionsButton";
import ManagerPriceActionsButton from "./manager/_ManagerPriceActionsButton";
import InventoryStatusCell, {
  InventoryMatch,
} from "./department/_InventoryStatusCell";
import MultipleSelectBoqItemButton from "@/app/components/_MultipleSelectBoqItemButton";
import { UNIT_OPTIONS, mapPredefinedUnit } from "@/constants/units";
import AddBrandAndSpecs from "./department/_AddBrandAndSpecs";
import AddMrLineAttachment from "./department/_AddMrLineAttachment";
import MobileBrandSpecsEditor from "./department/_MobileBrandSpecsEditor";
import DepartmentActionsButton from "./department/_DepartmentActionsButton";

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
  const router = useRouter();

  const pencilIcon = "/icons/rewind-two-arrows.svg";
  const trashIcon = "/icons/trash.svg";
  const externalLinkIcon = "/icons/external-link.svg";
  const checkSmallIcon = "/icons/check.svg";
  const crossSmallIcon = "/icons/cross-small.svg";
  const warningIcon = "/icons/warning.svg";

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

  // Inline editing state for REQ. QTY (keyed by mr_line id)
  const [inlineQty, setInlineQty] = useState<Record<number, string>>({});
  const [inlineUnit, setInlineUnit] = useState<Record<number, string>>({});

  const isDeptEditable =
    (mrHeader.progress_id === 1 ||
      mrHeader.progress_id === 5 ||
      mrHeader.progress_id === 11) &&
    userInfo?.departmentID === mrHeader.department_id;

  // Format a number string with thousand-separator commas
  // Format a number string with thousand-separator commas.
  // Trailing zeros are stripped (1000.000 → "1,000"), but a trailing dot
  // is preserved so typing "1000." doesn't lose the decimal point mid-input.
  const formatQtyWithCommas = (val: string | number): string => {
    const s = String(val).replace(/,/g, "");
    if (s === "") return "";
    const hasTrailingDot = s.endsWith(".");
    const num = parseFloat(s);
    if (isNaN(num)) return s;
    const numStr = String(num); // JS drops trailing zeros naturally
    const [int, dec] = numStr.split(".");
    const formattedInt = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    let result = dec !== undefined ? `${formattedInt}.${dec}` : formattedInt;
    if (hasTrailingDot && !result.includes(".")) result += ".";
    return result;
  };

  // Whether this MR requires strict line validation before submit
  const requireStrictValidation =
    !!mrHeader.skip_approvals ||
    mrHeader.department_id === 8 ||
    mrHeader.department_id === 16;

  const saveInlineQty = async (item: MrLine) => {
    const qtyStr = inlineQty[item.id];
    if (qtyStr === undefined) return; // unchanged
    const qty = parseFloat(qtyStr.replace(/,/g, ""));
    if (isNaN(qty) || qty < 0) return;
    const unit = inlineUnit[item.id] ?? item.unit ?? "";
    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "updateMrLineQuantity",
        id: item.id,
        quantity: qty,
        unit,
        changed_by: userInfo?.name || null,
        stage_name: "INITIAL APPROVAL",
      }),
    });
    router.refresh();
  };

  const saveInlineBoq = async (item: MrLine, boqLineIDs: number[]) => {
    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "updateMrLineBoqRef",
        id: item.id,
        boq_line_ids: boqLineIDs,
      }),
    });
    router.refresh();
  };

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

  // Price stats for procurement quotations stage (progress_id === 7)
  const [materialPriceStats, setMaterialPriceStats] = useState<
    Record<
      string,
      {
        lowest_price: number | null;
        highest_price: number | null;
        avg_price: number | null;
        prev_price: number | null;
      }
    >
  >({});

  // ── Inventory stock matches per material description (draft stage only) ─────
  // null = not yet loaded (show blank); Record = loaded (empty array = no match)
  const [itemInventoryStatus, setItemInventoryStatus] = useState<Record<
    string,
    InventoryMatch[]
  > | null>(null);

  // ── Quotation price ranges per MR line (for PRICE RANGE column) ─────────
  const [quotationPriceRanges, setQuotationPriceRanges] = useState<
    Record<number, { min: number; max: number }>
  >({});

  // ── Price hover popups (lowest & prev) ────────────────────────────────────
  type PriceHoverRow = {
    lpo_id: number;
    mr_header_id: number;
    project_name: string;
    vendor_name: string;
    unit_price: number;
  };
  const [hoveredLowestDesc, setHoveredLowestDesc] = useState<string | null>(
    null,
  );
  const [hoveredLowestRect, setHoveredLowestRect] = useState<DOMRect | null>(
    null,
  );
  const [hoveredPrevDesc, setHoveredPrevDesc] = useState<string | null>(null);
  const [hoveredPrevRect, setHoveredPrevRect] = useState<DOMRect | null>(null);
  const [priceHoverCache, setPriceHoverCache] = useState<
    Record<
      string,
      {
        lowest?: PriceHoverRow | "loading" | null;
        prev?: PriceHoverRow | "loading" | null;
      }
    >
  >({});
  const lowestHideTimer = useRef<NodeJS.Timeout | null>(null);
  const prevHideTimer = useRef<NodeJS.Timeout | null>(null);

  const startLowestHideTimer = useCallback(() => {
    if (lowestHideTimer.current) clearTimeout(lowestHideTimer.current);
    lowestHideTimer.current = setTimeout(() => {
      setHoveredLowestDesc(null);
      setHoveredLowestRect(null);
    }, 120);
  }, []);

  const cancelLowestHideTimer = useCallback(() => {
    if (lowestHideTimer.current) {
      clearTimeout(lowestHideTimer.current);
      lowestHideTimer.current = null;
    }
  }, []);

  const startPrevHideTimer = useCallback(() => {
    if (prevHideTimer.current) clearTimeout(prevHideTimer.current);
    prevHideTimer.current = setTimeout(() => {
      setHoveredPrevDesc(null);
      setHoveredPrevRect(null);
    }, 120);
  }, []);

  const cancelPrevHideTimer = useCallback(() => {
    if (prevHideTimer.current) {
      clearTimeout(prevHideTimer.current);
      prevHideTimer.current = null;
    }
  }, []);

  const fetchPriceHoverDetail = useCallback(
    async (materialDesc: string, type: "lowest" | "prev") => {
      if (priceHoverCache[materialDesc]?.[type] !== undefined) return;
      setPriceHoverCache((prev) => ({
        ...prev,
        [materialDesc]: { ...prev[materialDesc], [type]: "loading" },
      }));
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMaterialPriceHoverDetail?material=${encodeURIComponent(materialDesc)}&type=${type}`,
        );
        const data = res.ok ? await res.json() : null;
        setPriceHoverCache((prev) => ({
          ...prev,
          [materialDesc]: { ...prev[materialDesc], [type]: data },
        }));
      } catch {
        setPriceHoverCache((prev) => ({
          ...prev,
          [materialDesc]: { ...prev[materialDesc], [type]: null },
        }));
      }
    },
    [priceHoverCache],
  );

  const handleLowestPriceEnter = useCallback(
    (e: React.MouseEvent, materialDesc: string) => {
      const stats = materialPriceStats[materialDesc];
      if (!stats?.lowest_price) return;
      cancelLowestHideTimer();
      setHoveredLowestDesc(materialDesc);
      setHoveredLowestRect(
        (e.currentTarget as HTMLElement).getBoundingClientRect(),
      );
      fetchPriceHoverDetail(materialDesc, "lowest");
    },
    [materialPriceStats, cancelLowestHideTimer, fetchPriceHoverDetail],
  );

  const handlePrevPriceEnter = useCallback(
    (e: React.MouseEvent, materialDesc: string) => {
      const stats = materialPriceStats[materialDesc];
      if (!stats?.prev_price) return;
      cancelPrevHideTimer();
      setHoveredPrevDesc(materialDesc);
      setHoveredPrevRect(
        (e.currentTarget as HTMLElement).getBoundingClientRect(),
      );
      fetchPriceHoverDetail(materialDesc, "prev");
    },
    [materialPriceStats, cancelPrevHideTimer, fetchPriceHoverDetail],
  );
  // ─────────────────────────────────────────────────────────────────────────

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

  // ── QS Review helpers ─────────────────────────────────────────────────────
  const isQSReview =
    mrHeader.progress_id === 2 && userInfo?.departmentID === 16;

  // ── Procurement Quotations helpers ────────────────────────────────────────
  const isProcurementQuotations =
    mrHeader.progress_id === 7 && userInfo?.departmentID === 9;

  // ── Current stage label for activity log ─────────────────────────────────
  const PROGRESS_STAGE_LABELS: Record<number, string> = {
    1: "INITIAL APPROVAL",
    2: "QS REVIEW",
    3: "MANAGER APPROVAL",
    4: "STOCK TRANSFER",
    5: "REQUEST REJECTED",
    7: "QUOTATIONS",
    9: "QS PRICE CHECK",
    10: "MANAGER PRICE APPROVAL",
    11: "PRICE REJECTED",
    12: "LPO & INVOICE",
    13: "PAYMENT REJECTED",
    14: "PAYMENT",
    17: "AWAITING DELIVERY",
    21: "QC CHECK",
    23: "FAILED QC",
    24: "STOCK ENTRY",
    25: "COMPLETED",
    26: "SEGREGATION",
  };
  const currentStageName =
    PROGRESS_STAGE_LABELS[mrHeader.progress_id] ||
    mrHeader.progress_name ||
    "INITIAL APPROVAL";

  // ── Manager Price Approval helpers ────────────────────────────────────────
  const isManagerPriceApproval =
    mrHeader.progress_id === 10 && userInfo?.departmentID === 8;

  // Items where approved total price exceeds historical avg price
  const itemsExceedingAvgPrice = useMemo(() => {
    const set = new Set<number>();
    if (!isManagerPriceApproval) return set;
    for (const category in mrLines) {
      for (const subCategory in mrLines[category]) {
        for (const supplier in mrLines[category][subCategory]) {
          for (const item of mrLines[category][subCategory][supplier]) {
            const approvedPrice = Number(item.approved_unit_price) || 0;
            const avgPrice =
              materialPriceStats[item.material_description]?.avg_price;
            if (
              approvedPrice > 0 &&
              avgPrice != null &&
              approvedPrice > avgPrice
            ) {
              set.add(item.id);
            }
          }
        }
      }
    }
    return set;
  }, [mrLines, materialPriceStats, isManagerPriceApproval]);

  // Check if any item across all mrLines has an attachment
  const hasAnyAttachment = useMemo(() => {
    if (isDeptEditable) return true;
    for (const category in mrLines) {
      for (const subCategory in mrLines[category]) {
        for (const supplier in mrLines[category][subCategory]) {
          for (const item of mrLines[category][subCategory][supplier]) {
            if (item.attachment) return true;
          }
        }
      }
    }
    return false;
  }, [mrLines, isDeptEditable]);

  // Check if any item has a brand or specification set
  const hasAnyBrandSpecs = useMemo(() => {
    if (isDeptEditable) return true;
    for (const category in mrLines) {
      for (const subCategory in mrLines[category]) {
        for (const supplier in mrLines[category][subCategory]) {
          for (const item of mrLines[category][subCategory][supplier]) {
            if (item.specification) return true;
          }
        }
      }
    }
    return false;
  }, [mrLines, isDeptEditable]);

  // Check if any item has QTY STOCKS (approved_proposed_quantity > quantity)
  const hasAnyQtyStocks = useMemo(() => {
    if (mrHeader.progress_id < 9) return false;
    for (const category in mrLines) {
      for (const subCategory in mrLines[category]) {
        for (const supplier in mrLines[category][subCategory]) {
          for (const item of mrLines[category][subCategory][supplier]) {
            const proposedQty = Number(item.approved_proposed_quantity) || 0;
            const requestedQty = Number(item.quantity) || 0;
            if (proposedQty > requestedQty) return true;
          }
        }
      }
    }
    return false;
  }, [mrLines, mrHeader.progress_id]);

  // QS Review — selected item IDs (shared across tables and QSActionsButton)
  const [selectedItemIds, setSelectedItemIds] = useState<Set<number>>(
    new Set(),
  );

  // Draft — selected item IDs for dept bulk actions (progress_id 1)
  const [selectedDraftItemIds, setSelectedDraftItemIds] = useState<Set<number>>(
    new Set(),
  );

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // ── Category tab scroll arrows (mobile) ────────────────────────────────────
  const categoryTabsRef = useRef<HTMLDivElement>(null);
  const [showTabLeftArrow, setShowTabLeftArrow] = useState(false);
  const [showTabRightArrow, setShowTabRightArrow] = useState(false);

  const checkTabScroll = useCallback(() => {
    const el = categoryTabsRef.current;
    if (!el) return;
    setShowTabLeftArrow(el.scrollLeft > 0);
    setShowTabRightArrow(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }, []);

  useEffect(() => {
    const el = categoryTabsRef.current;
    if (!el) return;
    checkTabScroll();
    el.addEventListener("scroll", checkTabScroll);
    return () => el.removeEventListener("scroll", checkTabScroll);
  }, [checkTabScroll, isMobile]);

  // Re-check when the scroll container content changes size
  useEffect(() => {
    const el = categoryTabsRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => checkTabScroll());
    ro.observe(el);
    return () => ro.disconnect();
  }, [checkTabScroll]);

  const scrollTabs = (direction: "left" | "right") => {
    categoryTabsRef.current?.scrollBy({
      left: direction === "left" ? -200 : 200,
      behavior: "smooth",
    });
  };

  // Mobile card accordion — expanded item IDs
  const [expandedMobileItems, setExpandedMobileItems] = useState<Set<number>>(
    new Set(),
  );
  const toggleMobileExpand = (id: number) => {
    setExpandedMobileItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Procurement Quotations — selected item IDs (progress_id 7, dept 9)
  const [selectedProcurementItemIds, setSelectedProcurementItemIds] = useState<
    Set<number>
  >(new Set());

  // Manager Price Approval — selected item IDs (progress_id 10, dept 8)
  const [selectedManagerItemIds, setSelectedManagerItemIds] = useState<
    Set<number>
  >(new Set());

  // Compute columns before TOTAL PRICE and columns after it for subtotal alignment
  // Subtotal only renders when progress_id >= 10 && canSeePrice
  const subtotalLabelColSpan = (() => {
    const pid = mrHeader.progress_id;
    const dept = userInfo?.departmentID;
    let count = 0;

    // #, ITEM
    count += 2;
    // QTY columns: progress >= 9 means 3 cols (or 2 if QTY STOCKS hidden), else 1
    count += pid >= 9 ? (hasAnyQtyStocks ? 3 : 1) : 1;
    // BOQ REF (always) + BRAND & SPECS (conditional) + ATTACHMENT (conditional)
    count += 1 + (hasAnyBrandSpecs ? 1 : 0) + (hasAnyAttachment ? 1 : 0);
    // APPROVAL STATUS (only at progress 2, 3, 5 — not at >= 10)
    // ACTIONS columns before price (progress 1, 5, 11, 3, 2 — mostly not at >= 10 except 11)
    if (pid === 11 && dept === mrHeader.department_id) count += 1; // ACTIONS
    if (pid === 11 && dept === 9) count += 1; // ACTIONS
    // VENDOR & QUOTATION (progress >= 10 except pid 11; at pid 11 only dept 8)
    if (pid >= 10 && (pid !== 11 || dept === 8)) count += 1;
    return count;
  })();

  // For the "by item" table: #, CATEGORY, SUBCATEGORY, ITEM, QTY cols, BOQ REF, BRAND & SPECS, ATTACHMENT
  // No VENDOR & QUOTATION, no ACTIONS in the by-item table
  const subtotalLabelColSpanByItem = (() => {
    const pid = mrHeader.progress_id;
    let count = 0;
    // #, CATEGORY, SUBCATEGORY, ITEM
    count += 4;
    // QTY columns: progress >= 9 means 3 cols (or 2 if QTY STOCKS hidden), else 1
    count += pid >= 9 ? (hasAnyQtyStocks ? 3 : 1) : 1;
    // BOQ REF (always) + BRAND & SPECS (conditional) + ATTACHMENT (conditional)
    count += 1 + (hasAnyBrandSpecs ? 1 : 0) + (hasAnyAttachment ? 1 : 0);
    return count;
  })();

  const subtotalTrailingColSpan = (() => {
    const pid = mrHeader.progress_id;
    const dept = userInfo?.departmentID;
    let count = 0;

    if (dept === 11 && pid === 4) count += 1; // STOCK TRANSFER — not at >= 10
    if (dept === 12 && pid === 21) count += 1; // QUALITY CONTROL
    if (dept === 11 && pid === 24) count += 1; // STOCKS
    if (dept === 9 && pid === 23) count += 1; // RESOLUTION
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

  // Fetch price stats for all materials when in Quotations stage or Manager Price Approval
  useEffect(() => {
    if (mrHeader.progress_id !== 7 && mrHeader.progress_id !== 10) return;

    const allMaterials: string[] = [];
    for (const category in mrLines) {
      for (const subCategory in mrLines[category]) {
        for (const supplier in mrLines[category][subCategory]) {
          for (const item of mrLines[category][subCategory][supplier]) {
            if (
              item.material_description &&
              !allMaterials.includes(item.material_description)
            ) {
              allMaterials.push(item.material_description);
            }
          }
        }
      }
    }

    if (allMaterials.length === 0) return;

    const encoded = encodeURIComponent(allMaterials.join("||"));
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMaterialPriceStats?materials=${encoded}`,
    )
      .then((res) => res.json())
      .then((data) => setMaterialPriceStats(data))
      .catch((err) => console.error("getMaterialPriceStats error:", err));
  }, [mrHeader.progress_id, mrLines]);

  // ── Fetch inventory status for draft stage ────────────────────────────────
  useEffect(() => {
    if (mrHeader.progress_id !== 1) return;

    const descriptions: string[] = [];
    // Parallel array: predefined_item_id (or 0 for aliases/no-id) matching each description
    const predefinedIds: number[] = [];
    // Map from description → predefined_item_id (first seen wins)
    const descToId = new Map<string, number | null>();
    // Map from db_material_description (alias) → material_description (display/primary key)
    const aliasToDisplay = new Map<string, string>();

    for (const category in mrLines) {
      for (const subCategory in mrLines[category]) {
        for (const supplier in mrLines[category][subCategory]) {
          for (const item of mrLines[category][subCategory][supplier]) {
            if (
              item.material_description &&
              !descriptions.includes(item.material_description)
            ) {
              descriptions.push(item.material_description);
              descToId.set(item.material_description, item.predefined_item_id ?? null);
            }
            // Also send the original stored description (before predefined-item
            // name resolution) so the similarity check can leverage the richer
            // branded name (e.g. "1HP CLEAN WATER PUMP - PCWP750F - PRAKASH")
            // in addition to the cleaner predefined name.
            if (
              item.db_material_description &&
              item.db_material_description !== item.material_description &&
              !descriptions.includes(item.db_material_description)
            ) {
              descriptions.push(item.db_material_description);
              // Aliases don't carry a predefined ID (they are the raw stored desc)
              descToId.set(item.db_material_description, null);
              aliasToDisplay.set(
                item.db_material_description,
                item.material_description,
              );
            }
          }
        }
      }
    }

    if (descriptions.length === 0) return;

    // Build parallel predefined_ids array (0 = no predefined ID)
    for (const desc of descriptions) {
      predefinedIds.push(descToId.get(desc) ?? 0);
    }

    const encoded = encodeURIComponent(descriptions.join("||"));
    const encodedIds = encodeURIComponent(predefinedIds.join("||"));
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getInventoryStatus?materials=${encoded}&predefined_ids=${encodedIds}`,
    )
      .then((res) => res.json())
      .then((data: Record<string, InventoryMatch[]>) => {
        // Merge any alias-key matches into their primary display-description key,
        // then remove the alias key so the result is indexed by material_description.
        for (const [alias, primaryDesc] of aliasToDisplay.entries()) {
          const aliasMatches: InventoryMatch[] = data[alias] ?? [];
          if (aliasMatches.length > 0) {
            const primaryMatches: InventoryMatch[] = data[primaryDesc] ?? [];
            const merged = [...primaryMatches];
            for (const match of aliasMatches) {
              if (
                !merged.find(
                  (m) => m.inventory_item_id === match.inventory_item_id,
                )
              ) {
                merged.push(match);
              }
            }
            data[primaryDesc] = merged;
          }
          delete data[alias];
        }
        setItemInventoryStatus(data);
      })
      .catch((err) => console.error("getInventoryStatus error:", err));
  }, [mrHeader.progress_id, mrLines]);

  // ── Fetch quotation price ranges for PRICE RANGE column ───────────────────
  const fetchQuotationPriceRanges = useCallback(() => {
    if (mrHeader.progress_id !== 10) return;
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/supplier/getQuotationPriceRangesByMrHeaderID`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mr_header_id: mrHeader.id }),
      },
    )
      .then((res) => res.json())
      .then((data) => setQuotationPriceRanges(data))
      .catch((err) => console.error("getQuotationPriceRanges error:", err));
  }, [mrHeader.id, mrHeader.progress_id]);

  useEffect(() => {
    fetchQuotationPriceRanges();

    const handleQuotationsUpdated = () => fetchQuotationPriceRanges();
    window.addEventListener("quotationsUpdated", handleQuotationsUpdated);
    return () =>
      window.removeEventListener("quotationsUpdated", handleQuotationsUpdated);
  }, [fetchQuotationPriceRanges]);

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
      if (mrHeader.progress_id >= 12 && lpoLinePrices[item.id]) {
        // Use LPO prices
        const unitPrice = lpoLinePrices[item.id].unitPrice;
        const proposedQty = Number(item.approved_proposed_quantity) || 0;
        const quantity =
          proposedQty > 0 ? proposedQty : Number(item.quantity) || 0;
        total += unitPrice * quantity;
      } else {
        // Use approved_total_price directly — kept in sync with unit_price * quantity
        total += Number(item.approved_total_price) || 0;
      }
    });

    return Number(total.toFixed(2));
  }

  function calculateItemsTotalWithVat(items: MrLine[]): number {
    let total = 0;
    items.forEach((item: MrLine) => {
      const totalPrice = Number(item.approved_total_price) || 0;
      const vatRate = Number(item.approved_vat_rate) || 0;
      total += totalPrice * (1 + vatRate / 100);
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

      const idToDesc: { [id: number]: string } = {};

      try {
        const allItemIds: number[] = [];
        for (const category in mrLines) {
          for (const subCategory in mrLines[category]) {
            for (const supplier in mrLines[category][subCategory]) {
              const items = mrLines[category][subCategory][supplier];
              items.forEach((item: MrLine) => {
                allItemIds.push(item.id);
                idToDesc[item.id] = item.material_description;
              });
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
    for (const category in mrLines) {
      for (const subCategory in mrLines[category]) {
        for (const supplier in mrLines[category][subCategory]) {
          const items = mrLines[category][subCategory][supplier];
          for (const item of items) {
            if (item.qs_approval_status?.toLowerCase() === "rejected")
              return true;
          }
        }
      }
    }
    return false;
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
    for (const category in mrLines) {
      for (const subCategory in mrLines[category]) {
        for (const supplier in mrLines[category][subCategory]) {
          const items = mrLines[category][subCategory][supplier];
          for (const item of items) {
            const status = item.qs_approval_status?.toLowerCase();
            // Approved or Replaced both count as reviewed+approved
            if (status !== "approved" && status !== "replaced") return false;
          }
        }
      }
    }
    return true;
  }

  // All items have a QS status set (Approved, Replaced, or Rejected)
  function allItemsQSReviewed() {
    for (const category in mrLines) {
      for (const subCategory in mrLines[category]) {
        for (const supplier in mrLines[category][subCategory]) {
          const items = mrLines[category][subCategory][supplier];
          for (const item of items) {
            if (!item.qs_approval_status) return false;
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

  // Returns true if any line is missing qty, unit, or BOQ ref
  function hasIncompleteLines() {
    for (const category in mrLines) {
      for (const subCategory in mrLines[category]) {
        for (const supplier in mrLines[category][subCategory]) {
          for (const item of mrLines[category][subCategory][supplier]) {
            if (!item.quantity || Number(item.quantity) <= 0) return true;
            if (!item.unit) return true;
            if (!item.boq_line_ids) return true;
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

  // ── Shared mobile card list renderer ─────────────────────────────────────────
  // Used by both the "ALL" category view (inline) and the specific-category view.
  const renderMobileItemCards = (items: MrLine[]) => (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {items.map((item, itemIndex) => {
        const isExpanded = expandedMobileItems.has(item.id);
        return (
          <div
            key={item.id}
            style={{
              border: "1px solid rgba(217,217,217,1)",
              borderRadius: "8px",
              overflow: "hidden",
              backgroundColor: "rgba(249,249,249,1)",
            }}
          >
            {/* Card header */}
            <div
              onClick={() => toggleMobileExpand(item.id)}
              style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px", cursor: "pointer", backgroundColor: "rgba(239,239,239,1)" }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: "8px", backgroundColor: "white", flexShrink: 0, transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                <img src="/icons/arrow-right.svg" alt="" style={{ width: 14, height: 14, filter: "brightness(0)" }} />
              </div>
              <span style={{ flex: 1, fontWeight: 600, fontSize: "13px" }}>
                {itemIndex + 1}. {item.material_description}
              </span>
              {isDeptEditable ? (
                <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "4px", flexShrink: 0 }}>
                  <span style={{ fontSize: "10px", fontWeight: 600, color: "rgba(120,120,120,1)", textTransform: "uppercase" }}>
                    QTY <span style={{ color: "red" }}>*</span>
                  </span>
                  <div style={{ display: "flex", border: "1px solid rgba(217,217,217,1)", borderRadius: "5px", backgroundColor: "white", overflow: "hidden", flexShrink: 0 }}>
                    <input
                      type="text"
                      value={inlineQty[item.id] !== undefined ? inlineQty[item.id] : item.quantity > 0 ? formatQtyWithCommas(item.quantity) : ""}
                      placeholder="QTY"
                      onChange={(e) => {
                        const raw = e.target.value.replace(/,/g, "");
                        if (raw === "" || /^\d*\.?\d*$/.test(raw))
                          setInlineQty((prev) => ({ ...prev, [item.id]: raw ? formatQtyWithCommas(raw) : "" }));
                      }}
                      onBlur={() => saveInlineQty(item)}
                      style={{ width: "55px", border: "none", padding: "5px 6px", background: "transparent", fontSize: "12px" }}
                    />
                    <select
                      value={inlineUnit[item.id] ?? (item.unit ? mapPredefinedUnit(item.unit) : "N/A")}
                      onChange={(e) => setInlineUnit((prev) => ({ ...prev, [item.id]: e.target.value }))}
                      onBlur={() => saveInlineQty(item)}
                      style={{ border: "none", padding: "5px 4px", background: "transparent", cursor: "pointer", fontSize: "12px" }}
                    >
                      <option value="N/A">N/A</option>
                      {UNIT_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
              ) : (
                <span style={{ fontSize: "12px", color: "rgba(100,100,100,1)", flexShrink: 0 }}>
                  {formatNumber(item?.quantity)} {item.unit}
                </span>
              )}
            </div>

            {/* Expanded body */}
            {isExpanded && (
              <div style={{ padding: "12px", borderTop: "1px solid rgba(239,239,239,1)", display: "flex", flexDirection: "column", gap: "12px" }}>
                {/* Row 1: Inventory Status + BOQ Ref */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 0.5fr", gap: "25px" }}>
                  {mrHeader.progress_id === 1 && (
                    <div>
                      <div style={{ fontSize: "10px", color: "rgba(120,120,120,1)", fontWeight: 600, marginBottom: "6px", textTransform: "uppercase" }}>
                        Inventory Status
                      </div>
                      <InventoryStatusCell
                        matches={itemInventoryStatus === null ? undefined : (itemInventoryStatus[item.material_description] ?? [])}
                      />
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: "10px", color: "rgba(120,120,120,1)", fontWeight: 600, marginBottom: "6px", textTransform: "uppercase" }}>
                      BOQ Ref <span style={{ color: "red" }}>*</span>
                    </div>
                    {isDeptEditable ? (
                      <MultipleSelectBoqItemButton
                        projectID={mrHeader.project_id}
                        onSelectBoq={(ids) => saveInlineBoq(item, ids)}
                        currentBoqLineIDs={item.boq_line_ids ? String(item.boq_line_ids).split(",").map(Number).filter(Boolean) : []}
                        itemName={item.material_description}
                        compact
                      />
                    ) : item.boq_line_ids ? (
                      <BoqReferencePopUp item={item} mrHeader={mrHeader} />
                    ) : (
                      <span style={{ fontSize: "12px" }}>-</span>
                    )}
                  </div>
                </div>

                {/* Row 2: Specs / Notes */}
                <div>
                  <div style={{ fontSize: "10px", color: "rgba(120,120,120,1)", fontWeight: 600, marginBottom: "6px", textTransform: "uppercase" }}>
                    Specs / Notes
                  </div>
                  {isDeptEditable ? (
                    <MobileBrandSpecsEditor item={item} stageName="INITIAL APPROVAL" />
                  ) : item.brand || item.specification ? (
                    <InfoPopUpButton
                      text={<><small>SPECS / NOTES</small><h2>{item.specification || "-"}</h2></>}
                      header="SPECS / NOTES"
                    />
                  ) : (
                    <span style={{ fontSize: "12px" }}>-</span>
                  )}
                </div>

                {/* Row 3: Attachment */}
                <div>
                  <div style={{ fontSize: "10px", color: "rgba(120,120,120,1)", fontWeight: 600, marginBottom: "6px", textTransform: "uppercase" }}>
                    Attachment
                  </div>
                  {isDeptEditable ? (
                    <AddMrLineAttachment item={item} />
                  ) : item.attachment ? (
                    <Button componentType="link" bgColor="rgba(239,239,239,1)" borderColor="rgba(223,223,223,1)" textColor="black" style={{ padding: "7px 7px" }} href={item.attachment} target="_blank">
                      <img src={externalLinkIcon} alt="external link" />
                    </Button>
                  ) : (
                    <span style={{ fontSize: "12px" }}>-</span>
                  )}
                </div>

                {/* Edit / Delete actions (draft only) */}
                {isDeptEditable && (
                  <>
                    <br />
                    <br />
                    <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                      <EditMrItemButton item={item} bgColor="rgba(239,239,239,1)" borderColor="rgba(223,223,223,1)" textColor="black" stageName={currentStageName}>
                        <img src={pencilIcon} alt="edit" />
                      </EditMrItemButton>
                      <DeleteMrItemButton item={item} bgColor="rgba(239,239,239,1)" borderColor="rgba(223,223,223,1)" textColor="black" stageName={currentStageName}>
                        <img src={trashIcon} alt="delete" />
                      </DeleteMrItemButton>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <>
      <div className="mr-with-id">
        <div className="mr-lines-mobile-header">
          <h2>Material Requests</h2>
        </div>
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
                {/* Category tab strip — scrollable with arrows on mobile */}
                <div style={{ position: "relative", flex: isMobile ? 1 : undefined, minWidth: 0 }}>
                  {isMobile && showTabLeftArrow && (
                    <button
                      type="button"
                      onClick={() => scrollTabs("left")}
                      style={{
                        position: "absolute",
                        left: 0,
                        top: "50%",
                        transform: "translateY(-50%)",
                        zIndex: 10,
                        backgroundColor: "black",
                        border: "none",
                        borderRadius: "8px",
                        width: 32,
                        height: 32,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        flexShrink: 0,
                      }}
                    >
                      <img
                        src="/icons/arrow-right.svg"
                        alt="left"
                        style={{ width: 14, height: 14, transform: "rotate(180deg)", filter: "invert(1)" }}
                      />
                    </button>
                  )}

                  <div
                    ref={isMobile ? categoryTabsRef : undefined}
                    onScroll={isMobile ? checkTabScroll : undefined}
                    style={isMobile ? {
                      overflowX: "auto",
                      scrollbarWidth: "none",
                      paddingLeft: showTabLeftArrow ? 40 : 0,
                      paddingRight: showTabRightArrow ? 40 : 0,
                    } as React.CSSProperties : undefined}
                  >
                    <button
                      className={`item ${activeCategory === "ALL" ? "active" : ""}`}
                      onClick={() => setActiveCategory("ALL")}
                      style={{ textTransform: "uppercase", flexShrink: 0 }}
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
                        style={{ textTransform: "uppercase", flexShrink: 0 }}
                      >
                        {category}
                      </button>
                    ))}
                  </div>

                  {isMobile && showTabRightArrow && (
                    <button
                      type="button"
                      onClick={() => scrollTabs("right")}
                      style={{
                        position: "absolute",
                        right: 0,
                        top: "50%",
                        transform: "translateY(-50%)",
                        zIndex: 10,
                        backgroundColor: "black",
                        border: "none",
                        borderRadius: "8px",
                        width: 32,
                        height: 32,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        flexShrink: 0,
                      }}
                    >
                      <img
                        src="/icons/arrow-right.svg"
                        alt="right"
                        style={{ width: 14, height: 14, filter: "invert(1)" }}
                      />
                    </button>
                  )}
                </div>

                {(mrHeader.progress_id === 1 || mrHeader.progress_id === 5) &&
                  userInfo?.departmentID === mrHeader.department_id &&
                  showByItem &&
                  !isMobile && (
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      

                      {mrHeader.progress_id === 1 && (
                        <DepartmentActionsButton
                          selectedItems={getAllFlatItems().filter((i) =>
                            selectedDraftItemIds.has(i.id),
                          )}
                          mrHeaderId={mrHeader.id}
                          stageName={currentStageName}
                          onComplete={() => setSelectedDraftItemIds(new Set())}
                          onReset={() => setSelectedDraftItemIds(new Set())}
                        />
                      )}

                      {/* CATEGORY + SUBCATEGORY + ITEM */}
                      <AddMrItemButton
                        mrHeaderID={mrHeader.id}
                        projectID={mrHeader.project_id}
                        bgColor="black"
                        borderColor="black"
                        textColor="white"
                        stageName={currentStageName}
                      >
                        ADD ITEM +
                      </AddMrItemButton>
                    </div>
                  )}

                {/* QS Review — ACTIONS + DOWNLOAD inline with category tabs */}
                {isQSReview && (
                  <QSActionsButton
                    selectedItemIds={selectedItemIds}
                    setSelectedItemIds={setSelectedItemIds}
                    allCategoryItems={(() => {
                      const source =
                        activeCategory === "ALL"
                          ? regroupedMrLines
                          : { [activeCategory]: subCategories };
                      const flat: MrLine[] = [];
                      Object.values(source).forEach((subCats) =>
                        Object.values(subCats).forEach((suppliers) =>
                          Object.values(suppliers).forEach((items) =>
                            (items as MrLine[]).forEach((i) => flat.push(i)),
                          ),
                        ),
                      );
                      return flat;
                    })()}
                    mrHeader={mrHeader}
                    category={activeCategory}
                  />
                )}

                {/* Manager Price Approval — ACTIONS + DOWNLOAD inline with category tabs */}
                {isManagerPriceApproval && (
                  <ManagerPriceActionsButton
                    selectedItemIds={selectedManagerItemIds}
                    setSelectedItemIds={setSelectedManagerItemIds}
                    allCategoryItems={(() => {
                      const source =
                        activeCategory === "ALL"
                          ? regroupedMrLines
                          : { [activeCategory]: subCategories };
                      const flat: MrLine[] = [];
                      Object.values(source).forEach((subCats) =>
                        Object.values(subCats as any).forEach((suppliers) =>
                          Object.values(suppliers as any).forEach((items) =>
                            (items as MrLine[]).forEach((i) => flat.push(i)),
                          ),
                        ),
                      );
                      return flat;
                    })()}
                    mrHeader={mrHeader}
                    mrLines={mrLines}
                  />
                )}

                {/* Procurement Quotations — ACTIONS + DOWNLOAD inline with category tabs */}
                {isProcurementQuotations && (
                  <ProcurementActionsButton
                    selectedItemIds={selectedProcurementItemIds}
                    setSelectedItemIds={setSelectedProcurementItemIds}
                    allCategoryItems={(() => {
                      const source =
                        activeCategory === "ALL"
                          ? regroupedMrLines
                          : { [activeCategory]: subCategories };
                      const flat: MrLine[] = [];
                      Object.values(source).forEach((subCats) =>
                        Object.values(subCats).forEach((suppliers) =>
                          Object.values(suppliers).forEach((items) =>
                            (items as MrLine[]).forEach((i) => flat.push(i)),
                          ),
                        ),
                      );
                      return flat;
                    })()}
                    mrHeader={mrHeader}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        <br />

        {showByItem &&
          (activeCategory === "ALL"
            ? Object.entries(regroupedMrLines).map(
                ([category, subCategoriesData], categoryIndex, allCategories) =>
                  Object.entries(subCategoriesData).map(function (
                    [subCategory, suppliers],
                    subCategoryIndex,
                    allSubCategories,
                  ) {
                    const allItems = getAllItemsInSubCategory(suppliers);
                    const firstItem = allItems[0];

                    return (
                      <div
                        key={`${category}-${subCategory}`}
                        className="subcategory-section"
                      >
                        <div className="subcategory-header">
                          {/* Smart select portal — commented out
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
                            )} */}

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
                                {/* <RenameMrSubCategoryButton
                                  items={allItems}
                                  categoryID={String(
                                    firstItem.material_category_id,
                                  )}
                                  subCategoryID={String(
                                    firstItem.material_subcategory_id,
                                  )}
                                /> */}

                                <DeleteMrSubCategoryButton
                                  items={allItems}
                                  subCategory={subCategory}
                                />
                              </div>
                            )}
                        </div>

                        <br />

                        {Object.entries(suppliers).map(
                          ([supplier, items], supplierIndex, allSuppliers) => (
                            <div
                              key={supplier}
                              style={{ marginBottom: "2rem" }}
                            >
                              {!isMobile && (
                                <table className="items-table two-toned fixed-layout">
                                  <thead>
                                    <tr>
                                      {mrHeader.progress_id === 1 &&
                                        isDeptEditable && (
                                          <th style={{ width: "24px" }}>
                                            <input
                                              type="checkbox"
                                              checked={
                                                items.length > 0 &&
                                                items.every((i) =>
                                                  selectedDraftItemIds.has(
                                                    i.id,
                                                  ),
                                                )
                                              }
                                              onChange={(e) => {
                                                const newSet = new Set(
                                                  selectedDraftItemIds,
                                                );
                                                items.forEach((i) => {
                                                  if (e.target.checked)
                                                    newSet.add(i.id);
                                                  else newSet.delete(i.id);
                                                });
                                                setSelectedDraftItemIds(newSet);
                                              }}
                                              style={{
                                                cursor: "pointer",
                                                accentColor:
                                                  "rgba(0, 163, 93, 1)",
                                              }}
                                            />
                                          </th>
                                        )}
                                      {isQSReview && (
                                        <th style={{ width: "24px" }}>
                                          <input
                                            type="checkbox"
                                            checked={
                                              items.length > 0 &&
                                              items.every((i) =>
                                                selectedItemIds.has(i.id),
                                              )
                                            }
                                            onChange={(e) => {
                                              const newSet = new Set(
                                                selectedItemIds,
                                              );
                                              items.forEach((i) => {
                                                if (e.target.checked)
                                                  newSet.add(i.id);
                                                else newSet.delete(i.id);
                                              });
                                              setSelectedItemIds(newSet);
                                            }}
                                            style={{
                                              cursor: "pointer",
                                              accentColor:
                                                "rgba(0, 163, 93, 1)",
                                            }}
                                          />
                                        </th>
                                      )}
                                      {isProcurementQuotations && (
                                        <th style={{ width: "24px" }}>
                                          <input
                                            type="checkbox"
                                            checked={
                                              items.length > 0 &&
                                              items.every((i) =>
                                                selectedProcurementItemIds.has(
                                                  i.id,
                                                ),
                                              )
                                            }
                                            onChange={(e) => {
                                              const newSet = new Set(
                                                selectedProcurementItemIds,
                                              );
                                              items.forEach((i) => {
                                                if (e.target.checked)
                                                  newSet.add(i.id);
                                                else newSet.delete(i.id);
                                              });
                                              setSelectedProcurementItemIds(
                                                newSet,
                                              );
                                            }}
                                            style={{
                                              cursor: "pointer",
                                              accentColor:
                                                "rgba(0, 163, 93, 1)",
                                            }}
                                          />
                                        </th>
                                      )}
                                      {isManagerPriceApproval && (
                                        <th style={{ width: "24px" }}>
                                          <input
                                            type="checkbox"
                                            checked={
                                              items.length > 0 &&
                                              items.every((i) =>
                                                selectedManagerItemIds.has(
                                                  i.id,
                                                ),
                                              )
                                            }
                                            onChange={(e) => {
                                              const newSet = new Set(
                                                selectedManagerItemIds,
                                              );
                                              items.forEach((i) => {
                                                if (e.target.checked)
                                                  newSet.add(i.id);
                                                else newSet.delete(i.id);
                                              });
                                              setSelectedManagerItemIds(newSet);
                                            }}
                                            style={{
                                              cursor: "pointer",
                                              accentColor:
                                                "rgba(0, 163, 93, 1)",
                                            }}
                                          />
                                        </th>
                                      )}
                                      <th style={{ width: "40px" }}>#</th>
                                      <th style={{ width: "130px" }}>ITEM</th>
                                      {mrHeader.progress_id === 1 && (
                                        <th style={{ width: "150px" }}>
                                          INVENTORY STATUS
                                        </th>
                                      )}
                                      {mrHeader.progress_id >= 9 ? (
                                        <>
                                          <th style={{ width: "80px" }}>
                                            QTY USE
                                          </th>
                                          {hasAnyQtyStocks && (
                                            <th style={{ width: "90px" }}>
                                              QTY STOCKS
                                            </th>
                                          )}
                                          {hasAnyQtyStocks && (
                                            <th style={{ width: "80px" }}>
                                              TOTAL QTY
                                            </th>
                                          )}
                                        </>
                                      ) : (
                                        <th style={{ width: "150px" }}>
                                          REQ. QTY{mrHeader.progress_id === 1 && <span style={{ color: "red", marginLeft: "8px", fontWeight: "normal" }}>*</span>}
                                        </th>
                                      )}
                                      <th style={{ width: "95px" }}>
                                        BOQ REF.{mrHeader.progress_id === 1 && <span style={{ color: "red", marginLeft: "8px", fontWeight: "normal" }}>*</span>}
                                      </th>
                                      {hasAnyBrandSpecs && (
                                        <th style={{ width: "120px" }}>
                                          SPECS / NOTES
                                        </th>
                                      )}
                                      {hasAnyAttachment && (
                                        <th style={{ width: "100px" }}>
                                          ATTACHMENT
                                        </th>
                                      )}
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
                                        <th style={{ width: "160px" }}>
                                          APPROVAL STATUS
                                        </th>
                                      )}
                                      {(mrHeader.progress_id === 1 ||
                                        mrHeader.progress_id === 5 ||
                                        mrHeader.progress_id === 11) &&
                                        userInfo?.departmentID ===
                                          mrHeader.department_id && (
                                          <th style={{ width: "160px" }}>
                                            ACTIONS
                                          </th>
                                        )}
                                      {mrHeader.progress_id === 11 &&
                                        userInfo?.departmentID === 9 && (
                                          <th style={{ width: "160px" }}>
                                            ACTIONS
                                          </th>
                                        )}
                                      {mrHeader.progress_id === 3 &&
                                        (userInfo?.departmentID === 8 ||
                                          userInfo?.departmentID ===
                                            mrHeader.department_id) && (
                                          <th style={{ width: "160px" }}>
                                            QS REVIEW
                                          </th>
                                        )}
                                      {mrHeader.progress_id === 3 &&
                                        userInfo?.departmentID === 8 && (
                                          <th style={{ width: "160px" }}>
                                            ACTIONS
                                          </th>
                                        )}
                                      {mrHeader.progress_id === 2 &&
                                        userInfo?.departmentID === 16 && (
                                          <th style={{ width: "160px" }}>
                                            ACTIONS
                                          </th>
                                        )}
                                      {mrHeader.progress_id >= 10 &&
                                        (mrHeader.progress_id !== 11 ||
                                          userInfo?.departmentID === 8) &&
                                        !isManagerPriceApproval && (
                                          <th style={{ width: "160px" }}>
                                            <span>VENDOR & QUOTATION</span>
                                          </th>
                                        )}
                                      {mrHeader.progress_id === 7 && (
                                        <>
                                          <th style={{ width: "100px" }}>
                                            LOWEST PRICE
                                          </th>
                                          <th style={{ width: "100px" }}>
                                            AVG. PRICE
                                          </th>
                                          <th style={{ width: "100px" }}>
                                            PREV. PRICE
                                          </th>
                                          {userInfo?.departmentID === 9 && (
                                            <th style={{ width: "160px" }}>
                                              VENDOR & QUOTATION
                                            </th>
                                          )}
                                        </>
                                      )}
                                      {mrHeader.progress_id === 9 &&
                                        userInfo?.departmentID === 16 && (
                                          <th style={{ width: "160px" }}>
                                            VENDOR & QUOTATION
                                          </th>
                                        )}
                                      {mrHeader.progress_id >= 10 &&
                                        canSeePrice &&
                                        !isManagerPriceApproval && (
                                          <th style={{ width: "100px" }}>
                                            UNIT PRICE
                                          </th>
                                        )}
                                      {mrHeader.progress_id >= 10 &&
                                        canSeePrice &&
                                        !isManagerPriceApproval && (
                                          <th style={{ width: "100px" }}>
                                            TOTAL PRICE
                                          </th>
                                        )}
                                      {isManagerPriceApproval && (
                                        <>
                                          <th style={{ width: "100px" }}>
                                            LOWEST PRICE
                                          </th>
                                          <th style={{ width: "100px" }}>
                                            AVG. PRICE
                                          </th>
                                          <th style={{ width: "100px" }}>
                                            PREV. PRICE
                                          </th>
                                          <th style={{ width: "160px" }}>
                                            VENDOR & QUOTATION
                                          </th>
                                          <th style={{ width: "130px" }}>
                                            PRICE RANGE
                                          </th>
                                          <th style={{ width: "100px" }}>
                                            TOTAL PRICE
                                          </th>
                                        </>
                                      )}
                                      {userInfo?.departmentID === 11 &&
                                        mrHeader.progress_id === 4 && (
                                          <th style={{ width: "160px" }}>
                                            STOCK TRANSFER
                                          </th>
                                        )}
                                      {userInfo?.departmentID === 12 &&
                                        mrHeader.progress_id === 21 && (
                                          <th style={{ width: "160px" }}>
                                            QUALITY CONTROL
                                          </th>
                                        )}
                                      {userInfo?.departmentID === 11 &&
                                        mrHeader.progress_id === 24 && (
                                          <th style={{ width: "120px" }}>
                                            STOCKS
                                          </th>
                                        )}
                                      {userInfo?.departmentID === 9 &&
                                        mrHeader.progress_id === 23 && (
                                          <th style={{ width: "140px" }}>
                                            RESOLUTION
                                          </th>
                                        )}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {Array.isArray(items) &&
                                      items.map(function (item, itemIndex) {
                                        return (
                                          <tr key={item.id}>
                                            {/* Draft dept checkbox */}
                                            {mrHeader.progress_id === 1 &&
                                              isDeptEditable && (
                                                <td>
                                                  <input
                                                    type="checkbox"
                                                    checked={selectedDraftItemIds.has(
                                                      item.id,
                                                    )}
                                                    onChange={(e) => {
                                                      const newSet = new Set(
                                                        selectedDraftItemIds,
                                                      );
                                                      if (e.target.checked)
                                                        newSet.add(item.id);
                                                      else
                                                        newSet.delete(item.id);
                                                      setSelectedDraftItemIds(
                                                        newSet,
                                                      );
                                                    }}
                                                    style={{
                                                      cursor: "pointer",
                                                      accentColor:
                                                        "rgba(0, 163, 93, 1)",
                                                    }}
                                                  />
                                                </td>
                                              )}
                                            {/* QS Review checkbox */}
                                            {isQSReview && (
                                              <td>
                                                <input
                                                  type="checkbox"
                                                  checked={selectedItemIds.has(
                                                    item.id,
                                                  )}
                                                  onChange={(e) => {
                                                    const newSet = new Set(
                                                      selectedItemIds,
                                                    );
                                                    if (e.target.checked)
                                                      newSet.add(item.id);
                                                    else newSet.delete(item.id);
                                                    setSelectedItemIds(newSet);
                                                  }}
                                                  style={{
                                                    cursor: "pointer",
                                                    accentColor:
                                                      "rgba(0, 163, 93, 1)",
                                                  }}
                                                />
                                              </td>
                                            )}
                                            {/* Procurement Quotations checkbox */}
                                            {isProcurementQuotations && (
                                              <td>
                                                <input
                                                  type="checkbox"
                                                  checked={selectedProcurementItemIds.has(
                                                    item.id,
                                                  )}
                                                  onChange={(e) => {
                                                    const newSet = new Set(
                                                      selectedProcurementItemIds,
                                                    );
                                                    if (e.target.checked)
                                                      newSet.add(item.id);
                                                    else newSet.delete(item.id);
                                                    setSelectedProcurementItemIds(
                                                      newSet,
                                                    );
                                                  }}
                                                  style={{
                                                    cursor: "pointer",
                                                    accentColor:
                                                      "rgba(0, 163, 93, 1)",
                                                  }}
                                                />
                                              </td>
                                            )}
                                            {/* Manager Price Approval checkbox */}
                                            {isManagerPriceApproval && (
                                              <td>
                                                <input
                                                  type="checkbox"
                                                  checked={selectedManagerItemIds.has(
                                                    item.id,
                                                  )}
                                                  onChange={(e) => {
                                                    const newSet = new Set(
                                                      selectedManagerItemIds,
                                                    );
                                                    if (e.target.checked)
                                                      newSet.add(item.id);
                                                    else newSet.delete(item.id);
                                                    setSelectedManagerItemIds(
                                                      newSet,
                                                    );
                                                  }}
                                                  style={{
                                                    cursor: "pointer",
                                                    accentColor:
                                                      "rgba(0, 163, 93, 1)",
                                                  }}
                                                />
                                              </td>
                                            )}
                                            <td>{itemIndex + 1}</td>
                                            <td>
                                              <div
                                                style={{
                                                  display: "flex",
                                                  alignItems: "center",
                                                  gap: "8px",
                                                }}
                                              >
                                                <div>
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
                                                </div>
                                                {(isManagerPriceApproval ||
                                                  isQSReview) && (
                                                  <EditMrItemButton
                                                    projectID={
                                                      mrHeader.project_id
                                                    }
                                                    item={item}
                                                    bgColor="rgba(239, 239, 239, 1)"
                                                    borderColor="rgba(223, 223, 223, 1)"
                                                    textColor="black"
                                                    stageName={currentStageName}
                                                    canEditItemDetails
                                                  >
                                                    <img
                                                      src={pencilIcon}
                                                      alt="edit"
                                                    />
                                                  </EditMrItemButton>
                                                )}
                                              </div>
                                            </td>
                                            {mrHeader.progress_id === 1 && (
                                              <td
                                                style={{ overflow: "visible" }}
                                              >
                                                <InventoryStatusCell
                                                  matches={
                                                    itemInventoryStatus === null
                                                      ? undefined
                                                      : (itemInventoryStatus[
                                                          item
                                                            .material_description
                                                        ] ?? [])
                                                  }
                                                />
                                              </td>
                                            )}
                                            {mrHeader.progress_id >= 9 ? (
                                              <>
                                                <td>
                                                  {formatNumber(item?.quantity)}{" "}
                                                  {item.unit}
                                                </td>
                                                {hasAnyQtyStocks && (
                                                  <td>
                                                    {(() => {
                                                      const proposedQty =
                                                        Number(
                                                          item.approved_proposed_quantity,
                                                        ) || 0;
                                                      const requestedQty =
                                                        Number(item.quantity) ||
                                                        0;
                                                      const stockQty =
                                                        proposedQty >
                                                        requestedQty
                                                          ? proposedQty -
                                                            requestedQty
                                                          : 0;
                                                      return stockQty > 0
                                                        ? `${formatNumber(stockQty)} ${item.unit}`
                                                        : "-";
                                                    })()}
                                                  </td>
                                                )}
                                                {hasAnyQtyStocks && (
                                                  <td>
                                                    {formatNumber(
                                                      item?.approved_proposed_quantity,
                                                    )}{" "}
                                                    {item.unit}
                                                  </td>
                                                )}
                                              </>
                                            ) : isDeptEditable ? (
                                              <td>
                                                <div
                                                  style={{
                                                    display: "flex",
                                                    border:
                                                      "1px solid rgba(217,217,217,1)",
                                                    borderRadius: "5px",
                                                    backgroundColor: "white",
                                                    overflow: "hidden",
                                                  }}
                                                >
                                                  <input
                                                    type="text"
                                                    value={
                                                      inlineQty[item.id] !==
                                                      undefined
                                                        ? inlineQty[item.id]
                                                        : item.quantity > 0
                                                          ? formatQtyWithCommas(
                                                              item.quantity,
                                                            )
                                                          : ""
                                                    }
                                                    placeholder="ENTER QTY"
                                                    onChange={(e) => {
                                                      const raw =
                                                        e.target.value.replace(
                                                          /,/g,
                                                          "",
                                                        );
                                                      if (
                                                        raw === "" ||
                                                        /^\d*\.?\d*$/.test(raw)
                                                      )
                                                        setInlineQty(
                                                          (prev) => ({
                                                            ...prev,
                                                            [item.id]: raw
                                                              ? formatQtyWithCommas(
                                                                  raw,
                                                                )
                                                              : "",
                                                          }),
                                                        );
                                                    }}
                                                    onBlur={() =>
                                                      saveInlineQty(item)
                                                    }
                                                    style={{
                                                      flex: 1,
                                                      border: "none",
                                                      borderRadius: 0,
                                                      padding: "7px",
                                                      background: "transparent",
                                                      width: "125px",
                                                    }}
                                                  />
                                                  <select
                                                    value={
                                                      inlineUnit[item.id] ??
                                                      (item.unit
                                                        ? mapPredefinedUnit(
                                                            item.unit,
                                                          )
                                                        : "N/A")
                                                    }
                                                    onChange={(e) =>
                                                      setInlineUnit((prev) => ({
                                                        ...prev,
                                                        [item.id]:
                                                          e.target.value,
                                                      }))
                                                    }
                                                    onBlur={() =>
                                                      saveInlineQty(item)
                                                    }
                                                    style={{
                                                      border: "none",
                                                      borderRadius: 0,
                                                      padding: "7px 4px",
                                                      background: "transparent",
                                                      cursor: "pointer",
                                                    }}
                                                  >
                                                    <option value="N/A">
                                                      N/A
                                                    </option>
                                                    {UNIT_OPTIONS.map((u) => (
                                                      <option key={u} value={u}>
                                                        {u}
                                                      </option>
                                                    ))}
                                                  </select>
                                                </div>
                                              </td>
                                            ) : (
                                              <td>
                                                {formatNumber(item?.quantity)}{" "}
                                                {item.unit}
                                              </td>
                                            )}
                                            <td>
                                              {isDeptEditable ? (
                                                <MultipleSelectBoqItemButton
                                                  projectID={
                                                    mrHeader.project_id
                                                  }
                                                  onSelectBoq={(ids) =>
                                                    saveInlineBoq(item, ids)
                                                  }
                                                  currentBoqLineIDs={
                                                    item.boq_line_ids
                                                      ? String(
                                                          item.boq_line_ids,
                                                        )
                                                          .split(",")
                                                          .map(Number)
                                                          .filter(Boolean)
                                                      : []
                                                  }
                                                  compact
                                                />
                                              ) : item.boq_line_ids ? (
                                                <BoqReferencePopUp
                                                  item={item}
                                                  mrHeader={mrHeader}
                                                />
                                              ) : (
                                                "-"
                                              )}
                                            </td>
                                            {hasAnyBrandSpecs && (
                                              <td>
                                                {isDeptEditable ? (
                                                  <AddBrandAndSpecs
                                                    item={item}
                                                    stageName="INITIAL APPROVAL"
                                                  />
                                                ) : (
                                                  <div
                                                    style={{
                                                      display: "flex",
                                                      gap: "10px",
                                                      alignItems: "center",
                                                    }}
                                                  >
                                                    {item.specification ? (
                                                      <InfoPopUpButton
                                                        text={
                                                          <>
                                                            <small>SPECS / NOTES</small>
                                                            <h2>
                                                              {item.specification ||
                                                                "-"}
                                                            </h2>
                                                          </>
                                                        }
                                                        header="SPECS / NOTES"
                                                      />
                                                    ) : !isQSReview ? (
                                                      <span>-</span>
                                                    ) : null}
                                                    {isQSReview && (
                                                      <QSEditBrandSpecButton
                                                        item={item}
                                                      />
                                                    )}
                                                  </div>
                                                )}
                                              </td>
                                            )}
                                            {hasAnyAttachment && (
                                              <td>
                                                {isDeptEditable ? (
                                                  <AddMrLineAttachment
                                                    item={item}
                                                  />
                                                ) : item.attachment ? (
                                                  <Button
                                                    componentType={"link"}
                                                    bgColor={
                                                      "rgba(239, 239, 239, 1)"
                                                    }
                                                    borderColor={
                                                      "rgba(223, 223, 223, 1)"
                                                    }
                                                    textColor={"black"}
                                                    style={{
                                                      padding: "7px 7px",
                                                    }}
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
                                            )}

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
                                                  userInfo?.departmentID ===
                                                    8) ||
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
                                                    {(mrHeader.progress_id ===
                                                      5 ||
                                                      mrHeader.progress_id ===
                                                        2) &&
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

                                                    {/* Show Manager approval buttons (not when rejected) */}
                                                    {mrHeader.progress_id ===
                                                      3 &&
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
                                                          bgColor={
                                                            "transparent"
                                                          }
                                                          borderColor={
                                                            "transparent"
                                                          }
                                                          textColor={"black"}
                                                          href={`/inventory/${item.linked_inventory_item_id}`}
                                                          style={{
                                                            padding: "0px",
                                                          }}
                                                        >
                                                          <img
                                                            src={
                                                              externalLinkIcon
                                                            }
                                                            alt="view"
                                                            style={{
                                                              filter:
                                                                "invert(1)",
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
                                                      stageName={
                                                        currentStageName
                                                      }
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
                                                      stageName={
                                                        currentStageName
                                                      }
                                                    >
                                                      <img
                                                        src={trashIcon}
                                                        alt="trash icon"
                                                      />
                                                    </DeleteMrItemButton>
                                                  </div>
                                                </td>
                                              )}

                                            {mrHeader.progress_id === 7 &&
                                              (() => {
                                                const stats =
                                                  materialPriceStats[
                                                    item.material_description
                                                  ];
                                                const fmt = (
                                                  v: number | null | undefined,
                                                ) =>
                                                  v != null
                                                    ? formatPriceAED(v)
                                                    : "N/A";
                                                return (
                                                  <>
                                                    <td
                                                      style={{
                                                        color:
                                                          "rgba(37,150,190,1)",
                                                        fontWeight: 600,
                                                        cursor:
                                                          stats?.lowest_price !=
                                                          null
                                                            ? "default"
                                                            : undefined,
                                                      }}
                                                      onMouseEnter={(e) =>
                                                        handleLowestPriceEnter(
                                                          e,
                                                          item.material_description,
                                                        )
                                                      }
                                                      onMouseLeave={
                                                        startLowestHideTimer
                                                      }
                                                    >
                                                      {fmt(stats?.lowest_price)}
                                                    </td>
                                                    <td
                                                      style={{
                                                        color:
                                                          "rgba(37,150,190,1)",
                                                        fontWeight: 600,
                                                      }}
                                                    >
                                                      {fmt(stats?.avg_price)}
                                                    </td>
                                                    <td
                                                      style={{
                                                        color:
                                                          "rgba(37,150,190,1)",
                                                        fontWeight: 600,
                                                        cursor:
                                                          stats?.prev_price !=
                                                          null
                                                            ? "default"
                                                            : undefined,
                                                      }}
                                                      onMouseEnter={(e) =>
                                                        handlePrevPriceEnter(
                                                          e,
                                                          item.material_description,
                                                        )
                                                      }
                                                      onMouseLeave={
                                                        startPrevHideTimer
                                                      }
                                                    >
                                                      {fmt(stats?.prev_price)}
                                                    </td>
                                                  </>
                                                );
                                              })()}

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

                                            {mrHeader.progress_id === 11 &&
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
                                                </div>
                                              </td>
                                            )}

                                            {mrHeader.progress_id >= 10 &&
                                              canSeePrice &&
                                              !isManagerPriceApproval && (
                                                <td>
                                                  {(() => {
                                                    let unitPrice: number;

                                                    if (
                                                      mrHeader.progress_id >=
                                                        12 &&
                                                      lpoLinePrices[item.id]
                                                    ) {
                                                      unitPrice =
                                                        lpoLinePrices[item.id]
                                                          .unitPrice;
                                                    } else {
                                                      unitPrice =
                                                        Number(
                                                          item.approved_unit_price,
                                                        ) || 0;
                                                    }
                                                    return formatPriceAED(
                                                      unitPrice,
                                                    );
                                                  })()}
                                                </td>
                                              )}

                                            {mrHeader.progress_id >= 10 &&
                                              canSeePrice &&
                                              !isManagerPriceApproval && (
                                                <td>
                                                  {(() => {
                                                    let totalPrice: number;

                                                    if (
                                                      mrHeader.progress_id >=
                                                        12 &&
                                                      lpoLinePrices[item.id]
                                                    ) {
                                                      totalPrice =
                                                        lpoLinePrices[item.id]
                                                          .totalPrice;
                                                    } else {
                                                      totalPrice =
                                                        Number(
                                                          item.approved_total_price,
                                                        ) || 0;
                                                    }
                                                    return formatPriceAED(
                                                      totalPrice,
                                                    );
                                                  })()}
                                                </td>
                                              )}

                                            {/* Manager Price Approval — LOWEST, AVG, PREV, VENDOR & QUOTATION, PRICE RANGE */}
                                            {isManagerPriceApproval &&
                                              (() => {
                                                const stats =
                                                  materialPriceStats[
                                                    item.material_description
                                                  ];
                                                const fmt = (
                                                  v: number | null | undefined,
                                                ) =>
                                                  v != null
                                                    ? formatPriceAED(v)
                                                    : "N/A";
                                                return (
                                                  <>
                                                    <td
                                                      style={{
                                                        color:
                                                          "rgba(37,150,190,1)",
                                                        fontWeight: 600,
                                                        cursor:
                                                          stats?.lowest_price !=
                                                          null
                                                            ? "default"
                                                            : undefined,
                                                      }}
                                                      onMouseEnter={(e) =>
                                                        handleLowestPriceEnter(
                                                          e,
                                                          item.material_description,
                                                        )
                                                      }
                                                      onMouseLeave={
                                                        startLowestHideTimer
                                                      }
                                                    >
                                                      {fmt(stats?.lowest_price)}
                                                    </td>
                                                    <td
                                                      style={{
                                                        color:
                                                          "rgba(37,150,190,1)",
                                                        fontWeight: 600,
                                                      }}
                                                    >
                                                      {fmt(stats?.avg_price)}
                                                    </td>
                                                    <td
                                                      style={{
                                                        color:
                                                          "rgba(37,150,190,1)",
                                                        fontWeight: 600,
                                                        cursor:
                                                          stats?.prev_price !=
                                                          null
                                                            ? "default"
                                                            : undefined,
                                                      }}
                                                      onMouseEnter={(e) =>
                                                        handlePrevPriceEnter(
                                                          e,
                                                          item.material_description,
                                                        )
                                                      }
                                                      onMouseLeave={
                                                        startPrevHideTimer
                                                      }
                                                    >
                                                      {fmt(stats?.prev_price)}
                                                    </td>
                                                    <td>
                                                      <div
                                                        style={{
                                                          display: "flex",
                                                          alignItems: "center",
                                                          gap: "6px",
                                                        }}
                                                      >
                                                        <PriceApprovalButton
                                                          progressID={
                                                            mrHeader.progress_id
                                                          }
                                                          mrLine={item}
                                                          bgColor="white"
                                                          borderColor="rgba(207, 207, 207, 1)"
                                                          textColor="black"
                                                          style={{
                                                            borderRadius:
                                                              "25px",
                                                            padding: "7px 20px",
                                                          }}
                                                          onTotalPriceChange={
                                                            handleTotalPriceChange
                                                          }
                                                        />
                                                        {itemsExceedingAvgPrice.has(
                                                          item.id,
                                                        ) && (
                                                          <img
                                                            src={warningIcon}
                                                            alt="warning"
                                                          />
                                                        )}
                                                      </div>
                                                    </td>
                                                    <td>
                                                      {(() => {
                                                        const range =
                                                          quotationPriceRanges[
                                                            item.id
                                                          ];
                                                        if (!range)
                                                          return "N/A";
                                                        if (
                                                          range.min ===
                                                          range.max
                                                        )
                                                          return formatPriceAED(
                                                            range.min,
                                                          );
                                                        return `${formatPriceAED(range.min)} – ${formatPriceAED(range.max)}`;
                                                      })()}
                                                    </td>
                                                    <td>
                                                      {formatPriceAED(
                                                        Number(
                                                          item.approved_total_price,
                                                        ) || 0,
                                                      )}
                                                    </td>
                                                  </>
                                                );
                                              })()}

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

                                  {mrHeader.progress_id >= 10 &&
                                    canSeePrice &&
                                    !isManagerPriceApproval && (
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
                                            {!!(
                                              items[0]?.approved_supplier_id &&
                                              lpoInvoiceStatus[
                                                items[0].approved_supplier_id
                                              ]?.hasLpo
                                            )
                                              ? formatPriceAED(
                                                  calculateItemsTotal(
                                                    getAllItemsInSubCategory(
                                                      suppliers,
                                                    ),
                                                  ),
                                                )
                                              : "N/A"}
                                          </td>
                                          {subtotalTrailingColSpan > 0 && (
                                            <td
                                              colSpan={subtotalTrailingColSpan}
                                            />
                                          )}
                                        </tr>
                                        {mrHeader.progress_id === 12 && (
                                          <tr>
                                            <td
                                              colSpan={subtotalLabelColSpan}
                                            />
                                            <td style={{ fontWeight: "600" }}>
                                              SUBTOTAL W/ VAT
                                            </td>
                                            <td style={{ fontWeight: "600" }}>
                                              {!!(
                                                items[0]
                                                  ?.approved_supplier_id &&
                                                lpoInvoiceStatus[
                                                  items[0].approved_supplier_id
                                                ]?.hasLpo
                                              )
                                                ? formatPriceAED(
                                                    calculateItemsTotalWithVat(
                                                      getAllItemsInSubCategory(
                                                        suppliers,
                                                      ),
                                                    ),
                                                  )
                                                : "N/A"}
                                            </td>
                                            {subtotalTrailingColSpan > 0 && (
                                              <td
                                                colSpan={
                                                  subtotalTrailingColSpan
                                                }
                                              />
                                            )}
                                          </tr>
                                        )}
                                      </tfoot>
                                    )}

                                  {isManagerPriceApproval && (
                                    <tfoot
                                      style={{
                                        borderTop:
                                          "1px solid rgba(239, 239, 239, 1)",
                                      }}
                                    >
                                      <tr>
                                        <td
                                          colSpan={subtotalLabelColSpan + 4}
                                        />
                                        <td style={{ fontWeight: "600" }}>
                                          SUBTOTAL
                                        </td>
                                        <td style={{ fontWeight: "600" }}>
                                          {formatPriceAED(
                                            calculateItemsTotal(
                                              getAllItemsInSubCategory(
                                                suppliers,
                                              ),
                                            ),
                                          )}
                                        </td>
                                      </tr>
                                    </tfoot>
                                  )}
                                </table>
                              )}

                              {/* ── Mobile card accordion view ── */}
                              {isMobile && (
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "8px",
                                  }}
                                >
                                  {Array.isArray(items) &&
                                    items.map((item, itemIndex) => {
                                      const isExpanded =
                                        expandedMobileItems.has(item.id);
                                      return (
                                        <div
                                          key={item.id}
                                          style={{
                                            border:
                                              "1px solid rgba(217,217,217,1)",
                                            borderRadius: "8px",
                                            overflow: "hidden",
                                            backgroundColor:
                                              "rgba(249,249,249,1)",
                                          }}
                                        >
                                          {/* Card header */}
                                          <div
                                            onClick={() =>
                                              toggleMobileExpand(item.id)
                                            }
                                            style={{
                                              display: "flex",
                                              alignItems: "center",
                                              gap: "10px",
                                              padding: "12px",
                                              cursor: "pointer",
                                              backgroundColor:
                                                "rgba(239,239,239,1)",
                                            }}
                                          >
                                            <div
                                              style={{
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                width: 32,
                                                height: 32,
                                                borderRadius: "8px",
                                                backgroundColor: "white",
                                                flexShrink: 0,
                                                transform: isExpanded
                                                  ? "rotate(90deg)"
                                                  : "rotate(0deg)",
                                                transition: "transform 0.2s",
                                              }}
                                            >
                                              <img
                                                src="/icons/arrow-right.svg"
                                                alt=""
                                                style={{
                                                  width: 14,
                                                  height: 14,
                                                  filter: "brightness(0)",
                                                }}
                                              />
                                            </div>
                                            <span
                                              style={{
                                                flex: 1,
                                                fontWeight: 600,
                                                fontSize: "13px",
                                              }}
                                            >
                                              {itemIndex + 1}.{" "}
                                              {item.material_description}
                                            </span>
                                            {/* Qty + Unit pill */}
                                            {isDeptEditable ? (
                                              <div
                                                onClick={(e) => e.stopPropagation()}
                                                style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "4px", flexShrink: 0 }}
                                              >
                                                <span style={{ fontSize: "10px", fontWeight: 600, color: "rgba(120,120,120,1)", textTransform: "uppercase" }}>
                                                  QTY <span style={{ color: "red" }}>*</span>
                                                </span>
                                              <div
                                                style={{
                                                  display: "flex",
                                                  border:
                                                    "1px solid rgba(217,217,217,1)",
                                                  borderRadius: "5px",
                                                  backgroundColor: "white",
                                                  overflow: "hidden",
                                                  flexShrink: 0,
                                                }}
                                              >
                                                <input
                                                  type="text"
                                                  value={
                                                    inlineQty[item.id] !==
                                                    undefined
                                                      ? inlineQty[item.id]
                                                      : item.quantity > 0
                                                        ? formatQtyWithCommas(
                                                            item.quantity,
                                                          )
                                                        : ""
                                                  }
                                                  placeholder="QTY"
                                                  onChange={(e) => {
                                                    const raw =
                                                      e.target.value.replace(
                                                        /,/g,
                                                        "",
                                                      );
                                                    if (
                                                      raw === "" ||
                                                      /^\d*\.?\d*$/.test(raw)
                                                    )
                                                      setInlineQty((prev) => ({
                                                        ...prev,
                                                        [item.id]: raw
                                                          ? formatQtyWithCommas(
                                                              raw,
                                                            )
                                                          : "",
                                                      }));
                                                  }}
                                                  onBlur={() =>
                                                    saveInlineQty(item)
                                                  }
                                                  style={{
                                                    width: "55px",
                                                    border: "none",
                                                    padding: "5px 6px",
                                                    background: "transparent",
                                                    fontSize: "12px",
                                                  }}
                                                />
                                                <select
                                                  value={
                                                    inlineUnit[item.id] ??
                                                    (item.unit
                                                      ? mapPredefinedUnit(
                                                          item.unit,
                                                        )
                                                      : "N/A")
                                                  }
                                                  onChange={(e) =>
                                                    setInlineUnit((prev) => ({
                                                      ...prev,
                                                      [item.id]: e.target.value,
                                                    }))
                                                  }
                                                  onBlur={() =>
                                                    saveInlineQty(item)
                                                  }
                                                  style={{
                                                    border: "none",
                                                    padding: "5px 4px",
                                                    background: "transparent",
                                                    cursor: "pointer",
                                                    fontSize: "12px",
                                                  }}
                                                >
                                                  <option value="N/A">
                                                    N/A
                                                  </option>
                                                  {UNIT_OPTIONS.map((u) => (
                                                    <option key={u} value={u}>
                                                      {u}
                                                    </option>
                                                  ))}
                                                </select>
                                              </div>
                                              </div>
                                            ) : (
                                              <span
                                                style={{
                                                  fontSize: "12px",
                                                  color: "rgba(100,100,100,1)",
                                                  flexShrink: 0,
                                                }}
                                              >
                                                {formatNumber(item?.quantity)}{" "}
                                                {item.unit}
                                              </span>
                                            )}
                                          </div>

                                          {/* Expanded body */}
                                          {isExpanded && (
                                            <div
                                              style={{
                                                padding: "12px",
                                                borderTop:
                                                  "1px solid rgba(239,239,239,1)",
                                                display: "flex",
                                                flexDirection: "column",
                                                gap: "12px",
                                              }}
                                            >
                                              {/* Row 1: Inventory Status + BOQ Ref */}
                                              <div
                                                style={{
                                                  display: "grid",
                                                  gridTemplateColumns:
                                                    "1fr 0.5fr",
                                                  gap: "25px",
                                                }}
                                              >
                                                {/* Inventory Status */}
                                                {mrHeader.progress_id === 1 && (
                                                  <div>
                                                    <div
                                                      style={{
                                                        fontSize: "10px",
                                                        color:
                                                          "rgba(120,120,120,1)",
                                                        fontWeight: 600,
                                                        marginBottom: "6px",
                                                        textTransform:
                                                          "uppercase",
                                                      }}
                                                    >
                                                      Inventory Status
                                                    </div>
                                                    <InventoryStatusCell
                                                      matches={
                                                        itemInventoryStatus ===
                                                        null
                                                          ? undefined
                                                          : (itemInventoryStatus[
                                                              item
                                                                .material_description
                                                            ] ?? [])
                                                      }
                                                    />
                                                  </div>
                                                )}

                                                {/* BOQ Ref */}
                                                <div>
                                                  <div
                                                    style={{
                                                      fontSize: "10px",
                                                      color:
                                                        "rgba(120,120,120,1)",
                                                      fontWeight: 600,
                                                      marginBottom: "6px",
                                                      textTransform:
                                                        "uppercase",
                                                    }}
                                                  >
                                                    BOQ Ref <span style={{ color: "red" }}>*</span>
                                                  </div>
                                                  {isDeptEditable ? (
                                                    <MultipleSelectBoqItemButton
                                                      projectID={
                                                        mrHeader.project_id
                                                      }
                                                      onSelectBoq={(ids) =>
                                                        saveInlineBoq(item, ids)
                                                      }
                                                      currentBoqLineIDs={
                                                        item.boq_line_ids
                                                          ? String(
                                                              item.boq_line_ids,
                                                            )
                                                              .split(",")
                                                              .map(Number)
                                                              .filter(Boolean)
                                                          : []
                                                      }
                                                      itemName={item.material_description}
                                                      compact
                                                    />
                                                  ) : item.boq_line_ids ? (
                                                    <BoqReferencePopUp
                                                      item={item}
                                                      mrHeader={mrHeader}
                                                    />
                                                  ) : (
                                                    <span
                                                      style={{
                                                        fontSize: "12px",
                                                      }}
                                                    >
                                                      -
                                                    </span>
                                                  )}
                                                </div>
                                              </div>

                                              {/* Row 2: Specs / Notes (full width) */}
                                              <div>
                                                <div
                                                  style={{
                                                    fontSize: "10px",
                                                    color:
                                                      "rgba(120,120,120,1)",
                                                    fontWeight: 600,
                                                    marginBottom: "6px",
                                                    textTransform: "uppercase",
                                                  }}
                                                >
                                                  Specs / Notes
                                                </div>
                                                {isDeptEditable ? (
                                                  <MobileBrandSpecsEditor
                                                    item={item}
                                                    stageName="INITIAL APPROVAL"
                                                  />
                                                ) : item.specification ? (
                                                  <InfoPopUpButton
                                                    text={
                                                      <>
                                                        <small>SPECS / NOTES</small>
                                                        <h2>
                                                          {item.specification ||
                                                            "-"}
                                                        </h2>
                                                      </>
                                                    }
                                                    header="SPECS / NOTES"
                                                  />
                                                ) : (
                                                  <span
                                                    style={{ fontSize: "12px" }}
                                                  >
                                                    -
                                                  </span>
                                                )}
                                              </div>

                                              {/* Row 3: Attachment */}
                                              <div>
                                                <div
                                                  style={{
                                                    fontSize: "10px",
                                                    color:
                                                      "rgba(120,120,120,1)",
                                                    fontWeight: 600,
                                                    marginBottom: "6px",
                                                    textTransform: "uppercase",
                                                  }}
                                                >
                                                  Attachment
                                                </div>
                                                {isDeptEditable ? (
                                                  <AddMrLineAttachment
                                                    item={item}
                                                  />
                                                ) : item.attachment ? (
                                                  <Button
                                                    componentType="link"
                                                    bgColor="rgba(239,239,239,1)"
                                                    borderColor="rgba(223,223,223,1)"
                                                    textColor="black"
                                                    style={{
                                                      padding: "7px 7px",
                                                    }}
                                                    href={item.attachment}
                                                    target="_blank"
                                                  >
                                                    <img
                                                      src={externalLinkIcon}
                                                      alt="external link"
                                                    />
                                                  </Button>
                                                ) : (
                                                  <span
                                                    style={{ fontSize: "12px" }}
                                                  >
                                                    -
                                                  </span>
                                                )}
                                              </div>

                                              {/* Edit / Delete actions (draft only) */}
                                              {isDeptEditable && (
                                                <>
                                                  <br />
                                                  <br />
                                                  <div
                                                    style={{
                                                      display: "flex",
                                                      gap: "8px",
                                                      justifyContent:
                                                        "flex-end",
                                                    }}
                                                  >
                                                    <EditMrItemButton
                                                      item={item}
                                                      bgColor="rgba(239,239,239,1)"
                                                      borderColor="rgba(223,223,223,1)"
                                                      textColor="black"
                                                      stageName={
                                                        currentStageName
                                                      }
                                                    >
                                                      <img
                                                        src={pencilIcon}
                                                        alt="edit"
                                                      />
                                                    </EditMrItemButton>
                                                    <DeleteMrItemButton
                                                      item={item}
                                                      bgColor="rgba(239,239,239,1)"
                                                      borderColor="rgba(223,223,223,1)"
                                                      textColor="black"
                                                      stageName={
                                                        currentStageName
                                                      }
                                                    >
                                                      <img
                                                        src={trashIcon}
                                                        alt="delete"
                                                      />
                                                    </DeleteMrItemButton>
                                                  </div>
                                                </>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                </div>
                              )}

                              {isManagerPriceApproval &&
                                items.filter((i) =>
                                  itemsExceedingAvgPrice.has(i.id),
                                ).length > 0 && (
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "8px",
                                      marginTop: "12px",
                                      fontSize: "12px",
                                      color: "rgba(220,38,38,1)",
                                      fontWeight: 600,
                                    }}
                                  >
                                    <img src={warningIcon} alt="warning" />
                                    Price exceeds average paid for items (
                                    {
                                      items.filter((i) =>
                                        itemsExceedingAvgPrice.has(i.id),
                                      ).length
                                    }
                                    )
                                  </div>
                                )}

                              <br />
                            </div>
                          ),
                        )}
                      </div>
                    );
                  }),
              )
            : Object.entries(subCategories).map(function (
                [subCategory, suppliers],
                index,
                allSubCategories,
              ) {
                const allItems = getAllItemsInSubCategory(suppliers);
                const firstItem = allItems[0];

                return (
                  <div key={subCategory} className="subcategory-section">
                    <div className="subcategory-header">
                      {/* Smart select portal — commented out
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
                        )} */}

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
                            {/* <RenameMrSubCategoryButton
                              items={allItems}
                              categoryID={String(
                                firstItem.material_category_id,
                              )}
                              subCategoryID={String(
                                firstItem.material_subcategory_id,
                              )}
                            /> */}

                            <DeleteMrSubCategoryButton
                              items={allItems}
                              subCategory={subCategory}
                            />
                          </div>
                        )}
                    </div>

                    <br />

                    {Object.entries(suppliers).map(
                      ([supplier, items], supplierIndex, allSuppliers) => (
                        <div key={supplier} style={{ marginBottom: "2rem" }}>
                          {!isMobile && (
                          <table className="items-table two-toned fixed-layout">
                            <thead>
                              <tr>
                                {mrHeader.progress_id === 1 &&
                                  isDeptEditable && (
                                    <th style={{ width: "24px" }}>
                                      <input
                                        type="checkbox"
                                        checked={
                                          items.length > 0 &&
                                          items.every((i) =>
                                            selectedDraftItemIds.has(i.id),
                                          )
                                        }
                                        onChange={(e) => {
                                          const newSet = new Set(
                                            selectedDraftItemIds,
                                          );
                                          items.forEach((i) => {
                                            if (e.target.checked)
                                              newSet.add(i.id);
                                            else newSet.delete(i.id);
                                          });
                                          setSelectedDraftItemIds(newSet);
                                        }}
                                        style={{
                                          cursor: "pointer",
                                          accentColor: "rgba(0, 163, 93, 1)",
                                        }}
                                      />
                                    </th>
                                  )}
                                {isQSReview && (
                                  <th style={{ width: "40px" }}>
                                    <input
                                      type="checkbox"
                                      checked={
                                        items.length > 0 &&
                                        items.every((i) =>
                                          selectedItemIds.has(i.id),
                                        )
                                      }
                                      onChange={(e) => {
                                        const newSet = new Set(selectedItemIds);
                                        items.forEach((i) => {
                                          if (e.target.checked)
                                            newSet.add(i.id);
                                          else newSet.delete(i.id);
                                        });
                                        setSelectedItemIds(newSet);
                                      }}
                                      style={{
                                        cursor: "pointer",
                                        accentColor: "rgba(0, 163, 93, 1)",
                                      }}
                                    />
                                  </th>
                                )}
                                {isProcurementQuotations && (
                                  <th style={{ width: "24px" }}>
                                    <input
                                      type="checkbox"
                                      checked={
                                        items.length > 0 &&
                                        items.every((i) =>
                                          selectedProcurementItemIds.has(i.id),
                                        )
                                      }
                                      onChange={(e) => {
                                        const newSet = new Set(
                                          selectedProcurementItemIds,
                                        );
                                        items.forEach((i) => {
                                          if (e.target.checked)
                                            newSet.add(i.id);
                                          else newSet.delete(i.id);
                                        });
                                        setSelectedProcurementItemIds(newSet);
                                      }}
                                      style={{
                                        cursor: "pointer",
                                        accentColor: "rgba(0, 163, 93, 1)",
                                      }}
                                    />
                                  </th>
                                )}
                                {isManagerPriceApproval && (
                                  <th style={{ width: "24px" }}>
                                    <input
                                      type="checkbox"
                                      checked={
                                        items.length > 0 &&
                                        items.every((i) =>
                                          selectedManagerItemIds.has(i.id),
                                        )
                                      }
                                      onChange={(e) => {
                                        const newSet = new Set(
                                          selectedManagerItemIds,
                                        );
                                        items.forEach((i) => {
                                          if (e.target.checked)
                                            newSet.add(i.id);
                                          else newSet.delete(i.id);
                                        });
                                        setSelectedManagerItemIds(newSet);
                                      }}
                                      style={{
                                        cursor: "pointer",
                                        accentColor: "rgba(0, 163, 93, 1)",
                                      }}
                                    />
                                  </th>
                                )}
                                <th style={{ width: "40px" }}>#</th>
                                <th style={{ width: "130px" }}>ITEM</th>
                                {mrHeader.progress_id === 1 && (
                                  <th style={{ width: "150px" }}>
                                    INVENTORY STATUS
                                  </th>
                                )}
                                {mrHeader.progress_id >= 9 ? (
                                  <>
                                    <th style={{ width: "80px" }}>QTY USE</th>
                                    {hasAnyQtyStocks && (
                                      <th style={{ width: "90px" }}>
                                        QTY STOCKS
                                      </th>
                                    )}
                                    {hasAnyQtyStocks && (
                                      <th style={{ width: "80px" }}>
                                        TOTAL QTY
                                      </th>
                                    )}
                                  </>
                                ) : (
                                  <th style={{ width: "150px" }}>REQ. QTY{mrHeader.progress_id === 1 && <span style={{ color: "red", marginLeft: "8px", fontWeight: "normal" }}>*</span>}</th>
                                )}
                                <th style={{ width: "95px" }}>BOQ REF.{mrHeader.progress_id === 1 && <span style={{ color: "red", marginLeft: "8px", fontWeight: "normal" }}>*</span>}</th>
                                {hasAnyBrandSpecs && (
                                  <th style={{ width: "120px" }}>
                                    SPECS / NOTES
                                  </th>
                                )}
                                {hasAnyAttachment && (
                                  <th style={{ width: "100px" }}>ATTACHMENT</th>
                                )}
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
                                  <th style={{ width: "160px" }}>
                                    APPROVAL STATUS
                                  </th>
                                )}
                                {(mrHeader.progress_id === 1 ||
                                  mrHeader.progress_id === 5 ||
                                  mrHeader.progress_id === 11) &&
                                  userInfo?.departmentID ===
                                    mrHeader.department_id && (
                                    <th style={{ width: "160px" }}>ACTIONS</th>
                                  )}
                                {mrHeader.progress_id === 11 &&
                                  userInfo?.departmentID === 9 && (
                                    <th style={{ width: "160px" }}>ACTIONS</th>
                                  )}
                                {mrHeader.progress_id === 3 &&
                                  (userInfo?.departmentID === 8 ||
                                    userInfo?.departmentID ===
                                      mrHeader.department_id) && (
                                    <th style={{ width: "160px" }}>
                                      QS REVIEW
                                    </th>
                                  )}
                                {mrHeader.progress_id === 3 &&
                                  userInfo?.departmentID === 8 && (
                                    <th style={{ width: "160px" }}>ACTIONS</th>
                                  )}
                                {mrHeader.progress_id === 2 &&
                                  userInfo?.departmentID === 16 && (
                                    <th style={{ width: "160px" }}>ACTIONS</th>
                                  )}
                                {mrHeader.progress_id >= 10 &&
                                  (mrHeader.progress_id !== 11 ||
                                    userInfo?.departmentID === 8) &&
                                  !isManagerPriceApproval && (
                                    <th style={{ width: "160px" }}>
                                      <span>VENDOR & QUOTATION</span>
                                    </th>
                                  )}
                                {mrHeader.progress_id === 7 && (
                                  <>
                                    <th style={{ width: "100px" }}>
                                      LOWEST PRICE
                                    </th>
                                    <th style={{ width: "100px" }}>
                                      AVG. PRICE
                                    </th>
                                    <th style={{ width: "100px" }}>
                                      PREV. PRICE
                                    </th>
                                    {userInfo?.departmentID === 9 && (
                                      <th style={{ width: "160px" }}>
                                        VENDOR & QUOTATION
                                      </th>
                                    )}
                                  </>
                                )}
                                {mrHeader.progress_id === 9 &&
                                  userInfo?.departmentID === 16 && (
                                    <th style={{ width: "160px" }}>
                                      VENDOR & QUOTATION
                                    </th>
                                  )}
                                {mrHeader.progress_id >= 10 &&
                                  canSeePrice &&
                                  !isManagerPriceApproval && (
                                    <th style={{ width: "100px" }}>
                                      UNIT PRICE
                                    </th>
                                  )}
                                {mrHeader.progress_id >= 10 &&
                                  canSeePrice &&
                                  !isManagerPriceApproval && (
                                    <th style={{ width: "100px" }}>
                                      TOTAL PRICE
                                    </th>
                                  )}
                                {isManagerPriceApproval && (
                                  <>
                                    <th style={{ width: "100px" }}>
                                      LOWEST PRICE
                                    </th>
                                    <th style={{ width: "100px" }}>
                                      AVG. PRICE
                                    </th>
                                    <th style={{ width: "100px" }}>
                                      PREV. PRICE
                                    </th>
                                    <th style={{ width: "160px" }}>
                                      VENDOR & QUOTATION
                                    </th>
                                    <th style={{ width: "130px" }}>
                                      PRICE RANGE
                                    </th>
                                    <th style={{ width: "100px" }}>
                                      TOTAL PRICE
                                    </th>
                                  </>
                                )}
                                {userInfo?.departmentID === 12 &&
                                  mrHeader.progress_id === 21 && (
                                    <th style={{ width: "160px" }}>
                                      QUALITY CONTROL
                                    </th>
                                  )}
                                {userInfo?.departmentID === 11 &&
                                  mrHeader.progress_id === 24 && (
                                    <th style={{ width: "120px" }}>STOCKS</th>
                                  )}
                                {userInfo?.departmentID === 9 &&
                                  mrHeader.progress_id === 23 && (
                                    <th style={{ width: "140px" }}>
                                      RESOLUTION
                                    </th>
                                  )}
                                {(userInfo?.departmentID === 11 ||
                                  userInfo?.departmentID === 8) &&
                                  mrHeader.progress_id === 4 && (
                                    <th style={{ width: "160px" }}>
                                      STOCK TRANSFER
                                    </th>
                                  )}
                              </tr>
                            </thead>
                            <tbody>
                              {Array.isArray(items) &&
                                items.map(function (item, itemIndex) {
                                  return (
                                    <tr key={item.id}>
                                      {/* Draft dept checkbox */}
                                      {mrHeader.progress_id === 1 &&
                                        isDeptEditable && (
                                          <td>
                                            <input
                                              type="checkbox"
                                              checked={selectedDraftItemIds.has(
                                                item.id,
                                              )}
                                              onChange={(e) => {
                                                const newSet = new Set(
                                                  selectedDraftItemIds,
                                                );
                                                if (e.target.checked)
                                                  newSet.add(item.id);
                                                else newSet.delete(item.id);
                                                setSelectedDraftItemIds(newSet);
                                              }}
                                              style={{
                                                cursor: "pointer",
                                                accentColor:
                                                  "rgba(0, 163, 93, 1)",
                                              }}
                                            />
                                          </td>
                                        )}
                                      {isQSReview && (
                                        <td>
                                          <input
                                            type="checkbox"
                                            checked={selectedItemIds.has(
                                              item.id,
                                            )}
                                            onChange={(e) => {
                                              const newSet = new Set(
                                                selectedItemIds,
                                              );
                                              if (e.target.checked)
                                                newSet.add(item.id);
                                              else newSet.delete(item.id);
                                              setSelectedItemIds(newSet);
                                            }}
                                            style={{
                                              cursor: "pointer",
                                              accentColor:
                                                "rgba(0, 163, 93, 1)",
                                            }}
                                          />
                                        </td>
                                      )}
                                      {isProcurementQuotations && (
                                        <td>
                                          <input
                                            type="checkbox"
                                            checked={selectedProcurementItemIds.has(
                                              item.id,
                                            )}
                                            onChange={(e) => {
                                              const newSet = new Set(
                                                selectedProcurementItemIds,
                                              );
                                              if (e.target.checked)
                                                newSet.add(item.id);
                                              else newSet.delete(item.id);
                                              setSelectedProcurementItemIds(
                                                newSet,
                                              );
                                            }}
                                            style={{
                                              cursor: "pointer",
                                              accentColor:
                                                "rgba(0, 163, 93, 1)",
                                            }}
                                          />
                                        </td>
                                      )}
                                      {/* Manager Price Approval checkbox */}
                                      {isManagerPriceApproval && (
                                        <td>
                                          <input
                                            type="checkbox"
                                            checked={selectedManagerItemIds.has(
                                              item.id,
                                            )}
                                            onChange={(e) => {
                                              const newSet = new Set(
                                                selectedManagerItemIds,
                                              );
                                              if (e.target.checked)
                                                newSet.add(item.id);
                                              else newSet.delete(item.id);
                                              setSelectedManagerItemIds(newSet);
                                            }}
                                            style={{
                                              cursor: "pointer",
                                              accentColor:
                                                "rgba(0, 163, 93, 1)",
                                            }}
                                          />
                                        </td>
                                      )}
                                      <td>{itemIndex + 1}</td>
                                      <td>
                                        <div
                                          style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "8px",
                                          }}
                                        >
                                          <div>
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
                                          </div>
                                          {(isManagerPriceApproval ||
                                            isQSReview) && (
                                            <EditMrItemButton
                                              projectID={mrHeader.project_id}
                                              item={item}
                                              bgColor="rgba(239, 239, 239, 1)"
                                              borderColor="rgba(223, 223, 223, 1)"
                                              textColor="black"
                                              stageName={currentStageName}
                                              canEditItemDetails
                                            >
                                              <img
                                                src={pencilIcon}
                                                alt="edit"
                                              />
                                            </EditMrItemButton>
                                          )}
                                        </div>
                                      </td>
                                      {mrHeader.progress_id === 1 && (
                                        <td style={{ overflow: "visible" }}>
                                          <InventoryStatusCell
                                            matches={
                                              itemInventoryStatus === null
                                                ? undefined
                                                : (itemInventoryStatus[
                                                    item.material_description
                                                  ] ?? [])
                                            }
                                          />
                                        </td>
                                      )}
                                      {mrHeader.progress_id >= 9 ? (
                                        <>
                                          <td>
                                            {formatNumber(item?.quantity)}{" "}
                                            {item.unit}
                                          </td>
                                          {hasAnyQtyStocks && (
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
                                          )}
                                          {hasAnyQtyStocks && (
                                            <td>
                                              {formatNumber(
                                                item?.approved_proposed_quantity,
                                              )}{" "}
                                              {item.unit}
                                            </td>
                                          )}
                                        </>
                                      ) : isDeptEditable ? (
                                        <td>
                                          <div
                                            style={{
                                              display: "flex",
                                              border:
                                                "1px solid rgba(217,217,217,1)",
                                              borderRadius: "5px",
                                              backgroundColor: "white",
                                              overflow: "hidden",
                                            }}
                                          >
                                            <input
                                              type="text"
                                              value={
                                                inlineQty[item.id] !== undefined
                                                  ? inlineQty[item.id]
                                                  : item.quantity > 0
                                                    ? formatQtyWithCommas(
                                                        item.quantity,
                                                      )
                                                    : ""
                                              }
                                              placeholder="ENTER QTY"
                                              onChange={(e) => {
                                                const raw =
                                                  e.target.value.replace(
                                                    /,/g,
                                                    "",
                                                  );
                                                if (
                                                  raw === "" ||
                                                  /^\d*\.?\d*$/.test(raw)
                                                )
                                                  setInlineQty((prev) => ({
                                                    ...prev,
                                                    [item.id]: raw
                                                      ? formatQtyWithCommas(raw)
                                                      : "",
                                                  }));
                                              }}
                                              onBlur={() =>
                                                saveInlineQty(item)
                                              }
                                              style={{
                                                flex: 1,
                                                border: "none",
                                                borderRadius: 0,
                                                padding: "7px",
                                                background: "transparent",
                                                width: "125px",
                                              }}
                                            />
                                            <select
                                              value={
                                                inlineUnit[item.id] ??
                                                (item.unit
                                                  ? mapPredefinedUnit(item.unit)
                                                  : "N/A")
                                              }
                                              onChange={(e) =>
                                                setInlineUnit((prev) => ({
                                                  ...prev,
                                                  [item.id]: e.target.value,
                                                }))
                                              }
                                              onBlur={() =>
                                                saveInlineQty(item)
                                              }
                                              style={{
                                                border: "none",
                                                borderRadius: 0,
                                                padding: "7px 4px",
                                                background: "transparent",
                                                cursor: "pointer",
                                              }}
                                            >
                                              <option value="N/A">N/A</option>
                                              {UNIT_OPTIONS.map((u) => (
                                                <option key={u} value={u}>
                                                  {u}
                                                </option>
                                              ))}
                                            </select>
                                          </div>
                                        </td>
                                      ) : (
                                        <td>
                                          <div
                                            style={{
                                              display: "flex",
                                              gap: "10px",
                                              alignItems: "center",
                                            }}
                                          >
                                            {formatNumber(item?.quantity)}{" "}
                                            {item.unit}
                                            {isQSReview && (
                                              <QSEditQtyButton item={item} />
                                            )}
                                          </div>
                                        </td>
                                      )}
                                      <td>
                                        {isDeptEditable ? (
                                          <MultipleSelectBoqItemButton
                                            projectID={mrHeader.project_id}
                                            onSelectBoq={(ids) =>
                                              saveInlineBoq(item, ids)
                                            }
                                            currentBoqLineIDs={
                                              item.boq_line_ids
                                                ? String(item.boq_line_ids)
                                                    .split(",")
                                                    .map(Number)
                                                    .filter(Boolean)
                                                : []
                                            }
                                            compact
                                          />
                                        ) : item.boq_line_ids ? (
                                          <BoqReferencePopUp
                                            item={item}
                                            mrHeader={mrHeader}
                                          />
                                        ) : (
                                          "-"
                                        )}
                                      </td>
                                      {hasAnyBrandSpecs && (
                                        <td>
                                          {isDeptEditable ? (
                                            <AddBrandAndSpecs
                                              item={item}
                                              stageName="INITIAL APPROVAL"
                                            />
                                          ) : (
                                            <div
                                              style={{
                                                display: "flex",
                                                gap: "8px",
                                                alignItems: "center",
                                              }}
                                            >
                                              {item.specification ? (
                                                <InfoPopUpButton
                                                  text={
                                                    <>
                                                      <small>SPECS / NOTES</small>
                                                      <h2>
                                                        {item.specification ||
                                                          "-"}
                                                      </h2>
                                                    </>
                                                  }
                                                  header="SPECS / NOTES"
                                                />
                                              ) : !isQSReview ? (
                                                <span>-</span>
                                              ) : null}
                                              {isQSReview && (
                                                <QSEditBrandSpecButton
                                                  item={item}
                                                />
                                              )}
                                            </div>
                                          )}
                                        </td>
                                      )}

                                      {hasAnyAttachment && (
                                        <td>
                                          {isDeptEditable ? (
                                            <AddMrLineAttachment item={item} />
                                          ) : item.attachment ? (
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
                                      )}

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

                                              {/* Show Manager approval buttons (not when rejected) */}
                                              {mrHeader.progress_id === 3 &&
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
                                                stageName={currentStageName}
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
                                                stageName={currentStageName}
                                              >
                                                <img
                                                  src={trashIcon}
                                                  alt="trash icon"
                                                />
                                              </DeleteMrItemButton>
                                            </div>
                                          </td>
                                        )}

                                      {mrHeader.progress_id === 7 &&
                                        (() => {
                                          const stats =
                                            materialPriceStats[
                                              item.material_description
                                            ];
                                          const fmt = (
                                            v: number | null | undefined,
                                          ) =>
                                            v != null
                                              ? formatPriceAED(v)
                                              : "N/A";
                                          return (
                                            <>
                                              <td
                                                style={{
                                                  color: "rgba(37,150,190,1)",
                                                  fontWeight: 600,
                                                  cursor:
                                                    stats?.lowest_price != null
                                                      ? "default"
                                                      : undefined,
                                                }}
                                                onMouseEnter={(e) =>
                                                  handleLowestPriceEnter(
                                                    e,
                                                    item.material_description,
                                                  )
                                                }
                                                onMouseLeave={
                                                  startLowestHideTimer
                                                }
                                              >
                                                {fmt(stats?.lowest_price)}
                                              </td>
                                              <td
                                                style={{
                                                  color: "rgba(37,150,190,1)",
                                                  fontWeight: 600,
                                                }}
                                              >
                                                {fmt(stats?.avg_price)}
                                              </td>
                                              <td
                                                style={{
                                                  color: "rgba(37,150,190,1)",
                                                  fontWeight: 600,
                                                  cursor:
                                                    stats?.prev_price != null
                                                      ? "default"
                                                      : undefined,
                                                }}
                                                onMouseEnter={(e) =>
                                                  handlePrevPriceEnter(
                                                    e,
                                                    item.material_description,
                                                  )
                                                }
                                                onMouseLeave={
                                                  startPrevHideTimer
                                                }
                                              >
                                                {fmt(stats?.prev_price)}
                                              </td>
                                            </>
                                          );
                                        })()}

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

                                      {mrHeader.progress_id === 11 &&
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
                                          </div>
                                        </td>
                                      )}

                                      {mrHeader.progress_id >= 10 &&
                                        canSeePrice &&
                                        !isManagerPriceApproval && (
                                          <td>
                                            {(() => {
                                              let unitPrice: number;

                                              if (
                                                mrHeader.progress_id >= 12 &&
                                                lpoLinePrices[item.id]
                                              ) {
                                                unitPrice =
                                                  lpoLinePrices[item.id]
                                                    .unitPrice;
                                              } else {
                                                unitPrice =
                                                  Number(
                                                    item.approved_unit_price,
                                                  ) || 0;
                                              }
                                              return formatPriceAED(unitPrice);
                                            })()}
                                          </td>
                                        )}

                                      {mrHeader.progress_id >= 10 &&
                                        canSeePrice &&
                                        !isManagerPriceApproval && (
                                          <td>
                                            {(() => {
                                              let totalPrice: number;

                                              if (
                                                mrHeader.progress_id >= 12 &&
                                                lpoLinePrices[item.id]
                                              ) {
                                                totalPrice =
                                                  lpoLinePrices[item.id]
                                                    .totalPrice;
                                              } else {
                                                totalPrice =
                                                  Number(
                                                    item.approved_total_price,
                                                  ) || 0;
                                              }
                                              return formatPriceAED(totalPrice);
                                            })()}
                                          </td>
                                        )}

                                      {/* Manager Price Approval — LOWEST, AVG, PREV, VENDOR & QUOTATION, PRICE RANGE */}
                                      {isManagerPriceApproval &&
                                        (() => {
                                          const stats =
                                            materialPriceStats[
                                              item.material_description
                                            ];
                                          const fmt = (
                                            v: number | null | undefined,
                                          ) =>
                                            v != null
                                              ? formatPriceAED(v)
                                              : "N/A";
                                          return (
                                            <>
                                              <td
                                                style={{
                                                  color: "rgba(37,150,190,1)",
                                                  fontWeight: 600,
                                                  cursor:
                                                    stats?.lowest_price != null
                                                      ? "default"
                                                      : undefined,
                                                }}
                                                onMouseEnter={(e) =>
                                                  handleLowestPriceEnter(
                                                    e,
                                                    item.material_description,
                                                  )
                                                }
                                                onMouseLeave={
                                                  startLowestHideTimer
                                                }
                                              >
                                                {fmt(stats?.lowest_price)}
                                              </td>
                                              <td
                                                style={{
                                                  color: "rgba(37,150,190,1)",
                                                  fontWeight: 600,
                                                }}
                                              >
                                                {fmt(stats?.avg_price)}
                                              </td>
                                              <td
                                                style={{
                                                  color: "rgba(37,150,190,1)",
                                                  fontWeight: 600,
                                                  cursor:
                                                    stats?.prev_price != null
                                                      ? "default"
                                                      : undefined,
                                                }}
                                                onMouseEnter={(e) =>
                                                  handlePrevPriceEnter(
                                                    e,
                                                    item.material_description,
                                                  )
                                                }
                                                onMouseLeave={
                                                  startPrevHideTimer
                                                }
                                              >
                                                {fmt(stats?.prev_price)}
                                              </td>
                                              <td>
                                                <div
                                                  style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "6px",
                                                  }}
                                                >
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
                                                  {itemsExceedingAvgPrice.has(
                                                    item.id,
                                                  ) && (
                                                    <img
                                                      src={warningIcon}
                                                      alt="warning"
                                                    />
                                                  )}
                                                </div>
                                              </td>
                                              <td>
                                                {(() => {
                                                  const range =
                                                    quotationPriceRanges[
                                                      item.id
                                                    ];
                                                  if (!range) return "N/A";
                                                  if (range.min === range.max)
                                                    return formatPriceAED(
                                                      range.min,
                                                    );
                                                  return `${formatPriceAED(range.min)} – ${formatPriceAED(range.max)}`;
                                                })()}
                                              </td>
                                              <td>
                                                {formatPriceAED(
                                                  Number(
                                                    item.approved_total_price,
                                                  ) || 0,
                                                )}
                                              </td>
                                            </>
                                          );
                                        })()}

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

                            {mrHeader.progress_id >= 10 &&
                              canSeePrice &&
                              !isManagerPriceApproval && (
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
                                      {!!(
                                        items[0]?.approved_supplier_id &&
                                        lpoInvoiceStatus[
                                          items[0].approved_supplier_id
                                        ]?.hasLpo
                                      )
                                        ? formatPriceAED(
                                            calculateItemsTotal(
                                              getAllItemsInSubCategory(
                                                suppliers,
                                              ),
                                            ),
                                          )
                                        : "N/A"}
                                    </td>
                                    {subtotalTrailingColSpan > 0 && (
                                      <td colSpan={subtotalTrailingColSpan} />
                                    )}
                                  </tr>
                                  {mrHeader.progress_id === 12 && (
                                    <tr>
                                      <td colSpan={subtotalLabelColSpan} />
                                      <td style={{ fontWeight: "600" }}>
                                        SUBTOTAL W/ VAT
                                      </td>
                                      <td style={{ fontWeight: "600" }}>
                                        {!!(
                                          items[0]?.approved_supplier_id &&
                                          lpoInvoiceStatus[
                                            items[0].approved_supplier_id
                                          ]?.hasLpo
                                        )
                                          ? formatPriceAED(
                                              calculateItemsTotalWithVat(
                                                getAllItemsInSubCategory(
                                                  suppliers,
                                                ),
                                              ),
                                            )
                                          : "N/A"}
                                      </td>
                                      {subtotalTrailingColSpan > 0 && (
                                        <td colSpan={subtotalTrailingColSpan} />
                                      )}
                                    </tr>
                                  )}
                                </tfoot>
                              )}

                            {isManagerPriceApproval && (
                              <tfoot
                                style={{
                                  borderTop: "1px solid rgba(239, 239, 239, 1)",
                                }}
                              >
                                <tr>
                                  <td colSpan={subtotalLabelColSpan + 4} />
                                  <td style={{ fontWeight: "600" }}>
                                    SUBTOTAL
                                  </td>
                                  <td style={{ fontWeight: "600" }}>
                                    {formatPriceAED(
                                      calculateItemsTotal(
                                        getAllItemsInSubCategory(suppliers),
                                      ),
                                    )}
                                  </td>
                                </tr>
                              </tfoot>
                            )}
                          </table>
                          )}

                          {/* ── Mobile card accordion view ── */}
                          {isMobile && renderMobileItemCards(items)}

                          {isManagerPriceApproval &&
                            items.filter((i) =>
                              itemsExceedingAvgPrice.has(i.id),
                            ).length > 0 && (
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                  marginTop: "12px",
                                  fontSize: "12px",
                                  color: "rgba(220,38,38,1)",
                                  fontWeight: 600,
                                }}
                              >
                                <img src={warningIcon} alt="warning" />
                                Price exceeds average paid for items (
                                {
                                  items.filter((i) =>
                                    itemsExceedingAvgPrice.has(i.id),
                                  ).length
                                }
                                )
                              </div>
                            )}

                          <br />
                        </div>
                      ),
                    )}
                  </div>
                );
              }))}

        {showBySupplier &&
          Object.entries(mrLinesBySupplier).map(
            ([supplier, items], index, allSuppliers) => (
              <div key={supplier} className="subcategory-section">
                <div className="subcategory-header">
                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      alignItems: "center",
                    }}
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
                      mrHeader.progress_id === 13 && (
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

                    {/* progress_id > 14 — payment stage (14) skipped so flow goes 12 → 17; 17 > 14 still evaluates true */}
                    {mrHeader.progress_id > 14 && (
                      <PaymentButtons
                        mrHeader={mrHeader}
                        mrLine={items[0]}
                        supplierId={items[0].approved_supplier_id}
                      />
                    )}

                    {(mrHeader.progress_id === 16 ||
                      mrHeader.progress_id === 17) &&
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

                <table
                  className="items-table two-toned fixed-layout"
                  style={{ tableLayout: "fixed", width: "100%" }}
                >
                  <colgroup>
                    <col style={{ width: "40px" }} />
                    <col style={{ width: "120px" }} />
                    <col style={{ width: "120px" }} />
                    <col style={{ width: "120px" }} />
                    {mrHeader.progress_id >= 9 ? (
                      <>
                        <col style={{ width: "80px" }} />
                        {hasAnyQtyStocks && <col style={{ width: "90px" }} />}
                        {hasAnyQtyStocks && <col style={{ width: "80px" }} />}
                      </>
                    ) : (
                      <col style={{ width: "120px" }} />
                    )}
                    <col style={{ width: "90px" }} />
                    {hasAnyBrandSpecs && <col style={{ width: "110px" }} />}
                    {hasAnyAttachment && <col style={{ width: "90px" }} />}
                    {mrHeader.progress_id >= 10 && canSeePrice && (
                      <col style={{ width: "100px" }} />
                    )}
                    {mrHeader.progress_id >= 10 && canSeePrice && (
                      <col style={{ width: "100px" }} />
                    )}
                    {userInfo?.departmentID === 12 &&
                      mrHeader.progress_id === 21 && (
                        <col style={{ width: "160px" }} />
                      )}
                    {mrHeader.progress_id === 24 &&
                      userInfo?.departmentID === 11 && (
                        <col style={{ width: "120px" }} />
                      )}
                    {mrHeader.progress_id === 23 &&
                      userInfo?.departmentID === 9 && (
                        <col style={{ width: "140px" }} />
                      )}
                  </colgroup>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>CATEGORY</th>
                      <th>SUBCATEGORY</th>
                      <th>MATERIAL</th>
                      {mrHeader.progress_id >= 9 ? (
                        <>
                          <th>QTY USE</th>
                          {hasAnyQtyStocks && <th>QTY STOCKS</th>}
                          {hasAnyQtyStocks && <th>TOTAL QTY</th>}
                        </>
                      ) : (
                        <th>REQ. QTY{mrHeader.progress_id === 1 && <span style={{ color: "red", marginLeft: "8px", fontWeight: "normal" }}>*</span>}</th>
                      )}
                      <th>BOQ REF.{mrHeader.progress_id === 1 && <span style={{ color: "red", marginLeft: "8px", fontWeight: "normal" }}>*</span>}</th>
                      {hasAnyBrandSpecs && <th>SPECS / NOTES</th>}
                      {/* {mrHeader.progress_id >= 12 && <th>VENDOR & QUOTATION</th>} */}
                      {hasAnyAttachment && <th>ATTACHMENT</th>}
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
                            {hasAnyQtyStocks && (
                              <td>
                                {(() => {
                                  const proposedQty =
                                    Number(item.approved_proposed_quantity) ||
                                    0;
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
                            )}
                            {hasAnyQtyStocks && (
                              <td>
                                {formatNumber(item?.approved_proposed_quantity)}{" "}
                                {item.unit}
                              </td>
                            )}
                          </>
                        ) : (
                          <td>
                            {formatNumber(item?.quantity)} {item.unit}
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
                        {hasAnyBrandSpecs && (
                          <td>
                            {item.specification ? (
                              <InfoPopUpButton
                                text={
                                  <>
                                    <small>SPECS / NOTES</small>
                                    <h2>{item.specification || "-"}</h2>
                                  </>
                                }
                                header="SPECS / NOTES"
                              />
                            ) : (
                              "-"
                            )}
                          </td>
                        )}

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
                                <img
                                  src={externalLinkIcon}
                                  alt="external link"
                                />
                              </Button>
                            ) : (
                              "-"
                            )}
                          </td>
                        )}

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
                                unitPrice =
                                  Number(item.approved_unit_price) || 0;
                                //vatRate = Number(item.approved_vat_rate) || 0;
                              }

                              //const priceWithVat = unitPrice * (1 + vatRate / 100);
                              return formatPriceAED(unitPrice);
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
                                totalPrice =
                                  Number(item.approved_total_price) || 0;
                                /* vatRate = Number(item.approved_vat_rate) || 0; */
                              }

                              /* const priceWithVat = totalPrice * (1 + vatRate / 100); */
                              return formatPriceAED(totalPrice);
                            })()}
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

                        {mrHeader.progress_id === 23 &&
                          userInfo?.departmentID === 9 && (
                            <td>
                              <ResolutionButton
                                mrHeader={mrHeader}
                                item={item}
                              />
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
                          {formatPriceAED(calculateItemsTotal(items))}
                        </td>
                        {subtotalTrailingColSpan > 0 && (
                          <td colSpan={subtotalTrailingColSpan} />
                        )}
                      </tr>
                    </tfoot>
                  )}
                </table>

                <br />
              </div>
            ),
          )}

        {/* ── Duplicate empty table (same columns as main table, no rows) ── */}
        <table
          className="items-table two-toned fixed-layout"
          style={{ minHeight: 0 }}
        >
          <colgroup>
            {isQSReview && <col style={{ width: "24px" }} />}
            {isProcurementQuotations && <col style={{ width: "24px" }} />}
            {isManagerPriceApproval && <col style={{ width: "24px" }} />}
            <col style={{ width: "40px" }} />
            <col style={{ width: "130px" }} />
            {mrHeader.progress_id === 1 && <col style={{ width: "150px" }} />}
            {mrHeader.progress_id >= 9 ? (
              <>
                <col style={{ width: "80px" }} />
                {hasAnyQtyStocks && <col style={{ width: "90px" }} />}
                {hasAnyQtyStocks && <col style={{ width: "80px" }} />}
              </>
            ) : (
              <col style={{ width: "120px" }} />
            )}
            <col style={{ width: "95px" }} />
            {hasAnyBrandSpecs && <col style={{ width: "120px" }} />}
            {hasAnyAttachment && <col style={{ width: "100px" }} />}
            {((mrHeader.progress_id === 5 &&
              (userInfo?.departmentID === mrHeader.department_id ||
                userInfo?.departmentID === 8 ||
                userInfo?.departmentID === 16)) ||
              (mrHeader.progress_id === 3 &&
                userInfo?.departmentID === mrHeader.department_id &&
                userInfo?.departmentID !== 8) ||
              (mrHeader.progress_id === 2 &&
                userInfo?.departmentID === mrHeader.department_id &&
                userInfo?.departmentID !== 16)) && (
              <col style={{ width: "160px" }} />
            )}
            {(mrHeader.progress_id === 1 ||
              mrHeader.progress_id === 5 ||
              mrHeader.progress_id === 11) &&
              userInfo?.departmentID === mrHeader.department_id && (
                <col style={{ width: "160px" }} />
              )}
            {mrHeader.progress_id === 11 && userInfo?.departmentID === 9 && (
              <col style={{ width: "160px" }} />
            )}
            {mrHeader.progress_id === 3 &&
              (userInfo?.departmentID === 8 ||
                userInfo?.departmentID === mrHeader.department_id) && (
                <col style={{ width: "160px" }} />
              )}
            {mrHeader.progress_id === 3 && userInfo?.departmentID === 8 && (
              <col style={{ width: "160px" }} />
            )}
            {mrHeader.progress_id === 2 && userInfo?.departmentID === 16 && (
              <col style={{ width: "160px" }} />
            )}
            {mrHeader.progress_id >= 10 &&
              (mrHeader.progress_id !== 11 || userInfo?.departmentID === 8) &&
              !isManagerPriceApproval && <col style={{ width: "160px" }} />}
            {mrHeader.progress_id === 7 && (
              <>
                <col style={{ width: "100px" }} />
                <col style={{ width: "100px" }} />
                <col style={{ width: "100px" }} />
                {userInfo?.departmentID === 9 && (
                  <col style={{ width: "160px" }} />
                )}
              </>
            )}
            {mrHeader.progress_id === 9 && userInfo?.departmentID === 16 && (
              <col style={{ width: "160px" }} />
            )}
            {mrHeader.progress_id >= 10 &&
              canSeePrice &&
              !isManagerPriceApproval && <col style={{ width: "100px" }} />}
            {mrHeader.progress_id >= 10 &&
              canSeePrice &&
              !isManagerPriceApproval && <col style={{ width: "100px" }} />}
            {isManagerPriceApproval && (
              <>
                <col style={{ width: "100px" }} />
                <col style={{ width: "100px" }} />
                <col style={{ width: "100px" }} />
                <col style={{ width: "160px" }} />
                <col style={{ width: "130px" }} />
                <col style={{ width: "100px" }} />
              </>
            )}
            {userInfo?.departmentID === 11 && mrHeader.progress_id === 4 && (
              <col style={{ width: "160px" }} />
            )}
            {userInfo?.departmentID === 12 && mrHeader.progress_id === 21 && (
              <col style={{ width: "160px" }} />
            )}
            {userInfo?.departmentID === 11 && mrHeader.progress_id === 24 && (
              <col style={{ width: "120px" }} />
            )}
            {userInfo?.departmentID === 9 && mrHeader.progress_id === 23 && (
              <col style={{ width: "140px" }} />
            )}
          </colgroup>
          <tbody />
          {mrHeader.progress_id >= 10 && canSeePrice && (
            <tfoot style={{ borderTop: "1px solid rgba(239, 239, 239, 1)" }}>
              <tr>
                <td
                  colSpan={
                    isManagerPriceApproval
                      ? subtotalLabelColSpan + 4
                      : subtotalLabelColSpan
                  }
                />
                <td style={{ fontWeight: "600" }}>MR VALUE</td>
                <td style={{ fontWeight: "600" }}>
                  {formatPriceAED(
                    calculateItemsTotalWithVat(getAllFlatItems()),
                  )}
                </td>
                {subtotalTrailingColSpan > 0 && (
                  <td colSpan={subtotalTrailingColSpan} />
                )}
              </tr>
            </tfoot>
          )}
        </table>

      {/* ── Mobile Add Item button — bottom of lines ── */}
      {isMobile &&
        (mrHeader.progress_id === 1 || mrHeader.progress_id === 5) &&
        userInfo?.departmentID === mrHeader.department_id && (
          <AddMrItemButton
            mrHeaderID={mrHeader.id}
            projectID={mrHeader.project_id}
            bgColor="rgba(239,239,239,1)"
            borderColor="rgba(239,239,239,1)"
            textColor="black"
            stageName={currentStageName}
            style={{
              width: "100%",
              padding: "16px",
              borderRadius: 0,
              textAlign: "center",
              justifyContent: "center",
              marginTop: "8px",
            }}
          >
            ADD ITEM +
          </AddMrItemButton>
        )}
      </div>
      {/* end mr-with-id */}

      <CommentsSection
        mrHeaderId={mrHeader.id}
        stageName={mrHeader.progress_name || ""}
      />

      {(mrHeader.progress_id === 1 || mrHeader.progress_id === 5) &&
        userInfo?.departmentID === mrHeader.department_id && (
          <div className="bottom-nav">
            <div></div>
            {/* ✅ Check if any item has BOQ reference */}
            {hasAnyItemWithBoqReference() ? (
              // If any item has BOQ → Submit for QS Approval
              <SubmitForQSApprovalButton
                mrHeader={mrHeader}
                disabled={
                  hasAnyRejectedItems() ||
                  hasAnyQSRejectedItems() ||
                  (requireStrictValidation && hasIncompleteLines())
                }
              />
            ) : (
              // If no items have BOQ → Submit directly to Manager Approval
              <SubmitForInitialApprovalButton
                mrHeader={mrHeader}
                progressId={mrHeader.progress_id}
                disabled={
                  hasAnyRejectedItems() ||
                  (requireStrictValidation && hasIncompleteLines())
                }
                style={{
                  opacity:
                    hasAnyRejectedItems() ||
                    (requireStrictValidation && hasIncompleteLines())
                      ? "0.5"
                      : "1",
                  cursor:
                    hasAnyRejectedItems() ||
                    (requireStrictValidation && hasIncompleteLines())
                      ? "not-allowed"
                      : "pointer",
                  pointerEvents:
                    hasAnyRejectedItems() ||
                    (requireStrictValidation && hasIncompleteLines())
                      ? "none"
                      : "auto",
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
              disabled={
                !allItemsApproved() ||
                (requireStrictValidation && hasIncompleteLines())
              }
              label={(() => {
                const allItems = getAllFlatItems();
                const hasItemAvailable = allItems.some(
                  (l) => l.qs_review_type === "item_available",
                );
                return hasItemAvailable
                  ? "SUBMIT FOR STOCK TRANSFER"
                  : "SUBMIT FOR QUOTATIONS";
              })()}
            />
          )}
        </div>
      )}

      {userInfo?.departmentID === 16 && mrHeader.progress_id === 2 && (
        <div className="bottom-nav">
          <div></div>

          {hasQSRejectedItems() ? (
            <SubmitForResubmissionButton mrHeader={mrHeader} />
          ) : (
            <SubmitForInitialApprovalButton
              mrHeader={mrHeader}
              progressId={mrHeader.progress_id}
              disabled={!allItemsQSApproved()}
              style={{
                opacity: !allItemsQSApproved() ? "0.5" : "1",
                cursor: !allItemsQSApproved() ? "not-allowed" : "pointer",
                pointerEvents: !allItemsQSApproved() ? "none" : "auto",
              }}
            />
          )}
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
      {/* QS Price Check stage is disabled — all MRs go directly to Manager Price Approval */}
      {userInfo?.departmentID === 9 &&
        (mrHeader.progress_id === 7 || mrHeader.progress_id === 11) && (
          <div className="bottom-nav">
            <div></div>

            {mrHeader.skip_approvals ? (
              /* Skip approvals: go straight to LPO, auto-selecting quotations */
              <SubmitForLPO
                mrLines={mrLines}
                mrHeaderID={mrHeader.id}
                skipApprovals
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
            ) : (
              /* Normal flow: submit directly to Manager Price Approval (QS Price Check bypassed) */
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

      {/* LPO & Invoice (Progress 12) - Procurement Submit for Delivery (payment stage skipped, all suppliers route to delivery) */}
      {userInfo?.departmentID === 9 && mrHeader.progress_id === 12 && (
        <div className="bottom-nav">
          <div></div>
          {(() => {
            // Build suppliers array — force supplierType to "credit" so all route to delivery (payment stage skipped)
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
                        supplierType: "credit", // Force delivery routing — payment stage removed
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

      {/* ── Price hover popups (lowest & prev) ──────────────────────────── */}
      {[
        {
          desc: hoveredLowestDesc,
          rect: hoveredLowestRect,
          type: "lowest" as const,
          onCancel: cancelLowestHideTimer,
          onHide: () => {
            setHoveredLowestDesc(null);
            setHoveredLowestRect(null);
          },
        },
        {
          desc: hoveredPrevDesc,
          rect: hoveredPrevRect,
          type: "prev" as const,
          onCancel: cancelPrevHideTimer,
          onHide: () => {
            setHoveredPrevDesc(null);
            setHoveredPrevRect(null);
          },
        },
      ].map(({ desc, rect, type, onCancel, onHide }) =>
        desc && rect
          ? (() => {
              const row = priceHoverCache[desc]?.[type];
              if (row === null) return null;
              // Anchor just below the cell; flip above if too close to bottom.
              const spaceBelow = window.innerHeight - rect.bottom;
              const popupHeight = 90; // approximate
              const top =
                spaceBelow >= popupHeight + 8
                  ? rect.bottom + 4
                  : rect.top - popupHeight - 4;
              // "lowest" aligns its left edge to the cell's left edge.
              // "prev"   aligns its right edge to the cell's right edge (opens leftward).
              const horizStyle =
                type === "prev"
                  ? { right: Math.max(8, window.innerWidth - rect.right) }
                  : { left: Math.max(8, rect.left) };
              return (
                <div
                  key={type}
                  onMouseEnter={onCancel}
                  onMouseLeave={onHide}
                  style={{
                    position: "fixed",
                    ...horizStyle,
                    top: Math.max(8, top),
                    backgroundColor: "white",
                    border: "1px solid rgba(223,223,223,1)",
                    borderRadius: "10px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    zIndex: 10000,
                    width: "auto",
                    whiteSpace: "nowrap",
                  }}
                >
                  <div style={{ padding: "12px" }}>
                    {row === "loading" || row === undefined ? (
                      <div
                        style={{
                          padding: "16px",
                          textAlign: "center",
                          color: "rgba(128,128,128,1)",
                          fontSize: "13px",
                        }}
                      >
                        Loading...
                      </div>
                    ) : (
                      <table
                        className="items-table popup-hover"
                        style={{ width: "auto" }}
                      >
                        <thead>
                          <tr>
                            <th>LPO NUMBER</th>
                            <th>PROJECT</th>
                            <th>VENDOR</th>
                            <th>PRICE</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td style={{ whiteSpace: "nowrap" }}>
                              LPO-{String(row.lpo_id).padStart(5, "0")}
                            </td>
                            <td style={{ whiteSpace: "nowrap" }}>
                              {row.project_name}
                            </td>
                            <td style={{ whiteSpace: "nowrap" }}>
                              {row.vendor_name}
                            </td>
                            <td
                              style={{
                                whiteSpace: "nowrap",
                                fontWeight: 600,
                                color: "rgba(2,122,70,1)",
                              }}
                            >
                              {formatPriceAED(row.unit_price)}
                            </td>
                            <td>
                              <Button
                                componentType={"link"}
                                bgColor={"rgba(239, 239, 239, 1)"}
                                borderColor={"rgba(223, 223, 223, 1)"}
                                textColor={"black"}
                                style={{ padding: "7px 7px" }}
                                href={`/mr/${row.mr_header_id}/lpo/${row.lpo_id}`}
                              >
                                <img
                                  src="/icons/external-link.svg"
                                  alt="open"
                                />
                              </Button>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              );
            })()
          : null,
      )}
    </>
  );
}
