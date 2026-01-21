"use client";

import Button from "@/app/components/Button";
import { useAuth } from "@/app/context/AuthContext";
import { useEffect, useState } from "react";
import { MrHeader } from "./[id]/types/mrHeader";

export default function MR() {
  const { userInfo } = useAuth();

  const [mrHeaders, setMrHeaders] = useState<MrHeader[]>([]);
  const [filterRelevant, setFilterRelevant] = useState(false);
  const [mrDurations, setMrDurations] = useState<{
    [key: string]: { duration: string; style: any };
  }>({});

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
      method: "GET",
    }).then((res) => res.json().then((data) => setMrHeaders(data)));
  }, [userInfo]);

  // Fetch durations for all MRs
  useEffect(() => {
    if (mrHeaders.length === 0) return;

    const fetchDurations = async () => {
      const durationsMap: {
        [key: string]: { duration: string; style: any };
      } = {};

      await Promise.all(
        mrHeaders.map(async (mr) => {
          try {
            const res = await fetch(
              `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getProgressDuration`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  mr_header_id: mr.id,
                  progress_id: mr.progress_id,
                }),
              },
            );
            const data = await res.json();

            let hoursDecimal = 0;
            if (
              data &&
              data.hours_in_stage != null &&
              data.minutes_in_stage != null
            ) {
              hoursDecimal =
                Number(data.hours_in_stage) +
                Number(data.minutes_in_stage) / 60;
            }

            // Calculate hours and minutes separately
            const totalMinutes = Math.round(hoursDecimal * 60);
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;

            // Format as HHH:MMM
            const durationString = `${String(hours).padStart(2, "0")}H:${String(
              minutes,
            ).padStart(2, "0")}M`;

            let durationStyle = {
              color: "black",
              backgroundColor: "rgba(231, 231, 231, 1)",
            };

            // Set color based on thresholds
            if (hoursDecimal > 48) {
              durationStyle = {
                color: "white",
                backgroundColor: "rgba(175, 61, 61, 1)",
              };
            } else if (hoursDecimal >= 24 && hoursDecimal <= 48) {
              durationStyle = {
                color: "rgba(248, 77, 77, 1)",
                backgroundColor: "rgba(255, 181, 181, 1)",
              };
            } else if (hoursDecimal >= 12 && hoursDecimal <= 24) {
              durationStyle = {
                color: "rgba(134, 83, 47, 1)",
                backgroundColor: "rgba(255, 250, 189, 1)",
              };
            }

            durationsMap[`${mr.id}-${mr.progress_id}`] = {
              duration: durationString,
              style: durationStyle,
            };
          } catch (err) {
            console.error(`Error fetching duration for MR ${mr.id}:`, err);
            durationsMap[`${mr.id}-${mr.progress_id}`] = {
              duration: "00H:00M",
              style: {
                color: "black",
                backgroundColor: "rgba(231, 231, 231, 1)",
              },
            };
          }
        }),
      );

      setMrDurations(durationsMap);
    };

    fetchDurations();
  }, [mrHeaders]);

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

  // Map progress status to responsible department
  const getResponsibleDepartment = (status: string) => {
    const departmentMap: { [key: string]: { name: string; id: number } } = {
      Draft: { name: "", id: 0 },
      "Awaiting initial approval": { name: "Directors/Management", id: 8 },
      "Initial approval rejected": { name: "", id: 0 },
      "Awaiting quotations": { name: "Procurement", id: 9 },
      "Awaiting price approval": { name: "Directors/Management", id: 8 },
      "Price approval rejected": { name: "Procurement", id: 9 },
      "Awaiting LPO & invoice": { name: "Procurement", id: 9 },
      "Pending payment": { name: "Finance", id: 10 },
      "Payment rejected": { name: "Finance", id: 10 },
      "GRN failed": { name: "Procurement", id: 9 },
      "Pending delivery": { name: "Storekeeper", id: 11 },
      "Awaiting QC check": { name: "Quality Control", id: 12 },
      "Failed QC": { name: "Quality Control", id: 12 },
      "Awaiting stock entry": { name: "Storekeeper", id: 11 },
      Completed: { name: "", id: 0 },
    };

    return departmentMap[status] || { name: "", id: 0 };
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
      12: {
        backgroundColor: "rgba(233, 213, 255, 1)",
        color: "rgba(129, 68, 196, 1)",
      },
    };

    // Default style for all other departments
    return (
      styles[departmentId] || {
        backgroundColor: "rgba(186, 230, 253, 1)",
        color: "rgba(0, 112, 170, 1)",
      }
    );
  };

  // Get dot color based on status and count
  const getDotColor = (status: string, count: number) => {
    // No MRs - gray
    if (count === 0) {
      return "rgba(207, 207, 207, 1)";
    }

    // Completed - green
    if (status === "Completed") {
      return "rgba(46, 188, 127, 1)";
    }

    // Rejected or failed statuses - red
    if (isRejectedStatus(status)) {
      return "rgba(248, 77, 77, 1)";
    }

    // All other statuses with items - yellow
    return "rgba(235, 223, 90, 1)";
  };

  // Progress IDs that are accessible to everyone IF department matches
  const universalProgressIds = [1, 5];

  const canViewMR = (mr: any) => {
    const userDeptId = userInfo?.departmentID;
    if (!userDeptId) return false;
    if (userDeptId === mr.department_id) return true;
    if (universalProgressIds.includes(mr.progress_id)) {
      return userDeptId === mr.department_id;
    }
    const allowedProgressIds = departmentViewPermissions[userDeptId];
    if (!allowedProgressIds) return false;
    return allowedProgressIds.includes(mr.progress_id);
  };

  const getPriority = (requiredDate: string) => {
    const required = new Date(requiredDate);
    const today = new Date();
    required.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil(
      (required.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
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

  const getDaysLeftText = (requiredDate: string) => {
    const required = new Date(requiredDate);
    const today = new Date();
    required.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil(
      (required.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
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

  const getDaysLeftStyle = (requiredDate: string) => {
    const required = new Date(requiredDate);
    const today = new Date();
    required.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil(
      (required.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays < 0) {
      return {
        backgroundColor: "rgba(175, 61, 61, 1)",
        color: "white",
      };
    } else if (diffDays <= 1) {
      return {
        backgroundColor: "rgba(255, 181, 181, 1)",
        color: "rgba(248, 77, 77, 1)",
      };
    } else if (diffDays <= 3) {
      return {
        backgroundColor: "rgba(255, 250, 189, 1)",
        color: "rgba(134, 83, 47, 1)",
      };
    } else {
      return {
        backgroundColor: "rgba(231, 231, 231, 1)",
        color: "black",
      };
    }
  };

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

  const isCompletedStatus = (status: string) => {
    return status === "Completed";
  };

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

  const filteredMRs = filterRelevant
    ? mrHeaders.filter((mr) => canViewMR(mr))
    : mrHeaders;

  const groupedMRs = filteredMRs.reduce((acc: any, mr: any) => {
    const status = mr.progress_name || "Unknown";
    if (!acc[status]) {
      acc[status] = [];
    }
    acc[status].push(mr);
    return acc;
  }, {});

  const visibleStatuses = filterRelevant
    ? allStatuses.filter((status) => {
        const mrs = groupedMRs[status] || [];
        return mrs.length > 0;
      })
    : allStatuses.filter((status) => {
        const mrs = groupedMRs[status] || [];

        // Hide rejected statuses with 0 count
        if (isRejectedStatus(status) && mrs.length === 0) {
          return false;
        }

        // Hide Draft if there are no draft MRs
        if (status === "Draft" && mrs.length === 0) {
          return false;
        }

        return true;
      });

  return (
    <div className="dashboard">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "25px",
        }}
      >
        <h2>MATERIAL REQUESTS</h2>

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
              }}
            />
          </div>
        </div>
      </div>

      <br />
      <br />
      <br />

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

          // Get responsible department for this status
          const responsibleDept = getResponsibleDepartment(status);
          const departmentToShow = responsibleDept.name;
          const departmentIdToUse = responsibleDept.id;

          const headerDepartmentStyle = getDepartmentStyle(departmentIdToUse);
          const dotColor = getDotColor(status, mrs.length);

          return (
            <div
              key={status}
              style={{
                minWidth: "350px",
                flexShrink: 0,
              }}
            >
              <div>
                <div
                  style={{
                    minHeight: "90px",
                    marginBottom: "20px",
                    padding: "15px 15px",
                    borderRadius: "15px",
                    backgroundColor: "white",
                    border: "1px solid rgba(231, 231, 231, 1)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <div
                        style={{
                          width: "12px",
                          height: "12px",
                          borderRadius: "50%",
                          backgroundColor: dotColor,
                          marginBottom: "3px",
                        }}
                      />
                      <h3 style={{ margin: 0 }}>{status.toUpperCase()}</h3>
                    </div>
                    <h3>{mrs.length}</h3>
                  </div>

                  {/* Show responsible department if not completed or draft */}
                  {departmentToShow && (
                    <>
                      <br />

                      <div>
                        <small
                          className="approval-pill normal-text centered"
                          style={{
                            backgroundColor:
                              headerDepartmentStyle.backgroundColor,
                            color: headerDepartmentStyle.color,
                            textTransform: "uppercase",
                            padding: "7px 10px",
                            borderRadius: "50px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <span style={{ scale: 2.5 }}>•</span>{" "}
                          {departmentToShow}
                        </small>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "20px",
                }}
              >
                {mrs.map((mr: MrHeader) => {
                  const priority = getPriority(mr.required_date);
                  const RequireDateDaysLeftStyle = getDaysLeftStyle(
                    mr.required_date,
                  );
                  const DeliveryDateDaysLeftStyle = getDaysLeftStyle(
                    mr.delivery_date,
                  );
                  const isCompleted =
                    mr.progress_name === "Completed" || mr.progress_id === 25;
                  const hasViewPermission = canViewMR(mr);

                  // Get duration data from state
                  const durationKey = `${mr.id}-${mr.progress_id}`;
                  const durationData = mrDurations[durationKey] || {
                    duration: "00H:00M",
                    style: {
                      color: "black",
                      backgroundColor: "rgba(231, 231, 231, 1)",
                    },
                  };

                  return (
                    <div
                      key={mr.id}
                      style={{
                        padding: "15px",
                        backgroundColor: "white",
                        width: "350px",
                        borderRadius: "15px",
                      }}
                    >
                      {mr.progress_id !== 1 && mr.progress_id !== 25 && (
                        <>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <small
                                className="status"
                                style={{
                                  ...durationData.style,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "10px",
                                  borderRadius: "5px",
                                }}
                              >
                                <svg
                                  width="11"
                                  height="11"
                                  viewBox="0 0 11 11"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                  style={{ color: durationData.style.color }}
                                >
                                  <path
                                    d="M5.5 2.5V5.5H8.5"
                                    stroke="currentColor"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                  <path
                                    d="M5.5 10.5C8.2615 10.5 10.5 8.2615 10.5 5.5C10.5 2.7385 8.2615 0.5 5.5 0.5C2.7385 0.5 0.5 2.7385 0.5 5.5C0.5 8.2615 2.7385 10.5 5.5 10.5Z"
                                    stroke="currentColor"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                                {durationData.duration}
                              </small>
                            </div>
                          </div>

                          <br />
                        </>
                      )}

                      <div>
                        <small>MR NUMBER</small>
                        <h3>MR-{String(mr.id).padStart(5, "0")}</h3>
                      </div>

                      <br />

                      <small>REQUESTER</small>
                      <h3>{mr.requested_by || "-"}</h3>

                      <br />

                      <small>DEPARTMENT</small>
                      <h3>{mr.department_name || "-"}</h3>

                      <br />

                      <small>PROJECT</small>
                      <h3>{mr.project_name || "-"}</h3>

                      <br />

                      {/* {mr.progress_id === 17 && (
                        <>
                          <br />

                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "25px",
                            }}
                          >
                            <div>
                              <small>DELIVERY DATE/S</small>
                              <h3>
                                {new Date(mr.delivery_date).toLocaleDateString(
                                  "en-US",
                                )}
                              </h3>
                            </div>

                            <h3
                              style={{
                                padding: "5px 15px",
                                backgroundColor:
                                  DeliveryDateDaysLeftStyle.backgroundColor,
                                color: DeliveryDateDaysLeftStyle.color,
                                textTransform: "uppercase",
                                borderRadius: "5px",
                              }}
                            >
                              {getDaysLeftText(mr.delivery_date)}
                            </h3>
                          </div>
                        </>
                      )}

                      <br /> */}

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
                              backgroundColor:
                                RequireDateDaysLeftStyle.backgroundColor,
                              color: RequireDateDaysLeftStyle.color,
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
                          borderRadius: "15px",
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
