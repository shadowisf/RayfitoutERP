type InputItemProps = {
  label: string;
  value: string;
  type: string;
  placeholder: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

export default function InputItem({
  label,
  value,
  type,
  placeholder,
  onChange,
}: InputItemProps) {
  return (
    <div className="input-item">
      <label htmlFor="name">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required
      />
    </div>
  );
}
