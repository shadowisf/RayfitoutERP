type ButtonProps = {
  componentType: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  full?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
  onClick?: (() => void) | ((e: React.MouseEvent<HTMLButtonElement>) => void);
  href?: string;
  target?: string;
  type?: "button" | "submit" | "reset";
  style?: React.CSSProperties;
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
  style,
  target,
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
          ...style,
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
          ...style,
        }}
        href={href}
        target={target}
      >
        {children}
      </a>
    );
  }
}
