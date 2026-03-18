"use client";

type HoverLoadingCursorProps = {
  mouseX: number;
  mouseY: number;
};

export default function HoverLoadingCursor({
  mouseX,
  mouseY,
}: HoverLoadingCursorProps) {
  return (
    <div
      style={{
        position: "fixed",
        left: mouseX + 14,
        top: mouseY + 14,
        width: "18px",
        height: "18px",
        pointerEvents: "none",
        zIndex: 10001,
      }}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 18 18"
        style={{ animation: "hover-cursor-spin 2s linear forwards" }}
      >
        <circle
          cx="9"
          cy="9"
          r="7"
          fill="none"
          stroke="rgba(200, 200, 200, 0.4)"
          strokeWidth="2.5"
        />
        <circle
          cx="9"
          cy="9"
          r="7"
          fill="none"
          stroke="rgba(46, 204, 135, 1)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="44"
          strokeDashoffset="44"
          style={{ animation: "hover-cursor-fill 2s linear forwards" }}
        />
      </svg>
    </div>
  );
}
