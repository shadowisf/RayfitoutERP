"use client";

import { useState, useRef, useEffect } from "react";
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
}: SingleSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredOption, setHoveredOption] = useState<string | number | null>(
    null
  );
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery("");
        setHoveredOption(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
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

  return (
    <div className="input-item" ref={containerRef}>
      {!noLabel && (
        <label>
          {label} {required ? <span style={{ color: "red" }}>*</span> : ""}
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
            }}
          >
            ×
          </button>
        )}

        {isOpen && (
          <div className="select-dropdown" role="listbox">
            <div className="search-wrapper">
              <input
                ref={searchInputRef}
                type="text"
                className="search-input"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            <div className="options-list">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => {
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
                    >
                      <span className="option-text">{option.label}</span>
                    </div>
                  );
                })
              ) : (
                <div className="no-options">
                  {searchQuery ? "No results found" : "No options available"}
                </div>
              )}
            </div>

            {showCreateButton && (
              <div className="create-button-wrapper">
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
        )}
      </div>

      {/* TOOLTIP */}
      {hoveredOption && hoveredOptionData?.tooltip && (
        <div
          className="select-tooltip"
          style={{
            position: "fixed",
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            backgroundColor: "rgba(0,0,0,0.9)",
            color: "white",
            padding: "10px",
            borderRadius: "5px",
            maxWidth: "300px",
            zIndex: 10000,
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
