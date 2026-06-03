"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import FormPopUp from "@/app/components/FormPopup";
import Button from "@/app/components/Button";
import { toast } from "@/app/components/Toast";

type Props = {
  subCategoryName: string;
  count: number;
  onConfirm: () => Promise<void>;
};

export default function DeleteArchivedSubCategoryButton({
  subCategoryName,
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
      header="DELETE SUBCATEGORY"
      setIsOpen={setIsOpen}
      handleSubmit={handleSubmit}
      addButtonLabel="CONFIRM"
    >
      <p>
        Are you sure you want to permanently delete{" "}
        <strong>
          {count} material{count !== 1 ? "s" : ""}
        </strong>{" "}
        in subcategory <strong>&quot;{subCategoryName}&quot;</strong>?
      </p>

      <br />

      <p style={{ color: "rgba(200,60,60,1)", fontWeight: 600 }}>
        This action cannot be undone.
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
        <img src="/icons/trash.svg" alt="delete" />
      </Button>

      {typeof window !== "undefined" &&
        modal &&
        createPortal(modal, document.body)}
    </>
  );
}
