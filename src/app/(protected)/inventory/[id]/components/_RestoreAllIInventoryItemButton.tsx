"use client";

import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import { useState } from "react";
import { toast } from "@/app/components/Toast";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";

export default function RestoreAllInventoryItemButton() {
  const router = useRouter();

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
          action: "restoreAllInventoryItem",
        }),
      },
    );

    if (res.ok) {
      toast("All inventory items restored", "success");
      setIsOpen(false);

      router.replace("/inventory");
      router.refresh();
    } else {
      toast("Failed to restore all inventory items", "error");
    }
  }

  return (
    <>
      <Button
        componentType={"button"}
        bgColor={"black"}
        borderColor={"black"}
        textColor={"white"}
        onClick={() => setIsOpen(true)}
      >
        RESTORE ALL{" "}
        <img style={{ filter: "invert(1)" }} src={rewindIcon} alt="restore" />
      </Button>

      {isOpen && (
        <FormPopUp
          header={"RESTORE ALL INVENTORY ITEMS"}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"CONFIRM"}
        >
          Are you sure you want to restore all inventory items?
        </FormPopUp>
      )}
    </>
  );
}
