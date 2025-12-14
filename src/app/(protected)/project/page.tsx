"use client";

import { useState, useEffect } from "react";
import Button from "@/app/components/Button";
import { useAuth } from "@/app/context/AuthContext";

export default function Project() {
  const { userInfo } = useAuth();
  const external_link_icon = "/icons/external-link.svg";

  const [projectsWithBOQ, setProjectsWithBOQ] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProjects() {
      try {
        const projects = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/projects`,
          { cache: "no-store" }
        ).then((res) => res.json());

        const projectsWithBOQData = await Promise.all(
          projects.map(async (proj: any) => {
            const boq = await fetch(
              `${process.env.NEXT_PUBLIC_BASE_URL}/api/boq/getBoqHeaderByProjectID`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: proj.id }),
                cache: "no-store",
              }
            )
              .then((res) => res.json())
              .catch(() => []);

            return {
              ...proj,
              hasBOQ: boq && boq.length > 0,
            };
          })
        );

        setProjectsWithBOQ(projectsWithBOQData);
      } catch (error) {
        console.error("Error fetching projects:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchProjects();
  }, []);

  if (loading) {
    return (
      <div className="dashboard">
        <h2>PROJECTS</h2>
        <br />
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <h2>PROJECTS</h2>
      <br />

      <div className="widget-grid active-projects">
        {projectsWithBOQ.map((proj: any) => (
          <div className="item" key={proj.id}>
            <small
              className="status"
              style={
                proj.status === "Completed"
                  ? {
                      backgroundColor: "rgba(230, 245, 230, 1)",
                      color: "rgba(60, 120, 60, 1)",
                    }
                  : {
                      backgroundColor: "rgba(255, 250, 189, 1)",
                      color: "rgba(134, 83, 47, 1)",
                    }
              }
            >
              {proj.status === "Completed" ? "COMPLETED" : "ONGOING"}
            </small>

            <div>
              <div>
                <small>Name</small>
                <h3>{proj.name}</h3>
              </div>

              <br />

              <div>
                <small>Budget</small>
                <h3>
                  AED{" "}
                  {Number(proj.quoted_budget).toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2,
                  })}
                </h3>
              </div>
            </div>

            <br />

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              {proj.hasBOQ || userInfo?.departmentID === 8 ? (
                <Button
                  componentType={"link"}
                  bgColor={"rgba(239, 239, 239, 1)"}
                  borderColor={"rgba(223, 223, 223, 1)"}
                  textColor={"black"}
                  href={`boq/${proj.id}`}
                  full={false}
                >
                  <>
                    {proj.hasBOQ ? "VIEW BOQ" : "CREATE BOQ"}
                    <img src={external_link_icon} alt="external link icon" />
                  </>
                </Button>
              ) : (
                <div style={{ width: "1px" }}></div>
              )}

              <Button
                componentType={"link"}
                bgColor={"rgba(29, 44, 66, 1)"}
                borderColor={"rgba(29, 44, 66, 1)"}
                textColor={"white"}
                full={false}
                href={`project/${proj.id}`}
              >
                {`VIEW`}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
