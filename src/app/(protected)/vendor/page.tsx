"use client";

import { useEffect, useState } from "react";
import { Supplier } from "./types/supplier";
import SupplierDetailsPopUp from "../mr/[id]/components/SupplierDetailsPopUp";
import CreateSupplierButton from "./components/_CreateSupplierButton";
import { useAuth } from "@/app/context/AuthContext";
import ThreeDotsMenuButton from "@/app/components/_ThreeButtonsMenuButton";
import EditSupplierButton from "./components/_EditSupplierButton";
import DeleteSupplierButton from "./components/_DeleteSupplierButton";

export default function Vendor() {
  const { userInfo } = useAuth();

  const externalLinkIcon = "/icons/external-link.svg";
  const searchIcon = "/icons/search.svg";

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"" | "name" | "id" | "type">("");

  async function fetchSuppliers() {
    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/supplier`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setSuppliers(data);
      });
  }

  useEffect(() => {
    fetchSuppliers();
  }, []);

  // Filter suppliers based on search query
  const filteredSuppliers = suppliers.filter((supplier) => {
    const query = searchQuery.toLowerCase();
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

  // Sort filtered suppliers
  const sortedSuppliers = [...filteredSuppliers].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return (a.name || "").localeCompare(b.name || "");
      case "id":
        return a.id - b.id;
      case "type":
        return (a.type || "").localeCompare(b.type || "");
      default:
        return 0;
    }
  });

  // Get supplier type colors
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

    // Default style if type doesn't match
    return {
      backgroundColor: "rgba(231, 231, 231, 1)",
      color: "black",
    };
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
        <h1>VENDORS</h1>

        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as "name" | "id" | "type")
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
              <option value="" disabled>
                Sort by
              </option>
              <option value="name">Vendor Name</option>
              <option value="id">Vendor ID</option>
              <option value="type">Vendor Type</option>
            </select>
          </div>

          {(userInfo?.departmentID === 8 || userInfo?.departmentID === 9) && (
            <CreateSupplierButton onSuccess={() => fetchSuppliers()} />
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
            <th>TYPE</th>
            <th>MATERIAL CATEGORIES</th>
            <th>MATERIAL SUBCATEGORIES</th>
            <th>TRN</th>
            <th>DETAILS</th>
            {(userInfo?.departmentID === 8 || userInfo?.departmentID === 9) && (
              <th></th>
            )}
          </tr>
        </thead>
        <tbody>
          {sortedSuppliers.map((supplier, index) => {
            const typeStyle = getSupplierTypeStyle(supplier.type);

            return (
              <tr key={supplier.id}>
                <td>{index + 1}</td>
                <td>VEN-{String(supplier.id).padStart(5, "0")}</td>
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
                  <SupplierDetailsPopUp
                    item={supplier}
                    style={{ padding: "7px 7px" }}
                    bgColor="rgba(239, 239, 239, 1)"
                    borderColor="rgba(223, 223, 223, 1)"
                    textColor="black"
                  >
                    <img src={externalLinkIcon} />
                  </SupplierDetailsPopUp>
                </td>
                {(userInfo?.departmentID === 8 ||
                  userInfo?.departmentID === 9) && (
                  <td>
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
