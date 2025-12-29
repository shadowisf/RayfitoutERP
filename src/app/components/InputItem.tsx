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
      | React.ChangeEvent<HTMLTextAreaElement>
  ) => void;
  selectOptions?: string[];
  dbMap?: React.ReactNode;
  disabled?: boolean;
  sideLabel?: boolean;
  style?: React.CSSProperties;
  onClick?: () => void;
  noOptionalLabel?: boolean;
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
}: InputItemProps) {
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
            type={"date"}
            value={value}
            onChange={onChange}
            placeholder={placeholder ? placeholder : `SELECT ${label}`}
            required={required}
            disabled={disabled}
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
          <input
            type={"text"}
            value={value}
            onChange={onChange}
            placeholder={placeholder ? placeholder : `ENTER ${label}`}
            required={required}
            disabled={disabled}
            onClick={onClick}
          />
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
            type={"number"}
            value={value}
            onChange={onChange}
            placeholder={placeholder ? placeholder : `ENTER ${label}`}
            required={required}
            disabled={disabled}
            onClick={onClick}
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
            value={value}
            onChange={onChange}
            required={required}
            disabled={disabled}
            onClick={onClick}
          >
            <option value={typeof value === "string" ? "" : 0} disabled>
              {placeholder ? placeholder : `SELECT ${label}`}
            </option>
            {selectOptions
              ? selectOptions.map((o, index) => (
                  <option key={index}>{o}</option>
                ))
              : dbMap}
          </select>
        </div>
      );

    case "textarea":
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
          <textarea
            value={value}
            onChange={onChange}
            required={required}
            placeholder={placeholder ? placeholder : `ENTER ${label}`}
            disabled={disabled}
            onClick={onClick}
          />
        </div>
      );

    case "password":
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
            type={"password"}
            value={value}
            onChange={onChange}
            placeholder={placeholder ? placeholder : `ENTER ${label}`}
            required={required}
            disabled={disabled}
            onClick={onClick}
          />
        </div>
      );
  }
}
