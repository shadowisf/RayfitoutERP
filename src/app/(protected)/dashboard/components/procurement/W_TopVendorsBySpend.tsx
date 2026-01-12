"use client";

import { useEffect, useState } from "react";

interface TopVendor {
  project_id: number;
  project_name: string;
  total: number;
}

export default function TopVendorsBySpendWidget() {
  const [projects, setProjects] = useState<TopVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredProjectId, setHoveredProjectId] = useState<number | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/dashboard/department/getProjectsWithMostMrs`
        ); // Update with your actual API route
        const data = await response.json();
        setProjects(data.slice(0, 3)); // Get top 3 projects
      } catch (error) {
        console.error("Error fetching project MR data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div
        style={{
          backgroundColor: "rgba(248, 249, 251, 1)",
          padding: "20px",
          borderRadius: "10px",

          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p style={{ color: "#737373" }}>Loading...</p>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div
        style={{
          backgroundColor: "rgba(248, 249, 251, 1)",
          padding: "20px",
          borderRadius: "10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p style={{ color: "#737373" }}>No data available</p>
      </div>
    );
  }

  // Calculate max value for bar width calculation
  const maxTotal = Math.max(...projects.map((p) => p.total));

  return (
    <div
      className="item"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <h3 style={{ margin: 0 }}>TOP PROJECT WITH MATERIAL REQUESTS</h3>

      <br />

      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {projects.map((project, index) => {
          // Calculate bar width as percentage of max value
          const widthPercentage = (project.total / maxTotal) * 100;

          return (
            <div
              key={project.project_id}
              style={{ width: "100%", position: "relative" }}
              onMouseEnter={() => setHoveredProjectId(project.project_id)}
              onMouseLeave={() => setHoveredProjectId(null)}
            >
              {/* Tooltip */}
              {hoveredProjectId === project.project_id && (
                <div
                  style={{
                    position: "absolute",
                    top: "-45px",
                    left: "75%",
                    transform: "translateX(-50%)",
                    backgroundColor: "rgba(0, 0, 0, 0.9)",
                    color: "white",
                    padding: "8px 12px",
                    borderRadius: "5px",
                    fontSize: "12px",
                    whiteSpace: "nowrap",
                    zIndex: 10,
                    pointerEvents: "none",
                  }}
                >
                  {project.total} Material Request
                  {project.total !== 1 ? "s" : ""}
                  {/* Triangle pointer */}
                  <div
                    style={{
                      position: "absolute",
                      bottom: "-5px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: 0,
                      height: 0,
                      borderLeft: "5px solid transparent",
                      borderRight: "5px solid transparent",
                      borderTop: "5px solid rgba(0, 0, 0, 0.9)",
                    }}
                  />
                </div>
              )}

              {/* Bar */}
              <div
                style={{
                  width: "100%",
                  height: "30px",
                  backgroundColor: "#E0E0E0",
                  borderRadius: "25px",
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    width: `${widthPercentage}%`,
                    height: "100%",
                    backgroundColor: "#00D68F",
                    borderRadius: "25px",
                  }}
                />
              </div>

              {/* Project Name */}
              <p
                style={{
                  margin: "8px 0 0 0",
                  textTransform: "uppercase",
                  color: "#000",
                }}
              >
                {project.project_name}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
