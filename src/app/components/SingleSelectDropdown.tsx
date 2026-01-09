"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Button from "./Button";

type OptionType = {
  id: string | number;
  label: string;
  tooltip: string | null;
  category?: string | null;
  subcategory?: string | null;
  raw: any;
};

type SingleSelectDropdownProps = {
  label: string;
  selectedValue: string | number;
  onChange: (selected: string | number) => void;
  placeholder: string;
  disabled?: boolean;
  required?: boolean;
  selectOptions?: string[];
  dbData?: any[];
  idField?: string;
  labelField?: string;
  tooltipField?: string;
  noLabel?: boolean;
  showCreateButton?: boolean;
  createButtonLabel?: string;
  onCreateClick?: () => void;
  style?: React.CSSProperties;
  formatOptionLabel?: (item: any) => string;
  bottomButtonComponent?: React.ReactNode;
  categorized?: boolean;
  categoryField?: string;
  subCategoryField?: string;
};

export default function SingleSelectDropdown({
  label,
  selectedValue,
  onChange,
  placeholder,
  disabled,
  required,
  selectOptions,
  dbData,
  idField = "id",
  labelField = "value",
  tooltipField = "tooltip",
  noLabel,
  showCreateButton = false,
  createButtonLabel = "Create New",
  style,
  onCreateClick,
  formatOptionLabel,
  bottomButtonComponent,
  categorized = false,
  categoryField = "category",
  subCategoryField = "subcategory",
}: SingleSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredOption, setHoveredOption] = useState<string | number | null>(
    null
  );
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });
  const [isMounted, setIsMounted] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownId = useRef(
    `dropdown-${Math.random().toString(36).substr(2, 9)}`
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  function getOptions(): OptionType[] {
    if (selectOptions) {
      return selectOptions.map((o) => ({
        id: o,
        label: o,
        tooltip: null,
        category: null,
        subcategory: null,
        raw: o,
      }));
    }

    if (dbData) {
      return dbData.map((item) => ({
        id: item[idField],
        label: formatOptionLabel ? formatOptionLabel(item) : item[labelField],
        tooltip: item[tooltipField] || null,
        category: categorized ? item[categoryField] || null : null,
        subcategory: categorized ? item[subCategoryField] || null : null,
        raw: item,
      }));
    }

    return [];
  }

  const options = getOptions();

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group options by category and subcategory if categorized
  function getGroupedOptions() {
    if (!categorized) {
      return null;
    }

    const grouped: {
      [category: string]: {
        [subcategory: string]: OptionType[];
      };
    } = {};

    filteredOptions.forEach((option) => {
      const cat = option.category || "Uncategorized";
      const subcat = option.subcategory || "General";

      if (!grouped[cat]) {
        grouped[cat] = {};
      }

      if (!grouped[cat][subcat]) {
        grouped[cat][subcat] = [];
      }

      grouped[cat][subcat].push(option);
    });

    return grouped;
  }

  const groupedOptions = getGroupedOptions();

  // Click outside handler
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      const isOutsideContainer =
        containerRef.current && !containerRef.current.contains(target);

      const dropdownElement = document.getElementById(dropdownId.current);
      const isOutsideDropdown =
        dropdownElement && !dropdownElement.contains(target);

      const clickedElement = target as HTMLElement;
      const isOnAnotherDropdown = clickedElement.closest(
        ".select-dropdown-portal"
      );
      const isOnModal =
        clickedElement.closest(".form-popup-overlay") ||
        clickedElement.closest(".form-popup");

      if (
        isOutsideContainer &&
        isOutsideDropdown &&
        !isOnAnotherDropdown &&
        !isOnModal
      ) {
        setIsOpen(false);
        setSearchQuery("");
        setHoveredOption(null);
      }
    }

    setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Update dropdown position when opened or on scroll/resize
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const updatePosition = () => {
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          setDropdownPosition({
            top: rect.bottom + 2,
            left: rect.left,
            width: rect.width,
          });
        }
      };

      updatePosition();

      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);

      return () => {
        window.removeEventListener("scroll", updatePosition, true);
        window.removeEventListener("resize", updatePosition);
      };
    }
  }, [isOpen]);

  function handleSelectClick(e: React.MouseEvent<HTMLSelectElement>) {
    e.preventDefault();
    if (!disabled) {
      setIsOpen((prev) => !prev);
    }
  }

  function handleOptionClick(optionId: string | number) {
    onChange(optionId);
    setIsOpen(false);
    setSearchQuery("");
    setHoveredOption(null);
  }

  function handleReset(e: React.MouseEvent) {
    e.stopPropagation();
    if (disabled) return;

    onChange("");
    setIsOpen(false);
    setSearchQuery("");
    setHoveredOption(null);
  }

  function handleCreateClick() {
    setIsOpen(false);
    setSearchQuery("");
    setHoveredOption(null);
    onCreateClick?.();
  }

  function handleMouseEnter(
    optionId: string | number,
    event: React.MouseEvent<HTMLDivElement>
  ) {
    setHoveredOption(optionId);
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      x: rect.right + 10,
      y: rect.top,
    });
  }

  function handleMouseLeave() {
    setHoveredOption(null);
  }

  function getDisplayText() {
    if (!selectedValue && selectedValue !== 0) {
      return placeholder;
    }

    const selectedOption = options.find(
      (option) => String(option.id) === String(selectedValue)
    );

    return selectedOption ? selectedOption.label : placeholder;
  }

  const displayText = getDisplayText();
  const isPlaceholder = !selectedValue && selectedValue !== 0;
  const hoveredOptionData = options.find(
    (option) => option.id === hoveredOption
  );

  const dropdownContent = isOpen && (
    <div
      id={dropdownId.current}
      className="select-dropdown-portal"
      role="listbox"
      style={{
        position: "fixed",
        top: `${dropdownPosition.top}px`,
        left: `${dropdownPosition.left}px`,
        width: `${dropdownPosition.width}px`,
        background: "white",
        border: "1px solid #d9d9d9",
        borderRadius: "5px",
        maxHeight: "400px",
        zIndex: 10000,
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
      }}
    >
      <div
        style={{
          position: "sticky",
          top: 0,
          background: "white",
          zIndex: 1,
        }}
      >
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          style={{
            borderRadius: "0px",
            border: "none",
            width: "100%",
            outline: "none",
          }}
        />
      </div>

      <div
        style={{
          maxHeight: "300px",
          overflowY: "auto",
        }}
      >
        {categorized && groupedOptions ? (
          // Render categorized options
          Object.entries(groupedOptions).length > 0 ? (
            Object.entries(groupedOptions).map(([category, subcategories]) => (
              <div key={category}>
                {/* Category Header */}
                <div
                  style={{
                    padding: "8px 12px",
                    fontWeight: "bold",
                    fontSize: "12px",
                    textTransform: "uppercase",
                    color: "#000",
                    backgroundColor: "#f5f5f5",
                  }}
                >
                  {category}
                </div>

                {/* Subcategories */}
                {Object.entries(subcategories).map(
                  ([subcategory, subOptions]) => (
                    <div key={subcategory}>
                      {/* Subcategory Header */}
                      <div
                        style={{
                          padding: "6px 12px 6px 24px",
                          fontSize: "11px",
                          textTransform: "uppercase",
                          color: "#666",
                          fontWeight: "600",
                        }}
                      >
                        {subcategory}
                      </div>

                      {/* Options */}
                      {subOptions.map((option) => {
                        const isSelected =
                          String(option.id) === String(selectedValue);

                        return (
                          <div
                            key={option.id}
                            className={`select-option ${
                              isSelected ? "selected" : ""
                            }`}
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => handleOptionClick(option.id)}
                            onMouseEnter={(e) => handleMouseEnter(option.id, e)}
                            onMouseLeave={handleMouseLeave}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              padding: "7px 12px 7px 40px",
                              cursor: "pointer",
                              transition: "background-color 0.2s",
                              backgroundColor: isSelected
                                ? "#f0f0f0"
                                : "transparent",
                            }}
                            onMouseOver={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.backgroundColor =
                                  "#f9f9f9";
                              }
                            }}
                            onMouseOut={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.backgroundColor =
                                  "transparent";
                              }
                            }}
                          >
                            <span
                              style={{
                                color: "#000",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                flex: 1,
                              }}
                            >
                              {option.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )
                )}
              </div>
            ))
          ) : (
            <div
              style={{
                padding: "12px",
                color: "#888",
                textAlign: "center",
              }}
            >
              {searchQuery ? "No results found" : "No options available"}
            </div>
          )
        ) : (
          // Render flat options
          <>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
                const isSelected = String(option.id) === String(selectedValue);

                return (
                  <div
                    key={option.id}
                    className={`select-option ${isSelected ? "selected" : ""}`}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleOptionClick(option.id)}
                    onMouseEnter={(e) => handleMouseEnter(option.id, e)}
                    onMouseLeave={handleMouseLeave}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "7px",
                      cursor: "pointer",
                      transition: "background-color 0.2s",
                      backgroundColor: isSelected ? "#f0f0f0" : "transparent",
                    }}
                    onMouseOver={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = "#f5f5f5";
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }
                    }}
                  >
                    <span
                      style={{
                        color: "#000",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        flex: 1,
                      }}
                    >
                      {option.label}
                    </span>
                  </div>
                );
              })
            ) : (
              <div
                style={{
                  padding: "12px",
                  color: "#888",
                  textAlign: "center",
                }}
              >
                {searchQuery ? "No results found" : "No options available"}
              </div>
            )}
          </>
        )}
      </div>

      {/* Render custom bottom button component */}
      {bottomButtonComponent && (
        <div
          style={{
            borderTop: "1px solid #e0e0e0",
            padding: "10px",
            bottom: 0,
            background: "white",
            zIndex: 2,
          }}
        >
          {bottomButtonComponent}
        </div>
      )}

      {/* Legacy create button (keep for backward compatibility) */}
      {showCreateButton && !bottomButtonComponent && (
        <div
          style={{
            borderTop: "1px solid #e0e0e0",
            padding: "10px",
            bottom: 0,
            background: "white",
            zIndex: 2,
          }}
        >
          <Button
            componentType="button"
            bgColor="black"
            borderColor="black"
            textColor="white"
            onClick={handleCreateClick}
            full
          >
            {createButtonLabel}
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="input-item" ref={containerRef}>
      {!noLabel && (
        <label className="custom">
          <span>{label}</span>{" "}
          {required ? (
            ""
          ) : (
            <small style={{ fontStyle: "italic", fontWeight: "100" }}>
              (OPTIONAL)
            </small>
          )}
        </label>
      )}

      <div
        className="select-wrapper"
        style={{ position: "relative", ...style }}
      >
        <select
          className={`native-select ${disabled ? "disabled" : ""} ${
            isPlaceholder ? "placeholder" : ""
          }`}
          required={required}
          disabled={disabled}
          value="display"
          onMouseDown={handleSelectClick}
          onChange={() => {}}
        >
          <option value="display" disabled hidden>
            {displayText}
          </option>
        </select>

        {/* RESET BUTTON */}
        {!disabled && selectedValue !== "" && selectedValue !== null && (
          <button
            type="button"
            onClick={handleReset}
            style={{
              position: "absolute",
              right: "20px",
              top: "55%",
              transform: "translateY(-50%)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              lineHeight: 1,
              color: "black",
              fontSize: "14.1px",
              zIndex: 10,
            }}
          >
            ×
          </button>
        )}

        {/* Render dropdown in portal */}
        {isMounted &&
          typeof document !== "undefined" &&
          dropdownContent &&
          createPortal(dropdownContent, document.body)}
      </div>

      {/* TOOLTIP */}
      {hoveredOption && hoveredOptionData?.tooltip && (
        <div
          className="select-tooltip"
          style={{
            position: "fixed",
            left: tooltipPosition.x - 650,
            top: tooltipPosition.y,
            backgroundColor: "rgba(0,0,0,0.9)",
            color: "white",
            padding: "10px",
            borderRadius: "5px",
            maxWidth: "300px",
            zIndex: 99999,
            pointerEvents: "none",
            whiteSpace: "pre-wrap",
          }}
        >
          {hoveredOptionData.tooltip}
        </div>
      )}
    </div>
  );
}
