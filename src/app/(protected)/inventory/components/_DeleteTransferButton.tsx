"use client";

import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import { useState } from "react";
import { toast } from "@/app/components/Toast";
import { useRouter } from "next/navigation";
import { useRefresh } from "@/app/context/RefreshContext";

type props = {
  transaction: any;
  onSuccess?: () => void;
};

export default function DeleteTransferButton({
  transaction,
  onSuccess,
}: props) {
  const router = useRouter();
  const { refresh } = useRefresh();


  const trashIcon = "/icons/trash.svg";

  const [isOpen, setIsOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/stock`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "deleteTransfer",
        id: transaction.id,
      }),
    });

    if (res.ok) {
      toast("Transaction deleted", "success");
      setIsOpen(false);

      onSuccess && onSuccess();

      await refresh();
    } else {
      toast("Failed to delete Transaction", "error");
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
        <img src={trashIcon} alt="trash" />
      </Button>

      {isOpen && (
        <FormPopUp
          header={"DELETE INVENTORY ITEM"}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"CONFIRM"}
        >
          Are you sure you want to delete this transaction?
        </FormPopUp>
      )}
    </>
  );
}
