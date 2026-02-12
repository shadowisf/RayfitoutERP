"use client";

import { useEffect, useState } from "react";
import Button from "@/app/components/Button";
import { useAuth } from "@/app/context/AuthContext";

type PaymentRow = {
  id: number;
  name: string;
  type: string;
  entity: "supplier" | "subcontractor";
  total_amount: number;
  due_date: string;
  total_count: number;
  paid_count: number;
  unpaid_count: number;
};

export default function Payments() {
  const { userInfo } = useAuth();

  const searchIcon = "/icons/search.svg";
  const externalLinkIcon = "/icons/external-link.svg";

  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<
    "" | "name" | "type" | "amount" | "status"
  >("");

  const canSeePrices =
    userInfo?.departmentID === 8 || userInfo?.departmentID === 10;

  async function fetchPayments() {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/payment`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        },
      );
      const data = await res.json();
      setRows(data);
    } catch (err) {
      console.error("Error fetching payments:", err);
    }
  }

  useEffect(() => {
    fetchPayments();
  }, []);

  // Filter
  const filteredRows = rows.filter((row) => {
    const query = searchQuery.toLowerCase();
    return (
      row.name?.toLowerCase().includes(query) ||
      row.type?.toLowerCase().includes(query) ||
      (row.entity === "supplier" ? "vendor" : "subcontractor").includes(
        query,
      ) ||
      `${row.unpaid_count} unpaid invoice`.includes(query)
    );
  });

  // Sort
  const sortedRows = [...filteredRows].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return (a.name || "").localeCompare(b.name || "");
      case "type":
        return (a.type || "").localeCompare(b.type || "");
      case "amount":
        return b.total_amount - a.total_amount;
      case "status":
        return b.unpaid_count - a.unpaid_count;
      default:
        return 0;
    }
  });

  const getTypeStyle = (type: string) => {
    const t = type.toLowerCase();
    if (t === "cash") {
      return {
        backgroundColor: "rgba(87, 244, 176, 1)",
        color: "rgba(31, 101, 71, 1)",
      };
    }
    if (t === "credit") {
      return {
        backgroundColor: "rgba(255, 250, 189, 1)",
        color: "rgba(134, 83, 47, 1)",
      };
    }
    if (t === "marketplace/online") {
      return {
        backgroundColor: "rgba(189, 232, 255, 1)",
        color: "rgba(15, 86, 125, 1)",
      };
    }
    if (t === "subcontractor") {
      return {
        backgroundColor: "rgba(255, 231, 113, 1)",
        color: "rgba(108, 90, 0, 1)",
      };
    }
    return {
      backgroundColor: "rgba(231, 231, 231, 1)",
      color: "black",
    };
  };

  const getStatusStyle = (unpaidCount: number) => {
    if (unpaidCount === 0) {
      return {
        backgroundColor: "rgba(87, 244, 176, 1)",
        color: "rgba(31, 101, 71, 1)",
      };
    }
    return {
      backgroundColor: "rgba(255, 181, 181, 1)",
      color: "rgba(248, 77, 77, 1)",
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
        <h1>PAYMENTS</h1>

        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(
                  e.target.value as "name" | "type" | "amount" | "status",
                )
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
                SORT BY
              </option>
              <option value="name">Name</option>
              <option value="type">Type</option>
              <option value="amount">Total Amount</option>
              <option value="status">Status</option>
            </select>
          </div>

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
            <th>NAME</th>
            <th>TYPE</th>
            {canSeePrices && <th>TOTAL AMOUNT</th>}
            {/* <th>DUE DATE</th> */}
            <th>STATUS</th>
            {canSeePrices && <th></th>}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, index) => {
            const typeStyle = getTypeStyle(row.type);
            const statusStyle = getStatusStyle(row.unpaid_count);

            return (
              <tr key={`${row.entity}-${row.id}`}>
                <td>{index + 1}</td>
                <td>{row.name}</td>
                <td>
                  <div
                    className="approval-pill normal-text centered"
                    style={{
                      backgroundColor: typeStyle.backgroundColor,
                      color: typeStyle.color,
                      textTransform: "uppercase",
                    }}
                  >
                    {row.type}
                  </div>
                </td>
                {canSeePrices && <td>AED {row.total_amount.toFixed(2)}</td>}
                {/* <td>
                  {row.due_date
                    ? new Date(row.due_date).toLocaleDateString("en-GB")
                    : "-"}
                </td> */}
                <td>
                  <div
                    className="approval-pill normal-text centered"
                    style={{
                      backgroundColor: statusStyle.backgroundColor,
                      color: statusStyle.color,
                    }}
                  >
                    {row.unpaid_count === 0
                      ? "PAID"
                      : `${row.unpaid_count} UNPAID INVOICE${row.unpaid_count > 1 ? "S" : ""}`}
                  </div>
                </td>
                {canSeePrices && (
                  <td>
                    <Button
                      componentType={"link"}
                      bgColor={"rgba(239, 239, 239, 1)"}
                      borderColor={"rgba(223, 223, 223, 1)"}
                      textColor={"black"}
                      href={`/payment/${row.entity}/${row.id}`}
                      style={{
                        padding: "7px 7px",
                      }}
                    >
                      <img src={externalLinkIcon} alt="external link" />
                    </Button>
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
