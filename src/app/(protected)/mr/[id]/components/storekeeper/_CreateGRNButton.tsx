"use client";

import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import { toast } from "@/app/components/Toast";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { MrLine } from "../../types/mrLine";
import { useAuth } from "@/app/context/AuthContext";
import { LPO } from "../../types/lpo";
import { MrHeader } from "../../types/mrHeader";

type CreateGRNButtonProps = {
  mrHeader: MrHeader;
  mrLines: MrLine[];
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
  children: React.ReactNode;
  full?: boolean;
  style?: React.CSSProperties;
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

export default function CreateGRNButton({
  mrHeader,
  mrLines,
  bgColor = "rgba(239, 239, 239, 1)",
  textColor = "black",
  borderColor = "rgba(239, 239, 239, 1)",
  children,
  full,
  style,
}: CreateGRNButtonProps) {
  const router = useRouter();
  const { userInfo } = useAuth();

  const checkIcon = "/icons/check.svg";
  const crossIcon = "/icons/cross-small.svg";
  const pencilIcon = "/icons/pencil.svg";
  const warningIcon = "/icons/warning.svg";
  const checkGreenIcon = "/icons/check-green.svg";
  const externalLinkIcon = "/icons/external-link.svg";

  const [isOpen, setIsOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [currentNoteIndex, setCurrentNoteIndex] = useState<number | null>(null);

  const [existingLpoId, setExistingLpoId] = useState<number | null>(null);
  const [lpo, setLpo] = useState<LPO | null>(null);
  const [lpoMrLines, setLpoMrLines] = useState<any[]>([]);

  const [existingGrn, setExistingGrn] = useState<GRN | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);

  const [receivedDate, setReceivedDate] = useState("");

  // State for GRN line items
  const [grnLines, setGrnLines] = useState<{ [key: number]: GRNLineItem }>({});

  useEffect(() => {
    if (mrLines.length > 0 && mrLines[0]?.approved_supplier_id) {
      checkExistingLpo();
    }
  }, [mrHeader.id, mrLines]);

  // Check if we should be in view mode based on progress_id
  useEffect(() => {
    if (mrHeader.progress_id >= 21) {
      setIsViewMode(true);
    } else {
      setIsViewMode(false);
    }
  }, [mrHeader.progress_id]);

  async function checkExistingLpo() {
    try {
      const supplierId = mrLines[0]?.approved_supplier_id;

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo/getLPOByMrHeaderID`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mr_header_id: mrHeader.id,
            supplier_id: supplierId,
          }),
        }
      );
      const data = await res.json();

      if (data.success && data.data && data.data.length > 0) {
        const lpoData: LPO = data.data[0];
        setExistingLpoId(lpoData.id);
      } else {
        setExistingLpoId(null);
      }
    } catch (error) {
      console.error("Error checking for existing LPO:", error);
    }
  }

  useEffect(() => {
    async function fetchLpo() {
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

          // Fetch LPO MR Lines
          if (data.data.lpo_mr_lines) {
            setLpoMrLines(data.data.lpo_mr_lines);

            // Initialize GRN lines state
            const initialGrnLines: { [key: number]: GRNLineItem } = {};
            data.data.lpo_mr_lines.forEach((line: any, index: number) => {
              initialGrnLines[index] = {
                lpo_mr_line_id: line.id,
                received_quantity: "",
                packaging_condition: null,
                notes: "",
              };
            });
            setGrnLines(initialGrnLines);
          }
        }
      } catch (error) {
        console.error("Error fetching LPO:", error);
      }
    }
    fetchLpo();
  }, [existingLpoId]);

  // Check for existing GRN
  useEffect(() => {
    async function checkExistingGrn() {
      if (!existingLpoId) return;

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
          // Only set edit mode if not in view mode
          if (!isViewMode) {
            setIsEditMode(true);
          }
        } else {
          setExistingGrn(null);
          setIsEditMode(false);
        }
      } catch (error) {
        console.error("Error checking for existing GRN:", error);
        setExistingGrn(null);
        setIsEditMode(false);
      }
    }

    checkExistingGrn();
  }, [existingLpoId]);

  // Load existing GRN data when editing
  useEffect(() => {
    if (existingGrn && existingGrn.id && lpoMrLines.length > 0) {
      setReceivedDate(
        existingGrn.received_date
          ? new Date(existingGrn.received_date).toISOString().split("T")[0]
          : ""
      );

      // Map existing GRN lines to the form
      const mappedGrnLines: { [key: number]: GRNLineItem } = {};

      lpoMrLines.forEach((lpoLine: any, index: number) => {
        // Find matching GRN line
        const grnLine = existingGrn.grn_lines?.find(
          (gl: any) => gl.lpo_mr_line_id === lpoLine.id
        );

        if (grnLine) {
          mappedGrnLines[index] = {
            lpo_mr_line_id: lpoLine.id,
            received_quantity: grnLine.received_quantity?.toString() || "",
            packaging_condition: grnLine.packaging_condition || null,
            notes: grnLine.notes || "",
          };
        } else {
          mappedGrnLines[index] = {
            lpo_mr_line_id: lpoLine.id,
            received_quantity: "",
            packaging_condition: null,
            notes: "",
          };
        }
      });

      setGrnLines(mappedGrnLines);
    }
  }, [existingGrn, lpoMrLines]);

  const handleReceivedQuantityChange = (index: number, value: string) => {
    if (isViewMode) return; // Prevent changes in view mode

    setGrnLines((prev) => ({
      ...prev,
      [index]: {
        ...prev[index],
        received_quantity: value,
      },
    }));
  };

  const handlePackagingConditionChange = (
    index: number,
    condition: "good" | "bad"
  ) => {
    if (isViewMode) return; // Prevent changes in view mode

    setGrnLines((prev) => ({
      ...prev,
      [index]: {
        ...prev[index],
        packaging_condition: condition,
      },
    }));
  };

  const openNotesModal = (index: number) => {
    setCurrentNoteIndex(index);
    setIsNotesOpen(true);
  };

  const handleNotesSubmit = () => {
    if (currentNoteIndex !== null) {
      setIsNotesOpen(false);
      setCurrentNoteIndex(null);
    }
  };

  const handleNotesChange = (value: string) => {
    if (isViewMode) return; // Prevent changes in view mode

    if (currentNoteIndex !== null) {
      setGrnLines((prev) => ({
        ...prev,
        [currentNoteIndex]: {
          ...prev[currentNoteIndex],
          notes: value,
        },
      }));
    }
  };

  // Function to check if received quantity matches ordered quantity
  const checkQuantityMatch = (index: number) => {
    const receivedQty = parseFloat(grnLines[index]?.received_quantity || "0");
    const orderedQty = mrLines[index]?.quantity || 0;

    if (!grnLines[index]?.received_quantity) {
      return null; // No input yet
    }

    return receivedQty === orderedQty;
  };

  // Function to check if there are any mismatched quantities
  const hasQuantityMismatch = () => {
    return Object.keys(grnLines).some((key) => {
      const index = parseInt(key);
      const match = checkQuantityMatch(index);
      return match === false; // Only return true if there's a confirmed mismatch
    });
  };

  // Function to reset all form fields
  const resetForm = () => {
    setReceivedDate("");

    // Reset GRN lines to initial empty state
    if (lpoMrLines.length > 0) {
      const initialGrnLines: { [key: number]: GRNLineItem } = {};
      lpoMrLines.forEach((line: any, index: number) => {
        initialGrnLines[index] = {
          lpo_mr_line_id: line.id,
          received_quantity: "",
          packaging_condition: null,
          notes: "",
        };
      });
      setGrnLines(initialGrnLines);
    }
  };

  // Recheck for existing GRN
  async function recheckGrn() {
    if (!existingLpoId) return;

    console.log("Rechecking for existing GRN with LPO ID:", existingLpoId);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/grn/getGRNDetailsByLPOID`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lpo_id: existingLpoId }),
        }
      );

      if (!response.ok) {
        console.error("API response not ok:", response.status);
        setExistingGrn(null);
        setIsEditMode(false);
        return;
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.error("Response is not JSON:", contentType);
        setExistingGrn(null);
        setIsEditMode(false);
        return;
      }

      const data = await response.json();
      console.log("GRN recheck response:", data);

      if (data.success && data.data && data.data.id) {
        console.log("GRN found on recheck:", data.data);
        setExistingGrn(data.data);
        setIsEditMode(true);
      } else {
        console.log("No GRN found on recheck");
        setExistingGrn(null);
        setIsEditMode(false);
      }
    } catch (error) {
      console.error("Error rechecking for existing GRN:", error);
      setExistingGrn(null);
      setIsEditMode(false);
    }
  }

  // Handle form submission (create or update)
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // In view mode, just close the modal
    if (isViewMode) {
      setIsOpen(false);
      return;
    }

    const allLinesValid = Object.values(grnLines).every(
      (line) => line.received_quantity && line.packaging_condition
    );

    if (!allLinesValid) {
      toast(
        "Please fill in all received quantities and packaging conditions",
        "error"
      );
      return;
    }

    const grnLinesArray = Object.values(grnLines).map((line) => ({
      lpo_mr_line_id: line.lpo_mr_line_id,
      received_quantity: parseFloat(line.received_quantity),
      packaging_condition: line.packaging_condition,
      notes: line.notes || null,
    }));

    // Determine if we're creating or updating
    const action = isEditMode ? "updateGRN" : "createGRN";
    const requestBody: any = {
      action,
      lpo_id: existingLpoId,
      received_date: receivedDate,
      received_by: userInfo?.name,
      grn_lines: grnLinesArray,
    };

    // Include GRN ID if updating
    if (isEditMode && existingGrn?.id) {
      requestBody.grn_id = existingGrn.id;
    }

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/grn`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (res.ok) {
      toast(
        isEditMode
          ? "Good received note updated"
          : "Good received note created",
        "success"
      );
      setIsOpen(false);

      if (!isEditMode) {
        resetForm();
      }

      // Wait a brief moment for DB to commit, then recheck
      setTimeout(async () => {
        await recheckGrn();
        router.refresh();
      }, 500);
    } else {
      toast(
        isEditMode ? "Failed to update GRN" : "Failed to create GRN",
        "error"
      );
    }
  }

  return (
    <>
      <Button
        componentType={"button"}
        bgColor={isViewMode ? "white" : bgColor}
        borderColor={isViewMode ? "rgba(207, 207, 207, 1)" : borderColor}
        textColor={isViewMode ? "black" : textColor}
        onClick={() => setIsOpen(true)}
        full={full ? true : false}
        style={style}
      >
        {isEditMode ? "Edit GRN" : isViewMode ? "View GRN" : children}
        {isViewMode && (
          <img src={externalLinkIcon} alt="external link" height={11} />
        )}
      </Button>

      {isOpen && (
        <FormPopUp
          header={
            isViewMode
              ? "VIEW GOOD RECEIVED NOTE"
              : isEditMode
              ? "EDIT GOOD RECEIVED NOTE"
              : "CREATE GOOD RECEIVED NOTE"
          }
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={
            isViewMode ? "CLOSE" : isEditMode ? "UPDATE" : "CONFIRM"
          }
        >
          <div className="input-row full">
            <InputItem
              label={"SUPPLIER NAME"}
              value={mrLines[0].approved_supplier_name}
              type={"text"}
              placeholder={"ENTER SUPPLIER NAME"}
              required
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
              placeholder={"ENTER DELIVERY DATE"}
              required
              onChange={() => {}}
              disabled
            />
            <InputItem
              label={"RECEIVED DATE"}
              value={receivedDate}
              type={"date"}
              placeholder={"ENTER RECEIVED DATE"}
              required
              onChange={(e) => {
                if (!isViewMode) {
                  setReceivedDate(e.target.value);
                }
              }}
              disabled={isViewMode}
            />
            <InputItem
              label={"RECEIVED BY"}
              value={
                isEditMode
                  ? existingGrn?.received_by || ""
                  : userInfo?.name || ""
              }
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
                <th>ORDERED QUANTITY</th>
                <th>RECEIVED QUANTITY</th>
                <th>PACKAGING CONDITION</th>
                <th>NOTES</th>
              </tr>
            </thead>
            <tbody>
              {mrLines.map((mrLine, index) => {
                const quantityMatch = checkQuantityMatch(index);
                const receivedQty = parseFloat(
                  grnLines[index]?.received_quantity || "0"
                );
                const orderedQty = mrLine.quantity;

                return (
                  <tr key={mrLine.id || index}>
                    <td>{index + 1}</td>
                    <td>{mrLine.material_description}</td>
                    <td>
                      {mrLine.quantity} {mrLine.unit}
                    </td>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "10px",
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
                            value={grnLines[index]?.received_quantity || ""}
                            type={"text"}
                            placeholder={"ENTER RECEIVED QUANTITY"}
                            required
                            onChange={(e) =>
                              handleReceivedQuantityChange(
                                index,
                                e.target.value
                              )
                            }
                            style={{ minWidth: "200px", marginBottom: "0px" }}
                            disabled={isViewMode}
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
                            grnLines[index]?.packaging_condition === "good"
                              ? "rgba(0, 163, 93, 1)"
                              : "white"
                          }
                          borderColor={
                            grnLines[index]?.packaging_condition === "good"
                              ? "rgba(0, 163, 93, 1)"
                              : "rgba(207, 207, 207, 1)"
                          }
                          textColor={
                            grnLines[index]?.packaging_condition === "good"
                              ? "white"
                              : "black"
                          }
                          style={{
                            borderRadius: "50px",
                            padding: "10px 10px",
                            cursor: isViewMode ? "default" : "pointer",
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            if (!isViewMode) {
                              handlePackagingConditionChange(index, "good");
                            }
                          }}
                        >
                          <img
                            src={checkIcon}
                            alt="check"
                            style={{
                              filter:
                                grnLines[index]?.packaging_condition === "good"
                                  ? "invert(1)"
                                  : "none",
                            }}
                          />
                        </Button>
                        <Button
                          componentType={"button"}
                          bgColor={
                            grnLines[index]?.packaging_condition === "bad"
                              ? "rgba(248, 77, 77, 1)"
                              : "white"
                          }
                          borderColor={
                            grnLines[index]?.packaging_condition === "bad"
                              ? "rgba(248, 77, 77, 1)"
                              : "rgba(207, 207, 207, 1)"
                          }
                          textColor={
                            grnLines[index]?.packaging_condition === "bad"
                              ? "white"
                              : "black"
                          }
                          style={{
                            borderRadius: "50px",
                            padding: "10px 10px",
                            cursor: isViewMode ? "default" : "pointer",
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            if (!isViewMode) {
                              handlePackagingConditionChange(index, "bad");
                            }
                          }}
                        >
                          <img
                            src={crossIcon}
                            alt="cross"
                            style={{
                              filter:
                                grnLines[index]?.packaging_condition === "bad"
                                  ? "invert(1)"
                                  : "none",
                            }}
                          />
                        </Button>
                      </div>
                    </td>
                    <td>
                      {isViewMode ? (
                        grnLines[index]?.notes ? (
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
                              openNotesModal(index);
                            }}
                          >
                            <img src={pencilIcon} alt="notes" />
                          </Button>
                        ) : (
                          <span style={{ color: "rgba(150, 150, 150, 1)" }}>
                            -
                          </span>
                        )
                      ) : (
                        <Button
                          componentType={"button"}
                          bgColor={"rgba(239, 239, 239, 1)"}
                          borderColor={"rgba(223, 223, 223, 1)"}
                          textColor={"black"}
                          style={{ borderRadius: "5px", padding: "10px 10px" }}
                          onClick={(e) => {
                            e.preventDefault();
                            openNotesModal(index);
                          }}
                        >
                          <img src={pencilIcon} alt="notes" />
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {hasQuantityMismatch() && (
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
                Items that do not match the request will be returned to
                procurement
              </span>
            </div>
          )}
        </FormPopUp>
      )}

      {isNotesOpen && currentNoteIndex !== null && (
        <FormPopUp
          header={
            isViewMode ? "VIEW NOTES" : isEditMode ? "EDIT NOTES" : "ADD NOTES"
          }
          setIsOpen={setIsNotesOpen}
          handleSubmit={(e) => {
            e.preventDefault();
            handleNotesSubmit();
          }}
          addButtonLabel={isViewMode ? "CLOSE" : "CONFIRM"}
        >
          <div className="input-row full">
            <InputItem
              label={"NOTES"}
              value={grnLines[currentNoteIndex]?.notes || ""}
              type={"textarea"}
              placeholder={"ENTER NOTES"}
              required={false}
              onChange={(e) => handleNotesChange(e.target.value)}
              disabled={isViewMode}
            />
          </div>
        </FormPopUp>
      )}
    </>
  );
}
