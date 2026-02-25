"use client";

import { useState, useEffect } from "react";
import FormPopUp from "@/app/components/FormPopup";
import Button from "@/app/components/Button";
import { useRouter } from "next/navigation";
import { toast } from "@/app/components/Toast";
import { useAuth } from "@/app/context/AuthContext";
import { MrHeader } from "../types/mrHeader";
import InputItem from "@/app/components/InputItem";

type CancelMaterialRequestButtonProps = {
  mrHeader: MrHeader;
  currentProgressId: number;
  lpoId?: number;
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
  children?: React.ReactNode;
};

export default function CancelMaterialRequestButton({
  mrHeader,
  currentProgressId,
  lpoId,
  bgColor = "rgba(239, 239, 239, 1)",
  textColor = "black",
  borderColor = "rgba(239, 239, 239, 1)",
  children,
}: CancelMaterialRequestButtonProps) {
  const router = useRouter();

  const { userInfo } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState<number | null>(null);
  const [availableStages, setAvailableStages] = useState<
    { id: number; name: string; department: string; departmentId: number }[]
  >([]);

  const [reason, setReason] = useState("");

  const warningIcon = "/icons/warning.svg";

  // All progress stages with their names
  const allProgressStages: { [key: number]: string } = {
    1: "Draft",
    2: "QS Check",
    3: "Manager Approval",
    7: "Quotations",
    9: "QS Price Check",
    10: "Manager Price Approval",
    12: "LPO & Invoice",
    14: "Pending Payments",
    17: "Awaiting Delivery",
    24: "Stock Entry",
  };

  // Map progress_id to responsible department
  const progressToResponsibleDepartment: { [key: number]: number } = {
    1: 0,
    2: 16, // Awaiting QS initial approval → QS
    3: 8, // Awaiting manager initial approval → Management
    7: 9, // Awaiting quotations → Procurement
    9: 16, // Awaiting QS price approval → QS
    10: 8, // Awaiting manager price approval → Management
    12: 9, // Awaiting LPO & invoice → Procurement
    14: 10, // Pending payment → Finance
    17: 11, // Pending delivery → Storekeeper
    24: 11, // Awaiting stock entry → Storekeeper
  };

  // Department names
  const departmentNames: { [key: number]: string } = {
    8: "Management",
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

  // Progress flow order (MR-level before segregation)
  const mrProgressFlow = [1, 2, 3, 7, 9, 10, 12];
  // LPO-level progress flow (after segregation)
  const lpoProgressFlow = [12, 14, 17, 24];
  // Combined flow for non-LPO contexts
  const fullProgressFlow = [1, 2, 3, 7, 9, 10, 12, 14, 17, 24];

  useEffect(() => {
    const userDeptId = userInfo?.departmentID;

    // Use LPO flow if lpoId is present, otherwise full flow
    const progressFlow = lpoId ? lpoProgressFlow : fullProgressFlow;

    // Find the current progress index
    const currentIndex = progressFlow.indexOf(currentProgressId);

    if (currentIndex === -1) {
      setAvailableStages([]);
      return;
    }

    // Get all previous stages based on user's department
    let stagesToShow: number[];

    if (userDeptId === 8 || userDeptId === 9) {
      // Management (8) and Procurement (9) can rollback to ANY previous stage
      stagesToShow = progressFlow.slice(0, currentIndex);
    } else {
      // All other departments can only rollback to the first stage in flow
      const firstStage = progressFlow[0];
      stagesToShow = progressFlow
        .slice(0, currentIndex)
        .filter((id) => id === firstStage);
    }

    const previousStages = stagesToShow.map((id) => {
      const departmentId = progressToResponsibleDepartment[id] || 0;
      return {
        id,
        name: allProgressStages[id],
        department: departmentNames[departmentId] || "",
        departmentId,
      };
    });

    setAvailableStages(previousStages);
  }, [currentProgressId, userInfo, lpoId]);

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
      toast("Material request rolled back", "success");
      setIsOpen(false);
      router.refresh();
      router.replace(`/mr`);
    } else {
      toast("Failed to roll back material request", "error");
    }
  }

  if (userInfo?.departmentID === 8 || userInfo?.departmentID === 9) {
    return (
      <>
        <Button
          componentType="button"
          bgColor={bgColor}
          borderColor={borderColor}
          textColor={textColor}
          onClick={handleOpen}
          style={{ padding: "7px 20px" }}
        >
          {children}
        </Button>

        {isOpen && (
          <FormPopUp
            header={"ROLL BACK MATERIAL REQUEST"}
            setIsOpen={setIsOpen}
            handleSubmit={handleSubmit}
            addButtonLabel={"CONFIRM"}
            style={{ width: "600px" }}
          >
            {/* Roll Back To Stage Section */}
            <div>
              {availableStages.length === 0 ? (
                <div>
                  <p style={{ color: "rgba(107, 114, 128, 1)", margin: 0 }}>
                    No previous stages available for rollback.
                  </p>
                </div>
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
  } else {
    return null;
  }
}
