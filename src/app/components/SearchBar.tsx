"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface SearchResult {
  id: number;
  display_id: string;
  category: string;
  url: string;
  // MR fields
  type?: string;
  project_name?: string;
  department_name?: string;
  requested_by?: string;
  progress_name?: string;
  date_requested?: string;
  // LPO fields
  mr_header_id?: number;
  mr_display_id?: string;
  supplier_name?: string;
  total?: number;
  // BOQ fields
  name?: string;
  client_name?: string;
  total_value?: number;
  // Project fields
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

const SEARCH_HISTORY_KEY = "rayfitout_search_history";
const MAX_HISTORY = 8;

function getSearchHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveSearchHistory(history: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
}

function addToHistory(query: string) {
  const history = getSearchHistory();
  const filtered = history.filter(
    (h) => h.toLowerCase() !== query.toLowerCase()
  );
  filtered.unshift(query);
  saveSearchHistory(filtered.slice(0, MAX_HISTORY));
}

function clearHistory() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SEARCH_HISTORY_KEY);
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

function getSubtitle(item: SearchResult): string {
  switch (item.category) {
    case "MATERIAL REQUEST":
      return [item.project_name, item.requested_by].filter(Boolean).join(" - ");
    case "LPO":
      return [item.supplier_name, item.project_name].filter(Boolean).join(" - ");
    case "BOQ":
      return [item.name, item.project_name].filter(Boolean).join(" - ");
    case "PROJECT":
      return [item.type_of_work, item.status].filter(Boolean).join(" - ");
    default:
      return "";
  }
}

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const router = useRouter();

  // Load history on mount
  useEffect(() => {
    setHistory(getSearchHistory());
  }, []);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard shortcut: Cmd/Ctrl + K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/search?q=${encodeURIComponent(searchQuery.trim())}`
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

  const handleInputChange = (value: string) => {
    setQuery(value);
    setIsOpen(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value.trim()) {
      setResults(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    debounceRef.current = setTimeout(() => {
      performSearch(value);
    }, 300);
  };

  const handleResultClick = (item: SearchResult) => {
    addToHistory(query);
    setHistory(getSearchHistory());
    setIsOpen(false);
    setQuery("");
    setResults(null);
    router.push(item.url);
  };

  const handleHistoryClick = (term: string) => {
    setQuery(term);
    performSearch(term);
  };

  const handleClearHistory = () => {
    clearHistory();
    setHistory([]);
  };

  const handleViewAll = () => {
    if (query.trim()) {
      addToHistory(query);
      setHistory(getSearchHistory());
      setIsOpen(false);
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      setQuery("");
      setResults(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleViewAll();
  };

  const hasResults =
    results &&
    (results.materialRequests.length > 0 ||
      results.lpos.length > 0 ||
      results.boqs.length > 0 ||
      results.projects.length > 0);

  const totalResults = results
    ? results.materialRequests.length +
      results.lpos.length +
      results.boqs.length +
      results.projects.length
    : 0;

  const showHistory = !query.trim() && history.length > 0;

  // Flatten all results into categorized sections for display
  const categorizedResults: { category: string; items: SearchResult[] }[] = [];
  if (results) {
    if (results.materialRequests.length > 0) {
      categorizedResults.push({
        category: "MATERIAL REQUEST",
        items: results.materialRequests,
      });
    }
    if (results.lpos.length > 0) {
      categorizedResults.push({ category: "LPO", items: results.lpos });
    }
    if (results.boqs.length > 0) {
      categorizedResults.push({ category: "BOQ", items: results.boqs });
    }
    if (results.projects.length > 0) {
      categorizedResults.push({
        category: "PROJECT",
        items: results.projects,
      });
    }
  }

  return (
    <div ref={containerRef} className="search-bar-container">
      <form onSubmit={handleSubmit} className="search-bar-form">
        <img src="/icons/search.svg" alt="search" className="search-bar-icon" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search MR, LPO, BOQ, Project..."
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          className="search-bar-input"
        />
        {query && (
          <button
            type="button"
            className="search-bar-clear"
            onClick={() => {
              setQuery("");
              setResults(null);
              inputRef.current?.focus();
            }}
          >
            <img src="/icons/cross-small.svg" alt="clear" />
          </button>
        )}
        <span className="search-bar-shortcut">
          {navigator?.platform?.includes("Mac") ? "\u2318" : "Ctrl"}K
        </span>
      </form>

      {/* Overlay */}
      {isOpen && (
        <div
          className="search-overlay"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="search-dropdown">
          {/* Loading */}
          {isLoading && query.trim() && (
            <div className="search-loading">
              <div className="search-loading-spinner" />
              <span>Searching...</span>
            </div>
          )}

          {/* Search History (when no query) */}
          {showHistory && (
            <>
              <div className="search-section-header">
                <span>Recent Searches</span>
              </div>
              <div className="search-history-list">
                {history.map((term, i) => (
                  <button
                    key={i}
                    className="search-history-item"
                    onClick={() => handleHistoryClick(term)}
                  >
                    <img src="/icons/clock.svg" alt="history" />
                    <span>{term}</span>
                  </button>
                ))}
              </div>
              <div className="search-dropdown-footer">
                <button
                  className="search-clear-history"
                  onClick={handleClearHistory}
                >
                  Clear All
                </button>
              </div>
            </>
          )}

          {/* No query, no history */}
          {!query.trim() && history.length === 0 && (
            <div className="search-empty">
              <img src="/icons/search.svg" alt="search" style={{ opacity: 0.3, width: 24 }} />
              <span>Search by MR number, project name, supplier, BOQ...</span>
            </div>
          )}

          {/* Results */}
          {!isLoading && query.trim() && hasResults && (
            <>
              <div className="search-results-list">
                {categorizedResults.map((section) => (
                  <div key={section.category} className="search-result-section">
                    <div className="search-section-header">
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
                          style={{ width: 12, height: 12 }}
                        />
                        {section.category}
                      </span>
                      <span className="search-result-count">
                        {section.items.length}
                      </span>
                    </div>
                    {section.items.map((item) => (
                      <button
                        key={`${item.category}-${item.id}`}
                        className="search-result-item"
                        onClick={() => handleResultClick(item)}
                      >
                        <div className="search-result-main">
                          <span className="search-result-id">
                            {item.display_id}
                          </span>
                          <span className="search-result-subtitle">
                            {getSubtitle(item)}
                          </span>
                        </div>
                        <img
                          src="/icons/arrow-right.svg"
                          alt="go"
                          className="search-result-arrow"
                        />
                      </button>
                    ))}
                  </div>
                ))}
              </div>

              {/* View All Results footer */}
              <div className="search-dropdown-footer">
                <button className="search-view-all" onClick={handleViewAll}>
                  View All Results
                  <span className="search-view-all-count">{totalResults}</span>
                  <img src="/icons/arrow-right.svg" alt="go" style={{ width: 10 }} />
                </button>
              </div>
            </>
          )}

          {/* No results found */}
          {!isLoading && query.trim() && results && !hasResults && (
            <div className="search-empty">
              <span>No results found for &quot;{query}&quot;</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
