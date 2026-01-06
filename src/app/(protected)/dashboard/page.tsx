"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/context/AuthContext";
import ActiveMrsWidget from "./components/manager/W_ActiveMrs";
import PendingApprovalMrsWidget from "./components/manager/W_PendingApprovalMrs";
import PendingPaymentMrsWidget from "./components/manager/W_PendingPaymentsMrs";
import PendingDeliveryMrsWidget from "./components/manager/W_PendingDeliveryMrs";
import OutboundPaymentMrsWidget from "./components/manager/W_OutboundPaymentMrs";
import ProjectBox from "@/app/components/ProjectBox";
import AlertsAndRiskMrsWidget from "./components/manager/W_AlertsAndRisksMrs";
import ExpectedDeliveriesWidget from "./components/manager/W_ExpectedDeliveries";
import AvgTimeSpentPerStageWidget from "./components/manager/W_AvgTimeSpentPerStage";
import MedianMRLifespanWidget from "./components/manager/W_MedianMrLifeSpan";

export default function Dashboard() {
  const bannerBackground = "/images/welcome-banner.jpg";

  const { userInfo } = useAuth();

  const [projects, setProjects] = useState<any[]>([]);
  const [projectsWithBOQ, setProjectsWithBOQ] = useState<any[]>([]);

  // Fetch Projects
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/projects`,
          { cache: "no-store" }
        );
        const data = await res.json();
        setProjects(data);
      } catch (err) {
        console.error("Failed to fetch projects", err);
      }
    };

    loadProjects();
  }, []);

  // Fetch BOQ for each project
  useEffect(() => {
    const loadBOQStatus = async () => {
      if (projects.length === 0) return;

      const enriched = await Promise.all(
        projects.map(async (proj) => {
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

      setProjectsWithBOQ(enriched);
    };

    loadBOQStatus();
  }, [projects]);

  return (
    <div className="dashboard">
      {/* BANNER */}
      <div
        className="banner-container"
        style={{
          backgroundImage: `url("${bannerBackground}")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          height: "150px",
          color: "white",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          paddingLeft: "40px",
          borderRadius: "10px",
        }}
      >
        <h3 style={{ fontWeight: "100", marginBottom: "3px" }}>Welcome back</h3>

        <h1>
          <span style={{ fontWeight: "100" }}>Maestro</span>{" "}
          <span style={{ fontWeight: "900" }}>
            {userInfo?.name?.split(" ")[0]}
          </span>
        </h1>
      </div>

      <br />
      <br />
      <br />

      {userInfo?.departmentID === 8 && (
        <>
          <h2>OVERVIEW</h2>
          <br />
          <div className="widget-grid overview five-col">
            <ActiveMrsWidget />
            <PendingApprovalMrsWidget />
            <PendingPaymentMrsWidget />
            <OutboundPaymentMrsWidget />
            <PendingDeliveryMrsWidget />
          </div>

          <br />
          <br />
          <br />

          <div className="widget-grid overview three-col">
            <AlertsAndRiskMrsWidget />
            <AvgTimeSpentPerStageWidget />
            <MedianMRLifespanWidget />
          </div>

          <br />
          <br />
          <br />

          <h2>ACTIVE PROJECTS</h2>
          <br />
          <div className="widget-grid active-projects">
            {projectsWithBOQ.slice(0, 3).map((proj: any, index) => (
              <ProjectBox proj={proj} key={index} />
            ))}
          </div>

          <br />
          <br />
          <br />

          <h2>EXPECTED DELIVERIES</h2>
          <br />
          <ExpectedDeliveriesWidget />
        </>
      )}
    </div>
  );
}
