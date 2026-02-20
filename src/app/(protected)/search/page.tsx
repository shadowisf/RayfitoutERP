"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Button from "../../components/Button";

interface SearchResult {
  id: number;
  display_id: string;
  category: string;
  url: string;
  type?: string;
  project_name?: string;
  department_name?: string;
  requested_by?: string;
  progress_name?: string;
  date_requested?: string;
  mr_header_id?: number;
  mr_display_id?: string;
  supplier_name?: string;
  total?: number;
  created_at?: string;
  name?: string;
  client_name?: string;
  total_value?: number;
  created_on?: string;
  status?: string;
  type_of_work?: string;
  currency?: string;
  quoted_budget?: number;
}

interface SearchResults {
  materialRequests: SearchResult[];
  lpos: SearchResult[];
  boqs: SearchResult[];
  projects: SearchResult[];
}

type FilterTab = "all" | "materialRequests" | "lpos" | "boqs" | "projects";

function getCategoryColor(category: string): string {
  switch (category) {
    case "MATERIAL REQUEST":
      return "rgba(59, 130, 246, 1)";
    case "LPO":
      return "rgba(139, 92, 246, 1)";
    case "BOQ":
      return "rgba(245, 158, 11, 1)";
    case "PROJECT":
      return "rgba(16, 185, 129, 1)";
    default:
      return "rgba(107, 114, 128, 1)";
  }
}

function getCategoryBg(category: string): string {
  switch (category) {
    case "MATERIAL REQUEST":
      return "rgba(59, 130, 246, 0.08)";
    case "LPO":
      return "rgba(139, 92, 246, 0.08)";
    case "BOQ":
      return "rgba(245, 158, 11, 0.08)";
    case "PROJECT":
      return "rgba(16, 185, 129, 0.08)";
    default:
      return "rgba(107, 114, 128, 0.08)";
  }
}

function getCategoryIcon(category: string): string {
  switch (category) {
    case "MATERIAL REQUEST":
      return "/icons/mr.svg";
    case "LPO":
      return "/icons/payments.svg";
    case "BOQ":
      return "/icons/file-boq.svg";
    case "PROJECT":
      return "/icons/projects.svg";
    default:
      return "/icons/search.svg";
  }
}

export default function SearchResultsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const q = searchParams.get("q") || "";

  const [results, setResults] = useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  const fetchResults = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/search?q=${encodeURIComponent(query.trim())}`
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

  useEffect(() => {
    fetchResults(q);
  }, [q, fetchResults]);

  const totalCount = results
    ? results.materialRequests.length +
      results.lpos.length +
      results.boqs.length +
      results.projects.length
    : 0;

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "all", label: "All", count: totalCount },
    {
      key: "materialRequests",
      label: "Material Requests",
      count: results?.materialRequests.length || 0,
    },
    { key: "lpos", label: "LPOs", count: results?.lpos.length || 0 },
    { key: "boqs", label: "BOQs", count: results?.boqs.length || 0 },
    {
      key: "projects",
      label: "Projects",
      count: results?.projects.length || 0,
    },
  ];

  const getFilteredSections = (): {
    category: string;
    items: SearchResult[];
  }[] => {
    if (!results) return [];

    const sections: { category: string; items: SearchResult[] }[] = [];

    if (
      (activeTab === "all" || activeTab === "materialRequests") &&
      results.materialRequests.length > 0
    ) {
      sections.push({
        category: "MATERIAL REQUEST",
        items: results.materialRequests,
      });
    }
    if (
      (activeTab === "all" || activeTab === "lpos") &&
      results.lpos.length > 0
    ) {
      sections.push({ category: "LPO", items: results.lpos });
    }
    if (
      (activeTab === "all" || activeTab === "boqs") &&
      results.boqs.length > 0
    ) {
      sections.push({ category: "BOQ", items: results.boqs });
    }
    if (
      (activeTab === "all" || activeTab === "projects") &&
      results.projects.length > 0
    ) {
      sections.push({ category: "PROJECT", items: results.projects });
    }

    return sections;
  };

  const filteredSections = getFilteredSections();

  return (
    <div className="search-results-page">
      {/* Header */}
      <div className="search-results-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => router.back()}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              padding: 4,
            }}
          >
            <img
              src="/icons/arrow-right.svg"
              alt="back"
              style={{ width: 16, transform: "rotate(180deg)" }}
            />
          </button>
          <div>
            <h1>Search Results</h1>
            {!isLoading && (
              <small>
                {totalCount} result{totalCount !== 1 ? "s" : ""} for &quot;{q}
                &quot;
              </small>
            )}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="search-results-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`search-results-tab ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
            <span className="search-results-tab-count">{tab.count}</span>
          </button>
        ))}
      </div>

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
      {!isLoading && filteredSections.length > 0 && (
        <div className="search-results-sections">
          {filteredSections.map((section) => (
            <div key={section.category} className="search-results-section">
              <div className="search-results-section-header">
                <span
                  className="search-category-badge"
                  style={{
                    backgroundColor: getCategoryBg(section.category),
                    color: getCategoryColor(section.category),
                  }}
                >
                  <img
                    src={getCategoryIcon(section.category)}
                    alt={section.category}
                    style={{ width: 14, height: 14 }}
                  />
                  {section.category}
                </span>
                <span style={{ color: "rgba(107, 114, 128, 1)" }}>
                  {section.items.length} result
                  {section.items.length !== 1 ? "s" : ""}
                </span>
              </div>

              <table className="items-table two-toned">
                <thead>
                  <tr>
                    <th>ID</th>
                    {section.category === "MATERIAL REQUEST" && (
                      <>
                        <th>PROJECT</th>
                        <th>REQUESTED BY</th>
                        <th>DEPARTMENT</th>
                        <th>STATUS</th>
                        <th>DATE</th>
                      </>
                    )}
                    {section.category === "LPO" && (
                      <>
                        <th>MR</th>
                        <th>SUPPLIER</th>
                        <th>PROJECT</th>
                        <th>TOTAL</th>
                      </>
                    )}
                    {section.category === "BOQ" && (
                      <>
                        <th>NAME</th>
                        <th>PROJECT</th>
                        <th>CLIENT</th>
                        <th>VALUE</th>
                      </>
                    )}
                    {section.category === "PROJECT" && (
                      <>
                        <th>NAME</th>
                        <th>TYPE OF WORK</th>
                        <th>STATUS</th>
                        <th>BUDGET</th>
                      </>
                    )}
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {section.items.map((item) => (
                    <tr
                      key={`${item.category}-${item.id}`}
                      style={{ cursor: "pointer" }}
                      onClick={() => router.push(item.url)}
                    >
                      <td>
                        <span style={{ fontWeight: 600 }}>
                          {item.display_id}
                        </span>
                      </td>

                      {item.category === "MATERIAL REQUEST" && (
                        <>
                          <td>{item.project_name || "-"}</td>
                          <td>{item.requested_by || "-"}</td>
                          <td>{item.department_name || "-"}</td>
                          <td>
                            {item.progress_name && (
                              <span
                                className="status"
                                style={{
                                  backgroundColor: "rgba(239, 239, 239, 1)",
                                  fontSize: "10px",
                                }}
                              >
                                {item.progress_name}
                              </span>
                            )}
                          </td>
                          <td>
                            {item.date_requested
                              ? new Date(
                                  item.date_requested
                                ).toLocaleDateString()
                              : "-"}
                          </td>
                        </>
                      )}

                      {item.category === "LPO" && (
                        <>
                          <td>{item.mr_display_id || "-"}</td>
                          <td>{item.supplier_name || "-"}</td>
                          <td>{item.project_name || "-"}</td>
                          <td>
                            {item.total
                              ? `AED ${Number(item.total).toLocaleString()}`
                              : "-"}
                          </td>
                        </>
                      )}

                      {item.category === "BOQ" && (
                        <>
                          <td>{item.name || "-"}</td>
                          <td>{item.project_name || "-"}</td>
                          <td>{item.client_name || "-"}</td>
                          <td>
                            {item.total_value
                              ? `AED ${Number(item.total_value).toLocaleString()}`
                              : "-"}
                          </td>
                        </>
                      )}

                      {item.category === "PROJECT" && (
                        <>
                          <td>{item.name || "-"}</td>
                          <td>{item.type_of_work || "-"}</td>
                          <td>
                            {item.status && (
                              <span
                                className="status"
                                style={{
                                  backgroundColor: "rgba(239, 239, 239, 1)",
                                  fontSize: "10px",
                                }}
                              >
                                {item.status}
                              </span>
                            )}
                          </td>
                          <td>
                            {item.quoted_budget
                              ? `${item.currency || "AED"} ${Number(item.quoted_budget).toLocaleString()}`
                              : "-"}
                          </td>
                        </>
                      )}

                      <td>
                        <Button
                          componentType="button"
                          bgColor="black"
                          borderColor="black"
                          textColor="white"
                          style={{
                            borderRadius: "5px",
                            padding: "5px 15px",
                            fontSize: "11px",
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(item.url);
                          }}
                        >
                          OPEN
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
          <p style={{ color: "rgba(107, 114, 128, 1)", marginTop: 8 }}>
            Try searching with different keywords or check the spelling
          </p>
        </div>
      )}
    </div>
  );
}
