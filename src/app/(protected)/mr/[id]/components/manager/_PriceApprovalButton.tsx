"use client";

import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { SupplierQuotation } from "../../types/supplierQuotation";
import { toast } from "@/app/components/Toast";
import InputItem from "@/app/components/InputItem";
import RejectCommentPopUp from "./RejectCommentPopUp";
import { MrLine } from "../../types/mrLine";
import SupplierDetailsPopUp from "../../../components/SupplierDetailsPopUp";
import { formatPriceAED } from "@/lib/formatPrice";

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
  const [globalLowestPrice, setGlobalLowestPrice] = useState<number | null>(
    null,
  );
  const [globalPriceCount, setGlobalPriceCount] = useState<number>(0);

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
    if (!isOpen) return;
    async function fetchGlobalLowestPrice() {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/supplier/getGlobalLowestPriceByMrLineID?mr_line_id=${mrLine.id}`,
        );
        if (res.ok) {
          const data = await res.json();
          setGlobalLowestPrice(
            data.global_lowest != null ? Number(data.global_lowest) : null,
          );
          setGlobalPriceCount(data.price_count ?? 0);
        }
      } catch (err) {
        console.error("Failed to fetch global lowest price:", err);
      }
    }
    fetchGlobalLowestPrice();
  }, [isOpen, mrLine?.id]);

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
    router.refresh();
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
      router.refresh();
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
      router.refresh();
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
      router.refresh();
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
          <Button
            componentType={"button"}
            bgColor={"rgba(239, 239, 239, 1)"}
            borderColor={"rgba(223, 223, 223, 1)"}
            textColor={"black"}
            onClick={() => setIsOpen(true)}
            style={{ padding: "7px 7px" }}
          >
            <img src={externalLinkIcon} alt="edit" />
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
                  header={"CHOOSE VENDOR & QUOTATION"}
                  setIsOpen={setIsOpen}
                  handleSubmit={(e) => handleApproveSupplierAndQuotation(e)}
                  addButtonLabel={"CONFIRM"}
                  secondButton={
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
                      REJECT
                    </Button>
                  }
                >
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
                      </tr>
                    </thead>
                    <tbody>
                      {supplierQuotations.map(
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
                          const totalAlert =
                            !isNaN(totalVal) &&
                            totalVal > 0 &&
                            globalLowestPrice !== null &&
                            globalPriceCount > 0
                              ? totalVal <= globalLowestPrice
                                ? "lowest"
                                : `+${Math.round(((totalVal - globalLowestPrice) / globalLowestPrice) * 100)}% vs lowest`
                              : null;

                          return (
                            <tr key={index}>
                              <td>
                                <input
                                  type="radio"
                                  name="supplier"
                                  value={quotation.id}
                                  defaultChecked={
                                    String(quotation.id) ===
                                    String(approvedQuotation?.id)
                                  }
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
                              <td>{formatPriceAED(quotation.unit_price)}</td>
                              <td style={{ position: "relative" }}>
                                {formatPriceAED(quotation.total_price)}
                                {totalAlert && (
                                  <div
                                    style={{
                                      height: 0,
                                      overflow: "visible",
                                      position: "relative",
                                    }}
                                  >
                                    <div
                                      style={{
                                        position: "absolute",
                                        top: "4px",
                                        left: 0,
                                        fontSize: "10px",
                                        fontWeight: 600,
                                        whiteSpace: "nowrap",
                                        color:
                                          totalAlert === "lowest"
                                            ? "rgba(0,163,93,1)"
                                            : "rgba(220,38,38,1)",
                                      }}
                                    >
                                      {totalAlert === "lowest"
                                        ? "Lowest ✓"
                                        : totalAlert}
                                    </div>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        },
                      )}
                    </tbody>
                  </table>
                </FormPopUp>
              );
            })()}

          {isRejectOpen && (
            <FormPopUp
              header={"REJECT ALL VENDOR AND QUOTATION"}
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
                header={"CHOOSE VENDOR & QUOTATION"}
                setIsOpen={setIsOpen}
                handleSubmit={(e) => handleApproveSupplierAndQuotation(e)}
                addButtonLabel={"CONFIRM"}
                secondButton={
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
                    REJECT
                  </Button>
                }
              >
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
                    </tr>
                  </thead>
                  <tbody>
                    {supplierQuotations.map(
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
                        const totalAlert =
                          !isNaN(totalVal) &&
                          totalVal > 0 &&
                          globalLowestPrice !== null &&
                          globalPriceCount > 0
                            ? totalVal <= globalLowestPrice
                              ? "lowest"
                              : `+${Math.round(((totalVal - globalLowestPrice) / globalLowestPrice) * 100)}% vs lowest`
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
                            <td>{formatPriceAED(quotation.unit_price)}</td>
                            <td style={{ position: "relative" }}>
                              {formatPriceAED(quotation.total_price)}
                              {totalAlert && (
                                <div
                                  style={{
                                    height: 0,
                                    overflow: "visible",
                                    position: "relative",
                                  }}
                                >
                                  <div
                                    style={{
                                      position: "absolute",
                                      top: "4px",
                                      left: 0,
                                      fontSize: "10px",
                                      fontWeight: 600,
                                      whiteSpace: "nowrap",
                                      color:
                                        totalAlert === "lowest"
                                          ? "rgba(0,163,93,1)"
                                          : "rgba(220,38,38,1)",
                                    }}
                                  >
                                    {totalAlert === "lowest"
                                      ? "Lowest ✓"
                                      : totalAlert}
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      },
                    )}
                  </tbody>
                </table>
              </FormPopUp>
            );
          })()}

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
