"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import Button from "@/app/components/Button";
import { toast } from "@/app/components/Toast";

type Props = {
  subCategoryId: number;
  subCategoryName: string;
  onSuccess: (newName: string) => void;
};

export default function EditSubCategoryButton({
  subCategoryId,
  subCategoryName,
  onSuccess,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState("");

  useEffect(() => {
    if (isOpen) setValue(subCategoryName);
  }, [isOpen, subCategoryName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) { toast("Subcategory name is required.", "error"); return; }
    if (trimmed === subCategoryName) { setIsOpen(false); return; }
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateSubCategory", id: subCategoryId, value: trimmed }),
      });
      if (!res.ok) throw new Error();
      toast("Subcategory renamed.", "success");
      setIsOpen(false);
      onSuccess(trimmed);
    } catch {
      toast("Failed to rename subcategory.", "error");
    }
  };

  const modal = isOpen && (
    <FormPopUp
      header="EDIT SUBCATEGORY"
      setIsOpen={setIsOpen}
      handleSubmit={handleSubmit}
      addButtonLabel="CONFIRM"
    >
      <div className="input-row full">
        <InputItem
          label="SUBCATEGORY NAME"
          value={value}
          type="text"
          required
          onChange={(e) => setValue(e.target.value)}
          noOptionalLabel
        />
      </div>
    </FormPopUp>
  );

  return (
    <>
      <Button
        componentType="button"
        bgColor="transparent"
        borderColor="transparent"
        textColor="black"
        type="button"
        style={{ padding: "0px" }}
        onClick={(e) => { (e as any).stopPropagation(); setIsOpen(true); }}
      >
        <img src="/icons/pencil.svg" alt="edit" />
      </Button>
      {typeof window !== "undefined" && modal && createPortal(modal, document.body)}
    </>
  );
}
