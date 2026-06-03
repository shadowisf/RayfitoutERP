"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import FormPopUp from "@/app/components/FormPopup";
import Button from "@/app/components/Button";
import { UNIT_OPTIONS } from "@/constants/units";

type Props = {
  filterUnits: string[];
  onChange: (units: string[]) => void;
};

export default function FilterButton({ filterUnits, onChange }: Props) {
  const [showPopup, setShowPopup] = useState(false);
  const [tempUnits, setTempUnits] = useState<string[]>([]);

  const open = () => {
    setTempUnits(filterUnits);
    setShowPopup(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onChange(tempUnits);
    setShowPopup(false);
  };

  const modal = showPopup && (
    <FormPopUp
      header="FILTER MATERIALS"
      setIsOpen={setShowPopup}
      handleSubmit={handleSubmit}
      addButtonLabel="CONFIRM"
      secondButton={
        <Button
          componentType="button"
          bgColor="white"
          borderColor="black"
          textColor="black"
          onClick={() => {
            setTempUnits([]);
            onChange([]);
            setShowPopup(false);
          }}
        >
          RESET
        </Button>
      }
    >
      <h3 style={{ marginBottom: "12px", fontSize: "14px", fontWeight: 600 }}>
        UNIT
      </h3>
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          padding: "10px",
          marginBottom: "24px",
        }}
      >
        <div style={{ marginBottom: "10px" }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              className="filter-checkbox"
              checked={tempUnits.length === UNIT_OPTIONS.length}
              onChange={(e) =>
                setTempUnits(e.target.checked ? [...UNIT_OPTIONS] : [])
              }
            />
            <h4>Select All</h4>
          </label>
        </div>
        <div style={{ maxHeight: "250px", overflowY: "auto" }}>
          {UNIT_OPTIONS.map((unit) => (
            <div key={unit} style={{ marginBottom: "10px" }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  className="filter-checkbox"
                  checked={tempUnits.includes(unit)}
                  onChange={(e) =>
                    setTempUnits((prev) =>
                      e.target.checked
                        ? [...prev, unit]
                        : prev.filter((u) => u !== unit),
                    )
                  }
                />
                <h4>{unit}</h4>
              </label>
            </div>
          ))}
        </div>
      </div>
    </FormPopUp>
  );

  return (
    <>
      <div
        style={{
          display: "flex",
          gap: "8px",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <Button
          componentType="button"
          bgColor="white"
          borderColor="rgba(241,244,246,1)"
          textColor="black"
          type="button"
          onClick={open}
          style={{ borderRadius: "50px" }}
        >
          FILTER <img src="/icons/filter.svg" alt="filter" />
        </Button>

        {filterUnits.length > 0 && (
          <Button
            componentType="button"
            type="button"
            bgColor="rgba(239,239,239,1)"
            borderColor="transparent"
            textColor="black"
            onClick={() => onChange([])}
            style={{
              borderRadius: "50px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            UNIT:{" "}
            <span style={{ color: "rgba(16,185,129,1)" }}>
              {filterUnits[0]}
              {filterUnits.length > 1
                ? `, +${filterUnits.length - 1} MORE`
                : ""}
            </span>
            <img
              src="/icons/cross-small.svg"
              alt="remove"
              style={{ width: "10px", marginBottom: "2px" }}
            />
          </Button>
        )}
      </div>

      {typeof window !== "undefined" &&
        modal &&
        createPortal(modal, document.body)}
    </>
  );
}
