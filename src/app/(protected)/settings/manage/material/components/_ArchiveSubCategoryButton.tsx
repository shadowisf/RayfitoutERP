"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import FormPopUp from "@/app/components/FormPopup";
import Button from "@/app/components/Button";
import { toast } from "@/app/components/Toast";

type Props = {
  subCategoryId: number;
  subCategoryName: string;
  itemCount: number;
  onSuccess: () => void;
};

export default function ArchiveSubCategoryButton({
  subCategoryId,
  subCategoryName,
  itemCount,
  onSuccess,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const isEmpty = itemCount === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: isEmpty ? "deleteMaterialSubCategory" : "archiveSubCategory",
          id: subCategoryId,
        }),
      });
      if (!res.ok) throw new Error();
      toast(
        isEmpty
          ? `Subcategory "${subCategoryName}" deleted.`
          : `${itemCount} material${itemCount !== 1 ? "s" : ""} archived.`,
        "success",
      );
      setIsOpen(false);
      onSuccess();
    } catch {
      toast(
        isEmpty
          ? "Failed to delete subcategory."
          : "Failed to archive subcategory.",
        "error",
      );
    }
  };

  const modal = isOpen && (
    <FormPopUp
      header={isEmpty ? "DELETE SUBCATEGORY" : "ARCHIVE SUBCATEGORY"}
      setIsOpen={setIsOpen}
      handleSubmit={handleSubmit}
      addButtonLabel="CONFIRM"
    >
      {isEmpty ? (
        <>
          <p>
            Are you sure you want to delete the empty subcategory{" "}
            <strong>{subCategoryName}</strong>?
          </p>

          <br />

          <p style={{ color: "rgba(200,60,60,1)", fontWeight: 600 }}>
            This action cannot be undone.
          </p>
        </>
      ) : (
        <p>
          Are you sure you want to archive all{" "}
          <strong>
            {itemCount} material{itemCount !== 1 ? "s" : ""}
          </strong>{" "}
          in subcategory <strong>{subCategoryName}</strong>?
        </p>
      )}
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
        onClick={(e) => {
          (e as any).stopPropagation();
          setIsOpen(true);
        }}
      >
        <img src="/icons/trash.svg" alt="archive" />
      </Button>
      {typeof window !== "undefined" &&
        modal &&
        createPortal(modal, document.body)}
    </>
  );
}
