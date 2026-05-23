"use client";

import { useState } from "react";
import FormPopUp from "@/app/components/FormPopup";
import Button from "@/app/components/Button";
import { useRouter } from "next/navigation";
import { BoqLine } from "../../types/boqLine";
import { toast } from "@/app/components/Toast";
import { useRefresh } from "@/app/context/RefreshContext";

type DuplicateBoqItemButtonProps = {
  item: BoqLine;
  onSuccess?: () => void;
};

export default function DuplicateBoqItemButton({
  item,
  onSuccess,
}: DuplicateBoqItemButtonProps) {
  const router = useRouter();
  const { refresh } = useRefresh();


  const duplicateIcon = "/icons/duplicate.svg";

  /*   const [isOpen, setIsOpen] = useState(false); */

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/boq`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "duplicateBoqLine",
          id: item.id,
        }),
      });

      if (res.ok) {
        toast("Bill of quantity item duplicated", "success");

        /* setIsOpen(false); */

        onSuccess && onSuccess();

        await refresh();
      } else {
        toast(
          "Failed to duplicate bill of quantity item. Something went wrong",
          "error"
        );
      }
    } catch (error: any) {
      console.error("Delete error:", error);
      toast(
        "Failed to duplicate bill of quantity item. Something went wrong",
        "error"
      );
    }
  }

  return (
    <>
      <Button
        componentType="button"
        bgColor={"transparent"}
        borderColor={"transparent"}
        textColor={"black"}
        onClick={(e) => {
          handleSubmit(e);
        }}
        full
        style={{ justifyContent: "flex-start" }}
      >
        <img src={duplicateIcon} alt="duplicate" /> Duplicate
      </Button>

      {/*  {isOpen && (
        <FormPopUp
          header={"DUPLICATE BILL OF QUANTITY ITEM"}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"CONFIRM"}
        >
          <p>Are you sure you want to duplicate this item?</p>
        </FormPopUp>
      )} */}
    </>
  );
}
