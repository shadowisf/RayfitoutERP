"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import FormPopUp from "@/app/components/FormPopup";
import Button from "@/app/components/Button";

type GroupedLines = {
  [category: string]: {
    [subCategory: string]: unknown[];
  };
};

type Props = {
  originalBoqLines: GroupedLines;
  filterCategories: string[];
  filterSubCategories: string[];
  onFilterCategoriesChange: (cats: string[]) => void;
  onFilterSubCategoriesChange: (subs: string[]) => void;
};

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
        accentColor: "rgba(0,163,93,1)",
        flexShrink: 0,
      }}
    />
  );
}

export default function FilterBoqButton({
  originalBoqLines,
  filterCategories,
  filterSubCategories,
  onFilterCategoriesChange,
  onFilterSubCategoriesChange,
}: Props) {
  const [showPopup, setShowPopup] = useState(false);
  const [tempFilterCategories, setTempFilterCategories] = useState<string[]>(
    [],
  );
  const [tempFilterSubCategories, setTempFilterSubCategories] = useState<
    string[]
  >([]);
  const [filterSearch, setFilterSearch] = useState("");
  const [expandedFilterCats, setExpandedFilterCats] = useState<string[]>([]);

  const allCategories = Object.keys(originalBoqLines).sort();
  const hasActiveFilter =
    filterCategories.length > 0 || filterSubCategories.length > 0;

  const open = () => {
    setTempFilterCategories(filterCategories);
    setTempFilterSubCategories(filterSubCategories);
    setFilterSearch("");
    setExpandedFilterCats([]);
    setShowPopup(true);
  };

  const reset = () => {
    onFilterCategoriesChange([]);
    onFilterSubCategoriesChange([]);
  };

  return (
    <>
      <div
        style={{
          display: "flex",
          gap: "8px",
          alignItems: "center",
          flexWrap: "wrap",
          flex: 1,
        }}
      >
        <Button
          componentType="button"
          bgColor="white"
          borderColor="rgba(241,244,246,1)"
          textColor="black"
          type="button"
          onClick={open}
          style={{ borderRadius: "50px" }}
        >
          FILTER <img src="/icons/filter.svg" alt="filter" />
        </Button>

        {filterCategories.length > 0 && (
          <Button
            componentType="button"
            bgColor="rgba(239,239,239,1)"
            borderColor="transparent"
            textColor="black"
            onClick={() => onFilterCategoriesChange([])}
            style={{
              borderRadius: "50px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            CATEGORY:{" "}
            <span style={{ color: "rgba(16,185,129,1)" }}>
              {filterCategories[0]}
              {filterCategories.length > 1
                ? `, +${filterCategories.length - 1} MORE`
                : ""}
            </span>
            <img
              src="/icons/cross.svg"
              alt="remove"
              style={{ width: "10px" }}
            />
          </Button>
        )}
        {filterSubCategories.length > 0 && (
          <Button
            componentType="button"
            bgColor="rgba(239,239,239,1)"
            borderColor="transparent"
            textColor="black"
            onClick={() => onFilterSubCategoriesChange([])}
            style={{
              borderRadius: "50px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            SUBCATEGORY:{" "}
            <span style={{ color: "rgba(16,185,129,1)" }}>
              {filterSubCategories[0].split("::")[1]}
              {filterSubCategories.length > 1
                ? `, +${filterSubCategories.length - 1} MORE`
                : ""}
            </span>
            <img
              src="/icons/cross.svg"
              alt="remove"
              style={{ width: "10px" }}
            />
          </Button>
        )}
        {hasActiveFilter && (
          <button
            type="button"
            onClick={reset}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 600,
              color: "black",
              padding: "0 4px",
            }}
          >
            RESET
          </button>
        )}
      </div>

      {showPopup &&
        typeof window !== "undefined" &&
        createPortal(
          <FormPopUp
            header="FILTER BILL OF QUANTITY ITEMS"
            setIsOpen={setShowPopup}
            handleSubmit={(e) => {
              e.preventDefault();
              onFilterCategoriesChange(tempFilterCategories);
              onFilterSubCategoriesChange(tempFilterSubCategories);
              setShowPopup(false);
            }}
            addButtonLabel="CONFIRM"
            secondButton={
              <Button
                componentType="button"
                bgColor="white"
                borderColor="black"
                textColor="black"
                onClick={() => {
                  setTempFilterCategories([]);
                  setTempFilterSubCategories([]);
                  onFilterCategoriesChange([]);
                  onFilterSubCategoriesChange([]);
                  setShowPopup(false);
                }}
              >
                RESET
              </Button>
            }
          >
            {(() => {
              const q = filterSearch.trim().toLowerCase();
              const allSubsFlat = allCategories.flatMap((c) =>
                Object.keys(originalBoqLines[c] || {}).map((s) => `${c}::${s}`),
              );
              const allChecked =
                tempFilterCategories.length === allCategories.length &&
                tempFilterSubCategories.length === allSubsFlat.length;
              const anyChecked =
                tempFilterCategories.length > 0 ||
                tempFilterSubCategories.length > 0;

              const visibleCats = allCategories
                .map((cat) => {
                  const catSubs = Object.keys(
                    originalBoqLines[cat] || {},
                  ).sort();
                  const filteredSubs = q
                    ? catSubs.filter(
                        (s) =>
                          s.toLowerCase().includes(q) ||
                          cat.toLowerCase().includes(q),
                      )
                    : catSubs;
                  return { cat, catSubs, filteredSubs };
                })
                .filter(
                  ({ cat, filteredSubs }) =>
                    !q ||
                    cat.toLowerCase().includes(q) ||
                    filteredSubs.length > 0,
                );

              return (
                <>
                  <h3>CATEOGRY & SUBCATEGORY</h3>

                  <br />

                  <div
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 8,
                      padding: 10,
                    }}
                  >
                    {/* Search */}
                    <div style={{ position: "relative", marginBottom: 15 }}>
                      <input
                        type="text"
                        placeholder="SEARCH"
                        value={filterSearch}
                        onChange={(e) => setFilterSearch(e.target.value)}
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
                          opacity: 0.5,
                          pointerEvents: "none",
                        }}
                      />
                    </div>

                    {/* SELECT ALL */}
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
                          checked={allChecked}
                          indeterminate={!allChecked && anyChecked}
                          onChange={(e) => {
                            setTempFilterCategories(
                              e.target.checked ? [...allCategories] : [],
                            );
                            setTempFilterSubCategories(
                              e.target.checked ? [...allSubsFlat] : [],
                            );
                          }}
                        />
                        <h4>SELECT ALL</h4>
                      </label>
                    </div>

                    {/* Grouped hierarchy */}
                    <div style={{ maxHeight: 320, overflowY: "auto" }}>
                      {visibleCats.length === 0 ? (
                        <div
                          style={{
                            textAlign: "center",
                            padding: 20,
                            color: "#888",
                          }}
                        >
                          No items found
                        </div>
                      ) : (
                        visibleCats.map(({ cat, catSubs, filteredSubs }) => {
                          const isExpanded =
                            q !== "" || expandedFilterCats.includes(cat);
                          const catAllChecked =
                            catSubs.length > 0 &&
                            catSubs.every((s) =>
                              tempFilterSubCategories.includes(`${cat}::${s}`),
                            );
                          const catSomeChecked =
                            catSubs.some((s) =>
                              tempFilterSubCategories.includes(`${cat}::${s}`),
                            ) && !catAllChecked;

                          return (
                            <div key={cat} style={{ marginBottom: 10 }}>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 10,
                                }}
                              >
                                <IndeterminateCheckbox
                                  checked={catAllChecked}
                                  indeterminate={catSomeChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setTempFilterCategories((prev) => [
                                        ...new Set([...prev, cat]),
                                      ]);
                                      setTempFilterSubCategories((prev) => [
                                        ...new Set([
                                          ...prev,
                                          ...catSubs.map((s) => `${cat}::${s}`),
                                        ]),
                                      ]);
                                    } else {
                                      setTempFilterCategories((prev) =>
                                        prev.filter((c) => c !== cat),
                                      );
                                      setTempFilterSubCategories((prev) =>
                                        prev.filter(
                                          (s) =>
                                            !catSubs
                                              .map((sub) => `${cat}::${sub}`)
                                              .includes(s),
                                        ),
                                      );
                                    }
                                  }}
                                />
                                <h4
                                  style={{
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    flex: 1,
                                    fontWeight: 600,
                                  }}
                                  onClick={() =>
                                    setExpandedFilterCats((prev) =>
                                      prev.includes(cat)
                                        ? prev.filter((c) => c !== cat)
                                        : [...prev, cat],
                                    )
                                  }
                                >
                                  {cat}
                                  <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 14 14"
                                    fill="none"
                                    style={{
                                      flexShrink: 0,
                                      transition: "transform 0.15s",
                                      transform: isExpanded
                                        ? "rotate(180deg)"
                                        : "rotate(0deg)",
                                    }}
                                  >
                                    <path
                                      d="M3.5 5.25L7 8.75L10.5 5.25"
                                      stroke="#888"
                                      strokeWidth="1.5"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                </h4>
                              </div>

                              {isExpanded && (
                                <div style={{ marginLeft: 28, marginTop: 6 }}>
                                  {filteredSubs.map((sub) => {
                                    const key = `${cat}::${sub}`;
                                    return (
                                      <div
                                        key={key}
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
                                            checked={tempFilterSubCategories.includes(
                                              key,
                                            )}
                                            onChange={(e) =>
                                              setTempFilterSubCategories(
                                                (prev) =>
                                                  e.target.checked
                                                    ? [
                                                        ...new Set([
                                                          ...prev,
                                                          key,
                                                        ]),
                                                      ]
                                                    : prev.filter(
                                                        (s) => s !== key,
                                                      ),
                                              )
                                            }
                                            style={{
                                              width: 18,
                                              height: 18,
                                              cursor: "pointer",
                                              accentColor: "rgba(0,163,93,1)",
                                              flexShrink: 0,
                                            }}
                                          />
                                          <h4 style={{ fontWeight: 600 }}>
                                            {sub}
                                          </h4>
                                        </label>
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
                </>
              );
            })()}
          </FormPopUp>,
          document.body,
        )}
    </>
  );
}
