"use client";

import { useState } from "react";
import FormPopUp from "@/app/components/FormPopup";
import Button from "@/app/components/Button";
import { useRouter } from "next/navigation";
import { BoqLine } from "../types/types";

type DeleteItemButtonProps = {
  item: BoqLine;
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
  children?: React.ReactNode;
};

export default function DeleteItemButton({
  item,
  bgColor = "rgba(239, 239, 239, 1)",
  textColor = "black",
  borderColor = "rgba(239, 239, 239, 1)",
  children,
}: DeleteItemButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/boq`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: item.id,
      }),
    });

    if (res.ok) {
      alert("Item deleted");

      setIsOpen(false);

      router.refresh();
    } else {
      alert("Failed to delete item. Something went wrong");
    }
  }

  return (
    <>
      <Button
        componentType="button"
        bgColor={bgColor}
        borderColor={borderColor}
        textColor={textColor}
        onClick={() => setIsOpen(true)}
      >
        {children}
      </Button>

      {isOpen && (
        <FormPopUp
          header={"DELETE ITEM"}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"DELETE ITEM"}
        >
          <p>Are you sure you want to delete this item?</p>
        </FormPopUp>
      )}
    </>
  );
}
