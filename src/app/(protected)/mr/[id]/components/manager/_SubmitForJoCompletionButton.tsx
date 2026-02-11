"use client";

import { useState } from "react";
import FormPopUp from "@/app/components/FormPopup";
import Button from "@/app/components/Button";
import { useRouter } from "next/navigation";
import { toast } from "@/app/components/Toast";
import { useAuth } from "@/app/context/AuthContext";
import { MrHeader } from "../../types/mrHeader";

type SubmitForJoCompletionButtonProps = {
  mrHeader: MrHeader;
  disabled?: boolean;
  style?: React.CSSProperties;
};

export default function SubmitForJoCompletionButton({
  mrHeader,
  disabled,
  style,
}: SubmitForJoCompletionButtonProps) {
  const router = useRouter();

  const { userInfo } = useAuth();

  const [isOpen, setIsOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "submitForJoCompletion",
        id: mrHeader.id,
        changed_by: userInfo?.name,
        department_id: mrHeader.department_id,
      }),
    });

    if (res.ok) {
      toast("Job order marked as completed", "success");

      setIsOpen(false);

      router.refresh();
      router.replace(`/mr/`);
    } else {
      toast("Failed to complete job order", "error");
    }
  }

  return (
    <>
      <Button
        componentType="button"
        bgColor="white"
        borderColor="white"
        textColor="black"
        onClick={() => setIsOpen(true)}
        style={{ padding: "7px 20px", ...style }}
        disabled={disabled}
      >
        COMPLETE JOB ORDER
      </Button>

      {isOpen && (
        <FormPopUp
          header={"COMPLETE JOB ORDER"}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"CONFIRM"}
        >
          <p>Are you sure you want to complete this job order?</p>
        </FormPopUp>
      )}
    </>
  );
}
