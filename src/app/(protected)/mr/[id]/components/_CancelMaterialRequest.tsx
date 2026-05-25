"use client";

import { useState, useEffect } from "react";
import FormPopUp from "@/app/components/FormPopup";
import Button from "@/app/components/Button";
import { useRouter } from "next/navigation";
import { toast } from "@/app/components/Toast";
import { useAuth } from "@/app/context/AuthContext";
import { MrHeader } from "../types/mrHeader";
import InputItem from "@/app/components/InputItem";
import { useRefresh } from "@/app/context/RefreshContext";

type CancelMaterialRequestButtonProps = {
  mrHeader: MrHeader;
  currentProgressId: number;
  lpoId?: number;
  type?: "material" | "job" | "payment";
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
  children?: React.ReactNode;
};

export default function CancelMaterialRequestButton({
  mrHeader,
  currentProgressId,
  lpoId,
  type = "material",
  bgColor = "rgba(239, 239, 239, 1)",
  textColor = "black",
  borderColor = "rgba(239, 239, 239, 1)",
  children,
}: CancelMaterialRequestButtonProps) {
  const router = useRouter();
  const { refresh } = useRefresh();


  const { userInfo } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState<number | null>(null);
  const [availableStages, setAvailableStages] = useState<
    { id: number; name: string; department: string; departmentId: number }[]
  >([]);

  const [reason, setReason] = useState("");
  const [hasLpoPayments, setHasLpoPayments] = useState(false);

  const warningIcon = "/icons/warning.svg";

  // All progress stages with their names
  const allProgressStages: { [key: number]: string } = {
    1: "Draft",
    2: "QS Review",
    3: "Manager Approval", // Used by JOs and PRs (MRs skip this stage)
    7: "Quotations",
    9: "QS Price Check",
    10: "Manager Price Approval",
    12: "LPO & Invoice",
    // 14: "Pending Payments", // REMOVED — payment stage skipped, LPO & Invoice goes directly to Awaiting Delivery
    17: "Awaiting Delivery",
    24: "Stock Entry",
  };

  // Map progress_id to responsible department
  const progressToResponsibleDepartment: { [key: number]: number } = {
    1: 0,
    2: 16, // Awaiting QS initial approval → QS
    3: 8, // Awaiting manager initial approval → Management (JOs and PRs only)
    7: 9, // Awaiting quotations → Procurement
    9: 16, // Awaiting QS price approval → QS
    10: 8, // Awaiting manager price approval → Management
    12: 9, // Awaiting LPO & invoice → Procurement
    // 14: 10, // Pending payment → Finance — REMOVED (payment stage skipped)
    17: 11, // Pending delivery → Storekeeper
    24: 11, // Awaiting stock entry → Storekeeper
  };

  // Department names
  const departmentNames: { [key: number]: string } = {
    8: "Directors/Management",
    9: "Procurement",
    10: "Finance",
    11: "Storekeeper",
    16: "Quantity Surveyor",
  };

  // Get department style based on department ID
  const getDepartmentStyle = (departmentId: number) => {
    const styles: {
      [key: number]: { backgroundColor: string; color: string };
    } = {
      8: {
        backgroundColor: "rgba(205, 222, 255, 1)",
        color: "rgba(23, 92, 220, 1)",
      },
      9: {
        backgroundColor: "rgba(254, 215, 170, 1)",
        color: "rgba(185, 104, 10, 1)",
      },
      10: {
        backgroundColor: "rgba(187, 247, 208, 1)",
        color: "rgba(3, 130, 46, 1)",
      },
      11: {
        backgroundColor: "rgba(143, 236, 255, 1)",
        color: "rgba(21, 104, 120, 1)",
      },
      16: {
        backgroundColor: "rgba(255, 237, 213, 1)",
        color: "rgba(156, 87, 0, 1)",
      },
    };

    return (
      styles[departmentId] || {
        backgroundColor: "rgba(186, 230, 253, 1)",
        color: "rgba(0, 112, 170, 1)",
      }
    );
  };

  // MR flow: skips Manager Approval (3) entirely
  const mrProgressFlow = [1, 2, 7, 9, 10, 12];
  // LPO-level progress flow (after MR segregation) — payment stage (14) removed
  const lpoProgressFlow = [12, 17, 24];
  // Full MR flow for LPO context (no Manager Approval for MRs) — payment stage (14) removed
  const fullProgressFlow = [1, 2, 7, 9, 10, 12, 17, 24];
  // JO flow: Draft → Quotations → Price Approval → LPO & Invoice (Manager Approval not a rollback target)
  const joProgressFlow = [1, 7, 10, 12];
  // PR flow: Draft → QS Review → Manager Approval → Payment
  const prProgressFlow = [1, 2, 3, 14];

  // Maps rejected/failed progress_ids to the last valid stage before rejection
  // PRs go through Manager Approval (3); JOs and MRs do not use stage 3 as a rollback target.
  const rejectedToCutoff: { [key: number]: number } = {
    5: type === "payment" ? 3 : type === "job" ? 1 : 2, // Request Rejected → back to last valid stage
    11: 10, // Price Approval Rejected → roll back up to Manager Price Approval
    13: 12, // Payment Rejected → roll back up to LPO & Invoice
    16: 17, // GRN Failed → roll back up to Awaiting Delivery or LPO & Invoice
  };

  useEffect(() => {
    const progressFlow =
      type === "job"
        ? joProgressFlow
        : type === "payment"
          ? prProgressFlow
          : fullProgressFlow;

    const cutoff = rejectedToCutoff[currentProgressId];

    let stagesToShow: number[];

    if (cutoff !== undefined) {
      // Filter using the type-specific flow so stage 3 appears for JOs/PRs
      stagesToShow = progressFlow.filter((id) => id <= cutoff);
    } else {
      const currentIndex = progressFlow.indexOf(currentProgressId);
      if (currentIndex === -1) {
        setAvailableStages([]);
        return;
      }
      stagesToShow = progressFlow.slice(0, currentIndex);
    }

    const previousStages = stagesToShow
      .filter((id) => id !== 9 && id !== 24) // Hide QS Price Check and Stock Entry from rollback options
      .map((id) => {
        const departmentId = progressToResponsibleDepartment[id] || 0;
        return {
          id,
          name: allProgressStages[id],
          department: departmentNames[departmentId] || "",
          departmentId,
        };
      });

    setAvailableStages(previousStages);

    // Check if this LPO already has payment records — if so, disable rollback
    if (lpoId) {
      fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/payment/getLpoPaymentCount`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lpo_id: lpoId }),
      })
        .then((r) => r.json())
        .then((data) => setHasLpoPayments(Number(data.count ?? 0) > 0))
        .catch(() => setHasLpoPayments(false));
    } else {
      setHasLpoPayments(false);
    }
  }, [currentProgressId, lpoId, type]);

  const handleOpen = () => {
    setSelectedStage(null);
    setIsOpen(true);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedStage) {
      toast("Please select a stage to roll back to", "error");
      return;
    }

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "cancelMaterialRequest",
        id: mrHeader.id,
        lpo_id: lpoId || null,
        rollback_progress_id: selectedStage,
        rollback_progress_name: allProgressStages[selectedStage],
        department_id: mrHeader.department_id,
        current_progress_id: currentProgressId,
        changed_by: userInfo?.name,
        rollback_reason: reason,
      }),
    });

    if (res.ok) {
      toast(
        type === "job"
          ? "Job order rolled back"
          : "Material request rolled back",
        "success",
      );
      await refresh();
      setIsOpen(false);
      router.replace(`/mr`);
    } else {
      toast(
        type === "job"
          ? "Failed to roll back job order"
          : "Failed to roll back material request",
        "error",
      );
    }
  }

  if (
    userInfo?.departmentID !== 8 &&
    userInfo?.departmentID !== 9 &&
    userInfo?.departmentID !== 16 &&
    userInfo?.departmentID !== 10
  ) {
    return null;
  }

  return (
    <>
      <Button
        componentType="button"
        bgColor={hasLpoPayments ? "rgba(200,200,200,1)" : bgColor}
        borderColor={hasLpoPayments ? "rgba(200,200,200,1)" : borderColor}
        textColor={hasLpoPayments ? "rgba(150,150,150,1)" : textColor}
        onClick={hasLpoPayments ? undefined : handleOpen}
        disabled={hasLpoPayments}
        title={
          hasLpoPayments
            ? "Rollback disabled — this LPO already has payment records"
            : undefined
        }
        style={{ padding: "7px 20px", cursor: hasLpoPayments ? "not-allowed" : undefined }}
      >
        {children}
      </Button>

      {isOpen && (
        <FormPopUp
          header={
            type === "job"
              ? "ROLL BACK JOB ORDER"
              : "ROLL BACK MATERIAL REQUEST"
          }
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"CONFIRM"}
          style={{ width: "600px" }}
        >
          {/* Roll Back To Stage Section */}
          <div>
            {availableStages.length === 0 ? (
              <p style={{ color: "rgba(107, 114, 128, 1)", margin: 0 }}>
                No previous stages available for rollback.
              </p>
            ) : (
              <>
                <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                  {availableStages.map((stage) => {
                    const departmentStyle = getDepartmentStyle(
                      stage.departmentId,
                    );

                    return (
                      <div key={stage.id} style={{ marginBottom: "5px" }}>
                        <label
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "10px",
                            cursor: "pointer",
                            padding: "10px",
                            borderRadius: "10px",
                            backgroundColor:
                              selectedStage === stage.id
                                ? "rgba(168, 238, 208, 1)"
                                : "rgba(245, 240, 240, 1)",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "5px",
                              flex: 1,
                            }}
                          >
                            <input
                              type="radio"
                              name="rollbackStage"
                              value={stage.id}
                              checked={selectedStage === stage.id}
                              onChange={() => setSelectedStage(stage.id)}
                              style={{
                                width: "18px",
                                height: "18px",
                                cursor: "pointer",
                                accentColor: "black",
                                marginRight: "10px",
                                flexShrink: 0,
                              }}
                            />
                            <h4
                              style={{
                                margin: 0,
                                textTransform: "uppercase",
                                flex: 1,
                              }}
                            >
                              {stage.name}
                            </h4>
                          </div>

                          {stage.department && (
                            <small
                              style={{
                                backgroundColor:
                                  departmentStyle.backgroundColor,
                                color: departmentStyle.color,
                                textTransform: "uppercase",
                                padding: "5px 12px",
                                borderRadius: "50px",
                                fontSize: "10px",
                                fontWeight: "600",
                                whiteSpace: "nowrap",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                              }}
                            >
                              <span style={{ scale: 2.5 }}>•</span>
                              {stage.department}
                            </small>
                          )}
                        </label>
                      </div>
                    );
                  })}
                </div>

                <br />
                <br />

                <div className="input-row full">
                  <InputItem
                    label={"REASON"}
                    value={reason}
                    type={"textarea"}
                    onChange={(e) => setReason(e.target.value)}
                    required
                  />
                </div>

                <br />
                <br />

                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    alignItems: "center",
                  }}
                >
                  <img src={warningIcon} alt="warning" />
                  <p style={{ color: "red" }}>
                    This action cannot be undone and will update the current
                    workflow status.
                  </p>
                </div>
              </>
            )}
          </div>
        </FormPopUp>
      )}
    </>
  );
}
