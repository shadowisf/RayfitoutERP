"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import FormPopUp from "@/app/components/FormPopup";
import Button from "@/app/components/Button";
import { toast } from "@/app/components/Toast";
import { PredefinedItem } from "@/app/components/_MultipleSelectMaterialItemButton";
import { useAuth } from "@/app/context/AuthContext";

type MaterialItem = PredefinedItem & {
  database?: string | null;
  is_archived?: number | null;
};

type Props = {
  item: MaterialItem;
  onSuccess: () => void;
};

export default function RestoreArchivedMaterialButton({
  item,
  onSuccess,
}: Props) {
  const { userInfo } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getPredefinedItems`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: item.id,
            is_archived: 0,
            changed_by: userInfo?.name ?? null,
          }),
        },
      );
      if (!res.ok) throw new Error();
      toast("Material restored.", "success");
      setIsOpen(false);
      onSuccess();
    } catch {
      toast("Failed to restore material.", "error");
    }
  };

  const modal = isOpen && (
    <FormPopUp
      header="RESTORE MATERIAL"
      setIsOpen={setIsOpen}
      handleSubmit={handleSubmit}
      addButtonLabel="CONFIRM"
    >
      <p>
        Are you sure you want to restore{" "}
        <strong>{item.material_description}</strong>
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
        <img src="/icons/rewind.svg" alt="" /> Restore
      </Button>

      {typeof window !== "undefined" &&
        modal &&
        createPortal(modal, document.body)}
    </>
  );
}
