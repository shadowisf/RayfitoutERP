"use client";

import { useState, useRef, useEffect } from "react";

type SingleSelectInputProps = {
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
}: SingleSelectInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  function getOptions() {
    if (selectOptions) {
      return selectOptions.map(function (o) {
        return { id: o, label: o };
      });
    }

    if (dbData) {
      return dbData.map(function (item) {
        return { id: item[idField], label: item[labelField] };
      });
    }

    return [];
  }

  const options = getOptions();

  const filteredOptions = options.filter(function (option) {
    return option.label.toLowerCase().includes(searchQuery.toLowerCase());
  });

  useEffect(function () {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery("");
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return function () {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(
    function () {
      if (isOpen && searchInputRef.current) {
        searchInputRef.current.focus();
      }
    },
    [isOpen]
  );

  function handleSelectClick(e: React.MouseEvent<HTMLSelectElement>) {
    e.preventDefault();
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  }

  function handleOptionClick(optionId: string | number) {
    onChange(optionId);
    setIsOpen(false);
    setSearchQuery("");
  }

  function getDisplayText() {
    if (!selectedValue && selectedValue !== 0) {
      return placeholder;
    }

    const selectedOption = options.find(function (option) {
      // Handle both string and number comparison
      return String(option.id) === String(selectedValue);
    });

    return selectedOption ? selectedOption.label : placeholder;
  }

  const displayText = getDisplayText();
  const isPlaceholder = !selectedValue && selectedValue !== 0;

  return (
    <div className="input-item" ref={containerRef}>
      <label>{label}</label>

      <div className="select-wrapper">
        <select
          className={`native-select ${disabled ? "disabled" : ""} ${
            isPlaceholder ? "placeholder" : ""
          }`}
          required={required}
          disabled={disabled}
          value="display"
          onMouseDown={handleSelectClick}
          onChange={function () {}}
        >
          <option value="display" disabled hidden>
            {displayText}
          </option>
        </select>

        {isOpen && (
          <div className="select-dropdown" role="listbox">
            <div className="search-wrapper">
              <input
                ref={searchInputRef}
                type="text"
                className="search-input"
                placeholder="Search..."
                value={searchQuery}
                onChange={function (e) {
                  setSearchQuery(e.target.value);
                }}
                onClick={function (e) {
                  e.stopPropagation();
                }}
              />
            </div>

            <div className="options-list">
              {filteredOptions.length > 0 ? (
                filteredOptions.map(function (option) {
                  // Handle both string and number comparison
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
                      onClick={function () {
                        handleOptionClick(option.id);
                      }}
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
          </div>
        )}
      </div>
    </div>
  );
}
