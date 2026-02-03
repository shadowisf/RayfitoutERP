"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/context/AuthContext";
import ActiveMrsWidget from "./components/manager/W_ActiveMrs";
import PendingApprovalMrsWidget from "./components/W_PendingApprovalMrs";
import PendingPaymentMrsWidget from "./components/W_PendingPaymentsMrs";
import PendingDeliveryMrsWidget from "./components/manager/W_PendingDeliveryMrs";
import OutboundPaymentMrsWidget from "./components/manager/W_OutboundPaymentMrs";
import ProjectCard from "@/app/(protected)/project/components/ProjectCard";
import AlertsAndRiskMrsWidget from "./components/manager/W_AlertsAndRisksMrs";
import ExpectedDeliveriesWidget from "./components/W_ExpectedDeliveries";
import AvgTimeSpentPerStageWidget from "./components/manager/W_AvgTimeSpentPerStage";
import MedianMRLifespanWidget from "./components/manager/W_MedianMrLifeSpan";
import PendingQuotationsMrsWidget from "./components/procurement/W_PendingQuotations";
import DraftMrsWidget from "./components/department/W_DraftMrs";
import MrsRejectedCompleted from "./components/department/W_MrsRejectedCompleted";
import TopProjectsWithMrs from "./components/department/W_TopProjectsWithMrs";
import BudgetAllocationGraph from "./components/manager/W_ProjectBudget";
import Button from "@/app/components/Button";
import PendingIncompleteDeliveriesWidget from "./components/procurement/W_OverdueDeliveries";
import TopVendorsBySpendWidget from "./components/W_TopVendorsBySpend";
import TopVendorsByVolumeWidget from "./components/procurement/W_TopVendorsByVolume";
import TotalSpentWidget from "./components/finance/W_TotalSpent";
import AvgPaymentTimeWidget from "./components/finance/W_AvgPaymentTime";
import RisksAndExceptionFlagsWidget from "./components/finance/W_RisksAndExceptionFlags";
import TopMaterialsBySpendingChart from "./components/finance/W_TopMaterialsBySpend";
import PriceTrendSignalsWidget from "./components/finance/W_PriceTrendSignals";

export default function Dashboard() {
  const bannerBackground = "/images/welcome-banner.jpg";

  const { userInfo } = useAuth();

  const [projects, setProjects] = useState<any[]>([]);
  const [overviewFilter, setOverviewFilter] = useState(7);

  const DEPARTMENT_IDS = [1, 2, 3, 4, 5, 6, 7, 13, 14, 16];

  // Fetch Projects
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/projects`,
          { cache: "no-store" },
        );
        const data = await res.json();
        setProjects(data);
      } catch (err) {
        console.error("Failed to fetch projects", err);
      }
    };

    loadProjects();
  }, []);

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
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h2>OVERVIEW</h2>
            <select
              onChange={(e) => setOverviewFilter(Number(e.target.value))}
              value={overviewFilter}
              style={{
                width: "150px",
                backgroundColor: "white",
                borderRadius: "50px",
              }}
            >
              <option value={7}>Last 7 Days</option>
              <option value={14}>Last 14 Days</option>
              <option value={30}>Last month</option>
            </select>
          </div>
          <br />
          <div className="widget-grid overview five-col">
            <ActiveMrsWidget filterDays={overviewFilter} />
            <PendingApprovalMrsWidget filterDays={overviewFilter} />
            <PendingPaymentMrsWidget filterDays={overviewFilter} />
            <OutboundPaymentMrsWidget filterDays={overviewFilter} />
            <PendingDeliveryMrsWidget filterDays={overviewFilter} />
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
          <div className="widget-grid">{/* <BudgetAllocationGraph /> */}</div>
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
            <h2>ACTIVE PROJECTS</h2>
            <Button
              componentType={"link"}
              bgColor={"white"}
              borderColor={"white"}
              textColor={"black"}
              style={{ borderRadius: "50px" }}
              href="/project"
            >
              View All Projects &gt;
            </Button>
          </div>
          <br />
          <div className="widget-grid active-projects">
            {projects.slice(0, 3).map((proj: any, index) => (
              <ProjectCard project={proj} key={index} />
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
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h2>OVERVIEW</h2>
            <select
              onChange={(e) => setOverviewFilter(Number(e.target.value))}
              value={overviewFilter}
              style={{
                width: "150px",
                backgroundColor: "white",
                borderRadius: "50px",
              }}
            >
              <option value={7}>Last 7 Days</option>
              <option value={14}>Last 14 Days</option>
              <option value={30}>Last month</option>
            </select>
          </div>
          <br />
          <div className="widget-grid overview four-col">
            <PendingQuotationsMrsWidget filterDays={overviewFilter} />
            <PendingPaymentMrsWidget filterDays={overviewFilter} />
            <PendingIncompleteDeliveriesWidget filterDays={overviewFilter} />
            <PendingDeliveryMrsWidget filterDays={overviewFilter} />
          </div>
          <br />
          <br />
          <br />
          <div className="widget-grid overview two-col">
            <TopVendorsByVolumeWidget filterDays={overviewFilter} />
            <TopVendorsBySpendWidget />
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
            {projects.slice(0, 3).map((proj: any, index) => (
              <ProjectCard project={proj} key={index} />
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

      {/* FINANCE */}
      {userInfo?.departmentID === 10 && (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h2>OVERVIEW</h2>
            <select
              onChange={(e) => setOverviewFilter(Number(e.target.value))}
              value={overviewFilter}
              style={{
                width: "150px",
                backgroundColor: "white",
                borderRadius: "50px",
              }}
            >
              <option value={7}>Last 7 Days</option>
              <option value={14}>Last 14 Days</option>
              <option value={30}>Last month</option>
            </select>
          </div>
          <br />
          <div className="widget-grid overview four-col">
            <TotalSpentWidget filterDays={overviewFilter} />
            <PendingPaymentMrsWidget filterDays={overviewFilter} />
            <AvgPaymentTimeWidget filterDays={overviewFilter} />
            <PendingDeliveryMrsWidget filterDays={overviewFilter} />
          </div>
          <br />
          <br />
          <br />
          <div className="widget-grid overview two-col">
            <RisksAndExceptionFlagsWidget />
            <TopMaterialsBySpendingChart />
            <TopVendorsBySpendWidget />
            <PriceTrendSignalsWidget />
          </div>
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
            <h2>ACTIVE PROJECTS</h2>
            <Button
              componentType={"link"}
              bgColor={"white"}
              borderColor={"white"}
              textColor={"black"}
              style={{ borderRadius: "50px" }}
              href="/project"
            >
              View All Projects &gt;
            </Button>
          </div>
          <br />
          <div className="widget-grid active-projects">
            {projects.slice(0, 3).map((proj: any, index) => (
              <ProjectCard project={proj} key={index} />
            ))}
          </div>
        </>
      )}

      {/* DEPARTMENT */}
      {DEPARTMENT_IDS.includes(Number(userInfo?.departmentID)) && (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h2>OVERVIEW</h2>
            <select
              onChange={(e) => setOverviewFilter(Number(e.target.value))}
              value={overviewFilter}
              style={{
                width: "150px",
                backgroundColor: "white",
                borderRadius: "50px",
              }}
            >
              <option value={7}>Last 7 Days</option>
              <option value={14}>Last 14 Days</option>
              <option value={30}>Last month</option>
            </select>
          </div>
          <br />
          <div className="widget-grid overview four-col">
            <DraftMrsWidget filterDays={overviewFilter} />
            <PendingPaymentMrsWidget filterDays={overviewFilter} />
            <PendingApprovalMrsWidget filterDays={overviewFilter} />
            <PendingDeliveryMrsWidget filterDays={overviewFilter} />
          </div>
          <br />
          <br />
          <br />
          <div className="widget-grid overview two-col">
            <MrsRejectedCompleted />
            <TopProjectsWithMrs />
          </div>
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
            <h2>ACTIVE PROJECTS</h2>
            <Button
              componentType={"link"}
              bgColor={"white"}
              borderColor={"white"}
              textColor={"black"}
              style={{ borderRadius: "50px" }}
              href="/project"
            >
              View All Projects &gt;
            </Button>
          </div>
          <br />
          <div className="widget-grid active-projects">
            {projects.slice(0, 3).map((proj: any, index) => (
              <ProjectCard project={proj} key={index} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
