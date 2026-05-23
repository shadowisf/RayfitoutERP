"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { pdf } from "@react-pdf/renderer";
import { MaterialListPDF } from "./MaterialListPDF";
import { PredefinedItem } from "@/app/components/_MultipleSelectMaterialItemButton";
import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";

type Props = {
  allItems: PredefinedItem[];
  style?: React.CSSProperties;
};

// ── Indeterminate checkbox ───────────────────────────────────────────────────
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
      className="filter-checkbox"
    />
  );
}

export default function ExportMaterialListPDFButton({
  allItems,
  style,
}: Props) {
  const downloadIcon = "/icons/download.svg";
  const searchIcon = "/icons/search.svg";

  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [query, setQuery] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedSubs, setSelectedSubs] = useState<Set<string>>(new Set()); // "cat::sub"

  // Build grouped structure: { catName: { subName: PredefinedItem[] } }
  const grouped = useMemo(() => {
    const g: Record<string, Record<string, PredefinedItem[]>> = {};
    allItems.forEach((item) => {
      const cat = item.category_name || "Uncategorized";
      const sub = item.subcategory_name || "General";
      if (!g[cat]) g[cat] = {};
      if (!g[cat][sub]) g[cat][sub] = [];
      g[cat][sub].push(item);
    });
    return g;
  }, [allItems]);

  const sortedCats = useMemo(() => Object.keys(grouped).sort(), [grouped]);

  // All "cat::sub" keys
  const allSubKeys = useMemo(() => {
    const keys: string[] = [];
    sortedCats.forEach((cat) =>
      Object.keys(grouped[cat]).forEach((sub) => keys.push(`${cat}::${sub}`)),
    );
    return keys;
  }, [grouped, sortedCats]);

  // Filtering
  const q = query.trim().toLowerCase();
  const visibleGroups = useMemo(() => {
    return sortedCats
      .map((cat) => {
        const subs = Object.keys(grouped[cat]).filter(
          (sub) =>
            !q ||
            cat.toLowerCase().includes(q) ||
            sub.toLowerCase().includes(q),
        );
        return { cat, subs };
      })
      .filter((g) => g.subs.length > 0);
  }, [sortedCats, grouped, q]);

  // Selection helpers
  const allSelected =
    allSubKeys.length > 0 && allSubKeys.every((k) => selectedSubs.has(k));
  const anySelected = allSubKeys.some((k) => selectedSubs.has(k));

  const isCatAllChecked = (cat: string) =>
    Object.keys(grouped[cat] || {}).every((sub) =>
      selectedSubs.has(`${cat}::${sub}`),
    );
  const isCatSomeChecked = (cat: string) =>
    Object.keys(grouped[cat] || {}).some((sub) =>
      selectedSubs.has(`${cat}::${sub}`),
    );

  function toggleAll(checked: boolean) {
    setSelectedSubs(checked ? new Set(allSubKeys) : new Set());
  }

  function toggleCat(cat: string, checked: boolean) {
    setSelectedSubs((prev) => {
      const next = new Set(prev);
      Object.keys(grouped[cat] || {}).forEach((sub) => {
        const k = `${cat}::${sub}`;
        checked ? next.add(k) : next.delete(k);
      });
      return next;
    });
  }

  function toggleSub(cat: string, sub: string, checked: boolean) {
    setSelectedSubs((prev) => {
      const next = new Set(prev);
      const k = `${cat}::${sub}`;
      checked ? next.add(k) : next.delete(k);
      return next;
    });
  }

  function toggleExpand(cat: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  }

  // Items to export
  const itemsToExport = useMemo(() => {
    const result: PredefinedItem[] = [];
    selectedSubs.forEach((key) => {
      const [cat, sub] = key.split("::");
      result.push(...(grouped[cat]?.[sub] ?? []));
    });
    return result;
  }, [selectedSubs, grouped]);

  function handleOpen() {
    setSelectedSubs(new Set());
    setExpandedGroups(new Set());
    setQuery("");
    setIsOpen(true);
  }

  async function handleExport(e: React.FormEvent) {
    e.preventDefault();
    if (itemsToExport.length === 0) return;
    setIsExporting(true);
    try {
      const exportDate = new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      const blob = await pdf(
        <MaterialListPDF items={itemsToExport} exportDate={exportDate} />,
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Material-List-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setIsOpen(false);
    } catch (err) {
      console.error("Error generating material list PDF:", err);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <>
      <Button
        componentType="button"
        type="button"
        bgColor="rgba(255,255,255,1)"
        borderColor="rgba(207,207,207,1)"
        textColor="black"
        onClick={handleOpen}
        disabled={allItems.length === 0}
        style={style}
      >
        EXPORT MATERIAL LIST
        <img src={downloadIcon} alt="" />
      </Button>

      {isOpen &&
        createPortal(
          <FormPopUp
            header="EXPORT MATERIAL LIST"
            setIsOpen={(open) => {
              if (!open) setIsOpen(false);
            }}
            handleSubmit={handleExport}
            addButtonLabel={"CONFIRM"}
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
                  fontSize: 13,
                  backgroundColor: "rgba(245,245,245,1)",
                  boxSizing: "border-box",
                }}
              />
              <img
                src={searchIcon}
                alt=""
                style={{
                  position: "absolute",
                  right: 15,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 15,
                  opacity: 0.5,
                  pointerEvents: "none",
                }}
              />
            </div>

            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                padding: 10,
              }}
            >
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
                    onChange={(e) => toggleAll(e.target.checked)}
                  />
                  <h4>Select All</h4>
                </label>
              </div>

              {/* Groups */}
              <div style={{ maxHeight: 340, overflowY: "auto" }}>
                {visibleGroups.length === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: 20,
                      color: "#888",
                      fontSize: 13,
                    }}
                  >
                    No categories found
                  </div>
                ) : (
                  visibleGroups.map(({ cat, subs }) => {
                    const isExpanded = q !== "" || expandedGroups.has(cat);
                    const catAllChecked = isCatAllChecked(cat);
                    const catSomeChecked = isCatSomeChecked(cat);

                    return (
                      <div key={cat} style={{ marginBottom: 10 }}>
                        {/* Category row */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          <IndeterminateCheckbox
                            checked={catAllChecked}
                            indeterminate={!catAllChecked && catSomeChecked}
                            onChange={(e) => toggleCat(cat, e.target.checked)}
                          />
                          <h4
                            style={{
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              flex: 1,
                              userSelect: "none",
                            }}
                            onClick={() => toggleExpand(cat)}
                          >
                            {cat}
                            <span style={{ fontSize: 10, color: "#888" }}>
                              {isExpanded ? "∧" : "∨"}
                            </span>
                          </h4>
                          <span
                            style={{
                              fontSize: 11,
                              color: "#aaa",
                              flexShrink: 0,
                            }}
                          >
                            {Object.values(grouped[cat])
                              .flat()
                              .length.toLocaleString()}
                          </span>
                        </div>

                        {/* Subcategory items (indented) */}
                        {isExpanded && (
                          <div style={{ marginLeft: 28, marginTop: 6 }}>
                            {subs.map((sub) => {
                              const key = `${cat}::${sub}`;
                              const subCount = (grouped[cat]?.[sub] || [])
                                .length;
                              return (
                                <div
                                  key={key}
                                  style={{
                                    marginBottom: 8,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 10,
                                  }}
                                >
                                  <label
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 10,
                                      cursor: "pointer",
                                      flex: 1,
                                    }}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={selectedSubs.has(key)}
                                      onChange={(e) =>
                                        toggleSub(cat, sub, e.target.checked)
                                      }
                                      className="filter-checkbox"
                                    />
                                    <h4 style={{ fontWeight: 400 }}>{sub}</h4>
                                  </label>
                                  <span
                                    style={{
                                      fontSize: 11,
                                      color: "#aaa",
                                      flexShrink: 0,
                                    }}
                                  >
                                    {subCount.toLocaleString()}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </FormPopUp>,
          document.body,
        )}
    </>
  );
}
