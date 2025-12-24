"use client";

import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import { useState, useEffect } from "react";
import { MrLine } from "../../types/mrLine";
import { LpoHeader } from "../../types/lpoHeader";

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
  packaging_condition: "good" | "bad" | null;
  notes: string;
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
  const checkIcon = "/icons/check.svg";
  const crossIcon = "/icons/cross-small.svg";
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
    null
  );
  const [isLoadingGrn, setIsLoadingGrn] = useState(false);

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
        }
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
        }
      );
      const data = await response.json();

      if (data.success && data.data) {
        setLpo(data.data);

        // Find the lpo_mr_line that matches this mrLine
        if (data.data.lpo_mr_lines) {
          const foundLpoMrLine = data.data.lpo_mr_lines.find(
            (line: any) => line.mr_line_id === mrLine.id
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
        }
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

  function findGrnLineForItem() {
    if (!existingGrn || !lpoMrLine) return;

    // Find the GRN line that matches this lpo_mr_line_id
    const grnLine = existingGrn.grn_lines.find(
      (gl: any) => gl.lpo_mr_line_id === lpoMrLine.id
    );

    if (grnLine) {
      setGrnLineForItem(grnLine);
    }
  }

  // Format received date
  const getFormattedReceivedDate = () => {
    if (!existingGrn?.received_date) return "-";
    return new Date(existingGrn.received_date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Function to check if received quantity matches ordered quantity
  const checkQuantityMatch = () => {
    if (!grnLineForItem) return null;

    const receivedQty = parseFloat(grnLineForItem.received_quantity || "0");
    const orderedQty = mrLine.quantity || 0;

    if (!grnLineForItem.received_quantity) {
      return null;
    }

    return receivedQty === orderedQty;
  };

  const quantityMatch = checkQuantityMatch();
  const receivedQty = parseFloat(grnLineForItem?.received_quantity || "0");
  const orderedQty = mrLine.quantity;

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
              label={"SUPPLIER NAME"}
              value={mrLine.approved_supplier_name || ""}
              type={"text"}
              placeholder={""}
              required={false}
              onChange={() => {}}
              disabled
            />
          </div>

          <div className="input-row three-col">
            <InputItem
              label={"DELIVERY DATE"}
              value={
                lpo?.delivery_date
                  ? new Date(lpo.delivery_date).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })
                  : ""
              }
              type={"text"}
              placeholder={""}
              required={false}
              onChange={() => {}}
              disabled
            />
            <InputItem
              label={"RECEIVED DATE"}
              value={getFormattedReceivedDate()}
              type={"text"}
              placeholder={""}
              required={false}
              onChange={() => {}}
              disabled
            />
            <InputItem
              label={"RECEIVED BY"}
              value={existingGrn?.received_by || ""}
              type={"text"}
              placeholder={""}
              required={false}
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
                <th>ORDERED QUANTITY</th>
                <th>RECEIVED QUANTITY</th>
                <th>PACKAGING CONDITION</th>
                <th>NOTES</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1</td>
                <td>{mrLine.material_description}</td>
                <td>
                  {mrLine.quantity} {mrLine.unit}
                </td>
                <td>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <InputItem
                        label={""}
                        value={grnLineForItem?.received_quantity || "0"}
                        type={"text"}
                        placeholder={""}
                        required
                        onChange={() => {}}
                        style={{ minWidth: "200px", marginBottom: "0px" }}
                        disabled
                      />
                      {quantityMatch !== null && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            flexShrink: 0,
                          }}
                        >
                          {quantityMatch ? (
                            <img
                              src={checkGreenIcon}
                              alt="match"
                              style={{
                                width: "32px",
                              }}
                            />
                          ) : (
                            <img
                              src={warningIcon}
                              alt="warning"
                              style={{
                                width: "32px",
                              }}
                            />
                          )}
                        </div>
                      )}
                    </div>
                    {quantityMatch === false && (
                      <span
                        style={{
                          fontWeight: "500",
                          color: "rgba(248, 77, 77, 1)",
                          fontStyle: "italic",
                          paddingLeft: "4px",
                        }}
                      >
                        {receivedQty > orderedQty
                          ? "Excess quantity beyond the request"
                          : "Quantity is less than the request"}
                      </span>
                    )}
                  </div>
                </td>
                <td>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <Button
                      componentType={"button"}
                      bgColor={
                        grnLineForItem?.packaging_condition === "good"
                          ? "rgba(0, 163, 93, 1)"
                          : "white"
                      }
                      borderColor={
                        grnLineForItem?.packaging_condition === "good"
                          ? "rgba(0, 163, 93, 1)"
                          : "rgba(207, 207, 207, 1)"
                      }
                      textColor={
                        grnLineForItem?.packaging_condition === "good"
                          ? "white"
                          : "black"
                      }
                      style={{
                        borderRadius: "50px",
                        padding: "10px 10px",
                        cursor: "default",
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                      }}
                    >
                      <img
                        src={checkIcon}
                        alt="check"
                        style={{
                          filter:
                            grnLineForItem?.packaging_condition === "good"
                              ? "invert(1)"
                              : "none",
                        }}
                      />
                    </Button>
                    <Button
                      componentType={"button"}
                      bgColor={
                        grnLineForItem?.packaging_condition === "bad"
                          ? "rgba(248, 77, 77, 1)"
                          : "white"
                      }
                      borderColor={
                        grnLineForItem?.packaging_condition === "bad"
                          ? "rgba(248, 77, 77, 1)"
                          : "rgba(207, 207, 207, 1)"
                      }
                      textColor={
                        grnLineForItem?.packaging_condition === "bad"
                          ? "white"
                          : "black"
                      }
                      style={{
                        borderRadius: "50px",
                        padding: "10px 10px",
                        cursor: "default",
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                      }}
                    >
                      <img
                        src={crossIcon}
                        alt="cross"
                        style={{
                          filter:
                            grnLineForItem?.packaging_condition === "bad"
                              ? "invert(1)"
                              : "none",
                        }}
                      />
                    </Button>
                  </div>
                </td>
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
