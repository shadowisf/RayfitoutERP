"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/context/AuthContext";
import ThreeDotsMenuButton from "@/app/components/_ThreeButtonsMenuButton";
import CreateSubcontractorButton from "../subcontractor/components/_CreateSubcontractorButton";
import EditSubcontractorButton from "../subcontractor/components/_EditSubcontractorButton";
import DeleteSubcontractorButton from "../subcontractor/components/_DeleteSubcontractorButton";
import Button from "@/app/components/Button";
import { useRouter } from "next/navigation";
import CreateSupplierButton from "../vendor/components/_CreateSupplierButton";
import DeleteSupplierButton from "../vendor/components/_DeleteSupplierButton";
import EditSupplierButton from "../vendor/components/_EditSupplierButton";
import { Supplier } from "../vendor/types/supplier";

type Subcontractor = {
  id: number;
  name: string;
  trn_number: string;
  trn_certificate: string;
  contract: string;
  trade_license: string;
  other_docs: string;
  contact_person_name: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  bank_name: string;
  account_number: string;
  notes: string;
  material_categories: string;
  material_category_ids: string;
};

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

  // ─── Subcontractor state ───
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [subSearchQuery, setSubSearchQuery] = useState("");
  // Default to "name" for alphabetical sorting by subcontractor name
  const [subSortBy, setSubSortBy] = useState<"name" | "id">("name");

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

  // ─── Vendor filter & sort ───
  const filteredSuppliers = suppliers.filter((supplier) => {
    const query = vendorSearchQuery.toLowerCase();
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

  // ─── Subcontractor filter & sort ───
  const filteredSubcontractors = subcontractors.filter((subcontractor) => {
    const query = subSearchQuery.toLowerCase();
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

      {/* ─── SUBCONTRACTORS TABLE ─── */}
      {activeTab === "subcontractors" && (
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
