"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import FormPopUp from "@/app/components/FormPopup";
import Button from "@/app/components/Button";
import { toast } from "@/app/components/Toast";

type Props = {
  dbId: number;
  dbName: string;
  itemCount: number;
  onSuccess: () => void;
};

export default function ArchiveDatabaseButton({
  dbId,
  dbName,
  itemCount,
  onSuccess,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const isEmpty = itemCount === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEmpty) {
        // Empty database — just remove the registry entry
        const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "deleteDatabase", id: dbId }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          toast(err?.error || "Failed to delete database.", "error");
          return;
        }
        toast(`Database "${dbName}" deleted.`, "success");
      } else {
        // Has items — archive them all
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getPredefinedItems`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "archiveDatabase", db_id: dbId }),
          },
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          toast(err?.error || "Failed to archive database.", "error");
          return;
        }
        toast(`Database "${dbName}" archived successfully.`, "success");
      }
      setIsOpen(false);
      onSuccess();
    } catch {
      toast("Something went wrong.", "error");
    }
  };

  const modal = isOpen && (
    <FormPopUp
      header={isEmpty ? "DELETE DATABASE" : "ARCHIVE DATABASE"}
      setIsOpen={setIsOpen}
      handleSubmit={handleSubmit}
      addButtonLabel="CONFIRM"
    >
      {isEmpty ? (
        <>
          <p>
            Are you sure you want to delete database <strong>{dbName}</strong>?
            It has no materials.
          </p>

          <br />

          <p
            style={{
              color: "rgba(200,60,60,1)",
              fontWeight: 600,
            }}
          >
            This action cannot be undone.
          </p>
        </>
      ) : (
        <>
          <p>
            Are you sure you want to archive{" "}
            <strong>
              {itemCount} material{itemCount !== 1 ? "s" : ""}
            </strong>{" "}
            in database <strong>{dbName}</strong>?
          </p>

          <br />

          <p style={{ color: "rgba(200,60,60,1)", fontWeight: 600 }}>
            This action cannot be undone.
          </p>
        </>
      )}
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
        title={isEmpty ? "Delete database" : "Archive all in database"}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(true);
        }}
        style={{ padding: "0px" }}
      >
        <img src="/icons/trash.svg" alt="archive" />
      </Button>

      {typeof window !== "undefined" &&
        modal &&
        createPortal(modal, document.body)}
    </>
  );
}
