"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { pdf } from "@react-pdf/renderer";
import * as XLSX from "xlsx";
import { MaterialListPDF } from "../(protected)/mr/[id]/components/MaterialListPDF";
import { PredefinedItem } from "@/app/components/_MultipleSelectMaterialItemButton";
import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";

type ExtendedItem = PredefinedItem & {
  database?: string | null;
  database_id?: number | null;
};

type Props = {
  allItems: ExtendedItem[];
  style?: React.CSSProperties;
};

// ── Indeterminate checkbox ────────────────────────────────────────────────────
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
  const [expandedDbs, setExpandedDbs] = useState<Set<string>>(new Set());
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set()); // "db::cat"
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set()); // "db::cat::sub"
  const [exportFormat, setExportFormat] = useState<"pdf" | "excel">("pdf");

  // ── Build 3-level grouped structure ──────────────────────────────────────────
  const grouped = useMemo(() => {
    const g: Record<
      string,
      Record<string, Record<string, ExtendedItem[]>>
    > = {};
    allItems.forEach((item) => {
      const db = item.database || "No Database";
      const cat = item.category_name || "Uncategorized";
      const sub = item.subcategory_name || "General";
      if (!g[db]) g[db] = {};
      if (!g[db][cat]) g[db][cat] = {};
      if (!g[db][cat][sub]) g[db][cat][sub] = [];
      g[db][cat][sub].push(item);
    });
    return g;
  }, [allItems]);

  const sortedDbs = useMemo(() => Object.keys(grouped).sort(), [grouped]);

  const allSubKeys = useMemo(() => {
    const keys: string[] = [];
    sortedDbs.forEach((db) =>
      Object.keys(grouped[db]).forEach((cat) =>
        Object.keys(grouped[db][cat]).forEach((sub) =>
          keys.push(`${db}::${cat}::${sub}`),
        ),
      ),
    );
    return keys;
  }, [grouped, sortedDbs]);

  // ── Filtering ──────────────────────────────────────────────────────────────
  const q = query.trim().toLowerCase();
  const visibleDbs = useMemo(() => {
    return sortedDbs
      .map((db) => {
        const cats = Object.keys(grouped[db])
          .map((cat) => {
            const subs = Object.keys(grouped[db][cat]).filter(
              (sub) =>
                !q ||
                db.toLowerCase().includes(q) ||
                cat.toLowerCase().includes(q) ||
                sub.toLowerCase().includes(q),
            );
            return { cat, subs };
          })
          .filter((c) => c.subs.length > 0);
        return { db, cats };
      })
      .filter((d) => d.cats.length > 0);
  }, [sortedDbs, grouped, q]);

  // ── Selection helpers ──────────────────────────────────────────────────────
  const allSelected =
    allSubKeys.length > 0 && allSubKeys.every((k) => selectedKeys.has(k));
  const anySelected = allSubKeys.some((k) => selectedKeys.has(k));

  const dbAllKeys = (db: string) =>
    Object.keys(grouped[db] || {}).flatMap((cat) =>
      Object.keys(grouped[db][cat] || {}).map((sub) => `${db}::${cat}::${sub}`),
    );

  const isDbAll = (db: string) =>
    dbAllKeys(db).every((k) => selectedKeys.has(k));
  const isDbSome = (db: string) =>
    dbAllKeys(db).some((k) => selectedKeys.has(k));

  const catAllKeys = (db: string, cat: string) =>
    Object.keys(grouped[db]?.[cat] || {}).map((sub) => `${db}::${cat}::${sub}`);

  const isCatAll = (db: string, cat: string) =>
    catAllKeys(db, cat).every((k) => selectedKeys.has(k));
  const isCatSome = (db: string, cat: string) =>
    catAllKeys(db, cat).some((k) => selectedKeys.has(k));

  function toggleAll(checked: boolean) {
    setSelectedKeys(checked ? new Set(allSubKeys) : new Set());
  }

  function toggleDb(db: string, checked: boolean) {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      dbAllKeys(db).forEach((k) => (checked ? next.add(k) : next.delete(k)));
      return next;
    });
  }

  function toggleCat(db: string, cat: string, checked: boolean) {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      catAllKeys(db, cat).forEach((k) =>
        checked ? next.add(k) : next.delete(k),
      );
      return next;
    });
  }

  function toggleSub(db: string, cat: string, sub: string, checked: boolean) {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      const k = `${db}::${cat}::${sub}`;
      checked ? next.add(k) : next.delete(k);
      return next;
    });
  }

  function toggleExpandDb(db: string) {
    setExpandedDbs((prev) => {
      const next = new Set(prev);
      next.has(db) ? next.delete(db) : next.add(db);
      return next;
    });
  }

  function toggleExpandCat(db: string, cat: string) {
    const key = `${db}::${cat}`;
    setExpandedCats((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  // ── Items to export ────────────────────────────────────────────────────────
  const itemsToExport = useMemo(() => {
    const result: ExtendedItem[] = [];
    selectedKeys.forEach((key) => {
      const [db, cat, sub] = key.split("::");
      result.push(...(grouped[db]?.[cat]?.[sub] ?? []));
    });
    return result;
  }, [selectedKeys, grouped]);

  function handleOpen() {
    setSelectedKeys(new Set());
    setExpandedDbs(new Set());
    setExpandedCats(new Set());
    setQuery("");
    setExportFormat("pdf");
    setIsOpen(true);
  }

  // ── Export handlers ────────────────────────────────────────────────────────
  async function handleExport(e: React.FormEvent) {
    e.preventDefault();
    if (itemsToExport.length === 0) return;
    setIsExporting(true);
    try {
      if (exportFormat === "pdf") {
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
      } else {
        const rows = itemsToExport.map((item) => ({
          Database: item.database || "",
          Category: item.category_name || "",
          Subcategory: item.subcategory_name || "",
          "Item Code": item.item_code || "",
          "Material Description": item.material_description || "",
          Brand: item.brand || "",
          Unit: item.unit || "",
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Materials");
        XLSX.writeFile(
          wb,
          `Material-List-${new Date().toISOString().slice(0, 10)}.xlsx`,
        );
      }
      setIsOpen(false);
    } catch (err) {
      console.error("Export error:", err);
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
            addButtonLabel="CONFIRM"
            style={{ height: "75dvh" }}
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

              {/* Database → Category → Subcategory tree */}
              <div style={{ maxHeight: 340, overflowY: "auto" }}>
                {visibleDbs.length === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: 20,
                      color: "#888",
                      fontSize: 13,
                    }}
                  >
                    No results found
                  </div>
                ) : (
                  visibleDbs.map(({ db, cats }) => {
                    const dbExpanded = q !== "" || expandedDbs.has(db);
                    const dbAllChecked = isDbAll(db);
                    const dbSomeChecked = isDbSome(db);
                    const dbCount = cats.reduce(
                      (sum, { cat, subs }) =>
                        sum +
                        subs.reduce(
                          (s, sub) =>
                            s + (grouped[db]?.[cat]?.[sub]?.length ?? 0),
                          0,
                        ),
                      0,
                    );

                    return (
                      <div key={db} style={{ marginBottom: 10 }}>
                        {/* Database row */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          <IndeterminateCheckbox
                            checked={dbAllChecked}
                            indeterminate={!dbAllChecked && dbSomeChecked}
                            onChange={(e) => toggleDb(db, e.target.checked)}
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
                            onClick={() => toggleExpandDb(db)}
                          >
                            {db}
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 12 12"
                              fill="none"
                              style={{
                                flexShrink: 0,
                                transition: "transform 0.15s",
                                transform: dbExpanded
                                  ? "rotate(0deg)"
                                  : "rotate(180deg)",
                              }}
                            >
                              <path
                                d="M2 8L6 4L10 8"
                                stroke="black"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </h4>
                          <span
                            style={{
                              fontSize: 11,
                              color: "#aaa",
                              flexShrink: 0,
                            }}
                          >
                            {dbCount.toLocaleString()}
                          </span>
                        </div>

                        {/* Categories (indented) */}
                        {dbExpanded && (
                          <div style={{ marginLeft: 24, marginTop: 6 }}>
                            {cats.map(({ cat, subs }) => {
                              const catKey = `${db}::${cat}`;
                              const catExpanded =
                                q !== "" || expandedCats.has(catKey);
                              const catAllChecked = isCatAll(db, cat);
                              const catSomeChecked = isCatSome(db, cat);
                              const catCount = subs.reduce(
                                (s, sub) =>
                                  s + (grouped[db]?.[cat]?.[sub]?.length ?? 0),
                                0,
                              );

                              return (
                                <div key={cat} style={{ marginBottom: 8 }}>
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
                                      indeterminate={
                                        !catAllChecked && catSomeChecked
                                      }
                                      onChange={(e) =>
                                        toggleCat(db, cat, e.target.checked)
                                      }
                                    />
                                    <h4
                                      style={{
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 6,
                                        flex: 1,
                                        userSelect: "none",
                                        fontWeight: 500,
                                      }}
                                      onClick={() => toggleExpandCat(db, cat)}
                                    >
                                      {cat}
                                      <svg
                                        width="12"
                                        height="12"
                                        viewBox="0 0 12 12"
                                        fill="none"
                                        style={{
                                          flexShrink: 0,
                                          transition: "transform 0.15s",
                                          transform: catExpanded
                                            ? "rotate(0deg)"
                                            : "rotate(180deg)",
                                        }}
                                      >
                                        <path
                                          d="M2 8L6 4L10 8"
                                          stroke="black"
                                          strokeWidth="1.8"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        />
                                      </svg>
                                    </h4>
                                    <span
                                      style={{
                                        fontSize: 11,
                                        color: "#aaa",
                                        flexShrink: 0,
                                      }}
                                    >
                                      {catCount.toLocaleString()}
                                    </span>
                                  </div>

                                  {/* Subcategories (indented) */}
                                  {catExpanded && (
                                    <div
                                      style={{ marginLeft: 24, marginTop: 4 }}
                                    >
                                      {subs.map((sub) => {
                                        const k = `${db}::${cat}::${sub}`;
                                        const subCount =
                                          grouped[db]?.[cat]?.[sub]?.length ??
                                          0;
                                        return (
                                          <div
                                            key={k}
                                            style={{
                                              marginBottom: 6,
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
                                                checked={selectedKeys.has(k)}
                                                onChange={(e) =>
                                                  toggleSub(
                                                    db,
                                                    cat,
                                                    sub,
                                                    e.target.checked,
                                                  )
                                                }
                                                className="filter-checkbox"
                                              />
                                              <span
                                                style={{
                                                  fontSize: 13,
                                                  fontWeight: 400,
                                                }}
                                              >
                                                {sub}
                                              </span>
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
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Export format */}
            <div style={{ marginTop: 16, marginBottom: 30 }}>
              <h3 style={{ marginBottom: 15, fontSize: 14, fontWeight: 600 }}>
                FORMAT
              </h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
                {(
                  [
                    { value: "pdf", label: "PDF" },
                    { value: "excel", label: "EXCEL" },
                  ] as const
                ).map((opt) => (
                  <label
                    key={opt.value}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      name="export_format"
                      value={opt.value}
                      checked={exportFormat === opt.value}
                      onChange={() => setExportFormat(opt.value)}
                      style={{ width: 18, height: 18, cursor: "pointer" }}
                    />
                    <h4>{opt.label}</h4>
                  </label>
                ))}
              </div>
            </div>
          </FormPopUp>,
          document.body,
        )}
    </>
  );
}
