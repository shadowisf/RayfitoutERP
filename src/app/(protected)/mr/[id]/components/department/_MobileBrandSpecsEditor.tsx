"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { MrLine } from "../../types/mrLine";

type Props = {
  item: MrLine;
  stageName?: string;
};

export default function MobileBrandSpecsEditor({ item, stageName }: Props) {
  const { userInfo } = useAuth();

  const [specification, setSpecification] = useState(item.specification || "");

  // Track whether values have changed from the item props
  const isFirstRender = useRef(true);

  // Auto-save with 1-second debounce after any change
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const timer = setTimeout(async () => {
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateMrLineBrandSpec",
          id: item.id,
          brand: item.brand || null,
          specification: specification.trim() || null,
          notes: item.notes || null,
          changed_by: userInfo?.name || null,
          stage_name: stageName || "INITIAL APPROVAL",
        }),
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [specification]);

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "7px 10px",
    borderRadius: "6px",
    border: "1px solid rgba(217,217,217,1)",
    fontSize: "12px",
    background: "white",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
  };

  return (
    <textarea
      value={specification}
      onChange={(e) => setSpecification(e.target.value)}
      rows={2}
      style={{ ...inputStyle, resize: "none" }}
    />
  );
}
