"use client";

import { useState } from "react";

type TableHeaderTooltipHoverProps = {
  children: React.ReactNode;
  width?: number;
};

export default function TableHeaderTooltipHover({
  children,
  width = 280,
}: TableHeaderTooltipHoverProps) {
  const [show, setShow] = useState(false);

  return (
    <span
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
      }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span
        style={{
          width: "16px",
          height: "16px",
          borderRadius: "50%",
          backgroundColor: "black",
          color: "white",
          fontSize: "9px",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          fontStyle: "normal",
          paddingTop: "1px",
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        i
      </span>
      {show && (
        <div
          style={{
            position: "fixed",
            backgroundColor: "rgba(30,30,30,1)",
            color: "white",
            padding: "10px 14px",
            fontSize: "12px",
            fontWeight: 400,
            fontStyle: "normal",
            lineHeight: "1.5",
            width: `${width}px`,
            whiteSpace: "normal",
            zIndex: 99999,
            pointerEvents: "none",
          }}
          ref={(el) => {
            if (el) {
              const icon = el.previousElementSibling as HTMLElement;
              if (icon) {
                const rect = icon.getBoundingClientRect();
                const tooltipHeight = el.offsetHeight;
                const spaceRight = window.innerWidth - rect.right - 12;
                const arrow = el.lastElementChild as HTMLElement;

                // Horizontal: open right if space, else left
                if (spaceRight >= width) {
                  el.style.left = `${rect.right + 12}px`;
                  el.style.right = "auto";
                  if (arrow) {
                    arrow.style.left = "-5px";
                    arrow.style.right = "auto";
                  }
                } else {
                  el.style.right = `${window.innerWidth - rect.left + 12}px`;
                  el.style.left = "auto";
                  if (arrow) {
                    arrow.style.right = "-5px";
                    arrow.style.left = "auto";
                  }
                }

                // Vertical: centre on icon, then clamp within viewport
                const centredTop =
                  rect.top + rect.height / 2 - tooltipHeight / 2;
                const clampedTop = Math.max(
                  8,
                  Math.min(centredTop, window.innerHeight - tooltipHeight - 8),
                );
                el.style.top = `${clampedTop}px`;
                el.style.transform = "none";

                // Adjust arrow to still point at the icon after clamping
                if (arrow) {
                  const arrowTop = rect.top + rect.height / 2 - clampedTop;
                  arrow.style.top = `${arrowTop}px`;
                  arrow.style.transform = "translateY(-50%) rotate(45deg)";
                }
              }
            }
          }}
        >
          {children}
          <div
            style={{
              position: "absolute",
              top: "50%",
              transform: "translateY(-50%) rotate(45deg)",
              width: "10px",
              height: "10px",
              backgroundColor: "rgba(30,30,30,1)",
            }}
          />
        </div>
      )}
    </span>
  );
}
