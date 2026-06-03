"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import FormPopUp from "@/app/components/FormPopup";
import Button from "@/app/components/Button";
import { toast } from "@/app/components/Toast";

type Props = {
  categoryId: number;
  categoryName: string;
  itemCount: number;
  onDark?: boolean;
  onSuccess: () => void;
};

export default function ArchiveCategoryButton({
  categoryId,
  categoryName,
  itemCount,
  onDark,
  onSuccess,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "archiveCategory", id: categoryId }),
      });
      if (!res.ok) throw new Error();
      toast(
        `${itemCount} material${itemCount !== 1 ? "s" : ""} archived.`,
        "success",
      );
      setIsOpen(false);
      onSuccess();
    } catch {
      toast("Failed to archive category.", "error");
    }
  };

  const modal = isOpen && (
    <FormPopUp
      header="ARCHIVE CATEGORY"
      setIsOpen={setIsOpen}
      handleSubmit={handleSubmit}
      addButtonLabel="CONFIRM"
    >
      <p>
        Are you sure you want to archive all{" "}
        <strong>
          {itemCount} material{itemCount !== 1 ? "s" : ""}
        </strong>{" "}
        in category <strong>{categoryName}</strong>?
      </p>

      <br />

      <p
        style={{
          color: "rgba(200,60,60,1)",
          fontWeight: 600,
        }}
      >
        This action cannot be undone.
      </p>
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
        onClick={(e) => {
          (e as any).stopPropagation();
          setIsOpen(true);
        }}
      >
        <img
          src="/icons/trash.svg"
          alt="archive"
          style={onDark ? { filter: "brightness(0) invert(1)" } : undefined}
        />
      </Button>
      {typeof window !== "undefined" &&
        modal &&
        createPortal(modal, document.body)}
    </>
  );
}
