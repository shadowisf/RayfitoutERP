"use client";

import { useState } from "react";
import FormPopUp from "@/app/components/FormPopup";
import Button from "@/app/components/Button";
import { useRouter } from "next/navigation";
import { MrLine } from "../../types/mrLine";
import { toast } from "@/app/components/Toast";
import { useAuth } from "@/app/context/AuthContext";

type DeleteMrItemButtonProps = {
  item: MrLine;
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
  children?: React.ReactNode;
  stageName?: string;
};

export default function DeleteMrItemButton({
  item,
  bgColor = "rgba(239, 239, 239, 1)",
  textColor = "black",
  borderColor = "rgba(239, 239, 239, 1)",
  children,
  stageName,
}: DeleteMrItemButtonProps) {
  const router = useRouter();
  const { userInfo } = useAuth();

  const [isOpen, setIsOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      // First, delete the S3 file if it exists
      if (item.attachment) {
        try {
          const deleteS3Response = await fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL}/api/s3`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "delete",
                url: item.attachment,
              }),
            }
          );

          if (!deleteS3Response.ok) {
            console.error(
              "Failed to delete S3 file, but continuing with item deletion"
            );
          } else {
            console.log("S3 file deleted successfully");
          }
        } catch (s3Error) {
          console.error("Error deleting S3 file:", s3Error);
          // Continue with item deletion even if S3 deletion fails
        }
      }

      // Then delete the MR item from database
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "deleteItem",
          id: item.id,
          changed_by: userInfo?.name || null,
          stage_name: stageName || "INITIAL APPROVAL",
        }),
      });

      if (res.ok) {
        toast(`${item.material_description} deleted`, "success");
        setIsOpen(false);
        router.refresh();
      } else {
        toast("Failed to delete material request item", "error");
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast("Failed to delete material request item", "error");
    }
  }

  return (
    <>
      <Button
        componentType="button"
        bgColor={bgColor}
        borderColor={borderColor}
        textColor={textColor}
        onClick={() => setIsOpen(true)}
        style={{ padding: "7px 7px" }}
      >
        {children}
      </Button>

      {isOpen && (
        <FormPopUp
          header={"DELETE MATERIAL REQUEST ITEM"}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"CONFIRM"}
        >
          <p>Are you sure you want to delete {item.material_description}?</p>
        </FormPopUp>
      )}
    </>
  );
}
