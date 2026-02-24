// app/(protected)/boq/[id]/components/DraggableCategory.tsx
"use client";

import { useSortable } from "@dnd-kit/sortable";
import { ReactNode, CSSProperties } from "react";

interface DraggableCategoryProps {
  id: string;
  children: ReactNode;
  isDragEnabled: boolean;
  isActive: boolean;
  onClick: () => void;
}

export function DraggableCategory({
  id,
  children,
  isDragEnabled,
  isActive,
  onClick,
}: DraggableCategoryProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    disabled: !isDragEnabled,
  });

  // Only allow horizontal transformation, remove vertical
  const style: CSSProperties = {
    transform: transform
      ? `translate3d(${transform.x}px, 0, 0)` // Force Y to always be 0
      : undefined,
    transition,
    opacity: isDragging ? 0.5 : 1,
    flexShrink: 0,
    cursor: isDragEnabled ? "grab" : "pointer",
    display: "flex",
    alignItems: "center",
    gap: "5px",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`item ${isActive ? "active" : ""}`}
    >
      {isDragEnabled && (
        <div
          {...attributes}
          {...listeners}
          style={{
            display: "flex",
            alignItems: "center",
            color: "#999",
            userSelect: "none",
            cursor: "grab",
          }}
          onClick={(e) => e.stopPropagation()}
          title="Drag to reorder category"
        >
          ⋮⋮
        </div>
      )}
      <div onClick={onClick} style={{ flex: 1 }}>
        {children}
      </div>
    </div>
  );
}
