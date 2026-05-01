"use client";

import { useState } from "react";

type InputItemProps = {
  label: string;
  value: string | number;
  type: string;
  placeholder?: string;
  required?: boolean;
  onChange: (
    e:
      | React.ChangeEvent<HTMLInputElement>
      | React.ChangeEvent<HTMLSelectElement>
      | React.ChangeEvent<HTMLTextAreaElement>,
  ) => void;
  selectOptions?: string[];
  dbMap?: React.ReactNode;
  disabled?: boolean;
  sideLabel?: boolean;
  style?: React.CSSProperties;
  onClick?: () => void;
  noOptionalLabel?: boolean;
  postfixText?: string;
  min?: string; // Add min prop for date inputs
  onBlur?: () => void;
  itooltip?: string;
};

export default function InputItem({
  label,
  value,
  type,
  placeholder,
  onChange,
  required,
  selectOptions,
  dbMap,
  disabled,
  sideLabel,
  style,
  onClick,
  noOptionalLabel,
  postfixText,
  min, // Destructure min prop
  onBlur,
  itooltip,
}: InputItemProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const tooltipBubble = itooltip ? (
    <span
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        marginLeft: "6px",
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span
        style={{
          width: "16px",
          height: "16px",
          borderRadius: "50%",
          backgroundColor: "rgba(207, 207, 207, 1)",
          color: "white",
          fontSize: "9px",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          fontStyle: "normal",
          paddingTop: "1px",
        }}
      >
        i
      </span>
      {showTooltip && (
        <div
          style={{
            position: "fixed",
            top: "var(--tooltip-top)",
            left: "var(--tooltip-left)",
            backgroundColor: "rgba(30, 30, 30, 1)",
            color: "white",
            padding: "10px 14px",
            fontSize: "12px",
            fontWeight: 400,
            fontStyle: "normal",
            lineHeight: "1.5",
            width: "280px",
            zIndex: 99999,
            pointerEvents: "none",
          }}
          ref={(el) => {
            if (el) {
              const parent = el.previousElementSibling as HTMLElement;
              if (parent) {
                const rect = parent.getBoundingClientRect();
                el.style.setProperty(
                  "--tooltip-top",
                  `${rect.top + rect.height / 2}px`,
                );
                el.style.setProperty("--tooltip-left", `${rect.right + 12}px`);
                el.style.transform = `translateY(-50%)`;
              }
            }
          }}
        >
          {itooltip}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "-5px",
              transform: "translateY(-50%) rotate(45deg)",
              width: "10px",
              height: "10px",
              backgroundColor: "rgba(30, 30, 30, 1)",
            }}
          />
        </div>
      )}
    </span>
  ) : null;

  switch (type) {
    case "date":
      return (
        <div className="input-item">
          <label className="custom">
            <span>{label}</span>{" "}
            {!required && (
              <small style={{ fontStyle: "italic", fontWeight: "100" }}>
                (OPTIONAL)
              </small>
            )}
          </label>
          <input
            type="date"
            value={value}
            onChange={onChange}
            placeholder={placeholder || `SELECT ${label}`}
            required={required}
            disabled={disabled}
            min={min} // Add min attribute here
            onClick={(e) => {
              e.currentTarget.showPicker?.();
              onClick?.();
            }}
          />
        </div>
      );

    case "text":
      return (
        <div
          className="input-item"
          style={{
            ...(style || {}),
            ...(sideLabel
              ? {
                  display: "grid",
                  gridTemplateColumns: "0.5fr 1fr",
                  alignItems: "center",
                }
              : {}),
            ...(!label
              ? {
                  marginBottom: 0,
                }
              : {}),
          }}
        >
          {label ? (
            <label className="custom">
              <span style={{ display: "inline-flex", alignItems: "center" }}>
                {label}
                {tooltipBubble}
              </span>
              {!required && !noOptionalLabel && (
                <small style={{ fontStyle: "italic", fontWeight: "100" }}>
                  (OPTIONAL)
                </small>
              )}
            </label>
          ) : null}
          <input
            type="text"
            value={value || ""}
            onChange={onChange}
            placeholder={placeholder || `ENTER ${label}`}
            required={required}
            disabled={disabled}
            onClick={onClick}
          />
        </div>
      );

    case "text postfix":
      return (
        <div
          className="input-item"
          style={{
            ...(style || {}),
            ...(sideLabel
              ? {
                  display: "grid",
                  gridTemplateColumns: "0.5fr 1fr",
                  alignItems: "center",
                }
              : {}),
            ...(!label
              ? {
                  marginBottom: 0,
                }
              : {}),
          }}
        >
          <label className="custom">
            <span>{label}</span>{" "}
            {!required && !noOptionalLabel && (
              <small style={{ fontStyle: "italic", fontWeight: "100" }}>
                (OPTIONAL)
              </small>
            )}
          </label>

          <div className="input-prefix right">
            <span>{postfixText}</span>
            <input
              style={{ paddingRight: "50px" }}
              type="text"
              value={value || ""}
              onChange={onChange}
              placeholder={placeholder || `ENTER ${label}`}
              required={required}
              disabled={disabled}
              onClick={onClick}
              onBlur={onBlur}
            />
          </div>
        </div>
      );

    case "text prefix":
      return (
        <div
          className="input-item"
          style={{
            ...(style || {}),
            ...(sideLabel
              ? {
                  display: "grid",
                  gridTemplateColumns: "0.5fr 1fr",
                  alignItems: "center",
                }
              : {}),
            ...(!label
              ? {
                  marginBottom: 0,
                }
              : {}),
          }}
        >
          <label className="custom">
            <span>{label}</span>{" "}
            {!required && !noOptionalLabel && (
              <small style={{ fontStyle: "italic", fontWeight: "100" }}>
                (OPTIONAL)
              </small>
            )}
          </label>

          <div className="input-prefix left">
            <span>{postfixText}</span>
            <input
              style={{ paddingLeft: "50px" }}
              type="text"
              value={value || ""}
              onChange={onChange}
              placeholder={placeholder || `ENTER ${label}`}
              required={required}
              disabled={disabled}
              onClick={onClick}
              onBlur={onBlur}
            />
          </div>
        </div>
      );

    case "number":
      return (
        <div className="input-item">
          <label className="custom">
            <span>{label}</span>{" "}
            {!required && (
              <small style={{ fontStyle: "italic", fontWeight: "100" }}>
                (OPTIONAL)
              </small>
            )}
          </label>
          <input
            type="number"
            value={value}
            onChange={onChange}
            placeholder={placeholder || `ENTER ${label}`}
            required={required}
            disabled={disabled}
            onClick={onClick}
            min={min} // Also useful for number inputs
          />
        </div>
      );

    case "select":
      return (
        <div className="input-item">
          <label className="custom">
            <span>{label}</span>{" "}
            {!required && (
              <small style={{ fontStyle: "italic", fontWeight: "100" }}>
                (OPTIONAL)
              </small>
            )}
          </label>
          <select
            value={value ?? ""}
            onChange={onChange}
            required={required}
            disabled={disabled}
            onClick={onClick}
          >
            <option value="" disabled>
              {placeholder || `SELECT ${label}`}
            </option>
            {selectOptions
              ? selectOptions.map((o, index) => (
                  <option key={index} value={o}>
                    {o}
                  </option>
                ))
              : dbMap}
          </select>
        </div>
      );

    case "textarea":
      return (
        <div className="input-item">
          <label className="custom">
            <span style={{ display: "inline-flex", alignItems: "center" }}>
              {label}
              {tooltipBubble}
            </span>{" "}
            {!required && (
              <small style={{ fontStyle: "italic", fontWeight: "100" }}>
                (OPTIONAL)
              </small>
            )}
          </label>
          <textarea
            value={value}
            onChange={onChange}
            required={required}
            placeholder={placeholder || `ENTER ${label}`}
            disabled={disabled}
            onClick={onClick}
          />
        </div>
      );

    case "password":
      return (
        <div className="input-item" style={{ position: "relative" }}>
          <label className="custom">
            <span>{label}</span>{" "}
            {!required && (
              <small style={{ fontStyle: "italic", fontWeight: "100" }}>
                (OPTIONAL)
              </small>
            )}
          </label>

          <input
            type={showPassword ? "text" : "password"}
            value={value}
            onChange={onChange}
            placeholder={placeholder || `ENTER ${label}`}
            required={required}
            disabled={disabled}
            onClick={onClick}
            style={{ paddingRight: "40px" }}
          />

          {/* Eye Toggle */}
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
            style={{
              position: "absolute",
              right: "12px",
              top: "75%",
              transform: "translateY(-50%)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            {showPassword ? (
              /* Eye OFF */
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path
                  d="M3 3l18 18"
                  stroke="black"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M10.6 10.6a2 2 0 002.8 2.8"
                  stroke="black"
                  strokeWidth="2"
                />
                <path
                  d="M6.2 6.2C4 8 2.5 10.3 2 12c1.7 5 6 8 10 8 1.7 0 3.4-.4 4.9-1.3"
                  stroke="black"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M17.8 17.8C20 16 21.5 13.7 22 12c-1.7-5-6-8-10-8-1.2 0-2.5.3-3.6.8"
                  stroke="black"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              /* Eye ON */
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path
                  d="M2 12c1.7-5 6-8 10-8s8.3 3 10 8c-1.7 5-6 8-10 8s-8.3-3-10-8z"
                  stroke="black"
                  strokeWidth="2"
                />
                <circle cx="12" cy="12" r="3" stroke="black" strokeWidth="2" />
              </svg>
            )}
          </button>
        </div>
      );
  }
}
