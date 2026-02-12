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
  disabled?: boolean;
  className?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onDragOver?: (e: any) => void;
  onDragLeave?: (e: any) => void;
  onDrop?: (e: any) => void;
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
  disabled,
  onMouseEnter,
  onMouseLeave,
  onDragOver,
  onDragLeave,
  onDrop,
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
        disabled={disabled}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {children}
      </button>
    );
  }

  if (componentType === "none") {
    return (
      <div
        className="button-like"
        style={{
          backgroundColor: bgColor,
          border: `1px solid ${borderColor}`,
          color: textColor,
          width: full ? "100%" : "fit-content",
          ...style,
          pointerEvents: disabled ? "none" : "auto",
        }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {children}
      </div>
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
          pointerEvents: disabled ? "none" : "auto",
          opacity: disabled ? 0.5 : 1,
        }}
        href={href}
        target={target}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {children}
      </a>
    );
  }
}
