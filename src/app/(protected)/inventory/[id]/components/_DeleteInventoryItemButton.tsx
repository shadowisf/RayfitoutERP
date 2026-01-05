"use client";

import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import { useState } from "react";
import { toast } from "@/app/components/Toast";
import { useRouter } from "next/navigation";
import { InventoryItem } from "../../types/inventoryItem";
import { useAuth } from "@/app/context/AuthContext";

type DeleteInventoryItemButtonProps = {
  inventoryItem: InventoryItem;
};

export default function DeleteInventoryItemButton({
  inventoryItem,
}: DeleteInventoryItemButtonProps) {
  const router = useRouter();

  const { userInfo } = useAuth();

  const trashIcon = "/icons/trash.svg";

  const [isOpen, setIsOpen] = useState(false);

  const deleteImageFromS3 = async (imageUrl: string) => {
    try {
      const response = await fetch("/api/s3", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "delete",
          url: imageUrl,
        }),
      });

      if (!response.ok) {
        console.error("Failed to delete image from S3");
      }
    } catch (error) {
      console.error("Error deleting image from S3:", error);
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Delete image from S3
    if (inventoryItem.image) {
      await deleteImageFromS3(inventoryItem.image);
    }

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/inventory`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: inventoryItem.id,
        }),
      }
    );

    if (res.ok) {
      toast("Inventory item deleted", "success");
      setIsOpen(false);

      router.replace("/inventory");
      router.refresh();
    } else {
      toast("Failed to delete inventory item", "error");
    }
  }

  if (userInfo?.departmentID !== 8) {
    return null;
  }

  return (
    <>
      <Button
        componentType={"button"}
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
          header={"DELETE INVENTORY ITEM"}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"CONFIRM"}
        >
          Are you sure you want to delete this inventory item?
        </FormPopUp>
      )}
    </>
  );
}
