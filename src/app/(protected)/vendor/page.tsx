"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/app/context/AuthContext";
import ThreeDotsMenuButton from "@/app/components/_ThreeButtonsMenuButton";
import CreateSubcontractorButton from "./components/_CreateSubcontractorButton";
import EditSubcontractorButton from "./components/_EditSubcontractorButton";
import DeleteSubcontractorButton from "./components/_DeleteSubcontractorButton";
import Button from "@/app/components/Button";
import { useRouter } from "next/navigation";
import CreateSupplierButton from "../vendor/components/_CreateSupplierButton";
import DeleteSupplierButton from "../vendor/components/_DeleteSupplierButton";
import EditSupplierButton from "../vendor/components/_EditSupplierButton";
import VendorFilterButton from "../vendor/components/_VendorFilterButton";
import SubcontractorFilterButton from "./components/_SubcontractorFilterButton";
import { Supplier } from "../vendor/types/supplier";

export default function VendorManagement() {
  const { userInfo } = useAuth();
  const router = useRouter();

  const externalLinkIcon = "/icons/external-link.svg";
  const searchIcon = "/icons/search.svg";

  const [activeTab, setActiveTab] = useState<"vendors" | "subcontractors">(
    "vendors",
  );

  // ─── Vendor state ───
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [vendorSearchQuery, setVendorSearchQuery] = useState("");
  // Default to "name" for alphabetical sorting by supplier name
  const [vendorSortBy, setVendorSortBy] = useState<"name" | "id" | "type">(
    "name",
  );
  const [vendorFilters, setVendorFilters] = useState<{
    selectedTypes: string[];
    selectedMaterialCategories: string[];
  }>({
    selectedTypes: [],
    selectedMaterialCategories: [],
  });

  // ─── Subcontractor state ───
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [subSearchQuery, setSubSearchQuery] = useState("");
  // Default to "name" for alphabetical sorting by subcontractor name
  const [subSortBy, setSubSortBy] = useState<"name" | "id">("name");
  const [subFilters, setSubFilters] = useState<{
    selectedScopes: string[];
    selectedProjects: string[];
  }>({
    selectedScopes: [],
    selectedProjects: [],
  });

  // ─── Check URL params on mount ───
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get("tab");
    if (tab === "subcontractors") {
      setActiveTab("subcontractors");
    }
  }, []);

  // ─── Fetch suppliers ───
  async function fetchSuppliers() {
    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/supplier`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    })
      .then((res) => res.json())
      .then((data) => setSuppliers(data));
  }

  // ─── Fetch subcontractors ───
  async function fetchSubcontractors() {
    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/subcontractor`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    })
      .then((res) => res.json())
      .then((data) => setSubcontractors(data));
  }

  useEffect(() => {
    fetchSuppliers();
    fetchSubcontractors();
  }, []);

  // ─── Extract unique vendor types and material categories ───
  const vendorTypes = useMemo(() => {
    const types = new Set<string>();
    suppliers.forEach((s) => {
      if (s.type) types.add(s.type);
    });
    return Array.from(types).sort();
  }, [suppliers]);

  const vendorMaterialCategories = useMemo(() => {
    const categories = new Set<string>();
    suppliers.forEach((s) => {
      if (s.material_categories) {
        s.material_categories
          .split(",")
          .map((c) => c.trim())
          .filter((c) => c)
          .forEach((c) => categories.add(c));
      }
    });
    return Array.from(categories).sort();
  }, [suppliers]);

  // ─── Vendor filter & sort ───
  const filteredSuppliers = suppliers.filter((supplier) => {
    // Apply type filter
    if (vendorFilters.selectedTypes.length > 0) {
      if (!vendorFilters.selectedTypes.includes(supplier.type)) {
        return false;
      }
    }

    // Apply material category filter
    if (vendorFilters.selectedMaterialCategories.length > 0) {
      const supplierCategories = supplier.material_categories
        ? supplier.material_categories
            .split(",")
            .map((c) => c.trim())
            .filter((c) => c)
        : [];
      const hasMatchingCategory = supplierCategories.some((cat) =>
        vendorFilters.selectedMaterialCategories.includes(cat),
      );
      if (!hasMatchingCategory) {
        return false;
      }
    }

    // Apply search
    const query = vendorSearchQuery.toLowerCase();
    if (query) {
      return (
        supplier.name?.toLowerCase().includes(query) ||
        supplier.type?.toLowerCase().includes(query) ||
        supplier.material_categories?.toLowerCase().includes(query) ||
        supplier.material_subcategories?.toLowerCase().includes(query) ||
        supplier.trn_number?.toLowerCase().includes(query) ||
        `VEN-${String(supplier.id).padStart(5, "0")}`
          .toLowerCase()
          .includes(query)
      );
    }

    return true;
  });

  // Fixed sorting: always apply a sort, defaulting to name
  const sortedSuppliers = [...filteredSuppliers].sort((a, b) => {
    const nameA = (a.name || "").toLowerCase().trim();
    const nameB = (b.name || "").toLowerCase().trim();

    switch (vendorSortBy) {
      case "name":
        // Primary sort by name, secondary by ID if names are equal
        if (nameA !== nameB) {
          return nameA.localeCompare(nameB);
        }
        return a.id - b.id;
      case "id":
        return a.id - b.id;
      case "type":
        const typeA = (a.type || "").toLowerCase();
        const typeB = (b.type || "").toLowerCase();
        if (typeA !== typeB) {
          return typeA.localeCompare(typeB);
        }
        // Secondary sort by name if types are equal
        return nameA.localeCompare(nameB);
      default:
        return nameA.localeCompare(nameB);
    }
  });

  // ─── Extract unique subcontractor scopes & projects ───
  const subScopesOfWork = useMemo(() => {
    const scopes = new Set<string>();
    subcontractors.forEach((s: any) => {
      if (s.scope_of_work) scopes.add(s.scope_of_work);
    });
    return Array.from(scopes).sort();
  }, [subcontractors]);

  const subProjects = useMemo(() => {
    const projects = new Set<string>();
    subcontractors.forEach((s: any) => {
      if (s.project_names) {
        s.project_names
          .split(" | ")
          .map((p: string) => p.trim())
          .filter((p: string) => p)
          .forEach((p: string) => projects.add(p));
      }
    });
    return Array.from(projects).sort();
  }, [subcontractors]);

  // ─── Subcontractor filter helpers ───
  const hasActiveSubFilters =
    subFilters.selectedScopes.length > 0 ||
    subFilters.selectedProjects.length > 0;

  const resetSubFilters = () => {
    setSubFilters({
      selectedScopes: [],
      selectedProjects: [],
    });
  };

  // ─── Subcontractor filter & sort ───
  const filteredSubcontractors = subcontractors.filter((subcontractor: any) => {
    // Apply scope filter
    if (subFilters.selectedScopes.length > 0) {
      if (!subFilters.selectedScopes.includes(subcontractor.scope_of_work)) {
        return false;
      }
    }

    // Apply project filter
    if (subFilters.selectedProjects.length > 0) {
      const subProjects = subcontractor.project_names
        ? subcontractor.project_names
            .split(" | ")
            .map((p: string) => p.trim())
            .filter((p: string) => p)
        : [];
      const hasMatchingProject = subProjects.some((p: string) =>
        subFilters.selectedProjects.includes(p),
      );
      if (!hasMatchingProject) {
        return false;
      }
    }

    // Apply search
    const query = subSearchQuery.toLowerCase();
    if (query) {
      return (
        subcontractor.name?.toLowerCase().includes(query) ||
        subcontractor.material_categories?.toLowerCase().includes(query) ||
        subcontractor.trn_number?.toLowerCase().includes(query) ||
        subcontractor.contact_person_name?.toLowerCase().includes(query) ||
        subcontractor.project_names?.toLowerCase().includes(query) ||
        `SUB-${String(subcontractor.id).padStart(5, "0")}`
          .toLowerCase()
          .includes(query)
      );
    }

    return true;
  });

  // Fixed sorting: always apply a sort, defaulting to name
  const sortedSubcontractors = [...filteredSubcontractors].sort((a, b) => {
    const nameA = (a.name || "").toLowerCase().trim();
    const nameB = (b.name || "").toLowerCase().trim();

    switch (subSortBy) {
      case "name":
        // Primary sort by name, secondary by ID if names are equal
        if (nameA !== nameB) {
          return nameA.localeCompare(nameB);
        }
        return a.id - b.id;
      case "id":
        return a.id - b.id;
      default:
        return nameA.localeCompare(nameB);
    }
  });

  // ─── Supplier type colors ───
  const getSupplierTypeStyle = (type: string) => {
    const normalizedType = type.toLowerCase();
    if (normalizedType === "cash") {
      return {
        backgroundColor: "rgba(87, 244, 176, 1)",
        color: "rgba(31, 101, 71, 1)",
      };
    } else if (normalizedType === "credit") {
      return {
        backgroundColor: "rgba(255, 250, 189, 1)",
        color: "rgba(134, 83, 47, 1)",
      };
    } else if (normalizedType === "marketplace/online") {
      return {
        backgroundColor: "rgba(189, 232, 255, 1)",
        color: "rgba(15, 86, 125, 1)",
      };
    }
    return { backgroundColor: "rgba(231, 231, 231, 1)", color: "black" };
  };

  // ─── Vendor filter helpers ───
  const hasActiveVendorFilters =
    vendorFilters.selectedTypes.length > 0 ||
    vendorFilters.selectedMaterialCategories.length > 0;

  const resetVendorFilters = () => {
    setVendorFilters({
      selectedTypes: [],
      selectedMaterialCategories: [],
    });
  };

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
        <h1>VENDORS & SUBCONTRACTORS</h1>

        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          {/* Sort dropdown */}
          {activeTab === "vendors" ? (
            <select
              value={vendorSortBy}
              onChange={(e) =>
                setVendorSortBy(e.target.value as "name" | "id" | "type")
              }
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
              <option value="name">SORT BY VENDOR NAME</option>
              <option value="id">SORT BY VENDOR NUMBER</option>
              <option value="type">SORT BY VENDOR TYPE</option>
            </select>
          ) : (
            <select
              value={subSortBy}
              onChange={(e) => setSubSortBy(e.target.value as "name" | "id")}
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
              <option value="name">SORT BY SUBCONTRACTOR NAME</option>
              <option value="id">SORT BY SUBCONTRACTOR NUMBER</option>
            </select>
          )}

          {/* Create button */}
          {(userInfo?.departmentID === 8 || userInfo?.departmentID === 9) &&
            (activeTab === "vendors" ? (
              <CreateSupplierButton onSuccess={() => fetchSuppliers()} />
            ) : (
              <CreateSubcontractorButton
                onSuccess={() => fetchSubcontractors()}
              />
            ))}

          {/* Search */}
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
              value={
                activeTab === "vendors" ? vendorSearchQuery : subSearchQuery
              }
              onChange={(e) =>
                activeTab === "vendors"
                  ? setVendorSearchQuery(e.target.value)
                  : setSubSearchQuery(e.target.value)
              }
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

      {/* Tab buttons */}
      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <Button
          componentType={"button"}
          bgColor={activeTab === "vendors" ? "black" : "transparent"}
          borderColor={"black"}
          textColor={activeTab === "vendors" ? "white" : "black"}
          onClick={() => setActiveTab("vendors")}
          style={{ padding: "7px 20px", borderRadius: "25px" }}
        >
          VENDORS
        </Button>

        <Button
          componentType={"button"}
          bgColor={activeTab === "subcontractors" ? "black" : "transparent"}
          borderColor={"black"}
          textColor={activeTab === "subcontractors" ? "white" : "black"}
          onClick={() => setActiveTab("subcontractors")}
          style={{ padding: "7px 20px", borderRadius: "25px" }}
        >
          SUBCONTRACTORS
        </Button>
      </div>

      <br />

      {/* ─── VENDOR FILTER BAR ─── */}
      {activeTab === "vendors" && (
        <>
          <div
            style={{
              display: "flex",
              gap: "10px",
              paddingBottom: "20px",
              borderBottom: "1px solid rgba(207, 207, 207, 1)",
              alignItems: "center",
            }}
          >
            <VendorFilterButton
              vendorTypes={vendorTypes}
              materialCategories={vendorMaterialCategories}
              onApplyFilters={setVendorFilters}
              currentFilters={vendorFilters}
            />

            {hasActiveVendorFilters && (
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  alignItems: "center",
                }}
              >
                {vendorFilters.selectedTypes.length > 0 && (
                  <Button
                    style={{
                      borderRadius: "50px",
                      fontWeight: 600,
                    }}
                    componentType={"none"}
                    bgColor={"rgba(239, 239, 239, 1)"}
                    borderColor={"transparent"}
                    textColor={"black"}
                  >
                    TYPE:{" "}
                    <span
                      style={{
                        color: "rgba(16, 185, 129, 1)",
                        textWrap: "nowrap",
                      }}
                    >
                      {vendorFilters.selectedTypes[0].toUpperCase()}
                      {vendorFilters.selectedTypes.length > 1 &&
                        `, +${vendorFilters.selectedTypes.length - 1} MORE`}
                    </span>
                  </Button>
                )}

                {vendorFilters.selectedMaterialCategories.length > 0 && (
                  <Button
                    style={{
                      borderRadius: "50px",
                      fontWeight: 600,
                    }}
                    componentType={"none"}
                    bgColor={"rgba(239, 239, 239, 1)"}
                    borderColor={"transparent"}
                    textColor={"black"}
                  >
                    CATEGORY:{" "}
                    <span
                      style={{
                        color: "rgba(16, 185, 129, 1)",
                        textWrap: "nowrap",
                      }}
                    >
                      {vendorFilters.selectedMaterialCategories[0].toUpperCase()}
                      {vendorFilters.selectedMaterialCategories.length > 1 &&
                        `, +${vendorFilters.selectedMaterialCategories.length - 1} MORE`}
                    </span>
                  </Button>
                )}

                <Button
                  onClick={resetVendorFilters}
                  componentType={"button"}
                  bgColor={"transparent"}
                  borderColor={"transparent"}
                  textColor={"black"}
                  style={{ padding: "0px" }}
                >
                  RESET FILTER
                </Button>
              </div>
            )}
          </div>

          <br />
        </>
      )}

      {/* ─── VENDORS TABLE ─── */}
      {activeTab === "vendors" && (
        <table className="items-table two-toned">
          <thead>
            <tr>
              <th>#</th>
              <th>VENDOR NUMBER</th>
              <th>NAME</th>
              <th>TYPE</th>
              <th>MATERIAL CATEGORIES</th>
              <th>MATERIAL SUBCATEGORIES</th>
              <th>TRN</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sortedSuppliers.map((supplier, index) => {
              const typeStyle = getSupplierTypeStyle(supplier.type);

              return (
                <tr key={supplier.id}>
                  <td>{index + 1}</td>
                  <td style={{ textWrap: "nowrap" }}>
                    VEN-{String(supplier.id).padStart(5, "0")}
                  </td>
                  <td>{supplier.name}</td>
                  <td>
                    <div
                      className="approval-pill normal-text centered"
                      style={{
                        backgroundColor: typeStyle.backgroundColor,
                        color: typeStyle.color,
                        textTransform: "uppercase",
                      }}
                    >
                      {supplier.type}
                    </div>
                  </td>
                  <td>{supplier.material_categories || "-"}</td>
                  <td>{supplier.material_subcategories || "-"}</td>
                  <td>{supplier.trn_number || "-"}</td>

                  <td>
                    <div
                      style={{
                        display: "flex",
                        gap: "10px",
                        alignItems: "center",
                      }}
                    >
                      <Button
                        componentType={"link"}
                        bgColor={"rgba(239, 239, 239, 1)"}
                        borderColor={"rgba(223, 223, 223, 1)"}
                        textColor={"black"}
                        style={{ padding: "7px 7px" }}
                        href={`/vendor/${supplier.id}`}
                      >
                        <img src={externalLinkIcon} alt="view" />
                      </Button>

                      {(userInfo?.departmentID === 8 ||
                        userInfo?.departmentID === 9) && (
                        <ThreeDotsMenuButton>
                          <EditSupplierButton
                            supplier={supplier}
                            onSuccess={() => fetchSuppliers()}
                          />
                          <DeleteSupplierButton
                            supplier={supplier}
                            onSuccess={() => fetchSuppliers()}
                          />
                        </ThreeDotsMenuButton>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* ─── SUBCONTRACTOR FILTER BAR ─── */}
      {activeTab === "subcontractors" && (
        <>
          <div
            style={{
              display: "flex",
              gap: "10px",
              paddingBottom: "20px",
              borderBottom: "1px solid rgba(207, 207, 207, 1)",
              alignItems: "center",
            }}
          >
            <SubcontractorFilterButton
              scopesOfWork={subScopesOfWork}
              projects={subProjects}
              onApplyFilters={setSubFilters}
              currentFilters={subFilters}
            />

            {hasActiveSubFilters && (
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  alignItems: "center",
                }}
              >
                {subFilters.selectedScopes.length > 0 && (
                  <Button
                    style={{
                      borderRadius: "50px",
                      fontWeight: 600,
                    }}
                    componentType={"none"}
                    bgColor={"rgba(239, 239, 239, 1)"}
                    borderColor={"transparent"}
                    textColor={"black"}
                  >
                    SCOPE:{" "}
                    <span
                      style={{
                        color: "rgba(16, 185, 129, 1)",
                        textWrap: "nowrap",
                      }}
                    >
                      {subFilters.selectedScopes[0].toUpperCase()}
                      {subFilters.selectedScopes.length > 1 &&
                        `, +${subFilters.selectedScopes.length - 1} MORE`}
                    </span>
                  </Button>
                )}

                {subFilters.selectedProjects.length > 0 && (
                  <Button
                    style={{
                      borderRadius: "50px",
                      fontWeight: 600,
                    }}
                    componentType={"none"}
                    bgColor={"rgba(239, 239, 239, 1)"}
                    borderColor={"transparent"}
                    textColor={"black"}
                  >
                    PROJECT:{" "}
                    <span
                      style={{
                        color: "rgba(16, 185, 129, 1)",
                        textWrap: "nowrap",
                      }}
                    >
                      {subFilters.selectedProjects[0].toUpperCase()}
                      {subFilters.selectedProjects.length > 1 &&
                        `, +${subFilters.selectedProjects.length - 1} MORE`}
                    </span>
                  </Button>
                )}

                <Button
                  onClick={resetSubFilters}
                  componentType={"button"}
                  bgColor={"transparent"}
                  borderColor={"transparent"}
                  textColor={"black"}
                  style={{ padding: "0px" }}
                >
                  RESET FILTER
                </Button>
              </div>
            )}
          </div>

          <br />
        </>
      )}

      {/* ─── SUBCONTRACTORS TABLE ─── */}
      {activeTab === "subcontractors" && (
        <table className="items-table two-toned">
          <thead>
            <tr>
              <th>#</th>
              <th>SUBCONTRACTOR NUMBER</th>
              <th>NAME</th>
              <th>SCOPE OF WORK</th>
              <th>PROJECT</th>
              <th>TOTAL COST</th>
              <th>TRN</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sortedSubcontractors.map((subcontractor: any, index: number) => {
              return (
                <tr key={subcontractor.id}>
                  <td>{index + 1}</td>
                  <td style={{ textWrap: "nowrap" }}>
                    SUB-{String(subcontractor.id).padStart(5, "0")}
                  </td>
                  <td>{subcontractor.name}</td>
                  <td>{subcontractor.scope_of_work || "-"}</td>
                  <td>
                    {subcontractor.project_names
                      ? subcontractor.project_names
                          .split(" | ")
                          .map((project: string, pIdx: number) => (
                            <div key={pIdx}>{project}</div>
                          ))
                      : "-"}
                  </td>
                  <td>
                    {subcontractor.total_cost
                      ? `AED ${Number(subcontractor.total_cost).toFixed(2)}`
                      : "-"}
                  </td>
                  <td>{subcontractor.trn_number || "-"}</td>

                  <td>
                    <div
                      style={{
                        display: "flex",
                        gap: "10px",
                        alignItems: "center",
                      }}
                    >
                      <Button
                        style={{
                          padding: "7px 7px",
                        }}
                        componentType={"link"}
                        bgColor={"rgba(239, 239, 239, 1)"}
                        borderColor={"rgba(223, 223, 223, 1)"}
                        textColor={"black"}
                        href={`/vendor/${subcontractor.id}?type=subcontractor`}
                      >
                        <img src={externalLinkIcon} alt="view" />
                      </Button>

                      {(userInfo?.departmentID === 8 ||
                        userInfo?.departmentID === 9) && (
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
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
