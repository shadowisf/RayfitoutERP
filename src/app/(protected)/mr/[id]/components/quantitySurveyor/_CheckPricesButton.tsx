"use client";

import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SupplierQuotation } from "../../types/supplierQuotation";
import { toast } from "@/app/components/Toast";
import InputItem from "@/app/components/InputItem";
import { MrLine } from "../../types/mrLine";
import SupplierDetailsPopUp from "../SupplierDetailsPopUp";
import RejectCommentPopUp from "./RejectPopUp";

type props = {
  progressID: number;
  mrLine: MrLine;
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
  full?: boolean;
  style?: React.CSSProperties;
};

export default function CheckPricesButton({
  progressID,
  mrLine,
  bgColor = "rgba(239, 239, 239, 1)",
  textColor = "black",
  borderColor = "rgba(239, 239, 239, 1)",
  full,
  style,
}: props) {
  const externalLinkIcon = "/icons/external-link.svg";
  const crossIcon = "/icons/cross-small.svg";

  const router = useRouter();

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectText, setRejectText] = useState("");

  const [supplierQuotations, setSupplierQuotations] = useState<
    SupplierQuotation[]
  >([]);

  const [approvedQuotation, setApprovedQuotation] =
    useState<SupplierQuotation | null>(null);
  const [isRejected, setIsRejected] = useState(false);

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
    fetch("/api/supplier/getAllSupplierAndQuotationByMrLineID", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: mrLine.id }),
    })
      .then((res) => res.json())
      .then((data) => {
        setSupplierQuotations(data);

        const approved = data.find(
          (q: SupplierQuotation) => q.qs_approval_status === "Approved",
        );
        if (approved) {
          setApprovedQuotation(approved);
        } else {
          setApprovedQuotation(null);
        }

        // Check if all are rejected
        const allRejected = data.every(
          (q: SupplierQuotation) => q.qs_approval_status === "Rejected",
        );
        if (allRejected && data.length > 0) {
          setIsRejected(true);
        } else {
          setIsRejected(false);
        }
      })
      .catch((err) => {
        console.error(err);
      });
  };

  useEffect(() => {
    fetchQuotations();
  }, [mrLine.id]);

  async function handleRejectAll(e: React.FormEvent) {
    e.preventDefault();

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/supplier`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "rejectAllSupplierAndQuotationQS",
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
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/supplier`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "resetSupplierAndQuotationQS",
          mr_line_id: mrLine.id,
        }),
      },
    );

    if (res.ok) {
      setRejectText("");
      fetchQuotations();
      router.refresh();
    } else {
      toast("Failed to reset vendor selection", "error");
    }
  }

  if (approvedQuotation) {
    return (
      <div
        className="approval-pill"
        style={{
          backgroundColor: "rgba(34, 150, 100, 1)",
          color: "white",
          minWidth: "250px",
        }}
      >
        <span>Approved</span>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {progressID === 9 && (
            <img
              src={crossIcon}
              alt="reset"
              style={{
                filter: "invert(1)",
                cursor: "pointer",
              }}
              onClick={handleReset}
            />
          )}
        </div>
      </div>
    );
  }

  if (isRejected) {
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
          <RejectCommentPopUp text={supplierQuotations[0].qs_reject_comment} />
          {progressID === 9 && (
            <img
              src={crossIcon}
              alt="reset"
              style={{
                filter: "invert(1)",
                cursor: "pointer",
              }}
              onClick={handleReset}
            />
          )}
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/supplier`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "approveAllSupplierAndQuotationQS",
            mr_line_id: mrLine.id,
          }),
        },
      );

      if (res.ok) {
        toast("All vendors and quotations approved", "success");
        router.refresh();
        fetchQuotations();
        setIsOpen(false);
      } else {
        toast("Failed to approve all vendors and quotations", "error");
      }
    } catch (error) {
      console.error("Form submission error:", error);
    }
  }

  return (
    <>
      <Button
        componentType={"button"}
        bgColor={"transparent"}
        borderColor={"rgba(223, 223, 223, 1)"}
        textColor={"black"}
        onClick={() => setIsOpen(true)}
        style={{ borderRadius: "50px" }}
      >
        View Prices <img src={externalLinkIcon} alt="external link icon" />
      </Button>

      {isOpen && (
        <FormPopUp
          header={"VENDORS AND QUOTATIONS"}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"APPROVE"}
          secondButton={
            <Button
              componentType={"button"}
              bgColor={"transparent"}
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
          <>
            <table className="items-table">
              <thead>
                <tr>
                  <th>SUPPLIER</th>
                  <th>QUOTATION</th>
                  <th>QTY FOR USE</th>
                  <th>QTY FOR STOCKS</th>
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
                    const totalQty =
                      proposedQty > 0 ? proposedQty : requestedQty;
                    const stockQty =
                      proposedQty > requestedQty
                        ? proposedQty - requestedQty
                        : 0;
                    return (
                      <tr key={index}>
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
                              src="/icons/external-link.svg"
                              alt="external link icon"
                            />
                          </Button>
                        </td>
                        <td>
                          {formatQuantity(requestedQty)} {mrLine.unit}
                        </td>
                        <td>
                          {stockQty > 0
                            ? `${formatQuantity(stockQty)} ${mrLine.unit}`
                            : "-"}
                        </td>
                        <td>{formatCurrency(quotation.unit_price)} AED</td>
                        <td>{formatCurrency(quotation.total_price)} AED</td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </>
        </FormPopUp>
      )}

      {isRejectOpen && (
        <FormPopUp
          header={"REJECT ALL VENDORS AND QUOTATIONS"}
          setIsOpen={setIsRejectOpen}
          handleSubmit={handleRejectAll}
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
