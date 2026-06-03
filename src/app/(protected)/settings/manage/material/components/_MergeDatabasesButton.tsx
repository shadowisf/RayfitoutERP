"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import FormPopUp from "@/app/components/FormPopup";
import { toast } from "@/app/components/Toast";

type Database = { id: number; name: string; itemCount: number };

type Props = {
  selectedDatabases: Database[];
  onSuccess: (
    targetId: number,
    removedIds: number[],
    mergedName: string,
  ) => void;
};

export default function MergeDatabasesButton({
  selectedDatabases,
  onSuccess,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const targetId = selectedDatabases[0]?.id ?? null;
  const mergedName = selectedDatabases.map((d) => d.name).join(" + ");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetId) return;

    const sourceIds = selectedDatabases.slice(1).map((d) => d.id);

    setIsSaving(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mergeDatabases",
          target_id: targetId,
          source_ids: sourceIds,
          merged_name: mergedName,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data?.error || "Failed to merge databases.", "error");
        return;
      }
      toast("Databases merged successfully.", "success");
      setIsOpen(false);
      onSuccess(targetId, sourceIds, mergedName);
    } catch {
      toast("Failed to merge databases.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          color: "rgba(0,123,255,1)",
          fontSize: "12px",
          fontWeight: 600,
          textDecoration: "underline",
          padding: "7px 8px",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        Merge {selectedDatabases.length} Databases
        <img src="/icons/merge-blue.svg" alt="" />
      </button>

      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <FormPopUp
            header="MERGE DATABASES"
            setIsOpen={setIsOpen}
            handleSubmit={handleSubmit}
            addButtonLabel={"CONFIRM"}
          >
            {/* Database list */}
            <div>
              {selectedDatabases.map((db) => (
                <p key={db.id}>
                  {db.name}{" "}
                  <span>
                    — {db.itemCount} material{db.itemCount !== 1 ? "s" : ""}
                  </span>
                </p>
              ))}
            </div>
          </FormPopUp>,
          document.body,
        )}
    </>
  );
}
