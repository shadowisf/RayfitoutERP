"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import FormPopUp from "@/app/components/FormPopup";
import Button from "@/app/components/Button";

type Props = {
  databaseName: string;
  count: number;
  onConfirm: () => Promise<void>;
};

export default function RestoreArchivedDatabaseButton({
  databaseName,
  count,
  onConfirm,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = async () => {
    await onConfirm();
    setIsOpen(false);
  };

  const modal = isOpen && (
    <FormPopUp
      header="RESTORE DATABASE"
      setIsOpen={setIsOpen}
      handleSubmit={handleSubmit}
      addButtonLabel="CONFIRM"
    >
      <p>
        Are you sure you want to restore{" "}
        <strong>
          {count} material{count !== 1 ? "s" : ""}
        </strong>{" "}
        in database <strong>&quot;{databaseName}&quot;</strong>?
      </p>
    </FormPopUp>
  );

  return (
    <>
      <Button
        componentType="button"
        bgColor="transparent"
        borderColor="transparent"
        textColor="black"
        style={{ padding: "0px" }}
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
          setIsOpen(true);
        }}
      >
        <img src="/icons/rewind.svg" alt="restore" />
      </Button>

      {typeof window !== "undefined" &&
        modal &&
        createPortal(modal, document.body)}
    </>
  );
}
