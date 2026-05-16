"use client";

import Button from "@/app/components/Button";
import { EditProjectButton } from "./components/_EditProjectButton";
import { Project } from "./types/project";
import { DeleteProjectButton } from "./components/_DeleteProjectButton";
import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { MrHeader } from "../../mr/[id]/types/mrHeader";
import UploadAdditionalAttachmentsButton from "./components/_UploadAdditionalAttachmentsButton";
import AttachmentsList from "./components/AttachmentList";
import CreateBoqHeaderButton from "./boq/[boqId]/components/manager/_CreateBoqHeaderButton";
import ThreeDotsMenuButton from "@/app/components/_ThreeButtonsMenuButton";
import EditBoqHeaderButton from "./boq/[boqId]/components/manager/_EditBoqHeaderButton";
import { DeleteBoqHeaderButton } from "./boq/[boqId]/components/manager/_DeleteBoqHeaderButton";
import { SetBoqDraftButton } from "./boq/[boqId]/components/manager/_SetBoqDraftButton";
import { SetBoqPrimaryButton } from "./boq/[boqId]/components/manager/_SetBoqPrimaryButton";
import { BoqHeader } from "./boq/[boqId]/types/boqHeader";
import MrStatusFilterButton from "./components/_MrStatusFilterButton";

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
  const [editingBoq, setEditingBoq] = useState<BoqHeader | null>(null);
  const [deletingBoq, setDeletingBoq] = useState<BoqHeader | null>(null);
  const [boqSortCol, setBoqSortCol] = useState<string | null>(null);
  const [boqSortDir, setBoqSortDir] = useState<"asc" | "desc">("desc");
  const [mrs, setMrs] = useState<MrHeaderWithLpo[] | null>(null);
  const [mrStatusFilters, setMrStatusFilters] = useState<{
    selectedStatuses: string[];
  }>({ selectedStatuses: [] });

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

  // Extract unique statuses from MR data
  const mrStatuses = useMemo(() => {
    if (!mrs) return [];
    const statuses = new Set<string>();
    mrs.forEach((mr) => {
      const status = mr.display_progress_name || mr.progress_name;
      if (status) statuses.add(status);
    });
    return Array.from(statuses).sort();
  }, [mrs]);

  // Apply status filter
  const filteredMrs = useMemo(() => {
    if (!mrs) return null;
    if (mrStatusFilters.selectedStatuses.length === 0) return mrs;
    return mrs.filter((mr) => {
      const status = mr.display_progress_name || mr.progress_name;
      return mrStatusFilters.selectedStatuses.includes(status);
    });
  }, [mrs, mrStatusFilters.selectedStatuses]);

  const hasActiveMrFilters = mrStatusFilters.selectedStatuses.length > 0;

  const resetMrFilters = () => {
    setMrStatusFilters({ selectedStatuses: [] });
  };

  const handleBoqSort = (col: string) => {
    if (boqSortCol !== col) {
      setBoqSortCol(col);
      setBoqSortDir("desc");
    } else if (boqSortDir === "desc") {
      setBoqSortDir("asc");
    } else {
      setBoqSortCol(null);
      setBoqSortDir("desc");
    }
  };

  const boqSortIcon = (col: string) => (
    <span
      style={{
        marginLeft: 4,
        fontSize: 10,
        opacity: boqSortCol === col ? 1 : 0.35,
      }}
    >
      {boqSortCol === col ? (boqSortDir === "asc" ? "↑" : "↓") : "↕"}
    </span>
  );

  const sortedBoqs = useMemo(() => {
    if (!boqs) return null;
    if (!boqSortCol) return boqs;
    return [...boqs].sort((a, b) => {
      let aVal: number;
      let bVal: number;
      if (boqSortCol === "created_on") {
        aVal = a.created_on ? new Date(a.created_on).getTime() : 0;
        bVal = b.created_on ? new Date(b.created_on).getTime() : 0;
      } else {
        aVal = Number(a.total_value) - Number(a.discount);
        bVal = Number(b.total_value) - Number(b.discount);
      }
      return boqSortDir === "asc" ? aVal - bVal : bVal - aVal;
    });
  }, [boqs, boqSortCol, boqSortDir]);

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
          <table
            className="items-table two-toned"
            style={{ tableLayout: "fixed", width: "100%" }}
          >
            <colgroup>
              <col style={{ width: "150px" }} />
              <col style={{ width: "150px" }} />
              <col style={{ width: "auto" }} />
              <col style={{ width: "250px" }} />
              <col style={{ width: "200px" }} />
              <col style={{ width: "200px" }} />
              <col style={{ width: "120px" }} />
            </colgroup>
            <thead>
              <tr>
                <th>BOQ NUMBER</th>
                <th
                  onClick={() => handleBoqSort("created_on")}
                  style={{ cursor: "pointer", userSelect: "none" }}
                >
                  CREATION DATE{boqSortIcon("created_on")}
                </th>
                <th>NAME</th>
                <th>LOCATION</th>
                <th
                  onClick={() => handleBoqSort("total_value")}
                  style={{ cursor: "pointer", userSelect: "none" }}
                >
                  TOTAL VALUE{boqSortIcon("total_value")}
                </th>
                <th>STATUS</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sortedBoqs?.map((boq: BoqHeader, index: number) => (
                <tr key={index}>
                  <td>BOQ-{String(boq.id).padStart(5, "0")}</td>
                  <td>
                    {boq.created_on
                      ? new Date(boq.created_on).toLocaleDateString("en-GB")
                      : "-"}
                  </td>
                  <td>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <span>{boq.name || "-"}</span>
                      {boq.is_primary && (
                        <span
                          style={{
                            padding: "4px 16px",
                            backgroundColor: "rgba(235, 222, 151, 1)",
                            color: "rgba(123, 109, 32, 1)",
                            borderRadius: "50px",
                            fontSize: "8px",
                            fontWeight: "800",
                            whiteSpace: "nowrap",
                          }}
                        >
                          PRIMARY
                        </span>
                      )}
                    </div>
                  </td>
                  <td>{boq.location || "-"}</td>
                  <td>
                    {userInfo?.departmentID === 8 ||
                    userInfo?.departmentID === 16
                      ? `${boq.project_currency} ${(
                          Number(boq.total_value) - Number(boq.discount) || 0
                        ).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}`
                      : "-"}
                  </td>
                  <td>
                    <span
                      className="approval-pill normal-text centered full"
                      style={{
                        backgroundColor: boq.is_draft
                          ? "rgba(234, 234, 234, 1)"
                          : "rgba(87, 244, 176, 1)",
                        color: boq.is_draft
                          ? "rgba(89, 89, 89, 1)"
                          : "rgba(31, 101, 71, 1)",
                      }}
                    >
                      {boq.is_draft ? "DRAFT" : "APPROVED"}
                    </span>
                  </td>
                  <td>
                    {(userInfo?.departmentID === 8 ||
                      userInfo?.departmentID === 16) && (
                      <div
                        style={{
                          display: "flex",
                          gap: "25px",
                          alignItems: "center",
                        }}
                      >
                        <Button
                          componentType={"link"}
                          bgColor={"rgba(239, 239, 239, 1)"}
                          borderColor={"rgba(223, 223, 223, 1)"}
                          textColor={"black"}
                          style={{ padding: "7px 7px" }}
                          href={`/project/${boq.project_id}/boq/${boq.id}`}
                        >
                          <img src={externalLinkIcon} alt="view" />
                        </Button>

                        <ThreeDotsMenuButton>
                          <Button
                            componentType="button"
                            bgColor="transparent"
                            borderColor="transparent"
                            textColor="black"
                            onClick={() => setEditingBoq(boq)}
                            full
                            style={{ justifyContent: "flex-start" }}
                          >
                            <img src="/icons/pencil.svg" alt="pencil" /> Edit
                          </Button>
                          <SetBoqDraftButton
                            boqHeader={boq}
                            onSuccess={() => fetchAllBoqsByProjectID()}
                          />
                          <SetBoqPrimaryButton
                            boqHeader={boq}
                            onSuccess={() => fetchAllBoqsByProjectID()}
                          />
                          <Button
                            componentType="button"
                            bgColor="transparent"
                            borderColor="transparent"
                            textColor="black"
                            onClick={() => setDeletingBoq(boq)}
                            full
                            style={{ justifyContent: "flex-start" }}
                          >
                            <img src="/icons/trash.svg" alt="trash" /> Delete
                          </Button>
                        </ThreeDotsMenuButton>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <br />
      <br />
      <br />
      <br />
      <br />

      <h3>MATERIAL REQUESTS</h3>
      <br />

      {/* Filter bar */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          paddingBottom: "20px",
          borderBottom: "1px solid rgba(207, 207, 207, 1)",
          alignItems: "center",
        }}
      >
        <MrStatusFilterButton
          statuses={mrStatuses}
          onApplyFilters={setMrStatusFilters}
          currentFilters={mrStatusFilters}
        />

        {hasActiveMrFilters && (
          <div
            style={{
              display: "flex",
              gap: "10px",
              alignItems: "center",
            }}
          >
            {mrStatusFilters.selectedStatuses.length > 0 && (
              <Button
                style={{
                  borderRadius: "50px",
                  fontWeight: 600,
                }}
                componentType={"none"}
                bgColor={"rgba(239, 239, 239, 1)"}
                borderColor={"transparent"}
                textColor={"black"}
              >
                STATUS:{" "}
                <span
                  style={{
                    color: "rgba(16, 185, 129, 1)",
                    textWrap: "nowrap",
                  }}
                >
                  {mrStatusFilters.selectedStatuses[0].toUpperCase()}
                  {mrStatusFilters.selectedStatuses.length > 1 &&
                    `, +${mrStatusFilters.selectedStatuses.length - 1} MORE`}
                </span>
              </Button>
            )}

            <Button
              onClick={resetMrFilters}
              componentType={"button"}
              bgColor={"transparent"}
              borderColor={"transparent"}
              textColor={"black"}
              style={{ padding: "0px" }}
            >
              RESET FILTER
            </Button>
          </div>
        )}
      </div>

      <br />

      {filteredMrs?.length === 0 ? (
        <div>
          {hasActiveMrFilters
            ? "No material requests matching your filters"
            : "No material requests created"}
        </div>
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
            {filteredMrs?.map((item: MrHeaderWithLpo, index: number) => {
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
      {/* Page-level BOQ modals — rendered outside ThreeDotsMenu so they survive menu close */}
      {editingBoq && (
        <EditBoqHeaderButton
          key={editingBoq.id}
          boqHeader={editingBoq}
          openImmediately
          hideButton
          onSuccess={() => {
            setEditingBoq(null);
            fetchAllBoqsByProjectID();
          }}
          onClose={() => setEditingBoq(null)}
        />
      )}
      {deletingBoq && (
        <DeleteBoqHeaderButton
          key={deletingBoq.id}
          boqHeader={deletingBoq}
          openImmediately
          hideButton
          onSuccess={() => {
            setDeletingBoq(null);
            fetchAllBoqsByProjectID();
          }}
          onClose={() => setDeletingBoq(null)}
        />
      )}
    </div>
  );
}
