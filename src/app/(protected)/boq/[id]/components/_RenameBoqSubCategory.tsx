"use client";

import { useEffect, useState } from "react";
import FormPopUp from "@/app/components/FormPopup";
import Button from "@/app/components/Button";
import { useRouter } from "next/navigation";
import InputItem from "@/app/components/InputItem";
import { BoqLine } from "../types/boqLine";
import { toast } from "@/app/components/Toast";

type RenameBoqSubCategoryButtonProps = {
  item: BoqLine;
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
  children?: React.ReactNode;
  category: string;
  subCategory: string;
};

export default function RenameBoqSubCategoryButton({
  item,
  category,
  subCategory,
  bgColor = "rgba(239, 239, 239, 1)",
  textColor = "black",
  borderColor = "rgba(239, 239, 239, 1)",
  children,
}: RenameBoqSubCategoryButtonProps) {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);

  const [newSubCategory, setNewSubCategory] = useState(subCategory);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/boq`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "updateSubCategory",
        new_sub_category: newSubCategory,
        old_sub_category: subCategory,
        category: category,
        boq_id: item.boq_id,
      }),
    });

    if (res.ok) {
      toast("Bill of quantity subcategory updated", "success");

      setNewSubCategory("");

      setIsOpen(false);

      router.refresh();
    } else {
      toast(
        "Failed to update bill of quantity subcategory. Something went wrong",
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
          header={"RENAME BILL OF QUANTITY SUBCATEGORY"}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"CONFIRM"}
        >
          <div className="input-row full">
            <InputItem
              label={"SUB CATEGORY"}
              value={newSubCategory}
              type={"text"}
              placeholder={"ENTER SUB CATEGORY"}
              onChange={(e) => setNewSubCategory(e.target.value)}
              required
            />
          </div>
        </FormPopUp>
      )}
    </>
  );
}
