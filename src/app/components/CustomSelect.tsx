"use client";

import { useState, useRef, useEffect } from "react";

export type BoqItem = {
  id: number;
  label: string;
};

type CustomSelectProps = {
  boqList: BoqItem[];
  selectedId?: number;
  onChange?: (selected: BoqItem) => void;
};

export default function CustomSelect({
  boqList,
  selectedId,
  onChange,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Derive selected from selectedId if provided
  const selected = boqList.find((b) => b.id === selectedId) || null;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter items based on search
  const filtered = boqList.filter((item) =>
    item.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="custom-select-wrapper" ref={dropdownRef}>
      {/* Select trigger */}
      <div className="fake-select" onClick={() => setOpen(!open)}>
        {selected ? selected.label : "Select BOQ"}
        <span className="arrow">▾</span>
      </div>

      {open && (
        <div className="dropdown-panel">
          {/* Search bar */}
          <div className="search-bar">
            <input
              type="text"
              value={search}
              placeholder="Search"
              onChange={(e) => setSearch(e.target.value)}
            />
            <img src="/icons/search.svg" width={18} alt="search icon" />
          </div>

          {/* List items */}
          <div className="dropdown-list">
            {filtered.map((boq) => (
              <div
                key={boq.id}
                className={`dropdown-item ${
                  selected?.id === boq.id ? "selected" : ""
                }`}
                onClick={() => {
                  onChange ? onChange(boq) : null;
                  setOpen(false);
                }}
              >
                {boq.label}
              </div>
            ))}
          </div>

          {/* Create new BOQ */}
          <button className="create-btn" type="button">
            <span>＋</span> CREATE NEW BOQ
          </button>
        </div>
      )}
    </div>
  );
}
