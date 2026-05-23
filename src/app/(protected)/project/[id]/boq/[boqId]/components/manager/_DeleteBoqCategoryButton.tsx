"use client";

import { useState } from "react";
import FormPopUp from "@/app/components/FormPopup";
import Button from "@/app/components/Button";
import { useRouter } from "next/navigation";
import { toast } from "@/app/components/Toast";
import { useRefresh } from "@/app/context/RefreshContext";

type DeleteBoqCategoryButtonProps = {
  boqID: number;
  category: string;
  onSuccess?: () => void;
};

export default function DeleteBoqCategoryButton({
  boqID,
  category,
  onSuccess,
}: DeleteBoqCategoryButtonProps) {
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
        action: "deleteCategory",
        category: category,
        boq_id: boqID,
      }),
    });

    if (res.ok) {
      toast("Bill of quantity category deleted", "success");

      onSuccess && onSuccess();

      setIsOpen(false);

      await refresh();
    } else {
      toast(
        "Failed to delete bill of quantity category. Something went wrong",
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
        onClick={() => setIsOpen(true)}
        style={{ padding: "0px", filter: "invert(1)" }}
      >
        <img src={trashIcon} alt="trash" />
      </Button>

      {isOpen && (
        <FormPopUp
          header={"DELETE BILL OF QUANTITY CATEGORY"}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"CONFIRM"}
          style={{
            color: "black",
            cursor: "auto",
            fontSize: "12px",
            fontWeight: "normal",
          }}
        >
          Are you sure you want to delete this category?
        </FormPopUp>
      )}
    </>
  );
}
