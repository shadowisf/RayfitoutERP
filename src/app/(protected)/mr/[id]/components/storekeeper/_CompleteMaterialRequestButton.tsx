"use client";

import { useState } from "react";
import FormPopUp from "@/app/components/FormPopup";
import Button from "@/app/components/Button";
import { useRouter } from "next/navigation";
import { toast } from "@/app/components/Toast";

type CompleteMaterialRequestButtonProps = {
  mrHeaderID: number;
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
  children?: React.ReactNode;
};

export default function CompleteMaterialRequestButton({
  mrHeaderID,
  bgColor = "rgba(239, 239, 239, 1)",
  textColor = "black",
  borderColor = "rgba(239, 239, 239, 1)",
  children,
}: CompleteMaterialRequestButtonProps) {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const res = await fetch(`/api/mr`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "submitForCompletion",
        id: mrHeaderID,
      }),
    });

    if (res.ok) {
      toast("Material request completed", "success");
      router.refresh();
      setIsOpen(false);
    } else {
      toast("Failed to complete material request", "error");
      setIsOpen(false);
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
          header={"COMPLETE MATERIAL REQUEST"}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"CONFIRM"}
        >
          <p>Are you sure you want to complete this material request?</p>
        </FormPopUp>
      )}
    </>
  );
}
