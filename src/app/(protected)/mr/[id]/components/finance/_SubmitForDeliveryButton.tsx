"use client";

import { useState } from "react";
import FormPopUp from "@/app/components/FormPopup";
import Button from "@/app/components/Button";
import { useRouter } from "next/navigation";
import { toast } from "@/app/components/Toast";
import { useAuth } from "@/app/context/AuthContext";
import { MrHeader } from "../../types/mrHeader";

type SubitForDeliveryButtonProps = {
  mrHeader: MrHeader;
  lpoId?: number;
  disabled?: boolean;
  style?: React.CSSProperties;
  deliveryDate: string;
  paymentValue: number;
};

export default function SubmitForDeliveryButton({
  mrHeader,
  lpoId,
  disabled,
  style,
  deliveryDate,
  paymentValue,
}: SubitForDeliveryButtonProps) {
  const router = useRouter();

  const { userInfo } = useAuth();

  const [isOpen, setIsOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const apiUrl = lpoId
      ? `${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo`
      : `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`;

    const bodyData = lpoId
      ? {
          action: "submitLpoForDelivery",
          lpo_id: lpoId,
          mr_header_id: mrHeader.id,
          changed_by: userInfo?.name,
          department_id: mrHeader.department_id,
          delivery_date: new Date(deliveryDate).toLocaleDateString("en-GB"),
          payment_value: Number(paymentValue).toFixed(2),
        }
      : {
          action: "submitForDelivery",
          id: mrHeader.id,
          changed_by: userInfo?.name,
          department_id: mrHeader.department_id,
          delivery_date: new Date(deliveryDate).toLocaleDateString("en-GB"),
          payment_value: Number(paymentValue).toFixed(2),
        };

    const res = await fetch(apiUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyData),
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
        bgColor={"white"}
        borderColor={"white"}
        textColor={"black"}
        onClick={() => setIsOpen(true)}
        style={{ padding: "7px 20px", ...style }}
        disabled={disabled}
      >
        SUBMIT FOR DELIVERY
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
