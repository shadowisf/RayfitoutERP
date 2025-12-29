"use client";

import { useState } from "react";
import FormPopUp from "@/app/components/FormPopup";
import Button from "@/app/components/Button";
import { useRouter } from "next/navigation";
import { MrLine } from "../../types/mrLine";
import { toast } from "@/app/components/Toast";

type DeleteMrSubCategoryButtonProps = {
  items: MrLine[];
  subCategory: string;
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
  children?: React.ReactNode;
};

export default function DeleteMrSubCategoryButton({
  items,
  subCategory,
  bgColor = "rgba(239, 239, 239, 1)",
  textColor = "black",
  borderColor = "rgba(239, 239, 239, 1)",
  children,
}: DeleteMrSubCategoryButtonProps) {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "deleteSubCategory",
        item_ids: items.map((item) => item.id),
      }),
    });

    if (res.ok) {
      toast("Material request subcategory deleted", "success");

      setIsOpen(false);

      router.refresh();
    } else {
      toast(
        "Failed to delete material request subcategory. Something went wrong"
      );
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
          header={"DELETE MATERIAL REQUEST SUBCATEGORY"}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"CONFIRM"}
        >
          <p>Are you sure you want to delete {subCategory} subcategory?</p>
        </FormPopUp>
      )}
    </>
  );
}
