"use client";

import Button from "@/app/components/Button";
import { useAuth } from "@/app/context/AuthContext";
import { useEffect, useState } from "react";
import { MrHeader } from "./[id]/types/mrHeader";

export default function MR() {
  const { userInfo } = useAuth();

  const [mrHeaders, setMrHeaders] = useState<MrHeader[]>([]);

  useEffect(() => {
    if (
      userInfo?.departmentID !== 8 &&
      userInfo?.departmentID !== 9 &&
      userInfo?.departmentID !== 10 &&
      userInfo?.departmentID !== 11 &&
      userInfo?.departmentID !== 12
    ) {
      fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
        method: "POST",
        body: JSON.stringify({
          action: "getMrHeaders",
          department_id: userInfo?.departmentID,
        }),
      }).then((res) => res.json().then((data) => setMrHeaders(data)));
    } else {
      fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
        method: "GET",
      }).then((res) => res.json().then((data) => setMrHeaders(data)));
    }
  }, [userInfo]);

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

  // Function to check if status is rejected or failed
  const isRejectedStatus = (status: string) => {
    const rejectedStatuses = [
      "Initial approval rejected",
      "Price approval rejected",
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
    "Initial approval rejected",
    "Price approval rejected",
    "Failed QC",
    "Draft",
    "Awaiting initial approval",
    "Awaiting quotations",
    "Awaiting price approval",
    "Awaiting LPO & invoice",
    "Pending payment",
    "Pending delivery",
    "GRN pending",
    "Awaiting QC check",
    "Awaiting stock entry",
    "Completed",
  ];

  // Group MRs by status
  const groupedMRs = mrHeaders.reduce((acc: any, mr: any) => {
    const status = mr.progress_name || "Unknown";
    if (!acc[status]) {
      acc[status] = [];
    }
    acc[status].push(mr);
    return acc;
  }, {});

  // Filter out rejected statuses with 0 count
  const visibleStatuses = allStatuses.filter((status) => {
    const mrs = groupedMRs[status] || [];
    // Hide rejected statuses if they have 0 MRs
    if (isRejectedStatus(status) && mrs.length === 0) {
      return false;
    }
    return true;
  });

  return (
    <div className="dashboard">
      <h2>MATERIAL REQUESTS</h2>

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
                  const isCompleted = mr.progress_name === "Completed";

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
                          <small
                            className="status"
                            style={getProgressStyle(mr.progress_name)}
                          >
                            {mr.progress_name}
                          </small>
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
                      <h3>{mr.requested_by}</h3>

                      <br />

                      <small>PROJECT</small>
                      <h3>{mr.project_name}</h3>

                      <br />

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
                            backgroundColor: "rgba(231, 231, 231, 1)",
                            textTransform: "uppercase",
                            borderRadius: "5px",
                          }}
                        >
                          {getDaysLeftText(mr.required_date)}
                        </h3>
                      </div>

                      <br />

                      <Button
                        componentType={"link"}
                        bgColor={"black"}
                        borderColor={"black"}
                        textColor={"white"}
                        full
                        href={`/mr/${mr.id}`}
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
