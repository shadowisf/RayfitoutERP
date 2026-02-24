"use client";

import { useEffect, useState, useMemo } from "react";
import { LpoHeader } from "../mr/[id]/types/lpoHeader";
import Button from "@/app/components/Button";

export default function Lpo() {
  const externalLinkIcon = "/icons/external-link.svg";
  const searchIcon = "/icons/search.svg";

  const [lpos, setLpos] = useState<LpoHeader[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<
    | "lpo-number"
    | "mr-number"
    | "project-number"
    | "vendor-name"
    | "newest"
    | "oldest"
  >("lpo-number"); // ✅ Default to LPO NUMBER

  useEffect(() => {
    async function getAllLpos() {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo/getAllLPOs`,
      );
      const data = await response.json();
      setLpos(data);
    }

    getAllLpos();
  }, []);

  // ✅ Helper function to normalize search queries
  const normalizeSearchQuery = (
    query: string,
  ): { type: string; value: string; rawNumber?: number } => {
    const trimmed = query.trim().toLowerCase();

    // Check for LPO-XXXX format
    const lpoMatch = trimmed.match(/^lpo-(\d+)$/);
    if (lpoMatch) {
      return {
        type: "lpo",
        value: lpoMatch[1],
        rawNumber: parseInt(lpoMatch[1], 10),
      };
    }

    // Check for MR-XXXX format
    const mrMatch = trimmed.match(/^mr-(\d+)$/);
    if (mrMatch) {
      return {
        type: "mr",
        value: mrMatch[1],
        rawNumber: parseInt(mrMatch[1], 10),
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

  // ✅ Filter and sort LPOs
  const processedLpos = useMemo(() => {
    let result = [...lpos];

    // Apply search filter
    if (searchQuery.trim() !== "") {
      const search = normalizeSearchQuery(searchQuery);

      result = result.filter((lpo) => {
        const lpoNumber = String(lpo.id).padStart(5, "0");
        const mrNumber = String(lpo.mr_header_id).padStart(5, "0");
        const projectNumber = String(lpo.project_id).padStart(5, "0");

        const formattedLpo = `lpo-${lpoNumber}`;
        const formattedMr = `mr-${mrNumber}`;
        const formattedProject = `ray-${projectNumber}`;

        switch (search.type) {
          case "lpo":
            return (
              lpoNumber.includes(
                search.value.padStart(5, "0").slice(-search.value.length),
              ) ||
              lpo.id === search.rawNumber ||
              formattedLpo.includes(search.value)
            );

          case "mr":
            return (
              mrNumber.includes(
                search.value.padStart(5, "0").slice(-search.value.length),
              ) ||
              lpo.mr_header_id === search.rawNumber ||
              formattedMr.includes(search.value)
            );

          case "project":
            return (
              projectNumber.includes(
                search.value.padStart(5, "0").slice(-search.value.length),
              ) ||
              lpo.project_id === search.rawNumber ||
              formattedProject.includes(search.value)
            );

          case "number":
            return (
              lpo.id === search.rawNumber ||
              lpo.mr_header_id === search.rawNumber ||
              lpo.project_id === search.rawNumber ||
              lpoNumber.includes(search.value) ||
              mrNumber.includes(search.value) ||
              projectNumber.includes(search.value)
            );

          case "text":
          default:
            const vendorMatch = (lpo.supplier_name || "")
              .toLowerCase()
              .includes(search.value);
            const contactMatch = (lpo.supplier_contact_person_name || "")
              .toLowerCase()
              .includes(search.value);
            const addressMatch = (lpo.supplier_address || "")
              .toLowerCase()
              .includes(search.value);
            const lpoTextMatch = formattedLpo.includes(search.value);
            const mrTextMatch = formattedMr.includes(search.value);
            const projectTextMatch = formattedProject.includes(search.value);

            return (
              vendorMatch ||
              contactMatch ||
              addressMatch ||
              lpoTextMatch ||
              mrTextMatch ||
              projectTextMatch
            );
        }
      });
    }

    // Apply sorting based on selected option
    switch (sortOrder) {
      case "lpo-number":
        result.sort((a, b) => a.id - b.id);
        break;
      case "mr-number":
        result.sort((a, b) => a.mr_header_id - b.mr_header_id);
        break;
      case "project-number":
        result.sort((a, b) => a.project_id - b.project_id);
        break;
      case "vendor-name":
        result.sort((a, b) =>
          (a.supplier_name || "").localeCompare(b.supplier_name || ""),
        );
        break;
      case "newest":
        result.sort(
          (a, b) =>
            new Date(b.created_at || 0).getTime() -
            new Date(a.created_at || 0).getTime(),
        );
        break;
      case "oldest":
        result.sort(
          (a, b) =>
            new Date(a.created_at || 0).getTime() -
            new Date(b.created_at || 0).getTime(),
        );
        break;
    }

    return result;
  }, [lpos, searchQuery, sortOrder]);

  return (
    <>
      <div className="dashboard">
        <h1>LOCAL PURCHASE ORDERS</h1>

        <br />

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
          <h4>Total LPOs</h4>
          <h4 style={{ fontSize: "24px" }}>{processedLpos.length}</h4>
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
                    | "lpo-number"
                    | "mr-number"
                    | "project-number"
                    | "vendor-name"
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
              <option value="lpo-number">SORT BY LPO NUMBER</option>
              <option value="mr-number">SORT BY MR NUMBER</option>
              <option value="project-number">SORT BY PROJECT NUMBER</option>
              <option value="vendor-name">SORT BY VENDOR NAME</option>
              <option value="newest">SORT BY NEWEST TO OLDEST ORDERS</option>
              <option value="oldest">SORT BY OLDEST TO NEWEST ORDERS</option>
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

        {processedLpos.length > 0 ? (
          <table className="items-table two-toned">
            <thead>
              <tr>
                <th>#</th>
                <th>MR NUMBER</th>
                <th>LPO NUMBER</th>
                <th>PROJECT NUMBER</th>
                <th>VENDOR NAME</th>
                <th>CONTACT PERSON</th>
                <th>ADDRESS</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {processedLpos.map((lpo, index) => (
                <tr key={lpo.id}>
                  <td>{index + 1}</td>
                  <td>MR-{String(lpo.mr_header_id).padStart(5, "0")}</td>
                  <td>LPO-{String(lpo.id).padStart(5, "0")}</td>
                  <td>
                    {lpo.project_id
                      ? `RAY-${String(lpo.project_id).padStart(5, "0")}`
                      : "-"}{" "}
                  </td>
                  <td>{lpo.supplier_name || "-"}</td>
                  <td>{lpo.supplier_contact_person_name || "-"}</td>
                  <td>{lpo.supplier_address || "-"}</td>
                  <td>
                    <Button
                      componentType={"link"}
                      bgColor={"rgba(239, 239, 239, 1)"}
                      borderColor={"rgba(223, 223, 223, 1)"}
                      textColor={"black"}
                      href={`/mr/${lpo.mr_header_id}/lpo/${lpo.id}`}
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
              ? "No LPOs found matching your search"
              : "No LPOs found"}
          </div>
        )}
      </div>
    </>
  );
}
