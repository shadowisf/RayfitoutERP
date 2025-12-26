type InputItemProps = {
  label: string;
  value: string | number;
  type: string;
  placeholder: string;
  required: boolean;
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
}: InputItemProps) {
  switch (type) {
    case "date":
      return (
        <div className="input-item">
          {label && (
            <label>
              <span>
                {label}{" "}
                {required ? <span style={{ color: "red" }}>*</span> : ""}
              </span>
            </label>
          )}
          <input
            type={"date"}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            onClick={onClick}
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
          <label>
            <span>
              {label} {required ? <span style={{ color: "red" }}>*</span> : ""}
            </span>
          </label>
          <input
            type={"text"}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            onClick={onClick}
          />
        </div>
      );

    case "number":
      return (
        <div className="input-item">
          <label>
            <span>
              {label} {required ? <span style={{ color: "red" }}>*</span> : ""}
            </span>
          </label>
          <input
            type={"number"}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            onClick={onClick}
          />
        </div>
      );

    case "select":
      return (
        <div className="input-item">
          <label>
            <span>
              {label} {required ? <span style={{ color: "red" }}>*</span> : ""}
            </span>
          </label>
          <select
            value={value}
            onChange={onChange}
            required={required}
            disabled={disabled}
            onClick={onClick}
          >
            <option value={typeof value === "string" ? "" : 0} disabled>
              {placeholder}
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
          <label>
            <span>
              {label} {required ? <span style={{ color: "red" }}>*</span> : ""}
            </span>
          </label>
          <textarea
            value={value}
            onChange={onChange}
            required={required}
            placeholder={placeholder}
            disabled={disabled}
            onClick={onClick}
          />
        </div>
      );

    case "password":
      return (
        <div className="input-item">
          <span>
            {label} {required ? <span style={{ color: "red" }}>*</span> : ""}
          </span>
          <input
            type={"password"}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            onClick={onClick}
          />
        </div>
      );
  }
}
