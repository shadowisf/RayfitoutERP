"use client";

import { useState, useEffect } from "react";
import ProjectBox from "@/app/(protected)/project/components/ProjectBox";
import { useAuth } from "@/app/context/AuthContext";

export default function Project() {
  const { userInfo } = useAuth();

  const [projectsWithBOQ, setProjectsWithBOQ] = useState<any[]>([]);
  const [quotationProjects, setQuotationProjects] = useState<any[]>([]);

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

        const quotationProjects = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/projects/getAllQuotationProjects`,
          { cache: "no-store" }
        )
          .then((res) => res.json())
          .catch(() => []);

        setQuotationProjects(quotationProjects);

        setProjectsWithBOQ(projectsWithBOQData);
      } catch (error) {
        console.error("Error fetching projects:", error);
      }
    }

    fetchProjects();
  }, []);

  return (
    <div className="dashboard">
      <h2>PROJECTS</h2>

      <br />
      <br />
      <br />

      <h3>SIGNED</h3>
      <br />
      <div className="widget-grid active-projects">
        {projectsWithBOQ.map((proj: any, index) => (
          <ProjectBox proj={proj} key={index} />
        ))}
      </div>

      {(userInfo?.departmentID === 8 || userInfo?.departmentID === 16) && (
        <>
          <br />
          <br />
          <br />

          <h3>QUOTATION</h3>
          <br />
          <div className="widget-grid active-projects">
            {quotationProjects.map((proj: any, index) => (
              <ProjectBox proj={proj} key={index} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
