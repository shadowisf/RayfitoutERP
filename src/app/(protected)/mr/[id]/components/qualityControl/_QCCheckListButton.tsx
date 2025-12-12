"use client";

import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import { toast } from "@/app/components/Toast";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { MrLine } from "../../types/mrLine";
import { MrHeader } from "../../types/mrHeader";
import { LPO } from "../../types/lpo";

type QCCheckListButtonProps = {
  mrHeader: MrHeader;
  item: MrLine;
  progressID: number;
};

type CheckpointResponse = "yes" | "no" | "na" | null;

type CheckpointData = {
  response: CheckpointResponse;
  notes: string;
  attachments: File[];
};

type GRN = {
  id: number;
  lpo_id: number;
  received_date: string;
  received_by: string;
  grn_lines: GRNLineItem[];
};

type GRNLineItem = {
  lpo_mr_line_id: number;
  received_quantity: string;
  packaging_condition: "good" | "bad" | null;
  notes: string;
};

type QCStatus = "pending" | "passed" | "failed" | null;

const checkpoints = [
  "Item matches purchase specifications",
  "Quantity matches GRN",
  "Dimensions as per approved drawings",
  "Material grade confirmed",
  "Visual inspection - no damage",
  "Finishing quality acceptable",
  "No corrosion / scratches",
  "Color matches approved sample",
  "Assembly/Functional test",
  "Correct labeling / barcode",
  "Proper packaging",
  "Safety compliance",
];

export default function QCCheckListButton({
  mrHeader,
  progressID,
  item,
}: QCCheckListButtonProps) {
  const router = useRouter();
  const { userInfo } = useAuth();

  const pencilIcon = "/icons/pencil.svg";

  const [isOpen, setIsOpen] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [qcStatus, setQcStatus] = useState<QCStatus>("pending");
  const [existingQcId, setExistingQcId] = useState<number | null>(null);

  const [existingLpoId, setExistingLpoId] = useState<number | null>(null);
  const [lpo, setLpo] = useState<LPO | null>(null);
  const [existingGrn, setExistingGrn] = useState<GRN | null>(null);
  const [receivedQuantity, setReceivedQuantity] = useState<string>("");
  const [lpoMrLineId, setLpoMrLineId] = useState<number | null>(null);

  const [checkpointData, setCheckpointData] = useState<{
    [key: number]: CheckpointData;
  }>({});

  const [acceptedQty, setAcceptedQty] = useState<string>("");
  const [qcStatusSelection, setQcStatusSelection] = useState<
    "passed" | "failed" | null
  >(null);

  const [failureReasons, setFailureReasons] = useState({
    physicalDamage: "",
    wrongSpecification: "",
    quantityPackagingIssues: "",
    functionalFailure: "",
    qualityIssues: "",
    complianceCertification: "",
  });

  useEffect(() => {
    const initialData: { [key: number]: CheckpointData } = {};
    checkpoints.forEach((_, index) => {
      initialData[index] = {
        response: null,
        notes: "",
        attachments: [],
      };
    });
    setCheckpointData(initialData);
  }, []);

  // Fetch LPO when component mounts
  useEffect(() => {
    if (item?.approved_supplier_id) {
      checkExistingLpo();
    }
  }, [item, mrHeader.id]);

  // Check if QC already exists
  useEffect(() => {
    if (lpoMrLineId) {
      checkExistingQc();
    }
  }, [lpoMrLineId]);

  async function checkExistingQc() {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/qc/getQCByLPOMrLineID`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lpo_mr_line_id: lpoMrLineId,
          }),
        }
      );
      const data = await res.json();

      if (data.success && data.data) {
        setExistingQcId(data.data.id);
        setQcStatus(data.data.qc_status);
        setAcceptedQty(data.data.accepted_quantity?.toString() || "");
      } else {
        setQcStatus("pending");
      }
    } catch (error) {
      console.error("Error checking for existing QC:", error);
    }
  }

  // Load existing QC data into form when editing
  async function loadExistingQcData() {
    if (!lpoMrLineId) {
      console.log("No lpoMrLineId available");
      return;
    }

    setIsLoadingData(true);

    try {
      console.log("Loading QC data for lpoMrLineId:", lpoMrLineId);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/qc/getQCByLPOMrLineID`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lpo_mr_line_id: lpoMrLineId,
          }),
        }
      );
      const data = await res.json();

      console.log("QC data response:", data);

      if (data.success && data.data) {
        const qcData = data.data;

        // Load basic data
        setAcceptedQty(qcData.accepted_quantity?.toString() || "");
        setQcStatusSelection(qcData.qc_status);

        // Load failure reasons if failed
        if (qcData.qc_status === "failed") {
          setFailureReasons({
            physicalDamage: qcData.physical_damage || "",
            wrongSpecification: qcData.wrong_specification || "",
            quantityPackagingIssues: qcData.quantity_packaging_issues || "",
            functionalFailure: qcData.functional_failure || "",
            qualityIssues: qcData.quality_issues || "",
            complianceCertification: qcData.compliance_certification || "",
          });
        }

        // Load checkpoint data
        if (qcData.checkpoints && qcData.checkpoints.length > 0) {
          const loadedCheckpoints: { [key: number]: CheckpointData } = {};

          qcData.checkpoints.forEach((cp: any) => {
            const index = cp.checkpoint_number - 1;
            loadedCheckpoints[index] = {
              response: cp.response,
              notes: cp.notes || "",
              attachments: [],
            };
          });

          setCheckpointData(loadedCheckpoints);
        }
      } else {
        console.error("Failed to load QC data:", data.message);
        toast("Failed to load existing QC data", "error");
      }
    } catch (error) {
      console.error("Error loading existing QC data:", error);
      toast("Error loading existing QC data", "error");
    } finally {
      setIsLoadingData(false);
    }
  }

  // Handle edit button click - open modal first, then load data
  const handleEditClick = () => {
    console.log("Edit button clicked!");
    console.log("Current isOpen state:", isOpen);
    console.log("Setting isOpen to true...");
    setIsOpen(true);
    console.log("Calling loadExistingQcData...");
    loadExistingQcData();
  };

  async function checkExistingLpo() {
    try {
      const supplierId = item?.approved_supplier_id;

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
        setLpo(lpoData);
      } else {
        setExistingLpoId(null);
      }
    } catch (error) {
      console.error("Error checking for existing LPO:", error);
    }
  }

  // Fetch GRN when LPO is found
  useEffect(() => {
    async function fetchGrn() {
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
        } else {
          setExistingGrn(null);
        }
      } catch (error) {
        console.error("Error fetching GRN:", error);
      }
    }

    fetchGrn();
  }, [existingLpoId]);

  useEffect(() => {
    async function fetchLpoDetails() {
      if (!existingLpoId || !existingGrn) return;

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

        if (data.success && data.data && data.data.lpo_mr_lines) {
          // Find the LPO line that matches this item's MR line
          const lpoLine = data.data.lpo_mr_lines.find(
            (line: any) => line.mr_line_id === item.id
          );

          if (lpoLine) {
            // Store the lpo_mr_line_id for later use
            setLpoMrLineId(lpoLine.id);

            if (existingGrn.grn_lines) {
              // Find the GRN line that matches this LPO line
              const grnLine = existingGrn.grn_lines.find(
                (gl: any) => gl.lpo_mr_line_id === lpoLine.id
              );

              if (grnLine) {
                setReceivedQuantity(
                  grnLine.received_quantity?.toString() || "0"
                );
              }
            }
          }
        }
      } catch (error) {
        console.error("Error fetching LPO details:", error);
      }
    }

    fetchLpoDetails();
  }, [existingLpoId, existingGrn, item.id]);

  const handleResponseChange = (
    index: number,
    response: CheckpointResponse
  ) => {
    setCheckpointData((prev) => ({
      ...prev,
      [index]: {
        ...prev[index],
        response: prev[index]?.response === response ? null : response,
      },
    }));
  };

  const handleNotesChange = (index: number, notes: string) => {
    setCheckpointData((prev) => ({
      ...prev,
      [index]: {
        ...prev[index],
        notes,
      },
    }));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validate that we have the required IDs
    if (!lpoMrLineId || !existingLpoId) {
      toast("Unable to submit: Missing LPO information", "error");
      return;
    }

    // Validate that all checkpoints have been answered
    const unansweredCheckpoints = checkpoints.filter(
      (_, index) => !checkpointData[index]?.response
    );

    if (unansweredCheckpoints.length > 0) {
      toast("Please answer all checkpoints before submitting", "error");
      return;
    }

    // Validate accepted quantity
    if (!acceptedQty || acceptedQty === "0") {
      toast("Please enter accepted quantity", "error");
      return;
    }

    // Validate QC status
    if (!qcStatusSelection) {
      toast("Please select QC status (Passed or Failed)", "error");
      return;
    }

    try {
      // Determine if this is create or update
      const isUpdate = existingQcId !== null;

      // Prepare the data to send to the API
      const qcData = {
        action: isUpdate ? "updateQC" : "createQC",
        ...(isUpdate && { qc_id: existingQcId }),
        lpo_mr_line_id: lpoMrLineId,
        lpo_id: existingLpoId,
        checked_by: userInfo?.name || "",
        accepted_quantity: acceptedQty,
        qc_status: qcStatusSelection,
        checkpoints: checkpointData,
        ...(qcStatusSelection === "failed" && {
          failure_reasons: failureReasons,
        }),
      };

      // Send data to API
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/qc`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(qcData),
        }
      );

      const result = await response.json();

      if (result.success) {
        toast(
          isUpdate
            ? "Quality control checklist updated"
            : "Quality control checklist created",
          "success"
        );
        setIsOpen(false);
        setQcStatus(qcStatusSelection);
        router.refresh();
      } else {
        toast(
          result.message || "Failed to create quality control checklist",
          "error"
        );
      }
    } catch (error) {
      console.error("Error submitting QC checklist:", error);
      toast(
        "An error occurred while creating a quality control checklist",
        "error"
      );
    }
  }

  // If QC status is passed
  if (qcStatus === "passed") {
    console.log("Rendering QC PASS pill");
    return (
      <>
        <div
          className="approval-pill"
          style={{
            backgroundColor: "rgba(34, 150, 100, 1)",
            color: "white",
          }}
        >
          <span>QC PASS</span>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <img
              src={pencilIcon}
              alt="edit"
              style={{
                filter: "invert(1)",
                cursor: "pointer",
              }}
              onClick={() => {
                handleEditClick();
              }}
            />
          </div>
        </div>

        {console.log("Render check - isOpen:", isOpen)}
        {isOpen && (
          <FormPopUp
            header="QUALITY CONTROL CHECKLIST"
            setIsOpen={setIsOpen}
            handleSubmit={handleSubmit}
            addButtonLabel={"CONFIRM"}
          >
            <div className="input-row three-col">
              <InputItem
                label={"ORDERED QUANTITY"}
                value={item.quantity}
                type={"text"}
                placeholder={""}
                required
                disabled
                onChange={() => {}}
              />
              <InputItem
                label={"RECEIVED QUANTITY"}
                value={receivedQuantity}
                type={"text"}
                placeholder={""}
                required
                disabled
                onChange={() => {}}
              />
              <InputItem
                label={"CHECKED BY"}
                value={userInfo?.name || ""}
                type={"text"}
                placeholder={""}
                required
                disabled
                onChange={() => {}}
              />
            </div>

            <br />

            <table className="items-table alt">
              <thead>
                <tr>
                  <th>#</th>
                  <th>CHECKPOINT</th>
                  <th>YES</th>
                  <th>NO</th>
                  <th>N/A</th>
                  <th style={{ minWidth: "500px" }}>NOTES</th>
                  <th>ATTACHMENT(S)</th>
                </tr>
              </thead>
              <tbody>
                {checkpoints.map((checkpoint, index) => (
                  <tr key={index}>
                    <td style={{ textAlign: "center" }}>{index + 1}</td>
                    <td>{checkpoint}</td>
                    <td style={{ textAlign: "center" }}>
                      <div
                        onClick={() => handleResponseChange(index, "yes")}
                        style={{
                          width: "24px",
                          height: "24px",
                          borderRadius: "5px",
                          border:
                            checkpointData[index]?.response === "yes"
                              ? "none"
                              : "2px solid #d1d5db",
                          backgroundColor:
                            checkpointData[index]?.response === "yes"
                              ? "#10b981"
                              : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          margin: "0 auto",
                        }}
                      >
                        {checkpointData[index]?.response === "yes" && (
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 20 20"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M16.6667 5L7.50004 14.1667L3.33337 10"
                              stroke="white"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <div
                        onClick={() => handleResponseChange(index, "no")}
                        style={{
                          width: "24px",
                          height: "24px",
                          borderRadius: "5px",
                          border:
                            checkpointData[index]?.response === "no"
                              ? "none"
                              : "2px solid #d1d5db",
                          backgroundColor:
                            checkpointData[index]?.response === "no"
                              ? "#ef4444"
                              : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          margin: "0 auto",
                        }}
                      >
                        {checkpointData[index]?.response === "no" && (
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 20 20"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M15 5L5 15M5 5L15 15"
                              stroke="white"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <div
                        onClick={() => handleResponseChange(index, "na")}
                        style={{
                          width: "24px",
                          height: "24px",
                          borderRadius: "5px",
                          border:
                            checkpointData[index]?.response === "na"
                              ? "none"
                              : "2px solid #d1d5db",
                          backgroundColor:
                            checkpointData[index]?.response === "na"
                              ? "#6b7280"
                              : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          margin: "0 auto",
                        }}
                      >
                        {checkpointData[index]?.response === "na" && (
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 20 20"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M5 10H15"
                              stroke="white"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>
                    </td>
                    <td>
                      <InputItem
                        label={""}
                        value={checkpointData[index]?.notes || ""}
                        type={"text"}
                        placeholder={"ENTER NOTES"}
                        required={false}
                        onChange={(e) =>
                          handleNotesChange(index, e.target.value)
                        }
                      />
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {/* Attachment functionality commented out as in original */}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <br />
            <br />

            <div className="input-row three-col">
              <InputItem
                label={"ACCEPTED QUANTITY"}
                value={acceptedQty}
                type={"text"}
                placeholder={"ENTER ACCEPTED QUANTITY"}
                required
                onChange={(e) => setAcceptedQty(e.target.value)}
              />
              <div
                style={{ display: "flex", alignItems: "center", gap: "25px" }}
              >
                <label>QC STATUS</label>

                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="qc-status"
                    checked={qcStatusSelection === "passed"}
                    onChange={() => setQcStatusSelection("passed")}
                    style={{
                      width: "24px",
                      height: "24px",
                      cursor: "pointer",
                    }}
                  />
                  <span>PASSED QC</span>
                </label>

                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="qc-status"
                    checked={qcStatusSelection === "failed"}
                    onChange={() => setQcStatusSelection("failed")}
                    style={{
                      width: "24px",
                      height: "24px",
                      cursor: "pointer",
                    }}
                  />
                  <span>FAILED QC</span>
                </label>
              </div>
            </div>

            {qcStatusSelection === "failed" && (
              <>
                <div className="input-row three-col">
                  <InputItem
                    label={"PHYSICAL DAMAGE"}
                    value={failureReasons.physicalDamage}
                    type={"select"}
                    placeholder={"SELECT CONDITION"}
                    required={false}
                    onChange={(e) =>
                      setFailureReasons({
                        ...failureReasons,
                        physicalDamage: e.target.value,
                      })
                    }
                    selectOptions={[
                      "Scratches",
                      "Cracks",
                      "Breakage",
                      "Denting",
                      "Water damage",
                      "Warped/bent",
                    ]}
                  />

                  <InputItem
                    label={"WRONG SPECIFICATION"}
                    value={failureReasons.wrongSpecification}
                    type={"select"}
                    placeholder={"SELECT CONDITION"}
                    required={false}
                    onChange={(e) =>
                      setFailureReasons({
                        ...failureReasons,
                        wrongSpecification: e.target.value,
                      })
                    }
                    selectOptions={[
                      "Wrong size/dimensions",
                      "Wrong material grade",
                      "Wrong finish/color",
                      "Wrong model/variant",
                      "Wrong technical spec",
                      "Does not match approved drawing",
                    ]}
                  />

                  <InputItem
                    label={"QUANTITY/PACKAGING ISSUES SHORTAGE"}
                    type={"select"}
                    placeholder={"SELECT CONDITION"}
                    required={false}
                    value={failureReasons.quantityPackagingIssues}
                    onChange={(e) =>
                      setFailureReasons({
                        ...failureReasons,
                        quantityPackagingIssues: e.target.value,
                      })
                    }
                    selectOptions={[
                      "Shortage",
                      "Excess (over-supply)",
                      "Damaged packaging",
                      "Missing accessories/hardware",
                      "Incorrect labeling/barcode",
                    ]}
                  />
                </div>

                <div className="input-row three-col">
                  <InputItem
                    label={"FUNCTIONAL FAILURE"}
                    value={failureReasons.functionalFailure}
                    type={"select"}
                    placeholder={"SELECT CONDITION"}
                    required={false}
                    onChange={(e) =>
                      setFailureReasons({
                        ...failureReasons,
                        functionalFailure: e.target.value,
                      })
                    }
                    selectOptions={[
                      "Mechanism not working",
                      "Loose joints",
                      "Motor not firing (for motors/automation)",
                      "Electronics malfunctioning",
                      "Not fitting during assembly test",
                    ]}
                  />

                  <InputItem
                    label={"QUALITY ISSUES"}
                    value={failureReasons.qualityIssues}
                    type={"select"}
                    placeholder={"SELECT CONDITION"}
                    required={false}
                    onChange={(e) =>
                      setFailureReasons({
                        ...failureReasons,
                        qualityIssues: e.target.value,
                      })
                    }
                    selectOptions={[
                      "Poor finishing",
                      "Uneven coating/painting",
                      "Rough edges",
                      "Poor craftsmanship",
                      "Inconsistent batch quality",
                    ]}
                  />

                  <InputItem
                    label={"COMPLIANCE & CERTIFICATION FAILURES"}
                    type={"select"}
                    placeholder={"SELECT CONDITION"}
                    required={false}
                    value={failureReasons.complianceCertification}
                    onChange={(e) =>
                      setFailureReasons({
                        ...failureReasons,
                        complianceCertification: e.target.value,
                      })
                    }
                    selectOptions={[
                      "Missing test certificates",
                      "Does not meet fire rating",
                      "Does not meet safety standards",
                      "Wrong country certification",
                    ]}
                  />
                </div>
              </>
            )}
          </FormPopUp>
        )}
      </>
    );
  }

  // If QC status is failed
  if (qcStatus === "failed") {
    console.log("Rendering QC FAILED pill");
    return (
      <>
        <div
          className="approval-pill"
          style={{
            backgroundColor: "rgba(185, 28, 28, 1)",
            color: "white",
          }}
        >
          <span>QC FAILED</span>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <img
              src={pencilIcon}
              alt="edit"
              style={{
                filter: "invert(1)",
                cursor: "pointer",
                width: "14px",
              }}
              onClick={() => {
                console.log("QC FAILED edit icon clicked!");
                handleEditClick();
              }}
            />
          </div>
        </div>

        {console.log("Render check - isOpen:", isOpen)}
        {isOpen && (
          <FormPopUp
            header="QUALITY CONTROL CHECKLIST"
            setIsOpen={setIsOpen}
            handleSubmit={handleSubmit}
            addButtonLabel={"CONFIRM"}
          >
            <div className="input-row three-col">
              <InputItem
                label={"ORDERED QUANTITY"}
                value={item.quantity}
                type={"text"}
                placeholder={""}
                required
                disabled
                onChange={() => {}}
              />
              <InputItem
                label={"RECEIVED QUANTITY"}
                value={receivedQuantity}
                type={"text"}
                placeholder={""}
                required
                disabled
                onChange={() => {}}
              />
              <InputItem
                label={"CHECKED BY"}
                value={userInfo?.name || ""}
                type={"text"}
                placeholder={""}
                required
                disabled
                onChange={() => {}}
              />
            </div>

            <br />

            <table className="items-table alt">
              <thead>
                <tr>
                  <th>#</th>
                  <th>CHECKPOINT</th>
                  <th>YES</th>
                  <th>NO</th>
                  <th>N/A</th>
                  <th style={{ minWidth: "500px" }}>NOTES</th>
                  <th>ATTACHMENT(S)</th>
                </tr>
              </thead>
              <tbody>
                {checkpoints.map((checkpoint, index) => (
                  <tr key={index}>
                    <td style={{ textAlign: "center" }}>{index + 1}</td>
                    <td>{checkpoint}</td>
                    <td style={{ textAlign: "center" }}>
                      <div
                        onClick={() => handleResponseChange(index, "yes")}
                        style={{
                          width: "24px",
                          height: "24px",
                          borderRadius: "5px",
                          border:
                            checkpointData[index]?.response === "yes"
                              ? "none"
                              : "2px solid #d1d5db",
                          backgroundColor:
                            checkpointData[index]?.response === "yes"
                              ? "#10b981"
                              : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          margin: "0 auto",
                        }}
                      >
                        {checkpointData[index]?.response === "yes" && (
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 20 20"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M16.6667 5L7.50004 14.1667L3.33337 10"
                              stroke="white"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <div
                        onClick={() => handleResponseChange(index, "no")}
                        style={{
                          width: "24px",
                          height: "24px",
                          borderRadius: "5px",
                          border:
                            checkpointData[index]?.response === "no"
                              ? "none"
                              : "2px solid #d1d5db",
                          backgroundColor:
                            checkpointData[index]?.response === "no"
                              ? "#ef4444"
                              : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          margin: "0 auto",
                        }}
                      >
                        {checkpointData[index]?.response === "no" && (
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 20 20"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M15 5L5 15M5 5L15 15"
                              stroke="white"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <div
                        onClick={() => handleResponseChange(index, "na")}
                        style={{
                          width: "24px",
                          height: "24px",
                          borderRadius: "5px",
                          border:
                            checkpointData[index]?.response === "na"
                              ? "none"
                              : "2px solid #d1d5db",
                          backgroundColor:
                            checkpointData[index]?.response === "na"
                              ? "#6b7280"
                              : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          margin: "0 auto",
                        }}
                      >
                        {checkpointData[index]?.response === "na" && (
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 20 20"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M5 10H15"
                              stroke="white"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>
                    </td>
                    <td>
                      <InputItem
                        label={""}
                        value={checkpointData[index]?.notes || ""}
                        type={"text"}
                        placeholder={"ENTER NOTES"}
                        required={false}
                        onChange={(e) =>
                          handleNotesChange(index, e.target.value)
                        }
                      />
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {/* Attachment functionality commented out as in original */}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <br />
            <br />

            <div className="input-row three-col">
              <InputItem
                label={"ACCEPTED QUANTITY"}
                value={acceptedQty}
                type={"text"}
                placeholder={"ENTER ACCEPTED QUANTITY"}
                required
                onChange={(e) => setAcceptedQty(e.target.value)}
              />
              <div
                style={{ display: "flex", alignItems: "center", gap: "25px" }}
              >
                <label>QC STATUS</label>

                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="qc-status"
                    checked={qcStatusSelection === "passed"}
                    onChange={() => setQcStatusSelection("passed")}
                    style={{
                      width: "24px",
                      height: "24px",
                      cursor: "pointer",
                    }}
                  />
                  <span>PASSED QC</span>
                </label>

                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="qc-status"
                    checked={qcStatusSelection === "failed"}
                    onChange={() => setQcStatusSelection("failed")}
                    style={{
                      width: "24px",
                      height: "24px",
                      cursor: "pointer",
                    }}
                  />
                  <span>FAILED QC</span>
                </label>
              </div>
            </div>

            {qcStatusSelection === "failed" && (
              <>
                <div className="input-row three-col">
                  <InputItem
                    label={"PHYSICAL DAMAGE"}
                    value={failureReasons.physicalDamage}
                    type={"select"}
                    placeholder={"SELECT CONDITION"}
                    required={false}
                    onChange={(e) =>
                      setFailureReasons({
                        ...failureReasons,
                        physicalDamage: e.target.value,
                      })
                    }
                    selectOptions={[
                      "Scratches",
                      "Cracks",
                      "Breakage",
                      "Denting",
                      "Water damage",
                      "Warped/bent",
                    ]}
                  />

                  <InputItem
                    label={"WRONG SPECIFICATION"}
                    value={failureReasons.wrongSpecification}
                    type={"select"}
                    placeholder={"SELECT CONDITION"}
                    required={false}
                    onChange={(e) =>
                      setFailureReasons({
                        ...failureReasons,
                        wrongSpecification: e.target.value,
                      })
                    }
                    selectOptions={[
                      "Wrong size/dimensions",
                      "Wrong material grade",
                      "Wrong finish/color",
                      "Wrong model/variant",
                      "Wrong technical spec",
                      "Does not match approved drawing",
                    ]}
                  />

                  <InputItem
                    label={"QUANTITY/PACKAGING ISSUES SHORTAGE"}
                    type={"select"}
                    placeholder={"SELECT CONDITION"}
                    required={false}
                    value={failureReasons.quantityPackagingIssues}
                    onChange={(e) =>
                      setFailureReasons({
                        ...failureReasons,
                        quantityPackagingIssues: e.target.value,
                      })
                    }
                    selectOptions={[
                      "Shortage",
                      "Excess (over-supply)",
                      "Damaged packaging",
                      "Missing accessories/hardware",
                      "Incorrect labeling/barcode",
                    ]}
                  />
                </div>

                <div className="input-row three-col">
                  <InputItem
                    label={"FUNCTIONAL FAILURE"}
                    value={failureReasons.functionalFailure}
                    type={"select"}
                    placeholder={"SELECT CONDITION"}
                    required={false}
                    onChange={(e) =>
                      setFailureReasons({
                        ...failureReasons,
                        functionalFailure: e.target.value,
                      })
                    }
                    selectOptions={[
                      "Mechanism not working",
                      "Loose joints",
                      "Motor not firing (for motors/automation)",
                      "Electronics malfunctioning",
                      "Not fitting during assembly test",
                    ]}
                  />

                  <InputItem
                    label={"QUALITY ISSUES"}
                    value={failureReasons.qualityIssues}
                    type={"select"}
                    placeholder={"SELECT CONDITION"}
                    required={false}
                    onChange={(e) =>
                      setFailureReasons({
                        ...failureReasons,
                        qualityIssues: e.target.value,
                      })
                    }
                    selectOptions={[
                      "Poor finishing",
                      "Uneven coating/painting",
                      "Rough edges",
                      "Poor craftsmanship",
                      "Inconsistent batch quality",
                    ]}
                  />

                  <InputItem
                    label={"COMPLIANCE & CERTIFICATION FAILURES"}
                    type={"select"}
                    placeholder={"SELECT CONDITION"}
                    required={false}
                    value={failureReasons.complianceCertification}
                    onChange={(e) =>
                      setFailureReasons({
                        ...failureReasons,
                        complianceCertification: e.target.value,
                      })
                    }
                    selectOptions={[
                      "Missing test certificates",
                      "Does not meet fire rating",
                      "Does not meet safety standards",
                      "Wrong country certification",
                    ]}
                  />
                </div>
              </>
            )}
          </FormPopUp>
        )}
      </>
    );
  }

  // If pending, show the edit button
  return (
    <>
      <div style={{ display: "flex", gap: "10px", width: "200px" }}>
        <Button
          componentType={"button"}
          bgColor={"rgba(239, 239, 239, 1)"}
          borderColor={"rgba(207, 207, 207, 1)"}
          textColor={"black"}
          onClick={() => setIsOpen(true)}
          style={{ borderRadius: "5px", padding: "7px 7px" }}
        >
          <img src={pencilIcon} alt="pencil" />
        </Button>
      </div>

      {console.log("Render check - isOpen:", isOpen)}
      {isOpen && (
        <FormPopUp
          header="QUALITY CONTROL CHECKLIST"
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"CONFIRM"}
        >
          <div className="input-row three-col">
            <InputItem
              label={"ORDERED QUANTITY"}
              value={item.quantity}
              type={"text"}
              placeholder={""}
              required
              disabled
              onChange={() => {}}
            />
            <InputItem
              label={"RECEIVED QUANTITY"}
              value={receivedQuantity}
              type={"text"}
              placeholder={""}
              required
              disabled
              onChange={() => {}}
            />
            <InputItem
              label={"CHECKED BY"}
              value={userInfo?.name || ""}
              type={"text"}
              placeholder={""}
              required
              disabled
              onChange={() => {}}
            />
          </div>

          <br />

          <table className="items-table alt">
            <thead>
              <tr>
                <th>#</th>
                <th>CHECKPOINT</th>
                <th>YES</th>
                <th>NO</th>
                <th>N/A</th>
                <th style={{ minWidth: "500px" }}>NOTES</th>
                <th>ATTACHMENT(S)</th>
              </tr>
            </thead>
            <tbody>
              {checkpoints.map((checkpoint, index) => (
                <tr key={index}>
                  <td style={{ textAlign: "center" }}>{index + 1}</td>
                  <td>{checkpoint}</td>
                  <td style={{ textAlign: "center" }}>
                    <div
                      onClick={() => handleResponseChange(index, "yes")}
                      style={{
                        width: "24px",
                        height: "24px",
                        borderRadius: "5px",
                        border:
                          checkpointData[index]?.response === "yes"
                            ? "none"
                            : "2px solid #d1d5db",
                        backgroundColor:
                          checkpointData[index]?.response === "yes"
                            ? "#10b981"
                            : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        margin: "0 auto",
                      }}
                    >
                      {checkpointData[index]?.response === "yes" && (
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 20 20"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M16.6667 5L7.50004 14.1667L3.33337 10"
                            stroke="white"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </div>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <div
                      onClick={() => handleResponseChange(index, "no")}
                      style={{
                        width: "24px",
                        height: "24px",
                        borderRadius: "5px",
                        border:
                          checkpointData[index]?.response === "no"
                            ? "none"
                            : "2px solid #d1d5db",
                        backgroundColor:
                          checkpointData[index]?.response === "no"
                            ? "#ef4444"
                            : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        margin: "0 auto",
                      }}
                    >
                      {checkpointData[index]?.response === "no" && (
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 20 20"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M15 5L5 15M5 5L15 15"
                            stroke="white"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </div>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <div
                      onClick={() => handleResponseChange(index, "na")}
                      style={{
                        width: "24px",
                        height: "24px",
                        borderRadius: "5px",
                        border:
                          checkpointData[index]?.response === "na"
                            ? "none"
                            : "2px solid #d1d5db",
                        backgroundColor:
                          checkpointData[index]?.response === "na"
                            ? "#6b7280"
                            : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        margin: "0 auto",
                      }}
                    >
                      {checkpointData[index]?.response === "na" && (
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 20 20"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M5 10H15"
                            stroke="white"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </div>
                  </td>
                  <td>
                    <InputItem
                      label={""}
                      value={checkpointData[index]?.notes || ""}
                      type={"text"}
                      placeholder={"ENTER NOTES"}
                      required={false}
                      onChange={(e) => handleNotesChange(index, e.target.value)}
                    />
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {/* Attachment functionality commented out as in original */}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <br />
          <br />

          <div className="input-row three-col">
            <InputItem
              label={"ACCEPTED QUANTITY"}
              value={acceptedQty}
              type={"text"}
              placeholder={"ENTER ACCEPTED QUANTITY"}
              required
              onChange={(e) => setAcceptedQty(e.target.value)}
            />
            <div style={{ display: "flex", alignItems: "center", gap: "25px" }}>
              <label>QC STATUS</label>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="qc-status"
                  checked={qcStatusSelection === "passed"}
                  onChange={() => setQcStatusSelection("passed")}
                  style={{
                    width: "24px",
                    height: "24px",
                    cursor: "pointer",
                  }}
                />
                <span>PASSED QC</span>
              </label>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="qc-status"
                  checked={qcStatusSelection === "failed"}
                  onChange={() => setQcStatusSelection("failed")}
                  style={{
                    width: "24px",
                    height: "24px",
                    cursor: "pointer",
                  }}
                />
                <span>FAILED QC</span>
              </label>
            </div>
          </div>

          {qcStatusSelection === "failed" && (
            <>
              <div className="input-row three-col">
                <InputItem
                  label={"PHYSICAL DAMAGE"}
                  value={failureReasons.physicalDamage}
                  type={"select"}
                  placeholder={"SELECT CONDITION"}
                  required={false}
                  onChange={(e) =>
                    setFailureReasons({
                      ...failureReasons,
                      physicalDamage: e.target.value,
                    })
                  }
                  selectOptions={[
                    "Scratches",
                    "Cracks",
                    "Breakage",
                    "Denting",
                    "Water damage",
                    "Warped/bent",
                  ]}
                />

                <InputItem
                  label={"WRONG SPECIFICATION"}
                  value={failureReasons.wrongSpecification}
                  type={"select"}
                  placeholder={"SELECT CONDITION"}
                  required={false}
                  onChange={(e) =>
                    setFailureReasons({
                      ...failureReasons,
                      wrongSpecification: e.target.value,
                    })
                  }
                  selectOptions={[
                    "Wrong size/dimensions",
                    "Wrong material grade",
                    "Wrong finish/color",
                    "Wrong model/variant",
                    "Wrong technical spec",
                    "Does not match approved drawing",
                  ]}
                />

                <InputItem
                  label={"QUANTITY/PACKAGING ISSUES SHORTAGE"}
                  type={"select"}
                  placeholder={"SELECT CONDITION"}
                  required={false}
                  value={failureReasons.quantityPackagingIssues}
                  onChange={(e) =>
                    setFailureReasons({
                      ...failureReasons,
                      quantityPackagingIssues: e.target.value,
                    })
                  }
                  selectOptions={[
                    "Shortage",
                    "Excess (over-supply)",
                    "Damaged packaging",
                    "Missing accessories/hardware",
                    "Incorrect labeling/barcode",
                  ]}
                />
              </div>

              <div className="input-row three-col">
                <InputItem
                  label={"FUNCTIONAL FAILURE"}
                  value={failureReasons.functionalFailure}
                  type={"select"}
                  placeholder={"SELECT CONDITION"}
                  required={false}
                  onChange={(e) =>
                    setFailureReasons({
                      ...failureReasons,
                      functionalFailure: e.target.value,
                    })
                  }
                  selectOptions={[
                    "Mechanism not working",
                    "Loose joints",
                    "Motor not firing (for motors/automation)",
                    "Electronics malfunctioning",
                    "Not fitting during assembly test",
                  ]}
                />

                <InputItem
                  label={"QUALITY ISSUES"}
                  value={failureReasons.qualityIssues}
                  type={"select"}
                  placeholder={"SELECT CONDITION"}
                  required={false}
                  onChange={(e) =>
                    setFailureReasons({
                      ...failureReasons,
                      qualityIssues: e.target.value,
                    })
                  }
                  selectOptions={[
                    "Poor finishing",
                    "Uneven coating/painting",
                    "Rough edges",
                    "Poor craftsmanship",
                    "Inconsistent batch quality",
                  ]}
                />

                <InputItem
                  label={"COMPLIANCE & CERTIFICATION FAILURES"}
                  type={"select"}
                  placeholder={"SELECT CONDITION"}
                  required={false}
                  value={failureReasons.complianceCertification}
                  onChange={(e) =>
                    setFailureReasons({
                      ...failureReasons,
                      complianceCertification: e.target.value,
                    })
                  }
                  selectOptions={[
                    "Missing test certificates",
                    "Does not meet fire rating",
                    "Does not meet safety standards",
                    "Wrong country certification",
                  ]}
                />
              </div>
            </>
          )}
        </FormPopUp>
      )}
    </>
  );
}
