"use client";

import { useState, useEffect } from "react";
import Button from "../../../components/Button";
import { useAuth } from "@/app/context/AuthContext";

type ProjectBoxProps = {
  proj: any;
};

export default function ProjectBox({ proj }: ProjectBoxProps) {
  const externalLinkIcon = "/icons/external-link.svg";

  const { userInfo } = useAuth();

  const [quotedBudget, setQuotedBudget] = useState(0);
  const [allocatedBudget, setAllocatedBudget] = useState(0);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/projects/getBudgetTrackingDetails`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: proj.id }),
      }
    )
      .then((res) => res.json())
      .then((data) => {
        setQuotedBudget(Number(data.quoted_budget) || 0);
        setAllocatedBudget(Number(data.allocated_budget) || 0);
      })
      .catch((err) => console.error("Error fetching budget details:", err));
  }, [proj.id]);

  // Calculate progress percentage (spent / budget)
  const progressPercentage =
    quotedBudget > 0
      ? Math.min((allocatedBudget / quotedBudget) * 100, 100)
      : 0;

  // Determine color based on percentage
  const getProgressColor = () => {
    if (progressPercentage >= 100) {
      return "rgba(194, 60, 60, 1)"; // Red - full/exceeded
    } else if (progressPercentage >= 80) {
      return "rgba(255, 250, 189, 1)"; // Yellow - close to full
    } else {
      return "rgba(26, 216, 135, 1)"; // Green - good
    }
  };

  const progressColor = getProgressColor();

  return (
    <div className="item" key={proj.id}>
      <span
        className="status"
        style={
          proj.status === "Completed"
            ? {
                backgroundColor: "rgba(134,241,181,1)",
                color: "rgba(52,100,73,1)",
              }
            : {
                backgroundColor: "rgba(255, 250, 189, 1)",
                color: "rgba(134, 83, 47, 1)",
              }
        }
      >
        {proj.status}
      </span>

      <div>
        <small>NAME</small>
        <h2>{proj.name}</h2>

        <br />

        <small>BUDGET</small>
        <h2>
          AED{" "}
          {quotedBudget.toLocaleString("en-US", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })}
        </h2>

        <br />

        {(userInfo?.departmentID === 8 || userInfo?.departmentID === 10) && (
          <>
            <small>PROGRESS</small>

            <div style={{ marginTop: "10px", position: "relative" }}>
              <div
                style={{
                  width: "100%",
                  height: "25px",
                  backgroundColor: "rgba(238, 238, 238, 1)",
                  borderRadius: "25px",
                  overflow: "hidden",
                  position: "relative",
                }}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
              >
                <div
                  style={{
                    width: `${progressPercentage}%`,
                    height: "100%",
                    backgroundColor: progressColor,
                    borderRadius: "25px",
                    position: "relative",
                    transition: "background-color 0.3s ease, width 0.3s ease",
                  }}
                >
                  {progressPercentage > 10 && (
                    <div
                      style={{
                        position: "absolute",
                        top: "50%",
                        right: "10px",
                        transform: "translateY(-50%)",
                        fontWeight: "bold",
                        color: progressPercentage >= 80 ? "black" : "white",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {progressPercentage.toFixed(0)}%
                    </div>
                  )}
                </div>
                {progressPercentage <= 10 && (
                  <div
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      fontWeight: "bold",
                      color: "black",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {progressPercentage.toFixed(0)}%
                  </div>
                )}
              </div>

              {/* ✅ Tooltip popup */}
              {isHovering && (
                <div
                  style={{
                    position: "absolute",
                    top: "-40px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    backgroundColor: "rgba(0, 0, 0, 0.9)",
                    color: "white",
                    padding: "8px 16px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: "600",
                    whiteSpace: "nowrap",
                    zIndex: 10,
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                  }}
                >
                  AED{" "}
                  {allocatedBudget.toLocaleString("en-US", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}
                  {/* ✅ Tooltip arrow */}
                  <div
                    style={{
                      position: "absolute",
                      bottom: "-6px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: 0,
                      height: 0,
                      borderLeft: "6px solid transparent",
                      borderRight: "6px solid transparent",
                      borderTop: "6px solid rgba(0, 0, 0, 0.9)",
                    }}
                  />
                </div>
              )}

              {/* Legend */}
              <div
                style={{
                  display: "flex",
                  gap: "20px",
                  marginTop: "10px",
                  alignItems: "center",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <div
                    style={{
                      width: "12px",
                      height: "12px",
                      backgroundColor: progressColor,
                      borderRadius: "50%",
                      transition: "background-color 0.3s ease",
                    }}
                  />
                  <small style={{ color: "black" }}>SPENT</small>
                </div>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <div
                    style={{
                      width: "12px",
                      height: "12px",
                      backgroundColor: "rgba(238, 238, 238, 1)",
                      borderRadius: "50%",
                    }}
                  />
                  <small style={{ color: "black" }}>BUDGET</small>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <br />

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: "5px" }}>
          <Button
            componentType={"link"}
            bgColor={"transparent"}
            borderColor={"rgba(223, 223, 223, 1)"}
            textColor={"black"}
            href={`boq/${proj.id}`}
            style={{ borderRadius: "50px" }}
          >
            <>
              BOQ
              <img src={externalLinkIcon} alt="external link icon" />
            </>
          </Button>
          <Button
            componentType={"link"}
            bgColor={"transparent"}
            borderColor={"rgba(223, 223, 223, 1)"}
            textColor={"black"}
            href={`#`}
            style={{ borderRadius: "50px" }}
          >
            <>
              MRs
              <img src={externalLinkIcon} alt="external link icon" />
            </>
          </Button>
        </div>

        <Button
          componentType={"link"}
          bgColor={"black"}
          borderColor={"black"}
          textColor={"white"}
          href={`project/${proj.id}`}
          style={{
            width: "125px",
            display: "flex",
            justifyContent: "space-between",
            borderRadius: "50px",
          }}
        >
          <p>VIEW</p>
          <p>&gt;</p>
        </Button>
      </div>
    </div>
  );
}
