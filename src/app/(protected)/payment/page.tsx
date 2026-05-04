"use client";

import { useEffect, useState } from "react";
import Button from "@/app/components/Button";
import { useAuth } from "@/app/context/AuthContext";

type LpoCard = {
  id: number;
  mr_header_id: number;
  supplier_id: number;
  progress_id: number;
  payment_status: string | null;
  total: number;
  delivery_date: string;
  supplier_name: string;
  requested_by: string;
  department_id: number;
  department_name: string;
  project_name: string;
  required_date: string;
  identifier: string | null;
  item_count: number;
};

type MrGroup = {
  mr_header_id: number;
  project_name: string;
  requested_by: string;
  department_name: string;
  department_id: number;
  required_date: string;
  lpos: LpoCard[];
};

export default function Payments() {
  const { userInfo } = useAuth();

  const searchIcon = "/icons/search.svg";

  const [lpoCards, setLpoCards] = useState<LpoCard[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Only managers (dept 8) and finance (dept 10) may navigate into the MR
  const canView = userInfo?.departmentID === 8 || userInfo?.departmentID === 10;

  useEffect(() => {
    // Fetch only LPOs belonging to MRs that have passed segregation (mr progress_id = 26),
    // excluding payment-rejected (13) and completed (25) LPOs — handled server-side.
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/payment/getPaymentKanban`)
      .then((r) => r.json())
      .then((data: LpoCard[]) => {
        if (Array.isArray(data)) setLpoCards(data);
      })
      .catch(console.error);
  }, []);

  // ── Group by MR ─────────────────────────────────────────────────────────────
  const mrGroupsMap = new Map<number, MrGroup>();
  for (const lpo of lpoCards) {
    if (!mrGroupsMap.has(lpo.mr_header_id)) {
      mrGroupsMap.set(lpo.mr_header_id, {
        mr_header_id: lpo.mr_header_id,
        project_name: lpo.project_name,
        requested_by: lpo.requested_by,
        department_name: lpo.department_name,
        department_id: lpo.department_id,
        required_date: lpo.required_date,
        lpos: [],
      });
    }
    mrGroupsMap.get(lpo.mr_header_id)!.lpos.push(lpo);
  }
  const mrGroups = Array.from(mrGroupsMap.values()).filter(
    (g) => g.lpos.length > 0,
  );

  // ── Search ─────────────────────────────────────────────────────────────────
  const filteredGroups = mrGroups.filter((group) => {
    const q = searchQuery.toLowerCase();
    return (
      `MR-${String(group.mr_header_id).padStart(5, "0")}`
        .toLowerCase()
        .includes(q) ||
      group.project_name?.toLowerCase().includes(q) ||
      group.requested_by?.toLowerCase().includes(q) ||
      group.department_name?.toLowerCase().includes(q) ||
      group.lpos.some((l) => l.supplier_name?.toLowerCase().includes(q)) ||
      group.lpos.some((l) =>
        `LPO-${String(l.id).padStart(5, "0")}`.toLowerCase().includes(q),
      )
    );
  });

  // ── Helpers (identical to procurement tracker) ─────────────────────────────
  const getDaysLeftText = (requiredDate: string) => {
    if (!requiredDate) return null;
    const required = new Date(requiredDate);
    const today = new Date();
    required.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil(
      (required.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diffDays > 0) return `${diffDays}d left`;
    if (diffDays === 0) return "Due today";
    return `${Math.abs(diffDays)}d overdue`;
  };

  const getDaysLeftStyle = (requiredDate: string) => {
    if (!requiredDate)
      return {
        backgroundColor: "rgba(255, 250, 189, 1)",
        color: "rgba(134, 83, 47, 1)",
      };
    const required = new Date(requiredDate);
    const today = new Date();
    required.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil(
      (required.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
    return diffDays < 0
      ? {
          backgroundColor: "rgba(255, 181, 181, 1)",
          color: "rgba(248, 77, 77, 1)",
        }
      : {
          backgroundColor: "rgba(255, 250, 189, 1)",
          color: "rgba(134, 83, 47, 1)",
        };
  };

  const initials = (name: string) =>
    name
      ? name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      : "?";

  const isEmpty = filteredGroups.length === 0;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="dashboard">
      {/* ── Page heading + search ─────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "20px",
          marginBottom: "30px",
        }}
      >
        <h1>PAYMENTS</h1>

        <div style={{ position: "relative" }}>
          <input
            type="text"
            placeholder="SEARCH"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "350px",
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

      {/* ── Status column header — aligned to column 1 of the grid ─────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "20px",
          marginBottom: isEmpty ? "0px" : "20px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "15px",
            borderRadius: "50px",
            backgroundColor: isEmpty ? "rgba(242, 242, 242, 1)" : "white",
            border: isEmpty ? "none" : "1px solid rgba(231, 231, 231, 1)",
          }}
        >
          <h3 style={{ margin: 0, fontSize: "14px", fontWeight: "600" }}>
            Pending Payments
          </h3>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {!isEmpty && (
              <div
                style={{
                  backgroundColor: "rgba(187, 247, 208, 1)",
                  color: "rgba(3, 130, 46, 1)",
                  padding: "7px 10px",
                  borderRadius: "50px",
                  fontSize: "10px",
                  fontWeight: "600",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span style={{ scale: "3" }}>•</span>
                FINANCE
              </div>
            )}
            <div
              style={{
                fontSize: "16px",
                fontWeight: "600",
                padding: "6px",
                minWidth: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "50%",
                backgroundColor: isEmpty ? "white" : "black",
                color: isEmpty ? "black" : "white",
              }}
            >
              {filteredGroups.length}
            </div>
          </div>
        </div>
        <div />
        <div />
      </div>

      {/* ── 3-column grid — cards in column 1 only ───────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "20px",
          alignItems: "start",
        }}
      >
        {/* Column 1 — cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          {filteredGroups.map((group) => {
            const daysText = getDaysLeftText(group.required_date);
            const daysStyle = getDaysLeftStyle(group.required_date);

            // Unique vendor names
            const vendorNames = [
              ...new Set(group.lpos.map((l) => l.supplier_name)),
            ].join(", ");

            return (
              <div
                key={group.mr_header_id}
                style={{
                  backgroundColor: "white",
                  borderRadius: "15px",
                  padding: "15px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  border: "1px solid rgba(231, 231, 231, 1)",
                }}
              >
                {/* ── Badge + days-left pill ──────────────────────────────── */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", gap: "10px" }}>
                    <div
                      style={{
                        backgroundColor: "black",
                        color: "white",
                        padding: "4px 10px",
                        borderRadius: "50px",
                        fontSize: "11px",
                        fontWeight: "600",
                        display: "inline-flex",
                        alignItems: "center",
                      }}
                    >
                      MATERIAL REQUEST
                    </div>

                    {daysText && (
                      <div
                        style={{
                          ...daysStyle,
                          padding: "4px 10px",
                          borderRadius: "50px",
                          fontSize: "11px",
                          fontWeight: "600",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {daysText}
                      </div>
                    )}
                  </div>
                </div>

                {/* ── MR Number ──────────────────────────────────────────── */}
                <div>
                  <small>MR NUMBER</small>
                  <h3>MR-{String(group.mr_header_id).padStart(5, "0")}</h3>
                </div>

                {/* ── LPO IDs as plain text ──────────────────────────────── */}
                <div>
                  <small>LPO{group.lpos.length !== 1 ? "S" : ""}</small>
                  <h3>
                    {group.lpos
                      .map((l) => `LPO-${String(l.id).padStart(5, "0")}`)
                      .join(", ")}
                  </h3>
                </div>

                {/* ── Vendor(s) ──────────────────────────────────────────── */}
                <div>
                  <small>VENDOR{group.lpos.length !== 1 ? "S" : ""}</small>
                  <h3>{vendorNames || "-"}</h3>
                </div>

                {/* ── Project ────────────────────────────────────────────── */}
                <div>
                  <small>PROJECT</small>
                  <h3>{group.project_name || "-"}</h3>
                </div>

                {/* ── Requester ──────────────────────────────────────────── */}
                <div>
                  <small>REQUESTER</small>
                  <div
                    style={{
                      display: "flex",
                      gap: "5px",
                      alignItems: "center",
                    }}
                  >
                    <h3
                      style={{
                        backgroundColor: "black",
                        color: "white",
                        borderRadius: "50%",
                        width: "24px",
                        height: "24px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "11px",
                        fontWeight: "600",
                        flexShrink: 0,
                      }}
                    >
                      {initials(group.requested_by)}
                    </h3>
                    <h3>
                      {group.requested_by || "-"},{" "}
                      {group.department_name || "-"}
                    </h3>
                  </div>
                </div>

                {/* ── VIEW button ────────────────────────────────────────── */}
                <Button
                  componentType="link"
                  bgColor="rgba(239, 239, 239, 1)"
                  borderColor="rgba(239, 239, 239, 1)"
                  textColor="black"
                  href={`/payment/mr/${group.mr_header_id}`}
                  full
                  style={{ borderRadius: "50px" }}
                  disabled={!canView}
                >
                  VIEW &gt;
                </Button>
              </div>
            );
          })}
        </div>

        {/* Columns 2 & 3 — intentionally blank */}
        <div />
        <div />
      </div>
    </div>
  );
}
