"use client";

import { useState } from "react";
import FormPopUp from "@/app/components/FormPopup";
import Button from "@/app/components/Button";
import { useRouter } from "next/navigation";
import { toast } from "@/app/components/Toast";
import { useRefresh } from "@/app/context/RefreshContext";

type UploadGRNAttachmentButtonProps = {
  mrHeaderID: number;
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
  children?: React.ReactNode;
};

export default function UploadGRNAttachmentButton({
  mrHeaderID,
  bgColor = "rgba(239, 239, 239, 1)",
  textColor = "black",
  borderColor = "rgba(239, 239, 239, 1)",
  children,
}: UploadGRNAttachmentButtonProps) {
  const router = useRouter();
  const { refresh } = useRefresh();


  const [isOpen, setIsOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "cancelMaterialRequest",
        id: mrHeaderID,
      }),
    });

    if (res.ok) {
      toast("Material request cancelled", "success");

      setIsOpen(false);

      await refresh();
    } else {
      toast("Failed to cancel material request", "error");
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
        style={{ padding: "7px 20px" }}
      >
        {children}
      </Button>

      {isOpen && (
        <FormPopUp
          header={"CANCEL MATERIAL REQUEST"}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"CONFIRM"}
        >
          <p>Are you sure you want to cancel this material request?</p>
        </FormPopUp>
      )}
    </>
  );
}
