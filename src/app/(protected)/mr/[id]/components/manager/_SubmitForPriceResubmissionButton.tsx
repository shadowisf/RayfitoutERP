"use client";

import { useState } from "react";
import FormPopUp from "@/app/components/FormPopup";
import Button from "@/app/components/Button";
import { useRouter } from "next/navigation";
import { toast } from "@/app/components/Toast";

type SubmitForPricingResubmissionButtonProps = {
  mrHeaderID: number;
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
  children?: React.ReactNode;
};

export default function SubmitForPricingResubmissionButton({
  mrHeaderID,
  bgColor = "rgba(239, 239, 239, 1)",
  textColor = "black",
  borderColor = "rgba(239, 239, 239, 1)",
  children,
}: SubmitForPricingResubmissionButtonProps) {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "submitForPricingResubmission",
        id: mrHeaderID,
      }),
    });

    if (res.ok) {
      toast("Material request submitted", "success");

      setIsOpen(false);

      router.refresh();
    } else {
      toast("Failed to submit material request", "error");
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
