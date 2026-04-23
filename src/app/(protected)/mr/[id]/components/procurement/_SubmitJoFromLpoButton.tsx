"use client";

import { useState } from "react";
import FormPopUp from "@/app/components/FormPopup";
import Button from "@/app/components/Button";
import { useRouter } from "next/navigation";
import { toast } from "@/app/components/Toast";
import { useAuth } from "@/app/context/AuthContext";
import { MrHeader } from "../../types/mrHeader";

type SubmitJoFromLpoButtonProps = {
  mrHeader: MrHeader;
  disabled?: boolean;
  style?: React.CSSProperties;
};

export default function SubmitJoFromLpoButton({
  mrHeader,
  disabled,
  style,
}: SubmitJoFromLpoButtonProps) {
  const router = useRouter();
  const { userInfo } = useAuth();

  const [isOpen, setIsOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "submitJoForFinalCompletion",
        id: mrHeader.id,
        changed_by: userInfo?.name,
        department_id: mrHeader.department_id,
      }),
    });

    if (res.ok) {
      toast("Job order submitted", "success");
      setIsOpen(false);
      router.refresh();
      router.replace(`/mr/`);
    } else {
      toast("Failed to submit job order", "error");
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
        SUBMIT FOR COMPLETION
      </Button>

      {isOpen && (
        <FormPopUp
          header={"SUBMIT JOB ORDER"}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"CONFIRM"}
        >
          <p>Are you sure you want to submit this job order?</p>
        </FormPopUp>
      )}
    </>
  );
}
