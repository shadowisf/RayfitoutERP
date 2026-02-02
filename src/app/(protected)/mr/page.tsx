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
    15: 9, // Payment rejected → Procurement (CHANGED FROM 13)
    17: 11, // Pending delivery → Storekeeper
    21: 12, // Awaiting QC check → Quality Control
    23: 12, // Failed QC → Quality Control
    24: 11, // Awaiting stock entry → Storekeeper
  };

  // ✅ UPDATED canViewMR - Shows MRs that need action from user's department
  const canViewMR = (mr: any) => {
    const userDeptId = userInfo?.departmentID;
    if (!userDeptId) return false;

    // ✅ Managers (dept 8) - Only see specific stages in "Show Related Cards"
    if (userDeptId === 8) {
      // Managers see:
      // - Draft (1): All drafts
      // - Awaiting manager initial approval (3)
      // - Awaiting manager price approval (10)
      // - Completed (25): All completed
      if ([1, 3, 10, 25].includes(mr.progress_id)) {
        return true;
      }
      return false;
    }

    // ✅ Draft (progress_id 1): Show only own department's MRs
    if (mr.progress_id === 1) {
      return mr.department_id === userDeptId;
    }

    // ✅ Completed MRs (progress_id 25): Show only own department's completed MRs
    if (mr.progress_id === 25) {
      return mr.department_id === userDeptId;
    }

    // ✅ Initial approval rejected (progress_id 5): Only show own department's
    if (mr.progress_id === 5) {
      return mr.department_id === userDeptId;
    }

    // ✅ Price approval rejected (progress_id 11): Only Procurement sees them
    if (mr.progress_id === 11) {
      return userDeptId === 9;
    }

    // ✅ Payment rejected (progress_id 15): Only Procurement sees them
    if (mr.progress_id === 15) {
      return userDeptId === 9;
    }

    // ✅ Get the responsible department for this progress stage
    const responsibleDept = progressToResponsibleDepartment[mr.progress_id];

    // ✅ Show MRs where their department is responsible for this stage
    if (responsibleDept === userDeptId) {
      return true;
    }

    return false;
  };

  // ✅ UPDATED canUserViewMR - Determines if user can VIEW an MR (click to open)
  const canUserViewMR = (mr: any) => {
    const userDeptId = userInfo?.departmentID;
    if (!userDeptId) return false;

    // ✅ Managers (department ID 8) can view ALL MRs
    if (userDeptId === 8) return true;

    // ✅ Draft (progress_id 1): Only own department can view
    if (mr.progress_id === 1) {
      return mr.department_id === userDeptId;
    }

    // ✅ Completed MRs (progress_id 25): Only own department can view
    if (mr.progress_id === 25) {
      return mr.department_id === userDeptId;
    }

    // ✅ Initial approval rejected (progress_id 5): Only own department can view
    if (mr.progress_id === 5) {
      return mr.department_id === userDeptId;
    }

    // ✅ Price approval rejected (progress_id 11): Only Procurement can view
    if (mr.progress_id === 11) {
      return userDeptId === 9;
    }

    // ✅ Payment rejected (progress_id 15): Only Procurement can view
    if (mr.progress_id === 15) {
      return userDeptId === 9;
    }

    // ✅ Get the responsible department for this progress stage
    const responsibleDept = progressToResponsibleDepartment[mr.progress_id];

    // ✅ Users can view if their department is responsible
    if (responsibleDept === userDeptId) {
      return true;
    }

    // ✅ Users can always view their own department's MRs
    if (mr.department_id === userDeptId) {
      return true;
    }

    return false;
  };

  // Map progress status to responsible department
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
      "Price approval rejected": { name: "Procurement", id: 9 }, // ✅ CHANGED
      "Awaiting LPO & invoice": { name: "Procurement", id: 9 },
      "Pending payment": { name: "Finance", id: 10 },
      "Payment rejected": { name: "Procurement", id: 9 }, // ✅ CHANGED FROM FINANCE
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

  // Get dot color based on status and count
  const getDotColor = (status: string, count: number) => {
    if (count === 0) {
      return "rgba(207, 207, 207, 1)";
    }

    if (status === "Completed") {
      return "rgba(46, 188, 127, 1)";
    }

    if (isRejectedStatus(status)) {
      return "rgba(248, 77, 77, 1)";
    }

    return "rgba(235, 223, 90, 1)";
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
    "Awaiting QS initial approval",
    "Initial approval rejected",
    "Awaiting manager initial approval",
    "Awaiting quotations",
    "Price approval rejected",
    "Awaiting QS price approval",
    "Awaiting manager price approval",
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

        if (isRejectedStatus(status) && mrs.length === 0) {
          return false;
        }

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
      <br />

      {/* Kanban Container with fixed height and visible scrollbar */}
      <div
        style={{
          height: "calc(100vh - 230px)",
          overflowX: "auto",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "30px",
            paddingBottom: "20px",
            minHeight: "100%",
          }}
        >
          {visibleStatuses.map((status) => {
            const mrs = groupedMRs[status] || [];
            const isRejected = isRejectedStatus(status);
            const isCompleted = isCompletedStatus(status);
            const hasItems = mrs.length > 0;

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
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
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
                    overflowY: "auto",
                    flex: 1,
                    paddingRight: "5px",
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
                    const hasViewPermission = canUserViewMR(mr);

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

                        {!isCompleted ? (
                          <>
                            {/* Required Date */}
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
                                  {new Date(
                                    mr.required_date,
                                  ).toLocaleDateString()}
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

                            <br />

                            {/* Delivery Dates by Vendor */}
                            {mr.progress_id === 17 &&
                              mrDeliveryDates[mr.id] &&
                              mrDeliveryDates[mr.id].length > 0 && (
                                <>
                                  {mrDeliveryDates[mr.id].map(
                                    (delivery, index) => {
                                      const deliveryDaysLeftStyle =
                                        getDaysLeftStyle(
                                          delivery.delivery_date,
                                        );

                                      return (
                                        <div key={index}>
                                          <div
                                            style={{
                                              display: "flex",
                                              alignItems: "center",
                                              gap: "25px",
                                            }}
                                          >
                                            <div>
                                              <small>
                                                {delivery.supplier_name.toUpperCase()}{" "}
                                                DELIVERY DATE
                                              </small>
                                              <h3>
                                                {new Date(
                                                  delivery.delivery_date,
                                                ).toLocaleDateString()}
                                              </h3>
                                            </div>

                                            <h3
                                              style={{
                                                padding: "5px 15px",
                                                backgroundColor:
                                                  deliveryDaysLeftStyle.backgroundColor,
                                                color:
                                                  deliveryDaysLeftStyle.color,
                                                textTransform: "uppercase",
                                                borderRadius: "5px",
                                                whiteSpace: "nowrap",
                                              }}
                                            >
                                              {getDaysLeftText(
                                                delivery.delivery_date,
                                              )}
                                            </h3>
                                          </div>

                                          {index <
                                            mrDeliveryDates[mr.id].length -
                                              1 && <br />}
                                        </div>
                                      );
                                    },
                                  )}
                                  <br />
                                </>
                              )}
                          </>
                        ) : (
                          <>
                            {/* ✅ Completed MR - Only show Required Date, NO delivery dates */}
                            <div>
                              <small>REQUIRED DATE</small>
                              <h3>
                                {new Date(
                                  mr.required_date,
                                ).toLocaleDateString()}
                              </h3>
                            </div>

                            <br />
                          </>
                        )}

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
    </div>
  );
}
