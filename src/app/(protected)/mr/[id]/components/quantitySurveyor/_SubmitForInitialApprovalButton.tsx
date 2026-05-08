"use client";

import { useState } from "react";
import FormPopUp from "@/app/components/FormPopup";
import Button from "@/app/components/Button";
import { useRouter } from "next/navigation";
import { toast } from "@/app/components/Toast";
import { useAuth } from "@/app/context/AuthContext";
import { MrHeader } from "../../types/mrHeader";

function getTypeLabel(type?: string) {
  if (type === "job") return "job order";
  if (type === "payment") return "payment request";
  return "material request";
}

type SubitForInitialApprovalButtonProps = {
  mrHeader: MrHeader;
  disabled?: boolean;
  style?: React.CSSProperties;
  progressId?: number;
};

export default function SubmitForInitialApprovalButton({
  mrHeader,
  disabled,
  style,
  progressId,
}: SubitForInitialApprovalButtonProps) {
  const router = useRouter();

  const { userInfo } = useAuth();

  const [isOpen, setIsOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "submitForInitialApproval",
        id: mrHeader.id,
        type: mrHeader.type,
        changed_by: userInfo?.name,
        department_id: mrHeader.department_id,
        from_progress_id: progressId || mrHeader.progress_id,
      }),
    });

    const typeLabel = getTypeLabel(mrHeader.type);

    if (res.ok) {
      toast(`${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} submitted`, "success");

      setIsOpen(false);

      router.refresh();
      router.replace(`/mr/`);
    } else {
      toast(`Failed to submit ${typeLabel}`, "error");
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
        {mrHeader.type === "payment"
          ? "SUBMIT FOR MANAGER APPROVAL"
          : mrHeader.type === "job"
            ? "SUBMIT FOR QS REVIEW"
            : "SUBMIT FOR QUOTATIONS"}
      </Button>

      {isOpen && (
        <FormPopUp
          header={"SUBMIT MATERIAL REQUEST"}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"CONFIRM"}
        >
          <p>Are you sure you want to submit this {getTypeLabel(mrHeader.type)}?</p>
        </FormPopUp>
      )}
    </>
  );
}
