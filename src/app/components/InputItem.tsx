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
}: InputItemProps) {
  switch (type) {
    case "date":
      return (
        <div className="input-item">
          <label>{label}</label>
          <input
            type={"date"}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
          />
        </div>
      );

    case "text":
      return (
        <div className="input-item">
          <label>{label}</label>
          <input
            type={"text"}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
          />
        </div>
      );

    case "number":
      return (
        <div className="input-item">
          <label>{label}</label>
          <input
            type={"number"}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
          />
        </div>
      );

    case "select":
      return (
        <div className="input-item">
          <label>{label}</label>
          <select value={value} onChange={onChange} required={required} disabled={disabled}>
            <option value={typeof value === "string" ? "" : 0} disabled>
              {placeholder}
            </option>
            {selectOptions
              ? selectOptions.map((o) => <option key={o}>{o}</option>)
              : dbMap}
          </select>
        </div>
      );

    case "textarea":
      return (
        <div className="input-item">
          <label>{label}</label>
          <textarea
            value={value}
            onChange={onChange}
            required={required}
            placeholder={placeholder}
            disabled={disabled}
          ></textarea>
        </div>
      );

    case "password":
      return (
        <div className="input-item">
          <label>{label}</label>
          <input
            type={"password"}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
          />
        </div>
      );
  }
}
