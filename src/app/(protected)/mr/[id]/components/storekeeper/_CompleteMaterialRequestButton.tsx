"use client";

import { useState } from "react";
import FormPopUp from "@/app/components/FormPopup";
import Button from "@/app/components/Button";
import { useRouter } from "next/navigation";
import { toast } from "@/app/components/Toast";
import { useAuth } from "@/app/context/AuthContext";

type CompleteMaterialRequestButtonProps = {
  mrHeaderID: number;
  style?: React.CSSProperties;
  disabled?: boolean;
};

export default function CompleteMaterialRequestButton({
  mrHeaderID,
  style,
  disabled,
}: CompleteMaterialRequestButtonProps) {
  const router = useRouter();

  const { userInfo } = useAuth();

  const [isOpen, setIsOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const res = await fetch(`/api/mr`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "submitForCompletion",
        id: mrHeaderID,
        changed_by: userInfo?.name,
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
        bgColor={"white"}
        borderColor={"white"}
        textColor={"black"}
        onClick={() => setIsOpen(true)}
        style={{ padding: "7px 20px", ...style }}
        disabled={disabled}
      >
        COMPLETE MATERIAL REQUEST
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
