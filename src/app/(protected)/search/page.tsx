"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Button from "../../components/Button";
import { useAuth } from "@/app/context/AuthContext";
import InfoPopUpButton from "@/app/components/_InfoPopUpButton";

interface SearchResult {
  id: number | string;
  display_id: string;
  category: string;
  url: string;
  type?: string;
  project_name?: string;
  department_name?: string;
  requested_by?: string;
  progress_name?: string;
  progress_id?: number;
  date_requested?: string;
  required_date?: string;
  mr_header_id?: number;
  mr_display_id?: string;
  supplier_name?: string;
  total?: number;
  created_at?: string;
  name?: string;
  location?: string;
  boq_date?: string;
  client_name?: string;
  total_value?: number;
  created_on?: string;
  status?: string;
  type_of_work?: string;
  currency?: string;
  quoted_budget?: number;
  delivery_date?: string;
  // Inventory fields
  description?: string;
  category_name?: string;
  subcategory_name?: string;
  unit?: string;
  brand?: string;
  specification?: string;
  country_of_origin?: string;
  image?: string;
  // Document fields
  lpo_id?: number;
  lpo_display_id?: string;
  doc_type?: string;
  file_name?: string;
  display_name?: string;
  icon?: string;
}

interface SearchResults {
  materialRequests: SearchResult[];
  lpos: SearchResult[];
  boqs: SearchResult[];
  projects: SearchResult[];
  inventory: SearchResult[];
  documents: SearchResult[];
}

interface DurationInfo {
  duration: string;
  hoursDecimal: number;
  style: { color: string; backgroundColor: string };
}

// ─── Priority / Duration helpers (matching kanban view) ────────

const getFlagColor = (hours: number, progress_id: number): string => {
  if (hours == null || isNaN(hours) || hours < 0) return "#ECCF28";

  if (progress_id === 7) {
    if (hours <= 1) return "#ECCF28";
    if (hours <= 3) return "rgba(255, 153, 36, 1)";
    return "rgba(250, 52, 52, 1)";
  }

  if (progress_id === 14) {
    if (hours <= 0.333) return "#ECCF28";
    if (hours <= 0.5) return "rgba(255, 153, 36, 1)";
    return "rgba(250, 52, 52, 1)";
  }

  if (progress_id === 17) {
    if (hours <= 4) return "#ECCF28";
    if (hours <= 14) return "rgba(255, 153, 36, 1)";
    return "rgba(250, 52, 52, 1)";
  }

  if (hours <= 2) return "#ECCF28";
  if (hours <= 12) return "rgba(255, 153, 36, 1)";
  return "rgba(250, 52, 52, 1)";
};

const getDaysLeftText = (requiredDate: string) => {
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
  const required = new Date(requiredDate);
  const today = new Date();
  required.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil(
    (required.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays < 0) {
    return {
      backgroundColor: "rgba(255, 181, 181, 1)",
      color: "rgba(248, 77, 77, 1)",
    };
  }
  return {
    backgroundColor: "rgba(255, 250, 189, 1)",
    color: "rgba(134, 83, 47, 1)",
  };
};

function computeDuration(hoursDecimal: number): DurationInfo {
  const totalMinutes = Math.round(hoursDecimal * 60);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  const durationString = `${String(days).padStart(2, "0")}:${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;

  let style = {
    color: "black",
    backgroundColor: "rgba(231, 231, 231, 1)",
  };

  if (hoursDecimal > 48) {
    style = {
      color: "white",
      backgroundColor: "rgba(175, 61, 61, 1)",
    };
  } else if (hoursDecimal >= 24 && hoursDecimal <= 48) {
    style = {
      color: "rgba(248, 77, 77, 1)",
      backgroundColor: "rgba(255, 181, 181, 1)",
    };
  } else if (hoursDecimal >= 12 && hoursDecimal <= 24) {
    style = {
      color: "rgba(134, 83, 47, 1)",
      backgroundColor: "rgba(255, 250, 189, 1)",
    };
  }

  return { duration: durationString, hoursDecimal, style };
}

function getDocTypeColor(docType: string): {
  bg: string;
  color: string;
} {
  switch (docType) {
    case "INVOICE":
      return {
        bg: "rgba(245, 158, 11, 0.12)",
        color: "rgba(180, 110, 0, 1)",
      };
    case "PAYMENT RECEIPT":
      return {
        bg: "rgba(16, 185, 129, 0.12)",
        color: "rgba(6, 120, 80, 1)",
      };
    case "SIGNED LPO":
      return {
        bg: "rgba(139, 92, 246, 0.12)",
        color: "rgba(100, 60, 200, 1)",
      };
    case "DELIVERY NOTE":
      return {
        bg: "rgba(59, 130, 246, 0.12)",
        color: "rgba(30, 80, 180, 1)",
      };
    default:
      return {
        bg: "rgba(107, 114, 128, 0.1)",
        color: "rgba(107, 114, 128, 1)",
      };
  }
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ─── Flag SVG ──────────────────────────────────────────────────

function FlagIcon({ color }: { color: string }) {
  return (
    <svg
      width="15"
      height="17"
      viewBox="0 0 15 17"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M0 17V0H9L9.4 2H15V12H8L7.6 10H2V17H0Z" fill={color} />
    </svg>
  );
}

// ─── Clock SVG ─────────────────────────────────────────────────

function ClockIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 11 11"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ color: "rgba(89, 89, 89, 1)" }}
    >
      <path
        d="M5.5 2.5V5.5H8.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.5 10.5C8.2615 10.5 10.5 8.2615 10.5 5.5C10.5 2.7385 8.2615 0.5 5.5 0.5C2.7385 0.5 0.5 2.7385 0.5 5.5C0.5 8.2615 2.7385 10.5 5.5 10.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Card renderers ─────────────────────────────────────────────

function MRCard({ item, dur }: { item: SearchResult; dur?: DurationInfo }) {
  return (
    <div className="search-card">
      <div className="search-card-top">
        <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
          <div>
            <small>{item.type === "job" ? "JO NUMBER" : "MR NUMBER"}</small>
            <h3>{item.display_id}</h3>
          </div>

          {item.required_date && (
            <div
              style={{
                ...getDaysLeftStyle(item.required_date),
                padding: "4px 10px",
                borderRadius: "50px",
                fontSize: "11px",
                fontWeight: "600",
                whiteSpace: "nowrap",
              }}
            >
              {getDaysLeftText(item.required_date)}
            </div>
          )}

          {dur && (
            <div
              style={{
                /* ...dur.style, */
                backgroundColor: "rgba(234, 234, 234, 1)",
                color: "rgba(89, 89, 89, 1)",
                padding: "4px 8px",
                borderRadius: "50px",
                fontSize: "11px",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <ClockIcon />
              {dur.duration}
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {dur && (
            <FlagIcon
              color={getFlagColor(dur.hoursDecimal, item.progress_id || 0)}
            />
          )}
        </div>
      </div>

      <div>
        <small>PROJECT</small>
        <h3>{item.project_name || "-"}</h3>
      </div>

      <div>
        <small>REQUESTER</small>
        <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
          <span className="search-card-avatar">
            {item.requested_by ? getInitials(item.requested_by) : "?"}
          </span>
          <h3>
            {item.requested_by || "-"}
            {item.department_name ? `, ${item.department_name}` : ""}
          </h3>
        </div>
      </div>

      <Button
        componentType="link"
        bgColor="rgba(239, 239, 239, 1)"
        borderColor="rgba(239, 239, 239, 1)"
        textColor="black"
        href={item.url}
        full
        style={{ borderRadius: "50px" }}
      >
        VIEW &gt;
      </Button>
    </div>
  );
}

function LPOCard({ item, dur }: { item: SearchResult; dur?: DurationInfo }) {
  return (
    <div className="search-card">
      <div className="search-card-top">
        <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
          <div>
            <small>MR NUMBER</small>
            <h3>{item.mr_display_id || "-"}</h3>
          </div>

          {item.delivery_date && (
            <div
              style={{
                ...getDaysLeftStyle(item.delivery_date),
                padding: "4px 10px",
                borderRadius: "50px",
                fontSize: "11px",
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              {getDaysLeftText(item.delivery_date)}
            </div>
          )}
          {dur && (
            <div
              style={{
                /* ...dur.style, */
                backgroundColor: "rgba(234, 234, 234, 1)",
                color: "rgba(89, 89, 89, 1)",
                padding: "4px 8px",
                borderRadius: "50px",
                fontSize: "11px",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <ClockIcon />
              {dur.duration}
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {dur && (
            <FlagIcon
              color={getFlagColor(dur.hoursDecimal, item.progress_id || 0)}
            />
          )}
        </div>
      </div>

      <div>
        <small>LPO NUMBER</small>
        <h3>{item.display_id}</h3>
      </div>

      <div>
        <small>VENDOR</small>
        <h3>{item.supplier_name || "-"}</h3>
      </div>

      <div>
        <small>PROJECT</small>
        <h3>{item.project_name || "-"}</h3>
      </div>

      <div>
        <small>REQUESTER</small>
        <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
          <span className="search-card-avatar">
            {item.requested_by ? getInitials(item.requested_by) : "?"}
          </span>
          <h3>
            {item.requested_by || "-"}
            {item.department_name ? `, ${item.department_name}` : ""}
          </h3>
        </div>
      </div>

      <Button
        componentType="link"
        bgColor="rgba(239, 239, 239, 1)"
        borderColor="rgba(239, 239, 239, 1)"
        textColor="black"
        href={item.url}
        full
        style={{ borderRadius: "50px" }}
      >
        VIEW &gt;
      </Button>
    </div>
  );
}

function BOQCard({ item }: { item: SearchResult }) {
  return (
    <div className="search-card">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "20px",
        }}
      >
        <div className="search-card-top">
          <div>
            <small>BOQ NUMBER</small>
            <h3>{item.display_id}</h3>
          </div>
        </div>

        <div>
          <small>NAME</small>
          <h3>{item.name || "-"}</h3>
        </div>

        <div>
          <small>LOCATION</small>
          <h3>{item.location || "-"}</h3>
        </div>

        <div>
          <small>DATE</small>
          <h3>
            {item.boq_date
              ? new Date(item.boq_date).toLocaleDateString("en-GB")
              : "-"}
          </h3>
        </div>

        <div>
          <small>PROJECT</small>
          <h3>{item.project_name || "-"}</h3>
        </div>

        <div>
          <small>CLIENT</small>
          <h3>{item.client_name || "-"}</h3>
        </div>

        <div>
          <small>VALUE</small>
          <h3>
            {item.total_value
              ? `AED ${Number(item.total_value).toLocaleString()}`
              : "-"}
          </h3>
        </div>
      </div>

      <Button
        componentType="link"
        bgColor="rgba(239, 239, 239, 1)"
        borderColor="rgba(239, 239, 239, 1)"
        textColor="black"
        href={item.url}
        full
        style={{ borderRadius: "50px" }}
      >
        VIEW &gt;
      </Button>
    </div>
  );
}

function ProjectCard({
  item,
  budget,
}: {
  item: SearchResult;
  budget?: { quoted: number; allocated: number };
}) {
  const [isHovering, setIsHovering] = useState(false);

  const { userInfo } = useAuth();

  const canSeePrice =
    userInfo?.departmentID === 8 || userInfo?.departmentID === 16;

  const quotedBudget = budget?.quoted || 0;
  const allocatedBudget = budget?.allocated || 0;

  const progressPercentage =
    quotedBudget > 0
      ? Math.min((allocatedBudget / quotedBudget) * 100, 100)
      : 0;

  const getProgressColor = () => {
    if (progressPercentage >= 100) return "rgba(194, 60, 60, 1)";
    if (progressPercentage >= 80) return "rgba(255, 250, 189, 1)";
    return "rgba(26, 216, 135, 1)";
  };

  const progressColor = getProgressColor();

  return (
    <div className="search-card">
      <div className="search-card-top">
        <div>
          <small>NAME</small>
          <h3>{item.name || "-"}</h3>
        </div>

        {item.status && (
          <span
            className="approval-pill normal-text"
            style={
              item.status.toLowerCase().includes("completed")
                ? {
                    backgroundColor: "rgba(134,241,181,1)",
                    color: "rgba(52,100,73,1)",
                    textTransform: "uppercase",
                    fontSize: "10px",
                  }
                : {
                    backgroundColor: "rgba(255, 250, 189, 1)",
                    color: "rgba(134, 83, 47, 1)",
                    textTransform: "uppercase",
                    fontSize: "10px",
                  }
            }
          >
            {item.status}
          </span>
        )}
      </div>

      {canSeePrice && (
        <>
          <div>
            <small>BUDGET</small>
            <h3>
              {quotedBudget > 0
                ? `${item.currency || "AED"} ${quotedBudget.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                : "-"}
            </h3>
          </div>

          {/* Budget meter */}
          {quotedBudget > 0 && (
            <>
              <small>PROGRESS</small>

              <div style={{ position: "relative" }}>
                <div
                  style={{
                    width: "100%",
                    height: "20px",
                    backgroundColor: "rgba(238, 238, 238, 1)",
                    borderRadius: "25px",
                    overflow: "hidden",
                    position: "relative",
                  }}
                  onMouseEnter={() => setIsHovering(true)}
                  onMouseLeave={() => setIsHovering(false)}
                >
                  <div
                    style={{
                      width: `${progressPercentage}%`,
                      height: "100%",
                      backgroundColor: progressColor,
                      borderRadius: "25px",
                      position: "relative",
                    }}
                  >
                    {progressPercentage > 10 && (
                      <div
                        style={{
                          position: "absolute",
                          top: "50%",
                          right: "8px",
                          transform: "translateY(-50%)",
                          fontWeight: "bold",
                          fontSize: "10px",
                          color: progressPercentage >= 80 ? "black" : "white",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {progressPercentage.toFixed(0)}%
                      </div>
                    )}
                  </div>
                  {progressPercentage <= 10 && (
                    <div
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        fontWeight: "bold",
                        fontSize: "10px",
                        color: "black",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {progressPercentage.toFixed(0)}%
                    </div>
                  )}
                </div>

                {/* Tooltip */}
                {isHovering && (
                  <div
                    style={{
                      position: "absolute",
                      top: "-36px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      backgroundColor: "rgba(0, 0, 0, 0.9)",
                      color: "white",
                      padding: "6px 12px",
                      borderRadius: "8px",
                      fontSize: "11px",
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      zIndex: 10,
                      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                    }}
                  >
                    {item.currency || "AED"}{" "}
                    {allocatedBudget.toLocaleString("en-US", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}
                    <div
                      style={{
                        position: "absolute",
                        bottom: "-6px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        width: 0,
                        height: 0,
                        borderLeft: "6px solid transparent",
                        borderRight: "6px solid transparent",
                        borderTop: "6px solid rgba(0, 0, 0, 0.9)",
                      }}
                    />
                  </div>
                )}

                {/* Legend */}
                <div
                  style={{
                    display: "flex",
                    gap: "16px",
                    marginTop: "8px",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <div
                      style={{
                        width: "10px",
                        height: "10px",
                        backgroundColor: progressColor,
                        borderRadius: "50%",
                      }}
                    />
                    <small style={{ color: "black" }}>SPENT</small>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <div
                      style={{
                        width: "10px",
                        height: "10px",
                        backgroundColor: "rgba(238, 238, 238, 1)",
                        borderRadius: "50%",
                      }}
                    />
                    <small style={{ color: "black" }}>BUDGET</small>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}

      <Button
        componentType="link"
        bgColor="rgba(239, 239, 239, 1)"
        borderColor="rgba(239, 239, 239, 1)"
        textColor="black"
        href={item.url}
        full
        style={{ borderRadius: "50px" }}
      >
        VIEW &gt;
      </Button>
    </div>
  );
}

function InventoryCard({ item }: { item: SearchResult }) {
  return (
    <div className="search-card">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: "15px",
          alignItems: "start",
        }}
      >
        <div
          style={{
            display: "inline-grid",
            gridTemplateColumns: "1fr 1fr",
            columnGap: "20px",
            rowGap: "12px",
          }}
        >
          <div>
            <small>ITEM NUMBER</small>
            <h3>{item.display_id}</h3>
          </div>
          <div>
            <small>TYPE</small>
            <h3>{item.type || "-"}</h3>
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <small>NAME</small>
            <h3>{item.description || "-"}</h3>
          </div>
          <div>
            <small>CATEGORY</small>
            <h3>{item.category_name || "-"}</h3>
          </div>
          <div>
            <small>SUBCATEGORY</small>
            <h3>{item.subcategory_name || "-"}</h3>
          </div>
          {item.specification && (
            <div style={{ gridColumn: "1 / -1" }}>
              <small>SPECIFICATION</small>
              {/* <h3
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }}
              >
                {item.specification}
              </h3> */}

              <InfoPopUpButton
                text={item.specification}
                header={"SPECIFICATION"}
              />
            </div>
          )}
          <div>
            <small>ORIGIN</small>
            <h3>{item.country_of_origin || "-"}</h3>
          </div>
        </div>

        <div
          style={{
            width: "90px",
            height: "90px",
            borderRadius: "10px",
            overflow: "hidden",
            flexShrink: 0,
            backgroundColor: "rgba(243, 244, 246, 1)",
          }}
        >
          <img
            src={item.image || "/icons/no-image.jpg"}
            alt="item"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        </div>
      </div>

      <Button
        componentType="link"
        bgColor="rgba(239, 239, 239, 1)"
        borderColor="rgba(239, 239, 239, 1)"
        textColor="black"
        href={item.url}
        full
        style={{ borderRadius: "50px" }}
      >
        VIEW &gt;
      </Button>
    </div>
  );
}

function DocumentCard({ item }: { item: SearchResult }) {
  const docColors = getDocTypeColor(item.doc_type || "");
  const iconFile = item.icon || "search-lpo";

  return (
    <a
      className="search-card search-card-document"
      href={item.file_name}
      target="_blank"
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "12px 0 4px",
        }}
      >
        <img src={`/icons/${iconFile}.svg`} alt={item.doc_type} />
      </div>

      <div style={{ textAlign: "center" }}>
        <h3 style={{ fontSize: "12px", fontWeight: 700 }}>
          {item.display_name || item.file_name || "-"}
        </h3>
      </div>

      <div style={{ textAlign: "center" }}>
        <small>{item.supplier_name || item.project_name || ""}</small>
      </div>
    </a>
  );
}

// ─── Main Page ─────────────────────────────────────────────────

export default function SearchResultsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const q = searchParams.get("q") || "";

  const [results, setResults] = useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [durations, setDurations] = useState<Record<string, DurationInfo>>({});
  const [budgets, setBudgets] = useState<
    Record<string, { quoted: number; allocated: number }>
  >({});

  const fetchResults = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/search?q=${encodeURIComponent(query.trim())}`,
      );
      if (res.ok) {
        const data = await res.json();
        setResults(data.results);
      }
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch progress durations for MRs and LPOs
  useEffect(() => {
    if (!results) return;

    const fetchDurations = async () => {
      const newDurations: Record<string, DurationInfo> = {};

      // Fetch MR durations
      const mrPromises = results.materialRequests.map(async (mr) => {
        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getProgressDuration`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                mr_header_id: mr.id,
                progress_id: mr.progress_id,
              }),
            },
          );
          const data = await res.json();
          if (data && data.hours_in_stage != null) {
            const hoursDecimal =
              Number(data.hours_in_stage) +
              Number(data.minutes_in_stage || 0) / 60;
            newDurations[`mr-${mr.id}`] = computeDuration(hoursDecimal);
          }
        } catch {
          // skip
        }
      });

      // Fetch LPO durations
      const lpoPromises = results.lpos.map(async (lpo) => {
        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo/getProgressDuration`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                lpo_id: lpo.id,
                progress_id: lpo.progress_id,
              }),
            },
          );
          const data = await res.json();
          if (data && data.hours_in_stage != null) {
            const hoursDecimal =
              Number(data.hours_in_stage) +
              Number(data.minutes_in_stage || 0) / 60;
            newDurations[`lpo-${lpo.id}`] = computeDuration(hoursDecimal);
          }
        } catch {
          // skip
        }
      });

      await Promise.all([...mrPromises, ...lpoPromises]);
      setDurations(newDurations);
    };

    const fetchBudgets = async () => {
      const newBudgets: Record<string, { quoted: number; allocated: number }> =
        {};

      const projPromises = results.projects.map(async (proj) => {
        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL}/api/projects/getBudgetTrackingDetails`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ project_id: proj.id }),
            },
          );
          const data = await res.json();
          newBudgets[`proj-${proj.id}`] = {
            quoted: Number(data.quoted_budget) || 0,
            allocated: Number(data.allocated_budget) || 0,
          };
        } catch {
          // skip
        }
      });

      await Promise.all(projPromises);
      setBudgets(newBudgets);
    };

    fetchDurations();
    fetchBudgets();
  }, [results]);

  useEffect(() => {
    fetchResults(q);
  }, [q, fetchResults]);

  const totalCount = results
    ? results.materialRequests.length +
      results.lpos.length +
      results.boqs.length +
      results.projects.length +
      (results.inventory?.length || 0) +
      (results.documents?.length || 0)
    : 0;

  const getSections = (): {
    category: string;
    label: string;
    items: SearchResult[];
  }[] => {
    if (!results) return [];

    const sections: {
      category: string;
      label: string;
      items: SearchResult[];
    }[] = [];

    if (results.materialRequests.length > 0) {
      sections.push({
        category: "MATERIAL REQUEST",
        label: "REQUESTS & ITEMS",
        items: results.materialRequests,
      });
    }
    if (results.lpos.length > 0) {
      sections.push({
        category: "LPO",
        label: "LOCAL PURCHASE ORDERS",
        items: results.lpos,
      });
    }
    if (results.boqs.length > 0) {
      sections.push({
        category: "BOQ",
        label: "BILL OF QUANTITIES",
        items: results.boqs,
      });
    }
    if (results.projects.length > 0) {
      sections.push({
        category: "PROJECT",
        label: "PROJECTS",
        items: results.projects,
      });
    }
    if (results.inventory?.length > 0) {
      sections.push({
        category: "INVENTORY",
        label: "INVENTORY ITEMS",
        items: results.inventory,
      });
    }
    if (results.documents?.length > 0) {
      sections.push({
        category: "DOCUMENT",
        label: "DOCUMENTS",
        items: results.documents,
      });
    }

    return sections;
  };

  const sections = getSections();

  const renderCard = (item: SearchResult) => {
    switch (item.category) {
      case "MATERIAL REQUEST":
      case "JOB ORDER":
      case "PAYMENT REQUEST":
      case "ITEM IN MATERIAL REQUEST":
      case "ITEM IN LPO":
        return (
          <MRCard
            key={`mr-${item.id}`}
            item={item}
            dur={durations[`mr-${item.id}`]}
          />
        );
      case "LPO":
        return (
          <LPOCard
            key={`lpo-${item.id}`}
            item={item}
            dur={durations[`lpo-${item.id}`]}
          />
        );
      case "BOQ":
        return <BOQCard key={`boq-${item.id}`} item={item} />;
      case "PROJECT":
        return (
          <ProjectCard
            key={`proj-${item.id}`}
            item={item}
            budget={budgets[`proj-${item.id}`]}
          />
        );
      case "INVENTORY":
        return <InventoryCard key={`inv-${item.id}`} item={item} />;
      case "DOCUMENT":
        return <DocumentCard key={`doc-${item.id}`} item={item} />;
      default:
        return null;
    }
  };

  return (
    <div className="search-results-page">
      {/* Header */}
      <h1>SEARCH RESULTS FOR &quot;{q.toUpperCase()}&quot;</h1>

      <br />
      <br />

      {/* Loading */}
      {isLoading && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: 60,
          }}
        >
          <div className="search-loading-spinner" />
        </div>
      )}

      {/* Results */}
      {!isLoading && sections.length > 0 && (
        <div className="search-results-sections">
          {sections.map((section) => (
            <div key={section.category} className="search-results-section">
              <div className="search-results-section-heading">
                <h2>{section.label}</h2>
              </div>

              <div
                className={
                  section.category === "DOCUMENT"
                    ? "search-cards-grid search-cards-grid-documents"
                    : "search-cards-grid"
                }
              >
                {section.items.map((item) => renderCard(item))}
              </div>

              <br />
              <br />
              <br />
            </div>
          ))}
        </div>
      )}

      {/* No results */}
      {!isLoading && totalCount === 0 && q && (
        <div className="no-items-container">
          <img
            src="/icons/search.svg"
            alt="no results"
            style={{ width: 48, opacity: 0.3, marginBottom: 16 }}
          />
          <h2>No results found</h2>
        </div>
      )}
    </div>
  );
}
