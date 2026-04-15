"use client";

type OverviewHoverPopupProps = {
  mouseX: number;
  mouseY: number;
  items: any[];
  totalCount: number;
  columns: { key: string; label: string; format?: (val: any) => string }[];
  isLoading?: boolean;
  emptyMessage?: string;
  anchorRect?: DOMRect | null;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
};

export default function OverviewHoverPopup({
  mouseX,
  mouseY,
  items,
  totalCount,
  columns,
  isLoading,
  emptyMessage = "No items found",
  anchorRect,
  onMouseEnter,
  onMouseLeave,
}: OverviewHoverPopupProps) {
  const popupWidth = 360;

  let left: number;
  let top: number;

  if (anchorRect) {
    // Stationary positioning anchored to widget
    const spaceRight = window.innerWidth - anchorRect.right;
    left = spaceRight >= popupWidth + 10
      ? anchorRect.right + 10
      : anchorRect.left - popupWidth - 10;
    left = Math.max(10, left);
    top = 10;
  } else {
    // Legacy mouse-following positioning
    const offsetX = 20;
    const offsetY = 20;
    const popupMaxHeight = 350;
    left = mouseX + offsetX + popupWidth > window.innerWidth
      ? mouseX - popupWidth - 10
      : mouseX + offsetX;
    top = mouseY + offsetY + popupMaxHeight > window.innerHeight
      ? Math.max(10, mouseY - popupMaxHeight)
      : mouseY + offsetY;
  }

  const remaining = totalCount - items.length;

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        left,
        top,
        backgroundColor: "white",
        color: "black",
        border: "1px solid rgba(223,223,223,1)",
        borderRadius: "10px",
        padding: "0",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        zIndex: 10000,
        minWidth: "280px",
        maxWidth: `${popupWidth}px`,
        maxHeight: anchorRect ? "calc(100vh - 20px)" : undefined,
        overflowY: anchorRect ? "auto" : undefined,
        pointerEvents: anchorRect ? "auto" : "none",
        cursor: "default",
        userSelect: "text",
      }}
    >
      {isLoading ? (
        <div
          style={{
            textAlign: "center",
            color: "#888",
            fontSize: "13px",
            padding: "15px",
          }}
        >
          Loading...
        </div>
      ) : items.length > 0 ? (
        <>
          <div style={{ padding: "12px 12px 0 12px" }}>
            <table className="items-table popup-hover">
              <thead>
                <tr>
                  {columns.map((col) => (
                    <th key={col.key}>{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx}>
                    {columns.map((col) => (
                      <td key={col.key}>
                        {col.format ? col.format(item[col.key]) : item[col.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {remaining > 0 && (
              <div
                style={{
                  textAlign: "center",
                  fontSize: "11px",
                  color: "#888",
                  marginTop: "6px",
                  paddingBottom: "4px",
                }}
              >
                {remaining} more...
              </div>
            )}
          </div>

          {/* Footer hint */}
          <div
            style={{
              borderTop: "1px solid rgba(223,223,223,1)",
              padding: "8px 12px",
              textAlign: "center",
              fontSize: "11px",
              fontWeight: 600,
              color: "#888",
            }}
          >
            CLICK WIDGET TO VIEW DETAILS
          </div>
        </>
      ) : (
        <div
          style={{
            textAlign: "center",
            fontSize: "13px",
            color: "#888",
            padding: "15px",
          }}
        >
          {emptyMessage}
        </div>
      )}
    </div>
  );
}
