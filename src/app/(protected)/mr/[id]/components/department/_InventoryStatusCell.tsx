"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

export type InventoryMatch = {
  inventory_item_id: number;
  inventory_description: string;
  unit: string;
  total_qty: number;
  locations: string[];
  match_type: "exact" | "similar";
};

type Props = {
  matches: InventoryMatch[] | undefined;
};

const GREEN_BG   = "rgba(214, 243, 214, 1)";
const RED_BG     = "rgba(255, 221, 221, 1)";
const GREEN_TEXT = "rgba(0, 125, 71, 1)";
const RED_TEXT   = "rgba(248, 77, 77, 1)";

// Broadcast this event when a pill opens so all others close themselves.
const CLOSE_OTHERS = "inventory-status-close-others";

function CheckIcon({ bg }: { bg: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="10" cy="10" r="10" fill={bg} />
      <path d="M5.5 10.5L8.5 13.5L14.5 6.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CrossIcon({ bg }: { bg: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="10" cy="10" r="10" fill={bg} />
      <path d="M6.5 6.5L13.5 13.5M13.5 6.5L6.5 13.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon({ up, color }: { up: boolean; color: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
      <path d={up ? "M2 8L6 4L10 8" : "M2 4L6 8L10 4"} stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ExternalLinkIcon({ color }: { color: string }) {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
      <path d="M5 2H2C1.448 2 1 2.448 1 3V10C1 10.552 1.448 11 2 11H9C9.552 11 10 10.552 10 10V7" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7.5 1H11M11 1V4.5M11 1L5.5 6.5" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function InventoryStatusCell({ matches }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const pillRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const uid = useRef(`inv-${Math.random().toString(36).slice(2)}`);

  // Close when another pill opens
  useEffect(() => {
    const handler = (e: Event) => {
      if ((e as CustomEvent).detail !== uid.current) setExpanded(false);
    };
    window.addEventListener(CLOSE_OTHERS, handler);
    return () => window.removeEventListener(CLOSE_OTHERS, handler);
  }, []);

  // Close on outside click — check both pill and portal dropdown
  useEffect(() => {
    if (!expanded) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const insidePill = pillRef.current?.contains(target);
      const insideDropdown = dropdownRef.current?.contains(target);
      if (!insidePill && !insideDropdown) setExpanded(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [expanded]);

  // Recalculate dropdown position from the pill's current bounding rect
  const recalcPosition = useCallback(() => {
    if (pillRef.current) {
      const rect = pillRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: "fixed",
        top: rect.bottom + 6,
        left: rect.left,
        width: "max-content",
        minWidth: rect.width,
        zIndex: 99999,
      });
    }
  }, []);

  // Keep dropdown pinned to the pill while any ancestor scrolls
  useEffect(() => {
    if (!expanded) return;
    window.addEventListener("scroll", recalcPosition, true);
    return () => window.removeEventListener("scroll", recalcPosition, true);
  }, [expanded, recalcPosition]);

  const toggle = useCallback(() => {
    if (!expanded) {
      window.dispatchEvent(new CustomEvent(CLOSE_OTHERS, { detail: uid.current }));
      recalcPosition();
    }
    setExpanded((v) => !v);
  }, [expanded, recalcPosition]);

  if (matches === undefined) {
    return <div style={{ width: "120px", height: "30px" }} />;
  }

  if (matches.length === 0) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "7px", backgroundColor: RED_BG, borderRadius: "50px", padding: "6px 12px", width: "100%", boxSizing: "border-box" }}>
        <CrossIcon bg={RED_TEXT} />
        <span style={{ fontSize: "11px", fontWeight: 600, color: RED_TEXT, whiteSpace: "nowrap" }}>No match found</span>
      </div>
    );
  }

  const best = matches[0];

  const dropdown = expanded && matches.length > 1 && typeof document !== "undefined"
    ? createPortal(
        <div
          ref={dropdownRef}
          style={{
            ...dropdownStyle,
            backgroundColor: "white",
            border: "1px solid rgba(223, 223, 223, 1)",
            borderRadius: "12px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            overflow: "hidden",
            minWidth: "280px",
          }}
        >
          {matches.map((m, i) => (
            <div
              key={m.inventory_item_id + "-" + i}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 16px",
                borderBottom: i < matches.length - 1 ? "1px solid rgba(239,239,239,1)" : "none",
                gap: "12px",
                backgroundColor: "white",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(248,248,248,1)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "white")}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "7px", flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                  <span style={{ fontSize: "11px", fontWeight: 500, color: "#111", whiteSpace: "nowrap" }}>
                    {m.inventory_description} ({m.total_qty} {m.unit})
                  </span>
                </div>
                <a href={`/inventory/${m.inventory_item_id}`} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                  <ExternalLinkIcon color="#111" />
                </a>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", width: "110px", flexShrink: 0 }}>
                <span style={{ fontSize: "11px", fontStyle: "italic", fontWeight: 600, color: GREEN_TEXT }}>
                  {m.match_type === "exact" ? "Exact Match" : "Similar Match"}
                </span>
                {m.match_type === "exact" && <CheckIcon bg={GREEN_TEXT} />}
              </div>
            </div>
          ))}
        </div>,
        document.body,
      )
    : null;

  return (
    <div ref={pillRef} style={{ position: "relative" }}>
      <div
        style={{ display: "flex", alignItems: "center", gap: "7px", backgroundColor: GREEN_BG, borderRadius: "50px", padding: "6px 10px 6px 12px", width: "100%", boxSizing: "border-box", cursor: "pointer", userSelect: "none" }}
        onClick={toggle}
      >
        <CheckIcon bg={GREEN_TEXT} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
            <span style={{ fontSize: "11px", fontWeight: 600, color: GREEN_TEXT, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {best.inventory_description}
            </span>
            <a
              href={`/inventory/${best.inventory_item_id}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{ display: "flex", alignItems: "center", flexShrink: 0 }}
            >
              <ExternalLinkIcon color={GREEN_TEXT} />
            </a>
          </div>
          <div style={{ fontSize: "10px", color: GREEN_TEXT, opacity: 0.85 }}>
            {best.total_qty} {best.unit}&nbsp;|&nbsp;
            <span style={{ fontStyle: "italic" }}>
              {best.match_type === "exact" ? "Exact Match" : "Similar Match"}
            </span>
          </div>
        </div>

        {matches.length > 1 && <ChevronIcon up={expanded} color={GREEN_TEXT} />}
      </div>

      {dropdown}
    </div>
  );
}
