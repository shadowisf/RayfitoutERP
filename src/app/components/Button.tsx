type ButtonProps = {
  componentType: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  full?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  type?: "button" | "submit" | "reset";
};

export default function Button({
  componentType,
  bgColor,
  borderColor,
  textColor,
  full,
  onClick,
  children,
  href,
  type,
}: ButtonProps) {
  if (componentType === "button") {
    return (
      <button
        className="custom"
        style={{
          backgroundColor: bgColor,
          border: `1px solid ${borderColor}`,
          color: textColor,
          width: full ? "100%" : "fit-content",
        }}
        onClick={onClick}
        type={type ? type : undefined}
      >
        {children}
      </button>
    );
  }

  if (componentType === "link") {
    return (
      <a
        className="custom"
        style={{
          backgroundColor: bgColor,
          border: `1px solid ${borderColor}`,
          color: textColor,
          width: full ? "100%" : "fit-content",
        }}
        href={href}
      >
        {children}
      </a>
    );
  }
}
