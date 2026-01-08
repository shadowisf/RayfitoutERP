"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/app/context/AuthContext";
import ProjectBox from "@/app/(protected)/project/components/ProjectBox";

export default function Project() {
  const [projectsWithBOQ, setProjectsWithBOQ] = useState<any[]>([]);

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

      <div className="widget-grid active-projects">
        {projectsWithBOQ.map((proj: any, index) => (
          <ProjectBox proj={proj} key={index} />
        ))}
      </div>
    </div>
  );
}
