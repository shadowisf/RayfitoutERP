"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/context/AuthContext";
import ThreeDotsMenuButton from "@/app/components/_ThreeButtonsMenuButton";
import CreateSubcontractorButton from "./components/_CreateSubcontractorButton";
import EditSubcontractorButton from "./components/_EditSubcontractorButton";
import DeleteSubcontractorButton from "./components/_DeleteSubcontractorButton";

export default function Subcontractor() {
  const { userInfo } = useAuth();

  const searchIcon = "/icons/search.svg";

  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"" | "name" | "id">("");

  async function fetchSubcontractors() {
    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/subcontractor`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setSubcontractors(data);
      });
  }

  useEffect(() => {
    fetchSubcontractors();
  }, []);

  // Filter subcontractors based on search query
  const filteredSubcontractors = subcontractors.filter((subcontractor) => {
    const query = searchQuery.toLowerCase();
    return (
      subcontractor.name?.toLowerCase().includes(query) ||
      subcontractor.material_categories?.toLowerCase().includes(query) ||
      subcontractor.trn_number?.toLowerCase().includes(query) ||
      subcontractor.contact_person_name?.toLowerCase().includes(query) ||
      `SUB-${String(subcontractor.id).padStart(5, "0")}`
        .toLowerCase()
        .includes(query)
    );
  });

  // Sort filtered subcontractors
  const sortedSubcontractors = [...filteredSubcontractors].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return (a.name || "").localeCompare(b.name || "");
      case "id":
        return a.id - b.id;
      default:
        return 0;
    }
  });

  return (
    <div className="dashboard">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "20px",
        }}
      >
        <h1>SUBCONTRACTORS</h1>

        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "name" | "id")}
              style={{
                padding: "10px 15px",
                borderRadius: "8px",
                border: "1px solid rgba(223, 223, 223, 1)",
                fontSize: "14px",
                backgroundColor: "white",
                cursor: "pointer",
                minWidth: "150px",
              }}
            >
              <option value="" disabled>
                SORT BY
              </option>
              <option value="name">Name</option>
              <option value="id">ID</option>
            </select>
          </div>

          {(userInfo?.departmentID === 8 || userInfo?.departmentID === 9) && (
            <CreateSubcontractorButton
              onSuccess={() => fetchSubcontractors()}
            />
          )}

          <div
            style={{
              position: "relative",
              flex: 1,
              maxWidth: "400px",
              backgroundColor: "white",
            }}
          >
            <input
              type="text"
              placeholder="SEARCH"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "400px",
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
      </div>

      <br />
      <br />

      <table className="items-table two-toned">
        <thead>
          <tr>
            <th>#</th>
            <th>ID</th>
            <th>NAME</th>
            <th>MATERIAL CATEGORIES</th>
            <th>TRN</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {sortedSubcontractors.map((subcontractor, index) => {
            return (
              <tr key={subcontractor.id}>
                <td>{index + 1}</td>
                <td style={{ textWrap: "nowrap" }}>
                  SUB-{String(subcontractor.id).padStart(5, "0")}
                </td>
                <td>{subcontractor.name}</td>
                <td>{subcontractor.material_categories || "-"}</td>
                <td>{subcontractor.trn_number || "-"}</td>

                {(userInfo?.departmentID === 8 ||
                  userInfo?.departmentID === 9) && (
                  <td>
                    <div
                      style={{
                        display: "flex",
                        gap: "10px",
                        alignItems: "center",
                      }}
                    >
                      <ThreeDotsMenuButton>
                        <EditSubcontractorButton
                          subcontractor={subcontractor}
                          onSuccess={() => fetchSubcontractors()}
                        />
                        <DeleteSubcontractorButton
                          subcontractor={subcontractor}
                          onSuccess={() => fetchSubcontractors()}
                        />
                      </ThreeDotsMenuButton>
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
