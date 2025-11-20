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
  ) => void;
  selectOptions?: string[];
  dbMap?: React.ReactNode;
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
          />
        </div>
      );

    case "select":
      return (
        <div className="input-item">
          <label>{label}</label>
          <select value={value} onChange={onChange} required={required}>
            <option value={typeof value === "string" ? "" : 0} disabled>
              {placeholder}
            </option>
            {selectOptions
              ? selectOptions.map((o) => <option key={o}>{o}</option>)
              : dbMap}
          </select>
        </div>
      );
  }
}
