"use client";

import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { SubcontractorQuotation } from "../../types/subcontractorQuotation";
import { toast } from "@/app/components/Toast";
import InputItem from "@/app/components/InputItem";
import RejectCommentPopUp from "./RejectCommentPopUp";
import { JoLine } from "../../types/joLine";

type JoPriceApprovalButtonProps = {
  progressID: number;
  joLine: JoLine;
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
  full?: boolean;
  style?: React.CSSProperties;
  onTotalPriceChange?: (joLineId: number, totalPrice: number) => void;
  // Smart Select All props
  isSmartSelectPortal?: boolean;
  allJoLines?: JoLine[];
  portalTargetId?: string;
};

export default function JoPriceApprovalButton({
  progressID,
  joLine,
  bgColor = "rgba(239, 239, 239, 1)",
  textColor = "black",
  borderColor = "rgba(239, 239, 239, 1)",
  full,
  style,
  onTotalPriceChange,
  isSmartSelectPortal = false,
  allJoLines,
  portalTargetId = "jo-smart-select-portal",
}: JoPriceApprovalButtonProps) {
  const diamondIcon = "/icons/diamond.svg";
  const externalLinkIcon = "/icons/external-link.svg";
  const crossIcon = "/icons/cross-small.svg";

  const router = useRouter();

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [subcontractorQuotations, setSubcontractorQuotations] = useState<
    SubcontractorQuotation[]
  >([]);
  const [selectedSubcontractorID, setSelectedSubcontractorID] = useState("");
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectText, setRejectText] = useState("");

  // Approval states
  const [approvedQuotation, setApprovedQuotation] =
    useState<SubcontractorQuotation | null>(null);
  const [allRejected, setAllRejected] = useState(false);
  const [allPending, setAllPending] = useState(false);

  // Smart Select All states
  const [isProcessing, setIsProcessing] = useState(false);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(
    null,
  );

  // Find portal container
  useEffect(() => {
    if (isSmartSelectPortal) {
      const container = document.getElementById(portalTargetId);
      setPortalContainer(container);
    }
  }, [isSmartSelectPortal, portalTargetId]);

  const fetchQuotations = () => {
    if (isSmartSelectPortal || !joLine?.id) {
      return;
    }

    fetch("/api/subcontractor/getAllSubcontractorAndQuotationByJoLineID", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: joLine.id }),
    })
      .then((res) => res.json())
      .then((data) => {
        console.log(`Fetched quotations for JO Line ${joLine.id}:`, data);

        if (!Array.isArray(data)) {
          console.error("Invalid data format:", data);
          setSubcontractorQuotations([]);
          return;
        }

        setSubcontractorQuotations(data);

        // Approval Status
        const approved = data.find(
          (q: SubcontractorQuotation) => q.approval_status === "Approved",
        );
        setApprovedQuotation(approved || null);

        if (approved && onTotalPriceChange) {
          onTotalPriceChange(
            joLine.id,
            parseFloat(String(approved.total_price)) || 0,
          );
        } else if (onTotalPriceChange) {
          onTotalPriceChange(joLine.id, 0);
        }

        const rejected = data.every(
          (q: SubcontractorQuotation) => q.approval_status === "Rejected",
        );
        setAllRejected(rejected && data.length > 0);

        const pending = data.every(
          (q: SubcontractorQuotation) =>
            !q.approval_status || q.approval_status === null,
        );
        setAllPending(pending && data.length > 0);
      })
      .catch((err) => {
        console.error("Error fetching quotations:", err);
        setSubcontractorQuotations([]);
      });
  };

  useEffect(() => {
    if (!isSmartSelectPortal && joLine?.id) {
      fetchQuotations();
    }

    const handleQuotationsUpdated = () => {
      console.log("JO Quotations updated event received, refetching...");
      if (!isSmartSelectPortal && joLine?.id) {
        fetchQuotations();
      }
    };

    window.addEventListener("joQuotationsUpdated", handleQuotationsUpdated);

    return () => {
      window.removeEventListener(
        "joQuotationsUpdated",
        handleQuotationsUpdated,
      );
    };
  }, [joLine?.id, isSmartSelectPortal]);

  // Smart Select All handler
  async function handleSmartSelectAll() {
    if (!allJoLines || allJoLines.length === 0) {
      toast("No JO lines available", "error");
      return;
    }

    setIsProcessing(true);

    let successful = 0;
    let failed = 0;

    for (const item of allJoLines) {
      try {
        const quotationsResponse = await fetch(
          "/api/subcontractor/getAllSubcontractorAndQuotationByJoLineID",
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
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/subcontractor`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "approveSubcontractorQuotation",
              quotation_id: lowestPriceQuotation.id,
              jo_line_id: item.id,
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
        `Smart Select completed: ${successful} subcontractor${successful > 1 ? "s" : ""} approved`,
        "success",
      );
    } else if (successful > 0 && failed > 0) {
      toast(
        `Smart Select completed: ${successful} approved, ${failed} failed`,
        "warning",
      );
    } else {
      toast("Smart Select failed: No subcontractors approved", "error");
    }

    window.dispatchEvent(new CustomEvent("joQuotationsUpdated"));
    router.refresh();
  }

  async function handleApproveSubcontractorQuotation(e: React.FormEvent) {
    e.preventDefault();

    const selectedQuotation = subcontractorQuotations.find(
      (q) => q.id === Number(selectedSubcontractorID),
    );

    if (!selectedQuotation) {
      toast("Please select a subcontractor", "error");
      return;
    }

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/subcontractor`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approveSubcontractorQuotation",
          quotation_id: selectedQuotation.id,
          jo_line_id: joLine.id,
        }),
      },
    );

    if (res.ok) {
      toast(
        `Subcontractor and quotation approved for ${joLine.job_description}`,
        "success",
      );
      setIsOpen(false);
      setRejectText("");
      fetchQuotations();
      router.refresh();
    } else {
      toast("Failed to approve subcontractor and quotation", "error");
    }
  }

  async function handleRejectAll(e: React.FormEvent) {
    e.preventDefault();

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/subcontractor`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "rejectAllSubcontractorQuotations",
          reject_comment: rejectText,
          jo_line_id: joLine.id,
        }),
      },
    );

    if (res.ok) {
      toast("Subcontractor and quotation rejected", "success");
      setRejectText("");
      setIsRejectOpen(false);
      setIsOpen(false);
      fetchQuotations();
      router.refresh();
    } else {
      toast("Failed to reject subcontractor and quotation", "error");
    }
  }

  async function handleReset() {
    if (approvedQuotation) {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/subcontractor`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "resetSubcontractorQuotation",
            jo_line_id: joLine.id,
            subcontractor_id: approvedQuotation.subcontractor_id,
          }),
        },
      );

      if (res.ok) {
        fetchQuotations();
        router.refresh();
      } else {
        toast("Failed to reset subcontractor selection", "error");
      }
    } else if (allRejected) {
      // Reset all rejected quotations back to pending
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/subcontractor`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "resetAllSubcontractorQuotations",
            jo_line_id: joLine.id,
          }),
        },
      );

      if (res.ok) {
        fetchQuotations();
        router.refresh();
      } else {
        toast("Failed to reset quotations", "error");
      }
    }
  }

  // Render Smart Select Portal Button
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
        Smart Select
        <img src={diamondIcon} alt="diamond icon" />
      </Button>,
      portalContainer,
    );
  }

  // RENDER STATUS PILLS (for progressID === 11)
  if (progressID === 11) {
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
              <span>{approvedQuotation.subcontractor_name}</span>
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
              <span>All Subcontractors Rejected</span>
              <RejectCommentPopUp
                text={subcontractorQuotations[0]?.reject_comment}
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
      </div>
    );
  }

  // RENDER ACTION BUTTONS (for progressID === 10)
  if (progressID === 10) {
    if (approvedQuotation) {
      return (
        <div style={{ display: "flex", gap: "25px", alignItems: "center" }}>
          <div
            className="approval-pill"
            style={{
              backgroundColor: "rgba(34, 150, 100, 1)",
              color: "white",
              minWidth: "250px",
            }}
          >
            <span>{approvedQuotation.subcontractor_name}</span>
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
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
        </div>
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
          <span style={{ textWrap: "nowrap" }}>
            All Subcontractors Rejected
          </span>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <RejectCommentPopUp
              text={subcontractorQuotations[0]?.reject_comment}
            />
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
        <div style={{ display: "flex", gap: "10px" }}>
          <Button
            componentType={"button"}
            bgColor={"white"}
            borderColor={"rgba(207, 207, 207, 1)"}
            textColor={"black"}
            onClick={() => setIsOpen(true)}
            style={{ borderRadius: "50px" }}
          >
            Manually Select{" "}
            <img src={externalLinkIcon} alt="external link icon" />
          </Button>
        </div>

        {isOpen && (
          <FormPopUp
            header={"CHOOSE SUBCONTRACTOR AND QUOTATION"}
            setIsOpen={setIsOpen}
            handleSubmit={(e) => handleApproveSubcontractorQuotation(e)}
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
                  <th>SUBCONTRACTOR</th>
                  <th>QUOTATION</th>
                  <th>TOTAL PRICE</th>
                </tr>
              </thead>
              <tbody>
                {subcontractorQuotations.map(
                  (quotation: SubcontractorQuotation, index: number) => (
                    <tr key={index}>
                      <td>
                        <input
                          type="radio"
                          name="subcontractor"
                          value={quotation.id}
                          onChange={(e) =>
                            setSelectedSubcontractorID(e.target.value)
                          }
                          required
                        />
                      </td>
                      <td>
                        <Button
                          componentType={"button"}
                          bgColor={"white"}
                          borderColor={"rgba(207, 207, 207, 1)"}
                          textColor={"black"}
                          style={{
                            padding: "7px 20px",
                            textWrap: "nowrap",
                            minWidth: "300px",
                            display: "flex",
                            justifyContent: "space-between",
                            borderRadius: "25px",
                          }}
                        >
                          {quotation.subcontractor_name}
                        </Button>
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
                            src="/icons/external-link.svg"
                            alt="external link icon"
                          />
                        </Button>
                      </td>
                      <td>{quotation.total_price} AED</td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </FormPopUp>
        )}

        {isRejectOpen && (
          <FormPopUp
            header={"REJECT ALL SUBCONTRACTORS AND QUOTATIONS"}
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
