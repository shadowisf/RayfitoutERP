"use client";

import { useState, useEffect } from "react";
import ProjectCard from "@/app/(protected)/project/components/ProjectCard";
import { useAuth } from "@/app/context/AuthContext";

export default function Project() {
  const { userInfo } = useAuth();

  const [projectsWithBOQ, setProjectsWithBOQ] = useState<any[]>([]);
  const [quotationProjects, setQuotationProjects] = useState<any[]>([]);
  const [collapsedSigned, setCollapsedSigned] = useState(false);
  const [collapsedQuotation, setCollapsedQuotation] = useState(false);

  async function fetchProjects() {
    try {
      const projects = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/projects`,
        { cache: "no-store" },
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
            },
          )
            .then((res) => res.json())
            .catch(() => []);

          return {
            ...proj,
            hasBOQ: boq && boq.length > 0,
          };
        }),
      );

      const quotationProjectsData = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/projects/getAllQuotationProjects`,
        { cache: "no-store" },
      )
        .then((res) => res.json())
        .catch(() => []);

      setQuotationProjects(quotationProjectsData);
      setProjectsWithBOQ(projectsWithBOQData);
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  }

  useEffect(() => {
    fetchProjects();
  }, []);

  return (
    <div className="dashboard">
      <h1>PROJECTS</h1>

      <br />
      <br />
      <br />

      {/* ── SIGNED ─────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "15px",
          marginBottom: collapsedSigned ? "0px" : "20px",
          cursor: "pointer",
          userSelect: "none",
        }}
        onClick={() => setCollapsedSigned((v) => !v)}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            transition: "transform 0.2s ease",
            transform: collapsedSigned ? "rotate(-90deg)" : "rotate(0deg)",
            flexShrink: 0,
          }}
        >
          <path
            d="M3.5 5.25L7 8.75L10.5 5.25"
            stroke="black"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        <h2 style={{ margin: 0 }}>SIGNED</h2>

        <div
          style={{
            backgroundColor: "black",
            color: "white",
            borderRadius: "50px",
            padding: "3px 12px",
            fontWeight: "600",
            fontSize: "14px",
          }}
        >
          {projectsWithBOQ.length} Project
          {projectsWithBOQ.length !== 1 ? "s" : ""}
        </div>
      </div>

      {!collapsedSigned && (
        <div className="widget-grid active-projects">
          {projectsWithBOQ.map((proj: any, index) => (
            <ProjectCard project={proj} key={index} />
          ))}
        </div>
      )}

      {/* ── QUOTATION ──────────────────────────────────────────────────────── */}
      {(userInfo?.departmentID === 8 || userInfo?.departmentID === 16) && (
        <>
          <br />
          <br />
          <br />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "15px",
              marginBottom: collapsedQuotation ? "0px" : "20px",
              cursor: "pointer",
              userSelect: "none",
            }}
            onClick={() => setCollapsedQuotation((v) => !v)}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{
                transition: "transform 0.2s ease",
                transform: collapsedQuotation
                  ? "rotate(-90deg)"
                  : "rotate(0deg)",
                flexShrink: 0,
              }}
            >
              <path
                d="M3.5 5.25L7 8.75L10.5 5.25"
                stroke="black"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            <h2 style={{ margin: 0 }}>QUOTATION</h2>

            <div
              style={{
                backgroundColor: "black",
                color: "white",
                borderRadius: "50px",
                padding: "3px 12px",
                fontWeight: "600",
                fontSize: "14px",
              }}
            >
              {quotationProjects.length} Project
              {quotationProjects.length !== 1 ? "s" : ""}
            </div>
          </div>

          {!collapsedQuotation && (
            <div className="widget-grid active-projects">
              {quotationProjects.map((proj: any, index) => (
                <ProjectCard
                  project={proj}
                  key={index}
                  onSuccess={() => fetchProjects()}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
