"use client";

import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import { useState, useEffect } from "react";
import { MrLine } from "../../../../types/mrLine";
import { LpoHeader } from "../../../../types/lpoHeader";

type GRNRefPopUpProps = {
  mrLine: MrLine;
  bgColor: string;
  textColor: string;
  borderColor: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
};

type GRNLineItem = {
  lpo_mr_line_id: number;
  received_quantity: string;
  notes: string;
  attachment: string;
};

type GRN = {
  id: number;
  lpo_id: number;
  received_date: string;
  received_by: string;
  grn_lines: any[];
};

export default function GRNRefPopUp({
  mrLine,
  bgColor,
  textColor,
  borderColor,
  style,
  children,
}: GRNRefPopUpProps) {
  const warningIcon = "/icons/warning.svg";
  const checkGreenIcon = "/icons/check-green.svg";
  const externalLinkIcon = "/icons/external-link.svg";

  const [isOpen, setIsOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);

  const [existingLpoId, setExistingLpoId] = useState<number | null>(null);
  const [lpo, setLpo] = useState<LpoHeader | null>(null);
  const [lpoMrLine, setLpoMrLine] = useState<any>(null);

  const [existingGrn, setExistingGrn] = useState<GRN | null>(null);
  const [grnLineForItem, setGrnLineForItem] = useState<GRNLineItem | null>(
    null,
  );
  const [isLoadingGrn, setIsLoadingGrn] = useState(false);

  // State for QC accepted quantity
  const [qcAcceptedQuantity, setQcAcceptedQuantity] = useState<number | null>(
    null,
  );

  // Fetch LPO when component mounts
  useEffect(() => {
    if (mrLine?.approved_supplier_id && mrLine?.mr_header_id) {
      checkExistingLpo();
    }
  }, [mrLine]);

  // Fetch GRN when LPO is found
  useEffect(() => {
    if (existingLpoId) {
      fetchLpoDetails();
      fetchGrn();
    }
  }, [existingLpoId]);

  // Find the specific GRN line for this MR line
  useEffect(() => {
    if (existingGrn && lpoMrLine) {
      findGrnLineForItem();
    }
  }, [existingGrn, lpoMrLine]);

  // Fetch QC accepted quantity when lpoMrLine is available
  useEffect(() => {
    if (lpoMrLine && isOpen) {
      fetchQcAcceptedQuantity();
    }
  }, [lpoMrLine, isOpen]);

  async function checkExistingLpo() {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo/getLPOByMrHeaderID`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mr_header_id: mrLine.mr_header_id,
            supplier_id: mrLine.approved_supplier_id,
          }),
        },
      );
      const data = await res.json();

      if (data.success && data.data && data.data.length > 0) {
        setExistingLpoId(data.data[0].id);
      } else {
        setExistingLpoId(null);
      }
    } catch (error) {
      console.error("Error checking for existing LPO:", error);
    }
  }

  async function fetchLpoDetails() {
    if (!existingLpoId) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo/getLPODetails`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lpo_id: existingLpoId }),
        },
      );
      const data = await response.json();

      if (data.success && data.data) {
        setLpo(data.data);

        // Find the lpo_mr_line that matches this mrLine
        if (data.data.lpo_mr_lines) {
          const foundLpoMrLine = data.data.lpo_mr_lines.find(
            (line: any) => line.mr_line_id === mrLine.id,
          );
          setLpoMrLine(foundLpoMrLine);
        }
      }
    } catch (error) {
      console.error("Error fetching LPO details:", error);
    }
  }

  async function fetchGrn() {
    if (!existingLpoId) return;

    setIsLoadingGrn(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/grn/getGRNDetailsByLPOID`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lpo_id: existingLpoId }),
        },
      );
      const data = await response.json();

      if (data.success && data.data && data.data.id) {
        setExistingGrn(data.data);
      } else {
        setExistingGrn(null);
      }
    } catch (error) {
      console.error("Error fetching GRN:", error);
      setExistingGrn(null);
    } finally {
      setIsLoadingGrn(false);
    }
  }

  async function fetchQcAcceptedQuantity() {
    if (!lpoMrLine) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/qc/getQCByLPOMrLineID`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lpo_mr_line_id: lpoMrLine.id,
          }),
        },
      );

      const data = await response.json();

      if (data.success && data.data && data.data.accepted_quantity) {
        setQcAcceptedQuantity(data.data.accepted_quantity);
      } else {
        setQcAcceptedQuantity(null);
      }
    } catch (error) {
      console.error("Error fetching QC accepted quantity:", error);
    }
  }

  function findGrnLineForItem() {
    if (!existingGrn || !lpoMrLine) return;

    // Find the GRN line that matches this lpo_mr_line_id
    const grnLine = existingGrn.grn_lines.find(
      (gl: any) => gl.lpo_mr_line_id === lpoMrLine.id,
    );

    if (grnLine) {
      // Parse attachment if it's a JSON string
      let attachmentUrl = "";
      if (grnLine.attachment) {
        try {
          if (typeof grnLine.attachment === "string") {
            attachmentUrl = JSON.parse(grnLine.attachment);
          } else {
            attachmentUrl = grnLine.attachment;
          }
        } catch (e) {
          attachmentUrl = grnLine.attachment;
        }
      }

      setGrnLineForItem({
        lpo_mr_line_id: grnLine.lpo_mr_line_id,
        received_quantity: grnLine.received_quantity?.toString() || "0",
        notes: grnLine.notes || "",
        attachment: attachmentUrl || "",
      });
    }
  }

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Helper function to format quantity without trailing zeros
  const formatQuantity = (value: number | string): string => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num)) return "0";
    if (Number.isInteger(num)) {
      return num.toString();
    }
    // Remove trailing zeros, keep up to 3 decimal precision then trim
    return parseFloat(num.toFixed(3)).toString();
  };

  // Function to check if received quantity matches ordered quantity
  const checkQuantityMatch = () => {
    if (!grnLineForItem) return null;

    const receivedQty = parseFloat(grnLineForItem.received_quantity || "0");
    // Parse orderedQty from mrLine.quantity to handle both string and number types
    const orderedQty =
      typeof mrLine.quantity === "string"
        ? parseFloat(mrLine.quantity)
        : mrLine.quantity || 0;

    // Handle case where received_quantity is empty/null/undefined
    if (
      !grnLineForItem.received_quantity ||
      grnLineForItem.received_quantity === ""
    ) {
      return null;
    }

    // Use tolerance comparison to handle floating point precision issues
    // Round both to 3 decimal places for comparison
    const receivedRounded = Math.round(receivedQty * 1000) / 1000;
    const orderedRounded = Math.round(orderedQty * 1000) / 1000;

    return receivedRounded === orderedRounded;
  };

  const quantityMatch = checkQuantityMatch();

  // Debug logging (remove after fixing)
  useEffect(() => {
    if (grnLineForItem) {
      console.log("Quantity Check Debug:", {
        receivedQty: grnLineForItem.received_quantity,
        receivedQtyParsed: parseFloat(grnLineForItem.received_quantity || "0"),
        orderedQty: mrLine.quantity,
        orderedQtyParsed:
          typeof mrLine.quantity === "string"
            ? parseFloat(mrLine.quantity)
            : mrLine.quantity,
        quantityMatch: checkQuantityMatch(),
      });
    }
  }, [grnLineForItem, mrLine.quantity]);

  const receivedQty = parseFloat(grnLineForItem?.received_quantity || "0");
  const orderedQty =
    typeof mrLine.quantity === "string"
      ? parseFloat(mrLine.quantity)
      : mrLine.quantity || 0;

  // Determine if QC column should be shown (if progress_id >= 21)
  const showQcColumn = qcAcceptedQuantity !== null;

  return (
    <>
      <Button
        componentType={"button"}
        bgColor={bgColor}
        borderColor={borderColor}
        textColor={textColor}
        onClick={(e) => {
          e.preventDefault();
          setIsOpen(true);
        }}
        style={style}
      >
        {children}
      </Button>

      {isOpen && (
        <FormPopUp header={"VIEW GOOD RECEIVED NOTE"} setIsOpen={setIsOpen}>
          <div className="input-row full">
            <InputItem
              label={"VENDOR NAME"}
              value={mrLine.approved_supplier_name || ""}
              type={"text"}
              required
              onChange={() => {}}
              disabled
            />
          </div>

          <div className="input-row three-col">
            <InputItem
              label={"DELIVERY DATE"}
              value={formatDate(lpo?.delivery_date || null)}
              type={"date"}
              placeholder={"ENTER DELIVERY DATE"}
              required
              onChange={() => {}}
              disabled
            />
            <InputItem
              label={"RECEIVED DATE"}
              value={formatDate(existingGrn?.received_date || null)}
              type={"date"}
              placeholder={"ENTER RECEIVED DATE"}
              required
              onChange={() => {}}
              disabled
            />
            <InputItem
              label={"RECEIVED BY"}
              value={existingGrn?.received_by || ""}
              type={"text"}
              placeholder={"ENTER RECEIVED BY"}
              required
              onChange={() => {}}
              disabled
            />
          </div>

          <br />

          <table className="items-table">
            <thead>
              <tr>
                <th>#</th>
                <th>DESCRIPTION</th>
                <th>TOTAL QTY</th>
                <th>RECEIVED QTY</th>
                {showQcColumn && <th>ACCEPTED QUANTITY</th>}
                <th>NOTES</th>
                <th>ATTACHMENT</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1</td>
                <td>{mrLine.material_description}</td>
                <td>
                  {formatQuantity(mrLine.quantity)} {mrLine.unit}
                </td>
                <td>
                  {`${formatQuantity(grnLineForItem?.received_quantity || "0")} ${mrLine.unit}`}
                </td>
                {showQcColumn && (
                  <td>
                    {qcAcceptedQuantity !== null &&
                    qcAcceptedQuantity !== undefined ? (
                      `${formatQuantity(qcAcceptedQuantity)} ${mrLine.unit}`
                    ) : (
                      <span style={{ color: "rgba(150, 150, 150, 1)" }}>-</span>
                    )}
                  </td>
                )}
                <td>
                  {grnLineForItem?.notes ? (
                    <Button
                      componentType={"button"}
                      bgColor={"rgba(239, 239, 239, 1)"}
                      borderColor={"rgba(223, 223, 223, 1)"}
                      textColor={"black"}
                      style={{
                        borderRadius: "5px",
                        padding: "7px 7px",
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        setIsNotesOpen(true);
                      }}
                    >
                      <img src={externalLinkIcon} alt="notes" />
                    </Button>
                  ) : (
                    <span style={{ color: "rgba(150, 150, 150, 1)" }}>-</span>
                  )}
                </td>
                <td>
                  {grnLineForItem?.attachment ? (
                    <Button
                      componentType={"link"}
                      bgColor={"rgba(239, 239, 239, 1)"}
                      borderColor={"rgba(223, 223, 223, 1)"}
                      textColor={"black"}
                      style={{ padding: "7px 7px" }}
                      href={grnLineForItem.attachment}
                      target="_blank"
                    >
                      <img src={externalLinkIcon} alt="view" />
                    </Button>
                  ) : (
                    <span style={{ color: "rgba(150, 150, 150, 1)" }}>-</span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>

          {quantityMatch === false && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginTop: "20px",
                padding: "12px 16px",
                backgroundColor: "rgba(248, 77, 77, 0.08)",
                borderRadius: "8px",
                border: "1px solid rgba(248, 77, 77, 0.2)",
              }}
            >
              <img
                src={warningIcon}
                alt="warning"
                style={{
                  width: "28px",
                  height: "28px",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  color: "rgba(248, 77, 77, 1)",
                  fontStyle: "italic",
                }}
              >
                Item does not match the request
              </span>
            </div>
          )}
        </FormPopUp>
      )}

      {isNotesOpen && (
        <FormPopUp header={"VIEW NOTES"} setIsOpen={setIsNotesOpen}>
          <div className="input-row full">
            <InputItem
              label={"NOTES"}
              value={grnLineForItem?.notes || ""}
              type={"textarea"}
              placeholder={""}
              required={false}
              onChange={() => {}}
              disabled
            />
          </div>
        </FormPopUp>
      )}
    </>
  );
}
