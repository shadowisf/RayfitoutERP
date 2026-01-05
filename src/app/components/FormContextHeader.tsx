type FormContextHeaderProps = {
  children: string;
};

export default function FormContextHeader({
  children,
}: FormContextHeaderProps) {
  return (
    <div style={{ display: "flex", gap: "25px", marginBottom: "15px" }}>
      <span
        style={{
          color: "rgba(89, 89, 89, 1)",
          textTransform: "uppercase",
          fontWeight: "600",
        }}
      >
        {children}
      </span>
      <div
        style={{
          borderTop: "1px solid rgba(217, 217, 217, 1)",
          flex: "1",
          marginTop: "6px",
        }}
      ></div>
    </div>
  );
}
