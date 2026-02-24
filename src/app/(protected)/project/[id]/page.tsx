"use client";

import Button from "@/app/components/Button";
import { EditProjectButton } from "./components/_EditProjectButton";
import { Project } from "./types/project";
import { DeleteProjectButton } from "./components/_DeleteProjectButton";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { BoqHeader } from "../../boq/[id]/types/boqHeader";
import { MrHeader } from "../../mr/[id]/types/mrHeader";
import CreateBoqHeaderButton from "../../boq/[id]/components/manager/_CreateBoqHeaderButton";
import BoqCard from "../../boq/[id]/components/BoqCard";
import UploadAdditionalAttachmentsButton from "./components/_UploadAdditionalAttachmentsButton";
import AttachmentsList from "./components/AttachmentList";

// Extended MrHeader type with LPO details
type MrHeaderWithLpo = MrHeader & {
  lpo_id?: number | null;
  lpo_progress_id?: number | null;
  lpo_progress_name?: string | null;
  display_progress_name?: string;
};

export default function ProjectWithID() {
  const externalLinkIcon = "/icons/external-link.svg";

  const { id } = useParams();
  const { userInfo } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [boqs, setBoqs] = useState<BoqHeader[] | null>(null);
  const [mrs, setMrs] = useState<MrHeaderWithLpo[] | null>(null);

  async function fetchProjectByID() {
    await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/projects/getProjectByID`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: id }),
      },
    )
      .then((res) => res.json())
      .then((data) => {
        setProject(data);
      })
      .catch((err) => {
        console.error(err);
      });
  }

  async function fetchAllBoqsByProjectID() {
    await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/projects/getAllBoqsByProjectID`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: id }),
      },
    )
      .then((res) => res.json())
      .then((data) => {
        setBoqs(data.data);
      })
      .catch((err) => {
        console.error(err);
      });
  }

  async function fetchAllMrsByProjectID() {
    await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/projects/getAllMrsByProjectID`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: id }),
      },
    )
      .then((res) => res.json())
      .then((data) => {
        console.log(data.data);
        setMrs(data.data);
      })
      .catch((err) => {
        console.error(err);
      });
  }

  useEffect(() => {
    fetchAllMrsByProjectID();
    fetchAllBoqsByProjectID();
    fetchProjectByID();
  }, []);

  // Helper function to get approval pill style based on progress name
  const getApprovalPillStyle = (progressName: string) => {
    const lowerProgress = progressName?.toLowerCase() || "";
    const isRejected = ["reject", "fail"].some((word) =>
      lowerProgress.includes(word),
    );
    const isCompleted = ["completed", "done", "finished"].some((word) =>
      lowerProgress.includes(word),
    );

    if (isRejected) {
      return {
        backgroundColor: "rgba(255, 181, 181, 1)",
        color: "rgba(248, 77, 77, 1)",
      };
    } else if (isCompleted) {
      return {
        backgroundColor: "rgba(87, 244, 176, 1)",
        color: "rgba(31, 101, 71, 1)",
      };
    } else {
      // Default/pending style
      return {
        backgroundColor: "rgba(255, 250, 189, 1)",
        color: "rgba(134, 83, 47, 1)",
      };
    }
  };

  return (
    <div className="dashboard">
      <h1>
        <a href="/project">PROJECTS</a> &gt; {project?.name.toUpperCase()}
      </h1>

      <br />
      <br />

      <div className="project-with-id">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "25px",
              textTransform: "uppercase",
            }}
          >
            <div>
              <small>NAME</small>
              <h2>{project?.name}</h2>
            </div>
            <div>
              <small>TYPE</small>
              <h2>{project?.type}</h2>
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            {(userInfo?.departmentID === 8 ||
              userInfo?.departmentID === 16) && (
              <>
                <EditProjectButton
                  project={project}
                  onSuccess={() => fetchProjectByID()}
                />
                <DeleteProjectButton project={project} />
              </>
            )}
          </div>
        </div>

        <br />
        <br />

        <div
          style={{
            display: "flex",
            gap: "25px",
            textTransform: "uppercase",
          }}
        >
          <div>
            <small>PROJECT NUMBER</small>
            <h2>RAY-{String(project?.id).padStart(5, "0")}</h2>
          </div>

          <div>
            <small>SIZE</small>
            <h2>{project?.size.toLocaleString("en-US")} SQFT</h2>
          </div>

          <div>
            <small>STATUS</small>
            <div
              className="approval-pill normal-text centered"
              style={{
                background: project?.status.toLowerCase().includes("completed")
                  ? "rgba(134,241,181,1)"
                  : "rgba(255, 250, 189, 1)",
                color: project?.status.toLowerCase().includes("completed")
                  ? "rgba(52,100,73,1)"
                  : "rgba(134, 83, 47, 1)",
              }}
            >
              {project?.status}
            </div>
          </div>

          <div>
            <small>TYPE OF WORK</small>
            <h2 style={{ textWrap: "nowrap" }}>
              {project?.type_of_work || "-"}
            </h2>
          </div>

          <div>
            <small>QUOTED PRICE</small>
            <h2>
              {project?.quoted_budget
                ? `${project.currency} ${Number(
                    project.quoted_budget,
                  ).toLocaleString("en-US")}`
                : "-"}
            </h2>
          </div>

          <div>
            <small>ALLOCATED BUDGET</small>
            <h2>
              {project?.allocated_budget
                ? `${project.currency} ${Number(
                    project?.allocated_budget,
                  ).toLocaleString("en-US")}`
                : "-"}
            </h2>
          </div>

          <div>
            <small>START DATE</small>
            <h2>
              {project?.start_date
                ? new Date(project.start_date).toLocaleDateString("en-US")
                : "-"}
            </h2>
          </div>

          <div>
            <small>END DATE</small>
            <h2>
              {project?.end_date
                ? new Date(project.end_date).toLocaleDateString("en-US")
                : "-"}
            </h2>
          </div>
        </div>

        {project?.scope && (
          <>
            <br />
            <br />

            <div style={{ textTransform: "uppercase" }}>
              <small>SCOPE</small>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "8px",
                }}
              >
                {project.scope
                  ?.split(",")
                  .map((item: string, index: number) => (
                    <h2
                      key={index}
                      className=""
                      style={{
                        padding: "4px 10px",
                        backgroundColor: "rgba(225, 225, 225, 1)",
                        borderRadius: "5px",
                        color: "black",
                      }}
                    >
                      {item.trim()}
                    </h2>
                  ))}
              </div>
            </div>
          </>
        )}

        <br />
        <br />

        <div>
          <small>ADDITIONAL ATTACHMENTS</small>
          <div style={{ display: "flex", gap: "25px" }}>
            <AttachmentsList
              attachments={project?.attachments}
              projectId={project?.id}
              onDeleteSuccess={() => fetchProjectByID()}
            />
            <UploadAdditionalAttachmentsButton
              project={project}
              onUploadSuccess={() => fetchProjectByID()}
            />
          </div>
        </div>
      </div>

      <br />
      <br />
      <br />
      <br />
      <br />

      <div className="widget-container">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h3>BILL OF QUANTITIES</h3>
          {(userInfo?.departmentID === 8 || userInfo?.departmentID === 16) && (
            <CreateBoqHeaderButton
              project={project}
              onSuccess={() => fetchAllBoqsByProjectID()}
            />
          )}
        </div>

        <br />

        {boqs?.length === 0 ? (
          <div>No bill of quantities created</div>
        ) : (
          <div className="widget-grid boqs">
            {boqs?.map((boq: any, index) => (
              <BoqCard
                key={index}
                boqHeader={boq}
                onSuccess={() => fetchAllBoqsByProjectID()}
              />
            ))}
          </div>
        )}
      </div>

      <br />
      <br />
      <br />
      <br />
      <br />

      <h3>MATERIAL REQUESTS</h3>
      <br />
      {mrs?.length === 0 ? (
        <div>No material requests created</div>
      ) : (
        <table className="items-table two-toned">
          <thead>
            <tr>
              <th>MR NUMBER</th>
              <th>LPO NUMBER</th>
              <th>PURPOSE</th>
              <th>REQUESTED BY</th>
              <th>DEPARTMENT</th>
              <th>REQUIRED DATE</th>
              <th>STATUS</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {mrs?.map((item: MrHeaderWithLpo, index: number) => {
              const progressStyle = getApprovalPillStyle(
                item.display_progress_name || item.progress_name,
              );

              return (
                <tr key={index}>
                  <td>MR-{String(item.id).padStart(5, "0")}</td>
                  <td>
                    {item.lpo_id
                      ? `LPO-${String(item.lpo_id).padStart(5, "0")}`
                      : "-"}
                  </td>
                  <td>{item.purpose_name || "-"}</td>
                  <td>{item.requested_by || "-"}</td>
                  <td>{item.department_name || "-"}</td>
                  <td>
                    {item.required_date
                      ? new Date(item.required_date).toLocaleDateString("en-US")
                      : "-"}
                  </td>
                  <td>
                    <span
                      className="approval-pill normal-text centered"
                      style={{
                        ...progressStyle,
                        textTransform: "uppercase",
                      }}
                    >
                      {item.display_progress_name || item.progress_name}
                    </span>
                  </td>
                  <td>
                    <div>
                      {userInfo?.departmentID === item.department_id ||
                      userInfo?.departmentID === 8 ? (
                        <Button
                          componentType={"link"}
                          bgColor={"rgba(239, 239, 239, 1)"}
                          borderColor={"rgba(223, 223, 223, 1)"}
                          textColor={"black"}
                          style={{ padding: "7px 7px" }}
                          href={
                            item.lpo_id
                              ? `/mr/${item.id}/lpo/${item.lpo_id}`
                              : `/mr/${item.id}`
                          }
                        >
                          <img src={externalLinkIcon} alt="external link" />
                        </Button>
                      ) : (
                        "-"
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
