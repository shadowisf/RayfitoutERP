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

  const [mrDeliveryDates, setMrDeliveryDates] = useState<{
    [mrId: number]: Array<{ supplier_name: string; delivery_date: string }>;
  }>({});

  useEffect(() => {
    if (mrHeaders.length === 0) return;

    const fetchDeliveryDates = async () => {
      const deliveryDatesMap: {
        [mrId: number]: Array<{ supplier_name: string; delivery_date: string }>;
      } = {};

      await Promise.all(
        mrHeaders.map(async (mr) => {
          try {
            const res = await fetch(
              `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getDeliveryDatesByMrHeaderID`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mr_header_id: mr.id }),
              },
            );
            const data = await res.json();

            if (data.success && data.delivery_dates) {
              deliveryDatesMap[mr.id] = data.delivery_dates;
            } else {
              deliveryDatesMap[mr.id] = [];
            }
          } catch (err) {
            console.error(
              `Error fetching delivery dates for MR ${mr.id}:`,
              err,
            );
            deliveryDatesMap[mr.id] = [];
          }
        }),
      );

      setMrDeliveryDates(deliveryDatesMap);
    };

    fetchDeliveryDates();
  }, [mrHeaders]);

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

            const totalMinutes = Math.round(hoursDecimal * 60);
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;

            const durationString = `${String(hours).padStart(2, "0")}:${String(
              minutes,
            ).padStart(2, "0")}`;

            let durationStyle = {
              color: "black",
              backgroundColor: "rgba(231, 231, 231, 1)",
            };

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
              duration: "00:00",
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

  // ✅ Map progress_id to responsible department ID
  const progressToResponsibleDepartment: { [key: number]: number } = {
    2: 16, // Awaiting QS initial approval → QS
    3: 8, // Awaiting manager initial approval → Management
    5: 0, // Initial approval rejected → Originating department
    7: 9, // Awaiting quotations → Procurement
    9: 16, // Awaiting QS price approval → QS
    10: 8, // Awaiting manager price approval → Management
    11: 9, // Price approval rejected → Procurement
    12: 9, // Awaiting LPO & invoice → Procurement
    16: 9, // GRN failed → Procurement
    14: 10, // Pending payment → Finance
    13: 9, // Payment rejected → Procurement
    17: 11, // Pending delivery → Storekeeper
    21: 12, // Awaiting QC check → Quality Control
    23: 12, // Failed QC → Quality Control
    24: 11, // Awaiting stock entry → Storekeeper
  };

  const canViewMR = (mr: any) => {
    const userDeptId = userInfo?.departmentID;
    if (!userDeptId) return false;

    if (userDeptId === 8) {
      if ([1, 3, 10, 25].includes(mr.progress_id)) {
        return true;
      }
      return false;
    }

    if (mr.progress_id === 1) {
      return mr.department_id === userDeptId;
    }

    if (mr.progress_id === 25) {
      return mr.department_id === userDeptId;
    }

    if (mr.progress_id === 5) {
      return mr.department_id === userDeptId;
    }

    if (mr.progress_id === 11) {
      return userDeptId === 9;
    }

    if (mr.progress_id === 15) {
      return userDeptId === 9;
    }

    const responsibleDept = progressToResponsibleDepartment[mr.progress_id];

    if (responsibleDept === userDeptId) {
      return true;
    }

    return false;
  };

  const canUserViewMR = (mr: any) => {
    const userDeptId = userInfo?.departmentID;
    if (!userDeptId) return false;

    if (userDeptId === 8) return true;

    if (mr.progress_id === 1) {
      return mr.department_id === userDeptId;
    }

    if (mr.progress_id === 25) {
      return mr.department_id === userDeptId;
    }

    if (mr.progress_id === 5) {
      return mr.department_id === userDeptId;
    }

    if (mr.progress_id === 11) {
      return userDeptId === 9;
    }

    if (mr.progress_id === 15) {
      return userDeptId === 9;
    }

    const responsibleDept = progressToResponsibleDepartment[mr.progress_id];

    if (responsibleDept === userDeptId) {
      return true;
    }

    if (mr.department_id === userDeptId) {
      return true;
    }

    return false;
  };

  const getResponsibleDepartment = (status: string) => {
    const departmentMap: { [key: string]: { name: string; id: number } } = {
      Draft: { name: "", id: 0 },
      "Awaiting QS initial approval": { name: "Quantity Surveyor", id: 16 },
      "Awaiting manager initial approval": {
        name: "Directors/Management",
        id: 8,
      },
      "Initial approval rejected": { name: "", id: 0 },
      "Awaiting quotations": { name: "Procurement", id: 9 },
      "Awaiting QS price approval": { name: "Quantity Surveyor", id: 16 },
      "Awaiting manager price approval": {
        name: "Directors/Management",
        id: 8,
      },
      "Price approval rejected": { name: "Procurement", id: 9 },
      "Awaiting LPO & invoice": { name: "Procurement", id: 9 },
      "Pending payment": { name: "Finance", id: 10 },
      "Payment rejected": { name: "Procurement", id: 9 },
      "GRN failed": { name: "Procurement", id: 9 },
      "Pending delivery": { name: "Storekeeper", id: 11 },
      "Awaiting QC check": { name: "Quality Control", id: 12 },
      "Failed QC": { name: "Quality Control", id: 12 },
      "Awaiting stock entry": { name: "Storekeeper", id: 11 },
      Completed: { name: "", id: 0 },
    };

    return departmentMap[status] || { name: "", id: 0 };
  };

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

  const getDaysLeftText = (requiredDate: string) => {
    const required = new Date(requiredDate);
    const today = new Date();
    required.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil(
      (required.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays > 0) {
      return `${diffDays}d left`;
    } else if (diffDays === 0) {
      return "Due today";
    } else {
      return `${Math.abs(diffDays)}d overdue`;
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
        backgroundColor: "rgba(255, 181, 181, 1)",
        color: "rgba(248, 77, 77, 1)",
      };
    } else {
      return {
        backgroundColor: "rgba(255, 250, 189, 1)",
        color: "rgba(134, 83, 47, 1)",
      };
    }
  };

  // ✅ Define stage groups with their respective statuses
  const stageGroups = [
    {
      name: "Approval",
      statuses: [
        { name: "Draft", progress_id: 1 },
        { name: "Awaiting QS initial approval", progress_id: 2 },
        { name: "Awaiting manager initial approval", progress_id: 3 },
      ],
    },
    {
      name: "Commercial Validation",
      statuses: [
        { name: "Awaiting quotations", progress_id: 7 },
        { name: "Awaiting QS price approval", progress_id: 9 },
        { name: "Awaiting manager price approval", progress_id: 10 },
      ],
    },
    {
      name: "Procurement",
      statuses: [
        { name: "Awaiting LPO & invoice", progress_id: 12 },
        { name: "Pending payment", progress_id: 14 },
      ],
    },
    {
      name: "Delivery",
      statuses: [
        { name: "Pending delivery", progress_id: 17 },
        { name: "Awaiting QC check", progress_id: 21 },
        { name: "Awaiting stock entry", progress_id: 24 },
      ],
    },
    {
      name: "Rejected",
      statuses: [
        { name: "Initial approval rejected", progress_id: 5 },
        { name: "Price approval rejected", progress_id: 11 },
        { name: "Payment rejected", progress_id: 15 },
        { name: "GRN failed", progress_id: 16 },
        { name: "Failed QC", progress_id: 23 },
      ],
    },
    {
      name: "Completed",
      statuses: [{ name: "Completed", progress_id: 25 }],
    },
  ];

  const filteredMRs = filterRelevant
    ? mrHeaders.filter((mr) => canViewMR(mr))
    : mrHeaders;

  // Group MRs by progress_name
  const groupedMRs = filteredMRs.reduce((acc: any, mr: any) => {
    const status = mr.progress_name || "Unknown";
    if (!acc[status]) {
      acc[status] = [];
    }
    acc[status].push(mr);
    return acc;
  }, {});

  return (
    <div className="dashboard">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "25px",
        }}
      >
        <h2>MATERIAL REQUISITIONS</h2>

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

      {/* ✅ Vertical Kanban Layout */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "30px",
        }}
      >
        {stageGroups.map((group) => {
          // Get total count for this group
          const totalCount = group.statuses.reduce((sum, status) => {
            const mrs = groupedMRs[status.name] || [];
            return sum + mrs.length;
          }, 0);

          // Skip empty groups if not filtering
          if (
            !filterRelevant &&
            totalCount === 0 &&
            group.name !== "Completed"
          ) {
            return null;
          }

          return (
            <div key={group.name}>
              {/* ✅ Group Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "15px",
                  marginBottom: "20px",
                }}
              >
                <h2 style={{ margin: 0 }}>{group.name}</h2>
                <div
                  style={{
                    backgroundColor: "black",
                    color: "white",
                    borderRadius: "50%",
                    width: "32px",
                    height: "32px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "600",
                    fontSize: "14px",
                  }}
                >
                  {totalCount}
                </div>
              </div>

              {/* ✅ 3-Column Grid Layout for Stages */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "20px",
                }}
              >
                {group.statuses.map((status) => {
                  const mrs = groupedMRs[status.name] || [];
                  const responsibleDept = getResponsibleDepartment(status.name);
                  const departmentStyle = getDepartmentStyle(
                    responsibleDept.id,
                  );

                  // Skip empty rejected statuses if not filtering
                  if (
                    !filterRelevant &&
                    group.name === "Rejected" &&
                    mrs.length === 0
                  ) {
                    return null;
                  }

                  return (
                    <div
                      key={status.name}
                      style={{
                        backgroundColor: "white",
                        borderRadius: "15px",
                        padding: "20px",
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      {/* ✅ Stage Header */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: "10px",
                        }}
                      >
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
                            <h3
                              style={{
                                margin: 0,
                                fontSize: "14px",
                                fontWeight: "600",
                              }}
                            >
                              {status.name}
                            </h3>
                            <div
                              style={{
                                fontSize: "16px",
                                fontWeight: "600",
                              }}
                            >
                              {mrs.length}
                            </div>
                          </div>

                          {responsibleDept.name && (
                            <div
                              style={{
                                backgroundColor:
                                  departmentStyle.backgroundColor,
                                color: departmentStyle.color,
                                padding: "5px 12px",
                                borderRadius: "50px",
                                fontSize: "11px",
                                fontWeight: "600",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                alignSelf: "flex-start",
                              }}
                            >
                              <span style={{ fontSize: "16px" }}>•</span>
                              {responsibleDept.name.toUpperCase()}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ✅ MR Cards Container - Vertical scroll with fixed height */}
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "15px",
                          overflowY: "auto",
                          maxHeight: "600px",
                          paddingRight: "5px",
                          marginTop: "15px",
                        }}
                      >
                        {mrs.length > 0 ? (
                          mrs.map((mr: MrHeader) => {
                            const durationKey = `${mr.id}-${mr.progress_id}`;
                            const durationData = mrDurations[durationKey] || {
                              duration: "00:00",
                              style: {
                                color: "black",
                                backgroundColor: "rgba(231, 231, 231, 1)",
                              },
                            };

                            const daysLeftStyle = getDaysLeftStyle(
                              mr.required_date,
                            );
                            const hasViewPermission = canUserViewMR(mr);

                            return (
                              <div
                                key={mr.id}
                                style={{
                                  backgroundColor: "#f9fafb",
                                  borderRadius: "15px",
                                  padding: "15px",
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "12px",
                                }}
                              >
                                {/* MR Number & Duration */}
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "flex-end",
                                    gap: "10px",
                                  }}
                                >
                                  <div>
                                    <small
                                      style={{
                                        fontSize: "10px",
                                        color: "#6b7280",
                                      }}
                                    >
                                      MR NUMBER
                                    </small>
                                    <div
                                      style={{
                                        fontWeight: "600",
                                        fontSize: "14px",
                                      }}
                                    >
                                      MR-{String(mr.id).padStart(5, "0")}
                                    </div>
                                  </div>

                                  <div
                                    style={{
                                      ...daysLeftStyle,
                                      padding: "4px 10px",
                                      borderRadius: "50px",
                                      fontSize: "11px",
                                      fontWeight: "600",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {getDaysLeftText(mr.required_date)}
                                  </div>

                                  {mr.progress_id !== 1 &&
                                    mr.progress_id !== 25 && (
                                      <div
                                        style={{
                                          padding: "4px 8px",
                                          borderRadius: "50px",
                                          fontSize: "11px",
                                          fontWeight: "600",
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "5px",
                                          backgroundColor:
                                            "rgba(234, 234, 234, 1)",
                                          color: "rgba(89, 89, 89, 1)",
                                        }}
                                      >
                                        <svg
                                          width="11"
                                          height="11"
                                          viewBox="0 0 11 11"
                                          fill="none"
                                          xmlns="http://www.w3.org/2000/svg"
                                          style={{
                                            color: "rgba(89, 89, 89, 1)",
                                          }}
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
                                      </div>
                                    )}
                                </div>

                                {/* Project */}
                                <div>
                                  <small
                                    style={{
                                      fontSize: "10px",
                                      color: "#6b7280",
                                    }}
                                  >
                                    PROJECT
                                  </small>
                                  <div
                                    style={{
                                      fontWeight: "600",
                                      fontSize: "13px",
                                    }}
                                  >
                                    {mr.project_name || "-"}
                                  </div>
                                </div>

                                {/* Requester */}
                                <div>
                                  <small
                                    style={{
                                      fontSize: "10px",
                                      color: "#6b7280",
                                    }}
                                  >
                                    REQUESTER
                                  </small>
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "5px",
                                    }}
                                  >
                                    <div
                                      style={{
                                        backgroundColor: "black",
                                        color: "white",
                                        borderRadius: "50%",
                                        width: "24px",
                                        height: "24px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: "11px",
                                        fontWeight: "600",
                                      }}
                                    >
                                      {mr.requested_by
                                        ? mr.requested_by
                                            .split(" ")
                                            .map((n) => n[0])
                                            .join("")
                                            .toUpperCase()
                                            .slice(0, 2)
                                        : "?"}
                                    </div>
                                    <div
                                      style={{
                                        fontWeight: "600",
                                        fontSize: "13px",
                                      }}
                                    >
                                      {mr.requested_by || "-"},{" "}
                                      {mr.department_name || "-"}
                                    </div>
                                  </div>
                                </div>

                                {/* Required Date & Days Left */}
                                {/* {mr.progress_id !== 25 && (
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                      gap: "10px",
                                    }}
                                  >
                                    <div>
                                      <small
                                        style={{
                                          fontSize: "10px",
                                          color: "#6b7280",
                                        }}
                                      >
                                        Required Date
                                      </small>
                                      <div
                                        style={{
                                          fontWeight: "600",
                                          fontSize: "13px",
                                        }}
                                      >
                                        {new Date(
                                          mr.required_date,
                                        ).toLocaleDateString()}
                                      </div>
                                    </div>
                                  </div>
                                )} */}

                                <Button
                                  componentType={"link"}
                                  bgColor={"rgba(239, 239, 239, 1)"}
                                  borderColor={"rgba(239, 239, 239, 1)"}
                                  textColor={"black"}
                                  href={`/mr/${mr.id}`}
                                  full
                                  style={{ borderRadius: "50px" }}
                                >
                                  VIEW DETAILS{" "}
                                  <span style={{ marginLeft: "10px" }}>
                                    &gt;
                                  </span>
                                </Button>
                              </div>
                            );
                          })
                        ) : (
                          <div
                            style={{
                              padding: "40px 20px",
                              textAlign: "center",
                              color: "#9ca3af",
                              fontSize: "12px",
                            }}
                          >
                            No MRs in this stage
                          </div>
                        )}
                      </div>
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
