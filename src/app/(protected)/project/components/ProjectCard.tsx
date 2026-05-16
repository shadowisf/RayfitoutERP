"use client";

import { useState, useEffect } from "react";
import Button from "../../../components/Button";
import { useAuth } from "@/app/context/AuthContext";
import { Project } from "../[id]/types/project";
import { DeleteProjectButton } from "../[id]/components/_DeleteProjectButton";
import CreateBoqHeaderButton from "../[id]/boq/[boqId]/components/manager/_CreateBoqHeaderButton";

type props = {
  project: Project;
  onSuccess?: () => void;
};

function formatAED(val: number) {
  return val.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function ProjectCard({ project, onSuccess }: props) {
  const { userInfo } = useAuth();

  const allocatedBudget = Number(project.allocated_budget) || 0;

  const [isHovering, setIsHovering] = useState(false);
  const [boqs, setBoqs] = useState([]);
  const [projectValue, setProjectValue] = useState<number | null>(null);
  const [spendToDate, setSpendToDate] = useState<number | null>(null);

  useEffect(() => {
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/projects/getAllBoqsByProjectID`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: project.id }),
      },
    )
      .then((res) => res.json())
      .then((data) => {
        setBoqs(data.data);
      })
      .catch((err) => {
        console.error(err);
      });

    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/projects/getProjectStats`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: project.id }),
    })
      .then((res) => res.json())
      .then((data) => {
        setProjectValue(Number(data.value) || 0);
        setSpendToDate(Number(data.spend_to_date) || 0);
      })
      .catch((err) => console.error("Error fetching project stats:", err));
  }, [project.id]);

  // Calculate progress percentage (spend to date / allocated budget)
  const progressPercentage =
    allocatedBudget > 0
      ? Math.min(((spendToDate ?? 0) / allocatedBudget) * 100, 100)
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

  // Check if progress should be shown
  const shouldShowProgress =
    project.type === "Signed" &&
    (userInfo?.departmentID === 8 || userInfo?.departmentID === 16);

  return (
    <div className="item" key={project.id}>
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <small>NAME</small>
            <h2>{project.name}</h2>
          </div>

          {project.type.toLowerCase().includes("signed") ? (
            <div
              className="approval-pill normal-text"
              style={
                project.status.toLowerCase().includes("completed")
                  ? {
                      backgroundColor: "rgba(134,241,181,1)",
                      color: "rgba(52,100,73,1)",
                      textTransform: "uppercase",
                      fontWeight: "600",
                    }
                  : {
                      backgroundColor: "rgba(255, 250, 189, 1)",
                      color: "rgba(134, 83, 47, 1)",
                      textTransform: "uppercase",
                      fontWeight: "600",
                    }
              }
            >
              {project.status}
            </div>
          ) : (
            (userInfo?.departmentID === 8 || userInfo?.departmentID === 16) && (
              <DeleteProjectButton project={project} onSuccess={onSuccess} />
            )
          )}
        </div>

        <br />

        {/* ── VALUE + SPEND TO DATE ─────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: "20px", marginBottom: "15px" }}>
          <div>
            <small>VALUE</small>
            <h2>
              {projectValue === null ? "..." : `AED ${formatAED(projectValue)}`}
            </h2>
          </div>

          <div>
            <small>BUDGET</small>
            <h2>
              {project.currency}{" "}
              {allocatedBudget.toLocaleString("en-GB", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </h2>
          </div>
        </div>

        {shouldShowProgress && (
          <>
            <div>
              <small>SPEND TO DATE</small>
              <h2>
                {spendToDate === null ? "..." : `AED ${formatAED(spendToDate)}`}
              </h2>
            </div>
            <br />

            <div>
              <small>PROGRESS</small>
              <div style={{ marginTop: "3px", position: "relative" }}>
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

                {/* Tooltip popup */}
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
                    {(spendToDate ?? 0).toLocaleString("en-US", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}
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
                    marginTop: "5px",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <div
                      style={{
                        width: "12px",
                        height: "12px",
                        backgroundColor: progressColor,
                        borderRadius: "50%",
                      }}
                    />
                    <small style={{ color: "black" }}>SPENT</small>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
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
            </div>
          </>
        )}
      </div>

      <br />

      {/* ── Bottom row ──────────────────────────────────────────────────────── */}
      <Button
        componentType={"link"}
        bgColor={"rgba(239, 239, 239, 1)"}
        borderColor={"rgba(239, 239, 239, 1)"}
        textColor={"black"}
        href={`project/${project.id}`}
        style={{
          borderRadius: "50px",
        }}
        full
      >
        VIEW &gt;
      </Button>
    </div>
  );
}
