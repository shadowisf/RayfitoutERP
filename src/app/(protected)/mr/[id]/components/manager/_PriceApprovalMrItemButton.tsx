"use client";

import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SupplierQuotation } from "../../types/supplierQuotation";
import SupplierDetailsPopUp from "./SupplierDetailsPopUp";
import { toast } from "@/app/components/Toast";
import InputItem from "@/app/components/InputItem";
import RejectCommentPopUp from "./RejectCommentPopUp";

type PriceApprovalMrItemButtonProps = {
  mrLineID: number;
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
  full?: boolean;
  style?: React.CSSProperties;
};

export default function PriceApprovalMrItemButton({
  mrLineID,
  bgColor = "rgba(239, 239, 239, 1)",
  textColor = "black",
  borderColor = "rgba(239, 239, 239, 1)",
  full,
  style,
}: PriceApprovalMrItemButtonProps) {
  const externalLinkIcon = "/icons/external-link.svg";
  const crossIcon = "/icons/cross.svg";

  const router = useRouter();

  const [isOpen, setIsOpen] = useState<boolean>(false);

  const [supplierQuotations, setSupplierQuotations] = useState<
    SupplierQuotation[]
  >([]);

  const [selectedSupplierID, setSelectedSupplierID] = useState("");

  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectText, setRejectText] = useState("");

  const [approvedQuotation, setApprovedQuotation] =
    useState<SupplierQuotation | null>(null);
  const [isRejected, setIsRejected] = useState(false);

  const fetchQuotations = () => {
    fetch("/api/supplier/getAllSupplierAndQuotationByMrLineID", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: mrLineID }),
    })
      .then((res) => res.json())
      .then((data) => {
        console.log(data);
        setSupplierQuotations(data);

        const approved = data.find(
          (q: SupplierQuotation) => q.approval_status === "Approved"
        );
        if (approved) {
          setApprovedQuotation(approved);
        } else {
          setApprovedQuotation(null);
        }

        // Check if all are rejected
        const allRejected = data.every(
          (q: SupplierQuotation) => q.approval_status === "Rejected"
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
  }, [mrLineID]);

  async function handleApproveSupplierAndQuotation(e: React.FormEvent) {
    e.preventDefault();

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/supplier`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approveSupplierAndQuotation",
          mr_line_id: mrLineID,
          supplier_id: selectedSupplierID,
        }),
      }
    );

    if (res.ok) {
      toast("Supplier and quotation approved", "success");
      setIsOpen(false);

      setRejectText("");

      fetchQuotations();

      router.refresh();
    } else {
      toast("Failed to approve supplier and quotation", "error");
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
          mr_line_id: mrLineID,
        }),
      }
    );

    if (res.ok) {
      toast("Supplier and quotation rejected", "success");

      setRejectText("");

      setIsRejectOpen(false);
      setIsOpen(false);

      fetchQuotations();

      router.refresh();
    } else {
      toast("Failed to reject supplier and quotation", "error");
    }
  }

  async function handleReset() {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/supplier`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "resetSupplierAndQuotation",
          mr_line_id: mrLineID,
        }),
      }
    );

    if (res.ok) {
      toast("Supplier selection reset", "success");

      setRejectText("");

      fetchQuotations();

      router.refresh();
    } else {
      toast("Failed to reset supplier selection", "error");
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
        <span>{approvedQuotation.supplier_name}</span>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <SupplierDetailsPopUp
            item={approvedQuotation}
            style={{
              padding: "0px",
              backgroundColor: "transparent",
              borderColor: "transparent",
              filter: "invert(1)",
            }}
          >
            <img
              src={externalLinkIcon}
              alt="external link icon"
            />
          </SupplierDetailsPopUp>
          <img
            src={crossIcon}
            alt="reset"
            style={{
              filter: "invert(1)",
              cursor: "pointer",
              width: "10px",
            }}
            onClick={handleReset}
          />
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
        }}
      >
        <span>All Supplier Rejected</span>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <RejectCommentPopUp text={supplierQuotations[0].reject_comment} />
          <img
            src={crossIcon}
            alt="reset"
            style={{
              filter: "invert(1)",
              cursor: "pointer",
              width: "10px",
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
        bgColor={bgColor}
        borderColor={borderColor}
        textColor={textColor}
        onClick={() => setIsOpen(true)}
        style={style}
      >
        Manually Select{" "}
        <img
          src={externalLinkIcon}
          alt="external link icon"
        />
      </Button>

      {isOpen && (
        <FormPopUp
          header={"CHOOSE SUPPLIER AND QUOTATION"}
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
              REJECT ALL SUPPLIERS
            </Button>
          }
        >
          <>
            <table className="items-table">
              <thead>
                <tr>
                  <th></th>
                  <th>SUPPLIER</th>
                  <th>QUOTATION</th>
                  {/* <th>RATING</th> */}
                  <th>UNIT PRICE</th>
                  <th>TOTAL PRICE</th>
                </tr>
              </thead>
              <tbody>
                {supplierQuotations.map((quotation, index: number) => (
                  <tr key={index}>
                    <td>
                      <input
                        type="radio"
                        name="supplier"
                        value={quotation.supplier_id}
                        onChange={(e) => setSelectedSupplierID(e.target.value)}
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
                        style={{ padding: "7px 20px", borderRadius: "25px" }}
                      >
                        View Quotation
                        <img
                          src="/icons/external-link.svg"
                          alt="external link icon"
                        />
                      </Button>
                    </td>
                    {/* <td>{quotation.supplier_rating}</td> */}
                    <td>{quotation.unit_price} AED</td>
                    <td>{quotation.total_price} AED</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        </FormPopUp>
      )}

      {isRejectOpen && (
        <FormPopUp
          header={"REJECT ALL SUPPLIER AND QUOTATION"}
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
