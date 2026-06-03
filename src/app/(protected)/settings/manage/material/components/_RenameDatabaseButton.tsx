"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import Button from "@/app/components/Button";
import { toast } from "@/app/components/Toast";

type Props = {
  dbId: number;
  dbName: string;
  onSuccess: (newName: string) => void;
};

export default function RenameDatabaseButton({
  dbId,
  dbName,
  onSuccess,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Pre-fill with current name whenever popup opens
  useEffect(() => {
    if (isOpen) setNewName(dbName);
  }, [isOpen, dbName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) {
      toast("Database name is required.", "error");
      return;
    }
    if (trimmed === dbName) {
      setIsOpen(false);
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getPredefinedItems`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "renameDatabase",
            db_id: dbId,
            new_name: trimmed,
          }),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast(err?.error || "Failed to rename database.", "error");
        return;
      }
      toast("Database renamed successfully.", "success");
      setIsOpen(false);
      onSuccess(trimmed);
    } catch {
      toast("Something went wrong.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const modal = isOpen && (
    <FormPopUp
      header="RENAME DATABASE"
      setIsOpen={setIsOpen}
      handleSubmit={handleSubmit}
      addButtonLabel={"CONFIRM"}
    >
      <div className="input-row full">
        <InputItem
          label="DATABASE NAME"
          value={newName}
          type="text"
          required
          onChange={(e) => setNewName(e.target.value)}
          noOptionalLabel
        />
      </div>
    </FormPopUp>
  );

  return (
    <>
      <Button
        componentType="button"
        bgColor="transparent"
        borderColor="transparent"
        textColor="black"
        type="button"
        title="Rename database"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(true);
        }}
        style={{
          padding: "0px",
        }}
      >
        <img src="/icons/pencil.svg" alt="rename" />
      </Button>

      {typeof window !== "undefined" &&
        modal &&
        createPortal(modal, document.body)}
    </>
  );
}
