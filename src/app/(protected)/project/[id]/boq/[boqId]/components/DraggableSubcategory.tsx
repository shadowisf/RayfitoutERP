
"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ReactNode } from "react";

interface DraggableSubcategoryProps {
  id: string;
  children: ReactNode;
  isDragEnabled: boolean;
}

export function DraggableSubcategory({
  id,
  children,
  isDragEnabled,
}: DraggableSubcategoryProps) {
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
    opacity: isDragging ? 0.7 : 1,
    marginBottom: isDragging ? "20px" : "0",
  };

  return (
    <div ref={setNodeRef} style={style}>
      {children}
    </div>
  );
}
