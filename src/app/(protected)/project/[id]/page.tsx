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
import InfoPopUpButton from "@/app/components/_InfoPopUpButton";
import CreateBoqHeaderButton from "./components/_CreateBoqHeaderButton";

export default function ProjectWithID() {
  const externalLinkIcon = "/icons/external-link.svg";

  const { id } = useParams();
  const { userInfo } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [boqs, setBoqs] = useState<BoqHeader[] | null>(null);
  const [mrs, setMrs] = useState<MrHeader[] | null>(null);

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

  useEffect(() => {
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/projects/getAllMrsByProjectID`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: id }),
      },
    )
      .then((res) => res.json())
      .then((data) => {
        setMrs(data.data);
      })
      .catch((err) => {
        console.error(err);
      });

    fetchAllBoqsByProjectID();

    fetchProjectByID();
  }, []);

  return (
    <div className="dashboard">
      <h2>
        <a href="/project">PROJECTS</a> &gt; {project?.name.toUpperCase()}
      </h2>

      <br />
      <br />

      <div className="project-with-id">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            borderBottom: "rgba(227, 219, 219, 1) 1px solid",
            paddingBottom: "25px",
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

            {/* <Button
              componentType={"link"}
              bgColor={"transparent"}
              borderColor={"rgba(207, 207, 207, 1)"}
              textColor={"black"}
              style={{ borderRadius: "50px" }}
              href={`/boq/${project?.id}`}
            >
              BOQ <img src={externalLinkIcon} alt="external link" />
            </Button> */}
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
            <small>ID</small>
            <h2>RAY-{String(project?.id).padStart(5, "0")}</h2>
          </div>

          <div>
            <small>SIZE</small>
            <h2>{project?.size.toLocaleString("en-US")} SQFT</h2>
          </div>

          <div>
            <small>STATUS</small>
            <div
              className="approval-pill normal-text"
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
      </div>

      <br />
      <br />
      <br />
      <br />
      <br />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <h3>BILL OF QUANTITIES</h3>
        {userInfo?.departmentID === 8 ||
          (userInfo?.departmentID === 16 && (
            <CreateBoqHeaderButton
              project={project}
              onSuccess={() => fetchAllBoqsByProjectID()}
            />
          ))}
      </div>

      <br />

      {boqs?.length === 0 ? (
        <div>No bill of quantities created</div>
      ) : (
        <table className="items-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>CLIENT NAME</th>
              <th>LOCATION</th>
              <th>PAYMENT TERMS</th>
              <th>VALIDITY TERMS</th>
              <th>COMPLETION</th>
              <th>EXCLUSION</th>
              <th>TERMS & CONDITIONS</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {boqs?.map((item: BoqHeader, index: number) => (
              <tr key={index}>
                <td>BOQ-{String(item.id).padStart(5, "0")}</td>
                <td>{item.client_name ? item.client_name : "-"}</td>
                <td>{item.location ? item.location : "-"}</td>
                <td>
                  {item.payment_terms ? (
                    <InfoPopUpButton
                      text={item.payment_terms}
                      header={"PAYMENT TERMS"}
                    />
                  ) : (
                    "-"
                  )}
                </td>
                <td>
                  {item.validity_terms ? (
                    <InfoPopUpButton
                      text={item.validity_terms}
                      header={"VALIDITY TERMS"}
                    />
                  ) : (
                    "-"
                  )}
                </td>
                <td>
                  {item.completion ? (
                    <InfoPopUpButton
                      text={item.completion}
                      header={"COMPLETION"}
                    />
                  ) : (
                    "-"
                  )}
                </td>
                <td>
                  {item.exclusion ? (
                    <InfoPopUpButton
                      text={item.exclusion}
                      header={"EXCLUSION"}
                    />
                  ) : (
                    "-"
                  )}
                </td>
                <td>
                  {item.terms_and_conditions ? (
                    <InfoPopUpButton
                      text={item.terms_and_conditions}
                      header={"TERMS & CONDITIONS"}
                    />
                  ) : (
                    "-"
                  )}
                </td>
                <td>
                  <Button
                    componentType={"link"}
                    bgColor={"rgba(239, 239, 239, 1)"}
                    borderColor={"rgba(223, 223, 223, 1)"}
                    textColor={"black"}
                    style={{ padding: "7px 7px" }}
                    href={`/boq/${item.id}`}
                  >
                    <img src={externalLinkIcon} alt="external link" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

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
        <table className="items-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>REQUESTED BY</th>
              <th>DEPARTMENT</th>
              <th>REQUIRED DATE</th>
              <th>PURPOSE</th>
              <th>STATUS</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {mrs?.map((item: MrHeader, index: number) => (
              <tr key={index}>
                <td>MR-{String(item.id).padStart(5, "0")}</td>
                <td>{item.requested_by ? item.requested_by : "-"}</td>
                <td>{item.department_name ? item.department_name : "-"}</td>
                <td>
                  {item.required_date
                    ? new Date(item.required_date).toLocaleDateString("en-US")
                    : "-"}
                </td>
                <td>{item.purpose_name ? item.purpose_name : "-"}</td>
                <td>{item.progress_name}</td>
                <td>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    <Button
                      componentType={"link"}
                      bgColor={"rgba(239, 239, 239, 1)"}
                      borderColor={"rgba(223, 223, 223, 1)"}
                      textColor={"black"}
                      style={{ padding: "7px 7px" }}
                      href={`/mr/${item.id}`}
                    >
                      <img src={externalLinkIcon} alt="external link" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
