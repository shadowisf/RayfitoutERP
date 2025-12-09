"use client";

import { useState } from "react";
import FormPopUp from "@/app/components/FormPopup";
import Button from "@/app/components/Button";
import { useRouter } from "next/navigation";
import { BoqLine } from "../../types/boqLine";
import { toast } from "@/app/components/Toast";

type DeleteBoqSubCategoryButtonProps = {
  item: BoqLine;
  category: string;
  subCategory: string;
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
  children?: React.ReactNode;
};

export default function DeleteBoqSubCategoryButton({
  item,
  category,
  subCategory,
  bgColor = "rgba(239, 239, 239, 1)",
  textColor = "black",
  borderColor = "rgba(239, 239, 239, 1)",
  children,
}: DeleteBoqSubCategoryButtonProps) {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/boq`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "deleteSubCategory",
        category: category,
        sub_category: subCategory,
        boq_id: Number(item.boq_id),
      }),
    });

    if (res.ok) {
      toast("Bill of quantity subcategory deleted", "success");

      setIsOpen(false);

      router.refresh();
    } else {
      toast(
        "Failed to delete bill of quantity subcategory. Something went wrong",
        "error"
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
          header={"DELETE BILL OF QUANTITY SUBCATEGORY"}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"CONFIRM"}
        >
          <p>Are you sure you want to delete this subcategory?</p>
        </FormPopUp>
      )}
    </>
  );
}
