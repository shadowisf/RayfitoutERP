"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import Button from "@/app/components/Button";
import { toast } from "@/app/components/Toast";

type Props = {
  categoryId: number;
  categoryName: string;
  onDark?: boolean;
  onSuccess: (newName: string) => void;
};

export default function EditCategoryButton({
  categoryId,
  categoryName,
  onDark,
  onSuccess,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState("");

  useEffect(() => {
    if (isOpen) setValue(categoryName);
  }, [isOpen, categoryName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) { toast("Category name is required.", "error"); return; }
    if (trimmed === categoryName) { setIsOpen(false); return; }
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateCategory", id: categoryId, value: trimmed }),
      });
      if (!res.ok) throw new Error();
      toast("Category renamed.", "success");
      setIsOpen(false);
      onSuccess(trimmed);
    } catch {
      toast("Failed to rename category.", "error");
    }
  };

  const modal = isOpen && (
    <FormPopUp
      header="EDIT CATEGORY"
      setIsOpen={setIsOpen}
      handleSubmit={handleSubmit}
      addButtonLabel="CONFIRM"
    >
      <div className="input-row full">
        <InputItem
          label="CATEGORY NAME"
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
        textColor={onDark ? "white" : "black"}
        type="button"
        style={{ padding: "0px" }}
        onClick={(e) => { (e as any).stopPropagation(); setIsOpen(true); }}
      >
        <img
          src="/icons/pencil.svg"
          alt="edit"
          style={onDark ? { filter: "brightness(0) invert(1)" } : undefined}
        />
      </Button>
      {typeof window !== "undefined" && modal && createPortal(modal, document.body)}
    </>
  );
}
