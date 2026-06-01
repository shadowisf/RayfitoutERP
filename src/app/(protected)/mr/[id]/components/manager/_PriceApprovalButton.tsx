"use client";

import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { SupplierQuotation } from "../../types/supplierQuotation";
import { toast } from "@/app/components/Toast";
import InputItem from "@/app/components/InputItem";
import RejectCommentPopUp from "./RejectCommentPopUp";
import { MrLine } from "../../types/mrLine";
import SupplierDetailsPopUp from "../../../components/SupplierDetailsPopUp";
import { formatPriceAED } from "@/lib/formatPrice";
import { useRefresh } from "@/app/context/RefreshContext";

type PriceApprovalButtonProps = {
  progressID: number;
  mrLine: MrLine;
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
  full?: boolean;
  style?: React.CSSProperties;
  onTotalPriceChange?: (mrLineId: number, totalPrice: number) => void;
  isSmartSelectPortal?: boolean;
  allMrLines?: any;
  portalTargetId?: string;
};

export default function PriceApprovalButton({
  progressID,
  mrLine,
  bgColor = "rgba(239, 239, 239, 1)",
  textColor = "black",
  borderColor = "rgba(239, 239, 239, 1)",
  full,
  style,
  onTotalPriceChange,
  isSmartSelectPortal = false,
  allMrLines,
  portalTargetId = "smart-select-portal",
}: PriceApprovalButtonProps) {
  const diamondIcon = "/icons/diamond.svg";
  const externalLinkIcon = "/icons/external-link.svg";
  const crossIcon = "/icons/cross-small.svg";
  const pencilIcon = "/icons/pencil.svg";
  const plusIcon = "/icons/plus.svg";

  const router = useRouter();
  const { refresh } = useRefresh();

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [supplierQuotations, setSupplierQuotations] = useState<
    SupplierQuotation[]
  >([]);
  const [selectedQuotationID, setSelectedQuotationID] = useState("");
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectText, setRejectText] = useState("");

  const [approvedQuotation, setApprovedQuotation] =
    useState<SupplierQuotation | null>(null);
  const [allRejected, setAllRejected] = useState(false);
  const [allPending, setAllPending] = useState(false);

  const [qsApprovedQuotation, setQsApprovedQuotation] =
    useState<SupplierQuotation | null>(null);
  const [allQsRejected, setAllQsRejected] = useState(false);
  const [allQsPending, setAllQsPending] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(
    null,
  );

  // Header panel: price stats + inventory matches
  const [priceStats, setPriceStats] = useState<{
    lowest_price: number | null;
    avg_price: number | null;
    prev_price: number | null;
  } | null>(null);
  const [inventoryMatches, setInventoryMatches] = useState<
    | {
        inventory_item_id: number;
        inventory_description: string;
        unit: string;
        total_qty: number;
        locations: string[];
        match_type: "exact" | "similar";
      }[]
    | null
  >(null);

  // Budget est. column: BOQ lines + existing spend per BOQ line
  const [boqLinesForBudget, setBoqLinesForBudget] = useState<
    {
      id: number;
      item_number: string;
      rate_per_quantity: number;
      quantity: number;
      unit: string;
      allocated_qty: number | null;
    }[]
  >([]);
  const [boqExistingSpend, setBoqExistingSpend] = useState<
    Record<number, number>
  >({});

  // Frequently used vendor
  const [frequentSupplierId, setFrequentSupplierId] = useState<number | null>(
    null,
  );

  // Suspicious pricing history
  const [priceHistory, setPriceHistory] = useState<
    {
      lpo_id: number;
      mr_header_id: number;
      material_description: string;
      qty: number | null;
      unit: string | null;
      unit_price: number | null;
      date: string | null;
      supplier_name: string | null;
    }[]
  >([]);
  const [suspiciousPopupQuotation, setSuspiciousPopupQuotation] =
    useState<SupplierQuotation | null>(null);
  const [cheaperOptionOpen, setCheaperOptionOpen] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Fixed-position tooltip for BUDGET EST. progress bars
  const [boqBarTooltip, setBoqBarTooltip] = useState<{
    existing: number;
    vendorCost: number;
    itemBudget: number;
    over: boolean;
    x: number;
    y: number;
  } | null>(null);

  // Pre-seed selectedQuotationID when popup opens so CONFIRM works even without
  // the user manually clicking a radio button (approved edit case or single quotation).
  useEffect(() => {
    if (!isOpen) return;
    if (approvedQuotation) {
      setSelectedQuotationID(String(approvedQuotation.id));
    } else if (supplierQuotations.length === 1) {
      setSelectedQuotationID(String(supplierQuotations[0].id));
    }
  }, [isOpen, approvedQuotation, supplierQuotations]);

  useEffect(() => {
    if (isSmartSelectPortal) {
      const container = document.getElementById(portalTargetId);
      setPortalContainer(container);
    }
  }, [isSmartSelectPortal, portalTargetId]);

  useEffect(() => {
    if (!isOpen || !mrLine?.material_description) return;

    async function fetchPriceStats() {
      try {
        const encoded = encodeURIComponent(mrLine.material_description);
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMaterialPriceStats?materials=${encoded}`,
        );
        if (res.ok) {
          const data = await res.json();
          setPriceStats(data[mrLine.material_description] ?? null);
        }
      } catch {
        setPriceStats(null);
      }
    }

    async function fetchInventoryMatches() {
      setInventoryMatches(null);
      try {
        const encoded = encodeURIComponent(mrLine.material_description);
        const encodedId = encodeURIComponent(
          String(mrLine.predefined_item_id ?? 0),
        );
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getInventoryStatus?materials=${encoded}&predefined_ids=${encodedId}`,
        );
        if (res.ok) {
          const data = await res.json();
          setInventoryMatches(data[mrLine.material_description] ?? []);
        } else {
          setInventoryMatches([]);
        }
      } catch {
        setInventoryMatches([]);
      }
    }

    async function fetchBoqLinesForBudget() {
      if (!mrLine.id) return;
      try {
        // Directly query jt_mr_lines_boq_lines for this MR line
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/boq/getBoqLinesByMrLineID`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mr_line_id: mrLine.id }),
          },
        );
        if (!res.ok) return;
        const lines: {
          id: number;
          item_number: string;
          rate_per_quantity: number;
          quantity: number;
          unit: string;
          allocated_qty: number | null;
        }[] = await res.json();
        setBoqLinesForBudget(lines);

        // Fetch existing spend (purchase history) for each BOQ line in parallel
        const spendEntries = await Promise.all(
          lines.map(async (b) => {
            try {
              const r = await fetch(
                `${process.env.NEXT_PUBLIC_BASE_URL}/api/boq/getPurchaseHistoryByBoqLineID`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ boq_line_id: b.id }),
                },
              );
              if (!r.ok) return [b.id, 0] as [number, number];
              const history: { total_price: number }[] = await r.json();
              const sum = history.reduce(
                (s, e) => s + Number(e.total_price),
                0,
              );
              return [b.id, sum] as [number, number];
            } catch {
              return [b.id, 0] as [number, number];
            }
          }),
        );
        setBoqExistingSpend(Object.fromEntries(spendEntries));
      } catch {
        setBoqLinesForBudget([]);
      }
    }

    async function fetchPriceHistory() {
      try {
        const encoded = encodeURIComponent(mrLine.material_description);
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getMaterialLPOHistory?material=${encoded}`,
        );
        if (res.ok) {
          setPriceHistory(await res.json());
        } else {
          setPriceHistory([]);
        }
      } catch {
        setPriceHistory([]);
      }
    }

    setIsLoadingData(true);
    Promise.all([
      fetchPriceStats(),
      fetchInventoryMatches(),
      fetchBoqLinesForBudget(),
      fetchPriceHistory(),
    ]).finally(() => setIsLoadingData(false));
  }, [isOpen, mrLine.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Helper function to format currency with 2 decimal places
  const formatCurrency = (
    value: number | string | null | undefined,
  ): string => {
    if (value === null || value === undefined || value === "") return "0.00";
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num)) return "0.00";
    return num.toFixed(2);
  };

  // Helper function to format quantity (no trailing zeros unless decimal)
  const formatQuantity = (
    value: number | string | null | undefined,
  ): string => {
    if (value === null || value === undefined || value === "") return "0";
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num)) return "0";
    if (Number.isInteger(num)) {
      return num.toString();
    }
    return parseFloat(num.toFixed(3)).toString();
  };

  const fetchQuotations = () => {
    if (isSmartSelectPortal || !mrLine?.id) {
      return;
    }

    fetch("/api/supplier/getAllSupplierAndQuotationByMrLineID", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: mrLine.id }),
    })
      .then((res) => res.json())
      .then((data) => {
        console.log(`Fetched quotations for MR Line ${mrLine.id}:`, data);

        if (!Array.isArray(data)) {
          console.error("Invalid data format:", data);
          setSupplierQuotations([]);
          return;
        }

        setSupplierQuotations(data);

        const approved = data.find(
          (q: SupplierQuotation) => q.approval_status === "Approved",
        );
        setApprovedQuotation(approved || null);

        if (approved && onTotalPriceChange) {
          onTotalPriceChange(mrLine.id, parseFloat(approved.total_price) || 0);
        } else if (onTotalPriceChange) {
          onTotalPriceChange(mrLine.id, 0);
        }

        const rejected = data.every(
          (q: SupplierQuotation) => q.approval_status === "Rejected",
        );
        setAllRejected(rejected && data.length > 0);

        const pending = data.every(
          (q: SupplierQuotation) =>
            !q.approval_status || q.approval_status === null,
        );
        setAllPending(pending && data.length > 0);

        const qsApproved = data.find(
          (q: SupplierQuotation) => q.qs_approval_status === "Approved",
        );
        setQsApprovedQuotation(qsApproved || null);

        const qsRejected = data.every(
          (q: SupplierQuotation) => q.qs_approval_status === "Rejected",
        );
        setAllQsRejected(qsRejected && data.length > 0);

        const qsPending = data.every(
          (q: SupplierQuotation) =>
            !q.qs_approval_status || q.qs_approval_status === null,
        );
        setAllQsPending(qsPending && data.length > 0);

        // Fetch LPO counts to determine frequently used vendor
        const uniqueSupplierIds = [
          ...new Set(data.map((q: SupplierQuotation) => q.supplier_id)),
        ];
        if (uniqueSupplierIds.length > 0) {
          fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL}/api/supplier/getSupplierLpoCounts`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ supplier_ids: uniqueSupplierIds }),
            },
          )
            .then((r) => r.json())
            .then((counts: Record<number, number>) => {
              const maxCount = Math.max(...Object.values(counts));
              if (maxCount > 0) {
                const frequentId = Number(
                  Object.entries(counts).find(([, v]) => v === maxCount)?.[0],
                );
                setFrequentSupplierId(frequentId || null);
              } else {
                setFrequentSupplierId(null);
              }
            })
            .catch(() => setFrequentSupplierId(null));
        }
      })
      .catch((err) => {
        console.error("Error fetching quotations:", err);
        setSupplierQuotations([]);
      });
  };

  useEffect(() => {
    if (!isSmartSelectPortal && mrLine?.id) {
      fetchQuotations();
    }

    const handleQuotationsUpdated = () => {
      console.log("Quotations updated event received, refetching...");
      if (!isSmartSelectPortal && mrLine?.id) {
        fetchQuotations();
      }
    };

    window.addEventListener("quotationsUpdated", handleQuotationsUpdated);

    return () => {
      window.removeEventListener("quotationsUpdated", handleQuotationsUpdated);
    };
  }, [mrLine?.id, isSmartSelectPortal]);

  async function handleSmartSelectAll() {
    if (!allMrLines) {
      toast("No MR lines available", "error");
      return;
    }

    setIsProcessing(true);

    const allItems: any[] = [];

    for (const category in allMrLines) {
      for (const subCategory in allMrLines[category]) {
        for (const supplier in allMrLines[category][subCategory]) {
          const items = allMrLines[category][subCategory][supplier];
          allItems.push(...items);
        }
      }
    }

    console.log(`Processing ${allItems.length} items for smart select...`);

    let successful = 0;
    let failed = 0;

    for (const item of allItems) {
      try {
        const quotationsResponse = await fetch(
          "/api/supplier/getAllSupplierAndQuotationByMrLineID",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: item.id }),
          },
        );

        if (!quotationsResponse.ok) {
          failed++;
          continue;
        }

        const quotations = await quotationsResponse.json();

        if (!quotations || quotations.length === 0) {
          failed++;
          continue;
        }

        const lowestPriceQuotation = quotations.reduce(
          (prev: any, current: any) => {
            return Number(current.total_price) < Number(prev.total_price)
              ? current
              : prev;
          },
        );

        const approveResponse = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/supplier`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "approveSupplierAndQuotation",
              quotation_id: lowestPriceQuotation.id,
              mr_line_id: item.id,
              supplier_id: lowestPriceQuotation.supplier_id,
            }),
          },
        );

        if (approveResponse.ok) {
          successful++;
        } else {
          failed++;
        }
      } catch (error) {
        failed++;
        console.error(`Error processing item ${item.id}:`, error);
      }
    }

    setIsProcessing(false);

    if (successful > 0 && failed === 0) {
      toast(
        `Smart Select completed: ${successful} vendor${successful > 1 ? "s" : ""} approved`,
        "success",
      );
    } else if (successful > 0 && failed > 0) {
      toast(
        `Smart Select completed: ${successful} approved, ${failed} failed`,
        "warning",
      );
    } else {
      toast("Smart Select failed: No vendors approved", "error");
    }

    window.dispatchEvent(new CustomEvent("quotationsUpdated"));
    await refresh();
  }

  async function handleApproveSupplierAndQuotation(e: React.FormEvent) {
    e.preventDefault();

    const selectedQuotation = supplierQuotations.find(
      (q) => q.id === Number(selectedQuotationID),
    );

    if (!selectedQuotation) {
      toast("Please select a vendor", "error");
      return;
    }

    console.log("📝 Approving quotation:", {
      quotation_id: selectedQuotation.id,
      mr_line_id: mrLine.id,
      supplier_id: selectedQuotation.supplier_id,
    });

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/supplier`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approveSupplierAndQuotation",
          quotation_id: selectedQuotation.id,
          mr_line_id: mrLine.id,
          supplier_id: selectedQuotation.supplier_id,
        }),
      },
    );

    if (res.ok) {
      toast(
        `Vendor and quotation approved for ${mrLine.material_description}`,
        "success",
      );
      setIsOpen(false);
      setRejectText("");
      fetchQuotations();
      await refresh();
    } else {
      toast("Failed to approve vendor and quotation", "error");
    }
  }

  async function handleRejectAll(e: React.FormEvent) {
    e.preventDefault();

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/supplier`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "rejectAllSupplierAndQuotation",
          reject_comment: rejectText,
          mr_line_id: mrLine.id,
        }),
      },
    );

    if (res.ok) {
      toast("Vendor and quotation rejected", "success");
      setRejectText("");
      setIsRejectOpen(false);
      setIsOpen(false);
      fetchQuotations();
      await refresh();
    } else {
      toast("Failed to reject vendor and quotation", "error");
    }
  }

  async function handleReset() {
    const isRejected = allRejected && !approvedQuotation;

    const body = isRejected
      ? {
          action: "resetAllQuotationsForLine",
          mr_line_id: mrLine.id,
        }
      : {
          action: "resetSupplierAndQuotation",
          mr_line_id: mrLine.id,
          supplier_id: approvedQuotation!.supplier_id,
        };

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/supplier`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );

    if (res.ok) {
      fetchQuotations();
      await refresh();
    } else {
      toast("Failed to reset vendor selection", "error");
    }
  }

  if (isSmartSelectPortal && portalContainer) {
    return createPortal(
      <Button
        componentType={"button"}
        bgColor={"white"}
        borderColor={"rgba(207, 207, 207, 1)"}
        textColor={"black"}
        onClick={handleSmartSelectAll}
        disabled={isProcessing}
        style={{
          padding: "7px 20px",
          borderRadius: "25px",
          opacity: isProcessing ? 0.5 : 1,
          cursor: isProcessing ? "not-allowed" : "pointer",
        }}
      >
        {isProcessing ? "Processing..." : "Smart Select"}{" "}
        <img src={diamondIcon} alt="diamond icon" />
      </Button>,
      portalContainer,
    );
  }

  if (progressID === 11 || progressID === 9) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {approvedQuotation && (
            <div
              className="approval-pill"
              style={{
                backgroundColor: "rgba(34, 150, 100, 1)",
                color: "white",
                minWidth: "250px",
              }}
            >
              <span>{approvedQuotation.supplier_name}</span>
              <SupplierDetailsPopUp
                item={approvedQuotation}
                style={{
                  padding: "0px",
                  backgroundColor: "transparent",
                  borderColor: "transparent",
                  filter: "invert(1)",
                }}
              >
                <img src={externalLinkIcon} alt="external link icon" />
              </SupplierDetailsPopUp>
            </div>
          )}

          {allRejected && !approvedQuotation && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "15px",
                padding: "5px 10px 5px 15px",
                backgroundColor: "rgba(185, 28, 28, 1)",
                color: "white",
                borderRadius: "25px",
                whiteSpace: "nowrap",
              }}
            >
              <span>Rejected</span>
              <RejectCommentPopUp
                text={supplierQuotations[0]?.reject_comment}
              />
            </div>
          )}

          {allPending && !approvedQuotation && !allRejected && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                padding: "5px 15px",
                backgroundColor: "rgba(128, 128, 128, 1)",
                color: "white",
                borderRadius: "25px",
                whiteSpace: "nowrap",
              }}
            >
              <span>Manager Pending Approval</span>
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {allQsRejected && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "15px",
                padding: "5px 10px 5px 15px",
                backgroundColor: "rgba(185, 28, 28, 1)",
                color: "white",
                borderRadius: "25px",
                whiteSpace: "nowrap",
              }}
            >
              <span>Rejected by QS</span>
              <RejectCommentPopUp
                text={supplierQuotations[0]?.qs_reject_comment}
              />
            </div>
          )}

          {allQsPending && !allQsRejected && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                padding: "5px 15px",
                backgroundColor: "rgba(128, 128, 128, 1)",
                color: "white",
                borderRadius: "25px",
                whiteSpace: "nowrap",
              }}
            >
              <span>QS Approval Pending</span>
            </div>
          )}

          {qsApprovedQuotation && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                padding: "5px 15px",
                backgroundColor: "rgba(34, 150, 100, 1)",
                color: "white",
                borderRadius: "25px",
                whiteSpace: "nowrap",
              }}
            >
              <span>Approved by QS</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (progressID === 10) {
    if (approvedQuotation) {
      return (
        <>
          <div
            className="approval-pill"
            style={{
              backgroundColor: "rgba(34, 150, 100, 1)",
              color: "white",
              maxWidth: "150px",
            }}
          >
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {approvedQuotation.supplier_name}
            </span>
            <img
              src={crossIcon}
              alt="reset"
              style={{ filter: "invert(1)", cursor: "pointer", flexShrink: 0 }}
              onClick={handleReset}
            />
          </div>
        </>
      );
    }

    if (allRejected) {
      return (
        <div
          className="approval-pill"
          style={{
            backgroundColor: "rgba(185, 28, 28, 1)",
            color: "white",
            width: "250px",
          }}
        >
          <span style={{ textWrap: "nowrap" }}>Rejected</span>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <RejectCommentPopUp text={supplierQuotations[0]?.reject_comment} />
            <img
              src={crossIcon}
              alt="reset"
              style={{
                filter: "invert(1)",
                cursor: "pointer",
              }}
              onClick={handleReset}
            />
          </div>
        </div>
      );
    }

    return (
      <>
        <Button
          componentType={"button"}
          bgColor={"rgba(239, 239, 239, 1)"}
          borderColor={"rgba(223, 223, 223, 1)"}
          textColor={"black"}
          onClick={() => setIsOpen(true)}
          style={{ padding: "7px 7px" }}
        >
          <img src={externalLinkIcon} alt="add" />
        </Button>

        {isOpen &&
          (() => {
            const anyHasStocks = supplierQuotations.some((q) => {
              const propQty = Number(q.proposed_quantity) || 0;
              const reqQty = Number(mrLine.quantity) || 0;
              return propQty > reqQty;
            });

            return (
              <FormPopUp
                header={"SELECT VENDOR & QUOTATION"}
                setIsOpen={setIsOpen}
                handleSubmit={(e) => handleApproveSupplierAndQuotation(e)}
                addButtonLabel={"CONFIRM"}
                haveLoadingState={true}
                style={{
                  width: "95dvw",
                  height: "95dvh",
                }}
                secondButton={(() => {
                  const minCurrentPrice =
                    supplierQuotations.length > 0
                      ? Math.min(
                          ...supplierQuotations
                            .map((q) => Number(q.unit_price))
                            .filter((v) => v > 0),
                        )
                      : Infinity;
                  const cheaperHistory = priceHistory.filter(
                    (r) =>
                      r.unit_price != null &&
                      r.unit_price > 0 &&
                      r.unit_price < minCurrentPrice,
                  );
                  return (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "16px",
                      }}
                    >
                      {cheaperHistory.length > 0 && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "5px",
                            cursor: "pointer",
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            setCheaperOptionOpen(true);
                          }}
                        >
                          <img
                            src="/icons/warning.svg"
                            alt="warning"
                            style={{
                              width: "13px",
                              height: "13px",
                              flexShrink: 0,
                            }}
                          />
                          <span
                            style={{
                              fontSize: "13px",
                              fontWeight: 600,
                              color: "rgba(220,38,38,1)",
                              textDecoration: "underline",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Cheaper option available
                          </span>
                        </div>
                      )}
                      <Button
                        componentType={"button"}
                        bgColor={"white"}
                        borderColor={"black"}
                        textColor={"black"}
                        onClick={(e) => {
                          e.preventDefault();
                          setIsRejectOpen(true);
                        }}
                      >
                        REJECT ALL
                      </Button>
                    </div>
                  );
                })()}
              >
                {isLoadingData ? (
                  /* ── Skeleton loading ── */
                  <div>
                    {/* Top two-column skeleton */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1.5fr",
                        gap: "24px",
                        marginBottom: "24px",
                      }}
                    >
                      {/* Left info box */}
                      <div
                        style={{
                          backgroundColor: "rgba(248,248,248,1)",
                          borderRadius: "10px",
                          padding: "18px 24px",
                        }}
                      >
                        <div
                          className="skeleton-pulse"
                          style={{ height: "18px", borderRadius: "6px", width: "70%", marginBottom: "8px" }}
                        />
                        <div
                          className="skeleton-pulse"
                          style={{ height: "12px", borderRadius: "6px", width: "45%", marginBottom: "36px" }}
                        />
                        <div style={{ display: "flex", gap: "32px" }}>
                          {[1, 2, 3].map((i) => (
                            <div key={i}>
                              <div className="skeleton-pulse" style={{ height: "10px", borderRadius: "4px", width: "60px", marginBottom: "6px" }} />
                              <div className="skeleton-pulse" style={{ height: "16px", borderRadius: "4px", width: "80px" }} />
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* Right: inventory status table */}
                      <table className="items-table fixed-layout">
                        <thead>
                          <tr>
                            {[70, 50, 60, 55].map((w, idx) => (
                              <th key={idx}><div className="skeleton-pulse" style={{ height: "10px", borderRadius: "4px", width: `${w}%` }} /></th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {[1, 2, 3].map((i) => (
                            <tr key={i}>
                              <td><div className="skeleton-pulse" style={{ height: "14px", borderRadius: "4px" }} /></td>
                              <td><div className="skeleton-pulse" style={{ height: "14px", borderRadius: "4px", width: "60px" }} /></td>
                              <td><div className="skeleton-pulse" style={{ height: "14px", borderRadius: "4px" }} /></td>
                              <td><div className="skeleton-pulse" style={{ height: "22px", borderRadius: "25px", width: "90px" }} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {/* Bottom: quotations table */}
                    <table className="items-table">
                      <thead>
                        <tr>
                          <th></th>
                          {[55, 60, 45, 50, 55, 65].map((w, idx) => (
                            <th key={idx}><div className="skeleton-pulse" style={{ height: "10px", borderRadius: "4px", width: `${w}%` }} /></th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[1, 2, 3].map((i) => (
                          <tr key={i}>
                            <td><div className="skeleton-pulse" style={{ height: "14px", width: "14px", borderRadius: "50%" }} /></td>
                            <td><div className="skeleton-pulse" style={{ height: "32px", borderRadius: "25px", width: "140px" }} /></td>
                            <td><div className="skeleton-pulse" style={{ height: "32px", borderRadius: "25px", width: "120px" }} /></td>
                            <td><div className="skeleton-pulse" style={{ height: "14px", borderRadius: "4px", width: "60px" }} /></td>
                            <td><div className="skeleton-pulse" style={{ height: "14px", borderRadius: "4px", width: "80px" }} /></td>
                            <td><div className="skeleton-pulse" style={{ height: "14px", borderRadius: "4px", width: "80px" }} /></td>
                            <td>
                              <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", rowGap: "20px", columnGap: "10px" }}>
                                <div className="skeleton-pulse" style={{ height: "12px", borderRadius: "4px", width: "80px" }} />
                                <div className="skeleton-pulse" style={{ height: "12px", borderRadius: "4px" }} />
                                <div className="skeleton-pulse" style={{ height: "12px", borderRadius: "4px", width: "80px" }} />
                                <div className="skeleton-pulse" style={{ height: "12px", borderRadius: "4px" }} />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <>
                    {/* Header: item info (left) + inventory status (right) */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1.5fr",
                        gap: "24px",
                        marginBottom: "24px",
                        alignItems: "flex-start",
                      }}
                    >
                      {/* Left: item info + price stats */}
                      <div
                        style={{
                          backgroundColor: "rgba(248,248,248,1)",
                          borderRadius: "10px",
                          padding: "18px 24px",
                        }}
                      >
                        <h2
                          style={{
                            margin: "4px 0 0",
                            fontSize: "16px",
                            fontWeight: 700,
                          }}
                        >
                          {mrLine.material_description}
                          {mrLine.quantity
                            ? ` • ${formatQuantity(Number(mrLine.quantity))} ${mrLine.unit}`
                            : ""}
                        </h2>
                        <div style={{ marginBottom: "14px" }}>
                          {[
                            mrLine.material_category,
                            mrLine.material_subcategory,
                          ]
                            .filter(Boolean)
                            .join(" / ") && (
                            <small style={{ color: "rgba(120,120,120,1)" }}>
                              {[
                                mrLine.material_category,
                                mrLine.material_subcategory,
                              ]
                                .filter(Boolean)
                                .join(" / ")}
                            </small>
                          )}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            gap: "32px",
                            marginTop: "50px",
                          }}
                        >
                          {(
                            [
                              {
                                label: "LOWEST PRICE",
                                value: priceStats?.lowest_price,
                              },
                              {
                                label: "AVG. PRICE",
                                value: priceStats?.avg_price,
                              },
                              {
                                label: "PREV. PRICE",
                                value: priceStats?.prev_price,
                              },
                            ] as const
                          ).map(({ label, value }) => (
                            <div key={label}>
                              <small>{label}</small>
                              <h3>
                                {value != null ? formatPriceAED(value) : "N/A"}
                              </h3>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Right: inventory status table */}
                      <table className="items-table fixed-layout">
                        <colgroup>
                          <col />
                          <col style={{ width: "150px" }} />
                          <col style={{ width: "225px" }} />
                          <col style={{ width: "175px" }} />
                        </colgroup>
                        <thead>
                          <tr
                            style={{ backgroundColor: "rgba(247,247,247,1)" }}
                          >
                            {[
                              "INVENTORY STATUS",
                              "QTY AVAILABLE",
                              "LOCATION",
                              "STATUS",
                            ].map((h) => (
                              <th key={h}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {inventoryMatches === null ? (
                            <tr>
                              <td
                                colSpan={4}
                                style={{
                                  padding: "14px",
                                  color: "rgba(150,150,150,1)",
                                  fontSize: "12px",
                                }}
                              >
                                Loading…
                              </td>
                            </tr>
                          ) : inventoryMatches.length === 0 ? (
                            <tr>
                              <td
                                colSpan={4}
                                style={{
                                  padding: "14px",
                                  color: "rgba(150,150,150,1)",
                                  fontSize: "12px",
                                }}
                              >
                                No inventory matches found
                              </td>
                            </tr>
                          ) : (
                            <>
                              {inventoryMatches.slice(0, 3).map((m) => (
                                <tr
                                  key={m.inventory_item_id}
                                  style={{
                                    borderBottom:
                                      "1px solid rgba(239,239,239,1)",
                                  }}
                                >
                                  <td>
                                    <a
                                      href={`/inventory/${m.inventory_item_id}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{
                                        color: "rgba(37,150,190,1)",
                                        fontWeight: 600,
                                        textDecoration: "none",
                                      }}
                                    >
                                      {m.inventory_description}
                                    </a>
                                  </td>
                                  <td>
                                    {m.total_qty} {m.unit}
                                  </td>
                                  <td>
                                    {m.locations && m.locations.length > 0
                                      ? m.locations.join(" + ")
                                      : "—"}
                                  </td>
                                  <td>
                                    <span
                                      style={{
                                        display: "inline-block",
                                        padding: "3px 10px",
                                        borderRadius: "50px",
                                        fontSize: "11px",
                                        fontWeight: 600,
                                        backgroundColor:
                                          m.match_type === "exact"
                                            ? "rgba(6,95,70,1)"
                                            : "rgba(209,250,229,1)",
                                        color:
                                          m.match_type === "exact"
                                            ? "rgba(209,250,229,1)"
                                            : "rgba(6,95,70,1)",
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      {m.match_type === "exact"
                                        ? "Exact Match"
                                        : "Similar Match"}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                              {inventoryMatches.length > 3 && (
                                <tr>
                                  <td
                                    colSpan={4}
                                    style={{
                                      padding: "8px 14px",
                                      color: "rgba(37,150,190,1)",
                                      fontSize: "11px",
                                    }}
                                  >
                                    …and {inventoryMatches.length - 3} more
                                    match
                                    {inventoryMatches.length - 3 !== 1
                                      ? "es"
                                      : ""}
                                  </td>
                                </tr>
                              )}
                            </>
                          )}
                        </tbody>
                      </table>
                    </div>

                    <table className="items-table">
                      <thead>
                        <tr>
                          <th></th>
                          <th>VENDOR</th>
                          <th>QUOTATION</th>
                          <th>QTY USE</th>
                          {anyHasStocks && <th>QTY STOCKS</th>}
                          <th>UNIT PRICE</th>
                          <th>TOTAL PRICE</th>
                          <th>BUDGET EST.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const lowestTotalPrice = supplierQuotations.reduce(
                            (min, q) => {
                              const v = parseFloat(String(q.total_price) || "");
                              return !isNaN(v) && v > 0
                                ? Math.min(min, v)
                                : min;
                            },
                            Infinity,
                          );
                          return supplierQuotations.map(
                            (quotation: SupplierQuotation, index: number) => {
                              const requestedQty = Number(mrLine.quantity) || 0;
                              const proposedQty =
                                Number(quotation.proposed_quantity) || 0;
                              const stockQty =
                                proposedQty > requestedQty
                                  ? proposedQty - requestedQty
                                  : 0;

                              const totalVal = parseFloat(
                                String(quotation.total_price) || "",
                              );
                              const totalAlert: {
                                type: "lowest" | "higher";
                                pct: number;
                              } | null =
                                !isNaN(totalVal) &&
                                totalVal > 0 &&
                                lowestTotalPrice !== Infinity
                                  ? totalVal <= lowestTotalPrice
                                    ? { type: "lowest", pct: 0 }
                                    : {
                                        type: "higher",
                                        pct: Math.round(
                                          ((totalVal - lowestTotalPrice) /
                                            lowestTotalPrice) *
                                            100,
                                        ),
                                      }
                                  : null;

                              return (
                                <tr key={index}>
                                  <td>
                                    <input
                                      type="radio"
                                      name="supplier"
                                      value={quotation.id}
                                      onChange={(e) =>
                                        setSelectedQuotationID(e.target.value)
                                      }
                                      required
                                    />
                                  </td>
                                  <td>
                                    <SupplierDetailsPopUp
                                      item={quotation}
                                      style={{
                                        padding: "7px 20px",
                                        textWrap: "nowrap",
                                        minWidth: "300px",
                                        display: "flex",
                                        justifyContent: "space-between",
                                        borderRadius: "25px",
                                      }}
                                    >
                                      {quotation.supplier_name}
                                      <img
                                        src="/icons/external-link.svg"
                                        alt="external link icon"
                                      />
                                    </SupplierDetailsPopUp>
                                    {frequentSupplierId ===
                                      quotation.supplier_id && (
                                      <div
                                        style={{
                                          display: "inline-block",
                                          marginTop: "10px",
                                          padding: "4px 12px",
                                          borderRadius: "25px",
                                          backgroundColor:
                                            "rgba(209,250,229,1)",
                                          color: "rgba(6,95,70,1)",
                                          fontSize: "11px",
                                          fontWeight: 600,
                                          whiteSpace: "nowrap",
                                        }}
                                      >
                                        Frequently used vendor
                                      </div>
                                    )}
                                    {(() => {
                                      const unitVal = Number(
                                        quotation.unit_price,
                                      );
                                      const validHistory = priceHistory.filter(
                                        (r) =>
                                          r.unit_price != null &&
                                          r.unit_price > 0,
                                      );
                                      const avgHistorical =
                                        validHistory.length > 0
                                          ? validHistory.reduce(
                                              (s, r) => s + r.unit_price!,
                                              0,
                                            ) / validHistory.length
                                          : null;
                                      const isSuspicious =
                                        avgHistorical != null &&
                                        unitVal > 0 &&
                                        (unitVal - avgHistorical) /
                                          avgHistorical >=
                                          1.0;
                                      if (!isSuspicious) return null;
                                      return (
                                        <div
                                          style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "4px",
                                            marginTop: "10px",
                                            cursor: "pointer",
                                          }}
                                          onClick={() =>
                                            setSuspiciousPopupQuotation(
                                              quotation,
                                            )
                                          }
                                        >
                                          <img
                                            src="/icons/warning.svg"
                                            alt="warning"
                                            style={{
                                              width: "11px",
                                              height: "11px",
                                              flexShrink: 0,
                                            }}
                                          />
                                          <span
                                            style={{
                                              fontSize: "11px",
                                              fontWeight: 600,
                                              color: "rgba(220,38,38,1)",
                                              textDecoration: "underline",
                                              whiteSpace: "nowrap",
                                            }}
                                          >
                                            Suspicious pricing detected
                                          </span>
                                        </div>
                                      );
                                    })()}
                                  </td>
                                  <td>
                                    <Button
                                      componentType={"link"}
                                      bgColor={"white"}
                                      borderColor={"rgba(207, 207, 207, 1)"}
                                      textColor={"black"}
                                      href={quotation.quotation_file[0]}
                                      target="_blank"
                                      style={{
                                        padding: "7px 20px",
                                        borderRadius: "25px",
                                      }}
                                    >
                                      Quotation
                                      <img
                                        src={externalLinkIcon}
                                        alt="external link icon"
                                      />
                                    </Button>
                                  </td>
                                  <td>
                                    {formatQuantity(requestedQty)} {mrLine.unit}
                                  </td>
                                  {anyHasStocks && (
                                    <td>
                                      {stockQty > 0
                                        ? `${formatQuantity(stockQty)} ${mrLine.unit}`
                                        : "-"}
                                    </td>
                                  )}
                                  <td>
                                    {formatPriceAED(quotation.unit_price)}
                                  </td>
                                  <td>
                                    <div
                                      style={{
                                        fontSize: "13px",
                                        marginBottom: "3px",
                                      }}
                                    >
                                      {formatPriceAED(quotation.total_price)}
                                    </div>
                                    {totalAlert && (
                                      <div
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "4px",
                                          whiteSpace: "nowrap",
                                        }}
                                      >
                                        <img
                                          src={
                                            totalAlert.type === "lowest"
                                              ? "/icons/check-green.svg"
                                              : "/icons/warning.svg"
                                          }
                                          alt={totalAlert.type}
                                          style={{
                                            width: "11px",
                                            height: "11px",
                                            flexShrink: 0,
                                          }}
                                        />
                                        <span
                                          style={{
                                            fontSize: "10px",
                                            fontWeight: 600,
                                            color:
                                              totalAlert.type === "lowest"
                                                ? "rgba(0,163,93,1)"
                                                : "rgba(220,38,38,1)",
                                          }}
                                        >
                                          {totalAlert.type === "lowest"
                                            ? "Lowest Price"
                                            : `+${totalAlert.pct}% higher than lowest price`}
                                        </span>
                                      </div>
                                    )}
                                  </td>
                                  <td>
                                    {boqLinesForBudget.length === 0 ? (
                                      <span>N/A</span>
                                    ) : (
                                      <div
                                        style={{
                                          display: "grid",
                                          gridTemplateColumns: "auto 1fr",
                                          rowGap: "10px",
                                          columnGap: "25px",
                                          alignItems: "center",
                                        }}
                                      >
                                        {boqLinesForBudget.map((boq) => {
                                          const allocQty =
                                            boq.allocated_qty ?? 0;
                                          const itemBudget =
                                            boq.rate_per_quantity *
                                            boq.quantity;
                                          const existing =
                                            boqExistingSpend[boq.id] ?? 0;
                                          const vendorCost =
                                            allocQty *
                                            Number(quotation.unit_price);
                                          const totalCost =
                                            existing + vendorCost;
                                          const existingPct =
                                            itemBudget > 0
                                              ? (existing / itemBudget) * 100
                                              : 0;
                                          const vendorPct =
                                            itemBudget > 0
                                              ? (vendorCost / itemBudget) * 100
                                              : 0;
                                          const over = totalCost > itemBudget;
                                          const existingColor = over
                                            ? "rgba(194,53,53,1)"
                                            : "rgba(0,163,93,1)";
                                          const vendorColor = over
                                            ? "rgba(248,77,77,1)"
                                            : "rgba(26,216,135,1)";
                                          const existingBarPct = Math.min(
                                            existingPct,
                                            100,
                                          );
                                          const vendorBarPct = Math.min(
                                            vendorPct,
                                            Math.max(0, 100 - existingBarPct),
                                          );
                                          return (
                                            <Fragment key={boq.id}>
                                              {/* Col 1: BOQ label */}
                                              <div
                                                style={{
                                                  fontSize: "11px",
                                                  whiteSpace: "nowrap",
                                                }}
                                              >
                                                BOQ {boq.item_number} /{" "}
                                                {allocQty} {boq.unit}
                                              </div>
                                              {/* Col 2: warning + pct + bar */}
                                              <div
                                                style={{
                                                  display: "flex",
                                                  alignItems: "center",
                                                  gap: "6px",
                                                  minWidth: "120px",
                                                }}
                                              >
                                                {over && (
                                                  <img
                                                    src="/icons/warning.svg"
                                                    alt="over budget"
                                                    style={{
                                                      width: "11px",
                                                      height: "11px",
                                                      flexShrink: 0,
                                                    }}
                                                  />
                                                )}
                                                <div style={{ flex: 1 }}>
                                                  {/* Pct label above bar */}
                                                  <div
                                                    style={{
                                                      fontSize: "10px",
                                                      whiteSpace: "nowrap",
                                                      marginBottom: "2px",
                                                    }}
                                                  >
                                                    <span
                                                      style={{
                                                        color: over
                                                          ? "rgba(194,53,53,1)"
                                                          : "rgba(0,163,93,1)",
                                                      }}
                                                    >
                                                      {Math.round(existingPct)}%
                                                    </span>
                                                    <span
                                                      style={{
                                                        color: vendorColor,
                                                      }}
                                                    >
                                                      {" "}
                                                      + {Math.round(vendorPct)}%
                                                    </span>
                                                  </div>
                                                  {/* Progress bar — tooltip via fixed portal on hover */}
                                                  <div
                                                    style={{
                                                      position: "relative",
                                                      height: "5px",
                                                      borderRadius: "3px",
                                                      backgroundColor:
                                                        "rgba(220,220,220,1)",
                                                      overflow: "hidden",
                                                      cursor: "default",
                                                    }}
                                                    onMouseEnter={(e) => {
                                                      const rect = (
                                                        e.currentTarget as HTMLElement
                                                      ).getBoundingClientRect();
                                                      setBoqBarTooltip({
                                                        existing,
                                                        vendorCost,
                                                        itemBudget,
                                                        over,
                                                        x:
                                                          rect.left +
                                                          rect.width / 2,
                                                        y: rect.top,
                                                      });
                                                    }}
                                                    onMouseLeave={() =>
                                                      setBoqBarTooltip(null)
                                                    }
                                                  >
                                                    <div
                                                      style={{
                                                        position: "absolute",
                                                        left: 0,
                                                        top: 0,
                                                        bottom: 0,
                                                        width: `${existingBarPct}%`,
                                                        backgroundColor:
                                                          existingColor,
                                                      }}
                                                    />
                                                    <div
                                                      style={{
                                                        position: "absolute",
                                                        left: `${existingBarPct}%`,
                                                        top: 0,
                                                        bottom: 0,
                                                        width: `${vendorBarPct}%`,
                                                        backgroundColor:
                                                          vendorColor,
                                                      }}
                                                    />
                                                  </div>
                                                </div>
                                              </div>
                                            </Fragment>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            },
                          );
                        })()}
                      </tbody>
                    </table>
                  </>
                )}
              </FormPopUp>
            );
          })()}

        {/* Suspicious pricing history popup */}
        {suspiciousPopupQuotation &&
          (() => {
            const unitVal = Number(suspiciousPopupQuotation.unit_price);
            const validHistory = priceHistory.filter(
              (r) => r.unit_price != null && r.unit_price > 0,
            );
            const avgHistorical =
              validHistory.length > 0
                ? validHistory.reduce((s, r) => s + r.unit_price!, 0) /
                  validHistory.length
                : null;
            const increasePct =
              avgHistorical && avgHistorical > 0
                ? Math.round(((unitVal - avgHistorical) / avgHistorical) * 100)
                : null;
            const PREVIEW_COUNT = 3;
            return (
              <FormPopUp
                header={"SUSPICIOUS PRICING DETECTED"}
                setIsOpen={() => setSuspiciousPopupQuotation(null)}
              >
                <p>
                  Based on historical pricing data for &ldquo;
                  {mrLine.material_description}&rdquo;, this vendor&apos;s price
                  is significantly higher than average:
                </p>
                <br />
                <div style={{ marginBottom: "18px" }}>
                  <div>
                    Current Rate: <strong>{formatPriceAED(unitVal)}</strong>
                  </div>
                  <div>
                    Average Historical Rate:{" "}
                    <strong>
                      {avgHistorical != null
                        ? formatPriceAED(avgHistorical)
                        : "N/A"}
                    </strong>
                  </div>
                  {increasePct != null && (
                    <div>
                      Increase:{" "}
                      <strong style={{ color: "rgba(220,38,38,1)" }}>
                        +{increasePct}%
                      </strong>
                    </div>
                  )}
                </div>
                <table className="items-table">
                  <thead>
                    <tr>
                      <th>LPO NUMBER</th>
                      <th>DATE</th>
                      <th>MATERIAL</th>
                      <th>UNIT PRICE</th>
                      <th>VENDOR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validHistory.slice(0, PREVIEW_COUNT).map((row) => (
                      <tr key={`${row.lpo_id}-${row.date}`}>
                        <td>
                          <a
                            href={`/mr/${row.mr_header_id}/lpo/${row.lpo_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: "rgba(37,150,190,1)",
                              fontWeight: 600,
                              textDecoration: "none",
                            }}
                          >
                            LPO-{String(row.lpo_id).padStart(5, "0")}
                          </a>
                        </td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          {row.date ?? "—"}
                        </td>
                        <td>{row.material_description}</td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          {row.unit_price != null
                            ? formatPriceAED(row.unit_price)
                            : "—"}
                        </td>
                        <td>{row.supplier_name ?? "—"}</td>
                      </tr>
                    ))}
                    {validHistory.length > PREVIEW_COUNT && (
                      <tr>
                        <td
                          colSpan={5}
                          style={{
                            color: "rgba(37,150,190,1)",
                            fontSize: "11px",
                          }}
                        >
                          …and {validHistory.length - PREVIEW_COUNT} more
                          purchase
                          {validHistory.length - PREVIEW_COUNT !== 1 ? "s" : ""}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </FormPopUp>
            );
          })()}

        {/* Cheaper option available popup */}
        {cheaperOptionOpen &&
          (() => {
            const minCurrentPrice =
              supplierQuotations.length > 0
                ? Math.min(
                    ...supplierQuotations
                      .map((q) => Number(q.unit_price))
                      .filter((v) => v > 0),
                  )
                : Infinity;
            const cheaperHistory = priceHistory.filter(
              (r) =>
                r.unit_price != null &&
                r.unit_price > 0 &&
                r.unit_price < minCurrentPrice,
            );
            const cheapestHistoricalPrice =
              cheaperHistory.length > 0
                ? Math.min(...cheaperHistory.map((r) => r.unit_price!))
                : null;
            const savingsPerUnit =
              cheapestHistoricalPrice != null && minCurrentPrice !== Infinity
                ? minCurrentPrice - cheapestHistoricalPrice
                : null;
            const totalSavings =
              savingsPerUnit != null
                ? savingsPerUnit * (Number(mrLine.quantity) || 0)
                : null;
            const PREVIEW_COUNT = 3;
            return (
              <FormPopUp
                header={"CHEAPER OPTION AVAILABLE"}
                setIsOpen={() => setCheaperOptionOpen(false)}
              >
                <p>
                  Based on historical pricing data for &ldquo;
                  {mrLine.material_description}&rdquo;, a cheaper vendor was
                  found:
                </p>
                <br />
                {totalSavings != null && (
                  <div>
                    Estimated Total Savings:{" "}
                    <strong style={{ color: "rgba(0,163,93,1)" }}>
                      {formatPriceAED(totalSavings)}
                    </strong>
                  </div>
                )}
                <table className="items-table">
                  <thead>
                    <tr>
                      <th>LPO NUMBER</th>
                      <th>DATE</th>
                      <th>MATERIAL</th>
                      <th>UNIT PRICE</th>
                      <th>VENDOR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cheaperHistory.slice(0, PREVIEW_COUNT).map((row) => (
                      <tr key={`${row.lpo_id}-${row.date}`}>
                        <td>
                          <a
                            href={`/mr/${row.mr_header_id}/lpo/${row.lpo_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: "rgba(37,150,190,1)",
                              fontWeight: 600,
                              textDecoration: "none",
                            }}
                          >
                            LPO-{String(row.lpo_id).padStart(5, "0")}
                          </a>
                        </td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          {row.date ?? "—"}
                        </td>
                        <td>{row.material_description}</td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          {row.unit_price != null
                            ? formatPriceAED(row.unit_price)
                            : "—"}
                        </td>
                        <td>{row.supplier_name ?? "—"}</td>
                      </tr>
                    ))}
                    {cheaperHistory.length > PREVIEW_COUNT && (
                      <tr>
                        <td
                          colSpan={5}
                          style={{
                            color: "rgba(37,150,190,1)",
                            fontSize: "11px",
                          }}
                        >
                          …and {cheaperHistory.length - PREVIEW_COUNT} more
                          purchase
                          {cheaperHistory.length - PREVIEW_COUNT !== 1
                            ? "s"
                            : ""}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </FormPopUp>
            );
          })()}

        {/* Fixed-position tooltip for BUDGET EST. progress bars */}
        {boqBarTooltip &&
          typeof document !== "undefined" &&
          createPortal(
            <div
              style={{
                position: "fixed",
                top: boqBarTooltip.y,
                left: boqBarTooltip.x,
                transform: "translate(-50%, calc(-100% - 10px))",
                background: "white",
                color: "rgba(30,30,30,1)",
                padding: "7px 14px",
                borderRadius: "8px",
                border: "1px solid rgba(220,220,220,1)",
                boxShadow: "0 4px 14px rgba(0,0,0,0.10)",
                fontSize: "12px",
                fontWeight: 600,
                whiteSpace: "nowrap",
                pointerEvents: "none",
                zIndex: 99999,
              }}
            >
              <span
                style={{
                  color: boqBarTooltip.over
                    ? "rgba(194,53,53,1)"
                    : "rgba(0,163,93,1)",
                }}
              >
                {formatPriceAED(boqBarTooltip.existing)}
              </span>
              <span
                style={{
                  color: boqBarTooltip.over
                    ? "rgba(248,77,77,1)"
                    : "rgba(26,216,135,1)",
                }}
              >
                {" (+"}
                {formatPriceAED(boqBarTooltip.vendorCost)}
                {")"}
              </span>
              {" / "}
              {formatPriceAED(boqBarTooltip.itemBudget)}
            </div>,
            document.body,
          )}

        {isRejectOpen && (
          <FormPopUp
            header={"REJECT ALL VENDOR & QUOTATION"}
            setIsOpen={setIsRejectOpen}
            handleSubmit={(e) => handleRejectAll(e)}
            style={{ whiteSpace: "pre-wrap" }}
            addButtonLabel="CONFIRM"
          >
            <div className="input-row full">
              <InputItem
                label={"COMMENTS"}
                value={rejectText}
                type={"textarea"}
                placeholder={"ENTER COMMENTS"}
                required
                onChange={(e) => setRejectText(e.target.value)}
              />
            </div>
          </FormPopUp>
        )}
      </>
    );
  }

  return null;
}
