"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/context/AuthContext";
import ActiveMrsWidget from "./components/manager/W_ActiveMrs";
import PendingApprovalMrsWidget from "./components/W_PendingApprovalMrs";
import PendingPaymentMrsWidget from "./components/W_PendingPaymentsMrs";
import PendingDeliveryMrsWidget from "./components/manager/W_PendingDeliveryMrs";
import OutboundPaymentMrsWidget from "./components/manager/W_OutboundPaymentMrs";
import ProjectBox from "@/app/(protected)/project/components/ProjectBox";
import AlertsAndRiskMrsWidget from "./components/manager/W_AlertsAndRisksMrs";
import ExpectedDeliveriesWidget from "./components/W_ExpectedDeliveries";
import AvgTimeSpentPerStageWidget from "./components/manager/W_AvgTimeSpentPerStage";
import MedianMRLifespanWidget from "./components/manager/W_MedianMrLifeSpan";
import PendingQuotationsMrsWidget from "./components/procurement/W_PendingQuotations";
import DraftMrsWidget from "./components/department/W_DraftMrs";

export default function Dashboard() {
  const bannerBackground = "/images/welcome-banner.jpg";

  const { userInfo } = useAuth();

  const [projects, setProjects] = useState<any[]>([]);
  const [projectsWithBOQ, setProjectsWithBOQ] = useState<any[]>([]);

  const DEPARTMENT_IDS = [1, 2, 3, 4, 5, 6, 7, 13, 14, 16];

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

      {/* MANAGER */}
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

          <div className="widget-grid">
            <div></div> {/* active project allocated budget  */}
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

          <ExpectedDeliveriesWidget />
        </>
      )}

      {/* PROCUREMENT */}
      {userInfo?.departmentID === 9 && (
        <>
          <h2>OVERVIEW</h2>
          <br />
          <div className="widget-grid overview five-col">
            <PendingQuotationsMrsWidget />
            <PendingPaymentMrsWidget />
            <div></div>
            <div></div>
            <PendingDeliveryMrsWidget />
          </div>

          <br />
          <br />
          <br />

          <div className="widget-grid overview two-col">
            <div></div> {/* Top Vendors by QC Performance */}
            <div></div> {/* Top Vendors by Spend */}
          </div>

          <br />
          <br />
          <br />

          <div className="widget-grid overview two-col">
            <div></div> {/* Top Vendors by Order Volume */}
            <div></div> {/* Top Vendors with Delivery Rate */}
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

          <div className="widget-grid">
            <div></div> {/* Active project allocated budget */}
          </div>

          <br />
          <br />
          <br />

          <ExpectedDeliveriesWidget />
        </>
      )}

      {/* DEPARTMENT */}
      {DEPARTMENT_IDS.includes(Number(userInfo?.departmentID)) && (
        <>
          <h2>OVERVIEW</h2>

          <br />

          <div className="widget-grid overview four-col">
            <DraftMrsWidget />
            <PendingPaymentMrsWidget />
            <PendingApprovalMrsWidget />
            <PendingDeliveryMrsWidget />
          </div>

          <br />
          <br />
          <br />

          <div className="widget-grid overview two-col">
            <div></div> {/* MR REJECTED, MR COMPLETED */}
            <div></div> {/* TOP PROJECTS WITH MR REQUESTS */}
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
        </>
      )}
    </div>
  );
}
