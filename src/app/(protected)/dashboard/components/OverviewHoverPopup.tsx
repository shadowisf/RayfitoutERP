"use client";

type OverviewHoverPopupProps = {
  mouseX: number;
  mouseY: number;
  items: any[];
  totalCount: number;
  columns: { key: string; label: string; format?: (val: any) => string }[];
  isLoading?: boolean;
  emptyMessage?: string;
};

export default function OverviewHoverPopup({
  mouseX,
  mouseY,
  items,
  totalCount,
  columns,
  isLoading,
  emptyMessage = "No items found",
}: OverviewHoverPopupProps) {
  // Clamp position so popup doesn't go off-screen
  const popupWidth = 360;
  const popupMaxHeight = 400;
  const offsetX = 20;
  const offsetY = 20;

  // Use viewport-aware positioning
  const left =
    mouseX + offsetX + popupWidth > window.innerWidth
      ? mouseX - popupWidth - 10
      : mouseX + offsetX;

  const top =
    mouseY + offsetY + popupMaxHeight > window.innerHeight
      ? Math.max(10, mouseY - popupMaxHeight)
      : mouseY + offsetY;

  const remaining = totalCount - items.length;

  return (
    <div
      style={{
        position: "fixed",
        left,
        top,
        backgroundColor: "white",
        border: "1px solid rgba(223,223,223,1)",
        borderRadius: "10px",
        padding: "15px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        zIndex: 10000,
        minWidth: "280px",
        maxWidth: `${popupWidth}px`,
        maxHeight: `${popupMaxHeight}px`,
        overflowY: "auto",
        pointerEvents: "none",
      }}
    >
      {isLoading ? (
        <div style={{ textAlign: "center", color: "#888", fontSize: "13px" }}>
          Loading...
        </div>
      ) : items.length > 0 ? (
        <>
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
                fontSize: "12px",
                color: "#888",
                marginTop: "8px",
              }}
            >
              and {remaining} more...
            </div>
          )}
        </>
      ) : (
        <div style={{ textAlign: "center", fontSize: "13px", color: "#888" }}>
          {emptyMessage}
        </div>
      )}
    </div>
  );
}
