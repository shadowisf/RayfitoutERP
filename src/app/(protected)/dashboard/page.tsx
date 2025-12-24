"use client";

import { useEffect, useState } from "react";
import Button from "@/app/components/Button";
import { useAuth } from "@/app/context/AuthContext";

export default function Dashboard() {
  const file_icon = "/icons/file.svg";
  const external_link_icon = "/icons/external-link.svg";
  const bannerBackground = "/images/welcome-banner.jpg";

  const { userInfo } = useAuth();

  const [projects, setProjects] = useState<any[]>([]);
  const [projectsWithBOQ, setProjectsWithBOQ] = useState<any[]>([]);

  useEffect(() => {
    // Temporarily add this to see what's being used
    console.log("DB Host:", process.env.DB_HOST);
    console.log("DB User:", process.env.DB_USER);
    console.log("DB Name:", process.env.DB_NAME);
    console.log("DB Password exists:", !!process.env.DB_PASSWORD);
  }, []);

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
        <h2 style={{ fontSize: "14px", marginBottom: "3px" }}>Welcome back</h2>

        <h2 style={{ fontSize: "24px" }}>Maestro {userInfo?.name}</h2>
      </div>

      <br />
      <br />
      <br />

      <h2>OVERVIEW</h2>
      <br />

      {/* OVERVIEW GRID */}
      <div className="widget-grid overview">
        {[1, 2, 3, 4].map((i) => (
          <div className="item" key={i}>
            <div className="icon">
              <img src={file_icon} alt="file icon" />
            </div>
            <div>
              <p className="number">17</p>
              <p className="label">TOTAL MRS THIS WEEK</p>
            </div>
          </div>
        ))}
      </div>

      <br />
      <br />
      <br />

      <h2>ACTIVE PROJECTS</h2>
      <br />

      {/* PROJECTS GRID */}
      <div className="widget-grid active-projects">
        {projectsWithBOQ.map((proj: any) => (
          <div className="item" key={proj.id}>
            <span
              className="status"
              style={
                proj.status === "Completed"
                  ? {
                      backgroundColor: "rgba(134,241,181,1)",
                      color: "rgba(52,100,73,1)",
                    }
                  : {
                      backgroundColor: "rgba(255, 250, 189, 1)",
                      color: "rgba(134, 83, 47, 1)",
                    }
              }
            >
              {proj.status === "Completed" ? "COMPLETED" : "ONGOING"}
            </span>

            <div>
              <span>Name</span>
              <p>{proj.name}</p>
              <br />
              <span>Budget</span>
              <p>
                AED{" "}
                {Number(proj.quoted_budget).toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>

            <br />

            <div style={{ display: "flex", justifyContent: "space-between" }}>
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
