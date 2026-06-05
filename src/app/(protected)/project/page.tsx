"use client";

import React, { useState, useEffect } from "react";
import ProjectCard from "@/app/(protected)/project/components/ProjectCard";
import NewProjectButton from "@/app/(protected)/project/components/_NewProjectButton";
import { useAuth } from "@/app/context/AuthContext";

const SHIMMER: React.CSSProperties = {
  background: "linear-gradient(90deg, rgba(0,0,0,0.06) 25%, rgba(0,0,0,0.10) 37%, rgba(0,0,0,0.06) 63%)",
  backgroundSize: "600px 100%",
  animation: "shimmer 1.4s ease infinite",
  borderRadius: "6px",
};

function SkeletonBlock({ w = "100%", h = 12, style }: { w?: string | number; h?: number; style?: React.CSSProperties }) {
  return <div style={{ width: w, height: h, ...SHIMMER, ...style }} />;
}

function SkeletonCard() {
  return (
    <div style={{ backgroundColor: "white", borderRadius: "15px", padding: "20px", display: "flex", flexDirection: "column" }}>
      {/* NAME + STATUS */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
        <div style={{ flex: 1 }}>
          <SkeletonBlock w="40px" h={9} style={{ marginBottom: "6px" }} />
          <SkeletonBlock w="72%" h={20} />
        </div>
        <SkeletonBlock w="90px" h={28} style={{ borderRadius: "50px", flexShrink: 0, marginLeft: "12px", marginTop: "4px" }} />
      </div>

      {/* VALUE + BUDGET */}
      <div style={{ display: "flex", gap: "24px", marginBottom: "10px" }}>
        <div>
          <SkeletonBlock w="38px" h={9} style={{ marginBottom: "5px" }} />
          <SkeletonBlock w="120px" h={16} />
        </div>
        <div>
          <SkeletonBlock w="44px" h={9} style={{ marginBottom: "5px" }} />
          <SkeletonBlock w="110px" h={16} />
        </div>
      </div>

      {/* SPEND TO DATE */}
      <div style={{ marginBottom: "16px" }}>
        <SkeletonBlock w="75px" h={9} style={{ marginBottom: "5px" }} />
        <SkeletonBlock w="180px" h={16} />
      </div>

      {/* PROGRESS */}
      <div style={{ marginBottom: "16px" }}>
        <SkeletonBlock w="55px" h={9} style={{ marginBottom: "6px" }} />
        {/* Bar — matches real: height 25px, borderRadius 25px */}
        <div style={{ width: "100%", height: "25px", backgroundColor: "rgba(238,238,238,1)", borderRadius: "25px", overflow: "hidden", position: "relative", marginBottom: "8px" }}>
          <div style={{ position: "absolute", left: 0, top: 0, width: "45%", height: "100%", backgroundColor: "rgba(210,210,210,1)", borderRadius: "25px" }} />
          <div style={{ position: "absolute", left: 0, top: 0, width: "25%", height: "100%", backgroundColor: "rgba(190,190,190,1)", borderRadius: "25px" }} />
        </div>
        {/* Legend */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {[
            { color: "rgba(190,190,190,1)" },
            { color: "rgba(210,210,210,1)" },
            { color: "rgba(238,238,238,1)" },
          ].map(({ color }, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "12px", height: "12px", backgroundColor: color, borderRadius: "50%", flexShrink: 0 }} />
              <SkeletonBlock w="52px" h={9} />
            </div>
          ))}
        </div>
      </div>

      <br />

      {/* VIEW button — matches bgColor rgba(239,239,239,1) */}
      <div style={{ height: "40px", borderRadius: "10px", backgroundColor: "rgba(239,239,239,1)" }} />
    </div>
  );
}

function SkeletonLayout() {
  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "48px" }}>
        <div>
          <SkeletonBlock w="160px" h={28} style={{ marginBottom: "16px" }} />
          <SkeletonBlock w="220px" h={14} />
        </div>
        <SkeletonBlock w="140px" h={38} style={{ borderRadius: "8px" }} />
      </div>

      {/* SIGNED section header */}
      <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "20px" }}>
        <SkeletonBlock w="14px" h={14} style={{ borderRadius: "3px", flexShrink: 0 }} />
        <SkeletonBlock w="80px" h={18} />
        <SkeletonBlock w="80px" h={26} style={{ borderRadius: "50px" }} />
      </div>

      {/* Cards grid */}
      <div className="widget-grid active-projects">
        {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    </div>
  );
}

export default function Project() {
  const { userInfo } = useAuth();

  const [projectsWithBOQ, setProjectsWithBOQ] = useState<any[]>([]);
  const [quotationProjects, setQuotationProjects] = useState<any[]>([]);
  const [collapsedSigned, setCollapsedSigned] = useState(false);
  const [collapsedQuotation, setCollapsedQuotation] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

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
    } finally {
      setIsFetching(false);
    }
  }

  useEffect(() => {
    fetchProjects();
  }, []);

  return (
    <div className="dashboard">
      {isFetching ? <SkeletonLayout /> : (<>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
        }}
      >
        <div>
          <h1>PROJECTS</h1>

          <br />
          <br />

          <h2 style={{ color: "rgba(120, 120, 120, 1)" }}>
            Showing {projectsWithBOQ.length} Project
            {projectsWithBOQ.length !== 1 ? "s" : ""} &{" "}
            {quotationProjects.length} Quotation
            {quotationProjects.length !== 1 ? "s" : ""}
          </h2>
        </div>
        <NewProjectButton />
      </div>

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
      </>)}
    </div>
  );
}
