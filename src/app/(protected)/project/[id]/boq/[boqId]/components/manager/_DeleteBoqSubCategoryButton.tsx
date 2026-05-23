"use client";

import { useState } from "react";
import FormPopUp from "@/app/components/FormPopup";
import Button from "@/app/components/Button";
import { useRouter } from "next/navigation";
import { BoqLine } from "../../types/boqLine";
import { toast } from "@/app/components/Toast";
import { useRefresh } from "@/app/context/RefreshContext";

type DeleteBoqSubCategoryButtonProps = {
  item: BoqLine;
  category: string;
  subCategory: string;
};

export default function DeleteBoqSubCategoryButton({
  item,
  category,
  subCategory,
}: DeleteBoqSubCategoryButtonProps) {
  const router = useRouter();
  const { refresh } = useRefresh();


  const trashIcon = "/icons/trash.svg";

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

      await refresh();
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
