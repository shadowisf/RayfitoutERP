import React from "react";

type LoadingSpinnerProps = {
  size?: number;
  color?: string;
  style?: React.CSSProperties;
};

export default function LoadingSpinner({
  size = 40,
  color = "black",
  style,
}: LoadingSpinnerProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px",
        ...style,
      }}
    >
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          border: `3px solid rgba(0,0,0,0.1)`,
          borderTop: `3px solid ${color}`,
          borderRadius: "50%",
          animation: "spin 0.7s linear infinite",
        }}
      />
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
