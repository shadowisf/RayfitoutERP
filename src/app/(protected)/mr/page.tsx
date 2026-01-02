"use client";

import Button from "@/app/components/Button";
import { useAuth } from "@/app/context/AuthContext";
import { useEffect, useState } from "react";
import { MrHeader } from "./[id]/types/mrHeader";

export default function MR() {
  const { userInfo } = useAuth();

  const [mrHeaders, setMrHeaders] = useState<MrHeader[]>([]);
  const [filterRelevant, setFilterRelevant] = useState(false);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
      method: "GET",
    }).then((res) => res.json().then((data) => setMrHeaders(data)));
  }, [userInfo]);

  const departmentViewPermissions: { [key: number]: number[] } = {
    /* JOINERY */ 1: [1, 5, 25],
    /* MARKETING */ 2: [1, 5, 25],
    /* ALUMINUM & GLASS */ 3: [1, 5, 25],
    /* MEP */ 4: [1, 5, 25],
    /* CIVIL */ 5: [1, 5, 25],
    /* PAINT */ 6: [1, 5, 25],
    /* DESIGN */ 7: [1, 5, 25],
    /* DIRECTORS/MANAGEMENT */ 8: [1, 3, 5, 10, 11, 25],
    /* PROCUREMENT */ 9: [1, 5, 7, 11, 12, 13, 16, 25],
    /* FINANCE */ 10: [1, 5, 14, 25],
    /* STOREKEEPER */ 11: [1, 5, 17, 24, 25],
    /* QUALITY CONTORL */ 12: [1, 5, 21, 23, 25],
    /* PROJECTS */ 13: [1, 5, 25],
    /* AUTOMATION */ 14: [1, 5, 25],
    /* ADMIN */ 15: [1, 3, 5, 7, 10, 11, 12, 14, 17, 21, 23, 24, 25],
  };

  // Map progress IDs to status names
  const progressIdToStatusName: { [key: number]: string } = {
    1: "Draft",
    5: "Initial approval rejected",
    3: "Awaiting initial approval",
    11: "Price approval rejected",
    7: "Awaiting quotations",
    10: "Awaiting price approval",
    12: "Awaiting LPO & invoice",
    13: "Payment rejected",
    14: "Pending payment",
    16: "GRN failed",
    17: "Pending delivery",
    21: "Awaiting QC check",
    23: "Failed QC",
    24: "Awaiting stock entry",
    25: "Completed",
  };

  // Progress IDs that are accessible to everyone IF department matches
  const universalProgressIds = [1, 5]; // Draft and Awaiting initial approval

  // Function to check if user can view this MR
  const canViewMR = (mr: any) => {
    const userDeptId = userInfo?.departmentID;

    // If no user info, don't show view button
    if (!userDeptId) return false;

    // ALWAYS allow viewing if the MR belongs to the user's department
    if (userDeptId === mr.department_id) {
      return true;
    }

    // Check if this is a universal progress_id (1 or 5)
    if (universalProgressIds.includes(mr.progress_id)) {
      // For universal progress IDs, user's department must match MR's department
      return userDeptId === mr.department_id;
    }

    // Get allowed progress IDs for this department
    const allowedProgressIds = departmentViewPermissions[userDeptId];

    // If department is not in the permissions map, they can only view universal progress IDs
    if (!allowedProgressIds) return false;

    // Check if the MR's progress_id is in the allowed list
    return allowedProgressIds.includes(mr.progress_id);
  };

  // Get relevant statuses for current user
  const getRelevantStatuses = () => {
    const userDeptId = userInfo?.departmentID;
    if (!userDeptId) return [];

    const allowedProgressIds = departmentViewPermissions[userDeptId] || [];

    // Get status names from allowed progress IDs
    const relevantStatuses = allowedProgressIds
      .map((progressId) => progressIdToStatusName[progressId])
      .filter((status) => status !== undefined);

    // Return unique statuses
    return Array.from(new Set(relevantStatuses));
  };

  // Function to calculate priority based on required date
  const getPriority = (requiredDate: string) => {
    const required = new Date(requiredDate);
    const today = new Date();
    required.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil(
      (required.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays < 0) {
      return {
        label: "CRITICAL",
        backgroundColor: "rgba(175, 61, 61, 1)",
        color: "white",
      };
    } else if (diffDays <= 1) {
      return {
        label: "HIGH",
        backgroundColor: "rgba(255, 181, 181, 1)",
        color: "rgba(248, 77, 77, 1)",
      };
    } else if (diffDays <= 3) {
      return {
        label: "MEDIUM",
        backgroundColor: "rgba(255, 250, 189, 1)",
        color: "rgba(134, 83, 47, 1)",
      };
    } else {
      return {
        label: "LOW",
        backgroundColor: "rgba(87, 244, 176, 1)",
        color: "rgba(31, 101, 71, 1)",
      };
    }
  };

  // Function to get days left text
  const getDaysLeftText = (requiredDate: string) => {
    const required = new Date(requiredDate);
    const today = new Date();
    required.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil(
      (required.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays > 0) {
      return `${diffDays} ${diffDays === 1 ? "DAY" : "DAYS"} LEFT`;
    } else if (diffDays === 0) {
      return "DUE TODAY";
    } else {
      return `${Math.abs(diffDays)} ${
        Math.abs(diffDays) === 1 ? "DAY" : "DAYS"
      } OVERDUE`;
    }
  };

  // Function to get days left background style
  const getDaysLeftStyle = (requiredDate: string) => {
    const required = new Date(requiredDate);
    const today = new Date();
    required.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil(
      (required.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Overdue (negative days)
    if (diffDays < 0) {
      return {
        backgroundColor: "rgba(175, 61, 61, 1)",
        color: "white",
      };
    }
    // Due in 3 days or less (0-3 days)
    else if (diffDays <= 3) {
      return {
        backgroundColor: "rgba(255, 181, 181, 1)",
        color: "rgba(248, 77, 77, 1)",
      };
    }
    // More than 3 days
    else {
      return {
        backgroundColor: "rgba(255, 250, 189, 1)",
        color: "rgba(134, 83, 47, 1)",
      };
    }
  };

  // Function to check if status is rejected or failed
  const isRejectedStatus = (status: string) => {
    const rejectedStatuses = [
      "Initial approval rejected",
      "Price approval rejected",
      "Payment rejected",
      "GRN failed",
      "Failed QC",
    ];
    return rejectedStatuses.includes(status);
  };

  const getProgressStyle = (status: string) => {
    if (isRejectedStatus(status)) {
      return {
        backgroundColor: "rgba(255, 181, 181, 1)",
        color: "rgba(248, 77, 77, 1)",
      };
    }

    if (status === "Completed") {
      return {
        backgroundColor: "rgba(87, 244, 176, 1)",
        color: "rgba(31, 101, 71, 1)",
      };
    }

    return {
      backgroundColor: "rgba(255, 250, 189, 1)",
      color: "rgba(134, 83, 47, 1)",
    };
  };

  // Function to check if status is completed
  const isCompletedStatus = (status: string) => {
    return status === "Completed";
  };

  // Define ALL statuses in order
  const allStatuses = [
    "Draft",
    "Initial approval rejected",
    "Awaiting initial approval",
    "Awaiting quotations",
    "Price approval rejected",
    "Awaiting price approval",
    "Awaiting LPO & invoice",
    "Payment rejected",
    "Pending payment",
    "GRN failed",
    "Pending delivery",
    "Failed QC",
    "Awaiting QC check",
    "Awaiting stock entry",
    "Completed",
  ];

  // Filter MRs based on "most relevant to me" toggle
  const filteredMRs = filterRelevant
    ? mrHeaders.filter((mr) => canViewMR(mr))
    : mrHeaders;

  // Group MRs by status
  const groupedMRs = filteredMRs.reduce((acc: any, mr: any) => {
    const status = mr.progress_name || "Unknown";
    if (!acc[status]) {
      acc[status] = [];
    }
    acc[status].push(mr);
    return acc;
  }, {});

  // Determine which statuses to show
  const visibleStatuses = filterRelevant
    ? // When filter is active, show statuses that have items the user can view
      allStatuses.filter((status) => {
        const mrs = groupedMRs[status] || [];
        return mrs.length > 0;
      })
    : // When filter is inactive, show all statuses (hide rejected with 0 count)
      allStatuses.filter((status) => {
        const mrs = groupedMRs[status] || [];
        if (isRejectedStatus(status) && mrs.length === 0) {
          return false;
        }
        return true;
      });

  return (
    <div className="dashboard">
      <div
        style={{
          display: "flex",
          /* justifyContent: "space-between", */
          alignItems: "center",
          gap: "25px",
        }}
      >
        <h2>MATERIAL REQUESTS</h2>

        {/* Filter Toggle */}
        <div
          onClick={() => setFilterRelevant(!filterRelevant)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "20px",
            backgroundColor: "white",
            padding: "7px 20px",
            borderRadius: "5px",
            border: "1px solid rgba(217, 217, 217, 1)",
            cursor: "pointer",
            userSelect: "none",
          }}
        >
          <h4>SHOW RELATED CARDS</h4>

          {/* Toggle Switch */}
          <div
            style={{
              position: "relative",
              width: "30px",
              height: "17px",
              backgroundColor: filterRelevant
                ? "rgb(34, 197, 94)"
                : "rgba(200, 200, 200, 1)",
              borderRadius: "34px",
              transition: "background-color 0.3s ease",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "0px",
                left: filterRelevant ? "15px" : "0px",
                width: "17px",
                border: "1px solid rgba(217, 217, 217, 1)",
                height: "17px",
                backgroundColor: "white",
                borderRadius: "50%",
                /*                 transition: "left 0.3s ease", */
              }}
            />
          </div>
        </div>
      </div>

      <br />
      <br />
      <br />

      {/* Horizontal scrolling container for status groups */}
      <div
        style={{
          display: "flex",
          gap: "30px",
          overflowX: "auto",
          paddingBottom: "20px",
          minHeight: "80dvh",
        }}
      >
        {visibleStatuses.map((status) => {
          const mrs = groupedMRs[status] || [];
          const isRejected = isRejectedStatus(status);
          const isCompleted = isCompletedStatus(status);
          const hasItems = mrs.length > 0;

          return (
            <div
              key={status}
              style={{
                minWidth: "350px",
                flexShrink: 0,
              }}
            >
              {/* Status header with count */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "20px",
                  padding: "15px",
                  backgroundColor: "white",
                  borderRadius: "5px",
                }}
              >
                <h3 style={{ margin: 0 }}>{status.toUpperCase()}</h3>
                <span
                  style={{
                    backgroundColor: isRejected
                      ? "rgba(255, 181, 181, 1)"
                      : isCompleted && hasItems
                      ? "rgba(87, 244, 176, 1)"
                      : hasItems
                      ? "rgba(255, 250, 189, 1)"
                      : "rgba(231, 231, 231, 1)",
                    color: isRejected
                      ? "rgba(248, 77, 77, 1)"
                      : isCompleted && hasItems
                      ? "rgba(31, 101, 71, 1)"
                      : hasItems
                      ? "rgba(134, 83, 47, 1)"
                      : "rgba(100, 100, 100, 1)",
                    padding: "4px 12px",
                    borderRadius: "5px",
                    fontSize: "12px",
                    fontWeight: "600",
                  }}
                >
                  {mrs.length}
                </span>
              </div>

              {/* Vertical stack of cards */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "20px",
                }}
              >
                {mrs.map((mr: any) => {
                  const priority = getPriority(mr.required_date);
                  const daysLeftStyle = getDaysLeftStyle(mr.required_date);
                  const isCompleted =
                    mr.progress_name === "Completed" || mr.progress_id === 25;
                  const hasViewPermission = canViewMR(mr);

                  return (
                    <div
                      key={mr.id}
                      style={{
                        padding: "15px",
                        backgroundColor: "white",
                        border: "1px solid rgba(217, 217, 217, 1)",
                        width: "350px",
                        borderRadius: "5px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <div>
                          <small>MR NUMBER</small>
                          <h3>MR-{String(mr.id).padStart(5, "0")}</h3>
                        </div>

                        <div style={{ display: "flex", gap: "10px" }}>
                          {/* Only show priority badge if NOT completed */}
                          {!isCompleted && (
                            <small
                              className="status"
                              style={{
                                backgroundColor: priority.backgroundColor,
                                color: priority.color,
                              }}
                            >
                              {priority.label}
                            </small>
                          )}
                        </div>
                      </div>

                      <br />

                      <small>REQUESTER</small>
                      <h3>{mr.requested_by || "-"}</h3>

                      <br />

                      <small>DEPARTMENT</small>
                      <h3>{mr.department_name}</h3>

                      <br />

                      <small>PROJECT</small>
                      <h3>{mr.project_name || "-"}</h3>

                      <br />

                      {/* Only show required date and days left if NOT completed */}
                      {!isCompleted ? (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "25px",
                          }}
                        >
                          <div>
                            <small>REQUIRED DATE</small>
                            <h3>
                              {new Date(mr.required_date).toLocaleDateString()}
                            </h3>
                          </div>

                          <h3
                            style={{
                              padding: "5px 15px",
                              backgroundColor: daysLeftStyle.backgroundColor,
                              color: daysLeftStyle.color,
                              textTransform: "uppercase",
                              borderRadius: "5px",
                            }}
                          >
                            {getDaysLeftText(mr.required_date)}
                          </h3>
                        </div>
                      ) : (
                        <div>
                          <small>REQUIRED DATE</small>
                          <h3>
                            {new Date(mr.required_date).toLocaleDateString()}
                          </h3>
                        </div>
                      )}

                      <br />

                      <Button
                        componentType={"link"}
                        bgColor={"black"}
                        borderColor={"black"}
                        textColor={"white"}
                        full
                        href={`/mr/${mr.id}`}
                        disabled={!hasViewPermission}
                        style={{
                          opacity: !hasViewPermission ? "0.5" : "1",
                          cursor: !hasViewPermission
                            ? "not-allowed"
                            : "pointer",
                          pointerEvents: !hasViewPermission ? "none" : "auto",
                        }}
                      >
                        VIEW
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
