"use client";

import { useEffect, useState } from "react";
import FormPopUp from "@/app/components/FormPopup";
import Button from "@/app/components/Button";
import { useRouter } from "next/navigation";
import { toast } from "@/app/components/Toast";
import InputItem from "@/app/components/InputItem";
import { useRefresh } from "@/app/context/RefreshContext";

type EditBoqCategoryButtonProps = {
  oldCategory: string;
  boqID: number;
  onSuccess?: () => void;
};

export default function EditBoqCategoryButton({
  oldCategory,
  boqID,
  onSuccess,
}: EditBoqCategoryButtonProps) {
  const router = useRouter();
  const { refresh } = useRefresh();


  const pencilIcon = "/icons/pencil.svg";

  const [isOpen, setIsOpen] = useState(false);

  const [newCategory, setNewCategory] = useState(oldCategory);

  useEffect(() => {
    setNewCategory(oldCategory);
  }, [isOpen]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/boq`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateCategory",
          old_category: oldCategory,
          new_category: newCategory,
          boq_id: boqID,
        }),
      });

      if (res.ok) {
        toast("Bill of quantity category updated", "success");

        setIsOpen(false);

        onSuccess && onSuccess();

        await refresh();
      } else {
        toast(
          "Failed to update bill of quantity item. Something went wrong",
          "error"
        );
      }
    } catch (error: any) {
      console.error("Delete error:", error);
      toast(
        "Failed to update bill of quantity item. Something went wrong",
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
        <img src={pencilIcon} alt="pencil" />
      </Button>

      {isOpen && (
        <FormPopUp
          header={"RENAME BILL OF QUANTITY CATEGORY"}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"CONFIRM"}
          style={{ color: "black", cursor: "auto" }}
        >
          <div className="input-row half">
            <InputItem
              label={"CATEGORY"}
              value={newCategory}
              type={"text"}
              onChange={(e) => setNewCategory(e.target.value)}
              required
            />
          </div>
        </FormPopUp>
      )}
    </>
  );
}
