// app/(protected)/boq/[id]/components/DraggableItem.tsx
"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ReactNode } from "react";

interface DraggableBoqItemProps {
  id: string;
  children: ReactNode;
  isDragEnabled: boolean;
  categoryIndex: number;
  subCategoryIndex: number;
  itemIndex: number;
  checkboxCell?: ReactNode;
}

export function DraggableBoqItem({
  id,
  children,
  isDragEnabled,
  categoryIndex,
  subCategoryIndex,
  itemIndex,
  checkboxCell,
}: DraggableBoqItemProps) {
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

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    backgroundColor: isDragging ? "#f5f5f5" : "transparent",
  };

  return (
    <tr ref={setNodeRef} style={style}>
      {checkboxCell}
      <td>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {isDragEnabled && (
            <span
              {...attributes}
              {...listeners}
              style={{
                color: "#999",
                fontSize: "16px",
                cursor: "grab",
                userSelect: "none",
              }}
              title="Drag to reorder item"
            >
              ⋮⋮
            </span>
          )}
          <span>
            {categoryIndex + 1}.{subCategoryIndex + 1}.{itemIndex + 1}
          </span>
        </div>
      </td>
      {children}
    </tr>
  );
}
