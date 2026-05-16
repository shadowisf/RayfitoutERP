"use client";

import { useState } from "react";
import FormPopUp from "@/app/components/FormPopup";
import { toast } from "@/app/components/Toast";
import { BoqHeader } from "../boq/[boqId]/types/boqHeader";

type Props = {
  boqs: [BoqHeader, BoqHeader]; // exactly 2
  onSuccess?: () => void;
  onClose?: () => void;
};

export function MergeBoqHeadersButton({ boqs, onSuccess, onClose }: Props) {
  const [baseId, setBaseId] = useState<number>(boqs[0].id);
  const [loading, setLoading] = useState(false);

  const baseBoq = boqs.find((b) => b.id === baseId)!;
  const sourceBoq = boqs.find((b) => b.id !== baseId)!;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/boq`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mergeBoqHeaders",
          base_id: baseBoq.id,
          source_id: sourceBoq.id,
        }),
      });

      if (res.ok) {
        toast("BOQs merged successfully", "success");
        onSuccess?.();
      } else {
        toast("Failed to merge BOQs", "error");
      }
    } catch {
      toast("Failed to merge BOQs", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormPopUp
      header="MERGE BOQs"
      setIsOpen={(val) => {
        const resolved = typeof val === "function" ? val(true) : val;
        if (!resolved) onClose?.();
      }}
      handleSubmit={handleSubmit}
      addButtonLabel={loading ? "MERGING..." : "CONFIRM MERGE"}
      style={{ width: "480px" }}
    >
      <p style={{ marginBottom: "20px", color: "rgba(80,80,80,1)", fontSize: "13px" }}>
        All lines from the <strong>source</strong> BOQ will be copied into the{" "}
        <strong>base</strong> BOQ. The source BOQ will then be deleted.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {boqs.map((boq) => {
          const isBase = boq.id === baseId;
          return (
            <label
              key={boq.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
                padding: "14px 16px",
                border: `1.5px solid ${isBase ? "rgba(0,163,93,1)" : "rgba(211,211,211,1)"}`,
                borderRadius: "8px",
                cursor: "pointer",
                backgroundColor: isBase ? "rgba(240,253,247,1)" : "white",
                transition: "all 0.15s ease",
              }}
            >
              <input
                type="radio"
                name="base_boq"
                value={boq.id}
                checked={isBase}
                onChange={() => setBaseId(boq.id)}
                className="manager-checkbox"
                style={{ marginTop: "2px" }}
              />
              <div>
                <div style={{ fontWeight: 600, fontSize: "13px" }}>
                  BOQ-{String(boq.id).padStart(5, "0")}
                  <span
                    style={{
                      marginLeft: "8px",
                      padding: "2px 8px",
                      borderRadius: "50px",
                      fontSize: "10px",
                      fontWeight: 700,
                      backgroundColor: isBase
                        ? "rgba(0,163,93,0.15)"
                        : "rgba(239,239,239,1)",
                      color: isBase ? "rgba(0,120,70,1)" : "rgba(100,100,100,1)",
                    }}
                  >
                    {isBase ? "BASE (keep)" : "SOURCE (delete after merge)"}
                  </span>
                </div>
                <div style={{ fontSize: "12px", color: "rgba(100,100,100,1)", marginTop: "4px" }}>
                  {boq.name}
                </div>
                <div style={{ fontSize: "11px", color: "rgba(150,150,150,1)", marginTop: "2px" }}>
                  {boq.total_items ?? 0} items · {boq.project_currency}{" "}
                  {(Number(boq.total_value) - Number(boq.discount) || 0).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </div>
            </label>
          );
        })}
      </div>
    </FormPopUp>
  );
}
