"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import FormPopUp from "@/app/components/FormPopup";
import Button from "@/app/components/Button";

type Props = {
  categoryName: string;
  count: number;
  onConfirm: () => Promise<void>;
  inverted?: boolean;
};

export default function RestoreArchivedCategoryButton({
  categoryName,
  count,
  onConfirm,
  inverted = false,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = async () => {
    await onConfirm();
    setIsOpen(false);
  };

  const modal = isOpen && (
    <FormPopUp
      header="RESTORE CATEGORY"
      setIsOpen={setIsOpen}
      handleSubmit={handleSubmit}
      addButtonLabel="CONFIRM"
      haveLoadingState
    >
      <p>
        Are you sure you want to restore{" "}
        <strong>
          {count} material{count !== 1 ? "s" : ""}
        </strong>{" "}
        in category <strong>&quot;{categoryName}&quot;</strong>?
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
        <img
          src="/icons/rewind.svg"
          alt="restore"
          style={{ filter: inverted ? "invert(1)" : "none" }}
        />
      </Button>

      {typeof window !== "undefined" &&
        modal &&
        createPortal(modal, document.body)}
    </>
  );
}
