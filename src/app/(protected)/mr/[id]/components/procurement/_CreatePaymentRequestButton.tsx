"use client";

import { useState } from "react";
import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import { useRouter } from "next/navigation";
import { toast } from "@/app/components/Toast";
import { useAuth } from "@/app/context/AuthContext";
import { MrHeader } from "../../types/mrHeader";

type Props = {
  mrHeader: MrHeader;
};

export default function CreatePaymentRequestButton({ mrHeader }: Props) {
  const router = useRouter();
  const { userInfo } = useAuth();

  const [isOpen, setIsOpen] = useState(false);

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "createMrHeader",
        type: "payment",
        project_id: mrHeader.project_id || null,
        department_id: userInfo?.departmentID,
        requested_by: userInfo?.name,
        payment_jo_reference_id: mrHeader.id,
      }),
    });

    const data = await res.json();

    if (res.ok) {
      toast("Payment request created", "success");
      setIsOpen(false);
      router.refresh();
      router.replace(`/mr/${data.mrHeaderId}`);
    } else {
      toast("Failed to create payment request", "error");
    }
  }

  return (
    <>
      <Button
        componentType="button"
        bgColor="black"
        borderColor="black"
        textColor="white"
        onClick={() => setIsOpen(true)}
        style={{ padding: "7px 20px", borderRadius: "25px" }}
      >
        Create Payment Request +
      </Button>

      {isOpen && (
        <FormPopUp
          header="CREATE PAYMENT REQUEST"
          setIsOpen={setIsOpen}
          handleSubmit={handleConfirm}
          addButtonLabel="CONFIRM"
        >
          <p>
            Create a payment request linked to this job order?
          </p>
        </FormPopUp>
      )}
    </>
  );
}
