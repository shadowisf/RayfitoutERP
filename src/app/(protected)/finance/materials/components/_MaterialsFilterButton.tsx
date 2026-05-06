"use client";

import { useState, useEffect, useRef } from "react";
import FormPopUp from "@/app/components/FormPopup";
import Button from "@/app/components/Button";

export type MaterialFilters = {
  selectedVendorTypes: string[];
  selectedProjects: string[];
  spentMin: string;
  spentMax: string;
  selectedCategories: string[];
};

export type CategoryGroup = { name: string; items: string[] };

type Props = {
  projects: string[];
  categoryGroups: CategoryGroup[];
  currentFilters: MaterialFilters;
  onApplyFilters: (filters: MaterialFilters) => void;
  spentBounds: { min: number; max: number };
};

const VENDOR_TYPES = ["Cash", "Credit", "Marketplace"];

// ── Searchable checklist ──────────────────────────────────────────────────────
function SearchableChecklist({
  label,
  items,
  selected,
  onToggle,
}: {
  label: string;
  items: string[];
  selected: string[];
  onToggle: (item: string, checked: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = items.filter((i) =>
    i.toLowerCase().includes(query.toLowerCase()),
  );
  const allSelected = items.length > 0 && selected.length === items.length;

  return (
    <div style={{ marginBottom: 30 }}>
      <h3 style={{ marginBottom: 15, fontSize: 14, fontWeight: 600 }}>
        {label}
      </h3>
      <div
        style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10 }}
      >
        <div style={{ position: "relative", marginBottom: 15 }}>
          <input
            type="text"
            placeholder="SEARCH"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 40px 10px 15px",
              borderRadius: 8,
              border: "1px solid rgba(223,223,223,1)",
              fontSize: 14,
              backgroundColor: "rgba(245,245,245,1)",
            }}
          />
          <img
            src="/icons/search.svg"
            alt="search"
            style={{
              position: "absolute",
              right: 15,
              top: "50%",
              transform: "translateY(-50%)",
              width: 16,
              height: 16,
              opacity: 0.5,
            }}
          />
        </div>

        <div style={{ marginBottom: 10 }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={allSelected}
              onChange={(e) =>
                items.forEach((i) => onToggle(i, e.target.checked))
              }
              style={{
                width: 18,
                height: 18,
                cursor: "pointer",
                accentColor: "#10b981",
              }}
            />
            <h4>Select All</h4>
          </label>
        </div>

        <div style={{ maxHeight: 220, overflowY: "auto" }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: 20, color: "#888" }}>
              No items found
            </div>
          ) : (
            filtered.map((item) => (
              <div key={item} style={{ marginBottom: 10 }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(item)}
                    onChange={(e) => onToggle(item, e.target.checked)}
                    style={{
                      width: 18,
                      height: 18,
                      cursor: "pointer",
                      accentColor: "#10b981",
                    }}
                  />
                  <h4>{item}</h4>
                </label>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ── Indeterminate checkbox helper ────────────────────────────────────────────
function IndeterminateCheckbox({
  checked,
  indeterminate,
  onChange,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      style={{
        width: 18,
        height: 18,
        cursor: "pointer",
        accentColor: "rgba(0, 163, 93, 1)",
        flexShrink: 0,
      }}
    />
  );
}

// ── Grouped searchable checklist (for Material Categories) ────────────────────
function GroupedSearchableChecklist({
  label,
  groups,
  selected,
  onToggle,
}: {
  label: string;
  groups: CategoryGroup[];
  selected: string[];
  onToggle: (item: string, checked: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());

  const allItems = groups.flatMap((g) => g.items);
  const allSelected =
    allItems.length > 0 && allItems.every((i) => selected.includes(i));
  const anySelected = allItems.some((i) => selected.includes(i));

  const toggleExpand = (idx: number) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const isGroupAllChecked = (g: CategoryGroup) =>
    g.items.length > 0 && g.items.every((i) => selected.includes(i));
  const isGroupSomeChecked = (g: CategoryGroup) =>
    g.items.some((i) => selected.includes(i)) && !isGroupAllChecked(g);

  const q = query.trim().toLowerCase();
  const visibleGroups = groups
    .map((g, originalIdx) => ({
      ...g,
      originalIdx,
      items: q
        ? g.items.filter(
            (i) =>
              i.toLowerCase().includes(q) || g.name.toLowerCase().includes(q),
          )
        : g.items,
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div style={{ marginBottom: 30 }}>
      <h3 style={{ marginBottom: 15, fontSize: 14, fontWeight: 600 }}>
        {label}
      </h3>
      <div
        style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10 }}
      >
        {/* Search */}
        <div style={{ position: "relative", marginBottom: 15 }}>
          <input
            type="text"
            placeholder="SEARCH"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 40px 10px 15px",
              borderRadius: 8,
              border: "1px solid rgba(223,223,223,1)",
              fontSize: 14,
              backgroundColor: "rgba(245,245,245,1)",
            }}
          />
          <img
            src="/icons/search.svg"
            alt="search"
            style={{
              position: "absolute",
              right: 15,
              top: "50%",
              transform: "translateY(-50%)",
              width: 16,
              height: 16,
              opacity: 0.5,
            }}
          />
        </div>

        {/* Select All */}
        <div style={{ marginBottom: 10 }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
            }}
          >
            <IndeterminateCheckbox
              checked={allSelected}
              indeterminate={!allSelected && anySelected}
              onChange={(e) =>
                allItems.forEach((i) => onToggle(i, e.target.checked))
              }
            />
            <h4>Select All</h4>
          </label>
        </div>

        {/* Groups */}
        <div style={{ maxHeight: 260, overflowY: "auto" }}>
          {visibleGroups.length === 0 ? (
            <div style={{ textAlign: "center", padding: 20, color: "#888" }}>
              No items found
            </div>
          ) : (
            visibleGroups.map((group) => {
              const isExpanded =
                q !== "" || expandedGroups.has(group.originalIdx);
              const groupAllChecked = isGroupAllChecked(group);
              const groupSomeChecked = isGroupSomeChecked(group);

              return (
                <div
                  key={`group-${group.originalIdx}`}
                  style={{ marginBottom: 10 }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <IndeterminateCheckbox
                      checked={groupAllChecked}
                      indeterminate={groupSomeChecked}
                      onChange={(e) =>
                        group.items.forEach((i) =>
                          onToggle(i, e.target.checked),
                        )
                      }
                    />
                    <h4
                      style={{
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                      onClick={() => toggleExpand(group.originalIdx)}
                    >
                      {group.name || "Uncategorized"}
                      <span
                        style={{ fontSize: 10, color: "#888", lineHeight: 1 }}
                      >
                        {isExpanded ? "∧" : "∨"}
                      </span>
                    </h4>
                  </div>

                  {isExpanded && (
                    <div style={{ marginLeft: 28, marginTop: 6 }}>
                      {group.items.map((item, itemIdx) => (
                        <div
                          key={`${group.originalIdx}::${itemIdx}`}
                          style={{ marginBottom: 8 }}
                        >
                          <label
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              cursor: "pointer",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={selected.includes(item)}
                              onChange={(e) => onToggle(item, e.target.checked)}
                              style={{
                                width: 18,
                                height: 18,
                                cursor: "pointer",
                                accentColor: "rgba(0, 163, 93, 1)",
                                flexShrink: 0,
                              }}
                            />
                            <h4>{item}</h4>
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ── Dual range slider (identical to vendors / transactions) ───────────────────
function DualRangeSlider({
  label,
  bounds,
  minVal,
  maxVal,
  onMinChange,
  onMaxChange,
}: {
  label?: string;
  bounds: { min: number; max: number };
  minVal: string;
  maxVal: string;
  onMinChange: (v: string) => void;
  onMaxChange: (v: string) => void;
}) {
  const rangeMin = bounds.min;
  const rangeMax = bounds.max || 1;

  const currentMin = minVal !== "" ? Number(minVal) : rangeMin;
  const currentMax = maxVal !== "" ? Number(maxVal) : rangeMax;

  const minPct = ((currentMin - rangeMin) / (rangeMax - rangeMin)) * 100;
  const maxPct = ((currentMax - rangeMin) / (rangeMax - rangeMin)) * 100;

  const handleMinSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.min(Number(e.target.value), currentMax - 1);
    onMinChange(String(val));
  };

  const handleMaxSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.max(Number(e.target.value), currentMin + 1);
    onMaxChange(String(val));
  };

  const formatShort = (val: number) => {
    if (val >= 1_000_000) return `AED ${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `AED ${(val / 1_000).toFixed(0)}K`;
    return `AED ${val}`;
  };

  return (
    <div>
      <style>{`
        .dual-range-slider input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          left: 0;
          height: 10px;
          background: transparent;
          outline: none !important;
          pointer-events: none;
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          margin: 0;
          padding: 0;
        }
        .dual-range-slider input[type="range"]:focus {
          outline: none !important;
        }
        .dual-range-slider input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 15px;
          height: 15px;
          border-radius: 50%;
          background: white;
          border: 1px solid rgba(177, 177, 177, 1);
          outline: 0 !important;
          cursor: pointer;
          pointer-events: all;
          box-shadow: 0 1px 8px rgba(0,0,0,0.2);
        }
        .dual-range-slider input[type="range"]:focus::-webkit-slider-thumb {
          outline: 0 !important;
          border: 1px solid rgba(177, 177, 177, 1);
        }
        .dual-range-slider input[type="range"]::-moz-range-thumb {
          width: 15px;
          height: 15px;
          border-radius: 50%;
          background: white;
          border: 1px solid rgba(177, 177, 177, 1);
          outline: 0 !important;
          cursor: pointer;
          pointer-events: all;
          box-shadow: 0 1px 8px rgba(0,0,0,0.2);
        }
        .dual-range-slider input[type="range"]::-moz-focus-outer {
          border: 0;
        }
      `}</style>

      {/* Label + value inputs */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
          gap: 16,
        }}
      >
        {label && (
          <h3
            style={{
              fontSize: 14,
              fontWeight: 600,
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {label}
          </h3>
        )}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ position: "relative" }}>
            <span
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 11,
                color: "#555",
                pointerEvents: "none",
                fontWeight: 600,
              }}
            >
              AED
            </span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Min"
              value={
                minVal !== "" ? Number(minVal).toLocaleString("en-US") : ""
              }
              onChange={(e) => {
                const raw = e.target.value.replace(/,/g, "");
                if (raw === "" || /^\d+$/.test(raw)) onMinChange(raw);
              }}
              style={{
                width: 110,
                padding: "7px 10px 7px 36px",
                borderRadius: 8,
                border: "1px solid rgba(223,223,223,1)",
                fontSize: 12,
                boxSizing: "border-box",
              }}
            />
          </div>
          <span style={{ color: "#888", fontWeight: 600, flexShrink: 0 }}>
            —
          </span>
          <div style={{ position: "relative" }}>
            <span
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 11,
                color: "#555",
                pointerEvents: "none",
                fontWeight: 600,
              }}
            >
              AED
            </span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Max"
              value={
                maxVal !== "" ? Number(maxVal).toLocaleString("en-US") : ""
              }
              onChange={(e) => {
                const raw = e.target.value.replace(/,/g, "");
                if (raw === "" || /^\d+$/.test(raw)) onMaxChange(raw);
              }}
              style={{
                width: 110,
                padding: "7px 10px 7px 36px",
                borderRadius: 8,
                border: "1px solid rgba(223,223,223,1)",
                fontSize: 12,
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>
      </div>

      {/* Slider track */}
      <div
        className="dual-range-slider"
        style={{
          position: "relative",
          height: 30,
          marginBottom: 8,
          overflow: "visible",
        }}
      >
        {/* Grey base track */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: "50%",
            transform: "translateY(-50%)",
            height: 10,
            borderRadius: 10,
            backgroundColor: "rgba(220,220,220,1)",
          }}
        />
        {/* Green active fill */}
        <div
          style={{
            position: "absolute",
            left: `${minPct}%`,
            right: `${100 - maxPct}%`,
            top: "50%",
            transform: "translateY(-50%)",
            height: 10,
            borderRadius: 10,
            backgroundColor: "#3d9e6e",
          }}
        />
        {/* Min thumb */}
        <input
          type="range"
          min={rangeMin}
          max={rangeMax}
          value={currentMin}
          onChange={handleMinSlider}
          style={{ zIndex: minPct > 95 ? 5 : 1, border: "none" }}
        />
        {/* Max thumb */}
        <input
          type="range"
          min={rangeMin}
          max={rangeMax}
          value={currentMax}
          onChange={handleMaxSlider}
          style={{ zIndex: minPct > 95 ? 4 : 2, border: "none" }}
        />
      </div>

      {/* Min / Max labels */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 11,
          color: "#888",
          marginTop: 2,
        }}
      >
        <span>{formatShort(rangeMin)}</span>
        <span>{formatShort(rangeMax)}</span>
      </div>
    </div>
  );
}

// ── Main filter button ────────────────────────────────────────────────────────
export default function MaterialsFilterButton({
  projects,
  categoryGroups,
  currentFilters,
  onApplyFilters,
  spentBounds,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const [localVendorTypes, setLocalVendorTypes] = useState<string[]>(
    currentFilters.selectedVendorTypes,
  );
  const [localProjects, setLocalProjects] = useState<string[]>(
    currentFilters.selectedProjects,
  );
  const [localSpentMin, setLocalSpentMin] = useState(currentFilters.spentMin);
  const [localSpentMax, setLocalSpentMax] = useState(currentFilters.spentMax);
  const [localCategories, setLocalCategories] = useState<string[]>(
    currentFilters.selectedCategories,
  );

  // Sync local state when reopened
  useEffect(() => {
    if (isOpen) {
      setLocalVendorTypes(currentFilters.selectedVendorTypes);
      setLocalProjects(currentFilters.selectedProjects);
      setLocalSpentMin(currentFilters.spentMin);
      setLocalSpentMax(currentFilters.spentMax);
      setLocalCategories(currentFilters.selectedCategories);
    }
  }, [isOpen]);

  const toggleVendorType = (type: string, checked: boolean) =>
    setLocalVendorTypes((prev) =>
      checked ? [...prev, type] : prev.filter((t) => t !== type),
    );

  const toggleProject = (project: string, checked: boolean) =>
    setLocalProjects((prev) =>
      checked ? [...prev, project] : prev.filter((p) => p !== project),
    );

  const toggleCategory = (item: string, checked: boolean) =>
    setLocalCategories((prev) =>
      checked ? [...prev, item] : prev.filter((c) => c !== item),
    );

  const handleApply = () => {
    onApplyFilters({
      selectedVendorTypes: localVendorTypes,
      selectedProjects: localProjects,
      spentMin: localSpentMin,
      spentMax: localSpentMax,
      selectedCategories: localCategories,
    });
    setIsOpen(false);
  };

  const handleReset = () => {
    const empty: MaterialFilters = {
      selectedVendorTypes: [],
      selectedProjects: [],
      spentMin: "",
      spentMax: "",
      selectedCategories: [],
    };
    setLocalVendorTypes([]);
    setLocalProjects([]);
    setLocalSpentMin("");
    setLocalSpentMax("");
    setLocalCategories([]);
    onApplyFilters(empty);
  };

  return (
    <>
      <Button
        componentType="button"
        bgColor="white"
        borderColor="rgba(241,244,246,1)"
        textColor="black"
        onClick={() => setIsOpen(true)}
        style={{ borderRadius: "50px" }}
      >
        FILTER <img src="/icons/filter.svg" alt="filter" />
      </Button>

      {isOpen && (
        <FormPopUp
          header="FILTER MATERIALS"
          setIsOpen={setIsOpen}
          style={{ minWidth: "50dvw" }}
          addButtonLabel="CONFIRM"
          handleSubmit={handleApply}
          secondButton={
            <Button
              componentType="button"
              bgColor="white"
              borderColor="black"
              textColor="black"
              type="button"
              onClick={handleReset}
            >
              RESET
            </Button>
          }
        >
          {/* PROJECTS */}
          <SearchableChecklist
            label="PROJECTS"
            items={projects}
            selected={localProjects}
            onToggle={toggleProject}
          />

          {/* TOTAL SPEND RANGE */}
          <div style={{ marginBottom: 30 }}>
            <DualRangeSlider
              label="TOTAL SPEND RANGE"
              bounds={spentBounds}
              minVal={localSpentMin}
              maxVal={localSpentMax}
              onMinChange={setLocalSpentMin}
              onMaxChange={setLocalSpentMax}
            />
          </div>

          {/* VENDOR TYPE */}
          <div style={{ marginBottom: 30 }}>
            <h3 style={{ marginBottom: 15, fontSize: 14, fontWeight: 600 }}>
              VENDOR TYPE
            </h3>
            <div style={{ display: "flex", gap: 24 }}>
              {VENDOR_TYPES.map((type) => (
                <label
                  key={type}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={localVendorTypes.includes(type)}
                    onChange={(e) => toggleVendorType(type, e.target.checked)}
                    style={{
                      width: 18,
                      height: 18,
                      cursor: "pointer",
                      accentColor: "#10b981",
                    }}
                  />
                  <h4>{type}</h4>
                </label>
              ))}
            </div>
          </div>

          {/* MATERIAL CATEGORIES — flat list */}
          <SearchableChecklist
            label="MATERIAL CATEGORIES"
            items={categoryGroups.flatMap((g) => g.items)}
            selected={localCategories}
            onToggle={toggleCategory}
          />
        </FormPopUp>
      )}
    </>
  );
}
