"use client";

import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import { useState } from "react";
import { toast } from "@/app/components/Toast";
import { useRouter } from "next/navigation";
import { InventoryItem } from "../../types/inventoryItem";
import { useAuth } from "@/app/context/AuthContext";
import { useRefresh } from "@/app/context/RefreshContext";

type props = {
  inventoryItem: InventoryItem;
};

export default function RestoreInventoryItemButton({ inventoryItem }: props) {
  const router = useRouter();
  const { refresh } = useRefresh();


  const { userInfo } = useAuth();

  const rewindIcon = "/icons/rewind.svg";

  const [isOpen, setIsOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/inventory`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "restoreInventoryItem",
          id: inventoryItem.id,
        }),
      },
    );

    if (res.ok) {
      toast("Inventory item restored", "success");
      setIsOpen(false);

      router.replace("/inventory");
      await refresh();
    } else {
      toast("Failed to restore inventory item", "error");
    }
  }

  return (
    <>
      <Button
        componentType={"button"}
        bgColor={"rgba(239, 239, 239, 1)"}
        borderColor={"rgba(223, 223, 223, 1)"}
        textColor={"black"}
        onClick={() => setIsOpen(true)}
        style={{ padding: "7px 7px" }}
      >
        <img src={rewindIcon} alt="restore" />
      </Button>

      {isOpen && (
        <FormPopUp
          header={"RESTORE INVENTORY ITEM"}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"CONFIRM"}
        >
          Are you sure you want to restore this inventory item?
        </FormPopUp>
      )}
    </>
  );
}
