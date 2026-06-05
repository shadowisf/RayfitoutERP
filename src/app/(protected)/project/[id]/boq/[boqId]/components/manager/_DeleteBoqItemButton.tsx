"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import FormPopUp from "@/app/components/FormPopup";
import Button from "@/app/components/Button";
import { useRouter } from "next/navigation";
import { BoqLine } from "../../types/boqLine";
import { toast } from "@/app/components/Toast";
import { useRefresh } from "@/app/context/RefreshContext";

type DeleteBoqItemButtonProps = {
  item: BoqLine;
  onSuccess?: () => void;
};

export default function DeleteBoqItemButton({
  item,
  onSuccess,
}: DeleteBoqItemButtonProps) {
  const router = useRouter();
  const { refresh } = useRefresh();


  const trashIcon = "/icons/trash.svg";

  const [isOpen, setIsOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      // Step 1: Parse attachments from item
      let attachments: string[] = [];
      try {
        if (item.attachments) {
          if (Array.isArray(item.attachments)) {
            attachments = item.attachments;
          } else if (
            typeof item.attachments === "string" &&
            item.attachments.trim() !== ""
          ) {
            const parsed = JSON.parse(item.attachments);
            if (Array.isArray(parsed)) {
              attachments = parsed;
            }
          }
        }
      } catch (error) {
        console.error("Failed to parse attachments:", error);
      }

      // Step 2: Delete all attachments from S3
      if (attachments.length > 0) {
        console.log("Deleting", attachments.length, "attachments from S3");

        for (const url of attachments) {
          try {
            const deleteResponse = await fetch("/api/s3", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "delete",
                url: url,
              }),
            });

            if (!deleteResponse.ok) {
              console.error("Failed to delete file from S3:", url);
              // Continue with other files even if one fails
            } else {
              console.log("Deleted from S3:", url);
            }
          } catch (error) {
            console.error("Error deleting file from S3:", url, error);
            // Continue with other files even if one fails
          }
        }
      }

      // Step 3: Delete the BOQ item from database
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/boq`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "deleteItem",
          id: item.id,
        }),
      });

      if (res.ok) {
        toast("Bill of quantity item deleted", "success");

        setIsOpen(false);

        onSuccess && onSuccess();

        await refresh();
      } else {
        toast(
          "Failed to delete bill of quantity item. Something went wrong",
          "error"
        );
      }
    } catch (error: any) {
      console.error("Delete error:", error);
      toast(
        "Failed to delete bill of quantity item. Something went wrong",
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
        full
        style={{ justifyContent: "flex-start" }}
      >
        <img src={trashIcon} alt="trash" /> Delete
      </Button>

      {isOpen && typeof window !== "undefined" && createPortal(
        <FormPopUp
          header={"DELETE BILL OF QUANTITY ITEM"}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"CONFIRM"}
        >
          <p>Are you sure you want to delete this item?</p>
        </FormPopUp>,
        document.body
      )}
    </>
  );
}
