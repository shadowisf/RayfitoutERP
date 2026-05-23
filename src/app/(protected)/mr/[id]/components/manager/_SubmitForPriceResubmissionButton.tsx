"use client";

import { useState } from "react";
import FormPopUp from "@/app/components/FormPopup";
import Button from "@/app/components/Button";
import { useRouter } from "next/navigation";
import { toast } from "@/app/components/Toast";
import { useAuth } from "@/app/context/AuthContext";
import { useRefresh } from "@/app/context/RefreshContext";

function getTypeLabel(type?: string) {
  if (type === "job") return "job order";
  if (type === "payment") return "payment request";
  return "material request";
}

type SubmitForPricingResubmissionButtonProps = {
  mrHeaderID: number;
  type?: string;
};

export default function SubmitForPricingResubmissionButton({
  mrHeaderID,
  type,
}: SubmitForPricingResubmissionButtonProps) {
  const router = useRouter();
  const { refresh } = useRefresh();


  const { userInfo } = useAuth();

  const [isOpen, setIsOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "submitForPricingResubmission",
        id: mrHeaderID,
        changed_by: userInfo?.name,
        user_name: userInfo?.name,
        user_role: userInfo?.role,
      }),
    });

    const typeLabel = getTypeLabel(type);

    if (res.ok) {
      toast(`${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} submitted`, "success");

      setIsOpen(false);

      await refresh();
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
        style={{ padding: "7px 20px" }}
      >
        RETURN FOR REVISION
      </Button>

      {isOpen && (
        <FormPopUp
          header={"SUBMIT MATERIAL REQUEST"}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"CONFIRM"}
        >
          <p>Are you sure you want to submit this {getTypeLabel(type)}?</p>
        </FormPopUp>
      )}
    </>
  );
}
