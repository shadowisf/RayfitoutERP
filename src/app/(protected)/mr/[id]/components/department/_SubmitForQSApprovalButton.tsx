"use client";

import { useState } from "react";
import FormPopUp from "@/app/components/FormPopup";
import Button from "@/app/components/Button";
import { useRouter } from "next/navigation";
import { toast } from "@/app/components/Toast";
import { useAuth } from "@/app/context/AuthContext";
import { MrHeader } from "../../types/mrHeader";

type props = {
  mrHeader: MrHeader;
  disabled?: boolean;
  style?: React.CSSProperties;
};

export default function SubmitForQSApprovalButton({
  mrHeader,
  disabled,
  style,
}: props) {
  const router = useRouter();

  const { userInfo } = useAuth();

  const [isOpen, setIsOpen] = useState(false);

  // Manager (8) and QS (16) creators skip QS review — go straight to Quotations.
  // skip_approvals flag also bypasses QS review (but then also skips Manager Price Approval later).
  const bypassQSReview =
    !!mrHeader.skip_approvals ||
    userInfo?.departmentID === 8 ||
    userInfo?.departmentID === 16;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const action = bypassQSReview
      ? "submitForSkipApprovalsQuotations"
      : "submitForQSInitialApproval";

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        id: mrHeader.id,
        changed_by: userInfo?.name,
        department_id: mrHeader.department_id,
      }),
    });

    if (res.ok) {
      toast("Material request submitted", "success");

      setIsOpen(false);

      router.refresh();
      router.replace(`/mr/`);
    } else {
      toast("Failed to submit material request", "error");
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
        style={{ ...style }}
        disabled={disabled}
      >
        {bypassQSReview ? "SUBMIT FOR QUOTATIONS" : "SUBMIT FOR QS REVIEW"}
      </Button>

      {isOpen && (
        <FormPopUp
          header={"SUBMIT MATERIAL REQUEST"}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"CONFIRM"}
        >
          <p>Are you sure you want to submit this material request?</p>
        </FormPopUp>
      )}
    </>
  );
}
