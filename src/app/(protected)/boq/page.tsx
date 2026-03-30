"use client";

import { useEffect, useState, useMemo } from "react";
import Button from "@/app/components/Button";
import { useAuth } from "@/app/context/AuthContext";
import { BoqHeader } from "../project/[id]/boq/[boqId]/types/boqHeader";
import { formatPrice } from "@/lib/formatPrice";

export default function Boq() {
  const { userInfo } = useAuth();

  const externalLinkIcon = "/icons/external-link.svg";
  const searchIcon = "/icons/search.svg";

  const canSeePrice =
    userInfo?.departmentID === 8 || userInfo?.departmentID === 16;

  const [boqs, setBoqs] = useState<BoqHeader[]>([]);

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<
    | "boq-number"
    | "project"
    | "total-items"
    | "total-cost"
    | "newest"
    | "oldest"
  >("boq-number");

  useEffect(() => {
    async function getAllBoqs() {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/boq/getAllBoqHeaders`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        },
      );
      const data = await response.json();
      setBoqs(data);
    }

    getAllBoqs();
  }, []);

  // Calculate total unique projects
  const totalProjects = useMemo(() => {
    const uniqueProjects = new Set(boqs.map((boq) => boq.project_id));
    return uniqueProjects.size;
  }, [boqs]);

  // ✅ Helper function to normalize search queries
  const normalizeSearchQuery = (
    query: string,
  ): { type: string; value: string; rawNumber?: number } => {
    const trimmed = query.trim().toLowerCase();

    // Check for BOQ-XXXX format
    const boqMatch = trimmed.match(/^boq-(\d+)$/);
    if (boqMatch) {
      return {
        type: "boq",
        value: boqMatch[1],
        rawNumber: parseInt(boqMatch[1], 10),
      };
    }

    // Check for RAY-XXXX format (project)
    const projectMatch = trimmed.match(/^ray-(\d+)$/);
    if (projectMatch) {
      return {
        type: "project",
        value: projectMatch[1],
        rawNumber: parseInt(projectMatch[1], 10),
      };
    }

    // Check for plain numbers
    const plainNumber = trimmed.match(/^(\d+)$/);
    if (plainNumber) {
      return {
        type: "number",
        value: plainNumber[1],
        rawNumber: parseInt(plainNumber[1], 10),
      };
    }

    // Generic text search
    return { type: "text", value: trimmed };
  };

  // ✅ Filter and sort BOQs
  const processedBoqs = useMemo(() => {
    let result = [...boqs];

    // Apply search filter
    if (searchQuery.trim() !== "") {
      const search = normalizeSearchQuery(searchQuery);

      result = result.filter((boq) => {
        const boqNumber = String(boq.id).padStart(5, "0");
        const projectNumber = String(boq.project_id).padStart(5, "0");

        const formattedBoq = `boq-${boqNumber}`;
        const formattedProject = `ray-${projectNumber}`;

        switch (search.type) {
          case "boq":
            // Match BOQ number (partial match: BOQ-1 matches BOQ-00001)
            return (
              boqNumber.includes(
                search.value.padStart(5, "0").slice(-search.value.length),
              ) ||
              boq.id === search.rawNumber ||
              formattedBoq.includes(search.value)
            );

          case "project":
            // Match Project number
            return (
              projectNumber.includes(
                search.value.padStart(5, "0").slice(-search.value.length),
              ) ||
              boq.project_id === search.rawNumber ||
              formattedProject.includes(search.value)
            );

          case "number":
            // Plain number - check all ID fields
            return (
              boq.id === search.rawNumber ||
              boq.project_id === search.rawNumber ||
              boqNumber.includes(search.value) ||
              projectNumber.includes(search.value)
            );

          case "text":
          default:
            // Text search on project name and client name
            const projectNameMatch = (boq.project_name || "")
              .toLowerCase()
              .includes(search.value);
            const clientNameMatch = (boq.client_name || "")
              .toLowerCase()
              .includes(search.value);
            // Also check formatted numbers as text
            const boqTextMatch = formattedBoq.includes(search.value);
            const projectTextMatch = formattedProject.includes(search.value);

            return (
              projectNameMatch ||
              clientNameMatch ||
              boqTextMatch ||
              projectTextMatch
            );
        }
      });
    }

    // Apply sorting
    switch (sortOrder) {
      case "boq-number":
        result.sort((a, b) => a.id - b.id);
        break;
      case "project":
        result.sort((a, b) =>
          (a.project_name || "").localeCompare(b.project_name || ""),
        );
        break;
      case "total-items":
        result.sort((a, b) => (a.total_items || 0) - (b.total_items || 0));
        break;
      case "total-cost":
        result.sort((a, b) => (a.total_value || 0) - (b.total_value || 0));
        break;
      case "newest":
        result.sort(
          (a, b) =>
            new Date(b.created_on || 0).getTime() -
            new Date(a.created_on || 0).getTime(),
        );
        break;
      case "oldest":
        result.sort(
          (a, b) =>
            new Date(a.created_on || 0).getTime() -
            new Date(b.created_on || 0).getTime(),
        );
        break;
    }

    return result;
  }, [boqs, searchQuery, sortOrder]);

  return (
    <>
      <div className="dashboard">
        <h1>BILL OF QUANTITIES</h1>

        <br />

        <div style={{ display: "flex", gap: "10px" }}>
          <div
            className="widget-container"
            style={{
              width: "300px",
              height: "150px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              borderRadius: "15px",
            }}
          >
            <h4>Total BOQs</h4>
            <h4 style={{ fontSize: "24px" }}>{processedBoqs.length}</h4>
          </div>
          <div
            className="widget-container"
            style={{
              width: "300px",
              height: "150px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              borderRadius: "15px",
            }}
          >
            <h4>Total Projects</h4>
            <h4 style={{ fontSize: "24px" }}>{totalProjects}</h4>
          </div>
        </div>

        <br />
        <br />

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <select
              value={sortOrder}
              onChange={(e) =>
                setSortOrder(
                  e.target.value as
                    | "boq-number"
                    | "project"
                    | "total-items"
                    | "total-cost"
                    | "newest"
                    | "oldest",
                )
              }
              style={{
                padding: "10px 15px",
                borderRadius: "50px",
                backgroundColor: "white",
                cursor: "pointer",
                border: "1px solid rgba(241, 244, 246, 1)",
              }}
            >
              <option value="boq-number">SORT BY BOQ NUMBER</option>
              <option value="project">SORT BY PROJECT</option>
              <option value="total-items">SORT BY TOTAL ITEMS</option>
              {canSeePrice && (
                <option value="total-cost">SORT BY TOTAL VALUE</option>
              )}

              <option value="newest">SORT BY NEWEST TO OLDEST BILLS</option>
              <option value="oldest">SORT BY OLDEST TO NEWEST BILLS</option>
            </select>
          </div>

          <div
            style={{
              maxWidth: "300px",
              backgroundColor: "white",
              position: "relative",
            }}
          >
            <input
              type="text"
              placeholder="SEARCH"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "300px",
                padding: "10px 40px 10px 15px",
                borderRadius: "8px",
                border: "1px solid rgba(223, 223, 223, 1)",
                fontSize: "14px",
              }}
            />
            <img
              src={searchIcon}
              alt="search"
              style={{
                position: "absolute",
                right: "15px",
                top: "50%",
                transform: "translateY(-50%)",
                width: "16px",
                height: "16px",
                opacity: 0.5,
              }}
            />
          </div>
        </div>

        <br />

        {processedBoqs.length > 0 ? (
          <table className="items-table two-toned">
            <thead>
              <tr>
                <th>#</th>
                <th>BOQ NUMBER</th>
                <th>PROJECT</th>
                <th>CLIENT NAME</th>
                <th>TOTAL ITEMS</th>
                {canSeePrice && <th>TOTAL VALUE</th>}
                <th>CREATION DATE</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {processedBoqs.map((boq, index) => (
                <tr key={boq.id}>
                  <td>{index + 1}</td>
                  <td>
                    <div
                      style={{
                        display: "flex",
                        gap: "10px",
                        alignItems: "center",
                      }}
                    >
                      BOQ-{String(boq.id).padStart(5, "0")}
                      {boq.is_draft ? (
                        <span
                          style={{
                            padding: "2px 10px",
                            backgroundColor: "rgba(234, 234, 234, 1)",
                            color: "rgba(89, 89, 89, 1)",
                            borderRadius: "50px",
                            fontSize: "10px",
                            fontWeight: "800",
                          }}
                        >
                          DRAFT
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td>{boq.project_name}</td>
                  <td>{boq.client_name || "-"}</td>
                  <td>{boq.total_items || "-"}</td>
                  {canSeePrice && (
                    <td>
                      {boq.currency} {formatPrice(boq.total_value)}
                    </td>
                  )}

                  <td>
                    {boq.created_on
                      ? new Date(boq.created_on).toLocaleDateString("en-GB")
                      : "-"}
                  </td>
                  <td>
                    <Button
                      componentType={"link"}
                      bgColor={"rgba(239, 239, 239, 1)"}
                      borderColor={"rgba(223, 223, 223, 1)"}
                      textColor={"black"}
                      href={`/project/${boq.project_id}/boq/${boq.id}`}
                      style={{ padding: "7px 7px" }}
                    >
                      <img src={externalLinkIcon} alt="view" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: "center", padding: "40px", color: "#888" }}>
            {searchQuery.trim() !== ""
              ? "No BOQs found matching your search"
              : "No BOQs found"}
          </div>
        )}
      </div>
    </>
  );
}
