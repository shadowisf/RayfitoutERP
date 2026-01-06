"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

type MultiSelectDropdownProps = {
  label: string;
  selectedValues: (string | number)[];
  onChange: (selected: (string | number)[]) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  selectOptions?: string[];
  dbData?: any[];
  idField?: string;
  labelField?: string;
  style?: React.CSSProperties;
};

export default function MultiSelectDropdown({
  label,
  selectedValues,
  onChange,
  placeholder,
  disabled,
  required,
  selectOptions,
  dbData,
  idField = "id",
  labelField = "value",
  style,
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
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
      return selectOptions.map((o) => ({ id: o, label: o }));
    }

    if (dbData) {
      return dbData.map((item) => ({
        id: item[idField],
        label: item[labelField],
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

  function handleCheckboxChange(optionId: string | number) {
    const isSelected = selectedValues.includes(optionId);

    if (isSelected) {
      onChange(selectedValues.filter((id) => id !== optionId));
    } else {
      onChange([...selectedValues, optionId]);
    }
  }

  function handleReset(e: React.MouseEvent) {
    e.stopPropagation();
    if (disabled) return;

    onChange([]);
    setIsOpen(false);
    setSearchQuery("");
  }

  function getDisplayText() {
    if (selectedValues.length === 0) {
      return placeholder ? placeholder : `SELECT ${label}`;
    }

    const selectedLabels = selectedValues
      .map((value) => {
        const option = options.find((opt) => opt.id === value);
        return option ? option.label : "";
      })
      .filter((label) => label !== "");

    return selectedLabels.join(", ");
  }

  const displayText = getDisplayText();
  const isPlaceholder = selectedValues.length === 0;

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
            const isChecked = selectedValues.includes(option.id);

            return (
              <div
                key={option.id}
                className={`select-option ${isChecked ? "selected" : ""}`}
                role="option"
                aria-selected={isChecked}
                onClick={() => handleCheckboxChange(option.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "7px",
                  cursor: "pointer",
                  transition: "background-color 0.2s",
                  backgroundColor: isChecked ? "#f0f0f0" : "transparent",
                }}
                onMouseOver={(e) => {
                  if (!isChecked) {
                    e.currentTarget.style.backgroundColor = "#f5f5f5";
                  }
                }}
                onMouseOut={(e) => {
                  if (!isChecked) {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }
                }}
              >
                <span
                  style={{
                    width: "18px",
                    height: "18px",
                    border: "2px solid #d9d9d9",
                    borderRadius: "3px",
                    marginRight: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    backgroundColor: isChecked ? "#000" : "white",
                    borderColor: isChecked ? "#000" : "#d9d9d9",
                  }}
                >
                  {isChecked && (
                    <span style={{ color: "white", fontSize: "12px" }}>✓</span>
                  )}
                </span>
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
    </div>
  );

  return (
    <div className="input-item" ref={containerRef}>
      <label className="custom">
        <span>{label}</span>{" "}
        {!required && (
          <small style={{ fontStyle: "italic", fontWeight: "100" }}>
            (OPTIONAL)
          </small>
        )}
      </label>

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
        {!disabled && selectedValues.length > 0 && (
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
    </div>
  );
}
