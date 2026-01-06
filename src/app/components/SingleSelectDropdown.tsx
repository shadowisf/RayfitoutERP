"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Button from "./Button";

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

  function getOptions() {
    if (selectOptions) {
      return selectOptions.map((o) => ({
        id: o,
        label: o,
        tooltip: null,
        raw: o,
      }));
    }

    if (dbData) {
      return dbData.map((item) => ({
        id: item[idField],
        label: formatOptionLabel ? formatOptionLabel(item) : item[labelField],
        tooltip: item[tooltipField] || null,
        raw: item,
      }));
    }

    return [];
  }

  const options = getOptions();

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Click outside handler
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      // Check if click is outside the container
      const isOutsideContainer =
        containerRef.current && !containerRef.current.contains(target);

      // Check if click is outside the dropdown portal
      const dropdownElement = document.getElementById(dropdownId.current);
      const isOutsideDropdown =
        dropdownElement && !dropdownElement.contains(target);

      // Close if clicked outside both
      if (isOutsideContainer && isOutsideDropdown) {
        setIsOpen(false);
        setSearchQuery("");
        setHoveredOption(null);
      }
    }

    // Add slight delay to prevent immediate closing when opening
    setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
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
        maxHeight: "250px",
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
          maxHeight: "200px",
          overflowY: "auto",
        }}
      >
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
