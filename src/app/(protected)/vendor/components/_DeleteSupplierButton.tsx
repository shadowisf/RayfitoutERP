"use client";

import { useState } from "react";
import FormPopUp from "@/app/components/FormPopup";
import Button from "@/app/components/Button";
import { useRouter } from "next/navigation";
import { toast } from "@/app/components/Toast";
import { Supplier } from "../types/supplier";

type props = {
  supplier: Supplier;
  onSuccess?: () => void;
  iconOnly?: boolean;
};

export default function DeleteSupplierButton({ supplier, onSuccess, iconOnly }: props) {
  const router = useRouter();

  const trashIcon = "/icons/trash.svg";

  const [isOpen, setIsOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/supplier`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "deleteSupplier",
            id: supplier.id,
          }),
        },
      );

      if (res.ok) {
        toast("Vendor deleted", "success");

        setIsOpen(false);

        onSuccess && onSuccess();

        router.refresh();
      } else {
        toast("Failed to delete vendor. Something went wrong", "error");
      }
    } catch (error: any) {
      console.error("Delete error:", error);
      toast("Failed to delete vendor. Something went wrong", "error");
    }
  }

  return (
    <>
      <Button
        componentType="button"
        bgColor={iconOnly ? "rgba(239, 239, 239, 1)" : "transparent"}
        borderColor={iconOnly ? "rgba(223, 223, 223, 1)" : "transparent"}
        textColor={"black"}
        onClick={() => setIsOpen(true)}
        full={!iconOnly}
        style={
          iconOnly
            ? { padding: "7px 7px" }
            : { justifyContent: "flex-start" }
        }
      >
        <img src={trashIcon} alt="trash" />
        {!iconOnly && " Delete"}
      </Button>

      {isOpen && (
        <FormPopUp
          header={"DELETE VENDOR"}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"CONFIRM"}
        >
          <p>Are you sure you want to delete this vendor?</p>
        </FormPopUp>
      )}
    </>
  );
}
