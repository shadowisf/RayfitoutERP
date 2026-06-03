"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import FormPopUp from "@/app/components/FormPopup";
import Button from "@/app/components/Button";
import { toast } from "@/app/components/Toast";
import { PredefinedItem } from "@/app/components/_MultipleSelectMaterialItemButton";

type MaterialItem = PredefinedItem & {
  database?: string | null;
  is_archived?: number | null;
};

type Props = {
  item: MaterialItem;
  onSuccess: () => void;
};

export default function DeleteArchivedMaterialButton({
  item,
  onSuccess,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = async () => {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getPredefinedItems`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [item.id] }),
      },
    );
    if (!res.ok) throw new Error();
    toast("Material permanently deleted.", "success");
    setIsOpen(false);
    onSuccess();
  };

  const modal = isOpen && (
    <FormPopUp
      header="DELETE MATERIAL"
      setIsOpen={setIsOpen}
      handleSubmit={handleSubmit}
      addButtonLabel="CONFIRM"
    >
      <p>
        Are you sure you want to delete{" "}
        <strong>{item.material_description}</strong>?
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
    </FormPopUp>
  );

  return (
    <>
      <Button
        componentType="button"
        bgColor="transparent"
        borderColor="transparent"
        textColor="black"
        full
        style={{ justifyContent: "flex-start" }}
        onClick={() => setIsOpen(true)}
      >
        <img src="/icons/trash.svg" alt="" />
        Delete
      </Button>

      {typeof window !== "undefined" &&
        modal &&
        createPortal(modal, document.body)}
    </>
  );
}
