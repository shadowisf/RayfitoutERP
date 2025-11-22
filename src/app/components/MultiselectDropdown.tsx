"use client";

import { useState, useRef, useEffect } from "react";

type MultiSelectInputProps = {
  label: string;
  selectedValues: (string | number)[];
  onChange: (selected: (string | number)[]) => void;
  placeholder: string;
  disabled?: boolean;
  required?: boolean;
  selectOptions?: string[];
  dbData?: any[];
  idField?: string;
  labelField?: string;
};

export default function MultiSelectInput({
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
}: MultiSelectInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  useEffect(function () {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return function () {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  function handleSelectClick(e: React.MouseEvent<HTMLSelectElement>) {
    e.preventDefault();
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  }

  function handleCheckboxChange(optionId: string | number) {
    const isSelected = selectedValues.includes(optionId);

    if (isSelected) {
      onChange(
        selectedValues.filter(function (id) {
          return id !== optionId;
        })
      );
    } else {
      onChange([...selectedValues, optionId]);
    }
  }

  function getDisplayText() {
    if (selectedValues.length === 0) {
      return placeholder;
    }

    if (selectedValues.length === 1) {
      const selectedOption = options.find(function (option) {
        return selectedValues.includes(option.id);
      });
      return selectedOption ? selectedOption.label : "1 selected";
    }

    return `${selectedValues.length} selected`;
  }

  const displayText = getDisplayText();
  const isPlaceholder = selectedValues.length === 0;

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
            {options.length > 0 ? (
              options.map(function (option) {
                const isChecked = selectedValues.includes(option.id);

                return (
                  <div
                    key={option.id}
                    className={`select-option ${isChecked ? "selected" : ""}`}
                    role="option"
                    aria-selected={isChecked}
                    onClick={function () {
                      handleCheckboxChange(option.id);
                    }}
                  >
                    <span className="checkbox">
                      {isChecked && <span className="checkmark">✓</span>}
                    </span>
                    <span className="option-text">{option.label}</span>
                  </div>
                );
              })
            ) : (
              <div className="no-options">No options available</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
